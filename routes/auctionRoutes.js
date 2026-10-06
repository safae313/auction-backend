const express = require('express');
const controller = require('../controllers/auctionController');

const router = express.Router();

router.get('/', controller.listAuctions);
router.get('/:id', controller.getAuction);
router.post('/:id/bid', controller.placeBid);
router.get('/:id/bids', controller.listBids);
router.post('/:id/close', controller.closeAuction);

module.exports = router;