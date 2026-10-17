function positiveInteger(value, fallback, name) {
    if (value === undefined || value === '') {
        return fallback;
    }

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }

    return parsed;
}

const config = Object.freeze({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: positiveInteger(process.env.PORT, 4400, 'PORT'),
    host: process.env.HOST || '0.0.0.0',
    trustProxy: process.env.TRUST_PROXY === 'false'
        ? false
        : positiveInteger(process.env.TRUST_PROXY, 1, 'TRUST_PROXY'),
    db: Object.freeze({
        host: process.env.DB_HOST,
        port: positiveInteger(process.env.DB_PORT, 3306, 'DB_PORT'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME,
        connectionLimit: positiveInteger(
            process.env.DB_CONNECTION_LIMIT,
            10,
            'DB_CONNECTION_LIMIT'
        )
    }),
    redisUrl: process.env.REDIS_URL,
    redisTtl: positiveInteger(process.env.REDIS_TTL, 60, 'REDIS_TTL'),
    corsOrigins: (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    rateLimitWindowMs: positiveInteger(
        process.env.RATE_LIMIT_WINDOW_MS,
        60000,
        'RATE_LIMIT_WINDOW_MS'
    ),
    rateLimitMax: positiveInteger(
        process.env.RATE_LIMIT_MAX,
        120,
        'RATE_LIMIT_MAX'
    )
});

function assertRuntimeConfig() {
    const required = [
        ['DB_HOST', config.db.host],
        ['DB_USER', config.db.user],
        ['DB_NAME', config.db.name],
        ['REDIS_URL', config.redisUrl]
    ];
    const missing = required
        .filter(([, value]) => !value)
        .map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    let redisUrl;
    try {
        redisUrl = new URL(config.redisUrl);
    } catch {
        throw new Error('REDIS_URL must be a valid Redis URL');
    }

    if (!['redis:', 'rediss:'].includes(redisUrl.protocol)) {
        throw new Error('REDIS_URL must use the redis:// or rediss:// scheme');
    }
}

module.exports = { config, assertRuntimeConfig };