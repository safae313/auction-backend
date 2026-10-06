const { redisClient } = require('../redis/redis');
const { config } = require('../config/config');

function keyFor(auctionId) {
    return `auction:${auctionId}`;
}

async function getAuction(auctionId) {
    try {
        const value = await redisClient.get(keyFor(auctionId));
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error(JSON.stringify({
            level: 'warn',
            message: 'Auction cache read failed',
            auctionId,
            error: error.message
        }));
        return null;
    }
}

async function setAuction(auction) {
    try {
        await redisClient.set(
            keyFor(auction.id),
            JSON.stringify(auction),
            { EX: config.redisTtl }
        );
        return true;
    } catch (error) {
        console.error(JSON.stringify({
            level: 'warn',
            message: 'Auction cache write failed',
            auctionId: auction.id,
            error: error.message
        }));
        return false;
    }
}

async function invalidateAuction(auctionId) {
    try {
        await redisClient.del(keyFor(auctionId));
        return true;
    } catch (error) {
        console.error(JSON.stringify({
            level: 'warn',
            message: 'Auction cache invalidation failed',
            auctionId,
            error: error.message
        }));
        return false;
    }
}

module.exports = { getAuction, setAuction, invalidateAuction };