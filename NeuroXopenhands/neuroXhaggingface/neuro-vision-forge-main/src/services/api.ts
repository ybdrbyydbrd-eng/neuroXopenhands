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
  fullModelListUrl?: string;
  message?: string;
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
    // Use the new summary endpoint that provides links to full model list
    return await this.fetchApi<ModelsResponse>(`/api/hf/models-summary?page=${page}&limit=${limit}`);
  }

  async getFullModelListUrl(): Promise<string> {
    // Get the URL for the complete model list HTML page
    const response = await this.fetchApi<{fullModelListUrl: string}>('/api/hf/models-summary?page=1&limit=1');
    return response.fullModelListUrl || `${API_BASE_URL}/api/models-list`;
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

  // No fallback models kept; enforce real data only
}

export const apiService = new ApiService();