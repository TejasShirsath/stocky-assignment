# Stocky Assignment - API Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [API Specifications](#api-specifications)
3. [Database Schema](#database-schema)
4. [Edge Cases and Scaling](#edge-cases-and-scaling)
5. [Security and Performance](#security-and-performance)

---

## System Overview

The Stocky Assignment is a RESTful API system built with Node.js, Express, and Prisma ORM that manages stock rewards for users. The system tracks user stock rewards, maintains real-time stock prices, and provides portfolio analytics.

### Key Features
- User management with unique email validation
- Stock reward tracking and allocation
- Real-time stock price updates
- Portfolio analytics and historical data
- Rate limiting and security measures

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: MySQL with Prisma ORM
- **Security**: Helmet, Express Rate Limit
- **Environment**: Development/Production ready

---

## API Specifications

### Base URL
```
http://localhost:5000/api
```

### 1. Health Check
**Endpoint**: `GET /api/health`

**Description**: Health check endpoint to verify server status.

**Response**:
```json
"Server is running successfully"
```

---

### 2. Create User
**Endpoint**: `POST /api/user`

**Description**: Creates a new user in the system.

**Request Body**:
```json
{
  "name": "Tejas Shirsath",
  "email": "tejasshirsath@example.com"
}
```

**Success Response** (201):
```json
{
  "id": 1,
  "name": "Tejas Shirsath",
  "email": "tejasshirsath@example.com",
  "createdAt": "2025-09-21T10:30:00.000Z"
}
```

**Error Responses**:
- **400 Bad Request**: Missing name or email
  ```json
  {
    "error": "Name and email are required"
  }
  ```
- **409 Conflict**: Email already exists
  ```json
  {
    "error": "Email already exists"
  }
  ```

---

### 3. Record Stock Reward
**Endpoint**: `POST /api/reward`

**Description**: Records that a user received X shares of a stock as a reward.

**Rate Limit**: 10 requests per minute per IP

**Request Body**:
```json
{
  "userId": 1,
  "stockSymbol": "TCS",
  "shares": "10.5"
}
```

**Success Response** (201):
```json
{
  "id": 1,
  "userId": 1,
  "stockId": 1,
  "shares": "10.5",
  "rewardedAt": "2025-09-21T10:30:00.000Z"
}
```

**Error Responses**:
- **400 Bad Request**: Missing required fields
  ```json
  {
    "error": "userId, stockSymbol and shares are required"
  }
  ```
- **404 Not Found**: Stock symbol not found
  ```json
  {
    "error": "stock not found"
  }
  ```

---

### 4. Today's Stock Rewards
**Endpoint**: `GET /api/today-stocks/{userId}`

**Description**: Returns all stock rewards for a user for the current day.

**Path Parameters**:
- `userId` (integer): The user's ID

**Success Response** (200):
```json
{
  "stocks": [
    {
      "id": 1,
      "userId": 1,
      "stockId": 1,
      "shares": "10.5",
      "rewardedAt": "2025-09-21T10:30:00.000Z",
      "stock": {
        "id": 1,
        "stockSymbol": "TCS",
        "companyName": "TCSTata Consultancy Services",
        "createdAt": "2025-09-21T09:00:00.000Z"
      }
    }
  ]
}
```

**Error Responses**:
- **400 Bad Request**: Missing userId
  ```json
  {
    "error": "userId is required"
  }
  ```

---

### 5. Historical INR Values
**Endpoint**: `GET /api/historical-inr/{userId}`

**Description**: Returns the INR value of user's stock rewards for all past days (up to yesterday).

**Path Parameters**:
- `userId` (integer): The user's ID

**Success Response** (200):
```json
{
  "userId": 1,
  "historicalRewards": [
    {
      "date": "2025-09-20",
      "totalINRValue": 15750.50
    },
    {
      "date": "2025-09-19",
      "totalINRValue": 12300.25
    }
  ]
}
```

**Empty Response**:
```json
{
  "userId": 1,
  "historicalRewards": []
}
```

---

### 6. User Statistics
**Endpoint**: `GET /api/stats/{userId}`

**Description**: Returns total shares rewarded today (grouped by stock symbol) and current INR value of user's portfolio.

**Path Parameters**:
- `userId` (integer): The user's ID

**Success Response** (200):
```json
{
  "totalSharesToday": [
    {
      "stockSymbol": "TCS",
      "totalShares": "25.5"
    },
    {
      "stockSymbol": "RELIANCE",
      "totalShares": "10.0"
    }
  ],
  "currentInrValue": 45750.75
}
```

---

### 7. Portfolio Holdings
**Endpoint**: `GET /api/portfolio/{userId}`

**Description**: Shows holdings per stock symbol with current INR value.

**Path Parameters**:
- `userId` (integer): The user's ID

**Success Response** (200):
```json
{
  "portfolio": [
    {
      "stockSymbol": "TCS",
      "totalShares": 50.5,
      "currentPriceInr": 1500.00,
      "currentValueInr": 75750.00
    },
    {
      "stockSymbol": "RELIANCE",
      "totalShares": 20.0,
      "currentPriceInr": 2000.00,
      "currentValueInr": 40000.00
    }
  ],
  "totalPortfolioValue": "115750.00"
}
```

---

## Database Schema

### Entity Relationship Diagram

```
User (1) -----> (N) Reward (N) <----- (1) Stock
                                        |
                                        |
                                       (1)
                                        |
                                        v
                                  StockPrice (N)
```

### Tables and Relationships

#### 1. User Table
```sql
CREATE TABLE User (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Stores user information with unique email constraint.

#### 2. Stock Table
```sql
CREATE TABLE Stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stockSymbol VARCHAR(255) UNIQUE NOT NULL,
    companyName VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Maintains stock information with unique symbols.

#### 3. Reward Table
```sql
CREATE TABLE Reward (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    stockId INT NOT NULL,
    shares DECIMAL(18,6) NOT NULL,
    rewardedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id),
    FOREIGN KEY (stockId) REFERENCES Stock(id)
);
```

**Purpose**: Junction table linking users to their stock rewards with high-precision decimal shares.

#### 4. StockPrice Table
```sql
CREATE TABLE StockPrice (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stockId INT NOT NULL,
    priceInr DECIMAL(18,4) NOT NULL,
    recordedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stockId) REFERENCES Stock(id)
);
```

**Purpose**: Historical tracking of stock prices in INR with timestamp records.

### Key Design Decisions

1. **Decimal Precision**: 
   - Shares: `DECIMAL(18,6)` - Supports fractional shares up to 6 decimal places
   - Prices: `DECIMAL(18,4)` - Supports precise monetary values up to 4 decimal places

2. **Relationships**:
   - One-to-Many: User → Reward, Stock → Reward, Stock → StockPrice
   - Foreign key constraints ensure data integrity

3. **Indexing Strategy**:
   - Primary keys for fast lookups
   - Unique constraints on email and stockSymbol
   - Timestamps for efficient date-range queries

---

## Edge Cases and Scaling

### Edge Cases Handled

#### 1. Data Validation
- **Missing Required Fields**: All endpoints validate required parameters
- **Invalid Data Types**: Prisma validates data types at ORM level
- **Duplicate Emails**: Unique constraint prevents duplicate user emails
- **Non-existent Stock Symbols**: Reward endpoint validates stock existence

#### 2. Date and Time Handling
- **Timezone Consistency**: All timestamps use UTC with ISO formatting
- **Date Boundaries**: Today's data uses `setHours(0,0,0,0)` for consistent day boundaries
- **Historical Data**: Historical endpoint excludes current day data using `lt` operator

#### 3. Decimal Precision
- **Fractional Shares**: System supports fractional stock ownership with 6 decimal places
- **Currency Calculations**: INR values calculated with 4 decimal precision
- **Rounding**: Portfolio values rounded to 2 decimal places for display

#### 4. Missing Data Scenarios
- **No Stock Prices**: Defaults to 0 value when no price history exists
- **Empty Results**: Returns empty arrays instead of errors for no-data scenarios
- **Price Matching**: Uses closest available price for historical calculations

### Scaling Considerations

#### 1. Database Optimization

**Current Implementation**:
- **Connection Pooling**: Single Prisma instance with global reuse in development
- **Efficient Queries**: Uses `include` for eager loading relationships
- **Grouping Operations**: Aggregation queries with `groupBy` for statistics

**Scaling Strategies**:
```javascript
// Connection pooling configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + "?connection_limit=20&pool_timeout=20"
    }
  }
});

// Database indexing for performance
// Index on frequently queried columns
CREATE INDEX idx_reward_user_date ON Reward(userId, rewardedAt);
CREATE INDEX idx_stock_price_stock_date ON StockPrice(stockId, recordedAt);
```

#### 2. Caching Strategy

**Implementation Recommendations**:
```javascript
// Redis caching for frequently accessed data
const redis = require('redis');
const client = redis.createClient();

// Cache stock prices for 1 hour
const getCachedStockPrice = async (stockId) => {
  const cached = await client.get(`stock_price:${stockId}`);
  if (cached) return JSON.parse(cached);
  
  const price = await prisma.stockPrice.findFirst({
    where: { stockId },
    orderBy: { recordedAt: 'desc' }
  });
  
  await client.setex(`stock_price:${stockId}`, 3600, JSON.stringify(price));
  return price;
};
```

#### 3. API Performance

**Current Rate Limiting**:
- General API: 100 requests per 15 minutes per IP
- Reward endpoint: 10 requests per minute per IP

**Advanced Scaling**:
```javascript
// User-based rate limiting
const userLimiter = rateLimit({
  keyGenerator: (req) => req.body.userId || req.params.userId,
  windowMs: 60 * 1000,
  max: 50
});

// Database query optimization
const getPortfolioOptimized = async (userId) => {
  // Single query with aggregation
  const result = await prisma.reward.groupBy({
    by: ['stockId'],
    where: { userId: Number(userId) },
    _sum: { shares: true },
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
  return result;
};
```

#### 4. Horizontal Scaling

**Database Sharding Strategy**:
- **User-based sharding**: Distribute users across multiple database instances
- **Time-based partitioning**: Partition historical data by date ranges
- **Read replicas**: Separate read and write operations

**Microservices Architecture**:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Service  │    │  Reward Service │    │  Price Service  │
│                 │    │                 │    │                 │
│ - User CRUD     │    │ - Reward CRUD   │    │ - Price Updates │
│ - Authentication│    │ - Portfolio     │    │ - Price History │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  API Gateway    │
                    │                 │
                    │ - Rate Limiting │
                    │ - Load Balancing│
                    │ - Authentication│
                    └─────────────────┘
```

#### 5. Background Processing

**Stock Price Updates**:
```javascript
// Queue-based processing for stock updates
const Queue = require('bull');
const stockUpdateQueue = new Queue('stock price updates');

stockUpdateQueue.process(async (job) => {
  const { stockId } = job.data;
  // Update single stock price
  await updateSingleStockPrice(stockId);
});

// Schedule updates
const scheduleStockUpdates = async () => {
  const stocks = await prisma.stock.findMany();
  stocks.forEach(stock => {
    stockUpdateQueue.add('update-price', { stockId: stock.id });
  });
};
```

---

## Security and Performance

### Security Measures

1. **Helmet.js**: Provides security headers protection
2. **Rate Limiting**: Prevents abuse and DDoS attacks
3. **Input Validation**: All endpoints validate required parameters
4. **SQL Injection Protection**: Prisma ORM provides built-in protection
5. **Error Handling**: Sanitized error messages prevent information leakage

### Performance Optimizations

1. **Database Queries**:
   - Efficient use of `include` for eager loading
   - `groupBy` operations for aggregated data
   - Proper indexing on frequently queried columns

2. **Memory Management**:
   - Single Prisma instance to prevent connection leaks
   - Graceful shutdown with proper cleanup

3. **Response Optimization**:
   - JSON response formatting
   - Appropriate HTTP status codes
   - Minimal data transfer

### Monitoring and Logging

```javascript
// Enhanced error logging
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent')
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});
```

---

## Conclusion

This API system provides a robust foundation for stock reward management with:

- **Scalable Architecture**: Designed for horizontal scaling and microservices migration
- **Data Integrity**: Proper relationships and constraints ensure data consistency
- **Performance**: Optimized queries and caching strategies for high throughput
- **Security**: Multiple layers of protection against common vulnerabilities
- **Maintainability**: Clean code structure with proper error handling and logging

The system is production-ready with considerations for edge cases, scaling requirements, and security best practices.