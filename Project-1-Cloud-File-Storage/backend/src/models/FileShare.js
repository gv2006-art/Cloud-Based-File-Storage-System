const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class FileShare extends Model {}

  FileShare.init(
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
      // Who created the share (must be the file owner).
      sharedById: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'shared_by_id',
      },
      // Set when sharing directly with another registered user.
      sharedWithId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'shared_with_id',
      },
      // Random token used for public/link-based sharing.
      shareToken: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'share_token',
      },
      permission: {
        type: DataTypes.ENUM('view', 'download'),
        defaultValue: 'view',
      },
      // NULL = permanent link, otherwise the link stops working after this time.
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at',
      },
      revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'FileShare',
      tableName: 'file_shares',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['file_id'] },
        { fields: ['share_token'], unique: true },
        { fields: ['shared_with_id'] },
      ],
    }
  );

  return FileShare;
};
