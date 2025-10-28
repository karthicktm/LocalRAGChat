import React, { useState } from 'react';
import {
  Search,
  Upload,
  Download,
  Check,
  Folder,
  FileText,
  Cpu,
  Trash2,
  FileText as FileIcon
} from 'lucide-react';
import { Model } from '../types';

interface SidebarProps {
  models: Model[];
  files: any[];
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  onFileUpload: (files: FileList) => void;
  onDeleteFile: (fileId: string) => void;
  onFolderSelect: (path: string) => void;
}

export function SimpleSidebar({
  models,
  files,
  selectedModel,
  onModelSelect,
  onFileUpload,
  onDeleteFile,
  onFolderSelect
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'installed' | 'available'>('all');

  console.log('SimpleSidebar - models prop:', models);
  console.log('SimpleSidebar - models length:', models.length);

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'installed' && model.installed) ||
      (filterType === 'available' && !model.installed);
    return matchesSearch && matchesFilter;
  });

  const handleFileUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.txt,.md,.pdf,.docx';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        onFileUpload(files);
      }
    };
    input.click();
  };

  return (
    <div className="w-80 lg:w-80 md:w-72 sm:w-60 bg-gray-50 border-r border-gray-200 flex flex-col h-screen lg:h-full overflow-hidden">
      {/* Upload Section */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleFileUploadClick}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Upload</span>
          </button>
          <button
            onClick={() => onFolderSelect('/path/to/folder')}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Folder className="w-4 h-4" />
            <span className="text-sm font-medium">Browse</span>
          </button>
        </div>
      </div>

      {/* Models Section */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-gray-600" />
            <h4 className="font-semibold text-gray-900">Models ({models.length})</h4>
          </div>

          {/* Search and Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'installed', 'available'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    filterType === type
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Models List */}
        <div className="p-3 space-y-2">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              onClick={() => onModelSelect(model.id)}
              className={`p-3 bg-white rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                selectedModel === model.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {model.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{model.name}</h4>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span className="font-medium">{model.parameters}</span>
                        <span className="text-gray-400">•</span>
                        <span>{model.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    model.installed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {model.installed ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span className="ml-1">Ready</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        <span className="ml-1">Get</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Files Summary */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <h4 className="font-semibold text-gray-900">Documents ({files.length})</h4>
        </div>

        {/* Files List */}
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {files.map((file: any, index: number) => (
            <div
              key={file.file_id || file.filename || `file-${index}`}
              className="bg-white rounded border border-gray-200 p-2 mb-1"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1">
                    <FileIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <span className="font-medium text-gray-900 text-sm truncate">{file.filename}</span>
                  </div>
                  {file.status === 'completed' && (
                    <span className="text-xs text-gray-500 ml-1">
                      {file.chunks_processed || 0} chunks
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onDeleteFile(file.file_id || file.id)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {files.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <FileText className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Upload files to get started</p>
            </div>
          )}
        </div>
      </div>

      </div>
  );
}