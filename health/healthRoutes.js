const express = require('express');
const controller = require('./healthController');

const router = express.Router();

router.get('/health', controller.liveness);
router.get('/health/ready', controller.readiness);

module.exports = router;