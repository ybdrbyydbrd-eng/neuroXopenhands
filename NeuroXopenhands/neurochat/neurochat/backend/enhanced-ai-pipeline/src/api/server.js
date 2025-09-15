const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
// Simple rate limiting without Redis for now
const rateLimit = require('express-rate-limit');
const promBundle = require('express-prom-bundle');
const fetch = require('node-fetch');
const config = require('../../config/config');
const logger = require('../utils/logger');
const databaseManager = require('../utils/database');
const queueManager = require('../utils/queueManager');

// Import route handlers
const queryRoutes = require('./routes/queries');
const modelRoutes = require('./routes/models');
const evaluationRoutes = require('./routes/evaluation');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');
const agentManager = require('../utils/agentManager');
const directProcessor = require('../utils/directProcessor');
const workspaceManager = require('../utils/workspaceManager');

class Server {
  constructor() {
    this.app = express();
    this.server = null;
    this.isShuttingDown = false;
  }

  async initialize() {
    try {
      // Initialize database connections
      await databaseManager.initialize();
      
      // Initialize queue manager (optional in minimal deployments)
      try {
        await queueManager.initialize();
      } catch (e) {
        logger.warn('Queue manager initialization failed, continuing without background queues', { error: e.message });
      }
      
      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      logger.info('Server initialized successfully');
      
    } catch (error) {
      logger.logError(error, { component: 'server', operation: 'initialize' });
      throw error;
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors(config.server.cors));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimit.windowMs,
      max: config.security.rateLimit.max,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(config.security.rateLimit.windowMs / 1000)
        });
      }
    });
    this.app.use(limiter);

    // Metrics middleware
    if (config.monitoring.enabled) {
      const metricsMiddleware = promBundle({
        includeMethod: true,
        includePath: true,
        includeStatusCode: true,
        includeUp: true,
        customLabels: {
          service: 'enhanced-ai-pipeline'
        },
        promClient: {
          collectDefaultMetrics: {}
        }
      });
      this.app.use(metricsMiddleware);
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../../public')));

    // Download endpoint for the production zip file
    this.app.get('/download/production-package', (req, res) => {
      const zipPath = path.join(__dirname, '../../../enhanced-multi-model-ai-pipeline-production.zip');
      const fs = require('fs');
      
      if (fs.existsSync(zipPath)) {
        res.download(zipPath, 'enhanced-multi-model-ai-pipeline-production.zip', (err) => {
          if (err) {
            logger.error('Download error:', err);
            res.status(500).json({ error: 'Download failed' });
          }
        });
      } else {
        res.status(404).json({ error: 'Package not found' });
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        logger.logApiCall(
          req.method,
          req.originalUrl,
          res.statusCode,
          responseTime,
          req.user?.id
        );
      });
      
      next();
    });

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = require('uuid').v4();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });
  }

  setupRoutes() {
    // API routes
    this.app.use('/api/v1/queries', queryRoutes);
    this.app.use('/api/v1/models', modelRoutes);
    this.app.use('/api/v1/evaluation', evaluationRoutes);
    this.app.use('/api/v1/admin', adminRoutes);
    this.app.use('/api/v1/health', healthRoutes);
    
    // Sandbox and upload routes
    try {
      const sandboxRoutes = require('./routes/sandbox');
      const uploadRoutes = require('./routes/upload');
      this.app.use('/api/sandbox', sandboxRoutes);
      this.app.use('/api/upload', uploadRoutes);
    } catch (error) {
      logger.warn('Could not load sandbox/upload routes', { error: error.message });
    }

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Enhanced Multi-Model AI Pipeline',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
          queries: '/api/v1/queries',
          models: '/api/v1/models',
          evaluation: '/api/v1/evaluation',
          admin: '/api/v1/admin',
          health: '/api/v1/health'
        }
      });
    });

    // Chat endpoint for frontend compatibility
    this.app.post('/chat', async (req, res) => {
      try {
        const { message, conversation_id, model, models, fileIds, workspaceId } = req.body;
        const sessionId = req.headers['x-session-id'] || workspaceId || 'default';
        
        if (!message) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Message is required'
          });
        }

        // Try direct processing without Redis queue
        try {
          logger.info('Processing chat message directly', {
            model,
            models,
            messageLength: message.length
          });

          // Get files context if provided
          let filesContext = [];
          if (fileIds && fileIds.length > 0) {
            filesContext = await workspaceManager.getFilesForContext(fileIds);
          }
          
          // Build enhanced message with file context
          let enhancedMessage = message;
          if (filesContext.length > 0) {
            const fileInfo = filesContext.map(f => `File: ${f.name}\nContent:\n${f.content}`).join('\n\n---\n\n');
            enhancedMessage = `User message: ${message}\n\nUploaded files context:\n${fileInfo}`;
          }
          
          // Process directly without queue
          const result = await directProcessor.processQuery(enhancedMessage, {
            selectedModel: model,
            selectedModels: Array.isArray(models) ? models : (model ? [model] : undefined),
            conversationId: conversation_id,
            fileIds: fileIds,
            workspaceId: sessionId
          });

          res.json({
            task_id: result.taskId,
            status: 'completed',
            result: result.result
          });

        } catch (directError) {
          logger.warn('Direct processing failed, falling back to queue', { error: directError.message });
          
          // Fallback to queue-based processing
          try {
            const queryResponse = await fetch(`http://localhost:${config.server.port}/api/v1/queries`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': req.requestId
              },
              body: JSON.stringify({
                query: message,
                options: {
                  selectedModel: model,
                  selectedModels: Array.isArray(models) ? models : (model ? [model] : undefined),
                  conversationId: conversation_id,
                  fileIds: fileIds,
                  workspaceId: sessionId
                }
              })
            });
            
            const queryData = await queryResponse.json();
            
            if (queryData.success) {
              res.json({
                task_id: queryData.queryId,
                status: 'queued'
              });
            } else {
              throw new Error('Queue processing failed');
            }
          } catch (queueError) {
            // If both fail, return error
            throw directError;
          }
        }
        
      } catch (error) {
        logger.logError(error, { component: 'server', operation: 'chat' });
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to process chat message'
        });
      }
    });

    // Result endpoint for frontend compatibility
    this.app.get('/result/:taskId', async (req, res) => {
      try {
        const { taskId } = req.params;
        
        // Check direct processor first
        const directTask = directProcessor.getTask(taskId);
        if (directTask) {
          if (directTask.status === 'completed') {
            res.json({
              status: 'completed',
              result: directTask.result
            });
            return;
          } else if (directTask.status === 'failed') {
            res.json({
              status: 'failed',
              error: directTask.error
            });
            return;
          } else {
            res.json({
              status: 'processing'
            });
            return;
          }
        }
        
        // Fallback to queue-based result
        const resultResponse = await fetch(`http://localhost:${config.server.port}/api/v1/queries/${taskId}`, {
          headers: {
            'X-Request-ID': req.requestId
          }
        });
        
        const resultData = await resultResponse.json();
        
        if (resultData.success) {
          // Provide richer payload for Agent Mode while keeping backward compatibility
          const responsePayload = {
            status: 'completed',
            result: resultData.result.content
          };

          // Attach agent analysis details if available (used by Agent Console)
          if (resultData.analysis) {
            responsePayload.agent = {
              factCheck: resultData.analysis.factCheck || null,
              bias: resultData.analysis.bias || null,
              coherence: resultData.analysis.coherence || null
            };
          }

          // Attach evaluation summary if available
          if (resultData.evaluation) {
            responsePayload.evaluation = {
              overall: resultData.evaluation.overall,
              metrics: resultData.evaluation.metrics
            };
          }

          // Attach metadata if available
          if (resultData.metadata) {
            responsePayload.metadata = resultData.metadata;
          }

          res.json(responsePayload);
        } else if (resultResponse.status === 202) {
          res.json({
            status: resultData.status || 'processing'
          });
        } else {
          res.json({
            status: 'failed',
            error: resultData.message || 'Processing failed'
          });
        }
        
      } catch (error) {
        logger.logError(error, { component: 'server', operation: 'result' });
        res.status(500).json({
          status: 'failed',
          error: 'Failed to get result'
        });
      }
    });

    // Lightweight Agent endpoints (now support single-model and collaboration)
    this.app.post('/agent/chat', async (req, res) => {
      try {
        const { message, model, options } = req.body || {};
        if (!message || typeof message !== 'string') {
          return res.status(400).json({ error: 'Bad Request', message: 'message is required' });
        }
        const { taskId } = await agentManager.startAgent({ message, model, options });
        return res.json({ task_id: taskId, status: 'processing' });
      } catch (err) {
        logger.logError(err, { component: 'server', operation: 'agent_chat' });
        return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to start agent task' });
      }
    });

    this.app.get('/agent/result/:taskId', async (req, res) => {
      try {
        const { taskId } = req.params;
        const task = agentManager.getTask(taskId);
        if (!task) return res.status(404).json({ status: 'failed', error: 'Task not found' });
        if (task.status === 'completed') {
          const payload = { status: 'completed', result: task.result.content };
          if (task.result?.details) {
            payload.mode = 'collaboration';
            payload.collaboration = {
              merged: task.result.details.mergedResponse,
              weights: task.result.details.modelWeights,
              successRate: task.result.details.successRate,
              totalTime: task.result.details.totalTime,
              models: (task.result.details.individualResponses || []).map(r => ({
                key: r.key,
                modelId: r.modelId,
                success: r.success,
                responseTime: r.responseTime,
                error: r.error || null,
                fallback: r.fallback || false
              }))
            };
          } else {
            payload.mode = 'single-model';
          }
          if (task.result?.analysis) {
            payload.agent = {
              qualityScore: task.result.analysis.qualityScore,
              factCheck: task.result.analysis.factCheck,
              bias: task.result.analysis.biasAnalysis,
              coherence: task.result.analysis.coherenceAnalysis,
              recommendations: task.result.analysis.recommendations
            };
          }
          return res.json(payload);
        } else if (task.status === 'failed') {
          return res.json({ status: 'failed', error: task.result?.error || 'Agent failed' });
        }
        return res.json({ status: 'processing' });
      } catch (err) {
        logger.logError(err, { component: 'server', operation: 'agent_result' });
        return res.status(500).json({ status: 'failed', error: 'Failed to get agent result' });
      }
    });

    // Agent logs endpoint
    this.app.get('/agent/logs/:taskId', async (req, res) => {
      try {
        const { taskId } = req.params;
        const task = agentManager.getTask(taskId);
        if (!task) return res.status(404).json({ status: 'failed', error: 'Task not found' });
        return res.json({ status: task.status, logs: task.logs || [] });
      } catch (err) {
        logger.logError(err, { component: 'server', operation: 'agent_logs' });
        return res.status(500).json({ status: 'failed', error: 'Failed to get agent logs' });
      }
    });

    // Enhanced API key endpoint with proper validation and model discovery
    this.app.post('/api/save-key', async (req, res) => {
      try {
        const { apiKey, provider = null } = req.body;
        
        // Validate API key is present and not empty
        if (!apiKey || apiKey.trim().length === 0) {
          logger.warn('API key save attempt with missing or empty key', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          return res.status(400).json({
            success: false,
            message: 'API key is required and cannot be empty'
          });
        }
        
        // Basic validation: API key should be at least 20 characters
        if (apiKey.trim().length < 20) {
          logger.warn('API key save attempt with invalid key length', {
            keyLength: apiKey.trim().length,
            ip: req.ip
          });
          return res.status(400).json({
            success: false,
            message: 'Invalid API key format - key is too short'
          });
        }
        
        // Log API key receipt (safely)
        console.log('=== API KEY VALIDATION ===');
        console.log('API key received, length:', apiKey.length);
        console.log('API key prefix:', apiKey.substring(0, 6) + '...');
        console.log('Provider hint:', provider || 'auto-detect');
        console.log('Timestamp:', new Date().toISOString());
        console.log('=========================');
        
        // Use shared instance from agentManager so chat/agent share the same models
        await agentManager.ensureInitialized();
        const multiModelMerge = agentManager.multiModelMerge;
        
        console.log('=== VALIDATING & DISCOVERING MODELS ===');
        console.log('Validating API key with provider...');
        
        // Validate and discover models using the API key
        const discoveryResult = await multiModelMerge.addApiKey(apiKey, provider);
        
        console.log('Validation successful!');
        console.log('Provider detected:', discoveryResult.provider);
        console.log('Provider name:', discoveryResult.providerName);
        console.log('Models discovered:', discoveryResult.modelsDiscovered);
        console.log('First few models:', discoveryResult.models.slice(0, 3).map(m => m.name));
        console.log('========================================');
        
        // Log to application logger
        logger.info('API key validated and models discovered', {
          keyPrefix: apiKey.substring(0, 6) + '...',
          provider: discoveryResult.provider,
          providerName: discoveryResult.providerName,
          modelsDiscovered: discoveryResult.modelsDiscovered,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.requestId
        });
        
        // Send enhanced response with discovered models
        res.json({
          success: true,
          message: `API key validated successfully for ${discoveryResult.providerName}`,
          provider: discoveryResult.provider,
          providerName: discoveryResult.providerName,
          modelsDiscovered: discoveryResult.modelsDiscovered,
          models: discoveryResult.models,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.log('=== API KEY VALIDATION ERROR ===');
        console.log('Error:', error.message);
        console.log('=================================');
        
        logger.logError(error, { 
          component: 'server', 
          operation: 'saveApiKeyWithValidation',
          requestId: req.requestId 
        });
        
        // Determine the type of error and respond accordingly
        if (error.message && (error.message.includes('Invalid API key') || error.message.includes('could not authenticate'))) {
          res.status(401).json({
            success: false,
            message: 'Invalid API key - authentication failed with all supported providers',
            error: 'Please check your API key and try again'
          });
        } else if (error.message && error.message.includes('Failed to discover models')) {
          res.status(400).json({
            success: false,
            message: 'Unable to discover models with this API key',
            error: error.message
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Internal server error while processing API key',
            error: 'Please try again later'
          });
        }
      }
    });

    // API documentation
    this.app.get('/api/v1', (req, res) => {
      res.json({
        name: 'Enhanced Multi-Model AI Pipeline API',
        version: '1.0.0',
        description: 'Production-ready multi-model AI pipeline with real API integration',
        endpoints: {
          'POST /chat': 'Submit a chat message (frontend compatibility)',
          'GET /result/:taskId': 'Get chat result (frontend compatibility)',
          'POST /api/v1/queries': 'Submit a query for processing',
          'GET /api/v1/queries/:id': 'Get query result',
          'GET /api/v1/queries/:id/status': 'Get query processing status',
          'POST /api/v1/queries/:id/feedback': 'Submit user feedback',
          'GET /api/v1/models/performance': 'Get model performance statistics',
          'GET /api/v1/models/weights': 'Get current model weights',
          'GET /api/v1/models/config': 'Get available models',
          'POST /api/v1/models/api-key': 'Add API key and discover models',
          'DELETE /api/v1/models/api-key/:provider': 'Remove API key',
          'POST /api/v1/evaluation/response': 'Evaluate a response',
          'GET /api/v1/health': 'System health check',
          'GET /api/v1/admin/stats': 'System statistics (admin only)'
        },
        documentation: 'https://github.com/enhanced-ai-pipeline/docs'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((err, req, res, next) => {
      const errorId = require('uuid').v4();
      
      logger.logError(err, {
        component: 'server',
        operation: 'errorHandler',
        errorId,
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Don't expose internal errors in production
      const isDevelopment = config.server.env === 'development';
      
      let statusCode = 500;
      let message = 'Internal Server Error';
      
      if (err.statusCode) {
        statusCode = err.statusCode;
      }
      
      if (err.message && (isDevelopment || statusCode < 500)) {
        message = err.message;
      }

      res.status(statusCode).json({
        error: statusCode >= 500 ? 'Internal Server Error' : 'Client Error',
        message,
        errorId,
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: err.stack })
      });
    });

    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.logError(new Error('Unhandled Promise Rejection'), {
        component: 'server',
        operation: 'unhandledRejection',
        reason: reason.toString(),
        promise: promise.toString()
      });
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.logError(error, {
        component: 'server',
        operation: 'uncaughtException'
      });
      
      // Graceful shutdown on uncaught exception
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  }

  async start() {
    try {
      await this.initialize();
      
      this.server = this.app.listen(config.server.port, config.server.host, () => {
        logger.info(`Server started successfully`, {
          port: config.server.port,
          host: config.server.host,
          env: config.server.env,
          pid: process.pid
        });
        
        console.log(`🚀 Enhanced AI Pipeline Server running at:`);
        console.log(`   Local:   http://localhost:${config.server.port}`);
        console.log(`   Network: http://${config.server.host}:${config.server.port}`);
        console.log(`   Environment: ${config.server.env}`);
        console.log(`   Process ID: ${process.pid}`);
      });

      // Setup graceful shutdown handlers
      this.setupShutdownHandlers();
      
    } catch (error) {
      logger.logError(error, { component: 'server', operation: 'start' });
      process.exit(1);
    }
  }

  setupShutdownHandlers() {
    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      this.gracefulShutdown('SIGTERM');
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('SIGINT received, starting graceful shutdown');
      this.gracefulShutdown('SIGINT');
    });
  }

  async gracefulShutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }
    
    this.isShuttingDown = true;
    logger.info(`Starting graceful shutdown due to ${signal}`);
    
    const shutdownTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000); // 30 second timeout

    try {
      // Stop accepting new connections
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close queue manager
      await queueManager.close();
      
      // Close database connections
      await databaseManager.close();
      
      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      logger.logError(error, { component: 'server', operation: 'gracefulShutdown' });
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }

  // Health check endpoint
  async getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      environment: config.server.env
    };

    try {
      // Check database health
      const dbHealth = await databaseManager.healthCheck();
      health.database = dbHealth;
      
      // Check queue health
      const queueHealth = await queueManager.healthCheck();
      health.queues = queueHealth;
      
      // Determine overall health
      const isDbHealthy = dbHealth.redis && dbHealth.mongodb;
      const isQueueHealthy = queueHealth.initialized;
      
      if (!isDbHealthy || !isQueueHealthy) {
        health.status = 'degraded';
      }
      
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }
}

// Create and export server instance
const server = new Server();

// Start server if this file is run directly
if (require.main === module) {
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = server;