const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const agentManager = require('../../utils/agentManager');
const { MetaModel } = require('../../ml/ensembleTechniques');

// Use shared instance to keep config consistent with saved keys
const multiModelMerge = agentManager.multiModelMerge;
const metaModel = new MetaModel();

// GET /api/v1/models/performance - Get model performance statistics
router.get('/performance', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Initialize if not already done
    if (!multiModelMerge.isInitialized) {
      await multiModelMerge.initializeModelPerformance();
    }
    
    const performanceStats = multiModelMerge.getModelPerformanceStats();
    
    const response = {
      success: true,
      models: performanceStats,
      summary: {
        totalModels: Object.keys(performanceStats).length,
        averageSuccessRate: Object.values(performanceStats)
          .reduce((sum, model) => sum + model.successRate, 0) / Object.keys(performanceStats).length,
        averageResponseTime: Object.values(performanceStats)
          .reduce((sum, model) => sum + model.avgResponseTime, 0) / Object.keys(performanceStats).length,
        averageQualityScore: Object.values(performanceStats)
          .reduce((sum, model) => sum + model.qualityScore, 0) / Object.keys(performanceStats).length
      },
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };
    
    res.json(response);
    
  } catch (error) {
    logger.logError(error, {
      component: 'modelRoutes',
      operation: 'getPerformance',
      requestId: req.requestId
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve model performance statistics',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/models/weights - Get current model weights
router.get('/weights', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Initialize MetaModel if not already done
    if (!metaModel.isInitialized) {
      await metaModel.initialize();
    }
    
    const modelStats = metaModel.getModelStats();
    
    const response = {
      success: true,
      weights: modelStats.weights,
      bias: modelStats.bias,
      trainingExamples: modelStats.trainingExamples,
      lastUpdated: modelStats.lastUpdated,
      version: '1.0',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };
    
    res.json(response);
    
  } catch (error) {
    logger.logError(error, {
      component: 'modelRoutes',
      operation: 'getWeights',
      requestId: req.requestId
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve model weights',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/models/reset-performance - Reset model performance data
router.post('/reset-performance', async (req, res) => {
  const startTime = Date.now();
  
  try {
    await multiModelMerge.resetModelPerformance();
    
    const response = {
      success: true,
      message: 'Model performance data reset successfully',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };
    
    res.json(response);
    
  } catch (error) {
    logger.logError(error, {
      component: 'modelRoutes',
      operation: 'resetPerformance',
      requestId: req.requestId
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset model performance data',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/models/config - Get model configuration
router.get('/config', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const config = require('../../../config/config');
    
    // Initialize if not already done
    if (!multiModelMerge.isInitialized) {
      await multiModelMerge.initializeModelPerformance();
    }
    
    const availableModels = multiModelMerge.getAvailableModels();
    
    const response = {
      success: true,
      models: availableModels,
      settings: {
        timeout: config.models.timeout,
        maxRetries: config.models.maxRetries,
        retryDelay: config.models.retryDelay,
        maxTokens: config.models.maxTokens,
        temperature: config.models.temperature
      },
      hasApiKeys: multiModelMerge.apiKeys.size > 0,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };
    
    res.json(response);
    
  } catch (error) {
    logger.logError(error, {
      component: 'modelRoutes',
      operation: 'getConfig',
      requestId: req.requestId
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve model configuration',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/v1/models/api-key - Add API key and discover models
router.post('/api-key', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { apiKey, provider = 'openrouter' } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'API key is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Initialize if not already done
    if (!multiModelMerge.isInitialized) {
      await multiModelMerge.initializeModelPerformance();
    }
    
    const result = await multiModelMerge.addApiKey(apiKey, provider);
    
    const response = {
      success: true,
      message: 'API key added successfully',
      provider,
      modelsDiscovered: result.modelsDiscovered,
      models: result.models,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };
    
    res.json(response);
    
  } catch (error) {
    logger.logError(error, {
      component: 'modelRoutes',
      operation: 'addApiKey',
      requestId: req.requestId
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to add API key',
      timestamp: new Date().toISOString()
    });
  }
});

// DELETE /api/v1/models/api-key/:provider - Remove API key
router.delete('/api-key/:provider', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { provider } = req.params;
    
    const result = multiModelMerge.removeApiKey(provider);
    
    const response = {
      success: true,
      message: 'API key removed successfully',
      provider,
      modelsRemoved: result.modelsRemoved,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };
    
    res.json(response);
    
  } catch (error) {
    logger.logError(error, {
      component: 'modelRoutes',
      operation: 'removeApiKey',
      requestId: req.requestId
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove API key',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;