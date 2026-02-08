# 💡 Development Tips & Best Practices

## 🎯 Quick Reference

### Common Commands

```bash
# Frontend Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Backend Development
python app.py        # Start Flask server
pip install -r requirements.txt  # Install dependencies
pip freeze > requirements.txt    # Update dependencies

# Easy Start (Both servers)
./start.sh          # macOS/Linux
start.bat           # Windows
```

### Port Configuration

- **Frontend:** `http://localhost:3000`
- **Backend:** `http://localhost:5000`
- **API Base URL:** `http://localhost:5000/api`

## 🔧 Development Workflow

### Making Changes to Frontend

1. Edit React components in `src/components/`
2. Save file (Vite hot-reloads automatically)
3. Check browser for changes
4. Check console for errors

### Making Changes to Backend

1. Edit `server/app.py`
2. Save file
3. Restart Flask server (Ctrl+C, then `python app.py`)
4. Test API endpoint in browser or Postman

### Adding New Locations

1. Edit `src/data/philippines_locations.json`
2. Add new location object with required fields
3. Reload frontend to see changes
4. Add corresponding image to `/public/assets/images/`

## 🐛 Debugging Tips

### Frontend Issues

**React Component Not Showing:**
- Check browser console for errors
- Verify import paths are correct
- Check component is exported/imported properly
- Verify props are being passed correctly

**Styling Issues:**
- Check CSS file is imported in component
- Inspect element in browser DevTools
- Verify class names match CSS file
- Check for typos in className props

**Map Not Loading:**
- Check `philippines_locations.json` is valid JSON
- Verify x,y coordinates are within viewBox
- Check SVG viewBox dimensions in PhilippinesMap.jsx

### Backend Issues

**Flask Won't Start:**
- Check Python version: `python3 --version`
- Verify virtual environment is activated
- Check for syntax errors in app.py
- Ensure port 5000 is not in use

**AI Not Responding:**
- Verify HUGGINGFACE_API_KEY in .env
- Check backend console for error messages
- Test API directly: `http://localhost:5000/api/health`
- Wait 20-30 seconds for first response (model loading)

**CORS Errors:**
- Verify Flask-CORS is installed: `pip list | grep Flask-CORS`
- Check CORS(app) is called in app.py
- Ensure frontend uses correct backend URL

## 🎨 Customization Guide

### Changing Colors

**Main Theme Colors (App.css):**
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

**Location Marker Colors (PhilippinesMap.jsx):**
```javascript
return '#10b981'; // Green - Been there
return '#f59e0b'; // Orange - Want to go
return '#3b82f6'; // Blue - Default
```

### Changing AI Model

In `server/app.py`:
```python
HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/YOUR_MODEL"
```

**Recommended Models:**
- `mistralai/Mistral-7B-Instruct-v0.2` (current)
- `meta-llama/Llama-2-7b-chat-hf`
- `google/flan-t5-large`
- `EleutherAI/gpt-neo-2.7B`

### Adding More Features

**New Component:**
1. Create `src/components/YourComponent.jsx`
2. Create `src/components/YourComponent.css`
3. Import in `App.jsx`
4. Add to render method

**New API Endpoint:**
1. Add route in `server/app.py`
2. Test with Postman or browser
3. Call from React component using fetch

## 📊 Performance Tips

### Frontend Optimization

- Use React.memo for components that don't change often
- Lazy load images with loading="lazy"
- Minimize component re-renders
- Use production build for deployment: `npm run build`

### Backend Optimization

- Cache AI responses for common questions
- Add rate limiting for API calls
- Use database for user profiles (not in-memory)
- Implement request timeout handling

### API Rate Limits

**Hugging Face Free Tier:**
- ~1000 requests per month
- Rate limited after certain threshold
- First request may take 20-30 seconds (cold start)

**Solutions:**
- Cache common responses
- Implement fallback responses
- Use inference endpoint for faster responses (paid)

## 🧪 Testing Strategies

### Manual Testing Checklist

**Frontend:**
- [ ] Click each map marker
- [ ] Test "Been There" button
- [ ] Test "Want to Go" button
- [ ] Open AI assistant
- [ ] Send AI message
- [ ] Check profile updates
- [ ] Test on mobile view (resize browser)

**Backend:**
- [ ] Visit http://localhost:5000/api/health
- [ ] Test chat endpoint with Postman
- [ ] Check console for errors
- [ ] Verify AI responses are relevant

**Integration:**
- [ ] Frontend connects to backend
- [ ] AI responses appear in chat
- [ ] Profile data persists during session
- [ ] No CORS errors in console

### Browser Testing

Test on multiple browsers:
- Chrome (primary)
- Firefox
- Safari
- Mobile Safari (iOS)
- Mobile Chrome (Android)

## 📱 Mobile Responsiveness

Current breakpoint:
```css
@media (max-width: 1024px) {
  /* Mobile styles */
}
```

**Mobile Testing:**
- Use browser DevTools device emulation
- Test on actual mobile device if possible
- Check touch interactions work
- Verify text is readable
- Ensure buttons are tappable (min 44x44px)

## 🚀 Deployment Tips

### Frontend Deployment (Vercel/Netlify)

1. Build: `npm run build`
2. Deploy `dist` folder
3. Set environment variables (if any)
4. Update API URL to production backend

### Backend Deployment (Heroku/Render)

1. Add `Procfile`: `web: gunicorn app:app`
2. Update CORS to allow production frontend URL
3. Set environment variables (API keys)
4. Use production-grade server (gunicorn)

### Environment Variables

**Production:**
- Never commit .env file
- Use platform-specific environment variable settings
- Update API URLs to production endpoints
- Enable production mode in Flask

## 🔒 Security Best Practices

1. **Never commit API keys** - Use .env file
2. **Validate user input** - Sanitize before processing
3. **Use HTTPS** in production
4. **Implement rate limiting** - Prevent abuse
5. **Add authentication** for user profiles (Phase 2)

## 💾 Data Persistence

### Current (Session-based)
- Data stored in memory
- Lost on page refresh
- Good for demo/hackathon

### Future (Production)
- Use localStorage for client-side
- Add database for server-side
- Implement user authentication
- Sync data across devices

## 🎓 Learning Resources

### React
- Official Docs: https://react.dev
- React Patterns: https://reactpatterns.com

### Flask
- Official Docs: https://flask.palletsprojects.com
- Flask Mega-Tutorial: https://blog.miguelgrinberg.com

### Hugging Face
- Documentation: https://huggingface.co/docs
- Models: https://huggingface.co/models

## 🤝 Collaboration Tips

### Git Workflow (if using version control)

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add feature description"

# Push to remote
git push origin feature/your-feature

# Create pull request on GitHub
```

### Code Review Checklist

- [ ] Code follows project structure
- [ ] No console.log statements left
- [ ] CSS is organized and commented
- [ ] Functions have clear names
- [ ] No duplicate code
- [ ] Error handling implemented

## 📈 Analytics & Monitoring

For production deployment, consider:
- Google Analytics for usage tracking
- Sentry for error monitoring
- LogRocket for session replay
- Backend logging for API calls

## 🎉 Demo Day Preparation

**Day Before:**
- [ ] Test entire application flow
- [ ] Charge laptop fully
- [ ] Download offline copy of docs
- [ ] Prepare backup demo video
- [ ] Test on presentation screen if possible

**Demo Day:**
- [ ] Arrive early to set up
- [ ] Test internet connection
- [ ] Start servers 10 minutes before
- [ ] Have backup hotspot ready
- [ ] Clear browser cache
- [ ] Close unnecessary tabs/apps

## 🆘 Emergency Fixes

**If AI stops working during demo:**
- Fallback responses are built-in
- Show how it works with sample questions
- Explain the technology even without live demo

**If internet fails:**
- Application still works (map, tracking)
- AI has fallback responses
- Can demo offline features

**If laptop crashes:**
- Have backup laptop ready
- Or switch to presentation slides
- Or demo on phone (if mobile-responsive)

---

**Remember:** The goal is to learn and showcase your skills. Don't stress about perfection—focus on demonstrating the core features and your technical understanding!

**Good luck! 🚀**
