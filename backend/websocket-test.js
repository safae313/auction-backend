const WebSocket = require('ws');

const ws = new WebSocket(`ws://localhost:${process.env.PORT || 4400}`);

ws.on('open', () => {

    console.log('Connected to WebSocket server');

    ws.send(JSON.stringify({
        type: 'SUBSCRIBE_AUCTION',
        auctionId: 1
    }));

});

ws.on('message', (message) => {

    console.log(
        'Message received:',
        JSON.parse(message)
    );

});

ws.on('close', () => {
    console.log('Disconnected');
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});