const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class FileVersion extends Model {}

  // A row per S3 object version we know about. We mirror S3's own
  // versioning metadata here so the UI can list version history without
  // an S3 ListObjectVersions round trip on every page load, while the
  // actual bytes always live in S3 (never duplicated in Postgres).
  FileVersion.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      fileId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'file_id',
      },
      s3VersionId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 's3_version_id',
      },
      sizeBytes: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'size_bytes',
      },
      uploadedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'uploaded_by',
      },
    },
    {
      sequelize,
      modelName: 'FileVersion',
      tableName: 'file_versions',
      underscored: true,
      timestamps: true,
      updatedAt: false,
      indexes: [{ fields: ['file_id'] }],
    }
  );

  return FileVersion;
};
