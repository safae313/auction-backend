require('dotenv').config();


const http = require('node:http');
const { config, assertRuntimeConfig } = require('./config/config');
const app = require('./app');
const { checkDatabase, closeDatabase } = require('./db/mysql');
const { connectRedis, closeRedis } = require('./redis/redis');
const { createWebSocketServer, closeWebSocketServer } = require('./websocket');

async function startServer() {
    assertRuntimeConfig();
    void checkDatabase().catch((error) => {
        console.error(JSON.stringify({
            level: 'warn',
            message: 'MySQL is not ready yet',
            error: error.message
        }));
    });

    const server = http.createServer(app);
    await createWebSocketServer(server);
    void connectRedis();

    try {
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(config.port, config.host, resolve);
        });
    } catch (error) {
        await closeWebSocketServer();
        await Promise.allSettled([closeRedis(), closeDatabase()]);
        throw error;
    }

    console.log(JSON.stringify({
        level: 'info',
        message: 'Auction API listening',
        host: config.host,
        port: config.port
    }));

    let shutdownPromise;
    const shutdown = (signal) => {
        if (shutdownPromise) {
            return shutdownPromise;
        }

        console.log(JSON.stringify({ level: 'info', message: 'Shutdown started', signal }));
        const httpClosed = new Promise((resolve) => server.close(resolve));
        server.closeIdleConnections?.();

        shutdownPromise = (async () => {
            await closeWebSocketServer();
            await httpClosed;
            const results = await Promise.allSettled([
                closeRedis(),
                closeDatabase()
            ]);
            const failures = results.filter((result) => result.status === 'rejected');

            if (failures.length > 0) {
                process.exitCode = 1;
                console.error(JSON.stringify({
                    level: 'error',
                    message: 'One or more resources failed to close cleanly',
                    errors: failures.map((failure) => failure.reason.message)
                }));
            }

            console.log(JSON.stringify({ level: 'info', message: 'Shutdown complete' }));
        })();

        return shutdownPromise;
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));

    return { server, shutdown };
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error(JSON.stringify({
            level: 'fatal',
            message: 'Application startup failed',
            error: error.message
        }));
        process.exitCode = 1;
    });
}

module.exports = { startServer };