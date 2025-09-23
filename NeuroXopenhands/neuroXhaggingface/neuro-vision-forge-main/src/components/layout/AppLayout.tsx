import { useState, useEffect, createContext, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SidebarMain from "../sidebar/SidebarMain";
import RightAssistant from "../chat/RightAssistant";
import TypewriterIntro from "../intro/TypewriterIntro";
import ModelDetailsInline from "../models/ModelDetailsInline";
import { HFModel } from "@/services/api";

// Create ModelSelectionContext
export const ModelSelectionContext = createContext({
  selectedModel: null as HFModel | null,
  selectModel: (model: HFModel) => {},
  clearModel: () => {},
});

const AppLayout = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [robotDocked, setRobotDocked] = useState(false);
  const [selectedModel, setSelectedModel] = useState<HFModel | null>(null);
  const location = useLocation();

  const handleIntroComplete = () => {
    setShowIntro(false);
    setRobotDocked(true);
  };

  // Define model selection handlers
  const selectModel = (model: HFModel) => {
    setSelectedModel(model);
  };

  const clearModel = () => {
    setSelectedModel(null);
  };

  // Clear selected model when navigating away from models page
  useEffect(() => {
    if (location.pathname !== '/') {
      setSelectedModel(null);
    }
  }, [location.pathname]);

  return (
    <ModelSelectionContext.Provider value={{ selectedModel, selectModel, clearModel }}>
      <div className="min-h-screen w-full bg-background text-foreground">
        {showIntro && <TypewriterIntro onComplete={handleIntroComplete} />}
        
        <div className="flex w-full min-h-screen">
          {/* Left Sidebar */}
          <SidebarMain />
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto" style={{ marginLeft: 'var(--sidebar-width)', marginRight: 'var(--chat-width)' }}>
            <div className="grid-container py-lg">
              {selectedModel ? (
                <div className="space-y-6">
                  {/* Back Button */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      onClick={clearModel}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to {location.pathname === '/' ? 'Home' : 'Model Marketplace'}
                    </Button>
                  </div>

                  {/* Model Details */}
                  <ModelDetailsInline 
                    model={selectedModel} 
                    onCollectionChange={() => {
                      // Dispatch a custom event to notify other components
                      window.dispatchEvent(new CustomEvent('collectionUpdated'));
                    }}
                  />
                </div>
              ) : (
                <Outlet />
              )}
            </div>
          </main>
          
          {/* Right Chat Assistant */}
          <RightAssistant robotDocked={robotDocked} />
        </div>
      </div>
    </ModelSelectionContext.Provider>
  );
};

export default AppLayout;