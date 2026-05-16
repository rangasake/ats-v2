/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No env block — all Google/JWT vars are server-only and available
  // automatically in API routes via process.env. Exposing GOOGLE_SHEETS_ID
  // to the client bundle is unnecessary and a minor security risk.
};

module.exports = nextConfig;
