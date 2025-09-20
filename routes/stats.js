const express = require ('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/stats/{userId} – Return Total shares rewarded today (grouped by stock symbol), Current INR value of the user’s portfol.
router.get('/:userId', async (req, res) => {
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

module.exports = router;