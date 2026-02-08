from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Hugging Face API configuration
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')

# Initialize Hugging Face Inference Client
client = InferenceClient(token=HUGGINGFACE_API_KEY) if HUGGINGFACE_API_KEY else None

# In-memory storage (in production, use a database)
user_profiles = {}

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    api_key_status = "configured" if HUGGINGFACE_API_KEY else "missing"
    api_key_preview = f"{HUGGINGFACE_API_KEY[:10]}..." if HUGGINGFACE_API_KEY else "None"
    
    return jsonify({
        'status': 'healthy',
        'message': 'Travel AI API is running',
        'huggingface_api_key': api_key_status,
        'api_key_preview': api_key_preview
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle AI chat requests"""
    try:
        data = request.json
        user_message = data.get('message', '')
        location = data.get('location', None)
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Create context-aware prompt with detailed location info
        system_prompt = """You are a friendly and knowledgeable AI travel assistant specializing in the Philippines. 
        You help tourists discover Philippine culture, traditions, local cuisine, festivals, and travel tips.
        Provide helpful, accurate, and engaging information about Philippine destinations, attractions, and local experiences.
        Keep responses concise but informative (2-4 paragraphs maximum)."""
        
        # Enhanced location context
        if location:
            if isinstance(location, dict):
                location_name = location.get('name', 'this location')
                region = location.get('region', 'Philippines')
                loc_type = location.get('locationType', '')
                full_address = location.get('fullAddress', '')
                is_custom = location.get('isCustom', False)
                
                system_prompt += f"\n\nThe user is asking about {location_name} in {region}, Philippines."
                if full_address:
                    system_prompt += f"\nFull location: {full_address}"
                if is_custom:
                    system_prompt += f"\nThis is a dynamically discovered location - provide general information about this area and nearby attractions."
            else:
                # Fallback if location is just a string
                system_prompt += f"\n\nThe user is currently asking about {location} in the Philippines."
        
        # Prepare the prompt for Hugging Face (simplified format)
        simple_prompt = f"{system_prompt}\n\nQuestion: {user_message}\n\nAnswer:"
        
        # Call Hugging Face API using the new client
        if not client:
            return jsonify({
                'response': get_fallback_response(user_message, location)
            })
        
        try:
            # Use chat completion for better compatibility
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            response = client.chat_completion(
                messages=messages,
                model="meta-llama/Llama-3.2-3B-Instruct",
                max_tokens=250,
            )
            
            # Extract the response
            ai_response = response.choices[0].message.content.strip()
            
            print(f"HuggingFace Response: {ai_response}")
            
            # Fallback if response is empty
            if not ai_response or len(ai_response) < 10:
                print("Warning: Empty or too short response from HuggingFace, using fallback")
                ai_response = get_fallback_response(user_message, location)
            
            return jsonify({'response': ai_response})
            
        except Exception as api_error:
            print(f"HuggingFace API Error: {str(api_error)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'response': get_fallback_response(user_message, location)
            })
            
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'response': "I apologize, but I'm having trouble connecting right now. The Philippines is a beautiful archipelago with over 7,000 islands! Each region offers unique experiences from pristine beaches to historic landmarks. What would you like to know more about?"
        })

def get_fallback_response(message, location):
    """Provide fallback responses when AI is unavailable"""
    message_lower = message.lower()
    
    # Handle location object or string
    location_name = None
    location_region = None
    
    if location:
        if isinstance(location, dict):
            location_name = location.get('name', 'this location')
            location_region = location.get('region', 'Philippines')
        else:
            location_name = str(location)
    
    if location_name:
        return f"{location_name} is a wonderful destination in {location_region or 'the Philippines'}! It offers rich cultural experiences, beautiful scenery, and warm hospitality. Would you like to know about specific attractions, local food, festivals, or travel tips for this area?"
    
    if any(word in message_lower for word in ['food', 'eat', 'cuisine', 'dish']):
        return "Philippine cuisine is diverse and delicious! Popular dishes include Adobo (savory stew), Sinigang (sour soup), Lechon (roasted pig), Pancit (noodles), and Halo-halo (dessert). Each region has its own specialties. What specific dish or region would you like to explore?"
    
    if any(word in message_lower for word in ['festival', 'celebration', 'event']):
        return "The Philippines celebrates numerous colorful festivals! Major ones include Sinulog in Cebu (January), Ati-Atihan in Aklan (January), Panagbenga in Baguio (February), and MassKara in Bacolod (October). These festivals showcase Filipino culture through music, dance, and vibrant costumes!"
    
    if any(word in message_lower for word in ['beach', 'island', 'dive', 'swim']):
        return "The Philippines is famous for its stunning beaches! Top destinations include Boracay (white sand), Palawan (lagoons and limestone cliffs), Siargao (surfing), Bohol (diving), and Bantayan Island (peaceful getaway). The clear waters are perfect for diving, snorkeling, and island hopping!"
    
    return "Welcome to the Philippines! This beautiful country offers pristine beaches, rich cultural heritage, delicious cuisine, and warm hospitality. From Manila's historic sites to Palawan's natural wonders, there's so much to discover. What would you like to explore?"

@app.route('/api/profile', methods=['GET', 'POST'])
def user_profile():
    """Handle user profile data"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        
        if request.method == 'GET':
            profile = user_profiles.get(user_id, {
                'beenThere': [],
                'wantToGo': []
            })
            return jsonify(profile)
        
        elif request.method == 'POST':
            data = request.json
            user_profiles[user_id] = data
            return jsonify({
                'message': 'Profile updated successfully',
                'profile': data
            })
            
    except Exception as e:
        print(f"Error in profile endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all Philippines locations data"""
    try:
        # In a real app, this would come from a database
        # For now, return a simple response
        return jsonify({
            'message': 'Locations endpoint',
            'note': 'Location data is served from the frontend JSON file'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Check if API key is configured
    if not HUGGINGFACE_API_KEY:
        print("WARNING: HUGGINGFACE_API_KEY not found in environment variables")
        print("Please create a .env file with your Hugging Face API key")
    
    print("Starting Travel AI Flask Server...")
    print("Server running on http://localhost:5001")
    print("Note: Using port 5001 to avoid conflict with macOS AirPlay Receiver")
    app.run(debug=True, port=5001)
