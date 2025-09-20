const express = require ('express');
const prisma = require('../db');

const router = express.Router();

// POST /api/reward - Record that a user got rewarded X shares of a stock.
router.post('/',async (req, res)=>{
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

module.exports = router;