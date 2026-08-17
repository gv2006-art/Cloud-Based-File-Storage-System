const express = require('express');
const fileController = require('../controllers/fileController');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Deliberately unauthenticated — see resolveShare's docstring for the
// authorization model that keeps this safe.
router.get('/:token', asyncHandler(fileController.resolveShare));

module.exports = router;
