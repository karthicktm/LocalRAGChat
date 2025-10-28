import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Bot,
  User,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Message } from '../types';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  loadingStatus?: string;
  onFileUpload?: (files: FileList) => void;
}

export const SimpleChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  isLoading,
  loadingStatus,
  onFileUpload,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // Use multiple approaches for reliable scrolling
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;

        // Method 1: Force scroll to bottom
        container.scrollTop = container.scrollHeight;

        // Method 2: Double-check after DOM update
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 10);

        // Method 3: Final fallback
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 50);
      }

      // Method 4: Use scrollIntoView as backup
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    });
  };

  const handleScroll = () => {
    const element = messagesContainerRef.current;
    if (element) {
      const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      setShowScrollButton(!isAtBottom);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files);
    }
  };

  const toggleSources = (messageId: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 50); // Reduced delay for more responsive scrolling
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Initial scroll when component mounts
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Additional scroll when messages change or content updates
  const messageContentSignature = messages.map(m => m.content).join('|');
  useEffect(() => {
    if (messages.length > 0) {
      // Immediate scroll for real-time updates
      requestAnimationFrame(() => {
        scrollToBottom();
      });

      // Also try again after a short delay for content to render
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 25);
      return () => clearTimeout(timer);
    }
  }, [messages.length, messageContentSignature]); // Trigger on content changes

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const messageId = `${message.timestamp}-${message.content.slice(0, 20)}`;

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
        <div className={`flex items-start gap-3 max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
          }`}>
            {isUser ? (
              <User className="w-5 h-5" />
            ) : (
              <Bot className="w-5 h-5" />
            )}
          </div>

          {/* Message Content */}
          <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : 'text-left'}`}>
            {/* Sender and Timestamp */}
            <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <span className={`font-semibold text-sm ${
                isUser ? 'text-blue-600' : 'text-indigo-600'
              }`}>
                {isUser ? 'You' : 'Assistant'}
              </span>
              <span className="text-xs text-gray-400">
                {timestamp}
              </span>
            </div>

            {/* Message Bubble */}
            <div className={`inline-block p-4 rounded-2xl shadow-sm ${
              isUser
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-auto'
                : 'bg-white border border-gray-200 text-gray-800'
            }`}>
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </div>

              {/* Response Type Indicator */}
              {!isUser && (
                <div className={`mt-3 pt-3 border-t ${
                  isUser ? 'border-blue-400' : 'border-gray-200'
                }`}>
                  {message.responseType ? (
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium ${
                      message.responseType === 'document_based'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}>
                      {message.responseType === 'document_based' ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Based on your documents</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          <span>General knowledge (no relevant documents found)</span>
                        </>
                      )}
                    </div>
                  ) : (
                    // For older messages without responseType, check if they have sources
                    (!message.sources || message.sources.length === 0) && (
                      <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                        <AlertCircle className="w-3 h-3" />
                        <span>General knowledge</span>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Sources Section */}
              {message.sources && message.sources.length > 0 && (
                <div className={`mt-3 pt-3 border-t ${
                  isUser ? 'border-blue-400' : 'border-gray-200'
                }`}>
                  <button
                    onClick={() => toggleSources(messageId)}
                    className={`flex items-center gap-2 w-full hover:bg-opacity-10 p-2 rounded-lg transition-all ${
                      isUser ? 'hover:bg-blue-100 text-blue-100' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="font-medium text-sm">
                      {message.sources.length} source{message.sources.length === 1 ? '' : 's'}
                    </span>
                    {expandedSources[messageId] ? (
                      <ChevronUp className="w-4 h-4 ml-auto" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    )}
                  </button>

                  {expandedSources[messageId] && (
                    <div className="space-y-2 mt-2">
                      {message.sources.map((source, index) => (
                        <div
                          key={`${source.filename}-${index}`}
                          className={`p-3 rounded-lg border ${
                            isUser
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm text-gray-900 truncate">
                                    {source.filename}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Score: {source.score?.toFixed(3)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 line-clamp-2">
                                {source.content?.substring(0, 150) + (source.content?.length > 150 ? '...' : '')}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(source.content);
                              }}
                              className="text-gray-400 hover:text-gray-600 text-xs p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                              title="Copy source content"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-gradient-to-br from-gray-50 to-white relative">
      <div className="flex-1 overflow-hidden flex flex-col">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full w-full text-center px-6">
            <div className="mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-6">
                <Bot className="w-10 h-10 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Welcome to LocalChat</h3>
            <p className="text-gray-600 mb-8 max-w-md text-lg leading-relaxed">
              Set up a folder monitor in the sidebar to automatically process documents, then start asking questions!
            </p>
            <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
              <span>Configure folder monitor to get started</span>
            </div>
          </div>
        ) : (
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-1"
          style={{
            height: '100%',
            maxHeight: '100%',
            scrollBehavior: 'smooth'
          }}
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <div className="flex gap-4 mb-6 justify-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm max-w-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Assistant</div>
                    <div className="text-xs text-gray-500">{loadingStatus || 'Processing...'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          {showScrollButton && messages.length > 0 && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-24 right-8 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
              title="Scroll to bottom"
            >
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {/* Extra padding to ensure last message is fully visible */}
          <div className="h-4" />
          <div ref={messagesEndRef} />
        </div>
      )}
      </div>

      <div className="border-t border-gray-200 bg-gradient-to-t from-gray-50 to-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            {/* File Upload Button */}
            <button
              onClick={() => document.getElementById('file-input')?.click()}
              className="flex-shrink-0 p-3 rounded-xl border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              title="Upload documents"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>

            {/* Input Area */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your documents..."
                  className="w-full resize-none p-4 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                  rows={2}
                  disabled={isLoading}
                />

                {/* Send Button inside textarea */}
                <button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="absolute right-2 bottom-2 flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                  title="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Helper text */}
              <div className="mt-2 text-xs text-gray-500 text-center">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          id="file-input"
          type="file"
          multiple
          accept=".txt,.md,.pdf,.docx"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
};