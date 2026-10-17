import http from 'k6/http';

export const options = {
    vus: 300,
    duration: '10s',
};

export default function () {
    const res = http.get('http://localhost:8080/api/auctions/1');

    if (res.status !== 200) {
        console.log(`HTTP ERROR: ${res.status}`);
    }
}