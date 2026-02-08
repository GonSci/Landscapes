# 📋 Setup Checklist for Travel AI

Use this checklist to ensure your project is set up correctly for the hackathon!

## ✅ Pre-Setup Requirements

- [ ] Node.js installed (v18+)
  - Check: `node --version`
  - Download: https://nodejs.org/

- [ ] Python installed (v3.9+)
  - Check: `python3 --version`
  - Download: https://www.python.org/

- [ ] Hugging Face account created
  - Sign up: https://huggingface.co/
  - Get API key: https://huggingface.co/settings/tokens

## ✅ Installation Steps

### Frontend Setup
- [ ] Navigate to project directory
- [ ] Run `npm install`
- [ ] Verify `node_modules` folder created
- [ ] Check `package.json` exists

### Backend Setup
- [ ] Navigate to `server` directory
- [ ] Create virtual environment: `python3 -m venv venv`
- [ ] Activate virtual environment:
  - macOS/Linux: `source venv/bin/activate`
  - Windows: `venv\Scripts\activate`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Verify no error messages

### Environment Configuration
- [ ] Copy `.env.example` to `.env` in server directory
- [ ] Open `server/.env` file
- [ ] Add your Hugging Face API key
- [ ] Save the file

## ✅ Testing Your Setup

### Test Frontend
- [ ] Run `npm run dev`
- [ ] Check console for errors
- [ ] Open http://localhost:3000
- [ ] Verify page loads with map interface

### Test Backend
- [ ] In new terminal, activate venv
- [ ] Run `python app.py` from server directory
- [ ] Check for "Running on http://localhost:5000"
- [ ] Verify no error messages about missing API key

### Test Integration
- [ ] With both servers running
- [ ] Click on a location in the map
- [ ] Click "Ask AI" button
- [ ] Type a question about Philippines
- [ ] Verify AI responds (might take 10-20 seconds first time)

## ✅ Project Structure Verification

Check that these files exist:

### Root Directory
- [ ] `package.json`
- [ ] `vite.config.js`
- [ ] `index.html`
- [ ] `README.md`
- [ ] `.gitignore`
- [ ] `start.sh` (macOS/Linux)
- [ ] `start.bat` (Windows)

### src/ Directory
- [ ] `src/App.jsx`
- [ ] `src/main.jsx`
- [ ] `src/App.css`
- [ ] `src/index.css`
- [ ] `src/components/PhilippinesMap.jsx`
- [ ] `src/components/AIAssistant.jsx`
- [ ] `src/components/UserProfile.jsx`
- [ ] `src/components/LocationModal.jsx`
- [ ] `src/data/philippines_locations.json`

### server/ Directory
- [ ] `server/app.py`
- [ ] `server/requirements.txt`
- [ ] `server/.env.example`
- [ ] `server/.env` (your created file)

## ✅ Hackathon Presentation Prep

- [ ] Test all core features work
- [ ] Prepare demo script
- [ ] Take screenshots of key features
- [ ] List technical stack clearly
- [ ] Prepare 2-3 minute pitch
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Have backup API key ready

## 🐛 Common Issues & Solutions

### Issue: "npm: command not found"
**Solution:** Install Node.js from nodejs.org

### Issue: "python3: command not found"
**Solution:** Install Python from python.org

### Issue: AI not responding
**Solutions:**
- Verify Hugging Face API key is correct
- Check backend is running on port 5000
- Wait 20-30 seconds for model to load first time
- Check browser console for errors

### Issue: CORS errors in browser
**Solutions:**
- Ensure backend is running
- Check both servers are on correct ports
- Restart both servers

### Issue: Port already in use
**Solutions:**
- Kill existing processes on ports 3000 or 5000
- Change ports in configuration files

## 🎯 Quick Start Commands

### Option 1: Use Startup Scripts (Recommended)
```bash
# macOS/Linux
./start.sh

# Windows
start.bat
```

### Option 2: Manual Start
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd server
source venv/bin/activate  # or venv\Scripts\activate on Windows
python app.py
```

## 📊 Feature Testing Checklist

- [ ] Map loads with Philippines outline
- [ ] Location markers are visible and clickable
- [ ] Clicking marker opens modal with location info
- [ ] "Been There" button marks location green
- [ ] "Want to Go" button marks location orange
- [ ] User profile shows visit count
- [ ] AI Assistant opens and displays
- [ ] Can send message to AI
- [ ] AI responds with relevant information
- [ ] Location colors persist during session

## 🎉 Ready to Demo!

Once all items are checked, you're ready for the hackathon!

**Good luck and Mabuhay!** 🇵🇭

---

**Need Help?**
- Check README.md for detailed documentation
- Review QUICKSTART.md for quick reference
- Check browser console for error messages
- Verify all dependencies installed correctly
