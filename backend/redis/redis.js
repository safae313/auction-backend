const { createClient } = require('redis');
const { config } = require('../config/config');

const clientOptions = {
    ...(config.redisUrl ? { url: config.redisUrl } : {}),
    disableOfflineQueue: true
};
const redisClient = createClient(clientOptions);
const subscriber = createClient(clientOptions);

for (const [name, client] of [['client', redisClient], ['subscriber', subscriber]]) {
    client.on('error', (error) => {
        console.error(JSON.stringify({
            level: 'error',
            message: `Redis ${name} error`,
            error: error.message
        }));
    });
}

async function connectClient(client) {
    if (!client.isOpen) {
        await client.connect();
    }
}

async function connectRedis() {
    return Promise.allSettled(
        [['client', redisClient], ['subscriber', subscriber]].map(async ([name, client]) => {
            if (client.isOpen) {
                return;
            }

            try {
                await connectClient(client);
            } catch (error) {
                console.error(JSON.stringify({
                    level: 'warn',
                    message: `Redis ${name} connection unavailable`,
                    error: error.message
                }));
            }
        })
    );
}

async function checkRedis() {
    if (!redisClient.isReady || !subscriber.isReady) {
        throw new Error('Redis client or subscriber is not ready');
    }
    await redisClient.ping();
}

async function closeRedis() {
    await Promise.allSettled(
        [redisClient, subscriber]
            .filter((client) => client.isOpen)
            .map((client) => client.quit())
    );
}

module.exports = {
    redisClient,
    subscriber,
    connectRedis,
    checkRedis,
    closeRedis
};