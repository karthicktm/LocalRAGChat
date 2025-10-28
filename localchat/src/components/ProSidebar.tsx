import React, { useState } from 'react';
import {
  Search,
  Upload,
  Download,
  Check,
  Folder,
  FileText,
  Settings,
  Cpu,
  HardDrive,
  Star,
  Plus
} from 'lucide-react';
import { Model } from '../types';

interface SidebarProps {
  models: Model[];
  files: any[];
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  onFolderSelect: (path: string) => void;
  onFileUpload: (fileList: FileList) => void;
}

export const ProSidebar: React.FC<SidebarProps> = ({
  models,
  files,
  selectedModel,
  onModelSelect,
  onFolderSelect,
  onFileUpload,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'installed' | 'available'>('all');

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase());
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
    input.accept = '.pdf,.docx,.txt,.md,.markdown';
    input.onchange = (e: any) => {
      if (e.target.files) {
        onFileUpload(e.target.files);
      }
    };
    input.click();
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Upload Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleFileUploadClick}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={() => onFolderSelect('/path/to/folder')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            <Folder className="w-4 h-4" />
            Browse
          </button>
        </div>
      </div>

      {/* Models Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Language Models</h3>
            <button className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-1">
              {(['all', 'installed', 'available'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterType(filter)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterType === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Models List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {filteredModels.map((model) => (
              <div
                key={model.id}
                onClick={() => onModelSelect(model.id)}
                className={`p-4 bg-white rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                  selectedModel === model.id
                    ? 'border-blue-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {model.name.charAt(0)}
                        </span>
                      </div>
                      {model.name}
                    </h4>
                    <p className="text-sm text-gray-600">{model.description}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    model.installed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {model.installed ? (
                      <>
                        <Check className="w-3 h-3" />
                        Installed
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        Available
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Cpu className="w-4 h-4" />
                    {model.parameters}
                  </div>
                  <div className="flex items-center gap-1">
                    <HardDrive className="w-4 h-4" />
                    {model.size}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-sm">
                  <span className="text-gray-500">{model.provider}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < 3 ? 'text-yellow-500 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Files Summary */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-gray-600" />
            <h4 className="font-semibold text-gray-900">Documents ({files.length})</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Documents</span>
              <span className="font-medium text-gray-900">{files.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Processing Status</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Ready
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Updated</span>
              <span className="font-medium text-gray-900">Just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};