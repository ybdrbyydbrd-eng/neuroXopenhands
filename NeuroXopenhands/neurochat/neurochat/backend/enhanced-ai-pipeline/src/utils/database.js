const redis = require('redis');
const mongoose = require('mongoose');
const config = require('../../config/config');
const logger = require('./logger');

class DatabaseManager {
  constructor() {
    this.redisClient = null;
    this.mongoConnection = null;
  }

  // Redis Connection
  async connectRedis() {
    try {
      // Create client with minimal retries to fail fast if Redis is not available
      this.redisClient = redis.createClient({
        url: config.database.redis.url,
        socket: {
          connectTimeout: 3000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              // Stop trying after 3 attempts
              logger.warn('Redis connection failed after 3 attempts, disabling Redis');
              return false;
            }
            return Math.min(retries * 100, 1000);
          }
        }
      });

      // Set up event handlers but prevent spam
      let errorLogged = false;
      this.redisClient.on('error', (err) => {
        if (!errorLogged) {
          logger.warn('Redis connection error (suppressing further errors)', { error: err.message });
          errorLogged = true;
        }
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
        errorLogged = false; // Reset error flag on successful connection
      });

      this.redisClient.on('ready', () => {
        logger.info('Redis ready for operations');
      });

      this.redisClient.on('end', () => {
        logger.debug('Redis connection ended');
      });

      // Try to connect with a timeout
      const connectPromise = this.redisClient.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      return this.redisClient;
    } catch (error) {
      logger.warn('Redis connection failed', { error: error.message });
      // Clean up the client
      if (this.redisClient) {
        try {
          await this.redisClient.quit();
        } catch (e) {
          // Ignore quit errors
        }
        this.redisClient = null;
      }
      throw error;
    }
  }

  // MongoDB Connection
  async connectMongoDB() {
    try {
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
      });

      mongoose.connection.on('error', (err) => {
        logger.logError(err, { component: 'mongodb' });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      this.mongoConnection = await mongoose.connect(
        config.database.mongodb.url,
        config.database.mongodb.options
      );

      return this.mongoConnection;
    } catch (error) {
      logger.logError(error, { component: 'mongodb', operation: 'connect' });
      throw error;
    }
  }

  // Initialize all database connections
  async initialize() {
    try {
      // Try to connect to Redis (optional)
      try {
        await this.connectRedis();
        logger.info('Redis connected successfully');
      } catch (redisError) {
        logger.warn('Redis connection failed, continuing without Redis cache', {
          error: redisError.message
        });
        // Set redisClient to null to indicate Redis is not available
        this.redisClient = null;
      }
      
      // Try to connect to MongoDB (optional)
      try {
        await this.connectMongoDB();
        logger.info('MongoDB connected successfully');
      } catch (mongoError) {
        logger.warn('MongoDB connection failed, continuing without MongoDB', {
          error: mongoError.message
        });
      }
      
      logger.info('Database connections initialized (Redis and MongoDB are optional)');
    } catch (error) {
      logger.logError(error, { component: 'database', operation: 'initialize' });
      // Don't throw - allow the app to run without databases
      logger.warn('Continuing without database connections');
    }
  }

  // Cache operations
  async cacheGet(key) {
    try {
      if (!this.redisClient) {
        // Redis not available, return null
        logger.debug('Redis not available, skipping cache get', { key });
        return null;
      }
      
      const value = await this.redisClient.get(key);
      if (value) {
        logger.logCacheHit(key);
        return JSON.parse(value);
      } else {
        logger.logCacheMiss(key);
        return null;
      }
    } catch (error) {
      logger.logError(error, { component: 'cache', operation: 'get', key });
      return null;
    }
  }

  async cacheSet(key, value, ttl = config.cache.defaultTtl) {
    try {
      if (!this.redisClient) {
        // Redis not available, log and return silently
        logger.debug('Redis not available, skipping cache set', { key });
        return false;
      }
      
      await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      logger.debug('Cache set', { key, ttl });
      return true;
    } catch (error) {
      logger.logError(error, { component: 'cache', operation: 'set', key });
      return false;
    }
  }

  async cacheDelete(key) {
    try {
      if (!this.redisClient) {
        // Redis not available, return silently
        logger.debug('Redis not available, skipping cache delete', { key });
        return false;
      }
      
      await this.redisClient.del(key);
      logger.debug('Cache deleted', { key });
      return true;
    } catch (error) {
      logger.logError(error, { component: 'cache', operation: 'delete', key });
      return false;
    }
  }

  async cacheFlush() {
    try {
      if (!this.redisClient) {
        // Redis not available, return silently
        logger.debug('Redis not available, skipping cache flush');
        return false;
      }
      
      await this.redisClient.flushAll();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.logError(error, { component: 'cache', operation: 'flush' });
      return false;
    }
  }

  // Health check
  async healthCheck() {
    const health = {
      redis: false,
      mongodb: false,
      timestamp: new Date().toISOString()
    };

    try {
      // Check Redis
      if (this.redisClient) {
        await this.redisClient.ping();
        health.redis = true;
      }
    } catch (error) {
      logger.logError(error, { component: 'health-check', service: 'redis' });
    }

    try {
      // Check MongoDB
      if (mongoose.connection.readyState === 1) {
        health.mongodb = true;
      }
    } catch (error) {
      logger.logError(error, { component: 'health-check', service: 'mongodb' });
    }

    return health;
  }

  // Graceful shutdown
  async close() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        logger.info('Redis connection closed');
      }
      
      if (this.mongoConnection) {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.logError(error, { component: 'database', operation: 'close' });
    }
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

module.exports = databaseManager;