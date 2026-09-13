import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

// We don't use passport sessions (see server.ts: session: false everywhere).
// Instead, the callback route issues our own JWT. Passport here is only
// responsible for the OAuth handshake + fetching the Google profile.
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("Google profile did not return an email"));
        }

        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          update: {
            name: profile.displayName,
            email,
            avatar: profile.photos?.[0]?.value,
          },
          create: {
            googleId: profile.id,
            name: profile.displayName,
            email,
            avatar: profile.photos?.[0]?.value,
          },
        });

        return done(null, user);
      } catch (err) {
        logger.error("Google OAuth upsert failed", { error: String(err) });
        return done(err as Error);
      }
    }
  )
);

export default passport;
