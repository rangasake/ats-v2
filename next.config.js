/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Only expose env vars that are safe to include in the client bundle.
    // JWT_SECRET must NEVER be here — it would be sent to the browser.
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
  },
};

module.exports = nextConfig;
