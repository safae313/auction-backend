const { httpRequestDuration } = require('../metrics');

function requestLogger(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.once('finish', () => {
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
        const route = req.route?.path
            ? `${req.baseUrl}${req.route.path}`
            : req.path;
        const statusCode = String(res.statusCode);

        httpRequestDuration.observe(
            { method: req.method, route, status_code: statusCode },
            durationSeconds
        );

        console.log(JSON.stringify({
            level: 'info',
            method: req.method,
            route,
            statusCode: res.statusCode,
            durationMs: Math.round(durationSeconds * 1000),
            ...(req.params?.id ? { auctionId: req.params.id } : {})
        }));
    });

    next();
}

module.exports = requestLogger;