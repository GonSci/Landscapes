# 🔧 AI Agent Not Working - Solution Guide

## Problem: "Sorry, I encountered an error. Please try again."

This error means the **backend server is not running** or the frontend can't connect to it.

## ✅ SOLUTION: Start the Backend Server

### Quick Fix (Do This Now):

Open a **NEW terminal window** and run:

```bash
cd /Users/igondelacruz/Travel_Ai/server
source venv/bin/activate
python app.py
```

**Keep this terminal open!** The server must stay running.

You should see:
```
Starting Travel AI Flask Server...
Server running on http://localhost:5001
* Serving Flask app 'app'
* Debug mode: on
* Running on http://127.0.0.1:5001
```

## Alternative: Use the Helper Script

```bash
cd /Users/igondelacruz/Travel_Ai
./start-backend.sh
```

**Keep this terminal running!**

## How to Run the Complete App

You need **TWO terminals running simultaneously**:

### Terminal 1 - Backend Server
```bash
cd /Users/igondelacruz/Travel_Ai/server
source venv/bin/activate
python app.py
```
✅ Leave this running!

### Terminal 2 - Frontend Server  
```bash
cd /Users/igondelacruz/Travel_Ai
npm run dev
```
✅ Leave this running too!

## Testing the Backend

Once the backend is running, test it:

```bash
# In a NEW terminal (Terminal 3)
curl http://localhost:5001/api/health
```

Expected response:
```json
{"status":"healthy","message":"Travel AI API is running"}
```

## Test the Chat API

```bash
curl -X POST http://localhost:5001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","location":null}'
```

You should get a response from the AI!

## Why This Happens

The AI agent needs the backend server to:
1. Receive your message from the frontend
2. Send it to Hugging Face API
3. Get the AI response
4. Send it back to the frontend

If the backend isn't running → The frontend can't connect → You get the error!

## Visual Setup

```
┌──────────────────────────────────┐
│   Terminal 1: Backend (5001)    │  ← MUST BE RUNNING!
│   python app.py                  │
└──────────────────────────────────┘
              ↕
┌──────────────────────────────────┐
│   Terminal 2: Frontend (3000)   │  ← MUST BE RUNNING!
│   npm run dev                    │
└──────────────────────────────────┘
              ↕
┌──────────────────────────────────┐
│   Browser: localhost:3000        │  ← You use this
│   Your Travel AI App              │
└──────────────────────────────────┘
```

## Checklist

Before trying the AI again:

- [ ] Terminal 1 running with: `python app.py`
- [ ] Terminal 2 running with: `npm run dev`
- [ ] Backend shows: "Running on http://127.0.0.1:5001"
- [ ] Frontend shows: "Local: http://localhost:3000"
- [ ] Browser open to: http://localhost:3000
- [ ] Tested backend: `curl http://localhost:5001/api/health` works

## Common Mistakes

### ❌ Mistake 1: Starting only the frontend
**Fix:** You need BOTH frontend AND backend running!

### ❌ Mistake 2: Closing the terminal
**Fix:** Keep both terminals open while using the app!

### ❌ Mistake 3: Wrong directory
**Fix:** Make sure you're in `/Users/igondelacruz/Travel_Ai/server` when running the backend!

## Complete Restart

If you're confused, here's a clean restart:

1. **Close everything** (all terminals, close browser)

2. **Open Terminal 1** (Backend):
```bash
cd /Users/igondelacruz/Travel_Ai/server
source venv/bin/activate
python app.py
```
Wait for: "Running on http://127.0.0.1:5001"

3. **Open Terminal 2** (Frontend):
```bash
cd /Users/igondelacruz/Travel_Ai
npm run dev
```
Wait for: "Local: http://localhost:3000"

4. **Open browser** to: http://localhost:3000

5. **Try the AI** - Click a location, click "Ask AI", type a message!

## Still Not Working?

Check these:

### 1. Backend Terminal Errors?
Look for error messages in Terminal 1. Common issues:
- Missing API key → Check `server/.env` has your Hugging Face key
- Port in use → Use port 5002 instead (edit `app.py`)

### 2. Frontend Console Errors?
Open browser DevTools (F12), check Console tab:
- CORS errors → Backend not running
- Network errors → Backend not on port 5001
- 404 errors → Wrong API URL

### 3. API Key Issues?
```bash
# Check your .env file
cat /Users/igondelacruz/Travel_Ai/server/.env

# Should show:
# HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
```

## Expected Behavior

When working correctly:

1. You type "Tell me about Manila" in the AI chat
2. Backend receives the message
3. Backend calls Hugging Face API
4. AI generates response (takes 5-20 seconds)
5. Response appears in chat

**First message may take 20-30 seconds** (model loading)

## Quick Commands Reference

```bash
# Start backend
cd /Users/igondelacruz/Travel_Ai/server && source venv/bin/activate && python app.py

# Start frontend
cd /Users/igondelacruz/Travel_Ai && npm run dev

# Test backend
curl http://localhost:5001/api/health

# Check what's running on port 5001
lsof -ti:5001

# Kill process on port 5001 (if needed)
kill -9 $(lsof -ti:5001)
```

---

## ✅ Final Step

**Right now, open a terminal and run:**

```bash
cd /Users/igondelacruz/Travel_Ai/server
source venv/bin/activate
python app.py
```

**Keep it running, then try the AI again!** 🚀

The AI will work once the backend is running! 🎉
