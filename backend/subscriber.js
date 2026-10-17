require('dotenv').config();

const { connectRedis, closeRedis } = require('./redis/redis');
const { subscribeToAuctionEvents } = require('./events/auctionEvents');

async function startSubscriber() {
    await connectRedis();
    await subscribeToAuctionEvents((event) => {
        console.log(JSON.stringify({ message: 'Auction event received', event }));
    });
    console.log('Subscribed to auction-events');
}

startSubscriber().catch((error) => {
    console.error('Could not subscribe to auction events:', error.message);
    process.exitCode = 1;
});

process.once('SIGTERM', closeRedis);
process.once('SIGINT', closeRedis);