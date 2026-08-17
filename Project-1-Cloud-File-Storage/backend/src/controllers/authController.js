const { signToken } = require('../middleware/auth');

/**
 * Called after Passport's Google strategy has already authenticated the
 * user (see routes/auth.js). We issue our own short-lived JWT so the
 * React SPA can talk to the API statelessly instead of relying on
 * server-side sessions for every request.
 */
function googleCallback(req, res) {
  const token = signToken(req.user);
  const redirectUrl = new URL('/oauth/callback', process.env.CLIENT_URL);
  redirectUrl.searchParams.set('token', token);
  res.redirect(redirectUrl.toString());
}

function getCurrentUser(req, res) {
  const { id, email, displayName, avatarUrl, storageUsedBytes } = req.user;
  res.json({ id, email, displayName, avatarUrl, storageUsedBytes });
}

function logout(req, res) {
  // Stateless JWT auth: logout is a client-side token discard. We still
  // expose an endpoint so the frontend has a single place to call and so
  // a server-side token blocklist can be added later without an API change.
  res.json({ message: 'Logged out' });
}

module.exports = { googleCallback, getCurrentUser, logout };
