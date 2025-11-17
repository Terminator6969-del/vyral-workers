// strategy-worker.js
import { getCache, setCache, generateCacheKey } from './cache-utils.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route handlers
    const handlers = {
      '/strategy': this.handleStrategy,
    };
    
    // Return handler or 404
    return handlers[url.pathname]?.(request, env) || new Response('Not found', {status: 404});
  },
  
  async handleStrategy(request, env) {
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.VYRAL_WORKER_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const { transcript, job_id, webhook_url, platform_preferences } = await request.json();
    
    if (!transcript) {
      return new Response(JSON.stringify({ error: 'transcript is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey('strategy', 'generate', { transcript, platform_preferences });
    
    // Try to get cached result
    const cachedResult = await getCache(env, cacheKey);
    if (cachedResult) {
      console.log('Cache hit for strategy generation');
      
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
    
    console.log('Cache miss for strategy generation');
    
    // Define models with fallback priority
    const models = [
      "openai/gpt-4",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-3.5-turbo"
    ];
    
    // Try each model in order until one succeeds
    let strategyData = null;
    let lastError = null;
    
    for (const model of models) {
      try {
        // Call OpenRouter or similar LLM API for strategy generation
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
                content: "You are a viral content strategist. Based on the provided transcript, create a content strategy that will perform well on social media platforms. Consider timing, hashtags, and platform-specific optimizations."
              },
              {
                role: "user",
                content: `Create a content strategy for this transcript: ${transcript}`
              }
            ],
            temperature: 0.7,
          })
        });
        
        strategyData = await response.json();
        
        if (strategyData.error) {
          throw new Error(strategyData.error);
        }
        
        // If we get here, the request was successful
        break;
      } catch (error) {
        lastError = error;
        console.error(`Failed to generate strategy with model ${model}:`, error.message);
        // Continue to the next model
      }
    }
    
    // If all models failed, throw the last error
    if (!strategyData) {
      throw lastError || new Error('All models failed to generate strategy');
    }
    
    try {
      // Extract the strategy from the response
      const strategy = strategyData.choices[0].message.content;
      
      // Parse strategy into structured format
      const result = {
        strategy_text: strategy,
        hashtags: this.extractHashtags(strategy),
        optimal_posting_time: this.calculateOptimalTime(platform_preferences),
        platform_specific_tips: this.generatePlatformTips(platform_preferences, strategy),
        content_clusters: this.identifyContentClusters(transcript)
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
  
  extractHashtags(text) {
    // Simple regex to extract hashtags
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? [...new Set(matches)] : [];
  },
  
  calculateOptimalTime(platform_preferences) {
    // In a real implementation, this would use analytics data
    // For now, we'll return a placeholder
    const times = {
      tiktok: "18:00",
      instagram: "11:00",
      youtube: "15:00"
    };
    
    if (platform_preferences && platform_preferences.length > 0) {
      return times[platform_preferences[0]] || "12:00";
    }
    
    return "12:00";
  },
  
  generatePlatformTips(platform_preferences, strategy) {
    // Generate platform-specific tips based on the strategy
    const tips = {};
    
    if (!platform_preferences || platform_preferences.length === 0) {
      platform_preferences = ['tiktok', 'instagram', 'youtube'];
    }
    
    platform_preferences.forEach(platform => {
      switch (platform) {
        case 'tiktok':
          tips.tiktok = "Keep videos under 60 seconds for maximum engagement. Use trending sounds.";
          break;
        case 'instagram':
          tips.instagram = "Use carousel posts for longer content. Include relevant hashtags in the first comment.";
          break;
        case 'youtube':
          tips.youtube = "Create compelling thumbnails. Use detailed descriptions with timestamps.";
          break;
        default:
          tips[platform] = `Optimize content for ${platform} based on current best practices.`;
      }
    });
    
    return tips;
  },
  
  identifyContentClusters(transcript) {
    // In a real implementation, this would use NLP to identify content clusters
    // For now, we'll return a placeholder
    return [
      { topic: "Introduction", keywords: ["welcome", "introduce"] },
      { topic: "Main Content", keywords: ["main", "core"] },
      { topic: "Conclusion", keywords: ["summary", "conclude"] }
    ];
  }
};