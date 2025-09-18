import ModelsGrid from "@/components/models/ModelsGrid";

const Models = () => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">AI Model Marketplace</h1>
        <p className="text-lg text-muted-foreground">
          Discover and integrate the perfect AI models for your projects
        </p>
      </div>
      
      <ModelsGrid />
    </div>
  );
};

export default Models;