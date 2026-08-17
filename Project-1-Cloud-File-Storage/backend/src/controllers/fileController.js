const { Op } = require('sequelize');
const crypto = require('crypto');
const { File, FileVersion, FileShare, Folder, User } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const s3 = require('../utils/s3Utils');

/**
 * Upload a file. Files are received in memory (see routes/files.js multer
 * config) and streamed straight to S3 — they are never written to the
 * application server's disk.
 *
 * If a file with the same name already exists in the same folder for this
 * user, we treat this as a *new version* of that logical file: we upload
 * to the same S3 key (S3 versioning keeps the previous bytes) and append a
 * FileVersion row, rather than creating a second File record.
 */
async function uploadFile(req, res) {
  if (!req.file) throw new ApiError(400, 'No file provided');

  const { originalname, mimetype, size, buffer } = req.file;
  const folderId = req.body.folderId || null;

  if (folderId) {
    const folder = await Folder.findOne({ where: { id: folderId, ownerId: req.user.id } });
    if (!folder) throw new ApiError(404, 'Target folder not found');
  }

  let file = await File.findOne({
    where: {
      ownerId: req.user.id,
      folderId: folderId || { [Op.is]: null },
      originalName: originalname,
      isDeleted: false,
    },
  });

  const isNewFile = !file;

  if (isNewFile) {
    file = await File.create({
      ownerId: req.user.id,
      folderId,
      originalName: originalname,
      mimeType: mimetype,
      sizeBytes: size,
      s3Key: '', // filled in below once we know the file id
    });
    file.s3Key = s3.buildObjectKey(req.user.id, file.id, originalname);
    await file.save();
  }

  const versionId = await s3.uploadObject({
    key: file.s3Key,
    body: buffer,
    contentType: mimetype,
  });

  await FileVersion.create({
    fileId: file.id,
    s3VersionId: versionId || 'null-version',
    sizeBytes: size,
    uploadedBy: req.user.id,
  });

  file.sizeBytes = size;
  file.mimeType = mimetype;
  file.currentVersionId = versionId || null;
  file.isDeleted = false;
  await file.save();

  req.user.storageUsedBytes = Number(req.user.storageUsedBytes) + size;
  await req.user.save();

  res.status(isNewFile ? 201 : 200).json({ file, newVersion: !isNewFile });
}

async function listFiles(req, res) {
  const { folderId, search } = req.query;

  const where = {
    ownerId: req.user.id,
    isDeleted: false,
  };

  if (search) {
    where.originalName = { [Op.iLike]: `%${search}%` };
  } else {
    where.folderId = folderId || { [Op.is]: null };
  }

  const files = await File.findAll({ where, order: [['updatedAt', 'DESC']] });
  res.json(files);
}

async function getFile(req, res) {
  const file = await File.findOne({ where: { id: req.params.id, ownerId: req.user.id, isDeleted: false } });
  if (!file) throw new ApiError(404, 'File not found');

  const downloadUrl = await s3.getPresignedDownloadUrl(file.s3Key, file.currentVersionId);
  res.json({ file, downloadUrl });
}

async function renameFile(req, res) {
  const { originalName } = req.body;
  if (!originalName || !originalName.trim()) throw new ApiError(400, 'A new name is required');

  const file = await File.findOne({ where: { id: req.params.id, ownerId: req.user.id, isDeleted: false } });
  if (!file) throw new ApiError(404, 'File not found');

  file.originalName = originalName.trim();
  await file.save();
  res.json(file);
}

/**
 * Soft-delete: mark the row deleted and remove the current object from S3.
 * Because the bucket is versioned, S3 places a delete marker rather than
 * erasing history, so version rows (and the underlying bytes) remain
 * intact and restorable if needed.
 */
async function deleteFile(req, res) {
  const file = await File.findOne({ where: { id: req.params.id, ownerId: req.user.id, isDeleted: false } });
  if (!file) throw new ApiError(404, 'File not found');

  await s3.deleteObject(file.s3Key);
  file.isDeleted = true;
  await file.save();

  res.json({ message: 'File deleted' });
}

async function listVersions(req, res) {
  const file = await File.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!file) throw new ApiError(404, 'File not found');

  const versions = await FileVersion.findAll({
    where: { fileId: file.id },
    order: [['createdAt', 'DESC']],
  });

  res.json(versions);
}

async function getVersionDownloadUrl(req, res) {
  const file = await File.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!file) throw new ApiError(404, 'File not found');

  const version = await FileVersion.findOne({
    where: { id: req.params.versionId, fileId: file.id },
  });
  if (!version) throw new ApiError(404, 'Version not found');

  const downloadUrl = await s3.getPresignedDownloadUrl(file.s3Key, version.s3VersionId);
  res.json({ downloadUrl, version });
}

/** Restore an older version by copying it back on top as the new current version. */
async function restoreVersion(req, res) {
  const file = await File.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!file) throw new ApiError(404, 'File not found');

  const version = await FileVersion.findOne({
    where: { id: req.params.versionId, fileId: file.id },
  });
  if (!version) throw new ApiError(404, 'Version not found');

  const newVersionId = await s3.restoreVersion(file.s3Key, version.s3VersionId);

  await FileVersion.create({
    fileId: file.id,
    s3VersionId: newVersionId || 'null-version',
    sizeBytes: version.sizeBytes,
    uploadedBy: req.user.id,
  });

  file.currentVersionId = newVersionId || null;
  file.sizeBytes = version.sizeBytes;
  file.isDeleted = false;
  await file.save();

  res.json({ message: 'Version restored', file });
}

// ---------- Sharing ----------

async function createShare(req, res) {
  const { permission = 'view', expiresInHours, sharedWithEmail } = req.body;

  const file = await File.findOne({ where: { id: req.params.id, ownerId: req.user.id, isDeleted: false } });
  if (!file) throw new ApiError(404, 'File not found');

  let sharedWithId = null;
  if (sharedWithEmail) {
    const targetUser = await User.findOne({ where: { email: sharedWithEmail } });
    if (!targetUser) throw new ApiError(404, 'No registered user with that email');
    if (targetUser.id === req.user.id) throw new ApiError(400, 'Cannot share a file with yourself');
    sharedWithId = targetUser.id;
  }

  const share = await FileShare.create({
    fileId: file.id,
    sharedById: req.user.id,
    sharedWithId,
    shareToken: crypto.randomBytes(24).toString('hex'),
    permission,
    expiresAt: expiresInHours ? new Date(Date.now() + expiresInHours * 3600 * 1000) : null,
  });

  const shareUrl = `${process.env.CLIENT_URL}/shared/${share.shareToken}`;
  res.status(201).json({ share, shareUrl });
}

async function listShares(req, res) {
  const file = await File.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!file) throw new ApiError(404, 'File not found');

  const shares = await FileShare.findAll({
    where: { fileId: file.id, revoked: false },
    include: [{ model: User, as: 'sharedWith', attributes: ['id', 'email', 'displayName'] }],
    order: [['createdAt', 'DESC']],
  });

  res.json(shares);
}

async function revokeShare(req, res) {
  const file = await File.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!file) throw new ApiError(404, 'File not found');

  const share = await FileShare.findOne({ where: { id: req.params.shareId, fileId: file.id } });
  if (!share) throw new ApiError(404, 'Share not found');

  share.revoked = true;
  await share.save();
  res.json({ message: 'Share revoked' });
}

/**
 * Public resolver used by the "open a shared link" page. Deliberately does
 * NOT require req.user — the share token itself is the credential — but it
 * does enforce expiry/revocation and the file owner's permission choice,
 * which is the authorization boundary that stops one user from reaching
 * another user's files by guessing/editing a file id.
 */
async function resolveShare(req, res) {
  const share = await FileShare.findOne({ where: { shareToken: req.params.token, revoked: false } });
  if (!share) throw new ApiError(404, 'This link is invalid or has been revoked');
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    throw new ApiError(410, 'This link has expired');
  }

  const file = await File.findByPk(share.fileId);
  if (!file || file.isDeleted) throw new ApiError(404, 'This file is no longer available');

  const downloadUrl =
    share.permission === 'download'
      ? await s3.getPresignedDownloadUrl(file.s3Key, file.currentVersionId)
      : null;

  res.json({
    file: {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    },
    permission: share.permission,
    downloadUrl,
  });
}

module.exports = {
  uploadFile,
  listFiles,
  getFile,
  renameFile,
  deleteFile,
  listVersions,
  getVersionDownloadUrl,
  restoreVersion,
  createShare,
  listShares,
  revokeShare,
  resolveShare,
};
