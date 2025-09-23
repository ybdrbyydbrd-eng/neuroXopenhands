import { useContext } from "react";
import ModelsGrid from "@/components/models/ModelsGrid";
import { HFModel } from "@/services/api";
import { ModelSelectionContext } from "@/components/layout/AppLayout";

const Models = () => {
  const { selectModel } = useContext(ModelSelectionContext);

  const handleModelSelect = (model: HFModel) => {
    console.log('Model selected:', model);
    selectModel(model);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">AI Model Marketplace</h1>
        <p className="text-lg text-muted-foreground">
          Discover and integrate the perfect AI models for your projects
        </p>
      </div>
      
      <ModelsGrid onModelSelect={handleModelSelect} />
    </div>
  );
};

export default Models;