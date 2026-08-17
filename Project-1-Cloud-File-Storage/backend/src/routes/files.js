const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const fileController = require('../controllers/fileController');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Files are buffered in memory then streamed straight to S3 — never
// written to the container/EC2 filesystem. 100MB cap is a sane default
// for a demo app; raise via MAX_UPLOAD_MB if needed.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (parseInt(process.env.MAX_UPLOAD_MB, 10) || 100) * 1024 * 1024 },
});

router.use(requireAuth);

router.get('/', asyncHandler(fileController.listFiles));
router.post('/upload', upload.single('file'), asyncHandler(fileController.uploadFile));
router.get('/:id', asyncHandler(fileController.getFile));
router.patch('/:id', asyncHandler(fileController.renameFile));
router.delete('/:id', asyncHandler(fileController.deleteFile));

router.get('/:id/versions', asyncHandler(fileController.listVersions));
router.get('/:id/versions/:versionId', asyncHandler(fileController.getVersionDownloadUrl));
router.post('/:id/restore/:versionId', asyncHandler(fileController.restoreVersion));

router.post('/:id/share', asyncHandler(fileController.createShare));
router.get('/:id/shares', asyncHandler(fileController.listShares));
router.delete('/:id/share/:shareId', asyncHandler(fileController.revokeShare));

module.exports = router;
