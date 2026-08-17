const { Folder, File } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

async function createFolder(req, res) {
  const { name, parentId } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Folder name is required');
  }

  if (parentId) {
    const parent = await Folder.findOne({ where: { id: parentId, ownerId: req.user.id } });
    if (!parent) throw new ApiError(404, 'Parent folder not found');
  }

  const folder = await Folder.create({
    name: name.trim(),
    ownerId: req.user.id,
    parentId: parentId || null,
  });

  res.status(201).json(folder);
}

async function listFolders(req, res) {
  const { parentId } = req.query;

  const folders = await Folder.findAll({
    where: {
      ownerId: req.user.id,
      parentId: parentId || { [Op.is]: null },
    },
    order: [['name', 'ASC']],
  });

  res.json(folders);
}

async function deleteFolder(req, res) {
  const folder = await Folder.findOne({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!folder) throw new ApiError(404, 'Folder not found');

  const fileCount = await File.count({ where: { folderId: folder.id, isDeleted: false } });
  const childCount = await Folder.count({ where: { parentId: folder.id } });

  if (fileCount > 0 || childCount > 0) {
    throw new ApiError(400, 'Folder is not empty. Remove its contents first.');
  }

  await folder.destroy();
  res.json({ message: 'Folder deleted' });
}

module.exports = { createFolder, listFolders, deleteFolder };
