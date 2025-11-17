// vision-worker.js
import { getCache, setCache, generateCacheKey } from './cache-utils.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route handlers
    const handlers = {
      '/vision': this.handleVision,
    };
    
    // Return handler or 404
    return handlers[url.pathname]?.(request, env) || new Response('Not found', {status: 404});
  },
  
  async handleVision(request, env) {
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.VYRAL_WORKER_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const { file_url, job_id, webhook_url } = await request.json();
    
    if (!file_url) {
      return new Response(JSON.stringify({ error: 'file_url is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey('vision', 'analyze', { file_url });
    
    // Try to get cached result
    const cachedResult = await getCache(env, cacheKey);
    if (cachedResult) {
      console.log('Cache hit for vision analysis');
      
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
    
    console.log('Cache miss for vision analysis');
    
    try {
      // Use OpenRouter with GPT-4V or Claude 3.5 Sonnet for vision analysis
      const visionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': request.headers.get('Referer') || 'https://vyral.vercel.app',
          'X-OpenAI-Organization': env.OPENAI_ORG_ID || ''
        },
        body: JSON.stringify({
          model: "openai/gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this video frame and provide insights about the content, objects, people, text, and overall scene. Include information about labels, text detection, faces, objects, explicit content, duration, and scenes."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: file_url
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        })
      });
      
      const visionData = await visionResponse.json();
      
      if (visionData.error) {
        throw new Error(visionData.error);
      }
      
      // Extract the vision analysis from the response
      const visionResult = visionData.choices[0].message.content;
      
      // Parse vision result into structured format
      const result = {
        labels: this.extractLabels(visionResult),
        text: this.extractText(visionResult),
        faces: this.extractFaces(visionResult),
        objects: this.extractObjects(visionResult),
        explicit_content: this.extractExplicitContent(visionResult),
        duration: "5 minutes", // Placeholder
        scenes: this.extractScenes(visionResult)
      };
      
      // Cache the result for 1 hour
      await setCache(env, cacheKey, result, 3600);
      
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
  
  extractLabels(visionResult) {
    // In a real implementation, this would parse the vision result to extract labels
    // For now, we'll return a placeholder
    return ["person", "technology", "presentation"];
  },
  
  extractText(visionResult) {
    // In a real implementation, this would parse the vision result to extract text
    // For now, we'll return a placeholder
    return "Sample text detected in video";
  },
  
  extractFaces(visionResult) {
    // In a real implementation, this would parse the vision result to extract faces
    // For now, we'll return a placeholder
    return 1;
  },
  
  extractObjects(visionResult) {
    // In a real implementation, this would parse the vision result to extract objects
    // For now, we'll return a placeholder
    return ["laptop", "screen"];
  },
  
  extractExplicitContent(visionResult) {
    // In a real implementation, this would parse the vision result to extract explicit content info
    // For now, we'll return a placeholder
    return false;
  },
  
  extractScenes(visionResult) {
    // In a real implementation, this would parse the vision result to extract scenes
    // For now, we'll return a placeholder
    return [
      { timestamp: "00:00:05", description: "Person speaking to camera" },
      { timestamp: "00:02:30", description: "Screen sharing presentation" }
    ];
  }
};