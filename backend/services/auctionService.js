const auctionRepository = require('../repositories/auctionRepository');
const bidRepository = require('../repositories/bidRepository');
const auctionCache = require('../cache/auctionCache');
const { withTransaction } = require('../db/mysql');
const { AppError } = require('../middleware/errorHandler');

async function listAuctions() {
    return auctionRepository.findAll();
}

async function getAuction(auctionId) {
    const cachedAuction = await auctionCache.getAuction(auctionId);
    if (cachedAuction) {
        return cachedAuction;
    }

    const auction = await auctionRepository.findById(auctionId);
    if (!auction) {
        throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found');
    }

    await auctionCache.setAuction(auction);
    return auction;
}

async function listBids(auctionId) {
    return bidRepository.findByAuctionId(auctionId);
}

async function closeAuction(auctionId) {
    const auction = await withTransaction(async (connection) => {
        const currentAuction = await auctionRepository.findByIdForUpdate(
            connection,
            auctionId
        );

        if (!currentAuction) {
            throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found');
        }

        if (currentAuction.status === 'CLOSED') {
            throw new AppError(400, 'AUCTION_ALREADY_CLOSED', 'Auction is already closed');
        }

        await auctionRepository.updateStatus(connection, auctionId, 'CLOSED');
        return { ...currentAuction, status: 'CLOSED' };
    });

    await auctionCache.setAuction(auction);
    return auction;
}

module.exports = { listAuctions, getAuction, listBids, closeAuction };