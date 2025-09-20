const { PrismaClient } = require('@prisma/client');

// Create a single Prisma instance that can be shared across the application
const prisma = global.prisma || new PrismaClient();

// In development, store the instance globally to prevent multiple connections
if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

module.exports = prisma;