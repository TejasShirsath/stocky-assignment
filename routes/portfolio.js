const express = require ('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/portfolio/{userId} - to show holdings per stock symbol with current INR value.
router.get('/:userId', async (req, res) => {
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

module.exports = router;