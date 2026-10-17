class AppError extends Error {
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    const status = Number.isInteger(error.status) ? error.status : 500;
    const isInternal = status >= 500;
    const message = isInternal && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message || 'Internal server error';
    const code = error.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');

    if (isInternal) {
        console.error(JSON.stringify({
            level: 'error',
            message: 'Request failed',
            method: req.method,
            route: req.route?.path || req.path,
            status,
            ...(req.params?.id ? { auctionId: req.params.id } : {}),
            error: error.message
        }));
    }

    return res.status(status).json({
        message,
        error: message,
        code
    });
}

module.exports = { AppError, errorHandler };