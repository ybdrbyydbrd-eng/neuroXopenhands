import { useState, useRef, useEffect, useContext } from "react";
import { Send, Paperclip, Code, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import robotImage from "@/assets/yot-robot.png";
import { ModelFilterService, ModelFilter } from "@/services/modelFilter";
import { HFModel } from "@/services/api";
import { ModelSelectionContext } from "@/components/layout/AppLayout";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  error?: boolean;
}

interface ConversationMemory {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface RightAssistantProps {
  robotDocked: boolean;
}

// Gemini configuration
const GEMINI_API_KEY = 'AIzaSyBLlklwflcFk0eNQkWDJCCAndgGi7TlDjg';
const DEFAULT_MODEL = 'gemini-1.5-flash';

const RightAssistant = ({ robotDocked }: RightAssistantProps) => {
  const { selectModel } = useContext(ModelSelectionContext);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I can help you find the best Hugging Face models. Just tell me the task (text, image, audio) and your budget. For example: 'best text-classification models under $5'",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [tokenCount] = useState(1250);
  const [isConnected, setIsConnected] = useState(true);
  const [conversationMemory, setConversationMemory] = useState<ConversationMemory>({
    messages: []
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Mark assistant as online (direct Gemini access)
  useEffect(() => {
    setIsConnected(true);
  }, []);

  // Memory management functions
  const addToMemory = (role: 'user' | 'assistant', content: string) => {
    setConversationMemory(prev => ({
      messages: [...prev.messages, { role, content }]
    }));
  };

  const getRecentMemory = (maxMessages: number = 10) => {
    return conversationMemory.messages.slice(-maxMessages);
  };

  const clearMemory = () => {
    setConversationMemory({ messages: [] });
  };

  // Handle model click to open model details
  const handleModelClick = async (modelId: string) => {
    try {
      console.log('=== MODEL CLICK DEBUG START ===');
      console.log('Clicked model ID:', modelId);
      
      // Ensure models are loaded
      console.log('Loading models...');
      await ModelFilterService.loadModels();
      
      // Find the model in the loaded models
      console.log('Searching for model...');
      const model = ModelFilterService.getModelById(modelId);
      
      if (model) {
        console.log('Model found:', model);
        console.log('Using context selectModel...');
        
        // Use context instead of custom event
        selectModel(model);
        console.log('Model selected via context');
      } else {
        console.error('Model not found:', modelId);
        console.log('Available models:', ModelFilterService.getModels ? ModelFilterService.getModels() : 'getModels method not available');
      }
      console.log('=== MODEL CLICK DEBUG END ===');
    } catch (error) {
      console.error('Error in handleModelClick:', error);
    }
  };

  // Render message with clickable model names
  const renderMessage = (text: string) => {
    console.log('Rendering message:', text);
    // Check if the message contains model links in the format [ModelName](modelId)
    const modelLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = modelLinkRegex.exec(text)) !== null) {
      console.log('Found model link:', match[1], 'ID:', match[2]);
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      // Add clickable model link
      parts.push(
        <span
          key={match.index}
          className="text-blue-500 cursor-pointer hover:text-blue-700 underline"
          onClick={() => {
            console.log('Model clicked:', match[1], 'ID:', match[2]);
            handleModelClick(match[2]);
          }}
        >
          {match[1]}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    console.log('Rendered parts:', parts);
    return parts.length > 0 ? parts : text;
  };

  // Get Gemini response and filter it against available models
  const getGeminiResponseWithModelFiltering = async (userQuery: string): Promise<string> => {
    try {
      // Get Gemini response first
      const recentMemory = getRecentMemory(10);
      
      // Build conversation context for Gemini
      const conversationHistory = recentMemory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      // Add the current user message
      conversationHistory.push({
        role: 'user',
        parts: [{ text: userQuery }]
      });

      // Call Google Gemini API with conversation history
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: conversationHistory
        })
      });

      if (!res.ok) {
        throw new Error(`Gemini API error ${res.status}`);
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      const geminiResponse = candidate?.content?.parts?.[0]?.text || 'No response.';

      // Load our platform models
      await ModelFilterService.loadModels();
      
      // Filter and format the response to only show models that exist in our platform
      return ModelFilterService.filterAndFormatGeminiResponse(geminiResponse, userQuery);
    } catch (error) {
      console.error('Error getting Gemini response:', error);
      return "Sorry, I encountered an error processing your request. Please try again.";
    }
  };

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

    // Add user message to memory
    addToMemory('user', currentMessage);

    try {
      // Get Gemini response with model filtering
      const filteredResponse = await getGeminiResponseWithModelFiltering(currentMessage);
      
      // Add assistant response to memory
      addToMemory('assistant', filteredResponse);
      
      // Remove loading message and add filtered response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessage.id);
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          text: filteredResponse,
          isUser: false,
          timestamp: new Date(),
        }];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMessage.id);
        return [...filtered, {
          id: (Date.now() + 2).toString(),
          text: "Sorry, I encountered an error processing your request. Please try again.",
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
                <p className="text-sm flex-1">{renderMessage(message.text)}</p>
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
              messages.some(m => m.isLoading) 
                ? "Assistant is thinking..."
                : "Ask about models, use cases..."
            }
            disabled={messages.some(m => m.isLoading)}
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

        {/* Token Counter and Memory Controls */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            Tokens remaining: <span className="text-neuro-success font-medium">{tokenCount}</span>
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMemory}
              className="text-xs h-6 px-2 hover:bg-muted"
            >
              Clear Memory
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightAssistant;