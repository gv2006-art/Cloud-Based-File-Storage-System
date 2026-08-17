const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Folder extends Model {}

  Folder.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true, len: [1, 255] },
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'owner_id',
      },
      parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'parent_id',
      },
    },
    {
      sequelize,
      modelName: 'Folder',
      tableName: 'folders',
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ['owner_id'] }, { fields: ['parent_id'] }],
    }
  );

  return Folder;
};
