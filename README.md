# Spend Tracking Web App

A Next.js web application with comprehensive spend tracking for OpenRouter API and Nano Banana Pro image generation.

## Features

- **OpenRouter Cost Capture**: Real-time cost tracking from API response headers
- **Nano Banana Pro Tracking**: Image generation cost logging
- **Session-Level Display**: Live spend dashboard with breakdowns
- **Persistent Storage**: localStorage-based session persistence

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

## Development

```bash
npm run dev
```

## Environment Variables

- `NEXT_PUBLIC_OPENROUTER_API_KEY` - Your OpenRouter API key
- `NEXT_PUBLIC_NANO_BANANA_API_KEY` - Your Nano Banana Pro API key
