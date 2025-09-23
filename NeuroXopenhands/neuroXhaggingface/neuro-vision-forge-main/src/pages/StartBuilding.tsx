import { useState } from "react";
import { MessageSquare, Bot, Code, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import modelSample from "@/assets/model-sample.png";

const StartBuilding = () => {
  const [selectedModels] = useState([
    {
      id: "1",
      name: "GPT-4 Turbo",
      provider: "OpenAI",
      image: modelSample,
    },
    {
      id: "3", 
      name: "Llama 2 70B",
      provider: "Meta",
      image: modelSample,
    },
  ]);

  const buildingOptions = [
    {
      icon: MessageSquare,
      title: "Chat Interface",
      description: "Create a conversational interface for your AI models",
      features: ["Real-time messaging", "File uploads", "Context memory"],
      color: "neuro-accent-1",
    },
    {
      icon: Bot,
      title: "Agent Builder",
      description: "Build autonomous AI agents with custom workflows",
      features: ["Task automation", "Tool integration", "Multi-step reasoning"],
      color: "neuro-accent-2",
    },
    {
      icon: Code,
      title: "API Integration", 
      description: "Integrate models directly into your applications",
      features: ["REST endpoints", "SDK libraries", "Webhook support"],
      color: "neuro-success",
    },
  ];

  const handleBuildOption = (option: string) => {
    console.log("Starting to build:", option);
    
    // Get selected models from localStorage or state
    const selectedModelIds = selectedModels.map(m => m.id).join(',');
    
    // Navigate to NeuroChat application
    const neurochatUrl = 'http://localhost:3000'; // NeuroChat frontend URL
    
    // Add context and preload models based on the selected option
    let targetUrl = neurochatUrl;
    
    if (option === 'Chat Interface') {
      targetUrl = `${neurochatUrl}?mode=chat&preloadModels=${selectedModelIds}`;
    } else if (option === 'Agent Builder') {
      targetUrl = `${neurochatUrl}?mode=agent&preloadModels=${selectedModelIds}`;
    } else if (option === 'API Integration') {
      targetUrl = `${neurochatUrl}?mode=api&preloadModels=${selectedModelIds}`;
    }
    
    // Open NeuroChat in a new tab for better user experience
    window.open(targetUrl, '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Start Building</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Transform your selected AI models into powerful applications. Choose how you want to integrate and deploy your models.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-neuro-accent-1/10 border border-neuro-accent-1/20 rounded-lg">
          <Code className="w-4 h-4 text-neuro-accent-1" />
          <span className="text-sm text-neuro-accent-1 font-medium">
            Powered by NeuroChat Integration
          </span>
        </div>
      </div>

      {/* Selected Models */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-neuro-accent-1" />
          Selected Models ({selectedModels.length})
        </h3>
        
        <div className="flex flex-wrap gap-4">
          {selectedModels.map((model) => (
            <div 
              key={model.id}
              className="flex items-center space-x-3 bg-surface border border-border rounded-lg p-3 hover:border-neuro-accent-1/50 transition-colors"
            >
              <img 
                src={model.image} 
                alt={model.name}
                className="w-10 h-10 rounded-lg"
              />
              <div>
                <div className="font-medium text-sm">{model.name}</div>
                <Badge variant="outline" className="text-xs border-neuro-accent-1 text-neuro-accent-1">
                  {model.provider}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        
        {selectedModels.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No models selected yet</p>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="border-neuro-accent-1 text-neuro-accent-1 hover:bg-neuro-accent-1 hover:text-background"
            >
              Browse Models
            </Button>
          </div>
        )}
      </div>

      {/* Building Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {buildingOptions.map((option, index) => (
          <div 
            key={index}
            className="bg-card border border-border rounded-xl p-6 hover:shadow-neuro hover:border-neuro-accent-1/50 transition-all duration-300 cursor-pointer group"
            onClick={() => handleBuildOption(option.title)}
          >
            <div className="space-y-4">
              <div className={`w-12 h-12 rounded-lg bg-${option.color}/10 flex items-center justify-center group-hover:bg-${option.color}/20 transition-colors`}>
                <option.icon className={`w-6 h-6 text-${option.color}`} />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{option.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Features:</div>
                <ul className="space-y-1">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-center">
                      <div className={`w-1.5 h-1.5 rounded-full bg-${option.color} mr-2`}></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button 
                className={`w-full bg-${option.color} hover:bg-${option.color}/90 text-background group-hover:shadow-glow transition-all duration-300`}
                disabled={selectedModels.length === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuildOption(option.title);
                }}
              >
                Start Building
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Start Guide */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Start Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-neuro-accent-1 text-background rounded-full flex items-center justify-center mx-auto font-bold">1</div>
            <h4 className="font-medium">Select Models</h4>
            <p className="text-sm text-muted-foreground">Choose AI models from your collection or marketplace</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-neuro-accent-2 text-background rounded-full flex items-center justify-center mx-auto font-bold">2</div>
            <h4 className="font-medium">Choose Interface</h4>
            <p className="text-sm text-muted-foreground">Pick the type of application you want to build</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-neuro-success text-background rounded-full flex items-center justify-center mx-auto font-bold">3</div>
            <h4 className="font-medium">Deploy & Test</h4>
            <p className="text-sm text-muted-foreground">Launch your application and start testing</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartBuilding;