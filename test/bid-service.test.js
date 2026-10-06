const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const calls = [];
let auction = { id: 12, status: 'OPEN', current_price: 100 };
let failOnUpdate = false;
let transactionQueue = Promise.resolve();
let publishedEvents = [];
let cacheAvailable = true;
let eventsAvailable = true;

const pool = {
    async getConnection() {
        calls.push('acquire');
        let unlock;

        return {
            async beginTransaction() {
                calls.push('begin');
                const previous = transactionQueue;
                transactionQueue = new Promise((resolve) => {
                    unlock = resolve;
                });
                await previous;
            },
            async execute(sql, values) {
                const query = sql.replace(/\s+/g, ' ').trim();
                calls.push(query);

                if (query.includes('FOR UPDATE')) {
                    return [[{ ...auction }], []];
                }
                if (query.startsWith('INSERT INTO bids')) {
                    return [{ insertId: 73 }, []];
                }
                if (query.startsWith('UPDATE auctions')) {
                    if (failOnUpdate) {
                        throw new Error('simulated database failure');
                    }
                    auction.current_price = values[0];
                    return [{ affectedRows: 1 }, []];
                }

                throw new Error(`Unexpected SQL query: ${query}`);
            },
            async commit() {
                calls.push('commit');
                unlock();
            },
            async rollback() {
                calls.push('rollback');
                unlock();
            },
            release() {
                calls.push('release');
            }
        };
    },
    async query() {
        return [[], []];
    },
    async end() {}
};

const mysqlDriverPath = require.resolve('mysql2/promise');
require.cache[mysqlDriverPath] = {
    id: mysqlDriverPath,
    filename: mysqlDriverPath,
    loaded: true,
    exports: { createPool: () => pool }
};

const cachePath = require.resolve('../cache/auctionCache');
require.cache[cachePath] = {
    id: cachePath,
    filename: cachePath,
    loaded: true,
    exports: {
        async setAuction() {
            calls.push('cache');
            return cacheAvailable;
        }
    }
};

const eventsPath = require.resolve('../events/auctionEvents');
require.cache[eventsPath] = {
    id: eventsPath,
    filename: eventsPath,
    loaded: true,
    exports: {
        async publishNewBid(event) {
            publishedEvents.push(event);
            calls.push('publish');
            return eventsAvailable;
        }
    }
};

const { placeBid } = require('../services/bidService');

beforeEach(() => {
    calls.length = 0;
    auction = { id: 12, status: 'OPEN', current_price: 100 };
    failOnUpdate = false;
    transactionQueue = Promise.resolve();
    publishedEvents = [];
    cacheAvailable = true;
    eventsAvailable = true;
});

test('locks and commits the auction before cache and event updates', async () => {
    const result = await placeBid({ auctionId: 12, userId: 8, amount: 125 });

    assert.deepEqual(calls, [
        'acquire',
        'begin',
        'SELECT * FROM auctions WHERE id = ? FOR UPDATE',
        'INSERT INTO bids (auction_id, user_id, amount) VALUES (?, ?, ?)',
        'UPDATE auctions SET current_price = ? WHERE id = ?',
        'commit',
        'release',
        'cache',
        'publish'
    ]);
    assert.equal(result.bid.id, 73);
    assert.equal(result.auction.current_price, 125);
    assert.deepEqual(publishedEvents[0], {
        id: 73,
        auctionId: 12,
        userId: 8,
        amount: 125,
        bidId: 73
    });
});

test('rolls back and skips Redis side effects when an update fails', async () => {
    failOnUpdate = true;

    await assert.rejects(
        placeBid({ auctionId: 12, userId: 8, amount: 125 }),
        /simulated database failure/
    );

    assert.equal(calls.at(-2), 'rollback');
    assert.equal(calls.at(-1), 'release');
    assert.equal(calls.includes('cache'), false);
    assert.equal(calls.includes('publish'), false);
});

test('rejects a closed auction and releases the rolled-back connection', async () => {
    auction = { id: 12, status: 'CLOSED', current_price: 100 };

    await assert.rejects(
        placeBid({ auctionId: 12, userId: 8, amount: 125 }),
        (error) => error.code === 'AUCTION_CLOSED'
    );

    assert.deepEqual(calls, [
        'acquire',
        'begin',
        'SELECT * FROM auctions WHERE id = ? FOR UPDATE',
        'rollback',
        'release'
    ]);
});

test('serializes concurrent bids so the second bid sees the committed price', async () => {
    const results = await Promise.allSettled([
        placeBid({ auctionId: 12, userId: 8, amount: 125 }),
        placeBid({ auctionId: 12, userId: 9, amount: 120 })
    ]);

    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[1].status, 'rejected');
    assert.equal(results[1].reason.code, 'BID_NOT_HIGHER');
    assert.equal(auction.current_price, 125);
    assert.equal(calls.filter((call) => call.startsWith('INSERT INTO bids')).length, 1);
    assert.equal(calls.filter((call) => call === 'commit').length, 1);
});

test('keeps a committed bid successful when Redis cache and Pub/Sub fail', async () => {
    cacheAvailable = false;
    eventsAvailable = false;

    const result = await placeBid({ auctionId: 12, userId: 8, amount: 125 });

    assert.equal(result.bid.id, 73);
    assert.equal(result.warning, 'Redis cache update failed');
    assert.equal(calls.includes('commit'), true);
    assert.equal(calls.at(-2), 'cache');
    assert.equal(calls.at(-1), 'publish');
});