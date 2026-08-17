const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');

// Google OAuth 2.0 strategy. On first login we create a local user record
// keyed by the Google profile id; on subsequent logins we just look it up.
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        if (!email) {
          return done(new Error('Google account did not return an email address'), null);
        }

        let user = await User.findOne({ where: { googleId: profile.id } });

        if (!user) {
          // Also guard against an existing account with the same email
          // (e.g. created before Google linking was added).
          user = await User.findOne({ where: { email } });
        }

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email,
            displayName: profile.displayName || email.split('@')[0],
            avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          });
        } else if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
