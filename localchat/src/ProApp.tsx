import React, { useState } from 'react';
import { ProHeader } from './components/ProHeader';
import { ProSidebar } from './components/ProSidebar';
import { ProChatArea } from './components/ProChatArea';
import { Model, Message, SystemStatus } from './types';
import './index.css';

function ProApp() {
  const [models, setModels] = useState<Model[]>([
    {
      id: 'llama3.2:3b',
      name: 'Llama 3.2 3B',
      size: '2.0 GB',
      description: 'Great balance of quality and performance',
      installed: true,
      parameters: '3B',
      provider: 'Meta'
    },
    {
      id: 'gemma2:2b',
      name: 'Gemma 2 2B',
      size: '1.6 GB',
      description: 'Ultra lightweight model',
      installed: false,
      parameters: '2B',
      provider: 'Google'
    },
    {
      id: 'phi3:mini',
      name: 'Phi 3 Mini',
      size: '2.2 GB',
      description: 'Strong reasoning capabilities',
      installed: false,
      parameters: '3.8B',
      provider: 'Microsoft'
    }
  ]);

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    modelStatus: 'ready',
    activeModel: 'Llama 3.2 3B',
    vectorDbStatus: 'ready',
    documentCount: 0,
    memoryUsage: 45,
    cpuUsage: 12
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3.2:3b');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // TODO: Implement actual API call to backend
      // Simulate response delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about: "${content}". This is a simulated response from ${selectedModel}. Once we connect the backend, I'll be able to provide real answers based on your uploaded documents.`,
        timestamp: new Date(),
        model: selectedModel
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    const model = models.find(m => m.id === modelId);
    if (model?.installed) {
      setSystemStatus(prev => ({
        ...prev,
        activeModel: model.name,
        modelStatus: 'ready'
      }));
    }
  };

  const handleFileUpload = (fileList: FileList) => {
    // TODO: Implement file upload logic
    console.log('Files uploaded:', fileList);
  };

  const handleFolderSelect = (path: string) => {
    // TODO: Implement folder selection logic
    console.log('Folder selected:', path);
  };

  const handleSettingsClick = () => {
    // TODO: Implement settings modal
    console.log('Settings clicked');
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <ProHeader systemStatus={systemStatus} onSettingsClick={handleSettingsClick} />
      <div className="flex flex-1 overflow-hidden">
        <ProSidebar
          models={models}
          files={files}
          selectedModel={selectedModel}
          onModelSelect={handleModelSelect}
          onFolderSelect={handleFolderSelect}
          onFileUpload={handleFileUpload}
        />
        <main className="flex-1 flex flex-col relative">
          <ProChatArea
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  );
}

export default ProApp;