@echo off
REM deploy.bat - Deployment script for Cloudflare Workers (Windows)

echo Deploying Vyral Cloudflare Workers...

REM Check if wrangler is installed
where wrangler >nul 2>&1
if %errorlevel% neq 0 (
    echo Wrangler could not be found. Installing...
    npm install -g wrangler
)

REM Login to Cloudflare (if not already logged in)
echo Please login to Cloudflare if prompted...
wrangler login

REM Add secrets
echo Adding secrets... (you'll be prompted to enter values)
wrangler secret put ASSEMBLYAI_KEY
wrangler secret put OPENROUTER_KEY
wrangler secret put SHOTSTACK_KEY
wrangler secret put VYRAL_WORKER_SECRET

REM Deploy workers
echo Deploying workers...
wrangler deploy

echo Deployment complete!
echo Make sure to update your environment variables in the Vyral application:
echo - CLOUDFLARE_WORKER_URL (set to your deployed worker URL)
echo - VYRAL_WORKER_SECRET (same as used in secrets)

pause