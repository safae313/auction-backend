const { pool } = require('../db/mysql');

async function create(connection, { auctionId, userId, amount }) {
    const [result] = await connection.execute(
        `INSERT INTO bids (auction_id, user_id, amount)
         VALUES (?, ?, ?)`,
        [auctionId, userId, amount]
    );

    return {
        id: result.insertId,
        auctionId,
        userId,
        amount
    };
}

async function findByAuctionId(auctionId) {
    const [bids] = await pool.execute(
        `SELECT * FROM bids
         WHERE auction_id = ?
         ORDER BY created_at ASC`,
        [auctionId]
    );
    return bids;
}

module.exports = { create, findByAuctionId };