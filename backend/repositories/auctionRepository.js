const { pool } = require('../db/mysql');

async function findAll() {
    const [auctions] = await pool.query('SELECT * FROM auctions');
    return auctions;
}

async function findById(auctionId, executor = pool) {
    const [auctions] = await executor.execute(
        'SELECT * FROM auctions WHERE id = ?',
        [auctionId]
    );
    return auctions[0] || null;
}

async function findByIdForUpdate(connection, auctionId) {
    const [auctions] = await connection.execute(
        'SELECT * FROM auctions WHERE id = ? FOR UPDATE',
        [auctionId]
    );
    return auctions[0] || null;
}

async function updateCurrentPrice(connection, auctionId, amount) {
    await connection.execute(
        'UPDATE auctions SET current_price = ? WHERE id = ?',
        [amount, auctionId]
    );
}

async function updateStatus(connection, auctionId, status) {
    await connection.execute(
        'UPDATE auctions SET status = ? WHERE id = ?',
        [status, auctionId]
    );
}

module.exports = {
    findAll,
    findById,
    findByIdForUpdate,
    updateCurrentPrice,
    updateStatus
};