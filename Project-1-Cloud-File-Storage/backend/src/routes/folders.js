const express = require('express');
const { requireAuth } = require('../middleware/auth');
const folderController = require('../controllers/folderController');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

router.post('/', asyncHandler(folderController.createFolder));
router.get('/', asyncHandler(folderController.listFolders));
router.delete('/:id', asyncHandler(folderController.deleteFolder));

module.exports = router;
