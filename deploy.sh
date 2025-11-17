#!/bin/bash

# deploy.sh - Deployment script for Cloudflare Workers

echo "Deploying Vyral Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null
then
    echo "Wrangler could not be found. Installing..."
    npm install -g wrangler
fi

# Login to Cloudflare (if not already logged in)
echo "Please login to Cloudflare if prompted..."
wrangler login

# Add secrets
echo "Adding secrets... (you'll be prompted to enter values)"
wrangler secret put ASSEMBLYAI_KEY
wrangler secret put OPENROUTER_KEY
wrangler secret put SHOTSTACK_KEY
wrangler secret put VYRAL_WORKER_SECRET

# Deploy workers
echo "Deploying workers..."
wrangler deploy

echo "Deployment complete!"
echo "Make sure to update your environment variables in the Vyral application:"
echo "- CLOUDFLARE_WORKER_URL (set to your deployed worker URL)"
echo "- VYRAL_WORKER_SECRET (same as used in secrets)"