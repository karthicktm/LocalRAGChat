import React, { useState, useEffect } from 'react';
import { SimpleHeader } from './components/SimpleHeader';
import { SimpleSidebar } from './components/SimpleSidebar';
import { SimpleChatArea } from './components/SimpleChatArea';
import { FolderMonitor } from './components/FolderMonitor';
import { FeaturesShowcase } from './components/FeaturesShowcase';
import { Model, Message, SystemStatus, Source } from './types';

const API_BASE_URL = 'http://localhost:8000';

// Extended SystemStatus interface for our use
interface ExtendedSystemStatus extends SystemStatus {
  systemHealth?: 'operational' | 'degraded' | 'down';
  indexedFiles?: number;
}

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function SimpleApp() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3.2:3b');
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<ExtendedSystemStatus>({
    modelStatus: 'ready',
    activeModel: 'llama3.2:3b',
    vectorDbStatus: 'idle',
    documentCount: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    systemHealth: 'operational',
    indexedFiles: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fileProcessingStatus, setFileProcessingStatus] = useState<{
    isProcessing: boolean;
    currentFile?: string;
    totalFiles?: number;
    processedFiles?: number;
  }>({ isProcessing: false });

  const addGlobalNotification = (message: string, type: 'info' | 'success' | 'error' = 'info', duration: number = 3000) => {
    const id = Date.now().toString();
    const notification = { id, message, type };

    setNotifications(prev => [...prev, notification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const modelsResponse = await fetch(`${API_BASE_URL}/models`);
        const modelsData = await modelsResponse.json();
        setModels(modelsData || []);

        const filesResponse = await fetch(`${API_BASE_URL}/files`);
        const filesData = await filesResponse.json();
        setFiles(filesData.files || []);
        setSystemStatus(prev => ({ ...prev, indexedFiles: filesData.files?.length || 0 }));
      } catch (error) {
        console.error('Error loading initial data:', error);
        addGlobalNotification('Failed to load initial data', 'error');
      }
    };

    const handleGlobalNotification = (event: any) => {
      const detail = event.detail;

      if (detail.action === 'remove') {
        setNotifications(prev => prev.filter(n => n.id !== detail.id));
      } else {
        setNotifications(prev => [...prev, detail]);
      }
    };

    window.addEventListener('globalNotification', handleGlobalNotification);

    // Call the function to load initial data
    loadInitialData();

    // Define type for file status
    type FileStatus = {
      hash: string;
      status: string;
      last_processed: string;
      document_id?: string;
      chunks_processed?: number;
      size?: number;
      modified?: number;
      created?: number;
    };

    // Monitor folder monitor status for file processing
    const checkFolderMonitorStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/folder-monitor/status`);
        const status = await response.json();

        if (status.is_active && status.file_statuses) {
          const fileStatuses: Record<string, FileStatus> = status.file_statuses;
          const processingFiles = Object.entries(fileStatuses).filter(([_, fileStatus]) =>
            fileStatus.status === 'processing'
          );

          if (processingFiles.length > 0) {
            const [currentFilePath] = processingFiles[0];
            const fileName = currentFilePath.split('/').pop() || currentFilePath;
            setFileProcessingStatus({
              isProcessing: true,
              currentFile: fileName,
              totalFiles: Object.keys(fileStatuses).length,
              processedFiles: Object.entries(fileStatuses).filter(([_, fileStatus]) =>
                fileStatus.status === 'completed'
              ).length
            });
          } else {
            // Check if any files were recently processed
            const recentFiles = Object.entries(fileStatuses).filter(([_, fileStatus]) => {
              const lastProcessed = new Date(fileStatus.last_processed);
              const now = new Date();
              const timeDiff = (now.getTime() - lastProcessed.getTime()) / 1000;
              return timeDiff < 30; // Files processed in last 30 seconds
            });

            if (recentFiles.length > 0 && fileProcessingStatus.isProcessing) {
              // Just finished processing
              addGlobalNotification(`Successfully processed ${recentFiles.length} file(s)`, 'success', 5000);
            }

            setFileProcessingStatus({ isProcessing: false });
          }
        }
      } catch (error) {
        console.error('Error checking folder monitor status:', error);
      }
    };

    // Set up periodic status checking
    const interval = setInterval(checkFolderMonitorStatus, 3000); // Check every 3 seconds

    return () => {
      window.removeEventListener('globalNotification', handleGlobalNotification);
      clearInterval(interval);
    };
  }, []);

  const handleFileUpload = async (fileList: FileList) => {
    const files = Array.from(fileList);
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for file: ${file.name}`);
        }

        await response.json();
        successCount++;

      } catch (error) {
        errorCount++;
        console.error(`Error uploading file ${file.name}:`, error);
      }
    }

    // Show single summary notification
    if (successCount > 0 && errorCount === 0) {
      addGlobalNotification(`Successfully uploaded ${successCount} file(s)`, 'success', 4000);
    } else if (successCount > 0 && errorCount > 0) {
      addGlobalNotification(`Uploaded ${successCount} file(s), ${errorCount} failed`, 'error', 5000);
    } else {
      addGlobalNotification(`Failed to upload all ${errorCount} file(s)`, 'error', 5000);
    }

    // Refresh files list
    try {
      const filesResponse = await fetch(`${API_BASE_URL}/files`);
      const filesData = await filesResponse.json();
      setFiles(filesData.files || []);
      setSystemStatus(prev => ({ ...prev, indexedFiles: filesData.files?.length || 0 }));
    } catch (error) {
      console.error('Error refreshing files list:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setLoadingStatus('Searching documents...');

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          model_id: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response reader available');
      }

      let assistantContent = '';
      let sources: Source[] = [];
      let modelUsed = selectedModel;
      let assistantMessageId = Date.now().toString();

      // Add empty assistant message immediately for real-time updates
      const initialAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: selectedModel,
        sources: []
      };
      setMessages(prev => [...prev, initialAssistantMessage]);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.status === 'searching') {
                setLoadingStatus(parsed.message || 'Searching documents...');
              } else if (parsed.status === 'found_documents') {
                setLoadingStatus(parsed.message || 'Found relevant documents, generating response...');
              } else if (parsed.status === 'no_documents') {
                setLoadingStatus(parsed.message || 'No relevant documents found, using general knowledge...');
              } else if (parsed.status === 'complete') {
                // Update final message with sources
                sources = parsed.sources || [];
                modelUsed = parsed.model_used || selectedModel;

                // Update the assistant message with final content and sources
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: assistantContent || 'No response generated',
                        sources: sources,
                        model: modelUsed,
                        responseType: parsed.response_type
                      }
                    : msg
                ));
              } else if (parsed.response) {
                assistantContent += parsed.response;
                // Show streaming indicator
                setLoadingStatus('Streaming response...');

                // Update the message content in real-time
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: assistantContent }
                    : msg
                ));
              }
            } catch (e) {
              // Ignore parsing errors for stream chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addGlobalNotification('Error sending message: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    const model = models.find(m => m.id === modelId);
    if (model) {
      setSystemStatus(prev => ({
        ...prev,
        activeModel: model.name,
        modelStatus: 'ready'
      }));
    }
  };

  const handleFolderSelect = async (path: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/folder-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_path: path
        }),
      });

      if (!response.ok) {
        throw new Error(`Folder scan failed for path: ${path}`);
      }

      await response.json();
      addGlobalNotification(`Folder scan completed successfully`, 'success', 4000);

      setTimeout(async () => {
        try {
          const filesResponse = await fetch(`${API_BASE_URL}/files`);
          const filesData = await filesResponse.json();
          setFiles(filesData.files || []);
        } catch (error) {
          console.error('Error refreshing files after folder scan:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('Error scanning folder:', error);
      addGlobalNotification(`Error scanning folder: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Delete failed for file: ${fileId}`);
      }

      await response.json();

      // Refresh files list after deletion
      const filesResponse = await fetch(`${API_BASE_URL}/files`);
      const filesData = await filesResponse.json();
      setFiles(filesData.files || []);
      setSystemStatus(prev => ({ ...prev, indexedFiles: filesData.files?.length || 0 }));

      addGlobalNotification(`File deleted successfully`, 'success', 3000);
    } catch (error) {
      console.error('Error deleting file:', error);
      addGlobalNotification(`Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handleSettingsClick = () => {
    addGlobalNotification('Settings clicked - Feature coming soon', 'info');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden">
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              px-4 py-3 rounded-lg shadow-lg border-l-4 transition-all duration-300 transform
              ${notification.type === 'success'
                ? 'bg-green-50 border-green-400 text-green-800'
                : notification.type === 'error'
                ? 'bg-red-50 border-red-400 text-red-800'
                : 'bg-blue-50 border-blue-400 text-blue-800'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <span className="flex-1 text-sm">{notification.message}</span>
              <button
                onClick={() => {
                  setNotifications(prev => prev.filter(n => n.id !== notification.id));
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* File Processing Status Indicator */}
      {fileProcessingStatus.isProcessing && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="font-medium text-blue-900">
                Processing file: {fileProcessingStatus.currentFile}
              </div>
              <div className="text-sm text-blue-600">
                {fileProcessingStatus.processedFiles || 0} of {fileProcessingStatus.totalFiles || 0} files completed
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <SimpleHeader
        systemStatus={systemStatus}
        onSettingsClick={handleSettingsClick}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 lg:w-80 md:w-72 sm:w-60 xl:w-80 flex-shrink-0 h-full">
          <SimpleSidebar
            models={models}
            selectedModel={selectedModel}
            onModelSelect={handleModelSelect}
            files={files}
            onFolderSelect={handleFolderSelect}
            onFileUpload={handleFileUpload}
            onDeleteFile={handleDeleteFile}
          />
        </div>

        <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
          <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 bg-white">
            <FolderMonitor apiBaseUrl={API_BASE_URL} />
          </div>
          <div className="flex-shrink-0 px-4 py-1">
            <FeaturesShowcase />
          </div>
          <div className="flex-1 min-h-0">
            <SimpleChatArea
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              loadingStatus={loadingStatus}
              onFileUpload={handleFileUpload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}