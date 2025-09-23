import { useState } from "react";
import { Star, Clock, DollarSign, Plus, Download, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HFModel, apiService } from "@/services/api";
import modelSample from "@/assets/model-sample.png";

interface ModelDetailsInlineProps {
  model: HFModel;
  onCollectionChange?: () => void;
}

const ModelDetailsInline = ({ model, onCollectionChange }: ModelDetailsInlineProps) => {
  const [isAdded, setIsAdded] = useState(model.isInCollection || false);
  const [isLoading, setIsLoading] = useState(false);

  // Safety checks for model data
  if (!model) {
    return <div>No model data available</div>;
  }

  // Ensure model has all required properties with defaults
  const safeModel = {
    id: model.id || 'unknown',
    name: model.name || 'Unknown Model',
    provider: model.provider || 'Unknown Provider',
    description: model.description || '',
    rating: model.rating || 0,
    reviewCount: model.reviewCount || 0,
    latency: model.latency || 'N/A',
    pricePerToken: model.pricePerToken || 0,
    tags: model.tags || [],
    downloads: model.downloads || 0,
    likes: model.likes || 0,
    updatedAt: model.updatedAt || new Date().toISOString(),
    pipeline_tag: model.pipeline_tag || 'unknown',
    library_name: model.library_name || 'unknown',
    isInCollection: model.isInCollection || false,
  };

  // Mock additional data for the model (would be fetched from API in real app)
  const modelData = {
    ...safeModel,
    fullDescription: safeModel.description + " This is an advanced AI model with enhanced capabilities for various tasks including text generation, analysis, and problem-solving.",
    image: modelSample,
    useCases: [
      "Content creation and copywriting",
      "Code generation and debugging", 
      "Research and analysis",
      "Complex problem solving",
      "Educational assistance"
    ],
    technicalSpecs: {
      maxTokens: "128,000",
      languages: "100+",
      training: "Up to April 2024",
      accuracy: "95.2%"
    },
    samplePrompts: [
      "Write a comprehensive business plan for a sustainable tech startup",
      "Debug this Python code and explain the issues",
      "Analyze the pros and cons of renewable energy adoption"
    ]
  };

  const handleAddToCollection = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (isAdded) {
        // Remove from collection
        await apiService.removeFromCollection(safeModel.id);
        setIsAdded(false);
      } else {
        // Add to collection
        await apiService.addToCollection(safeModel);
        setIsAdded(true);
      }
      
      // Notify parent component about collection change
      onCollectionChange?.();
    } catch (error) {
      console.error('Failed to update collection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-card border border-border rounded-xl p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Model Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src={modelData.image} 
                alt={safeModel.name}
                className="w-16 h-16 rounded-lg"
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground">{safeModel.name}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="border-neuro-accent-1 text-neuro-accent-1">
                    {safeModel.provider}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{safeModel.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({safeModel.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
            
            {safeModel.description && <p className="text-lg text-muted-foreground">{safeModel.description}</p>}
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {safeModel.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="bg-neuro-accent-1/10 text-neuro-accent-1 border-neuro-accent-1/20"
                >
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground">Pipeline</div>
                <div className="text-sm">{safeModel.pipeline_tag.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-muted-foreground">Updated</div>
                <div className="text-sm">{new Date(safeModel.updatedAt).toLocaleDateString()}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                  <Download className="w-3 h-3" />
                  <span>Downloads</span>
                </div>
                <div className="text-sm">{safeModel.downloads.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                  <Heart className="w-3 h-3" />
                  <span>Likes</span>
                </div>
                <div className="text-sm">{safeModel.likes.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="lg:w-80 space-y-4">
            <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-neuro-success">${safeModel.pricePerToken.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">per 1k tokens</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">{safeModel.latency}</div>
                  <div className="text-muted-foreground">Latency</div>
                </div>
                <div className="text-center">
                  <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">Budget</div>
                  <div className="text-muted-foreground">Friendly</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleAddToCollection}
                  disabled={isLoading}
                  variant={isAdded ? "default" : "outline"}
                  className={`w-full ${isAdded ? 'bg-neuro-success hover:bg-neuro-success/90' : 'border-neuro-accent-1 text-neuro-accent-1 hover:bg-neuro-accent-1 hover:text-background'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus className={`w-4 h-4 mr-2 ${isAdded ? 'rotate-45' : ''} transition-transform duration-200`} />
                  {isLoading ? 'Updating...' : (isAdded ? 'Added to Collection' : 'Add to My Collection')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-surface">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="use-cases">Use Cases</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">About {safeModel.name}</h3>
            <p className="text-muted-foreground mb-6">{modelData.fullDescription}</p>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Sample Prompts</h4>
              <div className="space-y-2">
                {modelData.samplePrompts.map((prompt, index) => (
                  <div key={index} className="bg-surface border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground italic">"{prompt}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="use-cases">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Ideal Use Cases</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modelData.useCases.map((useCase, index) => (
                <div key={index} className="bg-surface border border-border rounded-lg p-4">
                  <p className="font-medium">{useCase}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="technical">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Technical Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="font-medium">Max Context Length</div>
                  <div className="text-muted-foreground">{modelData.technicalSpecs.maxTokens} tokens</div>
                </div>
                <div>
                  <div className="font-medium">Supported Languages</div>
                  <div className="text-muted-foreground">{modelData.technicalSpecs.languages} languages</div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="font-medium">Training Data</div>
                  <div className="text-muted-foreground">{modelData.technicalSpecs.training}</div>
                </div>
                <div>
                  <div className="font-medium">Accuracy Rate</div>
                  <div className="text-muted-foreground">{modelData.technicalSpecs.accuracy}</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">User Reviews</h3>
            <p className="text-muted-foreground">User reviews and detailed feedback will be displayed here.</p>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Pricing Details</h3>
            <p className="text-muted-foreground">Detailed pricing breakdown and cost estimations will be shown here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModelDetailsInline;
