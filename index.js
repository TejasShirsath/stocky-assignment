const express = require ('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const prisma = require('./db');
const startStockPriceUpdater = require('./stock-update');
const createUserRouter = require('./routes/createUser');
const rewardRouter = require('./routes/reward');
const todayStocksRouter = require('./routes/todayStocks');
const historicalINRRouter = require('./routes/historicalINR');
const statsRouter = require('./routes/stats');
const portfolioRouter = require('./routes/portfolio');

const app = express();
const port = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting to prevent spam/replay attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limiting for reward endpoint
const rewardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit reward requests
  message: 'Too many reward requests, please try again later.',
});

app.use(express.json({ limit: '10mb' }));

// Request validation middleware
app.use((req, res, next) => {
  if (req.method === 'POST' && (!req.body || Object.keys(req.body).length === 0)) {
    return res.status(400).json({ error: 'Request body is required for POST requests' });
  }
  next();
});

// Initialize stock prices updater with error handling
try {
  startStockPriceUpdater();
} catch (error) {
  console.error('Failed to start stock price updater:', error);
}

// Routes

// GET /api/health - Health check endpoint
app.get('/api/health',(req, res)=>{
    res.send("Server is running successfully");
})

// POST /api/user - Create user
app.use('/api/user/', createUserRouter);

// POST /api/reward - Record that a user got rewarded X shares of a stock.
app.use('/api/reward', rewardLimiter, rewardRouter);

// GET /api/today-stocks/{userId} – Return all stock rewards for the user for today.
app.use('/api/today-stocks', todayStocksRouter);

// GET /api/historical-inr/{userId} – Return the INR value of the user’s stock rewards for all past days (up to yesterday).
app.use('/api/historical-inr', historicalINRRouter);

// GET /api/stats/{userId} – Return Total shares rewarded today (grouped by stock symbol), Current INR value of the user’s portfol.
app.use('/api/stats', statsRouter);

// GET /api/portfolio/{userId} - to show holdings per stock symbol with current INR value.
app.use('/api/portfolio', portfolioRouter);


// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(port, () => {
  console.log(`App listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

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