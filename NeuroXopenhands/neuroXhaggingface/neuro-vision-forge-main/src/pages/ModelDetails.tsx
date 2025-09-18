import { useState } from "react";
import { useParams } from "react-router-dom";
import { Star, Clock, DollarSign, Plus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import modelSample from "@/assets/model-sample.png";

const ModelDetails = () => {
  const { id } = useParams();
  const [isAdded, setIsAdded] = useState(false);

  // Mock model data (would fetch based on id in real app)
  const model = {
    id: id || "1",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "Advanced language model with enhanced reasoning capabilities for complex tasks and long-form content generation.",
    fullDescription: "GPT-4 Turbo is OpenAI's most advanced language model, featuring improved reasoning, enhanced creativity, and the ability to process longer contexts. It excels at complex problem-solving, code generation, and nuanced conversations.",
    image: modelSample,
    rating: 4.8,
    reviewCount: 2543,
    latency: "150ms",
    pricePerToken: 0.03,
    tags: ["LLM", "GPT-4", "Reasoning", "Large Context"],
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

  const handleAddToCollection = () => {
    setIsAdded(!isAdded);
  };

  const handleStartBuilding = () => {
    // Navigate to NeuroChat with this model preloaded
    const neurochatUrl = 'http://localhost:3000';
    const targetUrl = `${neurochatUrl}?mode=agent&preloadModels=${model.id}`;
    window.open(targetUrl, '_blank');
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
                src={model.image} 
                alt={model.name}
                className="w-16 h-16 rounded-lg"
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground">{model.name}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="border-neuro-accent-1 text-neuro-accent-1">
                    {model.provider}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{model.rating}</span>
                    <span className="text-xs text-muted-foreground">({model.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground">{model.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {model.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="bg-neuro-accent-1/10 text-neuro-accent-1 border-neuro-accent-1/20"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="lg:w-80 space-y-4">
            <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-neuro-success">{model.pricePerToken}T</div>
                <div className="text-sm text-muted-foreground">per 1k tokens</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">{model.latency}</div>
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
                  variant={isAdded ? "default" : "outline"}
                  className={`w-full ${isAdded ? 'bg-neuro-success hover:bg-neuro-success/90' : 'border-neuro-accent-1 text-neuro-accent-1 hover:bg-neuro-accent-1 hover:text-background'}`}
                >
                  <Plus className={`w-4 h-4 mr-2 ${isAdded ? 'rotate-45' : ''} transition-transform duration-200`} />
                  {isAdded ? 'Added to Collection' : 'Add to My Collection'}
                </Button>
                
                <Button 
                  onClick={handleStartBuilding}
                  className="w-full bg-gradient-to-r from-neuro-accent-1 to-neuro-accent-2 text-background hover:shadow-glow"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start with this model
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
            <h3 className="text-xl font-semibold mb-4">About {model.name}</h3>
            <p className="text-muted-foreground mb-6">{model.fullDescription}</p>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Sample Prompts</h4>
              <div className="space-y-2">
                {model.samplePrompts.map((prompt, index) => (
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
              {model.useCases.map((useCase, index) => (
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
                  <div className="text-muted-foreground">{model.technicalSpecs.maxTokens} tokens</div>
                </div>
                <div>
                  <div className="font-medium">Supported Languages</div>
                  <div className="text-muted-foreground">{model.technicalSpecs.languages} languages</div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="font-medium">Training Data</div>
                  <div className="text-muted-foreground">{model.technicalSpecs.training}</div>
                </div>
                <div>
                  <div className="font-medium">Accuracy Rate</div>
                  <div className="text-muted-foreground">{model.technicalSpecs.accuracy}</div>
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

export default ModelDetails;