import { useState, useEffect } from "react";
import { Trash2, ExternalLink, Star, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiService, HFModel } from "@/services/api";
import modelSample from "@/assets/model-sample.png";

const MyCollection = () => {
  const [collectionModels, setCollectionModels] = useState<HFModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const response = await apiService.removeFromCollection(modelId);
      setCollectionModels(response.collection);
    } catch (error) {
      console.error('Failed to remove from collection:', error);
    }
  };

  const openDetails = (modelId: string) => {
    // Navigate to model details
    console.log("Open details for model:", modelId);
  };

  // Load collection on mount
  useEffect(() => {
    loadCollection();
  }, []);

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
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Star className="w-12 h-12 text-muted-foreground" />
        </div>
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

      {/* Collection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collectionModels.map((model) => (
          <div 
            key={model.id}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-neuro hover:border-neuro-accent-1/50 transition-all duration-300"
          >
            {/* Model Image */}
            <div className="relative mb-4">
              <img 
                src={modelSample} 
                alt={model.name}
                className="w-full h-32 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2 bg-background/80 rounded-full px-2 py-1 text-xs font-medium">
                {model.provider}
              </div>
            </div>

            {/* Model Info */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg text-foreground">{model.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{model.description}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{model.rating}</span>
                </div>
                <span className="font-semibold text-neuro-success">
                  ${model.pricePerToken?.toFixed(3) || '0.000'}/1k
                </span>
              </div>

              {/* Added Date */}
              <div className="text-xs text-muted-foreground">
                Added {new Date(model.updatedAt).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDetails(model.id)}
                  className="flex-1 border-neuro-accent-1 text-neuro-accent-1 hover:bg-neuro-accent-1 hover:text-background"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeFromCollection(model.id)}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collection Stats */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Collection Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-neuro-accent-1">{collectionModels.length}</div>
            <div className="text-sm text-muted-foreground">Total Models</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neuro-accent-2">
              {(collectionModels.reduce((sum, model) => sum + model.rating, 0) / collectionModels.length).toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neuro-success">
              {Math.min(...collectionModels.map(m => m.pricePerToken))}T
            </div>
            <div className="text-sm text-muted-foreground">Lowest Cost</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCollection;