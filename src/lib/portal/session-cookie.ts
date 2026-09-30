/**
 * Session cookie name — shared by the Edge middleware (presence check only)
 * and the server session module (full DB validation). `__Host-` forces
 * Secure + Path=/ + no Domain in production; plain name on http://localhost.
 */
export const SESSION_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-isha_session' : 'isha_session';
