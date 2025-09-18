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
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
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

    // Fetch from Hugging Face API
    const url = `${HF_API_BASE}?limit=${limit}&skip=${offset}&sort=downloads&direction=-1&filter=text-generation`;
    
    console.log(`Fetching models from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HF API responded with ${response.status}: ${response.statusText}`);
    }
    
    const hfModels = await response.json();
    
    if (!Array.isArray(hfModels)) {
      throw new Error('Invalid response format from Hugging Face API');
    }
    
    const transformedModels = hfModels.map(transformHFModel);
    
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