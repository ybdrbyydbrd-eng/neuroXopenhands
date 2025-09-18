import { useState, useEffect } from "react";
import { Search, Filter, ChevronRight, ChevronLeft, AlertTriangle, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ModelCard from "./ModelCard";
import { apiService, HFModel, ModelsResponse } from "@/services/api";

interface ModelsGridProps {
  onModelsChange?: (models: HFModel[]) => void;
  onCollectionChange?: (collection: HFModel[]) => void;
}

const ModelsGrid = ({ onModelsChange, onCollectionChange }: ModelsGridProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [models, setModels] = useState<HFModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    hasNext: false,
    hasPrev: false
  });
  const [collection, setCollection] = useState<HFModel[]>([]);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Load models from API
  const loadModels = async (page: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: ModelsResponse = await apiService.getModels(page, 20);
      setModels(response.models);
      setPagination(response.pagination);
      setFallbackMode(response.fallback || false);
      
      if (response.fallback) {
        setError(`Using fallback data: ${response.error}`);
      }
      
      onModelsChange?.(response.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  // Load user collection
  const loadCollection = async () => {
    try {
      const response = await apiService.getCollection();
      setCollection(response.collection);
      onCollectionChange?.(response.collection);
    } catch (err) {
      console.error('Failed to load collection:', err);
    }
  };

  // Initial load
  useEffect(() => {
    loadModels(1);
    loadCollection();
  }, []);

  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddToCollection = async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    try {
      const isInCollection = collection.some(m => m.id === modelId);
      
      if (isInCollection) {
        const response = await apiService.removeFromCollection(modelId);
        setCollection(response.collection);
        onCollectionChange?.(response.collection);
      } else {
        const response = await apiService.addToCollection(model);
        setCollection(response.collection);
        onCollectionChange?.(response.collection);
      }
    } catch (error) {
      console.error('Failed to update collection:', error);
    }
  };

  const handlePreview = (modelId: string) => {
    console.log("Preview model:", modelId);
  };

  const handleNextPage = async () => {
    if (pagination.hasNext) {
      const nextPage = pagination.page + 1;
      setCurrentPage(nextPage);
      await loadModels(nextPage);
    }
  };

  const handlePrevPage = async () => {
    if (pagination.hasPrev) {
      const prevPage = pagination.page - 1;
      setCurrentPage(prevPage);
      await loadModels(prevPage);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <Loader className="w-8 h-8 animate-spin text-neuro-accent-1" />
          <span className="ml-2 text-muted-foreground">Loading models...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert className={`border-l-4 ${fallbackMode ? 'border-yellow-500 bg-yellow-50' : 'border-red-500 bg-red-50'}`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {fallbackMode ? 'Using fallback data: ' : 'Error: '}{error}
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Search and Filter */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search models"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border focus:border-neuro-accent-1 focus:ring-neuro-accent-1"
            />
          </div>
        </div>
        
        <Button variant="outline" className="ml-4 border-neuro-accent-1 text-neuro-accent-1 hover:bg-neuro-accent-1 hover:text-background">
          <Filter className="w-4 h-4 mr-2" />
          Filter — Budget
        </Button>
      </div>

      {/* Models List */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {filteredModels.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? 'No models match your search' : 'No models available'}
          </div>
        ) : (
          filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={{
                ...model,
                isInCollection: collection.some(m => m.id === model.id)
              }}
              onAddToCollection={handleAddToCollection}
              onPreview={handlePreview}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {models.length > 0 && (
        <div className="flex justify-center items-center gap-4 pt-8">
          <Button 
            onClick={handlePrevPage}
            disabled={!pagination.hasPrev}
            variant="outline"
            className="border-neuro-accent-1 text-neuro-accent-1 hover:bg-neuro-accent-1 hover:text-background disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {pagination.page}
          </span>
          
          <Button 
            onClick={handleNextPage}
            disabled={!pagination.hasNext}
            className="bg-gradient-to-r from-neuro-accent-1 to-neuro-accent-2 text-background hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-center text-sm text-muted-foreground">
        Showing {filteredModels.length} of {models.length} models
        {fallbackMode && <span className="text-yellow-600"> (fallback mode)</span>}
      </div>
    </div>
  );
};

export default ModelsGrid;