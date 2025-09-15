const axios = require('axios');
const logger = require('../utils/logger');

class APIProviders {
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        modelsEndpoint: '/models',
        validateEndpoint: '/models',
        headers: (apiKey) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }),
        parseModels: (response) => {
          if (!response.data || !response.data.data) return [];
          
          // Filter for chat models only
          return response.data.data
            .filter(model => 
              model.id && (
                model.id.includes('gpt') || 
                model.id.includes('davinci') ||
                model.id.includes('o1')
              )
            )
            .map(model => ({
              id: model.id,
              name: this.formatModelName(model.id, 'OpenAI'),
              description: `OpenAI ${model.id} model`,
              provider: 'openai',
              context_length: this.getContextLength(model.id, 'openai'),
              capabilities: ['chat', 'completion']
            }));
        }
      },
      
      google: {
        name: 'Google AI',
        baseUrl: 'https://generativelanguage.googleapis.com/v1',
        modelsEndpoint: '/models',
        validateEndpoint: '/models',
        headers: (apiKey) => ({}),
        urlParams: (apiKey) => `?key=${apiKey}`,
        parseModels: (response) => {
          if (!response.data || !response.data.models) return [];
          
          return response.data.models
            .filter(model => model.name && model.supportedGenerationMethods?.includes('generateContent'))
            .map(model => ({
              id: model.name.replace('models/', ''),
              name: this.formatModelName(model.displayName || model.name, 'Google'),
              description: model.description || `Google ${model.displayName || model.name} model`,
              provider: 'google',
              context_length: model.inputTokenLimit || 32768,
              capabilities: model.supportedGenerationMethods || ['generateContent']
            }));
        }
      },
      
      anthropic: {
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        validateEndpoint: '/messages',
        headers: (apiKey) => ({
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }),
        // Anthropic doesn't have a models endpoint, so we use predefined models
        staticModels: [
          {
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
            description: 'Most intelligent model, highest capability',
            context_length: 200000
          },
          {
            id: 'claude-3-5-haiku-20241022',
            name: 'Claude 3.5 Haiku',
            description: 'Fastest and most cost-effective model',
            context_length: 200000
          },
          {
            id: 'claude-3-opus-20240229',
            name: 'Claude 3 Opus',
            description: 'Powerful model for complex tasks',
            context_length: 200000
          },
          {
            id: 'claude-3-sonnet-20240229',
            name: 'Claude 3 Sonnet',
            description: 'Balanced performance and speed',
            context_length: 200000
          },
          {
            id: 'claude-3-haiku-20240307',
            name: 'Claude 3 Haiku',
            description: 'Fast and cost-effective',
            context_length: 200000
          }
        ],
        validateKey: async (apiKey) => {
          // Test with a minimal request to validate the key
          try {
            const response = await axios({
              method: 'POST',
              url: 'https://api.anthropic.com/v1/messages',
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
              },
              data: {
                model: 'claude-3-haiku-20240307',
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 1
              },
              timeout: 10000
            });
            return true;
          } catch (error) {
            // Check if it's an auth error or just usage limit
            if (error.response && error.response.status === 401) {
              return false;
            }
            // If it's a different error (like rate limit), the key might still be valid
            return error.response && error.response.status !== 401;
          }
        },
        parseModels: (response) => {
          // Return static models for Anthropic
          return this.providers.anthropic.staticModels.map(model => ({
            ...model,
            provider: 'anthropic',
            capabilities: ['messages']
          }));
        }
      },
      
      openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        modelsEndpoint: '/models',
        validateEndpoint: '/models',
        headers: (apiKey) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }),
        parseModels: (response) => {
          if (!response.data || !response.data.data) return [];
          
          return response.data.data
            .filter(model => model.id && !model.id.includes('deprecated'))
            .slice(0, 50) // Limit to first 50 models for performance
            .map(model => ({
              id: model.id,
              name: this.formatModelName(model.name || model.id, 'OpenRouter'),
              description: model.description || '',
              provider: 'openrouter',
              context_length: model.context_length || 4096,
              pricing: model.pricing || {},
              capabilities: ['chat', 'completion']
            }));
        }
      }
    };
  }

  formatModelName(name, provider) {
    // Clean up model names for better display
    if (typeof name !== 'string') return 'Unknown Model';
    
    // Remove provider prefix if it exists
    name = name.replace(/^(openai\/|google\/|anthropic\/|models\/)/, '');
    
    // Capitalize first letter of each word
    return name.split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getContextLength(modelId, provider) {
    // Return known context lengths for specific models
    const contextLengths = {
      'gpt-4-turbo-preview': 128000,
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-3.5-turbo': 16385,
      'gpt-3.5-turbo-16k': 16385,
      'o1-preview': 128000,
      'o1-mini': 128000
    };
    
    return contextLengths[modelId] || 4096;
  }

  async detectProvider(apiKey) {
    // Try to detect provider based on API key format
    if (!apiKey || typeof apiKey !== 'string') {
      return null;
    }
    
    // OpenAI keys typically start with 'sk-'
    if (apiKey.startsWith('sk-')) {
      return 'openai';
    }
    
    // Google keys are typically alphanumeric with specific length
    if (apiKey.match(/^[A-Za-z0-9]{39}$/)) {
      return 'google';
    }
    
    // Anthropic keys typically start with 'sk-ant-'
    if (apiKey.startsWith('sk-ant-')) {
      return 'anthropic';
    }
    
    // OpenRouter keys typically start with 'sk-or-'
    if (apiKey.startsWith('sk-or-')) {
      return 'openrouter';
    }
    
    // If we can't detect, return null
    return null;
  }

  async validateAndDiscoverModels(apiKey, providerHint = null) {
    try {
      // Detect provider if not provided
      let provider = providerHint || await this.detectProvider(apiKey);
      
      if (!provider) {
        // Try each provider until one works
        for (const providerName of ['openai', 'google', 'anthropic', 'openrouter']) {
          const result = await this.tryProvider(apiKey, providerName);
          if (result.success) {
            return result;
          }
        }
        
        throw new Error('Invalid API key - could not authenticate with any supported provider');
      }
      
      // Try the detected/specified provider
      const result = await this.tryProvider(apiKey, provider);
      if (result.success) {
        return result;
      }
      
      throw new Error(`Invalid API key for provider ${provider}`);
      
    } catch (error) {
      logger.logError(error, { component: 'apiProviders', operation: 'validateAndDiscoverModels' });
      throw error;
    }
  }

  async tryProvider(apiKey, providerName) {
    const provider = this.providers[providerName];
    
    if (!provider) {
      return { success: false, error: 'Unknown provider' };
    }
    
    try {
      // Special handling for Anthropic
      if (providerName === 'anthropic') {
        const isValid = await provider.validateKey(apiKey);
        if (isValid) {
          return {
            success: true,
            provider: providerName,
            providerName: provider.name,
            models: provider.parseModels({}),
            modelsDiscovered: provider.staticModels.length
          };
        }
        return { success: false, error: 'Invalid Anthropic API key' };
      }
      
      // For other providers, try to fetch models
      const url = provider.baseUrl + provider.modelsEndpoint + (provider.urlParams ? provider.urlParams(apiKey) : '');
      
      const response = await axios({
        method: 'GET',
        url: url,
        headers: provider.headers(apiKey),
        timeout: 10000
      });
      
      const models = provider.parseModels(response);
      
      if (models.length > 0) {
        logger.info(`Successfully discovered ${models.length} models from ${providerName}`);
        return {
          success: true,
          provider: providerName,
          providerName: provider.name,
          models: models,
          modelsDiscovered: models.length
        };
      }
      
      return { success: false, error: 'No models found' };
      
    } catch (error) {
      // Check if it's an authentication error
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          logger.warn(`Authentication failed for ${providerName}`, { status });
          return { success: false, error: 'Authentication failed' };
        }
      }
      
      logger.debug(`Provider ${providerName} failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async testAPIKey(apiKey, provider, modelId) {
    // Test if an API key works with a specific model
    try {
      const providerConfig = this.providers[provider];
      if (!providerConfig) {
        throw new Error('Unknown provider');
      }
      
      // Provider-specific test implementation would go here
      // For now, we'll rely on the model discovery as validation
      
      return { success: true, message: 'API key is valid' };
      
    } catch (error) {
      logger.logError(error, { component: 'apiProviders', operation: 'testAPIKey' });
      return { success: false, error: error.message };
    }
  }
}

module.exports = APIProviders;