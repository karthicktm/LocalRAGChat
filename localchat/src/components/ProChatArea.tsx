import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Bot,
  User,
  Copy,
  ThumbsUp,
  RefreshCw,
  ChevronDown,
  Upload,
  FolderOpen,
  Loader2,
  FileText,
} from 'lucide-react';
import { Message } from '../types';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export const ProChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  isLoading,
}) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    setShowScrollButton(!isAtBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('```')) {
        const language = line.match(/```(\w+)?/)?.[1] || 'text';
        return (
          <pre key={index} className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-3 border border-gray-200">
            <code className="text-sm font-mono">{line.replace(/```\w*/, '')}</code>
          </pre>
        );
      } else if (line.startsWith('#')) {
        return (
          <h3 key={index} className="font-semibold text-lg mb-2 text-gray-900">
            {line.replace(/^#+\s*/, '')}
          </h3>
        );
      } else if (line.startsWith('*') || line.startsWith('-')) {
        const listItems = line.replace(/^[\*-\s]+/, '').split(/\s*\s+|\s*\/\s*/);
        return (
          <ul key={index} className="list-disc list-inside mb-3 ml-6 space-y-1">
            {listItems.map((item, itemIndex) => (
              <li key={itemIndex} className="text-gray-700">{item}</li>
            ))}
          </ul>
        );
      }
      return (
        <p key={index} className="mb-3 text-gray-700 leading-relaxed">
          {line || <br />}
        </p>
      );
    });
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const timestamp = message.timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <div
        key={message.id}
        className={`flex gap-4 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {/* Avatar */}
        {!isUser && (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Message Content */}
        <div className={`max-w-2xl ${isUser ? 'order-first' : ''}`}>
          <div className={`rounded-2xl p-5 shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-semibold text-sm">
                {isUser ? 'You' : 'Assistant'}
              </span>
              <span className="text-xs opacity-75">{timestamp}</span>
              {message.model && !isUser && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {message.model}
                </span>
              )}
            </div>

            {/* Message Text */}
            <div className="text-sm leading-relaxed">
              {message.content.includes('```') ? (
                formatMessage(message.content)
              ) : (
                message.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-3 last:mb-0">
                    {line || <br />}
                  </p>
                ))
              )}
            </div>

            {/* Actions for assistant messages */}
            {!isUser && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <ThumbsUp className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">
                    {message.sources.length} source{message.sources.length > 1 ? 's' : ''} found
                  </span>
                </div>
                <div className="space-y-2">
                  {message.sources.map((source, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="font-medium text-sm text-gray-900 mb-1">{source.filename}</div>
                      <div className="text-xs text-gray-600">
                        {source.content.length > 100
                          ? source.content.substring(0, 97) + '...'
                          : source.content
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-6"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Bot className="w-10 h-10 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to LocalChat</h3>
            <p className="text-gray-600 mb-8 max-w-md">
              Start by uploading documents or asking questions about your uploaded content.
            </p>
            <div className="flex justify-center gap-4">
              <button className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium">
                <Upload className="w-5 h-5" />
                Upload Documents
              </button>
              <button className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">
                <FolderOpen className="w-5 h-5" />
                Browse Files
              </button>
            </div>
          </div>
        ) : (
          <div>
            {messages.map(renderMessage)}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-4 mb-6 justify-start">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm max-w-2xl">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-gray-700">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-8 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-6">
        <div className="flex gap-3 max-w-4xl mx-auto">
          {/* File Upload Button */}
          <button
            className="flex-shrink-0 p-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = '.pdf,.docx,.txt,.md,.markdown';
              input.onchange = (e: any) => {
                if (e.target.files) {
                  console.log('Files selected:', e.target.files);
                }
              };
              input.click();
            }}
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="w-full min-h-[48px] max-h-32 px-4 py-3 pr-14 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};