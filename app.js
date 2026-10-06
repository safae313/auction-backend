const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { config } = require('./config/config');
const auctionRoutes = require('./routes/auctionRoutes');
const healthRoutes = require('./health/healthRoutes');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const { client: metricsClient } = require('./metrics');

const app = express();

app.set('trust proxy', config.trustProxy);
app.use(helmet());
app.use(cors({
    origin: config.corsOrigins.length === 0
        ? false
        : config.corsOrigins.includes('*') ? '*' : config.corsOrigins
}));
app.use(express.json({ limit: '16kb' }));
app.use(requestLogger);
app.use(rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
        message: 'Too many requests',
        error: 'Too many requests',
        code: 'RATE_LIMITED'
    })
}));

app.get('/', (req, res) => {
    res.json({ message: 'Auction platform API is running' });
});

app.use(healthRoutes);
app.use('/api/auctions', auctionRoutes);
app.get('/metrics', async (req, res, next) => {
    try {
        res.set('Content-Type', metricsClient.register.contentType);
        res.end(await metricsClient.register.metrics());
    } catch (error) {
        next(error);
    }
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
