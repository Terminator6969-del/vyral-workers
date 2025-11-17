# Vyral Cloudflare Workers

This directory contains all the Cloudflare Workers for the Vyral AI video processing platform.

## Workers Overview

1. **Transcribe Worker** - Handles audio transcription using AssemblyAI
2. **Vision Worker** - Performs video content analysis
3. **Strategy Worker** - Generates content strategies based on transcripts
4. **Script Generator Worker** - Creates engaging scripts for social media
5. **Caption Pack Worker** - Generates multi-platform optimized captions
6. **Render Captions Worker** - Renders videos with overlaid captions using Shotstack
7. **Micro Clips Worker** - Creates short clips from key moments
8. **Platform Captions Worker** - Generates platform-specific captions

## Setup

1. Install Wrangler globally:
   ```bash
   npm install -g wrangler
   ```

2. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```

3. Add secrets:
   ```bash
   wrangler secret put ASSEMBLYAI_KEY
   wrangler secret put OPENROUTER_KEY
   wrangler secret put SHOTSTACK_KEY
   wrangler secret put VYRAL_WORKER_SECRET
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

## Environment Variables

- `ASSEMBLYAI_KEY` - API key for AssemblyAI transcription service
- `OPENROUTER_KEY` - API key for OpenRouter LLM access
- `SHOTSTACK_KEY` - API key for Shotstack video rendering
- `VYRAL_WORKER_SECRET` - Secret key for authenticating requests to workers

## Usage

After deployment, workers will be available at your Cloudflare Workers URL with the following endpoints:

- `/transcribe`
- `/vision`
- `/strategy`
- `/script-generator`
- `/caption-pack`
- `/render-captions`
- `/micro-clips`
- `/platform-captions`

Example request:
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/transcribe \
  -H "Authorization: Bearer YOUR_VYRAL_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "file_url": "https://example.com/video.mp4",
    "job_id": "12345",
    "webhook_url": "https://your-app.com/webhook"
  }'
```