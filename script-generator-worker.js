// script-generator-worker.js
import { getCache, setCache, generateCacheKey } from './cache-utils.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route handlers
    const handlers = {
      '/script-generator': this.handleScriptGenerator,
    };
    
    // Return handler or 404
    return handlers[url.pathname]?.(request, env) || new Response('Not found', {status: 404});
  },
  
  async handleScriptGenerator(request, env) {
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.VYRAL_WORKER_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const { transcript, strategy, job_id, webhook_url } = await request.json();
    
    if (!transcript) {
      return new Response(JSON.stringify({ error: 'transcript is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey('script-generator', 'generate', { transcript, strategy });
    
    // Try to get cached result
    const cachedResult = await getCache(env, cacheKey);
    if (cachedResult) {
      console.log('Cache hit for script generation');
      
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
    
    console.log('Cache miss for script generation');
    
    // Define models with fallback priority
    const models = [
      "openai/gpt-4",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-3.5-turbo"
    ];
    
    // Try each model in order until one succeeds
    let scriptData = null;
    let lastError = null;
    
    for (const model of models) {
      try {
        // Call OpenRouter or similar LLM API for script generation
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
                content: "You are a professional scriptwriter. Based on the provided transcript and strategy, create engaging scripts for social media content. Include hooks, transitions, and calls-to-action."
              },
              {
                role: "user",
                content: `Create scripts based on this transcript: ${transcript} and strategy: ${strategy || 'No specific strategy provided'}`
              }
            ],
            temperature: 0.7,
          })
        });
        
        scriptData = await response.json();
        
        if (scriptData.error) {
          throw new Error(scriptData.error);
        }
        
        // If we get here, the request was successful
        break;
      } catch (error) {
        lastError = error;
        console.error(`Failed to generate script with model ${model}:`, error.message);
        // Continue to the next model
      }
    }
    
    // If all models failed, throw the last error
    if (!scriptData) {
      throw lastError || new Error('All models failed to generate script');
    }
    
    try {
      // Extract the script from the response
      const script = scriptData.choices[0].message.content;
      
      // Parse script into structured format
      const result = {
        script_text: script,
        hooks: this.extractHooks(script),
        calls_to_action: this.extractCTAs(script),
        estimated_duration: this.estimateDuration(script),
        tone: this.determineTone(script)
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
  
  extractHooks(script) {
    // In a real implementation, this would use NLP to identify hooks
    // For now, we'll return a placeholder
    return [
      "Did you know?",
      "Here's the secret",
      "Most people don't realize"
    ];
  },
  
  extractCTAs(script) {
    // In a real implementation, this would use NLP to identify calls-to-action
    // For now, we'll return a placeholder
    return [
      "Follow for more tips",
      "Comment below",
      "Share with a friend"
    ];
  },
  
  estimateDuration(script) {
    // Estimate duration based on word count (approx. 150 words per minute)
    const wordCount = script.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / 150);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  },
  
  determineTone(script) {
    // In a real implementation, this would use sentiment analysis
    // For now, we'll return a placeholder
    return "Engaging and informative";
  }
};