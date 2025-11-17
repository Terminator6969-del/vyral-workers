// caption-pack-worker.js
import { getCache, setCache, generateCacheKey } from './cache-utils.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route handlers
    const handlers = {
      '/caption-pack': this.handleCaptionPack,
    };
    
    // Return handler or 404
    return handlers[url.pathname]?.(request, env) || new Response('Not found', {status: 404});
  },
  
  async handleCaptionPack(request, env) {
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.VYRAL_WORKER_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const { transcript, job_id, webhook_url, platforms } = await request.json();
    
    if (!transcript) {
      return new Response(JSON.stringify({ error: 'transcript is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey('caption-pack', 'generate', { transcript, platforms });
    
    // Try to get cached result
    const cachedResult = await getCache(env, cacheKey);
    if (cachedResult) {
      console.log('Cache hit for caption pack generation');
      
      // Call webhook if provided
      if (webhook_url) {
        await fetch(webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: job_id,
            status: 'completed',
            result: cachedResult
          })
        }).catch(error => {
          console.error('Failed to call webhook:', error);
        });
      }
      
      // Return cached result
      return new Response(JSON.stringify({
        job_id: job_id,
        status: 'completed',
        result: cachedResult
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Cache miss for caption pack generation');
    
    try {
      // Generate captions for each platform
      const captions = {};
      
      // If no platforms specified, generate for all
      const targetPlatforms = platforms && platforms.length > 0 ? platforms : ['tiktok', 'instagram', 'youtube'];
      
      for (const platform of targetPlatforms) {
        captions[platform] = await this.generatePlatformCaptions(transcript, platform, env, request);
      }
      
      const result = {
        captions: captions,
        platforms: targetPlatforms
      };
      
      // Cache the result for 30 minutes
      await setCache(env, cacheKey, result, 1800);
      
      // Call webhook if provided
      if (webhook_url) {
        await fetch(webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: job_id,
            status: 'completed',
            result: result
          })
        }).catch(error => {
          console.error('Failed to call webhook:', error);
        });
      }
      
      // Return result
      return new Response(JSON.stringify({
        job_id: job_id,
        status: 'completed',
        result: result
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      // Call webhook with error if provided
      if (webhook_url) {
        await fetch(webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: job_id,
            status: 'failed',
            error: error.message
          })
        }).catch(webhookError => {
          console.error('Failed to call webhook:', webhookError);
        });
      }
      
      return new Response(JSON.stringify({
        job_id: job_id,
        status: 'failed',
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
  
  async generatePlatformCaptions(transcript, platform, env, request) {
    // Define models with fallback priority
    const models = [
      "openai/gpt-4",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-3.5-turbo"
    ];
    
    // Try each model in order until one succeeds
    let captionData = null;
    let lastError = null;
    
    for (const model of models) {
      try {
        // Call OpenRouter or similar LLM API for platform-specific caption generation
        const captionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENROUTER_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': request.headers.get('Referer') || 'https://vyral.vercel.app',
            'X-OpenAI-Organization': env.OPENAI_ORG_ID || ''
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: `You are a social media caption specialist. Create engaging captions optimized for ${platform}. Follow platform-specific best practices for length, hashtags, and engagement.`
              },
              {
                role: "user",
                content: `Create a ${platform} caption for this transcript: ${transcript}`
              }
            ],
            temperature: 0.7,
          })
        });
        
        captionData = await captionResponse.json();
        
        if (captionData.error) {
          throw new Error(captionData.error);
        }
        
        // If we get here, the request was successful
        break;
      } catch (error) {
        lastError = error;
        console.error(`Failed to generate caption with model ${model}:`, error.message);
        // Continue to the next model
      }
    }
    
    // If all models failed, throw the last error
    if (!captionData) {
      throw lastError || new Error('All models failed to generate caption');
    }
    
    // Extract the caption from the response
    return captionData.choices[0].message.content;
  }
};