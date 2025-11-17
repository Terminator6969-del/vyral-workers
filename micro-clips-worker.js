// micro-clips-worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route handlers
    const handlers = {
      '/micro-clips': this.handleMicroClips,
    };
    
    // Return handler or 404
    return handlers[url.pathname]?.(request, env) || new Response('Not found', {status: 404});
  },
  
  async handleMicroClips(request, env) {
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.VYRAL_WORKER_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const { file_url, transcript, highlights, job_id, webhook_url } = await request.json();
    
    if (!file_url || !transcript) {
      return new Response(JSON.stringify({ error: 'file_url and transcript are required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      // Identify key moments for micro-clips
      let keyMoments = [];
      
      if (highlights && highlights.length > 0) {
        // Use provided highlights
        keyMoments = highlights.slice(0, 5).map((highlight, index) => ({
          id: index + 1,
          start: highlight.start,
          end: highlight.end,
          text: highlight.text,
          confidence: highlight.confidence
        }));
      } else {
        // Generate key moments using LLM
        keyMoments = await this.generateKeyMoments(transcript, env);
      }
      
      // For each key moment, we would typically call a video editing service
      // For this example, we'll simulate the process
      
      const clips = [];
      for (const moment of keyMoments) {
        // Simulate clip creation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        clips.push({
          id: moment.id,
          url: `${file_url}#t=${moment.start},${moment.end}`,
          duration: moment.end - moment.start,
          text: moment.text,
          platform: this.suggestPlatform(moment)
        });
      }
      
      const result = {
        clips: clips,
        total_clips: clips.length
      };
      
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
  
  async generateKeyMoments(transcript, env) {
    // Call OpenRouter or similar LLM API to identify key moments
    const momentsResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "openai/gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a video content analyst. Identify 5 key moments in the transcript that would make engaging micro-clips. For each moment, provide a start time, end time, and brief description. Return as a JSON array."
          },
          {
            role: "user",
            content: `Identify key moments for micro-clips in this transcript: ${transcript}`
          }
        ],
        temperature: 0.7,
      })
    });
    
    const momentsData = await momentsResponse.json();
    
    if (momentsData.error) {
      throw new Error(momentsData.error);
    }
    
    // Extract the moments from the response
    // In a real implementation, we would parse the JSON response
    // For now, we'll return placeholder moments
    return [
      { id: 1, start: 10, end: 25, text: "Key moment 1" },
      { id: 2, start: 45, end: 60, text: "Key moment 2" },
      { id: 3, start: 90, end: 105, text: "Key moment 3" },
      { id: 4, start: 150, end: 165, text: "Key moment 4" },
      { id: 5, start: 200, end: 215, text: "Key moment 5" }
    ];
  },
  
  suggestPlatform(moment) {
    // Simple logic to suggest platform based on clip duration
    const duration = moment.end - moment.start;
    
    if (duration <= 15) {
      return "tiktok";
    } else if (duration <= 30) {
      return "instagram";
    } else {
      return "youtube";
    }
  }
};