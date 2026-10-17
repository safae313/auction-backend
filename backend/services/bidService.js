const auctionRepository = require('../repositories/auctionRepository');
const bidRepository = require('../repositories/bidRepository');
const auctionCache = require('../cache/auctionCache');
const auctionEvents = require('../events/auctionEvents');
const { withTransaction } = require('../db/mysql');
const { AppError } = require('../middleware/errorHandler');

async function placeBid({ auctionId, userId, amount }) {
    const result = await withTransaction(async (connection) => {
        const auction = await auctionRepository.findByIdForUpdate(
            connection,
            auctionId
        );

        if (!auction) {
            throw new AppError(404, 'AUCTION_NOT_FOUND', 'Auction not found');
        }

        if (auction.status !== 'OPEN') {
            throw new AppError(400, 'AUCTION_CLOSED', 'Auction is closed');
        }

        if (amount <= Number(auction.current_price)) {
            throw new AppError(
                400,
                'BID_NOT_HIGHER',
                `Bid must be greater than current price (${auction.current_price})`
            );
        }

        const bid = await bidRepository.create(connection, {
            auctionId,
            userId,
            amount
        });
        await auctionRepository.updateCurrentPrice(connection, auctionId, amount);

        return {
            auction: { ...auction, current_price: amount },
            bid
        };
    });

    const cacheUpdated = await auctionCache.setAuction(result.auction);
    const eventPublished = await auctionEvents.publishNewBid({
        ...result.bid,
        bidId: result.bid.id
    });
    console.log(JSON.stringify({
        level: 'info',
        message: 'Bid committed',
        auctionId,
        bidId: result.bid.id
    }));
    let warning;

    if (!cacheUpdated) {
        warning = 'Redis cache update failed';
    } else if (!eventPublished) {
        warning = 'NEW_BID event publishing failed';
    }

    return {
        ...result,
        ...(warning ? { warning } : {})
    };
}

module.exports = { placeBid };