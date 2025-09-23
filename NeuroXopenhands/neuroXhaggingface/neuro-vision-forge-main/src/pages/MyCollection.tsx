import { useState, useEffect } from "react";
import { Trash2, Loader, Star, Clock, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiService, HFModel } from "@/services/api";
import ModelDetailsInline from "@/components/models/ModelDetailsInline";

const MyCollection = () => {
  const [collectionModels, setCollectionModels] = useState<HFModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<HFModel | null>(null);

  // Load collection from API
  const loadCollection = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCollection();
      setCollectionModels(response.collection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  // Remove from collection
  const removeFromCollection = async (modelId: string) => {
    // Update UI immediately - don't revert on API failure
    setCollectionModels(prev => prev.filter(model => model.id !== modelId));
    
    // Try to sync with API, but don't revert UI on failure
    try {
      await apiService.removeFromCollection(modelId);
      console.log('Model successfully removed from collection');
    } catch (error) {
      console.error('Failed to sync with API, but model removed from UI:', error);
      // Don't revert - keep the UI change even if API fails
    }
  };

  const handleModelSelect = (model: HFModel) => {
    setSelectedModel(model);
  };

  const handleBackToList = () => {
    setSelectedModel(null);
  };

  // Load collection on mount
  useEffect(() => {
    loadCollection();
  }, []);

  // Listen for collection updates from other pages
  useEffect(() => {
    const handleCollectionUpdate = () => {
      loadCollection();
    };

    window.addEventListener('collectionUpdated', handleCollectionUpdate);
    return () => {
      window.removeEventListener('collectionUpdated', handleCollectionUpdate);
    };
  }, []);

  if (selectedModel) {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={handleBackToList}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Collection
          </Button>
        </div>

        {/* Model Details */}
        <ModelDetailsInline 
          model={selectedModel} 
          onCollectionChange={() => {
            // Refresh the collection list
            loadCollection();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader className="w-8 h-8 animate-spin text-neuro-accent-1" />
        <span className="ml-2 text-muted-foreground">Loading collection...</span>
      </div>
    );
  }

  if (collectionModels.length === 0) {
    return (
      <div className="text-center space-y-6 py-16">
        <div className="text-muted-foreground">No models yet</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Your Collection is Empty</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start building your personalized AI model collection by browsing our marketplace and adding models that fit your needs.
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => window.location.href = '/'}
        >
          Browse Models
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">My Collection</h1>
        <p className="text-lg text-muted-foreground">
          Your saved AI models ({collectionModels.length} models)
        </p>
      </div>

      {/* Collection List - matching Models style */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {collectionModels.map((model) => (
          <div 
            key={model.id} 
            className="bg-card border-b border-border p-4 transition-all duration-200 hover:bg-card/50 cursor-pointer"
            onClick={() => handleModelSelect(model)}
          >
            <div className="flex items-start justify-between">
              {/* Left side - Main content */}
              <div className="flex-1 space-y-2">
                {/* Provider and Name */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-neuro-accent-1">{model.provider}</span>
                  <span className="text-sm text-muted-foreground">/</span>
                  <h3 className="text-lg font-semibold text-foreground hover:text-neuro-accent-1 transition-colors">
                    {model.name}
                  </h3>
                </div>

                {/* Description */}
                {model.description && <p className="text-sm text-muted-foreground">{model.description}</p>}
              </div>

              {/* Right side - Stats and actions */}
              <div className="flex items-center space-x-4 ml-6">
                {/* Rating */}
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{model.rating.toFixed(1)}</span>
                </div>

                {/* Latency */}
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{model.latency}</span>
                </div>

                {/* Price */}
                <div className="text-sm font-semibold text-neuro-success">
                  ${model.pricePerToken.toFixed(2)}/1k
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCollection(model.id);
                  }}
                  className="h-8 w-8 p-0 rounded-full transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyCollection;