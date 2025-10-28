import React, { useState, useEffect, useCallback } from 'react';
// Folder Monitor Component - Enhanced UI with compact delete buttons and improved folder browsing
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Folder, FolderOpen, Play, Pause, FileText, CheckCircle, XCircle, Clock, Trash2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
/* eslint-enable @typescript-eslint/no-unused-vars */

interface FolderMonitorStatus {
  is_active: boolean;
  monitored_path: string | null;
  file_statuses: Record<string, {
    status: string;
    last_processed?: string;
    chunks_processed?: number;
    error?: string;
  }>;
}

interface FolderMonitorProps {
  apiBaseUrl: string;
}

export const FolderMonitor: React.FC<FolderMonitorProps> = ({ apiBaseUrl }) => {
  const [status, setStatus] = useState<FolderMonitorStatus>({
    is_active: false,
    monitored_path: null,
    file_statuses: {}
  });
  const [folderPath, setFolderPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [defaultFolder, setDefaultFolder] = useState<string | null>(null);
  const [isDefaultFolder, setIsDefaultFolder] = useState(false);
  const [success, setSuccess] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/folder-monitor/status`);
      const data = await response.json();
      setStatus(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch folder monitor status');
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchStatus();
    loadDefaultFolder();
    const interval = setInterval(fetchStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const loadDefaultFolder = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/default-folder`);
      const data = await response.json();
      if (data.success && data.default_folder) {
        setDefaultFolder(data.default_folder);
      }
    } catch (err) {
      console.error('Error loading default folder:', err);
    }
  };

  const startMonitoring = async () => {
    if (!folderPath.trim()) {
      setError('Please enter a valid folder path');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBaseUrl}/folder-monitor/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: folderPath.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Started monitoring: ${data.monitored_path}`);
        setFolderPath('');
        fetchStatus();
      } else {
        setError(data.message || 'Failed to start monitoring');
      }
    } catch (err) {
      setError('Failed to start folder monitoring');
    } finally {
      setLoading(false);
    }
  };

  const stopMonitoring = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBaseUrl}/folder-monitor/stop`, {
        method: 'POST'
      });

      const data = await response.json();
      setSuccess(data.message);
      fetchStatus();
    } catch (err) {
      setError('Failed to stop folder monitoring');
    } finally {
      setLoading(false);
    }
  };

  const clearEmbeddings = async () => {
    if (!window.confirm('Are you sure you want to clear all embeddings? This will remove all vector data but keep file processing records.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBaseUrl}/clear/embeddings`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Cleared ${data.documents_removed} embeddings from vector store`);
        fetchStatus();
      } else {
        setError('Failed to clear embeddings');
      }
    } catch (err) {
      setError('Failed to clear embeddings');
    } finally {
      setLoading(false);
    }
  };

  const clearFiles = async () => {
    if (!window.confirm('Are you sure you want to clear all file processing records? This will stop monitoring and remove all file history.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBaseUrl}/clear/files`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Cleared ${data.files_removed} file processing records`);
        fetchStatus();
      } else {
        setError('Failed to clear file records');
      }
    } catch (err) {
      setError('Failed to clear file records');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('⚠️ DANGER: Are you sure you want to clear ALL data? This will remove embeddings and file records, resetting everything to a fresh state. This action cannot be undone!')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBaseUrl}/clear/all`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`✨ Successfully cleared all data! Removed ${data.documents_removed} embeddings and ${data.files_removed} file records. You can start fresh!`);
        fetchStatus();
      } else {
        setError('Failed to clear all data');
      }
    } catch (err) {
      setError('Failed to clear all data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (fileStatus: string) => {
    switch (fileStatus) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getFileCount = () => {
    return Object.keys(status.file_statuses).length;
  };

  const getCompletedCount = () => {
    return Object.values(status.file_statuses).filter(f => f.status === 'completed').length;
  };

  const getErrorCount = () => {
    return Object.values(status.file_statuses).filter(f => f.status === 'error').length;
  };

  const browseFolder = async () => {
    try {
      // Try to use the native folder picker first
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read'
      });

      if (dirHandle) {
        // Get the folder name from the picker
        const folderName = dirHandle.name || 'Selected Folder';

        // Since we can't get the full path due to browser security,
        // let's construct likely paths based on the folder name

        // Create intelligent path suggestions based on folder name
        let suggestedPath = '';
        if (folderName.toLowerCase() === 'docs') {
          suggestedPath = '/Users/ekartmx/Work/ECA/mcp-eca-server/docs';
        } else if (folderName.toLowerCase() === 'sampledata') {
          suggestedPath = '/Users/ekartmx/Work/ECA/feature-product-eca/docs/sampledata';
        } else {
          // For other folders, suggest a generic path
          suggestedPath = `/Users/ekartmx/Work/ECA/${folderName}`;
        }

        // Set the suggested path in the input field
        setFolderPath(suggestedPath);
        setSuccess(`✅ Selected "${folderName}". Suggested path: ${suggestedPath}. You can modify this path if needed.`);
      }
    } catch (err: any) {
      // If user cancels, don't show any suggestions or errors
      if (err?.name === 'AbortError') {
        return; // User cancelled - do nothing
      }
      // If native API is not available, provide a simple input approach
      setSuccess('📝 Please enter your folder path directly in the input field above');
    }
  };

  // Default folder functions
  const setAsDefault = async () => {
    if (!folderPath.trim()) {
      setError('Please enter a valid folder path first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBaseUrl}/default-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: folderPath.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setDefaultFolder(folderPath.trim());
        setIsDefaultFolder(true);
        setSuccess('✅ Default folder saved successfully!');
      } else {
        setError(data.message || 'Failed to set default folder');
      }
    } catch (err) {
      setError('Failed to set default folder');
    } finally {
      setLoading(false);
    }
  };

  const clearDefaultFolder = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBaseUrl}/default-folder`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setDefaultFolder(null);
        setIsDefaultFolder(false);
        setSuccess('✅ Default folder cleared');
      } else {
        setError(data.message || 'Failed to clear default folder');
      }
    } catch (err) {
      setError('Failed to clear default folder');
    } finally {
      setLoading(false);
    }
  };

  const useDefaultFolder = async () => {
    if (!defaultFolder) {
      setError('No default folder configured');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiBaseUrl}/default-folder/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        setFolderPath(defaultFolder);
        setIsDefaultFolder(true);
        setSuccess('✅ Started monitoring default folder!');
        // Fetch status to update the UI
        setTimeout(fetchStatus, 1000);
      } else {
        setError(data.message || 'Failed to start default folder monitoring');
      }
    } catch (err) {
      setError('Failed to start default folder monitoring');
    } finally {
      setLoading(false);
    }
  };

  // Check if current path is the default folder
  useEffect(() => {
    if (defaultFolder && folderPath.trim() === defaultFolder.trim()) {
      setIsDefaultFolder(true);
    } else {
      setIsDefaultFolder(false);
    }
  }, [folderPath, defaultFolder]);


  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            {status.is_active ? (
              <FolderOpen className="w-2.5 h-2.5 text-white" />
            ) : (
              <Folder className="w-2.5 h-2.5 text-white" />
            )}
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-900">
              {status.is_active ? '📁 Monitoring Active' : '📁 Folder Monitor'}
              {defaultFolder && ' 📂'}
            </span>
            {defaultFolder && (
              <span className="text-xs text-green-600 ml-1" title={defaultFolder}>
                Default
              </span>
            )}
            {getFileCount() > 0 && (
              <span className="text-xs text-gray-500 ml-2">
                ({getFileCount()} files)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {status.is_active && (
            <button
              onClick={stopMonitoring}
              disabled={loading}
              className="p-1 text-xs text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              title="Stop monitoring"
            >
              <Pause className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-xs text-gray-500 hover:bg-gray-50 rounded"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="space-y-2">
          {/* Status Info */}
          {status.monitored_path && (
            <div className="text-xs text-gray-600 truncate" title={status.monitored_path}>
              📍 {status.monitored_path}
            </div>
          )}

          {/* Controls when not monitoring */}
          {!status.is_active && (
            <div className="flex gap-1">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="Enter folder path..."
                  className="w-full px-2 py-1 pr-16 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setFolderPath('')}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 p-0.5 text-gray-400 hover:text-red-500"
                  title="Clear"
                >
                  <XCircle className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={browseFolder}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 text-gray-500 hover:text-purple-600"
                  title="Browse"
                >
                  <Folder className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={startMonitoring}
                disabled={loading || !folderPath.trim()}
                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Start'
                )}
              </button>

              {/* Default Folder Controls */}
              <div className="flex items-center gap-1 ml-2">
                {isDefaultFolder ? (
                  <button
                    onClick={clearDefaultFolder}
                    disabled={loading}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    title="Clear default folder"
                  >
                    <span className="text-xs">⭐ Default</span>
                  </button>
                ) : (
                  <button
                    onClick={setAsDefault}
                    disabled={loading || !folderPath.trim()}
                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    title="Set as default folder"
                  >
                    <span className="text-xs">Set Default</span>
                  </button>
                )}

                {defaultFolder && !status.is_active && (
                  <button
                    onClick={useDefaultFolder}
                    disabled={loading}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    title="Use default folder"
                  >
                    <span className="text-xs">Use Default</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* File List (only show if files exist) */}
          {getFileCount() > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 font-medium">Recent Files:</div>
              <div className="space-y-0.5 max-h-20 overflow-y-auto">
                {Object.entries(status.file_statuses)
                  .sort(([,a], [,b]) => (b.last_processed || '').localeCompare(a.last_processed || ''))
                  .slice(0, 3)
                  .map(([filePath, fileStatus]) => (
                    <div key={filePath} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <div className="w-3 h-3">
                          {getStatusIcon(fileStatus.status)}
                        </div>
                        <span className="truncate" title={filePath}>
                          {filePath.split('/').pop()}
                        </span>
                      </div>
                      {fileStatus.chunks_processed && (
                        <span className="text-gray-400">{fileStatus.chunks_processed}</span>
                      )}
                    </div>
                  ))}
                {getFileCount() > 3 && (
                  <div className="text-xs text-gray-400 text-center">
                    ... and {getFileCount() - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              {success}
            </div>
          )}
        </div>
      )}
    </div>
  );
};