# Vyral Cloudflare Workers Deployment Guide

## Prerequisites

1. Cloudflare account
2. Wrangler CLI installed (`npm install -g wrangler`)
3. API keys for:
   - AssemblyAI
   - OpenRouter
   - Shotstack
   - OpenAI Organization ID (optional but recommended)

## Setup Instructions

### 1. Create KV Namespace

1. Log in to your Cloudflare dashboard
2. Go to Workers & Pages > KV
3. Click "Create a namespace"
4. Name it "VYRAL_CACHE"
5. Note the namespace ID for the next step

### 2. Update wrangler.toml

Update the `wrangler.toml` file with your KV namespace ID:

```toml
# KV Namespace binding
[[kv_namespaces]]
binding = "VYRAL_CACHE"
id = "your-actual-kv-namespace-id"  # Replace with your actual KV namespace ID
```

### 3. Set Secrets

Run the following commands to set your secrets:

```bash
wrangler secret put ASSEMBLYAI_KEY
wrangler secret put OPENROUTER_KEY
wrangler secret put SHOTSTACK_KEY
wrangler secret put VYRAL_WORKER_SECRET
wrangler secret put OPENAI_ORG_ID  # Optional
```

### 4. Update Environment Variables

Update the following environment variables in your application:

- `CLOUDFLARE_WORKER_URL` - Set to your deployed worker URL
- `VYRAL_WORKER_SECRET` - Same as used in secrets

### 5. Deploy

Deploy the workers using:

```bash
wrangler deploy
```

## Testing

After deployment, test the workers using the provided test script:

```bash
node test-workers.js
```

## Monitoring

Set up monitoring through:
- Cloudflare Analytics
- Custom logging in workers
- n8n execution logs
- Supabase job tracking

## Troubleshooting

### Common Issues

1. **KV Namespace Not Found**: Make sure you've created the KV namespace and updated the ID in `wrangler.toml`

2. **Authentication Errors**: Verify all secrets are set correctly

3. **Model Fallback Issues**: Check that the models specified in the workers are available in your OpenRouter account

4. **Caching Issues**: Verify the KV namespace binding is correct

### Debugging Tips

1. Check the Cloudflare Workers logs for detailed error messages
2. Use the test scripts to verify individual components
3. Ensure all environment variables are set correctly