const express = require ('express');
const {PrismaClient} = require('@prisma/client');
const startStockPriceUpdater = require('./stock-update');

const app = express();
const port = 5000;

app.use(express.json());

const prisma = global.prisma || new PrismaClient();
if(process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Initialize stock prices updater
startStockPriceUpdater();


// Routes

// GET /api/health - Health check endpoint
app.get('/api/health',(req, res)=>{
    res.send("Server is running successfully");
})

// POST /api/user - Create user
app.post('/api/user/',async (req,res)=>{
    try{
        const { name, email} = req.body;
        if(!name || !email){
            return res.status(400).json({error: "Name and email are required"});
        }
        // Create user
        const user = await prisma.user.create({
            data:{
                name,
                email
            },
        });
        res.status(201).json(user);
    }catch(error){
        console.error(error);

        if(error.code === "P2002"){
            return res.status(409).json({error: "Email already exists"});
        }

        res.status(500).json({error: "something went wrong"});
    }
});

// POST /api/reward - Record that a user got rewarded X shares of a stock.
app.post('/api/reward',async (req, res)=>{
    try{
        const {userId, stockSymbol, shares} = req.body;
        
        // validation
        if(!userId || !stockSymbol || !shares){
            return res.status(400).json({error: "userId, stockSymbol and shares are required"})
        }

        // find stock by symbol
        const stock = await prisma.stock.findUnique({
            where: {stockSymbol}
        })

        if(!stock){
            return res.status(404).json({error: "stock not found"})
        }

        // create stock record
        const reward = await prisma.reward.create({
            data:{
                userId,
                stockId: stock.id,
                shares,
            }
        });
        res.status(201).json(reward);
    }catch(error){
        console.error(error);
        res.status(500).json({error: "something went wrong"})
    }
})

// GET /api/today-stocks/{userId} – Return all stock rewards for the user for today.
app.get('/api/today-stocks/:userId', async (req, res)=>{
    try{
        const {userId} = req.params;

        // validation
        if(!userId){
            return res.status(400).json({error: "userId is required"});
        }

        // find all rewards for user for today
        const stocks = await prisma.reward.findMany({
            where:{
                userId: parseInt(userId),
                rewardedAt: {
                    gte: new Date(new Date().setHours(0,0,0,0)),
                }
            },
            include: {
                stock: true,
            },
            orderBy: {
                rewardedAt: "desc",
            }
        });
        return res.status(200).json({stocks})
    }catch(err){
        console.error(err);
        return res.status(500).json({error: "something went wrong"})
    }
})

// GET /api/historical-inr/{userId} – Return the INR value of the user’s stock rewards for all past days (up to yesterday).
app.get('/api/historical-inr/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const rewards = await prisma.reward.findMany({
      where: {
        userId: parseInt(userId),
        rewardedAt: {
          lt: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      include: {
        stock: true
      },
      orderBy: {
        rewardedAt: 'asc'
      }
    });

    if (rewards.length === 0) {
      return res.json({
        userId: parseInt(userId),
        historicalRewards: []
      });
    }

    // Group rewards by date
    const rewardsByDate = {};
    rewards.forEach(reward => {
      const date = reward.rewardedAt.toISOString().split("T")[0]; // YYYY-MM-DD
      if (!rewardsByDate[date]) {
        rewardsByDate[date] = [];
      }
      rewardsByDate[date].push(reward);
    });

    // Calculate INR value for each date
    const historicalRewards = [];
    
    for (const [date, dayRewards] of Object.entries(rewardsByDate)) {
      let totalINRValue = 0;
      
      // For each reward on this date, find the appropriate stock price
      for (const reward of dayRewards) {
        // Find the stock price recorded closest to (but not after) the reward date
        const stockPrice = await prisma.stockPrice.findFirst({
          where: {
            stockId: reward.stockId,
            recordedAt: {
              lte: new Date(reward.rewardedAt.getTime() + 24 * 60 * 60 * 1000)
            }
          },
          orderBy: {
            recordedAt: 'desc'
          }
        });

        const price = stockPrice?.priceInr || 0;
        const value = Number(reward.shares) * Number(price);
        totalINRValue += value;
      }
      
      historicalRewards.push({
        date,
        totalINRValue: Math.round(totalINRValue * 100) / 100
      });
    }

    // Sort by date
    historicalRewards.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      userId: parseInt(userId),
      historicalRewards
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "something went wrong" });
  }
});

// GET /api/stats/{userId} – Return Total shares rewarded today (grouped by stock symbol), Current INR value of the user’s portfol.
app.get('/api/stats/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get rewards for today grouped by stock
    const rewardsToday = await prisma.reward.groupBy({
      by: ['stockId'],
      where: {
        userId: Number(userId),
        rewardedAt: {
          gte: today
        }
      },
      _sum: {
        shares: true
      },
    });

    // Fetch stock symbols
    const stockIds = rewardsToday.map(r => r.stockId);
    const stocks = await prisma.stock.findMany({
      where: { id: { in: stockIds } },
      select: { id: true, stockSymbol: true }
    });

    // Map stock symbols to today's rewarded shares
    const totalSharesToday = rewardsToday.map(r => {
      const stock = stocks.find(s => s.id === r.stockId);
      return {
        stockSymbol: stock.stockSymbol,
        totalShares: r._sum.shares
      };
    });

    // Fetch all rewards for the user with latest stock prices
    const allRewards = await prisma.reward.findMany({
      where: { userId: Number(userId) },
      include: {
        stock: {
          include: {
            prices: {
              orderBy: { recordedAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    // Calculate current INR value
    let currentInrValue = 0;
    allRewards.forEach(r => {
      const latestPrice = r.stock.prices[0]?.priceInr || 0;
      currentInrValue += Number(r.shares) * Number(latestPrice);
    });

    return res.json({
      totalSharesToday,
      currentInrValue
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/portfolio/{userId} - to show holdings per stock symbol with current INR value.
app.get('/api/portfolio/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    // Fetch all rewards for the user grouped by stock with latest stock price
    const rewards = await prisma.reward.findMany({
      where: { userId: Number(userId) },
      include: {
        stock: {
          include: {
            prices: {
              orderBy: { recordedAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    // Aggregate holdings per stock
    const portfolioMap = {};
    rewards.forEach(r => {
      const stockSymbol = r.stock.stockSymbol;
      const latestPrice = r.stock.prices[0]?.priceInr || 0;
      if (!portfolioMap[stockSymbol]) {
        portfolioMap[stockSymbol] = {
          stockSymbol,
          totalShares: 0,
          currentPriceInr: Number(latestPrice),
          currentValueInr: 0
        };
      }
      portfolioMap[stockSymbol].totalShares += Number(r.shares);
      portfolioMap[stockSymbol].currentValueInr = Number((portfolioMap[stockSymbol].totalShares * portfolioMap[stockSymbol].currentPriceInr).toFixed(2));

    });

    const portfolio = Object.values(portfolioMap);

    // Calculate total portfolio value
    const totalPortfolioValue = portfolio.reduce((sum, stock) => sum + stock.currentValueInr, 0).toFixed(2);

    return res.json({
      portfolio,
      totalPortfolioValue
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});




const server = app.listen(port, ()=>{
    console.log(`App listening on port ${port}`)
})

// graceful shutdown
const shutdown = async() => {
    console.log('shutting down server...');
    server.close(async ()=>{
        await prisma.$disconnect();
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGABRT', shutdown);