import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import robotImage from "@/assets/yot-robot.png";

interface TypewriterIntroProps {
  onComplete: () => void;
}

const TypewriterIntro = ({ onComplete }: TypewriterIntroProps) => {
  const [showRobot, setShowRobot] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [showButton, setShowButton] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const messages = [
    "Hello! I'm YOT, your smart guide.",
    "I'll help you find models that fit your budget and needs."
  ];

  useEffect(() => {
    // Show robot entering animation
    const timer = setTimeout(() => {
      setShowRobot(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showRobot) return;

    const message = messages[currentMessage];
    let index = 0;

    const typeInterval = setInterval(() => {
      if (index < message.length) {
        setDisplayText(message.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
        setShowButton(true);
      }
    }, 40);

    return () => clearInterval(typeInterval);
  }, [showRobot, currentMessage]);

  const handleOkClick = () => {
    if (currentMessage < messages.length - 1) {
      setCurrentMessage(currentMessage + 1);
      setDisplayText("");
      setShowButton(false);
    } else {
      setIsComplete(true);
      setTimeout(() => {
        onComplete();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="relative">
        {/* Robot */}
        <div className={`mb-8 flex justify-center ${showRobot ? 'robot-enter' : 'opacity-0'} ${isComplete ? 'robot-walk' : ''}`}>
          <img 
            src={robotImage} 
            alt="YOT Robot" 
            className="w-32 h-32 drop-shadow-lg"
          />
        </div>

        {/* Speech Bubble */}
        {showRobot && (
          <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-auto relative animate-fadeIn">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-card border-l border-t border-border rotate-45"></div>
            
            <div className="space-y-4">
              <div className="text-lg">
                <span className={displayText.length === messages[currentMessage]?.length ? 'typewriter-cursor' : ''}>
                  {displayText}
                </span>
              </div>
              
              {showButton && (
                <div className="flex justify-center animate-fadeIn">
                  <Button 
                    onClick={handleOkClick}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {currentMessage < messages.length - 1 ? 'OK' : 'Let\'s Start!'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypewriterIntro;