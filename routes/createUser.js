const express = require('express');
const prisma = require('../db');

const router = express.Router();

// POST /api/user - Create user
router.post('/',async (req,res)=>{
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


module.exports = router;