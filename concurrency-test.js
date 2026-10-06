const http = require('http');

const bids = [
    { userId: 1, amount: 29500 },
    { userId: 1, amount: 28500 }
];

function sendBid(bid) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(bid);

        const options = {
            hostname: 'localhost',
            port: 4400,
            path: '/api/auctions/1/bid',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';

            res.on('data', chunk => {
                body += chunk;
            });

            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: JSON.parse(body)
                });
            });
        });

        req.on('error', reject);

        req.write(data);
        req.end();
    });
}

async function test() {
    console.log('Sending bids simultaneously...\n');

    const results = await Promise.all(
        bids.map(bid => sendBid(bid))
    );

    console.log(results);
}

test();