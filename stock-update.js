
const { PrismaClient } = require("@prisma/client");

const prisma = global.prisma || new PrismaClient();
if(process.env.NODE_ENV !== 'production') global.prisma = prisma;

const updateStockPrices = async () => {
  try {
    const stocks = await prisma.stock.findMany();

    for (const stock of stocks) {
      const randomPrice = parseFloat((Math.random() * 4000 + 1000).toFixed(2));

      await prisma.stockPrice.create({
        data: {
          stockId: stock.id,
          priceInr: randomPrice,
        },
      });

      console.log(`Price updated: ${stock.stockSymbol} -> ₹${randomPrice}`);
    }
  } catch (err) {
    console.error("Error updating stock prices:", err);
  }
};

// Function to start the stock price updater
const startStockPriceUpdater = () => {
  updateStockPrices();

  // Update every 24 hours (24 * 60 * 60 * 1000 milliseconds)
  setInterval(updateStockPrices, 24 * 60 * 60 * 1000);
  
  console.log("Stock price updater started - updating every day");
};

module.exports = startStockPriceUpdater;