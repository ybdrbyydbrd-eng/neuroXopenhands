const API_BASE_URL = 'http://localhost:5174';

export interface HFModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  rating: number;
  reviewCount: number;
  latency: string;
  pricePerToken: number;
  tags: string[];
  downloads: number;
  likes: number;
  updatedAt: string;
  pipeline_tag: string;
  library_name: string;
  isInCollection?: boolean;
}

export interface ModelsResponse {
  models: HFModel[];
  pagination: {
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  fallback?: boolean;
  error?: string;
}

export interface CollectionResponse {
  collection: HFModel[];
  count: number;
}

class ApiService {
  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getModels(page: number = 1, limit: number = 20): Promise<ModelsResponse> {
    try {
      return await this.fetchApi<ModelsResponse>(`/api/hf/models?page=${page}&limit=${limit}`);
    } catch (error) {
      // Return fallback data if API fails
      console.warn('Using fallback data due to API error:', error);
      return {
        models: this.getFallbackModels(),
        pagination: {
          page: 1,
          limit: 20,
          hasNext: false,
          hasPrev: false
        },
        fallback: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getCollection(userId: string = 'default'): Promise<CollectionResponse> {
    return await this.fetchApi<CollectionResponse>(`/api/collection/${userId}`);
  }

  async addToCollection(model: HFModel, userId: string = 'default'): Promise<CollectionResponse> {
    return await this.fetchApi<CollectionResponse>(`/api/collection/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    });
  }

  async removeFromCollection(modelId: string, userId: string = 'default'): Promise<CollectionResponse> {
    return await this.fetchApi<CollectionResponse>(`/api/collection/${userId}/${modelId}`, {
      method: 'DELETE',
    });
  }

  async checkHealth(): Promise<{ status: string; timestamp: string; cache_size: number }> {
    return await this.fetchApi<{ status: string; timestamp: string; cache_size: number }>('/health');
  }

  private getFallbackModels(): HFModel[] {
    return [
      {
        id: "microsoft/DialoGPT-large",
        name: "DialoGPT-large",
        provider: "microsoft",
        description: "A large-scale pre-trained dialogue response generation model",
        rating: 4.5,
        reviewCount: 1250,
        latency: "200ms",
        pricePerToken: 0.01,
        tags: ["conversational", "text-generation"],
        downloads: 15420,
        likes: 234,
        updatedAt: new Date().toISOString(),
        pipeline_tag: "text-generation",
        library_name: "transformers"
      },
      {
        id: "facebook/blenderbot-400M-distill",
        name: "blenderbot-400M-distill",
        provider: "facebook",
        description: "A 400M parameter conversational AI model",
        rating: 4.3,
        reviewCount: 892,
        latency: "150ms",
        pricePerToken: 0.008,
        tags: ["conversational", "chatbot"],
        downloads: 12100,
        likes: 187,
        updatedAt: new Date().toISOString(),
        pipeline_tag: "text-generation",
        library_name: "transformers"
      },
      {
        id: "gpt2-medium",
        name: "gpt2-medium",
        provider: "openai",
        description: "355M parameter GPT-2 model for text generation",
        rating: 4.7,
        reviewCount: 2340,
        latency: "120ms",
        pricePerToken: 0.005,
        tags: ["gpt2", "text-generation"],
        downloads: 25600,
        likes: 456,
        updatedAt: new Date().toISOString(),
        pipeline_tag: "text-generation",
        library_name: "transformers"
      }
    ];
  }
}

export const apiService = new ApiService();