import React from 'react';
import { Settings, Wifi, WifiOff, Database, Zap, Cpu, Activity } from 'lucide-react';
import { SystemStatus } from '../types';

interface HeaderProps {
  systemStatus: SystemStatus;
  onSettingsClick: () => void;
}

export const ProHeader: React.FC<HeaderProps> = ({ systemStatus, onSettingsClick }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600';
      case 'loading': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'loading': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
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

            <div className="h-8 w-px bg-gray-300" />

            <div className="flex items-center space-x-4">
              {/* Model Status */}
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBg(systemStatus.modelStatus)}`}>
                {systemStatus.modelStatus === 'ready' && <Wifi className="w-4 h-4" />}
                {systemStatus.modelStatus === 'loading' && <Activity className="w-4 h-4 animate-pulse" />}
                {systemStatus.modelStatus === 'error' && <WifiOff className="w-4 h-4" />}
                <span>{systemStatus.activeModel}</span>
              </div>

              {/* Vector DB Status */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                <Database className="w-4 h-4" />
                <span>DB Ready</span>
              </div>

              {/* Document Count */}
              <div className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                <span>{systemStatus.documentCount} docs</span>
              </div>
            </div>
          </div>

          {/* System Resources and Settings */}
          <div className="flex items-center space-x-6">
            {/* Resource Usage */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{systemStatus.cpuUsage}%</span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="w-6 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                    style={{ width: `${systemStatus.memoryUsage}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">{systemStatus.memoryUsage}%</span>
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
      </div>
    </header>
  );
};