// cache-utils.js - Utility functions for caching with Cloudflare KV

/**
 * Get cached data from Cloudflare KV
 * @param {Object} env - Cloudflare environment variables
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached data or null if not found
 */
export async function getCache(env, key) {
  try {
    // Use the KV binding name from wrangler.toml
    const cachedData = await env.VYRAL_CACHE.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set data in Cloudflare KV cache
 * @param {Object} env - Cloudflare environment variables
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function setCache(env, key, data, ttl = 3600) {
  try {
    // Use the KV binding name from wrangler.toml
    await env.VYRAL_CACHE.put(key, JSON.stringify(data), { expirationTtl: ttl });
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
}

/**
 * Generate a cache key based on input parameters
 * @param {string} workerName - Name of the worker
 * @param {string} operation - Operation type
 * @param {Object} params - Input parameters
 * @returns {string} Cache key
 */
export function generateCacheKey(workerName, operation, params) {
  // Create a consistent cache key based on the parameters
  const paramStr = JSON.stringify(params, Object.keys(params).sort());
  const key = `${workerName}:${operation}:${paramStr}`;
  // Hash the key to ensure it's within KV key limits
  return simpleHash(key);
}

/**
 * Simple hash function for generating cache keys
 * @param {string} str - String to hash
 * @returns {string} Hashed string
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}