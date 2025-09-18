import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import SidebarMain from "../sidebar/SidebarMain";
import RightAssistant from "../chat/RightAssistant";
import TypewriterIntro from "../intro/TypewriterIntro";

const AppLayout = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [robotDocked, setRobotDocked] = useState(false);

  const handleIntroComplete = () => {
    setShowIntro(false);
    setRobotDocked(true);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {showIntro && <TypewriterIntro onComplete={handleIntroComplete} />}
      
      <div className="flex w-full min-h-screen">
        {/* Left Sidebar */}
        <SidebarMain />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto" style={{ marginLeft: 'var(--sidebar-width)', marginRight: 'var(--chat-width)' }}>
          <div className="grid-container py-lg">
            <Outlet />
          </div>
        </main>
        
        {/* Right Chat Assistant */}
        <RightAssistant robotDocked={robotDocked} />
      </div>
    </div>
  );
};

export default AppLayout;