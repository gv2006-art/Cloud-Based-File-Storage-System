const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectVersionsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, BUCKET_NAME } = require('../config/s3');

const PRESIGNED_URL_EXPIRY = parseInt(process.env.PRESIGNED_URL_EXPIRY, 10) || 300;

/**
 * Build the S3 object key for a user's file. Namespacing by user id keeps
 * one user's objects logically isolated inside a shared bucket.
 */
function buildObjectKey(userId, fileId, originalName) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `users/${userId}/files/${fileId}/${safeName}`;
}

/**
 * Upload a buffer to S3. Because the bucket has versioning enabled,
 * uploading to an existing key creates a new version rather than
 * overwriting data, which is what backs the file-versioning feature.
 * Returns the new VersionId assigned by S3.
 */
async function uploadObject({ key, body, contentType }) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  });
  const result = await s3Client.send(command);
  return result.VersionId;
}

/** Generate a time-limited pre-signed URL to download a specific object/version. */
async function getPresignedDownloadUrl(key, versionId) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ...(versionId ? { VersionId: versionId } : {}),
  });
  return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRY });
}

/**
 * Generate a time-limited pre-signed URL the browser can PUT directly to,
 * so large files never have to pass through the Node process.
 */
async function getPresignedUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  });
  return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRY });
}

/**
 * Delete an object. If versioning is enabled and no VersionId is passed,
 * S3 inserts a delete marker instead of erasing history — every prior
 * version remains recoverable, matching the "soft delete" behaviour we
 * want for the app's trash/undo story.
 */
async function deleteObject(key) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  return s3Client.send(command);
}

/** List all known versions (and delete markers) for a given key, newest first. */
async function listObjectVersions(key) {
  const command = new ListObjectVersionsCommand({
    Bucket: BUCKET_NAME,
    Prefix: key,
  });
  const result = await s3Client.send(command);
  return (result.Versions || [])
    .filter((v) => v.Key === key)
    .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));
}

/**
 * "Restore" an older version by copying that version's bytes back on top
 * as a brand-new current version. This is the standard S3 pattern for
 * restoring history without special "undo" API support.
 */
async function restoreVersion(key, versionId) {
  const command = new CopyObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    CopySource: `${BUCKET_NAME}/${encodeURIComponent(key)}?versionId=${versionId}`,
    ServerSideEncryption: 'AES256',
  });
  const result = await s3Client.send(command);
  return result.VersionId;
}

async function headObject(key, versionId) {
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ...(versionId ? { VersionId: versionId } : {}),
  });
  return s3Client.send(command);
}

module.exports = {
  buildObjectKey,
  uploadObject,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  deleteObject,
  listObjectVersions,
  restoreVersion,
  headObject,
};
