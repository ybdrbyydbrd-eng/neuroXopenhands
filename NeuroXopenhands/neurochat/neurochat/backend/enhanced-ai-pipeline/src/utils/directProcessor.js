// Direct processor for handling queries without Redis/Bull queues
const logger = require('./logger');
const agentManager = require('./agentManager');
const { v4: uuidv4 } = require('uuid');

class DirectProcessor {
  constructor() {
    this.tasks = new Map();
  }

  async processQuery(query, options = {}) {
    const taskId = options.requestId || uuidv4();
    
    try {
      // Store task as pending
      this.tasks.set(taskId, {
        status: 'processing',
        query,
        options,
        startTime: Date.now()
      });

      logger.info('Direct processing query', {
        taskId,
        query: query.substring(0, 100)
      });

      // Ensure agent manager is initialized
      await agentManager.ensureInitialized();
      const multiModelMerge = agentManager.multiModelMerge;

      // Process with selected model(s)
      const selectedModels = options.selectedModels || [options.selectedModel];
      
      if (!selectedModels || selectedModels.length === 0) {
        throw new Error('No model selected');
      }

      logger.info('Processing with models', {
        models: selectedModels,
        taskId
      });

      // Get response from models
      let response;
      
      if (selectedModels.length === 1) {
        // Single model
        const result = await multiModelMerge.callModelWithRetry(
          selectedModels[0],
          query,
          {
            maxTokens: options.maxTokens || 2048,
            temperature: options.temperature || 0.7
          }
        );
        
        if (!result.success) {
          throw new Error(result.error || 'Model call failed');
        }
        
        response = result.content;
      } else {
        // Multiple models - use parallel processing
        const results = await multiModelMerge.callModelsInParallel(
          query,
          {
            maxTokens: options.maxTokens || 2048,
            temperature: options.temperature || 0.7,
            selectedModels: selectedModels
          }
        );
        
        // Extract merged response
        response = results.mergedResponse?.content || 'No response generated';
      }

      // Store result
      this.tasks.set(taskId, {
        status: 'completed',
        result: response,
        query,
        options,
        completedTime: Date.now(),
        processingTime: Date.now() - this.tasks.get(taskId).startTime
      });

      logger.info('Query processed successfully', {
        taskId,
        processingTime: this.tasks.get(taskId).processingTime
      });

      return {
        taskId,
        status: 'completed',
        result: response
      };

    } catch (error) {
      logger.error('Direct processing failed', {
        taskId,
        error: error.message
      });

      // Store error
      this.tasks.set(taskId, {
        status: 'failed',
        error: error.message,
        query,
        options,
        failedTime: Date.now()
      });

      throw error;
    }
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  cleanOldTasks() {
    const oneHourAgo = Date.now() - 3600000;
    for (const [taskId, task] of this.tasks.entries()) {
      if ((task.completedTime || task.failedTime || task.startTime) < oneHourAgo) {
        this.tasks.delete(taskId);
      }
    }
  }
}

module.exports = new DirectProcessor();