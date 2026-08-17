import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(err);
  }
);

export const googleLoginUrl = `${API_BASE_URL}/api/auth/google`;

export const api = {
  me: () => client.get('/api/auth/me').then((r) => r.data),
  logout: () => client.post('/api/auth/logout'),

  listFiles: (params) => client.get('/api/files', { params }).then((r) => r.data),
  getFile: (id) => client.get(`/api/files/${id}`).then((r) => r.data),
  uploadFile: (file, folderId, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    if (folderId) form.append('folderId', folderId);
    return client
      .post('/api/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      })
      .then((r) => r.data);
  },
  renameFile: (id, originalName) =>
    client.patch(`/api/files/${id}`, { originalName }).then((r) => r.data),
  deleteFile: (id) => client.delete(`/api/files/${id}`).then((r) => r.data),

  listVersions: (id) => client.get(`/api/files/${id}/versions`).then((r) => r.data),
  getVersionDownloadUrl: (id, versionId) =>
    client.get(`/api/files/${id}/versions/${versionId}`).then((r) => r.data),
  restoreVersion: (id, versionId) =>
    client.post(`/api/files/${id}/restore/${versionId}`).then((r) => r.data),

  createShare: (id, payload) => client.post(`/api/files/${id}/share`, payload).then((r) => r.data),
  listShares: (id) => client.get(`/api/files/${id}/shares`).then((r) => r.data),
  revokeShare: (id, shareId) => client.delete(`/api/files/${id}/share/${shareId}`).then((r) => r.data),
  resolveShare: (token) => client.get(`/api/share/${token}`).then((r) => r.data),

  listFolders: (parentId) => client.get('/api/folders', { params: { parentId } }).then((r) => r.data),
  createFolder: (name, parentId) => client.post('/api/folders', { name, parentId }).then((r) => r.data),
  deleteFolder: (id) => client.delete(`/api/folders/${id}`).then((r) => r.data),
};

export default client;
