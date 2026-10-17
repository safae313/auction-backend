require('dotenv').config();

const { redisClient, connectRedis, closeRedis } = require('./redis/redis');

async function publishExampleBidEvent() {
    const connections = await connectRedis();
    if (connections.some((result) => result.status === 'rejected')) {
        throw new Error('Could not connect to Redis');
    }

    await redisClient.publish('auction-events', JSON.stringify({
        type: 'NEW_BID',
        auctionId: 1,
        bidId: 999,
        userId: 1,
        amount: 21500
    }));
    console.log('Bid event published');
}

publishExampleBidEvent()
    .catch((error) => {
        console.error('Could not publish bid event:', error.message);
        process.exitCode = 1;
    })
    .finally(closeRedis);