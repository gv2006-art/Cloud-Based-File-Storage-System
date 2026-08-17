const sequelize = require('../config/db');

const User = require('./User')(sequelize);
const Folder = require('./Folder')(sequelize);
const File = require('./File')(sequelize);
const FileVersion = require('./FileVersion')(sequelize);
const FileShare = require('./FileShare')(sequelize);

// ----- Associations -----

User.hasMany(Folder, { foreignKey: 'ownerId', as: 'folders' });
Folder.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Folder.hasMany(Folder, { foreignKey: 'parentId', as: 'children' });
Folder.belongsTo(Folder, { foreignKey: 'parentId', as: 'parent' });

User.hasMany(File, { foreignKey: 'ownerId', as: 'files' });
File.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Folder.hasMany(File, { foreignKey: 'folderId', as: 'files' });
File.belongsTo(Folder, { foreignKey: 'folderId', as: 'folder' });

File.hasMany(FileVersion, { foreignKey: 'fileId', as: 'versions' });
FileVersion.belongsTo(File, { foreignKey: 'fileId', as: 'file' });

File.hasMany(FileShare, { foreignKey: 'fileId', as: 'shares' });
FileShare.belongsTo(File, { foreignKey: 'fileId', as: 'file' });

User.hasMany(FileShare, { foreignKey: 'sharedWithId', as: 'sharedWithMe' });
FileShare.belongsTo(User, { foreignKey: 'sharedWithId', as: 'sharedWith' });
FileShare.belongsTo(User, { foreignKey: 'sharedById', as: 'sharedBy' });

module.exports = {
  sequelize,
  User,
  Folder,
  File,
  FileVersion,
  FileShare,
};
