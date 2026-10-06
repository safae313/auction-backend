const auctionService = require('../services/auctionService');
const bidService = require('../services/bidService');
const { AppError } = require('../middleware/errorHandler');

function getAuctionId(req) {
    const rawId = req.params.id;
    const auctionId = Number(rawId);

    if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(auctionId) || auctionId < 1) {
        throw new AppError(400, 'INVALID_AUCTION_ID', 'Invalid auction ID');
    }

    return auctionId;
}

async function listAuctions(req, res) {
    res.json(await auctionService.listAuctions());
}

async function getAuction(req, res) {
    res.json(await auctionService.getAuction(getAuctionId(req)));
}

async function placeBid(req, res) {
    const auctionId = getAuctionId(req);
    const { userId, amount } = req.body || {};

    if (!Number.isSafeInteger(userId) || userId < 1) {
        throw new AppError(400, 'INVALID_USER_ID', 'userId must be a positive integer');
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        throw new AppError(400, 'INVALID_AMOUNT', 'amount must be a valid number');
    }

    if (amount <= 0) {
        throw new AppError(400, 'INVALID_AMOUNT', 'amount must be greater than 0');
    }

    const result = await bidService.placeBid({ auctionId, userId, amount });
    res.status(201).json({
        message: 'Bid placed successfully',
        bid: result.bid,
        currentPrice: result.bid.amount,
        ...(result.warning ? { warning: result.warning } : {})
    });
}

async function listBids(req, res) {
    res.json(await auctionService.listBids(getAuctionId(req)));
}

async function closeAuction(req, res) {
    const auction = await auctionService.closeAuction(getAuctionId(req));
    res.json({ message: 'Auction closed', auction });
}

module.exports = {
    listAuctions,
    getAuction,
    placeBid,
    listBids,
    closeAuction
};