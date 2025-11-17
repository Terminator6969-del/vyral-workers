// vyral-worker.js - Main worker that routes to all services
import transcribeWorker from './transcribe-worker.js';
import visionWorker from './vision-worker.js';
import strategyWorker from './strategy-worker.js';
import scriptGeneratorWorker from './script-generator-worker.js';
import captionPackWorker from './caption-pack-worker.js';
import renderCaptionsWorker from './render-captions-worker.js';
import microClipsWorker from './micro-clips-worker.js';
import platformCaptionsWorker from './platform-captions-worker.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // All your AI services in one place
    const handlers = {
      '/transcribe': (req, env) => transcribeWorker.fetch(req, env),
      '/vision': (req, env) => visionWorker.fetch(req, env),
      '/strategy': (req, env) => strategyWorker.fetch(req, env),
      '/script-generator': (req, env) => scriptGeneratorWorker.fetch(req, env),
      '/caption-pack': (req, env) => captionPackWorker.fetch(req, env),
      '/render-captions': (req, env) => renderCaptionsWorker.fetch(req, env),
      '/micro-clips': (req, env) => microClipsWorker.fetch(req, env),
      '/platform-captions': (req, env) => platformCaptionsWorker.fetch(req, env)
    };
    
    const handler = handlers[url.pathname];
    if (handler) {
      return handler(request, env);
    }
    
    return new Response('Not found', { status: 404 });
  }
};