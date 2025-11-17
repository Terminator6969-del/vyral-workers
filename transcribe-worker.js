// transcribe-worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route handlers
    const handlers = {
      '/transcribe': this.handleTranscribe,
    };
    
    // Return handler or 404
    return handlers[url.pathname]?.(request, env) || new Response('Not found', {status: 404});
  },
  
  async handleTranscribe(request, env) {
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
    
    try {
      // Call AssemblyAI for transcription
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': env.ASSEMBLYAI_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: file_url,
          speaker_labels: true,
          auto_highlights: true
        })
      });
      
      const transcriptData = await transcriptResponse.json();
      
      if (transcriptData.error) {
        throw new Error(transcriptData.error);
      }
      
      // Poll for completion
      let transcriptResult;
      do {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const resultResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`, {
          headers: {
            'authorization': env.ASSEMBLYAI_KEY,
          }
        });
        
        transcriptResult = await resultResponse.json();
      } while (transcriptResult.status !== 'completed' && transcriptResult.status !== 'error');
      
      if (transcriptResult.status === 'error') {
        throw new Error(transcriptResult.error);
      }
      
      // Prepare result
      const result = {
        transcript: transcriptResult.text,
        confidence: transcriptResult.confidence,
        highlights: transcriptResult.auto_highlights_result?.results,
        speaker_labels: transcriptResult.speaker_labels,
        chapters: transcriptResult.chapters,
        sentiment_analysis: transcriptResult.sentiment_analysis_results
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