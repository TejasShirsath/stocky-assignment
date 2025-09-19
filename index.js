const express = require ('express');
const {PrismaClient} = require('@prisma/client');


const app = express();
const port = 5000;

app.use(express.json());

const prisma = global.prisma || new PrismaClient();
if(process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Routes
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