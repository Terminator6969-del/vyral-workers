// render-captions-worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route handlers
    const handlers = {
      '/render-captions': this.handleRenderCaptions,
    };
    
    // Return handler or 404
    return handlers[url.pathname]?.(request, env) || new Response('Not found', {status: 404});
  },
  
  async handleRenderCaptions(request, env) {
    // Authenticate the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.VYRAL_WORKER_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse request body
    const { file_url, captions, job_id, webhook_url, style } = await request.json();
    
    if (!file_url || !captions) {
      return new Response(JSON.stringify({ error: 'file_url and captions are required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      // Call Shotstack API for video rendering with captions
      const renderResponse = await fetch('https://api.shotstack.io/stage/render', {
        method: 'POST',
        headers: {
          'x-api-key': env.SHOTSTACK_KEY,
          'Content-Type': 'application/json',
          'HTTP-Referer': request.headers.get('Referer') || 'https://vyral.vercel.app',
          'X-OpenAI-Organization': env.OPENAI_ORG_ID || ''
        },
        body: JSON.stringify({
          timeline: {
            tracks: [
              {
                clips: [
                  {
                    asset: {
                      type: 'video',
                      src: file_url
                    },
                    start: 0,
                    length: 30 // Placeholder length
                  },
                  {
                    asset: {
                      type: 'title',
                      text: captions,
                      style: style || 'minimal'
                    },
                    start: 0,
                    length: 30
                  }
                ]
              }
            ]
          },
          output: {
            format: 'mp4',
            resolution: 'hd'
          }
        })
      });
      
      const renderData = await renderResponse.json();
      
      if (renderData.error) {
        throw new Error(renderData.error);
      }
      
      // Extract the render ID
      const renderId = renderData.response.id;
      
      // Poll for completion
      let renderResult;
      let pollCount = 0;
      const maxPolls = 20; // Limit polling to avoid infinite loops
      
      do {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const resultResponse = await fetch(`https://api.shotstack.io/stage/render/${renderId}`, {
          headers: {
            'x-api-key': env.SHOTSTACK_KEY,
            'HTTP-Referer': request.headers.get('Referer') || 'https://vyral.vercel.app',
            'X-OpenAI-Organization': env.OPENAI_ORG_ID || ''
          }
        });
        
        const resultData = await resultResponse.json();
        renderResult = resultData.response;
        
        pollCount++;
      } while (renderResult.status !== 'done' && renderResult.status !== 'failed' && pollCount < maxPolls);
      
      if (renderResult.status === 'failed') {
        throw new Error(renderResult.error || 'Video rendering failed');
      }
      
      if (pollCount >= maxPolls) {
        throw new Error('Video rendering timed out');
      }
      
      // Prepare result
      const result = {
        rendered_video_url: renderResult.url,
        render_id: renderId,
        duration: renderResult.duration
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
  }
};