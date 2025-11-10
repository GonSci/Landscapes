import React, { useState, useEffect, useRef } from 'react';
import './AIAssistant.css';

const AIAssistant = ({ selectedLocation, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Enhanced welcome message with safety info
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg = selectedLocation
        ? `Hello! I'm your AI travel assistant with built-in safety features. 🇵🇭\n\nI can help you with:\n\n🗺️ Information about ${selectedLocation.name}\n🆘 Emergency contacts & safety tips\n👩 Women & solo traveler safety\n♿ Accessibility information\n🏥 Find nearest hospitals\n📞 Crisis hotlines\n🌈 LGBTQ+ travel tips\n\nJust ask me anything, or say "emergency" for immediate help!`
        : `**Hello! I'm your AI travel assistant for the Philippines with comprehensive safety features!** 🇵🇭\n\n**I can help you with:**\n\n🆘 **Emergency Help** - Say "emergency" for immediate assistance\n🏥 **Medical Support** - Find nearest hospitals\n👩 **Women Safety** - Solo female traveler tips & hotlines\n♿ **Accessibility** - Special needs information\n🌈 **LGBTQ+ Resources** - Safe spaces & support\n📞 **Crisis Hotlines** - Mental health, abuse, trafficking\n🗺️ **Travel Info** - Any location in the Philippines\n\n**You can type or use voice input (🎤) for hands-free assistance!**`;
      
      setMessages([{
        role: 'assistant',
        content: welcomeMsg
      }]);
    }
  }, [selectedLocation, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedLocation) {
      setInput(`Tell me about ${selectedLocation.name}`);
    }
  }, [selectedLocation]);

  // Text-to-Speech function
  const speakText = (text) => {
    if ('speechSynthesis' in window && voiceEnabled) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Start voice recognition
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Stop voice recognition
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Enhanced safety responses
  const getSafetyResponse = (message) => {
    const lowerMessage = message.toLowerCase();

    // Emergency keywords
    if (lowerMessage.includes('emergency') || lowerMessage.includes('help me') || lowerMessage.includes('urgent')) {
      return `🚨 **EMERGENCY ASSISTANCE**\n\n**Call immediately:**\n📞 **911** - National Emergency Hotline\n🚓 **117** - Police\n🚑 **911** - Ambulance\n🔥 **160** - Fire Department\n\n**Tourist Police:** (02) 524-1660\n**24/7 Tourist Hotline:** 1-800-10-5355\n\n📍 Share your location with emergency services\n🏥 Say "hospital" to find nearest medical facility\n💬 Say "crisis hotline" for mental health support\n\n**You are not alone. Help is available 24/7.**`;
    }

    // Women safety
    if (lowerMessage.includes('women') || lowerMessage.includes('female') || lowerMessage.includes('solo') || lowerMessage.includes('safety tip')) {
      return `👩 **WOMEN & SOLO TRAVELER SAFETY**\n\n**Emergency Hotlines:**\n📞 **1-800-10-5355** - Women's Crisis Hotline (24/7)\n📞 **(02) 8734-3449** - Gender-Based Violence Hotline\n📞 **177** - National Anti-Trafficking Hotline\n📞 **(02) 410-3213** - Women & Children Protection\n\n**Safety Tips:**\n✅ Share your location with trusted contacts\n✅ Use official transportation (Grab, metered taxis)\n✅ Stay in well-lit, populated areas after dark\n✅ Keep emergency contacts saved offline\n✅ Dress modestly in rural/religious areas\n✅ Trust your instincts - if uncomfortable, leave\n✅ Book accommodations with 24/7 security\n✅ Avoid isolated beaches/trails alone\n\n**Safe Zones:** Manila, Makati, BGC, Boracay tourist areas\n\nNeed specific location safety info? Just ask!`;
    }

    // Hospital/medical
    if (lowerMessage.includes('hospital') || lowerMessage.includes('doctor') || lowerMessage.includes('medical') || lowerMessage.includes('clinic')) {
      return `🏥 **MEDICAL ASSISTANCE**\n\n**Emergency Medical:**\n📞 **911** - Ambulance/Emergency\n📞 **143** - Philippine Red Cross\n\n**Major Hospitals (Metro Manila):**\n🏥 Philippine General Hospital - (02) 8554-8400\n🏥 St. Luke's Medical Center - (02) 8789-7700\n🏥 Makati Medical Center - (02) 8888-8999\n🏥 Manila Doctors Hospital - (02) 8558-0888\n\n**For Tourists:**\n🏥 Tourist Medical Assistance: 1-800-10-5355\n\n💡 **Tips:**\n- Keep travel insurance details handy\n- Know your blood type\n- Carry medication prescriptions\n- Save hospital addresses offline\n\n**Need directions to nearest hospital? I can help locate one near you!**`;
    }

    // Accessibility
    if (lowerMessage.includes('accessibility') || lowerMessage.includes('wheelchair') || lowerMessage.includes('disability') || lowerMessage.includes('special needs')) {
      return `♿ **ACCESSIBILITY INFORMATION**\n\n**Accessible Features:**\n✅ Voice input/output for navigation\n✅ Screen reader compatible\n✅ High contrast mode available\n✅ Wheelchair-accessible route planning\n✅ Text size adjustment\n\n**Accessible Destinations:**\n🏛️ Intramuros (Manila) - wheelchair ramps\n🏨 Most major hotels in Manila, Cebu, Boracay\n🏖️ Boracay - accessible beach areas\n🛫 NAIA airports - wheelchair assistance\n\n**Support Services:**\n📞 **NCDA Hotline:** (02) 8876-6228\n(National Council on Disability Affairs)\n\n**Accessibility Needs:**\n- Wheelchair rental services available in major cities\n- Request assistance at airports/hotels in advance\n- Manila has accessible public transport (some routes)\n\n**Want specific accessibility info for a location? Just ask!**`;
    }

    // LGBTQ+
    if (lowerMessage.includes('lgbtq') || lowerMessage.includes('gay') || lowerMessage.includes('lesbian') || lowerMessage.includes('transgender') || lowerMessage.includes('pride')) {
      return `🌈 **LGBTQ+ TRAVEL RESOURCES**\n\n**LGBTQ+ Friendly Destinations:**\n🏳️‍🌈 Manila (Malate, Poblacion)\n🏳️‍🌈 Makati (Poblacion nightlife)\n🏳️‍🌈 Boracay (beach parties)\n🏳️‍🌈 Puerto Galera (inclusive resorts)\n🏳️‍🌈 Cebu City\n\n**Support Organizations:**\n📞 Philippine LGBT Chamber of Commerce\n📞 LGBTQ+ Crisis Hotline: Check local resources\n\n**Safety Tips:**\n✅ Philippines is generally LGBTQ+ friendly\n✅ Manila & tourist areas very accepting\n✅ Rural areas may be more conservative\n✅ Public displays of affection vary by area\n✅ Legal protections improving but vary by city\n\n**Events:**\n🎉 Manila Pride (June)\n🎉 Cebu Pride\n\n**Need recommendations for LGBTQ+ friendly hotels/venues? Ask away!**`;
    }

    // Mental health/crisis
    if (lowerMessage.includes('mental health') || lowerMessage.includes('depression') || lowerMessage.includes('anxiety') || lowerMessage.includes('crisis') || lowerMessage.includes('suicide')) {
      return `💚 **MENTAL HEALTH SUPPORT**\n\n**24/7 Crisis Hotlines:**\n📞 **National Mental Health Crisis Hotline:**\n   - 0917-899-8727 (USAP)\n   - 0918-889-8727 (USAP)\n\n📞 **In Touch Crisis Line:**\n   - (02) 8893-7603\n   - 0917-800-1123 / 0922-893-8944\n\n📞 **Natasha Goulbourn Foundation:**\n   - 0917-558-4673 (HOPE)\n\n**You Are Not Alone:**\n🤗 Your mental health matters\n🤗 It's okay to ask for help\n🤗 These feelings are temporary\n🤗 Professional support is available\n\n**Self-Care While Traveling:**\n- Take breaks, don't over-schedule\n- Stay connected with loved ones\n- Maintain sleep/eating routines\n- Know it's okay to modify plans\n\n**Need someone to talk to? These hotlines are staffed by trained counselors who care.**`;
    }

    // Trafficking/abuse
    if (lowerMessage.includes('trafficking') || lowerMessage.includes('abuse') || lowerMessage.includes('kidnap') || lowerMessage.includes('forced')) {
      return `🛡️ **ANTI-TRAFFICKING & ABUSE SUPPORT**\n\n**URGENT - Call Immediately:**\n📞 **177** - National Anti-Trafficking Hotline\n📞 **911** - Police Emergency\n📞 **1343** - DSWD Action Center\n\n**International Support:**\n📞 US Embassy: (02) 5301-2000\n📞 Canadian Embassy: (02) 8857-9000\n📞 UK Embassy: (02) 8858-2200\n\n**Women/Children Protection:**\n📞 (02) 410-3213 - PNP Women & Children Protection\n\n**Domestic Violence:**\n📞 (02) 8734-3449 - Gender-Based Violence Hotline\n\n**REMEMBER:**\n🚨 You are not to blame\n🚨 Help is available 24/7\n🚨 These calls are confidential\n🚨 Trained professionals are ready to assist\n\n**If you're in immediate danger, call 911 or approach any police officer/security guard.**`;
    }

    return null;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // Check for safety keywords first
    const safetyResponse = getSafetyResponse(currentInput);
    
    if (safetyResponse) {
      // Immediate safety response
      const aiMessage = {
        role: 'assistant',
        content: safetyResponse
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      
      // Speak the response if voice is enabled
      if (voiceEnabled) {
        const cleanText = safetyResponse.replace(/[*#📞🚨👩♿🌈💚🛡️🏥✅🏳️‍🌈🏛️🏨🏖️🛫📏📍💬🤗🚓🚑🔥]/g, '');
        speakText(cleanText);
      }
      return;
    }

    // Otherwise, call backend AI
    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          location: selectedLocation ? {
            name: selectedLocation.name,
            region: selectedLocation.region,
            fullAddress: selectedLocation.fullAddress,
            locationType: selectedLocation.locationType,
            description: selectedLocation.description,
            isCustom: selectedLocation.isCustom
          } : null
        })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response
      }]);

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(data.response);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. For emergencies, call 911 immediately. For non-urgent help, please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Quick action buttons for common safety queries
  const quickActions = [
    { label: '🚨 Emergency', query: 'emergency' },
    { label: '🏥 Hospital', query: 'find nearest hospital' },
    { label: '👩 Women Safety', query: 'women safety tips' },
    { label: '♿ Accessibility', query: 'accessibility information' }
  ];

  const handleQuickAction = (query) => {
    setInput(query);
    setTimeout(() => handleSendMessage(), 100);
  };

  // Format text with bold support
  const formatText = (text) => {
    // Split by **text** pattern for bold
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Remove ** and render as bold
        const boldText = part.slice(2, -2);
        return <strong key={index}>{boldText}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <div className="ai-header-content">
          <h3>🤖 AI Safety Assistant</h3>
          <div className="ai-features">
            <button
              className={`voice-toggle ${voiceEnabled ? 'active' : ''}`}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title="Toggle voice responses"
            >
              {voiceEnabled ? '🔊' : '🔇'}
            </button>
            {isSpeaking && (
              <button
                className="stop-speaking-btn"
                onClick={stopSpeaking}
                title="Stop speaking"
              >
                ⏸️
              </button>
            )}
          </div>
        </div>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>

      <div className="quick-actions">
        {quickActions.map(action => (
          <button
            key={action.label}
            className="quick-action-btn"
            onClick={() => handleQuickAction(action.query)}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role}`}
          >
            <div className="message-content">
              {message.content.split('\n').map((line, i) => (
                <p key={i}>{line ? formatText(line) : '\u00A0'}</p>
              ))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about safety, emergencies, or travel info..."
            rows="2"
            disabled={isLoading || isListening}
          />
          <button
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
            title={isListening ? 'Stop listening' : 'Start voice input'}
            disabled={!('webkitSpeechRecognition' in window)}
          >
            {isListening ? '⏹️' : '🎤'}
          </button>
        </div>
        {isListening && (
          <div className="listening-indicator">
            <div className="sound-wave">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Listening...</p>
          </div>
        )}
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
          className="send-btn"
        >
          Send
        </button>
      </div>

      <div className="ai-footer-note">
        <p>🆘 For life-threatening emergencies, call <strong>911</strong> immediately</p>
      </div>
    </div>
  );
};

export default AIAssistant;
