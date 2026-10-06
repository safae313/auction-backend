const { AppError } = require('./errorHandler');

function notFound(req, res, next) {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}

module.exports = notFound;