// test-cache.js - Simple test for cache utilities

// Mock environment for testing
const mockEnv = {
  VYRAL_CACHE: {
    async get(key) {
      console.log(`Getting cache key: ${key}`);
      // Simulate cache miss
      return null;
    },
    async put(key, value, options) {
      console.log(`Setting cache key: ${key} with value: ${value} and options:`, options);
      return true;
    }
  }
};

// Import cache utilities
import { getCache, setCache, generateCacheKey } from './cache-utils.js';

async function testCache() {
  console.log('Testing cache utilities...');
  
  // Test generateCacheKey
  const key1 = generateCacheKey('strategy', 'generate', { transcript: 'test', platform_preferences: ['tiktok'] });
  console.log('Generated cache key:', key1);
  
  const key2 = generateCacheKey('strategy', 'generate', { transcript: 'test', platform_preferences: ['tiktok'] });
  console.log('Generated cache key (same params):', key2);
  
  console.log('Keys match:', key1 === key2);
  
  // Test setCache
  const testData = { strategy_text: 'Test strategy', hashtags: ['#test'] };
  const setResult = await setCache(mockEnv, 'test-key', testData, 3600);
  console.log('Set cache result:', setResult);
  
  // Test getCache
  const getResult = await getCache(mockEnv, 'test-key');
  console.log('Get cache result:', getResult);
  
  console.log('Test completed');
}

// Run the test
testCache().catch(console.error);