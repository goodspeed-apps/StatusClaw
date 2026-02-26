/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_OPENROUTER_API_KEY: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
    NEXT_PUBLIC_NANO_BANANA_API_KEY: process.env.NEXT_PUBLIC_NANO_BANANA_API_KEY,
    NEXT_PUBLIC_SESSION_ID: process.env.NEXT_PUBLIC_SESSION_ID,
  },
}

module.exports = nextConfig