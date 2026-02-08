# 🇵🇭 Discover Philippines - AI Travel Guide

An interactive, AI-powered web application that helps users explore the beautiful Philippines! This application features an interactive map, AI travel assistant powered by Hugging Face, and personal travel tracking.

## 🌟 Features

### Core MVP Features ✅

- **Interactive Map of the Philippines**
  - Clickable regions, cities, and points of interest
  - Hover highlights with location information
  - Color-coded markers:
    - 🔵 Blue: Unvisited places
    - 🟢 Green: Been There
    - 🟠 Orange: Want to Go

- **User Travel Interaction**
  - Mark places as "Been There" or "Want to Go"
  - Personal travel profile with statistics
  - Track your Philippine adventures

- **AI Travel Assistant** 🤖
  - Ask questions about any Philippine location
  - Get information about culture, attractions, festivals, and local tips
  - Conversational AI powered by Hugging Face
  - Context-aware responses based on selected locations

- **Cultural & Tourism Content**
  - Descriptions and photos for each location
  - Local crafts, food, festivals, and traditions
  - Highlights for major destinations

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **CSS3** - Custom styling with modern features

### Backend
- **Python 3.9+** - Backend language
- **Flask** - Lightweight web framework
- **Flask-CORS** - Handle cross-origin requests
- **Hugging Face API** - AI model integration

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.9 or higher) - [Download](https://www.python.org/)
- **npm** or **yarn** - Package managers
- **Hugging Face Account** - [Sign up](https://huggingface.co/)

## 🛠️ Installation & Setup

### 1. Clone or Navigate to the Project

```bash
cd /Users/igondelacruz/Travel_Ai
```

### 2. Frontend Setup (React)

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

### 3. Backend Setup (Python/Flask)

```bash
# Navigate to server directory
cd server

# Create a virtual environment (recommended)
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Create .env file in the server directory
cp .env.example .env
```

Edit the `.env` file and add your Hugging Face API key:

```env
HUGGINGFACE_API_KEY=your_actual_api_key_here
FLASK_ENV=development
FLASK_DEBUG=True
```

**Getting a Hugging Face API Key:**
1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up or log in
3. Go to Settings → Access Tokens
4. Create a new token with "Read" permissions
5. Copy the token to your `.env` file

### 5. Start the Backend Server

```bash
# Make sure you're in the server directory with venv activated
python app.py
```

The backend will run on `http://localhost:5000`

## 🎮 Running the Application

### Development Mode

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd server
source venv/bin/activate  # macOS/Linux
python app.py
```

Open your browser to `http://localhost:3000`

### Production Build

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
Travel_Ai/
├── src/                          # React frontend source
│   ├── components/              # React components
│   │   ├── PhilippinesMap.jsx   # Interactive map component
│   │   ├── AIAssistant.jsx      # AI chat interface
│   │   ├── UserProfile.jsx      # User travel profile
│   │   └── LocationModal.jsx    # Location details modal
│   ├── data/                    # Static data
│   │   └── philippines_locations.json
│   ├── App.jsx                  # Main app component
│   ├── App.css                  # Main app styles
│   ├── main.jsx                 # React entry point
│   └── index.css                # Global styles
├── server/                      # Python Flask backend
│   ├── app.py                  # Flask application
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example           # Environment template
│   └── .env                   # Your API keys (gitignored)
├── public/                     # Static assets
│   ├── assets/
│   │   └── images/            # Location images
│   ├── css/
│   └── js/
├── index.html                 # HTML entry point
├── package.json              # Node.js dependencies
├── vite.config.js           # Vite configuration
└── README.md                # This file
```

## 🎯 How to Use

1. **Explore the Map**
   - Click on any location marker on the Philippines map
   - A modal will appear with location details

2. **Mark Your Travels**
   - Click "✅ Been There" if you've visited
   - Click "⭐ Want to Go" to add to wishlist
   - View your stats in the profile sidebar

3. **Ask the AI**
   - Click "🤖 Ask AI" to chat about a location
   - Or click "Open AI Assistant" in the sidebar
   - Ask about culture, food, festivals, or travel tips

4. **Track Progress**
   - View visited locations (green markers)
   - See wishlist locations (orange markers)
   - Check your travel statistics

## 🔑 API Endpoints

### Backend API Routes

- `GET /api/health` - Health check
- `POST /api/chat` - AI chat interaction
  ```json
  {
    "message": "Tell me about Boracay",
    "location": "Boracay"
  }
  ```
- `GET /api/profile?user_id=xxx` - Get user profile
- `POST /api/profile?user_id=xxx` - Update user profile

## 🌐 Featured Locations

Currently includes 10+ major destinations:
- Manila (National Capital)
- Cebu City (Queen City of the South)
- Boracay (Beach Paradise)
- Palawan/El Nido (Island Paradise)
- Davao City (Mindanao's Largest)
- Baguio (Summer Capital)
- Vigan (Colonial Heritage)
- Siargao (Surfing Capital)
- Chocolate Hills (Natural Wonder)
- Mayon Volcano (Perfect Cone)

## 🎨 Customization

### Adding New Locations

Edit `src/data/philippines_locations.json`:

```json
{
  "id": "unique-id",
  "name": "Location Name",
  "region": "Region Name",
  "x": 400,
  "y": 500,
  "description": "Description text",
  "highlights": ["Highlight 1", "Highlight 2"],
  "image": "/assets/images/location.jpg"
}
```

### Changing AI Model

Edit `server/app.py` to use a different Hugging Face model:

```python
HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/YOUR_MODEL"
```

## 🐛 Troubleshooting

### Common Issues

**Frontend won't start:**
- Run `npm install` again
- Check Node.js version: `node --version` (should be 18+)
- Delete `node_modules` and reinstall

**Backend errors:**
- Verify Python version: `python3 --version` (should be 3.9+)
- Check if virtual environment is activated
- Verify `.env` file has correct API key
- Install dependencies: `pip install -r requirements.txt`

**AI not responding:**
- Check Hugging Face API key in `.env`
- Verify backend server is running on port 5000
- Check browser console for CORS errors
- Hugging Face model might be loading (wait 30 seconds and retry)

**CORS errors:**
- Ensure backend is running
- Check Flask-CORS is installed
- Verify frontend is calling `http://localhost:5000`

## 🚀 Future Enhancements

### Phase 2 Features
- User authentication and cloud storage
- Real-time weather data integration
- Photo upload and sharing
- Travel itinerary planner
- Social features (share trips, recommendations)

### Phase 3 Features
- Mobile app (React Native)
- Offline mode with cached data
- AR features for on-location experiences
- Integration with booking platforms
- Multi-language support

## 🤝 Contributing

This is a hackathon project. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available for educational purposes.

## 🙏 Acknowledgments

- **Hugging Face** - AI model hosting
- **Philippines Tourism** - Cultural information
- **React Community** - Frontend framework
- **Flask Community** - Backend framework

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ for the Philippines** 🇵🇭

**Mabuhay!** (Welcome!)
