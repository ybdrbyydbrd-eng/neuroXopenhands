import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Code, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import robotImage from "@/assets/yot-robot.png";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  error?: boolean;
}

interface RightAssistantProps {
  robotDocked: boolean;
}

// API configuration
const NEUROCHAT_API_BASE = 'http://localhost:12000';
const DEFAULT_MODEL = 'gemini-1.5-flash'; // Always use Gemini 1.5 Flash for assistant

// API utility functions
const apiFetch = async (path: string, options: RequestInit = {}) => {
  const candidates = [
    NEUROCHAT_API_BASE,
    'http://localhost:12000', // Fallback
    window.location.origin // Last resort
  ];
  
  let lastError = null;
  
  for (const base of candidates) {
    try {
      const url = base + path;
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      
      if (res.ok || res.status === 202) {
        return res;
      }
      
      lastError = new Error(`HTTP ${res.status} from ${url}`);
    } catch (e) {
      console.warn(`Failed to connect to ${base}:`, e);
      lastError = e;
    }
  }
  
  throw lastError || new Error('Unable to connect to NeuroChat backend');
};

const pollForResults = async (taskId: string): Promise<string> => {
  const maxAttempts = 30; // 2.5 minutes with 5-second intervals
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await apiFetch(`/result/${taskId}`);
      const data = await response.json();
      
      if (data.status === 'completed') {
        return data.result;
      } else if (data.status === 'failed') {
        throw new Error('Processing failed');
      }
      
      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    } catch (error) {
      console.error('Error polling for results:', error);
      throw error;
    }
  }
  
  throw new Error('Request timed out');
};

const RightAssistant = ({ robotDocked }: RightAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi there! I'm your AI assistant powered by Google's Gemini 1.5 Flash. I'm ready to help you explore AI models and answer any questions you have!",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [tokenCount] = useState(1250);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Test connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        await apiFetch('/api/v1/health');
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    };
    testConnection();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: "Thinking...",
      isUser: false,
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    const currentMessage = inputValue;
    setInputValue("");

    try {
      // Send message to NeuroChat API with Gemini 1.5 Flash model
      const response = await apiFetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          model: DEFAULT_MODEL, // Always use Gemini 1.5 Flash
          conversation_id: `assistant_${Date.now()}`,
        }),
      });

      const data = await response.json();

      if (data.task_id) {
        // Poll for results
        const result = await pollForResults(data.task_id);
        
        // Remove loading message and add real response
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== loadingMessage.id);
          return [...filtered, {
            id: (Date.now() + 2).toString(),
            text: result,
            isUser: false,
            timestamp: new Date(),
          }];
        });
      } else {
        throw new Error('No task ID received from server');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessage.id);
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          text: isConnected 
            ? "Sorry, I encountered an error processing your request. Please try again."
            : "I'm having trouble connecting to the backend service. Please make sure NeuroChat is running on port 12000.",
          isUser: false,
          timestamp: new Date(),
          error: true,
        }];
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div 
      className="fixed right-0 top-0 h-screen bg-surface border-l border-border flex flex-col"
      style={{ width: 'var(--chat-width)' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <div className={`transition-all duration-700 ${robotDocked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
            <img 
              src={robotImage} 
              alt="YOT Robot" 
              className="w-10 h-10 rounded-full border border-neuro-accent-1"
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">YOT — Model Assistant</h3>
            <p className={`text-sm ${isConnected ? 'text-neuro-success' : 'text-red-500'}`}>
              ● {isConnected ? 'Online' : 'Offline'} {isConnected && '(Gemini 1.5 Flash)'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isUser
                  ? 'bg-primary text-primary-foreground'
                  : message.error
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                {message.error && <AlertCircle className="w-4 h-4 text-red-600" />}
                {message.isLoading && (
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  </div>
                )}
                <p className="text-sm flex-1">{message.text}</p>
              </div>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card space-y-3">

        {/* Message Input */}
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              !isConnected 
                ? "Connect to NeuroChat backend first..."
                : messages.some(m => m.isLoading) 
                ? "Assistant is thinking..."
                : "Ask about models, use cases..."
            }
            disabled={!isConnected || messages.some(m => m.isLoading)}
            className="flex-1 bg-input border-border focus:border-neuro-accent-1 focus:ring-neuro-accent-1 disabled:opacity-50"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!isConnected || messages.some(m => m.isLoading) || !inputValue.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Token Counter */}
        <div className="text-xs text-muted-foreground text-center">
          Tokens remaining: <span className="text-neuro-success font-medium">{tokenCount}</span>
        </div>
      </div>
    </div>
  );
};

export default RightAssistant;