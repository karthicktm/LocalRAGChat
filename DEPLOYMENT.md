# LocalChat RAG Application - Deployment Guide

## 📦 Application Bundle

This application is now fully bundled with cross-platform startup scripts and comprehensive documentation.

### 🎯 Quick Start

#### Windows Users
1. **Double-click**: `start.bat`
2. **Wait**: Services start automatically
3. **Browser opens**: http://localhost:3000
4. **Done!** Start chatting with your documents

#### Linux/macOS Users
1. **Open terminal**
2. **Run**: `./start.sh`
3. **Wait**: Services start automatically
4. **Browser opens**: http://localhost:3000
5. **Done!** Start chatting with your documents

### 🛠️ What's Included

#### Core Application Files
```
chat-f02e34f9/
├── backend/                 # FastAPI Python backend
│   ├── src/app/main.py     # Main application with RAG
│   ├── services/           # Ollama, Vector, Folder monitoring
│   ├── requirements.txt    # Python dependencies
│   └── venv/              # Python virtual environment
├── localchat/              # React TypeScript frontend
│   ├── src/               # React components and logic
│   ├── package.json       # Node.js dependencies
│   └── build/             # Production build
├── start.bat              # Windows startup script
├── start.sh               # Linux/macOS startup script
├── stop.bat               # Windows stop script
├── stop.sh                # Linux/macOS stop script
└── README-STARTUP.md      # Comprehensive setup guide
```

#### Features Included
- ✅ **Document Chat**: RAG-powered conversations with your files
- ✅ **Real-time Monitoring**: Automatic processing of new files
- ✅ **Default Folder Management**: Auto-start with your preferred folder
- ✅ **Source Attribution**: See which documents were used for responses
- ✅ **Cross-platform Support**: Windows, Linux, and macOS compatible
- ✅ **Intelligent Search**: Document prioritization with fallback to general knowledge
- ✅ **Multiple File Formats**: PDF, TXT, MD, DOCX support
- ✅ **Streaming Responses**: Real-time chat experience
- ✅ **Error Handling**: Robust error management and recovery

### 📋 System Requirements

#### Minimum Requirements
- **Python**: 3.9 or higher
- **Node.js**: 16.0 or higher
- **RAM**: 4GB (8GB recommended)
- **Storage**: 2GB free space
- **Ollama**: Installed with at least one model

#### Recommended Setup
- **Python**: 3.11+
- **Node.js**: 18+ or 20+
- **RAM**: 8GB or more
- **SSD Storage**: For faster file processing
- **Ollama Model**: `llama3.2:3b` or similar

### 🚀 Installation Steps

#### 1. Prerequisites Installation

**Python:**
- Windows: Download from https://python.org (check "Add to PATH")
- macOS: `brew install python3`
- Ubuntu/Debian: `sudo apt install python3 python3-pip python3-venv`
- CentOS/RHEL: `sudo yum install python3 python3-pip`

**Node.js:**
- Windows: Download from https://nodejs.org
- macOS: `brew install node`
- Linux: Follow instructions at https://nodejs.org

**Ollama:**
- Download from https://ollama.ai
- Install a model: `ollama pull llama3.2:3b`

#### 2. Application Setup
1. **Extract/Download** the application bundle
2. **Navigate** to the application directory
3. **Run** the appropriate startup script:
   - Windows: Double-click `start.bat`
   - Linux/macOS: `./start.sh`

#### 3. First Run Configuration
1. **Browser opens** automatically at http://localhost:3000
2. **Set up folder monitoring** in the Folder Monitor section
3. **Upload documents** or browse to your document folder
4. **Start chatting** with your documents!

### 🔧 Configuration Options

#### Environment Variables (Optional)
Create `.env` files for custom configuration:

**Backend (.env)**:
```env
OLLAMA_BASE_URL=http://localhost:11434
VECTOR_DB_PATH=./data/chroma
UPLOAD_DIR=./uploads
DEFAULT_FOLDER_PATH=/path/to/your/documents
```

**Frontend (.env)**:
```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_API_TIMEOUT=30000
PORT=3000
```

#### Port Configuration
If ports 8000 or 3000 are in use:

**Backend Port Change:**
- Edit startup scripts: change `--port 8000` to `--port 8001`
- Update frontend `.env`: `REACT_APP_API_BASE_URL=http://localhost:8001`

**Frontend Port Change:**
- Create `localchat/.env`: `PORT=3001`
- Access at: http://localhost:3001

### 🎨 Using the Application

#### Document Management
1. **Folder Monitoring**: Set a default folder for automatic file processing
2. **File Upload**: Manually upload individual files
3. **Supported Formats**: PDF, TXT, MD, DOCX, and more
4. **Real-time Processing**: New files are processed automatically

#### Chat Features
1. **Document-based Responses**: Answers come from your documents first
2. **Source Attribution**: See which files were used for each response
3. **General Knowledge Fallback**: Uses model knowledge when documents don't contain the answer
4. **Streaming Responses**: Real-time chat experience

#### Advanced Features
1. **Default Folder**: Auto-start monitoring with your preferred folder
2. **Multiple Models**: Switch between different Ollama models
3. **File Status Tracking**: Monitor processing status of all files
4. **Error Recovery**: Automatic retry mechanisms for failed processing

### 🔍 Troubleshooting

#### Common Issues and Solutions

**"Python not found"**
- Solution: Install Python and ensure it's added to PATH
- Windows: Reinstall with "Add Python to PATH" checked
- Linux/macOS: Create symlink: `sudo ln -sf /usr/bin/python3 /usr/bin/python`

**"Node.js not found"**
- Solution: Install Node.js from official website or package manager
- Restart terminal after installation

**"Address already in use"**
- Solution: Ports already occupied by existing services
- Option 1: Run `stop.sh` or `stop.bat` first
- Option 2: Change ports in configuration

**"Ollama connection failed"**
- Solution: Ollama not running or no models installed
- Start Ollama: `ollama serve`
- Install model: `ollama pull llama3.2:3b`

**"Documents not processing"**
- Solution: Check file permissions and formats
- Ensure files are supported formats
- Check folder monitoring status in UI

#### Performance Optimization

**Slow Response Times**
- Use smaller models: `ollama pull llama3.2:1b`
- Increase system RAM
- Use SSD storage for better I/O

**High Memory Usage**
- Limit number of processed files
- Use smaller embedding models
- Restart services periodically

### 📊 Monitoring and Maintenance

#### Health Checks
- **Backend Health**: http://localhost:8000/health
- **API Documentation**: http://localhost:8000/docs
- **Frontend Status**: Check browser console for errors

#### Log Files
- **Backend Logs**: Check terminal where backend is running
- **Frontend Logs**: Browser developer tools console
- **Ollama Logs**: `ollama logs` command

#### Regular Maintenance
1. **Clear Cache**: Periodically clear browser cache
2. **Update Dependencies**: Run `npm update` and `pip install -r requirements.txt --upgrade`
3. **Model Management**: Update Ollama models regularly

### 🚀 Production Deployment

#### Security Considerations
1. **Network Access**: By default, only accessible from localhost
2. **Data Privacy**: All processing happens locally
3. **No External APIs**: Only Ollama connection required
4. **File Access**: Application only accesses specified folders

#### Scaling Options
1. **Hardware**: Increase RAM and CPU for better performance
2. **Models**: Use larger models for better responses
3. **Storage**: Use faster storage for large document collections

#### Docker Deployment (Optional)
For containerized deployment, create Dockerfile:
```dockerfile
FROM python:3.11-slim
# ... application setup ...
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 📞 Support and Help

#### Self-Service Resources
1. **README-STARTUP.md**: Detailed setup instructions
2. **API Documentation**: http://localhost:8000/docs
3. **Health Check**: http://localhost:8000/health

#### Common Commands
```bash
# Start services
./start.sh        # Linux/macOS
start.bat         # Windows

# Stop services
./stop.sh         # Linux/macOS
stop.bat          # Windows

# Check Ollama
ollama list       # See installed models
ollama serve      # Start Ollama service

# Python environment
source venv/bin/activate  # Activate virtual environment
pip install -r requirements.txt  # Install/update dependencies
```

### 🎉 Success Metrics

Your application is successfully running when:
- ✅ Backend accessible at http://localhost:8000
- ✅ Frontend accessible at http://localhost:3000
- ✅ Health check passes
- ✅ Documents can be uploaded and processed
- ✅ Chat responses include source attribution
- ✅ Real-time file monitoring works

---

**🎯 Congratulations!** You now have a fully functional document chat application with RAG capabilities, real-time monitoring, and cross-platform support.