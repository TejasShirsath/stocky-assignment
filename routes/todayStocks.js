const express = require ('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/today-stocks/{userId} – Return all stock rewards for the user for today.
router.get('/:userId', async (req, res)=>{
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

module.exports = router;