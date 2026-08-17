const request = require('supertest');

jest.mock('../src/utils/s3Utils');

const app = require('../src/app');
const s3 = require('../src/utils/s3Utils');
const { sequelize, User } = require('../src/models');
const { signToken } = require('../src/middleware/auth');

let userA;
let userB;
let tokenA;
let tokenB;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  userA = await User.create({ googleId: 'g-a', email: 'alice@example.com', displayName: 'Alice' });
  userB = await User.create({ googleId: 'g-b', email: 'bob@example.com', displayName: 'Bob' });
  tokenA = signToken(userA);
  tokenB = signToken(userB);
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(() => {
  jest.clearAllMocks();
  s3.buildObjectKey.mockImplementation((uid, fid, name) => `users/${uid}/files/${fid}/${name}`);
  s3.uploadObject.mockResolvedValue('version-1');
  s3.getPresignedDownloadUrl.mockResolvedValue('https://s3.example.com/presigned-download');
  s3.deleteObject.mockResolvedValue({});
  s3.listObjectVersions.mockResolvedValue([]);
  s3.restoreVersion.mockResolvedValue('version-restored');
});

describe('File upload, listing and access control', () => {
  test('rejects upload without auth', async () => {
    const res = await request(app).post('/api/files/upload').attach('file', Buffer.from('hi'), 'note.txt');
    expect(res.status).toBe(401);
  });

  test('uploads a new file to S3 and records it in Postgres', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('hello world'), 'notes.txt');

    expect(res.status).toBe(201);
    expect(res.body.file.originalName).toBe('notes.txt');
    expect(s3.uploadObject).toHaveBeenCalledTimes(1);
  });

  test('re-uploading the same filename creates a new version, not a new file', async () => {
    await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('version one'), 'report.txt');

    const second = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('version two'), 'report.txt');

    expect(second.status).toBe(200);
    expect(second.body.newVersion).toBe(true);

    const list = await request(app).get('/api/files').set('Authorization', `Bearer ${tokenA}`);
    const reportFiles = list.body.filter((f) => f.originalName === 'report.txt');
    expect(reportFiles).toHaveLength(1);

    const versions = await request(app)
      .get(`/api/files/${reportFiles[0].id}/versions`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(versions.body.length).toBeGreaterThanOrEqual(2);
  });

  test('a user cannot access another user\'s file by guessing its id', async () => {
    const upload = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('private data'), 'private.txt');

    const fileId = upload.body.file.id;

    const asOwner = await request(app).get(`/api/files/${fileId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(asOwner.status).toBe(200);

    const asOther = await request(app).get(`/api/files/${fileId}`).set('Authorization', `Bearer ${tokenB}`);
    expect(asOther.status).toBe(404);
  });

  test('deleting a file soft-deletes it and it disappears from listings', async () => {
    const upload = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('temp'), 'temp.txt');

    const fileId = upload.body.file.id;

    const del = await request(app).delete(`/api/files/${fileId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(200);
    expect(s3.deleteObject).toHaveBeenCalled();

    const getAfterDelete = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(getAfterDelete.status).toBe(404);
  });
});

describe('File sharing', () => {
  test('owner can create a share link and a stranger can resolve it', async () => {
    const upload = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('shared content'), 'shared.txt');

    const fileId = upload.body.file.id;

    const share = await request(app)
      .post(`/api/files/${fileId}/share`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ permission: 'download' });

    expect(share.status).toBe(201);
    const token = share.body.share.shareToken;

    const resolved = await request(app).get(`/api/share/${token}`);
    expect(resolved.status).toBe(200);
    expect(resolved.body.file.originalName).toBe('shared.txt');
    expect(resolved.body.downloadUrl).toBeTruthy();
  });

  test('revoked share links no longer resolve', async () => {
    const upload = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('revoke me'), 'revoke.txt');

    const fileId = upload.body.file.id;

    const share = await request(app)
      .post(`/api/files/${fileId}/share`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ permission: 'view' });

    const shareId = share.body.share.id;
    const token = share.body.share.shareToken;

    const revoke = await request(app)
      .delete(`/api/files/${fileId}/share/${shareId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(revoke.status).toBe(200);

    const resolved = await request(app).get(`/api/share/${token}`);
    expect(resolved.status).toBe(404);
  });

  test('another user cannot share a file they do not own', async () => {
    const upload = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('nope'), 'nope.txt');

    const fileId = upload.body.file.id;

    const res = await request(app)
      .post(`/api/files/${fileId}/share`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ permission: 'view' });

    expect(res.status).toBe(404);
  });
});
