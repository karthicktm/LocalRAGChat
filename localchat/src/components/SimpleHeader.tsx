import React from 'react';
import { Settings, Wifi, WifiOff, Database, Zap, Cpu, Activity } from 'lucide-react';
import { SystemStatus } from '../types';

interface HeaderProps {
  systemStatus: SystemStatus;
  onSettingsClick: () => void;
}

export const SimpleHeader: React.FC<HeaderProps> = ({ systemStatus, onSettingsClick }) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">LocalChat</h1>
                <p className="text-xs text-gray-500">Professional RAG Assistant</p>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full flex items-center text-sm font-medium">
                  <Wifi className="w-4 h-4" />
                  <span>{systemStatus.activeModel}</span>
                </div>

                <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full flex items-center text-sm font-medium">
                  <Database className="w-4 h-4" />
                  <span>DB Ready</span>
                </div>

                <div className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full flex items-center text-sm font-medium">
                  <span>{systemStatus.documentCount} docs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  );
};