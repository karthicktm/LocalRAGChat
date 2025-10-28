import React from 'react';
import { FolderOpen, Brain, Shield } from 'lucide-react';

export const FeaturesShowcase: React.FC = () => {
  const features = [
    {
      icon: FolderOpen,
      title: "Auto Folder Monitor",
      description: "Drop files in a monitored folder and they're automatically processed for RAG",
      color: "from-purple-500 to-indigo-600"
    },
    {
      icon: Brain,
      title: "Smart RAG System",
      description: "Get intelligent answers from your documents with enhanced source details",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Shield,
      title: "File Hash Tracking",
      description: "No duplicate processing - files are only reprocessed when content changes",
      color: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2">
      <div className="flex items-center justify-center gap-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-1 text-xs text-gray-600"
              title={feature.description}
            >
              <div className={`w-5 h-5 rounded bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                <Icon className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="hidden sm:inline">{feature.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};