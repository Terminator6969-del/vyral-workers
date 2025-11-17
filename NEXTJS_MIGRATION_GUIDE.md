# Next.js API Routes Migration Guide

## Overview
This guide explains how to update the existing Next.js API routes to use the new Cloudflare Workers instead of the built-in Vercel serverless functions.

## Migration Steps

### 1. Update Environment Variables
Add the following environment variables to your Next.js application:

```env
CLOUDFLARE_WORKER_URL=https://your-worker.your-subdomain.workers.dev
VYRAL_WORKER_SECRET=your-worker-secret-key
```

### 2. Update API Routes

#### Transcribe Worker (/app/api/workers/transcribe/route.ts)
Replace the existing implementation with:

```typescript
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // 1. Authenticate the request
    const secret = request.headers.get('X-Vyral-Secret');
    const expectedSecret = process.env.VYRAL_WORKER_SECRET;

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the file_url from the request body
    const body = await request.json();
    const { file_url } = body;

    if (!file_url) {
      return NextResponse.json({ error: 'file_url is required' }, { status: 400 });
    }

    // 3. Call the Cloudflare Worker
    const workerUrl = `${process.env.CLOUDFLARE_WORKER_URL}/transcribe`;
    const job_id = crypto.randomUUID();
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VYRAL_WORKER_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url: file_url,
        job_id: job_id,
        webhook_url: process.env.NEXT_WEBHOOK_URL
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to call transcribe worker');
    }

    // 4. Return the job_id
    return NextResponse.json({ 
      job_id: job_id, 
      message: "Transcription started" 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error in /workers/transcribe:', error);
    return NextResponse.json({ 
      error: error.message || 'Transcription failed' 
    }, { status: 500 });
  }
}
```

#### Vision Worker (/app/api/workers/vision/route.ts)
Replace the existing implementation with:

```typescript
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // 1. Authenticate the request
    const secret = request.headers.get('X-Vyral-Secret');
    const expectedSecret = process.env.VYRAL_WORKER_SECRET;

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the file_url from the request body
    const body = await request.json();
    const { file_url } = body;

    if (!file_url) {
      return NextResponse.json({ error: 'file_url is required' }, { status: 400 });
    }

    // 3. Call the Cloudflare Worker
    const workerUrl = `${process.env.CLOUDFLARE_WORKER_URL}/vision`;
    const job_id = crypto.randomUUID();
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VYRAL_WORKER_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url: file_url,
        job_id: job_id,
        webhook_url: process.env.NEXT_WEBHOOK_URL
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to call vision worker');
    }

    // 4. Return the job_id
    return NextResponse.json({ 
      job_id: job_id, 
      message: "Vision analysis started" 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error in /workers/vision:', error);
    return NextResponse.json({ 
      error: error.message || 'Vision analysis failed' 
    }, { status: 500 });
  }
}
```

### 3. Apply Similar Updates
Apply similar updates to all other worker routes:
- /app/api/workers/script-generator/route.ts
- /app/api/workers/caption-pack/route.ts
- /app/api/workers/render-captions/route.ts
- /app/api/workers/micro-clips/route.ts
- /app/api/workers/platform-captions/route.ts

### 4. Update n8n Workflows
Import the new callback workflow JSON files into n8n:
- n8n-callback-workflow.json
- n8n-callback-workflow-b.json

Update the webhook URLs in your n8n workflows to point to the new callback endpoints.

## Benefits of Migration

1. **Improved Reliability**: Cloudflare Workers have better uptime and performance
2. **Cost Savings**: Reduced Vercel compute costs
3. **Better Scalability**: Workers scale automatically without timeouts
4. **Enhanced Monitoring**: Better observability through Cloudflare Analytics

## Testing the Migration

1. Deploy the updated Next.js application
2. Deploy the Cloudflare Workers
3. Test each API endpoint with sample data
4. Verify n8n workflows execute correctly
5. Monitor performance and error rates

## Rollback Plan

If issues are encountered, you can rollback by:
1. Reverting the Next.js API route changes
2. Restoring the original n8n workflows
3. Removing the Cloudflare Workers deployment

This migration should improve the overall performance and reliability of the Vyral platform while reducing operational costs.