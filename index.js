const express = require ('express');
const {PrismaClient} = require('@prisma/client');

const app = express();
const port = 5000;

app.use(express.json());

const prisma = global.prisma || new PrismaClient();
if(process.env.NODE_ENV !== 'production') global.prisma = prisma;

app.get('/',(req, res)=>{
    res.json({"msg": "Hello World!"})
})

app.get('/user', async(req, res) => {
    try{
        const users = await prisma.User.findMany();
        res.json(users);
    }catch(err){
        console.log(err);
        res.status(500).json({ error: 'Faild to fetch users'});
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