const mysql = require('mysql2/promise');
const { config } = require('../config/config');

const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    connectionLimit: config.db.connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

async function checkDatabase() {
    await pool.query('SELECT 1');
}

async function withTransaction(work) {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;

        const result = await work(connection);

        await connection.commit();
        transactionStarted = false;
        return result;
    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(JSON.stringify({
                    level: 'error',
                    message: 'MySQL transaction rollback failed',
                    error: rollbackError.message
                }));
            }
        }

        throw error;
    } finally {
        connection.release();
    }
}

async function closeDatabase() {
    await pool.end();
}

module.exports = { pool, checkDatabase, withTransaction, closeDatabase };