const request = require('supertest');

jest.mock('../src/utils/s3Utils');

const app = require('../src/app');
const { sequelize, User } = require('../src/models');
const { signToken } = require('../src/middleware/auth');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Authentication & authorization', () => {
  test('GET /api/auth/me without a token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me with a garbage token returns 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me with a valid JWT returns the user profile', async () => {
    const user = await User.create({
      googleId: 'google-123',
      email: 'student@example.com',
      displayName: 'Test Student',
    });
    const token = signToken(user);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('student@example.com');
    expect(res.body.id).toBe(user.id);
  });

  test('POST /api/auth/logout requires authentication', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  test('a token signed for a deleted user is rejected', async () => {
    const user = await User.create({
      googleId: 'google-456',
      email: 'ghost@example.com',
      displayName: 'Ghost User',
    });
    const token = signToken(user);
    await user.destroy();

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
