# LocalChat RAG Application - Startup Guide

## Quick Start

### Windows Users
```batch
# Double-click this file or run in Command Prompt
start.bat
```

### Linux/macOS Users
```bash
# Run this command in terminal
./start.sh
```

## What These Scripts Do

### Automatic Setup
- ✅ **Check Dependencies**: Verifies Python 3.9+ and Node.js are installed
- ✅ **Create Virtual Environment**: Sets up isolated Python environment
- ✅ **Install Dependencies**: Installs all required packages
- ✅ **Start Services**: Launches both backend and frontend servers
- ✅ **Open Browser**: Automatically opens the application in your default browser

### Services Started
- **Backend Server**: FastAPI running on http://localhost:8000
- **Frontend Server**: React application on http://localhost:3000
- **Folder Monitor**: Automatically monitors your default folder for new files

## Manual Setup (if scripts don't work)

### Prerequisites
1. **Python 3.9+** - [Download Python](https://python.org)
2. **Node.js 16+** - [Download Node.js](https://nodejs.org)
3. **Ollama** - [Download Ollama](https://ollama.ai) and pull a model:
   ```bash
   ollama pull llama3.2:3b
   ```

### Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd localchat
npm install
npm start
```

## Stopping Services

### Windows
```batch
# Double-click or run
stop.bat
```

### Linux/macOS
```bash
./stop.sh
```

### Manual Stop
- Press `Ctrl+C` in the terminal windows
- Or kill processes manually:
  - Windows: Use Task Manager to end `python.exe` and `node.exe`
  - Linux/macOS: `pkill -f uvicorn` and `pkill -f react-scripts`

## Application URLs

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Features Available

### 🎯 Core Features
- **Document Chat**: Chat with your documents using RAG (Retrieval-Augmented Generation)
- **Real-time File Monitoring**: Automatically processes new files added to monitored folders
- **Default Folder Management**: Set and auto-start with your preferred folder
- **Source Attribution**: See which documents were used for each response

### 📁 File Monitoring
- **Supported Formats**: PDF, TXT, MD, DOCX, and more
- **Automatic Processing**: New files are processed without manual intervention
- **Real-time Status**: See processing progress in the UI

### 🔍 Search & Response
- **Document Prioritization**: Answers come from your documents first
- **Fallback to General Knowledge**: Uses model knowledge when documents don't contain the answer
- **Source Tracking**: Each response shows which files were used

## Troubleshooting

### Common Issues

#### "Python not found"
- Install Python from https://python.org
- Make sure to check "Add Python to PATH" during installation

#### "Node.js not found"
- Install Node.js from https://nodejs.org
- Restart your terminal after installation

#### "Backend not responding"
1. Check if Ollama is running: `ollama list`
2. Verify port 8000 is not in use
3. Check backend logs for errors

#### "Frontend not loading"
1. Verify port 3000 is not in use
2. Check if all Node.js dependencies installed properly
3. Try clearing browser cache

#### "Documents not being processed"
1. Check if folder monitoring is active
2. Verify file formats are supported
3. Check file permissions

### Port Conflicts
If ports 8000 or 3000 are already in use, you can change them:

**Backend (edit backend/src/app/main.py)**:
```python
# Change this line
python -m uvicorn src.app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend (edit localchat/.env)**:
```
PORT=3001
REACT_APP_API_BASE_URL=http://localhost:8001
```

### Getting Help
1. Check the terminal output for error messages
2. Verify all prerequisites are installed
3. Ensure Ollama is running and has a model installed
4. Check that your documents are in accessible folders

## Advanced Configuration

### Environment Variables
Create `.env` files for additional configuration:

**Backend (.env)**:
```
OLLAMA_BASE_URL=http://localhost:11434
VECTOR_DB_PATH=./data/chroma
UPLOAD_DIR=./uploads
```

**Frontend (.env)**:
```
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_API_TIMEOUT=30000
```

### Custom Models
To use different models with Ollama:
```bash
# Pull new models
ollama pull mistral
ollama pull codellama

# Models will be available in the frontend dropdown
```

## Development

### Project Structure
```
chat-f02e34f9/
├── backend/                 # FastAPI backend
│   ├── src/
│   │   ├── app/
│   │   │   ├── main.py     # Main FastAPI application
│   │   │   └── models.py   # Pydantic models
│   │   └── services/
│   │       ├── ollama_service.py
│   │       ├── vector_service.py
│   │       └── folder_monitor_service.py
│   └── requirements.txt
├── localchat/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── SimpleApp.tsx
│   │   └── types/
│   └── package.json
├── start.bat              # Windows startup script
├── start.sh               # Linux/macOS startup script
├── stop.bat               # Windows stop script
└── stop.sh                # Linux/macOS stop script
```

### Running in Development Mode
1. **Backend**: `cd backend && source venv/bin/activate && python -m uvicorn src.app.main:app --reload`
2. **Frontend**: `cd localchat && npm start`

Both services will auto-reload when you make changes to the code.