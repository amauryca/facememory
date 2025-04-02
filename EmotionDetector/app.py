import os
import logging
import datetime
import numpy as np
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Log database URI for debugging
logger.info(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")

# Initialize database
db = SQLAlchemy(app)

# Database model for storing facial emotion data
class EmotionRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    emotion = db.Column(db.String(20), nullable=False)
    confidence = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    session_id = db.Column(db.String(50))
    source = db.Column(db.String(10), default="face")  # 'face' or 'voice'

    def to_dict(self):
        return {
            "id": self.id,
            "emotion": self.emotion,
            "confidence": self.confidence,
            "timestamp": self.timestamp.isoformat(),
            "session_id": self.session_id,
            "source": self.source
        }

# Database model for combined mood analysis
class MoodAnalysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    face_emotion = db.Column(db.String(20))
    voice_emotion = db.Column(db.String(20))
    overall_mood = db.Column(db.String(20), nullable=False)
    confidence = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    session_id = db.Column(db.String(50))

    def to_dict(self):
        return {
            "id": self.id,
            "face_emotion": self.face_emotion,
            "voice_emotion": self.voice_emotion,
            "overall_mood": self.overall_mood,
            "confidence": self.confidence,
            "timestamp": self.timestamp.isoformat(),
            "session_id": self.session_id
        }

# Create database tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/timeline')
def timeline():
    """Render the emotion timeline analysis page."""
    return render_template('timeline.html')

@app.route('/text-chat')
def text_chat():
    """Render the text-only chat page."""
    return render_template('text_chat.html')

@app.route('/api/emotions', methods=['POST'])
def save_emotion():
    """Save detected emotion to database."""
    data = request.json
    try:
        emotion_record = EmotionRecord(
            emotion=data.get('emotion'),
            confidence=data.get('confidence', 0.0),
            session_id=data.get('session_id'),
            source=data.get('source', 'face')  # Default to 'face' for backward compatibility
        )
        db.session.add(emotion_record)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Emotion recorded",
            "id": emotion_record.id
        }), 201
    except Exception as e:
        logger.error(f"Error saving emotion: {str(e)}")
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Failed to save emotion data"
        }), 500

@app.route('/api/emotions', methods=['GET'])
def get_emotions():
    """Get emotion history from database."""
    session_id = request.args.get('session_id')
    limit = request.args.get('limit', 100, type=int)

    query = EmotionRecord.query

    if session_id:
        query = query.filter_by(session_id=session_id)

    records = query.order_by(EmotionRecord.timestamp.desc()).limit(limit).all()

    return jsonify({
        "status": "success",
        "count": len(records),
        "data": [record.to_dict() for record in records]
    })

@app.route('/api/voice-analysis', methods=['POST'])
def analyze_voice():
    """Analyze voice tone and identify emotion."""
    data = request.json

    try:
        # Extract audio features from client-side analysis
        audio_data = data.get('audio_features', {})
        session_id = data.get('session_id')

        # Simple algorithm to determine voice emotion based on features
        # In a real app, this would use a trained model
        pitch = audio_data.get('pitch', 0)
        volume = audio_data.get('volume', 0)
        speech_rate = audio_data.get('speechRate', 0)

        # Determine voice emotion based on audio features
        voice_emotion = determine_voice_emotion(pitch, volume, speech_rate)
        confidence = 0.7 + (np.random.random() * 0.2)  # Simulated confidence between 0.7-0.9

        # Save voice emotion to database
        voice_record = EmotionRecord(
            emotion=voice_emotion,
            confidence=confidence,
            session_id=session_id,
            source="voice"  # Indicate this is from voice analysis
        )
        db.session.add(voice_record)

        # Get the latest face emotion for this session
        face_record = EmotionRecord.query.filter_by(
            session_id=session_id, 
            source="face"
        ).order_by(EmotionRecord.timestamp.desc()).first()

        # Initialize overall mood
        overall_mood = voice_emotion  # Default to voice emotion if no face data

        # If we have both face and voice emotions, combine them
        if face_record:
            face_emotion = face_record.emotion
            overall_mood = combine_emotions(face_emotion, voice_emotion)

            # Save the combined analysis
            mood_analysis = MoodAnalysis(
                face_emotion=face_emotion,
                voice_emotion=voice_emotion,
                overall_mood=overall_mood,
                confidence=(face_record.confidence + confidence) / 2,  # Average confidence
                session_id=session_id
            )
            db.session.add(mood_analysis)

        db.session.commit()

        return jsonify({
            "status": "success",
            "voice_emotion": voice_emotion,
            "confidence": float(confidence),
            "face_emotion": face_record.emotion if face_record else None,
            "overall_mood": overall_mood
        }), 201

    except Exception as e:
        logger.error(f"Error analyzing voice: {str(e)}")
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": "Failed to analyze voice data"
        }), 500

@app.route('/api/combined-mood', methods=['GET'])
def get_combined_mood():
    """Get the latest combined mood analysis."""
    session_id = request.args.get('session_id')

    if not session_id:
        return jsonify({
            "status": "error",
            "message": "Session ID is required"
        }), 400

    try:
        # Get the latest mood analysis for this session
        mood = MoodAnalysis.query.filter_by(
            session_id=session_id
        ).order_by(MoodAnalysis.timestamp.desc()).first()

        if mood:
            return jsonify({
                "status": "success",
                "data": mood.to_dict()
            })
        else:
            return jsonify({
                "status": "success",
                "data": None,
                "message": "No mood analysis found for this session"
            })
    except Exception as e:
        logger.error(f"Error retrieving mood analysis: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Failed to retrieve mood analysis"
        }), 500

def determine_voice_emotion(pitch, volume, speech_rate):
    """Determine emotion based on voice characteristics with nuanced detection."""
    # Enhanced rule-based emotion detection with more nuanced emotions
    # In a real app, this would use a trained ML model

    # Add some variation to promote diverse emotion detection
    # Get additional features from the audio data
    pitch_variability = 0.2 + np.random.random() * 0.2  # Simulate pitch variation
    volume_consistency = 0.3 + np.random.random() * 0.4  # Simulate volume consistency

    # Use nuanced emotions based on detailed voice characteristics

    # Happy spectrum - high pitch, varied volume, medium to fast speech
    if pitch > 0.7:
        if volume > 0.8 and speech_rate > 0.8:
            return "Excited"  # Very high energy
        elif volume > 0.7 and speech_rate > 0.7:
            return "Joyful"   # Clear happiness
        elif volume > 0.6 and pitch_variability > 0.3:
            return "Amused"   # Playful happiness
        elif volume > 0.5 and speech_rate > 0.6:
            return "Proud"    # Confident happiness
        else:
            return "Content"  # Subdued happiness

    # Surprised spectrum - sudden changes, varied pitch, high volume
    elif pitch > 0.6 and volume > 0.6 and pitch_variability > 0.3:
        if speech_rate > 0.7:
            return "Astonished"  # Strong surprise
        elif speech_rate > 0.5:
            return "Amazed"      # Positive surprise
        elif speech_rate < 0.4:
            return "Perplexed"   # Confused surprise
        else:
            return "Surprised"   # General surprise

    # Angry spectrum - low to medium pitch, high volume, fast speech
    elif pitch < 0.5 and volume > 0.7:
        if speech_rate > 0.8:
            return "Angry"       # Full anger
        elif speech_rate > 0.7:
            return "Frustrated"  # Specific anger cause
        elif pitch < 0.3:
            return "Indignant"   # Righteous anger
        else:
            return "Irritated"   # Milder anger

    # Sad spectrum - low pitch, low volume, slow speech
    elif pitch < 0.4 and volume < 0.5:
        if speech_rate < 0.3:
            return "Grieving"      # Deep sadness
        elif speech_rate < 0.4 and volume < 0.3:
            return "Melancholic"   # Persistent sadness
        elif pitch < 0.3:
            return "Disappointed"  # Specific sad cause
        else:
            return "Sad"           # General sadness

    # Fearful spectrum - variable pitch, low to medium volume
    elif pitch_variability > 0.35 and volume < 0.6:
        if speech_rate > 0.7:
            return "Anxious"     # Nervous energy
        elif speech_rate > 0.5:
            return "Worried"     # Specific concern
        elif volume < 0.4:
            return "Insecure"    # Self-doubt
        else:
            return "Fearful"     # General fear

    # Calm/thoughtful spectrum - medium consistency, medium values
    elif volume_consistency > 0.5 and 0.4 < pitch < 0.6:
        if 0.4 < volume < 0.6 and 0.4 < speech_rate < 0.6:
            return "Thoughtful"  # Contemplative
        elif volume > 0.5 and speech_rate > 0.5:
            return "Confident"   # Self-assured
        elif volume < 0.5 and speech_rate < 0.5:
            return "Calm"        # Relaxed
        else:
            return "Interested"  # Engaged

    # Complex emotions with mixed signals
    elif 0.4 < pitch < 0.6:
        if volume > 0.6 and speech_rate < 0.5:
            return "Skeptical"     # Disbelieving
        elif volume < 0.5 and speech_rate > 0.6:
            return "Uncertain"     # Hesitant
        elif pitch_variability < 0.2:
            return "Bored"         # Disengaged
        elif volume_consistency < 0.3:
            return "Distracted"    # Split attention
        else:
            return "Neutral"       # Baseline emotion

    # Medium pitch, medium volume → Neutral (fallback)
    else:
        return "Neutral"

def combine_emotions(face_emotion, voice_emotion):
    """Combine face and voice emotions to determine overall mood with nuanced categories."""
    # If emotions match exactly, that's definitely the overall mood
    if face_emotion == voice_emotion:
        return face_emotion

    # Define emotional categories with nuanced emotions
    positive_emotions = {
        # Basic positive
        "Happy", "Surprised", 
        # Nuanced happiness variants
        "Joyful", "Content", "Excited", "Proud", "Grateful", "Amused",
        # Nuanced positive surprise variants
        "Amazed", "Astonished", "Curious"
    }

    negative_emotions = {
        # Basic negative
        "Sad", "Angry", "Fearful", "Disgusted",
        # Nuanced sadness variants
        "Melancholic", "Disappointed", "Grieving", "Lonely", "Nostalgic",
        # Nuanced anger variants
        "Irritated", "Frustrated", "Indignant", "Defensive", "Resentful",
        # Nuanced fear variants
        "Anxious", "Overwhelmed", "Worried", "Nervous", "Insecure"
    }

    complex_emotions = {
        # Ambiguous or mixed emotions
        "Perplexed", "Confused", "Uncertain", "Embarrassed", 
        "Skeptical", "Distracted", "Thoughtful", "Interested"
    }

    neutral_emotions = {
        "Neutral", "Calm", "Bored", "Confident"
    }

    # Map emotions to their base categories for better processing
    happiness_group = {"Happy", "Joyful", "Content", "Excited", "Proud", "Grateful", "Amused"}
    sadness_group = {"Sad", "Melancholic", "Disappointed", "Grieving", "Lonely", "Nostalgic"}
    anger_group = {"Angry", "Irritated", "Frustrated", "Indignant", "Defensive", "Resentful"}
    fear_group = {"Fearful", "Anxious", "Overwhelmed", "Worried", "Nervous", "Insecure"}
    surprise_group = {"Surprised", "Amazed", "Astonished", "Curious", "Perplexed", "Confused"}

    # Categorize the emotions
    face_category = None
    voice_category = None

    for category, emotions in [
        ("happiness", happiness_group), 
        ("sadness", sadness_group),
        ("anger", anger_group),
        ("fear", fear_group),
        ("surprise", surprise_group),
        ("neutral", neutral_emotions),
        ("complex", complex_emotions)
    ]:
        if face_emotion in emotions:
            face_category = category
        if voice_emotion in emotions:
            voice_category = category

    # If both emotions are in the same category, choose the stronger one (voice for nuance)
    if face_category == voice_category:
        # Prefer the nuanced emotion over basic when in same category
        if face_emotion in ["Happy", "Sad", "Angry", "Fearful", "Surprised", "Neutral"]:
            return voice_emotion
        else:
            return face_emotion

    # If both emotions have the same valence (positive or negative)
    if (face_emotion in positive_emotions and voice_emotion in positive_emotions):
        # For positive emotions, voice often carries more nuanced happiness information
        if voice_emotion in happiness_group:
            return voice_emotion
        elif face_emotion in happiness_group:
            return face_emotion
        else:
            # Default to a surprised emotion
            return voice_emotion if voice_emotion in surprise_group else face_emotion

    if (face_emotion in negative_emotions and voice_emotion in negative_emotions):
        # For negative emotions, determine the dominant one

        # Anger tends to dominate other negative emotions
        if voice_emotion in anger_group:
            return voice_emotion
        elif face_emotion in anger_group:
            return face_emotion

        # Fear is next in dominance
        if voice_emotion in fear_group:
            return voice_emotion
        elif face_emotion in fear_group:
            return face_emotion

        # Sadness is usually less dominant
        return voice_emotion if voice_emotion in sadness_group else face_emotion

    # If one is neutral and the other is not, prefer the non-neutral
    if face_emotion in neutral_emotions and voice_emotion not in neutral_emotions:
        return voice_emotion
    if voice_emotion in neutral_emotions and face_emotion not in neutral_emotions:
        return face_emotion

    # If one is a complex emotion and one is a basic emotion, use the complex one
    if face_emotion in complex_emotions and voice_emotion not in complex_emotions:
        return face_emotion
    if voice_emotion in complex_emotions and face_emotion not in complex_emotions:
        return voice_emotion

    # For mixed positive/negative emotions with no clear rule, 
    # facial expressions are usually more reliable for basic emotions
    if face_emotion in ["Happy", "Sad", "Angry", "Fearful", "Surprised", "Neutral"]:
        return face_emotion
    else:
        # But voice can be more expressive for nuanced states
        return voice_emotion

@app.route('/api/emotion-timeline', methods=['GET'])
def get_emotion_timeline():
    """Get emotion data over time for a session to create timeline visualizations."""
    session_id = request.args.get('session_id')
    hours = request.args.get('hours', 1, type=int)  # Default to last hour

    if not session_id:
        return jsonify({
            "status": "error",
            "message": "Session ID is required"
        }), 400

    try:
        # Calculate the timestamp for filtering
        cutoff_time = datetime.datetime.utcnow() - datetime.timedelta(hours=hours)

        # Get all emotions for this session, ordered by timestamp
        emotions = EmotionRecord.query.filter(
            EmotionRecord.session_id == session_id,
            EmotionRecord.timestamp >= cutoff_time
        ).order_by(EmotionRecord.timestamp.asc()).all()

        # Get all mood analyses for this session
        moods = MoodAnalysis.query.filter(
            MoodAnalysis.session_id == session_id,
            MoodAnalysis.timestamp >= cutoff_time
        ).order_by(MoodAnalysis.timestamp.asc()).all()

        # Format data for timeline visualization
        timeline_data = {
            "timestamps": [],
            "face_emotions": [],
            "voice_emotions": [],
            "overall_moods": [],
            "confidence_values": []
        }

        # Process EmotionRecord data
        for emotion in emotions:
            timeline_data["timestamps"].append(emotion.timestamp.isoformat())

            if emotion.source == "face":
                timeline_data["face_emotions"].append(emotion.emotion)
                # Add empty values for voice to maintain alignment
                if len(timeline_data["voice_emotions"]) < len(timeline_data["face_emotions"]):
                    timeline_data["voice_emotions"].append(None)
            else:  # voice
                timeline_data["voice_emotions"].append(emotion.emotion)
                # Add empty values for face to maintain alignment
                if len(timeline_data["face_emotions"]) < len(timeline_data["voice_emotions"]):
                    timeline_data["face_emotions"].append(None)

            timeline_data["confidence_values"].append(float(emotion.confidence) if emotion.confidence else 0.0)

        # Process MoodAnalysis data for overall mood
        mood_data = {
            "timestamps": [],
            "moods": [],
            "confidence_values": []
        }

        for mood in moods:
            mood_data["timestamps"].append(mood.timestamp.isoformat())
            mood_data["moods"].append(mood.overall_mood)
            mood_data["confidence_values"].append(float(mood.confidence) if mood.confidence else 0.0)

        # Get emotion frequency statistics
        emotion_counts = {}
        for emotion in emotions:
            if emotion.emotion not in emotion_counts:
                emotion_counts[emotion.emotion] = 0
            emotion_counts[emotion.emotion] += 1

        # Sort emotions by frequency
        sorted_emotions = sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True)

        return jsonify({
            "status": "success",
            "data": {
                "timeline": timeline_data,
                "mood_timeline": mood_data,
                "emotion_frequency": dict(sorted_emotions),
                "total_records": len(emotions),
                "total_moods": len(moods)
            }
        })
    except Exception as e:
        logger.error(f"Error retrieving emotion timeline: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Failed to retrieve emotion timeline data"
        }), 500

@app.route('/api/speech-recognition', methods=['POST'])
def process_speech():
    """Process speech for therapeutic responses."""
    data = request.json
    session_id = data.get('session_id')
    speech_text = data.get('speech_text', '')

    try:
        if not speech_text or not session_id:
            return jsonify({
                "status": "error",
                "message": "Speech text and session ID are required"
            }), 400

        # Get the latest emotion data for this session
        emotion_record = EmotionRecord.query.filter_by(
            session_id=session_id
        ).order_by(EmotionRecord.timestamp.desc()).first()

        current_emotion = "neutral"
        if emotion_record:
            current_emotion = emotion_record.emotion

        # Generate therapeutic response based on speech and emotion
        # In a real application, this would use the Anthropic API or similar

        therapeutic_response = generate_therapeutic_response(speech_text, current_emotion)

        return jsonify({
            "status": "success",
            "speech_text": speech_text,
            "current_emotion": current_emotion,
            "response": therapeutic_response
        })

    except Exception as e:
        logger.error(f"Error processing speech: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Failed to process speech data"
        }), 500

def generate_therapeutic_response(message, emotion):
    """Generate an AI-powered therapeutic response using OpenAI."""
    try:
        openai.api_key = os.environ.get('OPENAI_API_KEY')
        if not openai.api_key:
            logger.error("OpenAI API key not found")
            return "I'm here to listen. Please continue."

        system_prompt = """You are a compassionate AI therapist with a warm, conversational style. 
        Your responses should be empathetic, clear, and focused on the client's needs. 
        Keep responses concise but meaningful. Use a natural, informal tone while maintaining professionalism."""
        
        conversation = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"The client's current detected emotion is: {emotion}"},
            {"role": "user", "content": message}
        ]

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=conversation,
            temperature=0.7,
            max_tokens=150
        )

        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error generating OpenAI response: {str(e)}")
        
        # Fallback responses based on common patterns
        speech_lower = message.lower()
        
        if any(word in speech_lower for word in ['thank', 'thanks', 'appreciate']):
        return "You're welcome! Your willingness to engage in self-reflection is a valuable step toward emotional well-being."

    # Handle emotional statements with more nuanced responses
    if any(word in speech_lower for word in ['sad', 'down', 'depressed', 'unhappy']):
        return "I hear the sadness in your words, and I want you to know that it's completely valid to feel this way. Depression and sadness are complex emotions that can feel overwhelming. Would you like to explore what might be contributing to these feelings? Sometimes understanding the triggers can be a first step toward finding coping strategies."

    if any(word in speech_lower for word in ['happy', 'good', 'great', 'wonderful']):
        return "It's wonderful to hear the positive energy in your voice! These moments of joy and satisfaction are worth acknowledging and celebrating. What specific aspects of your current situation are bringing you happiness? Understanding what contributes to our well-being can help us cultivate more positive experiences."

    if any(word in speech_lower for word in ['angry', 'mad', 'frustrated']):
        return "I can sense your frustration and anger. These emotions often signal that something important to us has been violated or that our needs aren't being met. Would you like to explore what might be at the core of these feelings? Sometimes identifying the underlying need can help us address the root cause rather than just the symptoms."

    if any(word in speech_lower for word in ['worried', 'anxious', 'scared']):
        return "I hear the anxiety in your words, and I want you to know that feeling worried is a natural response to uncertainty. Would you feel comfortable sharing what specific concerns are on your mind? Sometimes naming our fears can help reduce their power over us, and then we can explore practical strategies for managing these feelings."

    # Handle questions about feelings with more depth
    if '?' in speech_text and any(word in speech_lower for word in ['feel', 'feeling', 'mood']):
        return f"I notice {emotion} in your expression, and it's thoughtful that you're checking in with your emotions. Emotional awareness is a valuable skill. Would you like to explore what might be influencing your mood right now? Sometimes understanding the context of our feelings can help us respond to them more effectively."

    # Handle help requests with more specific guidance
    if any(word in speech_lower for word in ['help', 'advice', 'suggestion']):
        return "I appreciate you reaching out for support. That takes courage. To offer the most helpful guidance, could you tell me more about what you're struggling with? Sometimes it helps to break down our challenges into smaller, more manageable pieces that we can address one at a time."

    # Enhanced responses based on emotional nuance
    if emotion in ['Happy', 'Joyful', 'Content', 'Excited', 'Proud', 'Grateful', 'Amused']:
        return "Your positive energy is evident, and it's wonderful to witness. These moments of joy and contentment are precious. Would you like to explore what's contributing to these good feelings? Understanding what brings us genuine happiness can help us cultivate more positive experiences in our lives."

    elif emotion in ['Sad', 'Melancholic', 'Disappointed', 'Grieving', 'Lonely', 'Nostalgic']:
        return "I'm here with you in this moment of sadness. These feelings, while difficult, are part of our human experience and deserve to be acknowledged. Would you like to share what's weighing on your heart? Sometimes putting our feelings into words can help us begin to process them."

    elif emotion in ['Angry', 'Irritated', 'Frustrated', 'Indignant', 'Defensive', 'Resentful']:
        return "I can sense the intensity of your emotions. Anger and frustration often carry important messages about our boundaries and needs. Would you like to explore what's triggering these feelings? Understanding the source can help us channel this energy constructively."

    elif emotion in ['Fearful', 'Anxious', 'Overwhelmed', 'Worried', 'Nervous', 'Insecure']:
        return "I hear the anxiety in your voice, and I want you to know that feeling uncertain is a natural response to life's challenges. Would you like to explore what's causing these worried thoughts? Sometimes breaking down our concerns can make them feel more manageable."

    # General therapeutic engagement
    if any(word in speech_lower for word in ['help', 'better', 'improve', 'advice']):
        return "I'd be happy to work with you on finding strategies that might help. Let's start by acknowledging where you are right now - your feelings are valid and it's okay to seek support. Based on what I'm observing, would you like to explore some specific techniques for managing these emotions? We can focus on practical steps that feel manageable and meaningful for you."

    # Default response with emotional awareness
    return f"I notice that you might be feeling {emotion}, and I want to acknowledge that emotion. Every feeling we experience provides us with information about our needs and experiences. Would you like to explore what this emotion might be telling you? Remember that all emotions are temporary states, and it's completely normal to experience a range of feelings throughout our day."

    # Map emotions to their base categories for response selection
    happiness_group = ["Happy", "Joyful", "Content", "Excited", "Proud", "Grateful", "Amused"]
    sadness_group = ["Sad", "Melancholic", "Disappointed", "Grieving", "Lonely", "Nostalgic"]
    anger_group = ["Angry", "Irritated", "Frustrated", "Indignant", "Defensive", "Resentful"]
    fear_group = ["Fearful", "Anxious", "Overwhelmed", "Worried", "Nervous", "Insecure"]
    surprise_group = ["Surprised", "Amazed", "Astonished", "Curious", "Perplexed", "Confused"]
    neutral_group = ["Neutral", "Calm", "Bored"]
    complex_group = ["Thoughtful", "Interested", "Uncertain", "Embarrassed", "Confident", 
                     "Distracted", "Skeptical"]

    # Nuanced happiness responses
    if emotion in happiness_group:
        if emotion == "Happy":
            return "I notice a positive energy in your voice. That's wonderful to hear. What's contributing to your good mood today? Recognizing these positive influences can help us cultivate more of them in the future."
        elif emotion == "Joyful":
            return "Your joy is really coming through in our conversation. These moments of genuine happiness are worth savoring. What sparked this joyful feeling for you?"
        elif emotion == "Content":
            return "You seem to be in a place of contentment right now. This balanced emotional state can be a wonderful foundation for reflection. What aspects of your life feel satisfying to you at the moment?"
        elif emotion == "Excited":
            return "I can hear excitement in your voice! This energetic state can be a great motivator. What are you looking forward to or enthusiastic about right now?"
        elif emotion == "Proud":
            return "You sound proud, and that's a meaningful emotion worth acknowledging. What achievement or personal quality is giving you this sense of pride today?"
        elif emotion == "Grateful":
            return "I'm noticing a sense of gratitude in how you're expressing yourself. Appreciating the positive aspects of our lives can significantly enhance our well-being. What are you feeling particularly thankful for?"
        elif emotion == "Amused":
            return "You seem amused, which is a wonderful way to experience lightness in our day. Finding humor and playfulness can be an effective way to navigate life's complexities. What brought a smile to your face today?"

    # Nuanced sadness responses
    elif emotion in sadness_group:
        if emotion == "Sad":
            return "I'm sensing some sadness in your voice. It's completely okay to feel this way. Would you like to talk more about what might be contributing to these feelings? Sometimes just expressing them can provide some relief."
        elif emotion == "Melancholic":
            return "There's a touch of melancholy in your tone. This reflective, gentle sadness can sometimes offer us insights about what matters most to us. Would you like to explore what might be behind this feeling?"
        elif emotion == "Disappointed":
            return "I hear disappointment in your voice. When our expectations aren't met, it can be quite disheartening. Would you feel comfortable sharing what didn't go as you'd hoped?"
        elif emotion == "Grieving":
            return "I sense you might be experiencing grief. This profound emotion often comes in waves and needs time and space to be processed. Is there a loss you're coming to terms with right now?"
        elif emotion == "Lonely":
            return "There's a quality of loneliness in how you're expressing yourself. This feeling of disconnection is a common human experience, though it can be quite painful. Have there been changes in your social connections recently?"
        elif emotion == "Nostalgic":
            return "I'm detecting a nostalgic quality in your communication. Looking back at meaningful past experiences can bring both warmth and a gentle sadness. What memories have been on your mind lately?"

    # Nuanced anger responses
    elif emotion in anger_group:
        if emotion == "Angry":
            return "I can hear some frustration in your voice. Anger often signals that something important to us has been threatened or violated. If you'd like, we could explore what might be at the core of these feelings - sometimes there's valuable information there."
        elif emotion == "Irritated":
            return "You sound somewhat irritated. These smaller frustrations can sometimes build up over time if not addressed. What's been bothering you recently?"
        elif emotion == "Frustrated":
            return "I'm picking up on some frustration. This often happens when we're facing obstacles to our goals or needs. What situations have been challenging for you lately?"
        elif emotion == "Indignant":
            return "There's a quality of righteous indignation in your tone. This often emerges when we perceive an injustice or unfairness. What principles or values do you feel might have been violated?"
        elif emotion == "Defensive":
            return "You seem to be feeling somewhat defensive, which is a natural response when we feel criticized or misunderstood. Has there been a situation where you've felt the need to protect yourself or your perspective?"
        elif emotion == "Resentful":
            return "I'm noticing what might be some resentment in your tone. These feelings often develop when we perceive unfairness that hasn't been addressed. Is there a situation where you've felt unfairly treated?"

    # Nuanced fear responses
    elif emotion in fear_group:
        if emotion == "Fearful":
            return "I'm detecting some anxiety in your voice. When we're feeling fearful, it can help to ground ourselves in the present moment. Would it be helpful to take a few deep breaths together? Breathing slowly can activate your body's relaxation response."
        elif emotion == "Anxious":
            return "I notice some anxiety in how you're expressing yourself. This heightened state of alertness can be exhausting when persistent. What concerns have been on your mind lately?"
        elif emotion == "Overwhelmed":
            return "You sound somewhat overwhelmed, which happens when we're facing more demands than we feel we can handle. What responsibilities or situations feel most pressing right now?"
        elif emotion == "Worried":
            return "I can hear worry in your voice. Our minds often try to protect us by anticipating problems, though sometimes this can become excessive. What specific concerns have been occupying your thoughts?"
        elif emotion == "Nervous":
            return "You seem a bit nervous. This anticipatory state often occurs before important events or interactions. Is there something coming up that you're feeling uncertain about?"
        elif emotion == "Insecure":
            return "I'm sensing some insecurity in your communication. These feelings of self-doubt are common to the human experience, though they can be painful. What aspects of yourself or your situation are you questioning right now?"

    # Nuanced surprise responses
    elif emotion in surprise_group:
        if emotion == "Surprised":
            return "Your voice suggests you might be processing something unexpected. When surprising events come our way, it can take time to integrate them into our understanding. Would you like to talk through what's on your mind?"
        elif emotion == "Amazed":
            return "You sound amazed, which is such a wonderful state of positive surprise. What has inspired this sense of wonder or awe in you?"
        elif emotion == "Astonished":
            return "I hear astonishment in your voice. When something completely exceeds our expectations or beliefs, it can temporarily leave us processing this new reality. What has so dramatically surprised you?"
        elif emotion == "Curious":
            return "There's a quality of curiosity in how you're expressing yourself. This openness to learning and exploring can be such a fertile mindset. What questions or interests are capturing your attention right now?"
        elif emotion == "Perplexed":
            return "You sound somewhat perplexed. When information or situations don't fit into our existing understanding, it can create this sense of confusion. What aspects of your current situation feel difficult to make sense of?"
        elif emotion == "Confused":
            return "I'm noticing some confusion in your communication. It can be disorienting when things don't make sense or seem contradictory. What specifically feels unclear or inconsistent to you right now?"

    # Neutral and complex emotional responses
    elif emotion in neutral_group:
        if emotion == "Neutral":
            return "You seem to be in a relatively neutral emotional state. This balanced position can be a good place for reflection. Is there anything particular on your mind today that you'd like to explore?"
        elif emotion == "Calm":
            return "There's a calming quality to your communication right now. This grounded state can be valuable for clear thinking and decision-making. Has anything helped you achieve this sense of equilibrium?"
        elif emotion == "Bored":
            return "I'm detecting what might be a touch of boredom or disengagement. This can sometimes signal a need for new challenges or forms of stimulation. What kinds of activities or topics typically engage your interest?"

    # Complex emotional responses
    elif emotion in complex_group:
        if emotion == "Thoughtful":
            return "You seem to be in a thoughtful, reflective state. These moments of contemplation can often yield meaningful insights. What thoughts have you been sitting with lately?"
        elif emotion == "Interested":
            return "I notice a quality of interest and engagement in how you're communicating. This focused attention can enhance learning and connection. What aspects of our conversation or your current situation are you finding most compelling?"
        elif emotion == "Uncertain":
            return "There's an uncertainty in your tone, which is a natural response when facing ambiguity or multiple options. What decisions or situations are you finding difficult to navigate right now?"
        elif emotion == "Embarrassed":
            return "I'm sensing what might be some embarrassment in your communication. While uncomfortable, these feelings often reflect our care about social connections and others' perceptions. Would you like to talk about what's triggered this feeling?"
        elif emotion == "Confident":
            return "You seem to be communicating with confidence. This sense of self-assurance can be empowering. What areas of your life do you feel most certain about right now?"
        elif emotion == "Distracted":
            return "I notice you might be somewhat distracted. When our attention is divided, it can be challenging to fully engage with any single task or interaction. What other thoughts or demands might be pulling at your attention right now?"
        elif emotion == "Skeptical":
            return "There's a quality of skepticism in how you're expressing yourself. This questioning stance can be valuable for critical thinking, though sometimes tiring if overused. What aspects of your situation are you finding difficult to accept or believe?"

    # General response if no specific patterns are detected
    return "Thank you for sharing that with me. I'm here to listen and support you. Would you like to tell me more about what's on your mind today?"

@app.route('/api/chat', methods=['POST'])
def chat():
    """Process chat messages and generate AI responses."""
    data = request.json
    message = data.get('message', '')
    emotion = data.get('emotion', 'neutral')
    chat_type = data.get('chat_type', 'text')

    try:
        # Generate a therapeutic response based on the message and emotion
        response = generate_therapeutic_response(message, emotion)

        # Save the interaction for analysis
        if message and chat_type == 'text':
            emotion_record = EmotionRecord(
                emotion=emotion,
                confidence=0.8,
                session_id=data.get('session_id'),
                source='text'
            )
            db.session.add(emotion_record)
            db.session.commit()

        return jsonify({
            "status": "success",
            "response": response
        })
    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Failed to generate response"
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return jsonify({
        "status": "healthy",
        "message": "Facial expression and voice tone detector is running"
    })