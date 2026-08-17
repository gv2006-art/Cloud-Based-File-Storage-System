const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Single shared S3 client used across the app.
// Credentials are picked up from environment variables (or an attached
// IAM role when running on EC2 — in that case AWS_ACCESS_KEY_ID /
// AWS_SECRET_ACCESS_KEY can be left blank in .env).
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

module.exports = { s3Client, BUCKET_NAME };
