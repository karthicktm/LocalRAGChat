export interface Model {
  id: string;
  name: string;
  size: string;
  description: string;
  installed: boolean;
  downloading?: boolean;
  downloadProgress?: number;
  parameters: string;
  provider: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  status: 'idle' | 'processing' | 'indexed' | 'error';
  lastModified: Date;
  children?: FileItem[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
  model?: string;
  responseType?: 'document_based' | 'general_knowledge';
}

export interface Source {
  id: string;
  filename: string;
  content: string;
  score: number;
  file_path: string;
  source_type?: string;
  chunk_index?: number;
  file_size?: number;
  file_modified?: number;
  folder_path?: string;
}

export interface SystemStatus {
  modelStatus: 'idle' | 'loading' | 'ready' | 'error';
  activeModel?: string;
  vectorDbStatus: 'idle' | 'indexing' | 'ready' | 'error';
  documentCount: number;
  memoryUsage: number;
  cpuUsage: number;
}