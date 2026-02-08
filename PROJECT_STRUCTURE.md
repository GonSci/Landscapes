# 📂 Complete Project Structure

```
Travel_Ai/
│
├── 📄 README.md                      # Complete project documentation
├── 📄 QUICKSTART.md                  # 5-minute setup guide
├── 📄 SETUP_CHECKLIST.md             # Step-by-step setup verification
├── 📄 PROJECT_SUMMARY.md             # Hackathon overview & tips
├── 📄 DEVELOPMENT_TIPS.md            # Development best practices
├── 📄 .gitignore                     # Git ignore rules
├── 📄 package.json                   # Node.js dependencies
├── 📄 vite.config.js                 # Vite configuration
├── 📄 index.html                     # HTML entry point
├── 🔧 start.sh                       # Startup script (macOS/Linux)
├── 🔧 start.bat                      # Startup script (Windows)
│
├── 📁 src/                           # React Frontend Source
│   ├── 📄 main.jsx                   # React entry point
│   ├── 📄 App.jsx                    # Main app component
│   ├── 📄 App.css                    # Main app styles
│   ├── 📄 index.css                  # Global styles
│   │
│   ├── 📁 components/                # React Components
│   │   ├── 📄 PhilippinesMap.jsx    # Interactive map component
│   │   ├── 📄 PhilippinesMap.css    # Map styles
│   │   ├── 📄 AIAssistant.jsx       # AI chat interface
│   │   ├── 📄 AIAssistant.css       # AI chat styles
│   │   ├── 📄 UserProfile.jsx       # User profile & stats
│   │   ├── 📄 UserProfile.css       # Profile styles
│   │   ├── 📄 LocationModal.jsx     # Location details popup
│   │   └── 📄 LocationModal.css     # Modal styles
│   │
│   └── 📁 data/                      # Static Data
│       └── 📄 philippines_locations.json  # Location database
│
├── 📁 public/                        # Static Assets
│   ├── 📄 index.html                 # Alternative HTML (if needed)
│   ├── 📄 ph-flag.svg                # Philippine flag icon
│   │
│   └── 📁 assets/
│       └── 📁 images/                # Location Images
│           └── 📄 README.md          # Image guide
│
├── 📁 server/                        # Python Flask Backend
│   ├── 📄 app.py                     # Flask application & API
│   ├── 📄 requirements.txt           # Python dependencies
│   ├── 📄 .env.example               # Environment template
│   └── 📄 .env                       # Your API keys (create this)
│
└── 📁 data/                          # Additional data (optional)
```

## 📊 File Count Summary

### Frontend (React)
- **Components:** 4 main components (8 files with CSS)
- **Core Files:** 4 files (App.jsx, main.jsx, CSS files)
- **Data:** 1 JSON file
- **Total:** ~13 files

### Backend (Python)
- **API Server:** 1 file (app.py)
- **Config:** 2 files (requirements.txt, .env.example)
- **Total:** 3 files

### Configuration & Scripts
- **Package managers:** 1 file (package.json)
- **Build tools:** 1 file (vite.config.js)
- **Entry point:** 1 file (index.html)
- **Scripts:** 2 files (start.sh, start.bat)
- **Git:** 1 file (.gitignore)
- **Total:** 6 files

### Documentation
- **Main docs:** 5 markdown files
- **Image guide:** 1 markdown file
- **Total:** 6 files

### Static Assets
- **Icons:** 1 file (ph-flag.svg)
- **Images:** 0-11 files (to be added)

## 🎯 Core Architecture

```
┌─────────────────────────────────────────┐
│         Browser (localhost:3000)         │
│  ┌────────────────────────────────────┐ │
│  │         React Frontend              │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │  App.jsx (Main Container)    │  │ │
│  │  │                               │  │ │
│  │  │  ┌────────────────────────┐  │  │ │
│  │  │  │  PhilippinesMap        │  │  │ │
│  │  │  │  (Interactive Map)     │  │  │ │
│  │  │  └────────────────────────┘  │  │ │
│  │  │                               │  │ │
│  │  │  ┌────────────────────────┐  │  │ │
│  │  │  │  LocationModal         │  │  │ │
│  │  │  │  (Location Details)    │  │  │ │
│  │  │  └────────────────────────┘  │  │ │
│  │  │                               │  │ │
│  │  │  ┌────────────────────────┐  │  │ │
│  │  │  │  AIAssistant           │  │  │ │
│  │  │  │  (Chat Interface)      │  │  │ │
│  │  │  └────────────────────────┘  │  │ │
│  │  │                               │  │ │
│  │  │  ┌────────────────────────┐  │  │ │
│  │  │  │  UserProfile           │  │  │ │
│  │  │  │  (Stats & History)     │  │  │ │
│  │  │  └────────────────────────┘  │  │ │
│  │  └──────────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    ↕
          HTTP Requests (fetch API)
                    ↕
┌─────────────────────────────────────────┐
│       Flask Server (localhost:5000)     │
│  ┌────────────────────────────────────┐ │
│  │         Backend API                 │ │
│  │                                     │ │
│  │  /api/health   - Health check      │ │
│  │  /api/chat     - AI conversations  │ │
│  │  /api/profile  - User data         │ │
│  │  /api/locations - Location data    │ │
│  │                                     │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    ↕
          HTTPS API Calls
                    ↕
┌─────────────────────────────────────────┐
│       Hugging Face API                  │
│   (Mistral-7B-Instruct-v0.2)           │
│                                         │
│   AI Model for Travel Assistance       │
└─────────────────────────────────────────┘
```

## 🔄 Data Flow

```
User Action → React Component → State Update → Re-render
     ↓
User clicks "Ask AI"
     ↓
AIAssistant.jsx sends POST to /api/chat
     ↓
Flask app.py receives request
     ↓
Flask calls Hugging Face API
     ↓
AI generates response
     ↓
Flask returns JSON response
     ↓
React updates UI with AI message
```

## 🎨 Component Hierarchy

```
App.jsx (Root)
├── PhilippinesMap.jsx
│   └── Location markers (SVG)
│
├── UserProfile.jsx
│   ├── Avatar
│   ├── AI Toggle Button
│   ├── Been There List
│   ├── Want to Go List
│   └── Travel Stats
│
├── AIAssistant.jsx (conditional)
│   ├── Header with close button
│   ├── Messages Container
│   │   ├── User messages
│   │   └── AI messages
│   └── Input Container
│       ├── Textarea
│       └── Send button
│
└── LocationModal.jsx (conditional)
    ├── Header (name, region)
    ├── Image
    ├── Description
    ├── Highlights
    └── Action Buttons
        ├── Been There
        ├── Want to Go
        └── Ask AI
```

## 🔌 API Endpoints Detail

```
GET /api/health
Response: { status: "healthy", message: "..." }
Purpose: Check if backend is running

POST /api/chat
Request: { message: "...", location: "..." }
Response: { response: "AI generated text" }
Purpose: Get AI travel advice

GET /api/profile?user_id=xxx
Response: { beenThere: [...], wantToGo: [...] }
Purpose: Retrieve user travel data

POST /api/profile?user_id=xxx
Request: { beenThere: [...], wantToGo: [...] }
Response: { message: "...", profile: {...} }
Purpose: Save user travel data
```

## 💾 Data Structure

### Location Object
```json
{
  "id": "unique-identifier",
  "name": "Location Name",
  "region": "Region Name",
  "x": 400,           // SVG x coordinate
  "y": 500,           // SVG y coordinate
  "description": "Long description...",
  "highlights": ["Item 1", "Item 2"],
  "image": "/path/to/image.jpg"
}
```

### User Profile
```json
{
  "beenThere": ["location-id-1", "location-id-2"],
  "wantToGo": ["location-id-3", "location-id-4"]
}
```

## 🚀 Startup Sequence

1. User runs `./start.sh` or `start.bat`
2. Script checks for dependencies
3. Creates virtual environment (if needed)
4. Installs packages (if needed)
5. Checks for .env file
6. Starts Flask backend (port 5000)
7. Starts Vite dev server (port 3000)
8. Opens browser automatically
9. User can start exploring!

## 📦 Dependencies

### Frontend (package.json)
- react: ^18.2.0
- react-dom: ^18.2.0
- vite: ^5.0.8
- @vitejs/plugin-react: ^4.2.1

### Backend (requirements.txt)
- flask: 3.0.0
- flask-cors: 4.0.0
- python-dotenv: 1.0.0
- requests: 2.31.0
- gunicorn: 21.2.0

## 🎓 Key Technologies

| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| React | Frontend UI | Modern, component-based, fast |
| Vite | Build tool | Lightning fast, modern DX |
| Flask | Backend API | Lightweight, Python-based |
| Hugging Face | AI Model | Free tier, powerful models |
| CSS3 | Styling | Custom, no framework overhead |

---

## 📈 Project Statistics

- **Total Files:** ~30 files
- **Lines of Code:** ~2,500+ lines
- **Components:** 4 main React components
- **API Endpoints:** 4 routes
- **Locations:** 10+ Philippine destinations
- **Setup Time:** 5-10 minutes
- **Development Time:** Structured for rapid development

---

**This structure is optimized for:**
✅ Easy understanding
✅ Quick setup
✅ Hackathon presentation
✅ Future scalability
✅ Team collaboration

**Ready to build something amazing! 🚀🇵🇭**
