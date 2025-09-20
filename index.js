const express = require ('express');
const prisma = require('./db');
const startStockPriceUpdater = require('./stock-update');
const createUserRouter = require('./routes/createUser');
const rewardRouter = require('./routes/reward');
const todayStocksRouter = require('./routes/todayStocks');
const historicalINRRouter = require('./routes/historicalINR');
const statsRouter = require('./routes/stats');
const portfolioRouter = require('./routes/portfolio');

const app = express();
const port = 5000;

app.use(express.json());

// Initialize stock prices updater
startStockPriceUpdater();


// Routes

// GET /api/health - Health check endpoint
app.get('/api/health',(req, res)=>{
    res.send("Server is running successfully");
})

// POST /api/user - Create user
app.use('/api/user/', createUserRouter);

// POST /api/reward - Record that a user got rewarded X shares of a stock.
app.use('/api/reward', rewardRouter);

// GET /api/today-stocks/{userId} – Return all stock rewards for the user for today.
app.use('/api/today-stocks', todayStocksRouter);

// GET /api/historical-inr/{userId} – Return the INR value of the user’s stock rewards for all past days (up to yesterday).
app.use('/api/historical-inr', historicalINRRouter);

// GET /api/stats/{userId} – Return Total shares rewarded today (grouped by stock symbol), Current INR value of the user’s portfol.
app.use('/api/stats', statsRouter);

// GET /api/portfolio/{userId} - to show holdings per stock symbol with current INR value.
app.use('/api/portfolio', portfolioRouter);

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