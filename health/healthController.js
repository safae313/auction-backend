const { checkDatabase } = require('../db/mysql');
const { checkRedis } = require('../redis/redis');

function liveness(req, res) {
    res.json({ status: 'ok' });
}

async function readiness(req, res) {
    const checks = await Promise.allSettled([
        checkDatabase(),
        checkRedis()
    ]);
    const dependencies = {
        mysql: checks[0].status === 'fulfilled' ? 'ok' : 'error',
        redis: checks[1].status === 'fulfilled' ? 'ok' : 'error'
    };
    const ready = Object.values(dependencies).every((status) => status === 'ok');

    res.status(ready ? 200 : 503).json({
        status: ready ? 'ok' : 'not_ready',
        dependencies
    });
}

module.exports = { liveness, readiness };