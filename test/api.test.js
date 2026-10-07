const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const app = require('../app');
const { closeDatabase } = require('../db/mysql');
const { closeRedis } = require('../redis/redis');

let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
    await Promise.all([closeDatabase(), closeRedis()]);
});

test('GET /health reports liveness', async () => {
    const response = await fetch(`${baseUrl}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
});

test('GET / preserves the API root response', async () => {
    const response = await fetch(`${baseUrl}/`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        message: 'Auction platform API is running -ci pipeline'
    });
});

test('auction endpoints reject malformed identifiers before database access', async () => {
    const response = await fetch(`${baseUrl}/api/auctions/not-a-number`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, 'INVALID_AUCTION_ID');
});

test('bid endpoint requires a positive integer user ID', async () => {
    const response = await fetch(`${baseUrl}/api/auctions/1/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: '1', amount: 100 })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, 'INVALID_USER_ID');
});

test('bid endpoint requires a finite numeric amount', async () => {
    const response = await fetch(`${baseUrl}/api/auctions/1/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1, amount: '100' })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.code, 'INVALID_AMOUNT');
});

test('GET /health/ready reports dependency state with a matching HTTP status', async () => {
    const response = await fetch(`${baseUrl}/health/ready`);
    const body = await response.json();
    const ready = Object.values(body.dependencies).every((status) => status === 'ok');

    assert.equal(response.status, ready ? 200 : 503);
    assert.equal(body.status, ready ? 'ok' : 'not_ready');
    assert.deepEqual(Object.keys(body.dependencies).sort(), ['mysql', 'redis']);
});