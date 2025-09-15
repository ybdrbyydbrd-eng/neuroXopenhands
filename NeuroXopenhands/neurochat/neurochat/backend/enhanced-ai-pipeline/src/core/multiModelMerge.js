const axios = require('axios');
const config = require('../../config/config');
const logger = require('../utils/logger');
const databaseManager = require('../utils/database');
const { v4: uuidv4 } = require('uuid');
const APIProviders = require('../providers/apiProviders');

class MultiModelMerge {
  constructor() {
    this.models = {}; // Will be populated dynamically
    this.apiKeys = new Map(); // Store multiple API keys
    this.baseUrl = config.models.baseUrl;
    this.modelPerformance = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    this.isInitialized = false;
    this.apiProviders = new APIProviders();
  }

  async initializeModelPerformance() {
    if (this.isInitialized) return;
    
    try {
      // Load performance data from database
      const cachedPerformance = await databaseManager.cacheGet('model_performance');
      if (cachedPerformance) {
        this.modelPerformance = new Map(Object.entries(cachedPerformance));
        logger.info('Model performance data loaded from cache');
      } else {
        // Initialize with default values for any existing models
        Object.values(this.models).forEach(modelId => {
          this.modelPerformance.set(modelId, {
            successRate: 0.8,
            avgResponseTime: 5000,
            qualityScore: 0.7,
            totalCalls: 0,
            successfulCalls: 0,
            lastUpdated: new Date()
          });
        });
        if (Object.keys(this.models).length > 0) {
          await this.saveModelPerformance();
        }
      }
      this.isInitialized = true;
    } catch (error) {
      logger.logError(error, { component: 'multiModelMerge', operation: 'initializeModelPerformance' });
      // Initialize with defaults if cache fails
      Object.values(this.models).forEach(modelId => {
        this.modelPerformance.set(modelId, {
          successRate: 0.8,
          avgResponseTime: 5000,
          qualityScore: 0.7,
          totalCalls: 0,
          successfulCalls: 0,
          lastUpdated: new Date()
        });
      });
      this.isInitialized = true;
    }
  }

  async saveModelPerformance() {
    try {
      const performanceObj = Object.fromEntries(this.modelPerformance);
      await databaseManager.cacheSet('model_performance', performanceObj, 86400); // 24 hours
    } catch (error) {
      logger.logError(error, { component: 'multiModelMerge', operation: 'saveModelPerformance' });
    }
  }

  // Add API key and discover models
  async addApiKey(apiKey, provider = null) {
    try {
      // Validate API key and discover models using the new provider system
      const discoveryResult = await this.apiProviders.validateAndDiscoverModels(apiKey, provider);
      
      if (!discoveryResult.success) {
        throw new Error('Invalid API key or unable to authenticate with provider');
      }
      
      // Store the API key with the detected/validated provider
      this.apiKeys.set(discoveryResult.provider, apiKey);
      
      // Add models to our collection
      discoveryResult.models.forEach(model => {
        const modelKey = `${discoveryResult.provider}:${model.id}`;
        this.models[modelKey] = model.id;
        
        // Initialize performance tracking for new models
        if (!this.modelPerformance.has(model.id)) {
          this.modelPerformance.set(model.id, {
            successRate: 0.8,
            avgResponseTime: 5000,
            qualityScore: 0.7,
            totalCalls: 0,
            successfulCalls: 0,
            lastUpdated: new Date(),
            provider: discoveryResult.provider,
            providerName: discoveryResult.providerName,
            name: model.name || model.id,
            description: model.description || '',
            context_length: model.context_length || 4096,
            capabilities: model.capabilities || []
          });
        }
      });
      
      await this.saveModelPerformance();
      
      return {
        success: true,
        provider: discoveryResult.provider,
        providerName: discoveryResult.providerName,
        modelsDiscovered: discoveryResult.modelsDiscovered,
        models: discoveryResult.models
      };
    } catch (error) {
      logger.logError(error, { component: 'multiModelMerge', operation: 'addApiKey' });
      throw error;
    }
  }

  // Legacy method - kept for compatibility but now uses the new provider system
  async discoverModels(apiKey, provider = null) {
    try {
      const discoveryResult = await this.apiProviders.validateAndDiscoverModels(apiKey, provider);
      
      if (!discoveryResult.success) {
        throw new Error('Failed to discover models: Invalid API key');
      }
      
      return discoveryResult.models;
    } catch (error) {
      logger.logError(error, { component: 'multiModelMerge', operation: 'discoverModels' });
      throw new Error(`Failed to discover models: ${error.message}`);
    }
  }

  // Get available models
  getAvailableModels() {
    return Object.keys(this.models).map(modelKey => {
      const modelId = this.models[modelKey];
      const performance = this.modelPerformance.get(modelId);
      return {
        id: modelId,
        key: modelKey,
        name: performance?.name || modelId,
        description: performance?.description || '',
        provider: performance?.provider || 'unknown',
        successRate: performance?.successRate || 0,
        avgResponseTime: performance?.avgResponseTime || 0,
        qualityScore: performance?.qualityScore || 0
      };
    });
  }

  // Remove API key and associated models
  removeApiKey(provider) {
    this.apiKeys.delete(provider);
    
    // Remove models associated with this provider
    const modelsToRemove = [];
    for (const [modelId, performance] of this.modelPerformance.entries()) {
      if (performance.provider === provider) {
        modelsToRemove.push(modelId);
      }
    }
    
    modelsToRemove.forEach(modelId => {
      this.modelPerformance.delete(modelId);
      // Remove from models object
      for (const [key, value] of Object.entries(this.models)) {
        if (value === modelId) {
          delete this.models[key];
          break;
        }
      }
    });
    
    return {
      success: true,
      modelsRemoved: modelsToRemove.length
    };
  }

  async callModel(modelId, prompt, options = {}) {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    try {
      logger.info(`Calling model ${modelId}`, { requestId, modelId, promptLength: prompt.length });

      // Get the appropriate API key for this model
      const modelPerformance = this.modelPerformance.get(modelId);
      const provider = modelPerformance?.provider || 'openrouter';
      const apiKey = this.apiKeys.get(provider);
      
      if (!apiKey) {
        throw new Error(`No API key available for provider: ${provider}`);
      }

      let response;
      let content = '';

      // Route by provider
      if (provider === 'google') {
        // Google Generative Language API (Gemini)
        const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(modelId)}:generateContent?key=${apiKey}`;
        response = await axios({
          method: 'POST',
          url,
          headers: { 'Content-Type': 'application/json' },
          data: {
            contents: [
              { role: 'user', parts: [{ text: prompt }] }
            ]
          },
          timeout: config.models.timeout
        });
        const candidates = response.data?.candidates || [];
        const parts = candidates[0]?.content?.parts || [];
        content = parts.map(p => p.text).filter(Boolean).join('\n');
        if (!content) throw new Error('Invalid response format from Google API');
      } else if (provider === 'openai') {
        // OpenAI Chat Completions
        response = await axios({
          method: 'POST',
          url: 'https://api.openai.com/v1/chat/completions',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options.maxTokens || config.models.maxTokens,
            temperature: options.temperature || config.models.temperature,
            stream: false
          },
          timeout: config.models.timeout
        });
        content = response.data?.choices?.[0]?.message?.content || '';
        if (!content) throw new Error('Invalid response format from OpenAI API');
      } else if (provider === 'anthropic') {
        // Anthropic Messages API
        response = await axios({
          method: 'POST',
          url: 'https://api.anthropic.com/v1/messages',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          data: {
            model: modelId,
            max_tokens: options.maxTokens || config.models.maxTokens,
            messages: [{ role: 'user', content: prompt }]
          },
          timeout: config.models.timeout
        });
        const parts = response.data?.content || [];
        content = parts.map(p => p.text).filter(Boolean).join('\n');
        if (!content) throw new Error('Invalid response format from Anthropic API');
      } else {
        // Default to OpenRouter-compatible API
        response = await axios({
          method: 'POST',
          url: `${this.baseUrl}/chat/completions`,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://enhanced-ai-pipeline.com',
            'X-Title': 'Enhanced AI Pipeline'
          },
          data: {
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options.maxTokens || config.models.maxTokens,
            temperature: options.temperature || config.models.temperature,
            stream: false
          },
          timeout: config.models.timeout
        });
        content = response.data?.choices?.[0]?.message?.content || '';
        if (!content) throw new Error('Invalid response format from OpenRouter API');
      }

      const responseTime = Date.now() - startTime;

      // Update model performance
      await this.updateModelPerformance(modelId, true, responseTime, content);

      logger.logModelCall(modelId, prompt, content, responseTime);

      return {
        success: true,
        content,
        modelId,
        responseTime,
        requestId,
        usage: response?.data?.usage || {}
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update model performance for failure
      await this.updateModelPerformance(modelId, false, responseTime);
      
      logger.logModelCall(modelId, prompt, null, responseTime, error);
      
      // Handle specific error types
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.error?.message || error.message;
        
        if (status === 429) {
          // Rate limit - implement exponential backoff
          const retryAfter = error.response.headers['retry-after'] || 60;
          logger.warn(`Rate limit hit for ${modelId}, retry after ${retryAfter}s`, { requestId });
          
          return {
            success: false,
            error: 'RATE_LIMIT',
            retryAfter: parseInt(retryAfter) * 1000,
            modelId,
            requestId
          };
        } else if (status >= 500) {
          // Server error - retry with exponential backoff
          return {
            success: false,
            error: 'SERVER_ERROR',
            message: errorMessage,
            modelId,
            requestId,
            retryable: true
          };
        } else if (status === 401) {
          // Authentication error - do not fallback
          logger.warn(`API authentication failed for ${modelId}`, { 
            requestId, 
            modelId, 
            error: errorMessage 
          });
          return {
            success: false,
            error: 'AUTH_ERROR',
            message: errorMessage,
            modelId,
            requestId,
            retryable: false
          };
        } else {
          // Client error - don't retry
          return {
            success: false,
            error: 'CLIENT_ERROR',
            message: errorMessage,
            modelId,
            requestId,
            retryable: false
          };
        }
      } else {
        // Network or timeout error
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message,
          modelId,
          requestId,
          retryable: true
        };
      }
    }
  }

  generateFallbackResponse(modelId, prompt) {
    // Generate generic fallback responses when API calls fail
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for specific topics and provide appropriate responses
    if (lowerPrompt.includes('artificial intelligence') || lowerPrompt.includes('ai')) {
      return 'Artificial Intelligence (AI) refers to the simulation of human intelligence in machines that are programmed to think and learn like humans. It encompasses various subfields including machine learning, natural language processing, computer vision, and robotics. AI systems can perform tasks that typically require human intelligence, such as visual perception, speech recognition, decision-making, and language translation.';
    }
    
    if (lowerPrompt.includes('help') || lowerPrompt.includes('how')) {
      return `I'd be happy to help you with "${prompt}". While I'm currently operating in fallback mode due to API limitations, I can still provide general guidance and information on most topics. Please feel free to ask more specific questions.`;
    }
    
    // Generic fallback response
    return `I understand you're asking about "${prompt}". While I'm currently operating with limited capabilities due to API connectivity issues, I'm designed to provide helpful, accurate, and comprehensive responses. Please try your question again, or consider rephrasing it for better results.`;
  }

  async callModelWithRetry(modelId, prompt, options = {}, maxRetries = config.models.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.callModel(modelId, prompt, options);
      
      if (result.success) {
        return result;
      }
      
      lastError = result;
      
      // Don't retry for non-retryable errors
      if (!result.retryable) {
        break;
      }
      
      // Calculate delay for exponential backoff
      const delay = result.retryAfter || (config.models.retryDelay * Math.pow(2, attempt - 1));
      
      if (attempt < maxRetries) {
        logger.info(`Retrying ${modelId} in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return lastError;
  }

  async callModelsInParallel(prompt, options = {}) {
    const startTime = Date.now();
    const queryId = uuidv4();
    
    try {
      // Determine selected models (if any)
      const selected = [];
      if (options.selectedModels && Array.isArray(options.selectedModels)) {
        selected.push(...options.selectedModels.filter(Boolean).map(s => String(s).trim()));
      }
      if (options.selectedModel && typeof options.selectedModel === 'string') {
        selected.push(options.selectedModel.trim());
      }
      const selectedSet = new Set(selected);

      // Build the list of models to call
      let entries = Object.entries(this.models);
      if (selectedSet.size > 0) {
        entries = entries.filter(([key, modelId]) => selectedSet.has(key) || selectedSet.has(modelId));
        if (entries.length === 0) {
          throw new Error('No matching models found for the provided selection');
        }
      }

      logger.info('Starting parallel model calls', { queryId, modelsCount: entries.length, selectedModels: [...selectedSet] });
      
      // Check cache first
      // Include selected models in cache key to avoid mixing results for different selections
      const selectionSignature = (typeof entries !== 'undefined' && entries.length > 0)
        ? `:${entries.map(([key]) => key).sort().join('|')}`
        : '';
      const cacheKey = `query:${Buffer.from(prompt).toString('base64').slice(0, 50)}${selectionSignature}`;
      const cachedResult = await databaseManager.cacheGet(cacheKey);
      
      if (cachedResult && !options.skipCache) {
        logger.info('Returning cached result', { queryId, cacheKey });
        return {
          ...cachedResult,
          fromCache: true,
          queryId
        };
      }
      
      // Get model weights based on performance
      const selectedModelIds = (typeof entries !== 'undefined') ? new Set(entries.map(([_, modelId]) => modelId)) : null;
      const modelWeights = this.calculateModelWeights(selectedModelIds);
      
      // Call all models in parallel
      const modelPromises = entries.map(([key, modelId]) =>
        this.callModelWithRetry(modelId, prompt, options)
          .then(result => ({ key, modelId, ...result }))
          .catch(error => ({
            key,
            modelId,
            success: false,
            error: 'PROMISE_REJECTED',
            message: error.message
          }))
      );
      
      const results = await Promise.all(modelPromises);
      const totalTime = Date.now() - startTime;
      
      // Filter successful responses
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      logger.info('Parallel model calls completed', {
        queryId,
        totalTime,
        successful: successfulResults.length,
        failed: failedResults.length
      });
      
      if (successfulResults.length === 0) {
        throw new Error('All model calls failed');
      }
      
      // Merge responses using weighted approach
      const mergedResponse = await this.mergeResponses(successfulResults, modelWeights);
      
      const finalResult = {
        queryId,
        mergedResponse,
        individualResponses: results,
        modelWeights,
        totalTime,
        successRate: successfulResults.length / results.length,
        timestamp: new Date().toISOString()
      };
      
      // Cache the result
      await databaseManager.cacheSet(cacheKey, finalResult, config.cache.defaultTtl);
      
      return finalResult;
      
    } catch (error) {
      logger.logError(error, { component: 'multiModelMerge', operation: 'callModelsInParallel', queryId });
      throw error;
    }
  }

  calculateModelWeights(allowedModelIds = null) {
    const weights = {};
    const entries = (allowedModelIds instanceof Set && allowedModelIds.size > 0)
      ? Array.from(this.modelPerformance.entries()).filter(([modelId]) => allowedModelIds.has(modelId))
      : Array.from(this.modelPerformance.entries());

    const totalPerformance = entries
      .reduce((sum, [, perf]) => sum + (perf.qualityScore || 0) * (perf.successRate || 0), 0);
    
    for (const [modelId, performance] of entries) {
      const score = (performance.qualityScore || 0) * (performance.successRate || 0);
      const denom = totalPerformance > 0 ? totalPerformance : (entries.length > 0 ? entries.length : 1);
      weights[modelId] = score / denom;
    }
    
    return weights;
  }

  async mergeResponses(responses, weights) {
    try {
      // Simple weighted merge - in production, this would use the trained MetaModel
      const weightedResponses = responses.map(response => ({
        content: response.content,
        weight: weights[response.modelId] || 0.25,
        modelId: response.modelId,
        responseTime: response.responseTime
      }));
      
      // For now, select the response from the highest-weighted model
      // In production, this would be replaced with sophisticated ensemble techniques
      const bestResponse = weightedResponses.reduce((best, current) => 
        current.weight > best.weight ? current : best
      );
      
      // Add confidence score based on consensus
      const consensus = this.calculateConsensus(responses);
      
      return {
        content: bestResponse.content,
        primaryModel: bestResponse.modelId,
        confidence: consensus,
        weightedResponses,
        mergeStrategy: 'weighted_selection' // Will be 'meta_model' in production
      };
      
    } catch (error) {
      logger.logError(error, { component: 'multiModelMerge', operation: 'mergeResponses' });
      throw error;
    }
  }

  calculateConsensus(responses) {
    // Simple consensus calculation based on response similarity
    // In production, this would use NLP similarity metrics
    if (responses.length < 2) return 1.0;
    
    const contents = responses.map(r => r.content.toLowerCase());
    let similaritySum = 0;
    let comparisons = 0;
    
    for (let i = 0; i < contents.length; i++) {
      for (let j = i + 1; j < contents.length; j++) {
        // Simple word overlap similarity
        const words1 = new Set(contents[i].split(/\s+/));
        const words2 = new Set(contents[j].split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        similaritySum += intersection.size / union.size;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? similaritySum / comparisons : 0.5;
  }

  async updateModelPerformance(modelId, success, responseTime, content = null) {
    try {
      const performance = this.modelPerformance.get(modelId) || {
        successRate: 0.5,
        avgResponseTime: 5000,
        qualityScore: 0.5,
        totalCalls: 0,
        successfulCalls: 0,
        lastUpdated: new Date()
      };
      
      performance.totalCalls++;
      if (success) {
        performance.successfulCalls++;
      }
      
      // Update success rate with exponential moving average
      const alpha = 0.1; // Learning rate
      performance.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * performance.successRate;
      
      // Update average response time
      performance.avgResponseTime = alpha * responseTime + (1 - alpha) * performance.avgResponseTime;
      
      // Update quality score (simplified - in production would use NLP analysis)
      if (success && content) {
        const qualityScore = this.assessResponseQuality(content);
        performance.qualityScore = alpha * qualityScore + (1 - alpha) * performance.qualityScore;
      }
      
      performance.lastUpdated = new Date();
      this.modelPerformance.set(modelId, performance);
      
      // Save to database periodically
      if (performance.totalCalls % 10 === 0) {
        await this.saveModelPerformance();
      }
      
    } catch (error) {
      logger.logError(error, { component: 'multiModelMerge', operation: 'updateModelPerformance' });
    }
  }

  assessResponseQuality(content) {
    // Simplified quality assessment - in production would use advanced NLP
    let score = 0.5;
    
    // Length check
    if (content.length > 50 && content.length < 2000) score += 0.1;
    
    // Structure check
    if (content.includes('.') || content.includes('!') || content.includes('?')) score += 0.1;
    
    // Coherence check (very basic)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 1 && sentences.length < 20) score += 0.1;
    
    // Avoid repetition
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (uniqueWords.size / words.length > 0.7) score += 0.1;
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  getModelPerformanceStats() {
    const stats = {};
    for (const [modelId, performance] of this.modelPerformance.entries()) {
      stats[modelId] = {
        ...performance,
        lastUpdated: performance.lastUpdated instanceof Date ? 
          performance.lastUpdated.toISOString() : 
          new Date(performance.lastUpdated).toISOString()
      };
    }
    return stats;
  }

  async resetModelPerformance() {
    this.modelPerformance.clear();
    await this.initializeModelPerformance();
    logger.info('Model performance data reset');
  }
}

module.exports = MultiModelMerge;