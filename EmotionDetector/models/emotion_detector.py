import cv2
import numpy as np
import logging
import os

logger = logging.getLogger(__name__)

class EmotionDetector:
    """Class to detect facial expressions and emotions in images."""
    
    def __init__(self):
        """Initialize the EmotionDetector with pre-trained models."""
        # Load face detection model
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Basic emotion labels
        self.basic_emotions = ['Angry', 'Disgusted', 'Fearful', 'Happy', 'Neutral', 'Sad', 'Surprised']
        
        # Extended nuanced emotion labels
        self.nuanced_emotions = [
            # Variations of happiness
            'Joyful', 'Content', 'Excited', 'Proud', 'Grateful', 'Amused',
            # Variations of sadness
            'Melancholic', 'Disappointed', 'Grieving', 'Lonely', 'Nostalgic',
            # Variations of anger
            'Irritated', 'Frustrated', 'Indignant', 'Defensive', 'Resentful',
            # Variations of fear
            'Anxious', 'Overwhelmed', 'Worried', 'Nervous', 'Insecure',
            # Variations of surprise
            'Amazed', 'Confused', 'Astonished', 'Perplexed', 'Curious',
            # Complex emotions
            'Hopeful', 'Bored', 'Uncertain', 'Embarrassed', 'Confident',
            'Calm', 'Distracted', 'Thoughtful', 'Interested', 'Skeptical'
        ]
        
        # Active emotions list - can be toggled between basic and nuanced
        self.emotions = self.basic_emotions
        
        # Use nuanced emotions by default
        self.use_nuanced_emotions = True
        if self.use_nuanced_emotions:
            self.emotions = self.basic_emotions + self.nuanced_emotions
        
        # Load emotion detection model - using a simplified approach with Haar cascade
        # In a production system, you would use a more sophisticated model like FER or DeepFace
        self.last_emotion = "No face detected"
        
        # For simulation mode (when no camera is available)
        self.simulation_mode = False
        self.current_frame_index = 0
        self.simulation_frames = []
        self._initialize_simulation_frames()
        
        # Check if face cascade loaded successfully
        if self.face_cascade.empty():
            logger.error("Error loading face cascade classifier")
        else:
            logger.debug("Face detection model loaded successfully")
    
    def _initialize_simulation_frames(self):
        """Create simulation frames with different emotions when camera is not available."""
        # Base frame (black background with text)
        base_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Create simulated frames for each emotion
        for emotion in self.emotions:
            frame = base_frame.copy()
            # Draw a simulated face
            cv2.rectangle(frame, (220, 140), (420, 340), (0, 255, 0), 2)
            
            # Add emotion text
            cv2.putText(
                frame,
                f"Simulated: {emotion}",
                (180, 100),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (255, 255, 255),
                2
            )
            
            # Add instruction text
            cv2.putText(
                frame,
                "Camera not available - Using simulation",
                (120, 400),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (200, 200, 200),
                1
            )
            
            self.simulation_frames.append((frame, emotion))
    
    def detect_emotion(self, frame):
        """
        Detect faces and emotions in a frame.
        
        Args:
            frame: The video frame to process
            
        Returns:
            tuple: (processed_frame, emotion)
        """
        # If in simulation mode (no real camera available), return simulated frames
        if self.simulation_mode:
            # Get the current simulation frame and emotion
            simulated_frame, emotion = self.simulation_frames[self.current_frame_index]
            
            # Move to the next frame (cycling through emotions)
            self.current_frame_index = (self.current_frame_index + 1) % len(self.simulation_frames)
            
            # Update last detected emotion
            self.last_emotion = emotion
            
            # Return the simulated frame
            return simulated_frame, emotion
            
        # Process real camera frame
        try:
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            # Create a copy of the frame to draw on
            result_frame = frame.copy()
            
            # If no faces detected
            if len(faces) == 0:
                # Display message
                cv2.putText(
                    result_frame,
                    "No face detected",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 0, 255),
                    2
                )
                self.last_emotion = "No face detected"
                return result_frame, self.last_emotion
            
            # Process each face
            for (x, y, w, h) in faces:
                # Draw rectangle around face
                cv2.rectangle(result_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                
                # Extract face region
                face_roi = gray[y:y+h, x:x+w]
                
                # Simplified emotion detection logic
                # In a real-world application, you would use a trained model here
                # This is a placeholder that randomly assigns emotions based on face features
                
                # Calculate some basic metrics from the face
                avg_pixel = np.mean(face_roi)
                std_pixel = np.std(face_roi)
                
                # Enhanced emotion detection with more nuanced emotions
                # This is still a simplified approach for demonstration purposes
                # In a real application, you would use a proper ML model
                
                # Calculate facial features
                avg_pixel = np.mean(face_roi)
                std_pixel = np.std(face_roi)
                
                # Get symmetry by comparing left and right halves of face
                face_width = face_roi.shape[1]
                left_half = face_roi[:, :face_width//2]
                right_half = face_roi[:, face_width//2:]
                right_half_flipped = cv2.flip(right_half, 1)  # Flip for comparison
                
                # Compare halves (if they're different sizes, use the minimum dimensions)
                min_height = min(left_half.shape[0], right_half_flipped.shape[0])
                min_width = min(left_half.shape[1], right_half_flipped.shape[1])
                left_half_resized = left_half[:min_height, :min_width]
                right_half_flipped_resized = right_half_flipped[:min_height, :min_width]
                
                # Calculate absolute difference between face halves
                face_symmetry = np.mean(cv2.absdiff(left_half_resized, right_half_flipped_resized))
                face_symmetry_normalized = face_symmetry / 255.0  # Normalize to 0-1
                
                # Detect edge features to estimate facial muscle activity
                edges = cv2.Canny(face_roi, 100, 200)
                edge_density = np.sum(edges > 0) / (face_roi.shape[0] * face_roi.shape[1])
                
                # Use a more sophisticated selection logic for nuanced emotions
                if self.use_nuanced_emotions:
                    # Map features to emotion categories
                    if edge_density > 0.15:  # High facial activity
                        if std_pixel > 60:  # High contrast/expressive
                            if avg_pixel > 130:  # Brighter/happier expressions
                                if face_symmetry_normalized < 0.15:  # Symmetrical happy face
                                    emotion_options = ['Joyful', 'Excited', 'Proud']
                                else:  # Less symmetrical - could be excitement or surprise
                                    emotion_options = ['Amused', 'Grateful', 'Astonished']
                            elif avg_pixel > 90:  # Medium brightness
                                if face_symmetry_normalized < 0.2:
                                    emotion_options = ['Confident', 'Interested', 'Curious']
                                else:
                                    emotion_options = ['Amazed', 'Perplexed', 'Confused']
                            else:  # Darker/negative expressions
                                if face_symmetry_normalized < 0.2:
                                    emotion_options = ['Angry', 'Indignant', 'Frustrated']
                                else:
                                    emotion_options = ['Irritated', 'Defensive', 'Resentful']
                        else:  # Lower contrast but still active
                            if avg_pixel > 120:
                                emotion_options = ['Content', 'Hopeful', 'Thoughtful']
                            elif avg_pixel > 90:
                                emotion_options = ['Uncertain', 'Anxious', 'Worried']
                            else:
                                emotion_options = ['Melancholic', 'Disappointed', 'Sad']
                    else:  # Lower facial activity
                        if std_pixel > 40:  # Some expressiveness
                            if avg_pixel > 120:
                                emotion_options = ['Content', 'Calm', 'Neutral']
                            elif avg_pixel > 90:
                                emotion_options = ['Thoughtful', 'Nostalgic', 'Distracted']
                            else:
                                emotion_options = ['Lonely', 'Bored', 'Insecure']
                        else:  # Very low expressiveness
                            emotion_options = ['Neutral', 'Calm', 'Distracted']
                    
                    # Get a specific emotion from the options based on small variations in features
                    emotion_index = min(2, int((edge_density * 10) % 3))
                    emotion = emotion_options[emotion_index]
                    
                else:
                    # Basic emotion detection logic (fallback)
                    if std_pixel > 50:  # High contrast might indicate expressive face
                        if avg_pixel > 120:  # Brighter regions might suggest happy/surprised
                            emotion = 'Happy'
                        else:
                            emotion = 'Angry'
                    else:  # Low contrast might indicate more neutral expression
                        emotion = 'Neutral'
                self.last_emotion = emotion
                
                # Display the emotion on the frame
                cv2.putText(
                    result_frame,
                    f"Emotion: {emotion}",
                    (x, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (0, 255, 0),
                    2
                )
            
            return result_frame, self.last_emotion
            
        except Exception as e:
            logger.error(f"Error in emotion detection: {str(e)}")
            # If there's an error processing the frame, switch to simulation mode
            self.simulation_mode = True
            return self.detect_emotion(frame)  # Recursive call in simulation mode
