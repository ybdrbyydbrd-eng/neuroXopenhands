import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fetch from 'node-fetch';
import NodeCache from 'node-cache';

const app = express();
const PORT = process.env.PORT || 5174;

// Cache for 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

// Middleware
// Relax helmet for dev to avoid blocking cross-origin requests/content
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));
app.use(compression());
// CORS: allow local dev, file:// (null origin), and any localhost ports
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or file://)
    if (!origin || origin === 'null') {
      return callback(null, true);
    }
    // Allow all localhost origins and typical dev hosts
    if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Fallback: explicitly allow
    return callback(null, true);
  },
  credentials: true,
}));
// Explicitly handle preflight requests
app.options('*', cors());
app.use(express.json());

// In-memory storage for user collections (in production, use a database)
const userCollections = new Map();

// Hugging Face API configuration
const HF_API_BASE = 'https://huggingface.co/api/models';

// Helper function to transform HF model data to our format
function transformHFModel(hfModel, index) {
  return {
    id: hfModel.id || `hf-${index}`,
    name: hfModel.id?.split('/').pop() || 'Unknown Model',
    provider: hfModel.id?.split('/')[0] || 'Hugging Face',
    description: hfModel.description || hfModel.tagline || 'No description available',
    rating: 4.0 + Math.random(), // Mock rating
    reviewCount: Math.floor(Math.random() * 5000) + 100,
    latency: `${Math.floor(Math.random() * 500) + 50}ms`,
    pricePerToken: Math.random() * 0.05,
    tags: hfModel.tags || [],
    downloads: hfModel.downloads || Math.floor(Math.random() * 10000),
    likes: hfModel.likes || Math.floor(Math.random() * 1000),
    updatedAt: hfModel.lastModified || new Date().toISOString(),
    pipeline_tag: hfModel.pipeline_tag || 'text-generation',
    library_name: hfModel.library_name || 'transformers'
  };
}

// API Routes

// Get models with pagination
app.get('/api/hf/models', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Create cache key
    const cacheKey = `models-${page}-${limit}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    // Build candidate URLs (try broader queries first)
    const candidates = [
      `${HF_API_BASE}?limit=${limit}&skip=${offset}&sort=downloads&direction=-1&full=true`,
      `${HF_API_BASE}?limit=${limit}&skip=${offset}&sort=downloads&direction=-1`,
      `${HF_API_BASE}?limit=${limit}&skip=${offset}&pipeline_tag=text-generation&sort=downloads&direction=-1`,
    ];

    // Add fetch timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    const headers = process.env.HF_TOKEN
      ? { ...baseHeaders, Authorization: `Bearer ${process.env.HF_TOKEN}` }
      : baseHeaders;

    let transformedModels = [];
    let lastError = null;
    for (const url of candidates) {
      try {
        console.log(`Fetching models from: ${url}`);
        let response = await fetch(url, { headers, signal: controller.signal });
        if (response.status === 429) {
          await new Promise(r => setTimeout(r, 1200));
          response = await fetch(url, { headers, signal: controller.signal });
        }
        if (!response.ok) {
          lastError = new Error(`HF API responded with ${response.status}: ${response.statusText}`);
          console.warn(`[HF] Non-OK response ${response.status} for ${url}`);
          continue;
        }
        const hfModels = await response.json();
        if (!Array.isArray(hfModels)) {
          lastError = new Error('Invalid response format from Hugging Face API');
          console.warn(`[HF] Invalid format for ${url}`);
          continue;
        }
        transformedModels = hfModels.map(transformHFModel);
        if (transformedModels.length > 0) break;
      } catch (err) {
        lastError = err;
        console.warn(`[HF] Fetch attempt failed for ${url}:`, err?.message || err);
      }
    }
    clearTimeout(timeout);

    if (!transformedModels.length) {
      throw lastError || new Error('No models received from Hugging Face');
    }
    
    const result = {
      models: transformedModels,
      pagination: {
        page,
        limit,
        hasNext: transformedModels.length === limit,
        hasPrev: page > 1
      }
    };
    
    // Cache the result
    cache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ 
      error: 'Failed to fetch models',
      message: error.message,
      fallback: true
    });
  }
});

// Get user's collection
app.get('/api/collection/:userId?', (req, res) => {
  const userId = req.params.userId || 'default';
  const collection = userCollections.get(userId) || [];
  
  res.json({
    collection,
    count: collection.length
  });
});

// Add model to collection
app.post('/api/collection/:userId?', (req, res) => {
  const userId = req.params.userId || 'default';
  const { model } = req.body;
  
  if (!model || !model.id) {
    return res.status(400).json({ error: 'Model data is required' });
  }
  
  let collection = userCollections.get(userId) || [];
  
  // Check if model already exists
  const existingIndex = collection.findIndex(m => m.id === model.id);
  
  if (existingIndex === -1) {
    collection.push(model);
    userCollections.set(userId, collection);
    
    res.json({
      success: true,
      message: 'Model added to collection',
      collection,
      count: collection.length
    });
  } else {
    res.json({
      success: false,
      message: 'Model already in collection',
      collection,
      count: collection.length
    });
  }
});

// Remove model from collection
app.delete('/api/collection/:userId?/:modelId', (req, res) => {
  const userId = req.params.userId || 'default';
  const modelId = req.params.modelId;
  
  let collection = userCollections.get(userId) || [];
  const initialLength = collection.length;
  
  collection = collection.filter(m => m.id !== modelId);
  
  if (collection.length < initialLength) {
    userCollections.set(userId, collection);
    res.json({
      success: true,
      message: 'Model removed from collection',
      collection,
      count: collection.length
    });
  } else {
    res.json({
      success: false,
      message: 'Model not found in collection',
      collection,
      count: collection.length
    });
  }
});

// Serve the models list HTML page
app.get('/api/models-list', (req, res) => {
  res.sendFile('models-list.html', { root: '../public' });
});

// Get models summary with link to full list
app.get('/api/hf/models-summary', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // Create cache key
    const cacheKey = `models-summary-${page}-${limit}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    // Build candidate URLs (try broader queries first)
    const candidates = [
      `${HF_API_BASE}?limit=${limit}&skip=${(page-1)*limit}&sort=downloads&direction=-1&full=true`,
      `${HF_API_BASE}?limit=${limit}&skip=${(page-1)*limit}&sort=downloads&direction=-1`,
      `${HF_API_BASE}?limit=${limit}&skip=${(page-1)*limit}&pipeline_tag=text-generation&sort=downloads&direction=-1`,
    ];

    // Add fetch timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9'
    };
    const headers = process.env.HF_TOKEN
      ? { ...baseHeaders, Authorization: `Bearer ${process.env.HF_TOKEN}` }
      : baseHeaders;

    let transformedModels = [];
    let lastError = null;
    for (const url of candidates) {
      try {
        console.log(`Fetching models from: ${url}`);
        let response = await fetch(url, { headers, signal: controller.signal });
        if (response.status === 429) {
          await new Promise(r => setTimeout(r, 1200));
          response = await fetch(url, { headers, signal: controller.signal });
        }
        if (!response.ok) {
          lastError = new Error(`HF API responded with ${response.status}: ${response.statusText}`);
          console.warn(`[HF] Non-OK response ${response.status} for ${url}`);
          continue;
        }
        const hfModels = await response.json();
        if (!Array.isArray(hfModels)) {
          lastError = new Error('Invalid response format from Hugging Face API');
          console.warn(`[HF] Invalid format for ${url}`);
          continue;
        }
        transformedModels = hfModels.map(transformHFModel);
        if (transformedModels.length > 0) break;
      } catch (err) {
        lastError = err;
        console.warn(`[HF] Fetch attempt failed for ${url}:`, err?.message || err);
      }
    }
    clearTimeout(timeout);

    if (!transformedModels.length) {
      throw lastError || new Error('No models received from Hugging Face');
    }
    
    const result = {
      models: transformedModels,
      pagination: {
        page,
        limit,
        hasNext: transformedModels.length === limit,
        hasPrev: page > 1
      },
      fullModelListUrl: `${req.protocol}://${req.get('host')}/api/models-list`,
      message: `Showing ${transformedModels.length} models. For complete model list with ratings and prices, visit: ${req.protocol}://${req.get('host')}/api/models-list`
    };
    
    // Cache the result
    cache.set(cacheKey, result);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching models summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch models',
      message: error.message,
      fullModelListUrl: `${req.protocol}://${req.get('host')}/api/models-list`,
      fallback: true
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    cache_size: cache.keys().length
  });
});

// Default error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NeuroXHuggingFace server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});