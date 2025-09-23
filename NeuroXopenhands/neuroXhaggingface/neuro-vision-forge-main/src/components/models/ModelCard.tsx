import { useState } from "react";
import { Star, Clock, Plus, Download, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HFModel } from "@/services/api";

interface ModelCardProps {
  model: HFModel;
  onAddToCollection?: (modelId: string) => void;
  onPreview?: (modelId: string) => void;
  onModelSelect?: (model: HFModel) => void;
}

const ModelCard = ({ model, onAddToCollection, onPreview, onModelSelect }: ModelCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(model.isInCollection || false);

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdded(!isAdded);
    onAddToCollection?.(model.id);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPreview?.(model.id);
  };

  const handleCardClick = () => {
    if (onModelSelect) {
      onModelSelect(model);
    }
  };

  return (
    <div 
      className="bg-card border-b border-border p-4 transition-all duration-200 cursor-pointer hover:bg-card/50"
      onClick={handleCardClick}
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

          {/* Add Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddClick}
            className={`h-8 w-8 p-0 rounded-full transition-all duration-200 ${
              isAdded 
                ? 'bg-neuro-success text-background hover:bg-neuro-success/80' 
                : 'hover:bg-neuro-accent-1 hover:text-background'
            }`}
          >
            <Plus className={`w-4 h-4 transition-transform duration-200 ${isAdded ? 'rotate-45' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModelCard;