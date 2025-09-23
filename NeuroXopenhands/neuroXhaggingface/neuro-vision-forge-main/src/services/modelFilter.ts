import { HFModel } from './api';

export interface ModelFilter {
  task?: string;
  maxPrice?: number;
  minRating?: number;
  tags?: string[];
  provider?: string;
}

export class ModelFilterService {
  private static models: HFModel[] = [];
  private static isLoaded = false;

  // Load models from API
  static async loadModels(): Promise<HFModel[]> {
    if (this.isLoaded && this.models.length > 0) {
      return this.models;
    }

    try {
      const response = await fetch('http://localhost:5174/api/hf/models?page=1&limit=100');
      if (!response.ok) {
        throw new Error(`Failed to load models: ${response.status}`);
      }
      
      const data = await response.json();
      this.models = data.models || [];
      this.isLoaded = true;
      console.log(`Loaded ${this.models.length} models for assistant`);
      return this.models;
    } catch (error) {
      console.error('Error loading models:', error);
      // Return empty array but don't mark as loaded so we can retry
      return [];
    }
  }

  // Get model by ID
  static getModelById(modelId: string): HFModel | null {
    console.log('Looking for model with ID:', modelId);
    console.log('Available models:', this.models.map(m => ({ id: m.id, name: m.name })));
    const found = this.models.find(model => model.id === modelId);
    console.log('Found model:', found);
    return found || null;
  }

  // Get all loaded models
  static getModels(): HFModel[] {
    return this.models;
  }

  // Filter models based on criteria
  static filterModels(criteria: ModelFilter): HFModel[] {
    return this.models.filter(model => {
      // Task filtering (pipeline_tag)
      if (criteria.task && model.pipeline_tag) {
        const taskMatch = model.pipeline_tag.toLowerCase().includes(criteria.task.toLowerCase()) ||
                         model.tags.some(tag => tag.toLowerCase().includes(criteria.task.toLowerCase()));
        if (!taskMatch) return false;
      }

      // Price filtering
      if (criteria.maxPrice !== undefined && model.pricePerToken > criteria.maxPrice) {
        return false;
      }

      // Rating filtering
      if (criteria.minRating !== undefined && model.rating < criteria.minRating) {
        return false;
      }

      // Tags filtering
      if (criteria.tags && criteria.tags.length > 0) {
        const hasMatchingTag = criteria.tags.some(tag => 
          model.tags.some(modelTag => 
            modelTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) return false;
      }

      // Provider filtering
      if (criteria.provider && model.provider.toLowerCase() !== criteria.provider.toLowerCase()) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by rating (descending) then by price (ascending)
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return a.pricePerToken - b.pricePerToken;
    });
  }

  // Extract task from user query
  static extractTaskFromQuery(query: string): string | null {
    const taskMappings: { [key: string]: string } = {
      // Text tasks
      'text-classification': 'text-classification',
      'text-class': 'text-classification',
      'classification': 'text-classification',
      'text-generation': 'text-generation',
      'text-gen': 'text-generation',
      'generation': 'text-generation',
      'gpt': 'text-generation',
      'translation': 'translation',
      'translate': 'translation',
      'summarization': 'summarization',
      'summarize': 'summarization',
      'summary': 'summarization',
      'question-answering': 'question-answering',
      'qa': 'question-answering',
      'question answering': 'question-answering',
      'sentiment-analysis': 'sentiment-analysis',
      'sentiment': 'sentiment-analysis',
      'named-entity-recognition': 'token-classification',
      'ner': 'token-classification',
      'text-to-speech': 'text-to-speech',
      'tts': 'text-to-speech',
      'speech-to-text': 'automatic-speech-recognition',
      'stt': 'automatic-speech-recognition',
      
      // Image tasks
      'image-classification': 'image-classification',
      'image-class': 'image-classification',
      'object-detection': 'object-detection',
      'detection': 'object-detection',
      'image-segmentation': 'image-segmentation',
      'segmentation': 'image-segmentation',
      'image-generation': 'text-to-image',
      'image-gen': 'text-to-image',
      'text-to-image': 'text-to-image',
      'image synthesis': 'text-to-image',
      
      // Audio tasks
      'audio-classification': 'audio-classification',
      'audio-class': 'audio-classification',
      'speech-recognition': 'automatic-speech-recognition',
      'voice-recognition': 'automatic-speech-recognition'
    };

    const lowerQuery = query.toLowerCase();
    for (const [keyword, task] of Object.entries(taskMappings)) {
      if (lowerQuery.includes(keyword)) {
        return task;
      }
    }

    return null;
  }

  // Extract budget from user query
  static extractBudgetFromQuery(query: string): number | null {
    const budgetRegex = /\$(\d+(?:\.\d{2})?)/g;
    const matches = query.match(budgetRegex);
    
    if (matches) {
      // Return the highest budget mentioned
      const budgets = matches.map(match => parseFloat(match.replace('$', '')));
      return Math.max(...budgets);
    }

    return null;
  }

  // Format models for simple, clickable response
  static formatModelsForResponse(models: HFModel[]): string {
    if (models.length === 0) {
      return "No models found matching your criteria.";
    }

    const topModels = models.slice(0, 5);
    
    return topModels.map((model, index) => {
      const stars = '⭐'.repeat(Math.floor(model.rating));
      console.log('Formatting model for response:', { name: model.name, id: model.id });
      return `${index + 1}. [${model.name}](${model.id}) - $${model.pricePerToken.toFixed(2)}/1k - ${stars} ${model.rating.toFixed(1)}`;
    }).join('\n');
  }


  // Filter and format Gemini response to only show models that exist in our platform
  static filterAndFormatGeminiResponse(geminiResponse: string, userQuery: string): string {
    console.log('Filtering Gemini response:', geminiResponse);
    
    // Extract model names mentioned in Gemini response
    const mentionedModels = this.extractModelNamesFromText(geminiResponse);
    console.log('Mentioned models:', mentionedModels);
    
    // Find matching models in our platform
    const matchingModels = this.findMatchingModels(mentionedModels, userQuery);
    console.log('Matching models:', matchingModels);
    
    if (matchingModels.length === 0) {
      return "No matching models found in the platform.";
    }
    
    // Format the response with our platform models
    const modelList = matchingModels.map((model, index) => {
      const stars = '⭐'.repeat(Math.floor(model.rating));
      return `${index + 1}. [${model.name}](${model.id}) ${stars} ${model.rating.toFixed(1)} | $${model.pricePerToken.toFixed(2)}`;
    }).join('\n');
    
    // Extract the context from Gemini response (before model recommendations)
    const contextMatch = geminiResponse.match(/^([^]*?)(?:here are|recommended|suggest|best|top)/i);
    const context = contextMatch ? contextMatch[1].trim() : "Here are some models for your request:";
    
    return `${context}\n\n${modelList}`;
  }

  // Extract model names from text (look for common model name patterns)
  static extractModelNamesFromText(text: string): string[] {
    const modelNames: string[] = [];
    
    // Common patterns for model names
    const patterns = [
      // Hugging Face model names (org/model-name)
      /([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/g,
      // Model names with underscores or hyphens
      /([a-zA-Z0-9]+[-_][a-zA-Z0-9_-]+)/g,
      // CamelCase model names
      /([A-Z][a-z]+[A-Z][a-zA-Z0-9]*)/g,
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        modelNames.push(...matches);
      }
    });
    
    // Remove duplicates and filter out common false positives
    const filtered = [...new Set(modelNames)].filter(name => 
      name.length > 3 && 
      !['text', 'image', 'audio', 'model', 'models', 'classification', 'generation'].includes(name.toLowerCase())
    );
    
    return filtered;
  }

  // Find models in our platform that match the mentioned names or query criteria
  static findMatchingModels(mentionedNames: string[], userQuery: string): HFModel[] {
    const matchingModels: HFModel[] = [];
    
    // First, try exact name matches
    mentionedNames.forEach(name => {
      const exactMatch = this.models.find(model => 
        model.name.toLowerCase().includes(name.toLowerCase()) ||
        model.id.toLowerCase().includes(name.toLowerCase())
      );
      if (exactMatch && !matchingModels.find(m => m.id === exactMatch.id)) {
        matchingModels.push(exactMatch);
      }
    });
    
    // If no exact matches, try to match based on query criteria
    if (matchingModels.length === 0) {
      const task = this.extractTaskFromQuery(userQuery);
      const maxPrice = this.extractBudgetFromQuery(userQuery);
      
      const filter: ModelFilter = {};
      if (task) filter.task = task;
      if (maxPrice) filter.maxPrice = maxPrice;
      
      const filteredModels = this.filterModels(filter);
      matchingModels.push(...filteredModels.slice(0, 5)); // Top 5 matches
    }
    
    return matchingModels;
  }
}
