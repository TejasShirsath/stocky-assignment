const express = require ('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/historical-inr/{userId} – Return the INR value of the user’s stock rewards for all past days (up to yesterday).
router.get('/:userId', async (req, res) => {
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

module.exports = router;