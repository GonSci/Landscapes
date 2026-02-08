# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
pip install -r requirements.txt
cd ..
```

### Step 2: Configure API Key

```bash
# Copy environment template
cp server/.env.example server/.env

# Edit server/.env and add your Hugging Face API key
# Get free key from: https://huggingface.co/settings/tokens
```

### Step 3: Run the Application

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd server
source venv/bin/activate
python app.py
```

### Step 4: Open Browser

Navigate to `http://localhost:3000`

## ✨ First Steps

1. **Click any location** on the Philippines map
2. **Mark it** as "Been There" or "Want to Go"
3. **Ask the AI** about the location
4. **Explore** more destinations!

## 🎯 Key Features to Try

- Click markers on the map to learn about locations
- Use the AI assistant to ask questions
- Track your visited and wishlist locations
- Discover Philippine culture and attractions

## 📝 Need Help?

Check the full [README.md](README.md) for detailed documentation.

---

**Happy Exploring!** 🇵🇭
