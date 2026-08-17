const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class File extends Model {}

  File.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'owner_id',
      },
      folderId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'folder_id',
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'original_name',
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'mime_type',
      },
      sizeBytes: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'size_bytes',
      },
      // The S3 object key. Stable for the lifetime of the logical file;
      // re-uploads create new S3 *versions* under the same key rather
      // than a new key, which is what powers real S3 version history.
      s3Key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 's3_key',
      },
      // The S3 VersionId of the object's current version, kept in sync
      // whenever a new version is uploaded or an older one is restored.
      currentVersionId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'current_version_id',
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_deleted',
      },
    },
    {
      sequelize,
      modelName: 'File',
      tableName: 'files',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['owner_id'] },
        { fields: ['folder_id'] },
        { fields: ['original_name'] },
      ],
    }
  );

  return File;
};
