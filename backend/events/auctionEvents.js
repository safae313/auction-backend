const { redisClient, subscriber } = require('../redis/redis');

const CHANNEL = 'auction-events';
let eventHandler;
let subscriptionInProgress = false;
let subscriptionEstablished = false;

async function publishNewBid({ auctionId, bidId, userId, amount }) {
    const event = {
        type: 'NEW_BID',
        auctionId,
        bidId,
        userId,
        amount
    };

    try {
        await redisClient.publish(CHANNEL, JSON.stringify(event));
        return true;
    } catch (error) {
        console.error(JSON.stringify({
            level: 'warn',
            message: 'NEW_BID event publishing failed',
            auctionId,
            bidId,
            error: error.message
        }));
        return false;
    }
}

async function subscribeToAuctionEvents(handler) {
    eventHandler = handler;
    const subscribe = async () => {
        if (!subscriber.isReady || subscriptionInProgress || subscriptionEstablished) {
            return;
        }

        subscriptionInProgress = true;
        try {
            await subscriber.subscribe(CHANNEL, (message) => {
                try {
                    eventHandler(JSON.parse(message));
                } catch (error) {
                    console.error(JSON.stringify({
                        level: 'error',
                        message: 'Invalid auction event received',
                        error: error.message
                    }));
                }
            });
            subscriptionEstablished = true;
        } catch (error) {
            console.error(JSON.stringify({
                level: 'warn',
                message: 'Auction event subscription failed',
                error: error.message
            }));
        } finally {
            subscriptionInProgress = false;
        }
    };

    subscriber.on('ready', subscribe);
    await subscribe();

    return true;
}

module.exports = { publishNewBid, subscribeToAuctionEvents };