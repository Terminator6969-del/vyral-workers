// test-workers.js - Simple test script for Cloudflare Workers
async function testTranscribeWorker() {
  const workerUrl = 'https://your-worker.your-subdomain.workers.dev/transcribe';
  const vyralWorkerSecret = 'your-worker-secret-key';
  const testFileUrl = 'https://example.com/test-video.mp4';
  const jobId = 'test-job-123';
  const webhookUrl = 'https://your-app.com/webhook/transcribe';

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vyralWorkerSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url: testFileUrl,
        job_id: jobId,
        webhook_url: webhookUrl
      })
    });

    const result = await response.json();
    console.log('Transcribe Worker Response:', result);
    
    if (response.ok) {
      console.log('✅ Transcribe worker test passed');
    } else {
      console.log('❌ Transcribe worker test failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Transcribe worker test failed with exception:', error.message);
  }
}

async function testVisionWorker() {
  const workerUrl = 'https://your-worker.your-subdomain.workers.dev/vision';
  const vyralWorkerSecret = 'your-worker-secret-key';
  const testFileUrl = 'https://example.com/test-video.mp4';
  const jobId = 'test-job-124';
  const webhookUrl = 'https://your-app.com/webhook/vision';

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vyralWorkerSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_url: testFileUrl,
        job_id: jobId,
        webhook_url: webhookUrl
      })
    });

    const result = await response.json();
    console.log('Vision Worker Response:', result);
    
    if (response.ok) {
      console.log('✅ Vision worker test passed');
    } else {
      console.log('❌ Vision worker test failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Vision worker test failed with exception:', error.message);
  }
}

async function testStrategyWorker() {
  const workerUrl = 'https://your-worker.your-subdomain.workers.dev/strategy';
  const vyralWorkerSecret = 'your-worker-secret-key';
  const testTranscript = 'This is a test transcript for generating a content strategy.';
  const jobId = 'test-job-125';
  const webhookUrl = 'https://your-app.com/webhook/strategy';

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vyralWorkerSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: testTranscript,
        job_id: jobId,
        webhook_url: webhookUrl
      })
    });

    const result = await response.json();
    console.log('Strategy Worker Response:', result);
    
    if (response.ok) {
      console.log('✅ Strategy worker test passed');
    } else {
      console.log('❌ Strategy worker test failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Strategy worker test failed with exception:', error.message);
  }
}

async function testScriptGeneratorWorker() {
  const workerUrl = 'https://your-worker.your-subdomain.workers.dev/script-generator';
  const vyralWorkerSecret = 'your-worker-secret-key';
  const testTranscript = 'This is a test transcript for generating a script.';
  const testStrategy = 'Focus on engaging the audience with practical tips.';
  const jobId = 'test-job-126';
  const webhookUrl = 'https://your-app.com/webhook/script-generator';

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vyralWorkerSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: testTranscript,
        strategy: testStrategy,
        job_id: jobId,
        webhook_url: webhookUrl
      })
    });

    const result = await response.json();
    console.log('Script Generator Worker Response:', result);
    
    if (response.ok) {
      console.log('✅ Script Generator worker test passed');
    } else {
      console.log('❌ Script Generator worker test failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Script Generator worker test failed with exception:', error.message);
  }
}

// Run tests
console.log('Testing Cloudflare Workers...');
testTranscribeWorker();
testVisionWorker();
testStrategyWorker();
testScriptGeneratorWorker();