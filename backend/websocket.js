const WebSocket = require('ws');
const { subscribeToAuctionEvents } = require('./events/auctionEvents');

const auctionRooms = new Map();
let websocketServer;

async function createWebSocketServer(server) {
    websocketServer = new WebSocket.Server({ server });

    websocketServer.on('connection', (socket) => {
        socket.auctionIds = new Set();
        socket.send(JSON.stringify({
            type: 'CONNECTED',
            message: 'WebSocket connection established'
        }));

        socket.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                const auctionId = Number(data.auctionId);

                if (
                    data.type !== 'SUBSCRIBE_AUCTION' ||
                    !Number.isSafeInteger(auctionId) ||
                    auctionId < 1
                ) {
                    return;
                }

                if (!auctionRooms.has(auctionId)) {
                    auctionRooms.set(auctionId, new Set());
                }

                auctionRooms.get(auctionId).add(socket);
                socket.auctionIds.add(auctionId);
                socket.send(JSON.stringify({ type: 'SUBSCRIBED', auctionId }));
            } catch (error) {
                console.error(JSON.stringify({
                    level: 'warn',
                    message: 'Invalid WebSocket message',
                    error: error.message
                }));
            }
        });

        socket.on('close', () => {
            for (const auctionId of socket.auctionIds) {
                const clients = auctionRooms.get(auctionId);
                clients?.delete(socket);
                if (clients?.size === 0) {
                    auctionRooms.delete(auctionId);
                }
            }
        });

        socket.on('error', (error) => {
            console.error(JSON.stringify({
                level: 'warn',
                message: 'WebSocket connection error',
                error: error.message
            }));
        });
    });

    await subscribeToAuctionEvents((event) => {
        const clients = auctionRooms.get(event.auctionId);
        if (!clients) {
            return;
        }

        for (const socket of clients) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(event));
            }
        }
    });

    return websocketServer;
}

async function closeWebSocketServer() {
    if (!websocketServer) {
        return;
    }

    const server = websocketServer;
    const closed = new Promise((resolve) => server.close(resolve));

    for (const socket of server.clients) {
        socket.close(1001, 'Server shutting down');
    }

    const forceClose = setTimeout(() => {
        for (const socket of server.clients) {
            socket.terminate();
        }
    }, 5000);
    forceClose.unref();

    await closed;
    clearTimeout(forceClose);
    websocketServer = undefined;
}

module.exports = { createWebSocketServer, closeWebSocketServer };
