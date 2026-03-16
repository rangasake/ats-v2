/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

module.exports = nextConfig;
