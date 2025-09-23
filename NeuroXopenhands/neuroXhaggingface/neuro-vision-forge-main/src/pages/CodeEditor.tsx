import { useState } from "react";
import { Code, Terminal, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CodeEditor = () => {
  const [activeFile, setActiveFile] = useState("app.py");

  const files = [
    { name: "app.py", type: "python" },
    { name: "requirements.txt", type: "text" },
    { name: "config.json", type: "json" },
    { name: "README.md", type: "markdown" },
  ];

  const sampleCode = `# NeuroChat Fusion - AI Model Integration
import openai
from neurochat import ModelManager

class ChatApp:
    def __init__(self):
        self.model_manager = ModelManager()
        self.models = self.load_selected_models()
    
    def load_selected_models(self):
        """Load models from user's collection"""
        return [
            {"name": "GPT-4 Turbo", "provider": "OpenAI"},
            {"name": "Llama 2 70B", "provider": "Meta"}
        ]
    
    def chat(self, message, model_name="GPT-4 Turbo"):
        """Send message to selected model"""
        response = self.model_manager.query(
            model=model_name,
            prompt=message
        )
        return response
    
    def run(self):
        """Start the chat interface"""
        print("NeuroChat Fusion - Ready!")
        while True:
            user_input = input("You: ")
            if user_input.lower() == 'quit':
                break
            
            response = self.chat(user_input)
            print(f"AI: {response}")

if __name__ == "__main__":
    app = ChatApp()
    app.run()`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Code Editor</h1>
          <p className="text-lg text-muted-foreground">
            Develop and customize your AI model integrations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button className="bg-neuro-success hover:bg-neuro-success/90 text-background">
            <Terminal className="w-4 h-4 mr-2" />
            Run Code
          </Button>
        </div>
      </div>

      {/* Main Editor Interface */}
      <div className="grid grid-cols-12 gap-6 h-[700px]">
        {/* File Explorer */}
        <div className="col-span-3 bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-4 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Files
          </h3>
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.name}
                onClick={() => setActiveFile(file.name)}
                className={`p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                  activeFile === file.name
                    ? 'bg-neuro-accent-1 text-background'
                    : 'hover:bg-surface text-muted-foreground'
                }`}
              >
                <Code className="w-4 h-4 inline mr-2" />
                {file.name}
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-3 bg-surface rounded-lg border border-border">
            <h4 className="font-medium text-sm mb-2">Project Info</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Language: Python</div>
              <div>Models: 2 selected</div>
              <div>Status: Development</div>
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="col-span-9 bg-card border border-border rounded-xl">
          <Tabs defaultValue="editor" className="h-full">
            <div className="border-b border-border p-4">
              <TabsList className="bg-surface">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="terminal">Terminal</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor" className="p-0 h-full">
              <div className="p-4 h-full">
                <div className="bg-neuro-bg border border-border rounded-lg p-4 h-full font-mono text-sm overflow-auto">
                  <pre className="text-foreground whitespace-pre-wrap">
                    <code>{sampleCode}</code>
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="terminal" className="p-4">
              <div className="bg-neuro-bg border border-border rounded-lg p-4 h-96 font-mono text-sm">
                <div className="text-neuro-success">neurochat-fusion@1.0.0:~$</div>
                <div className="text-muted-foreground mt-2">
                  Welcome to NeuroChat Fusion Development Environment
                  <br />
                  Type 'help' for available commands
                  <br />
                  <br />
                  {'>'} pip install -r requirements.txt
                  <br />
                  Successfully installed all dependencies
                  <br />
                  <br />
                  {'>'} python app.py
                  <br />
                  NeuroChat Fusion - Ready!
                  <br />
                  Models loaded: GPT-4 Turbo, Llama 2 70B
                  <br />
                  Server running on http://localhost:8000
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="p-4">
              <div className="bg-surface border border-border rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
                <p className="text-muted-foreground mb-6">
                  Your application preview will appear here when you run the code
                </p>
                <Button className="bg-neuro-accent-1 hover:bg-neuro-accent-1/90 text-background">
                  Start Live Preview
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-16 flex-col space-y-1">
          <Code className="w-5 h-5" />
          <span className="text-sm">New File</span>
        </Button>
        <Button variant="outline" className="h-16 flex-col space-y-1">
          <Terminal className="w-5 h-5" />
          <span className="text-sm">Terminal</span>
        </Button>
        <Button variant="outline" className="h-16 flex-col space-y-1">
          <FileText className="w-5 h-5" />
          <span className="text-sm">Export</span>
        </Button>
        <Button variant="outline" className="h-16 flex-col space-y-1">
          <Settings className="w-5 h-5" />
          <span className="text-sm">Deploy</span>
        </Button>
      </div>
    </div>
  );
};

export default CodeEditor;