document.addEventListener("DOMContentLoaded", async function() {
    const video = document.getElementById('video');
    const overlay = document.getElementById('overlay');
    const startButton = document.getElementById('startDetectionButton');
    const stopButton = document.getElementById('stopDetectionButton');
    const statusText = document.getElementById('statusText');
    const emotionDisplay = document.getElementById('emotionDisplay');
    const emotionIcon = document.getElementById('emotionIcon');
    const loadingMessage = document.getElementById('loadingMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const emotionHistoryContainer = document.getElementById('emotionHistory');
    const voiceAnalysisToggle = document.getElementById('voiceAnalysisToggle');
    const voiceAnalysisStatus = document.getElementById('voiceAnalysisStatus');
    const startAudioButton = document.getElementById('startAudioButton');
    const stopAudioButton = document.getElementById('stopAudioButton');
    
    let isStreaming = false;
    let detectInterval;
    let stream = null;
    let lastRecordedEmotion = null;
    let emotionUpdateCounter = 0;
    
    // Generate a random session ID for this session
    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Make sessionId accessible to other scripts
    window.getSessionId = function() {
        return sessionId;
    };
    
    // Also store in localStorage for persistence between pages
    localStorage.setItem('emotionSessionId', sessionId);
    
    // Load face-api.js models
    async function loadModels() {
        try {
            loadingMessage.classList.remove('d-none');
            statusText.textContent = 'Loading facial recognition models...';
            
            // Use our locally stored models instead of CDN for reliability
            const MODEL_URL = '/static/models';
            
            console.log('Loading models from local path:', MODEL_URL);
            
            try {
                // Load the tiny face detector model first (more reliable across browsers)
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                console.log('TinyFaceDetector loaded successfully');
                
                // Try to load SSD MobileNet as a backup
                try {
                    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
                    console.log('SSD MobileNet model loaded successfully');
                } catch (ssdError) {
                    console.warn('Error loading SSD MobileNet model:', ssdError);
                    // Continue anyway as we already have TinyFaceDetector
                }
                
                // Load expression detection model
                await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
                
                console.log('Models loaded successfully');
                loadingMessage.classList.add('d-none');
                statusText.textContent = 'Models loaded successfully. Ready to start camera.';
                startButton.disabled = false;
                
                return true;
            } catch (error) {
                // Last resort: try to use CDN models
                try {
                    console.warn('Local models failed, falling back to CDN models');
                    statusText.textContent = 'Loading facial recognition models from backup source...';
                    
                    const CDN_MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                    
                    await faceapi.nets.tinyFaceDetector.load(CDN_MODEL_URL);
                    await faceapi.nets.faceExpressionNet.load(CDN_MODEL_URL);
                    
                    console.log('CDN Models loaded successfully');
                    loadingMessage.classList.add('d-none');
                    statusText.textContent = 'Backup models loaded successfully. Ready to start camera.';
                    startButton.disabled = false;
                    
                    return true;
                } catch (cdnError) {
                    console.error('All model loading attempts failed:', cdnError);
                    throw error; // Re-throw for the outer catch block
                }
            }
        } catch (error) {
            console.error('Error loading models:', error);
            loadingMessage.classList.add('d-none');
            statusText.textContent = 'Error loading facial recognition models. Please refresh the page.';
            statusText.className = 'alert alert-danger';
            startButton.disabled = true;
            return false;
        }
    }
    
    // Function to map face-api.js emotions to our emotion categories
    function mapEmotion(expressions) {
        // Get the emotion with the highest confidence
        let maxValue = 0;
        let maxEmotion = 'Neutral';
        
        for (const [emotion, value] of Object.entries(expressions)) {
            if (value > maxValue) {
                maxValue = value;
                maxEmotion = emotion;
            }
        }
        
        // Map face-api.js emotions to our categories
        const emotionMap = {
            'neutral': 'Neutral',
            'happy': 'Happy',
            'sad': 'Sad',
            'angry': 'Angry',
            'fearful': 'Fearful',
            'disgusted': 'Disgusted',
            'surprised': 'Surprised'
        };
        
        return {
            emotion: emotionMap[maxEmotion] || 'Neutral',
            confidence: maxValue
        };
    }
    
    // Variables to control database saves
    let lastEmotionSaveTime = 0;
    const emotionSaveInterval = 2000; // Save at most every 2 seconds
    
    // Save emotion to database
    async function saveEmotion(emotion, confidence) {
        try {
            const now = Date.now();
            
            // Don't save "No face detected" and limit frequency of database writes
            if (emotion !== 'No face detected' && now - lastEmotionSaveTime > emotionSaveInterval) {
                lastEmotionSaveTime = now;
                
                const response = await fetch('/api/emotions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        emotion: emotion,
                        confidence: confidence,
                        session_id: sessionId,
                        source: 'face'  // Specify this is from facial analysis
                    })
                });
                
                if (response.ok) {
                    // Update the emotion history display
                    loadEmotionHistory();
                    console.log(`Emotion saved: ${emotion} with confidence ${Math.round(confidence * 100)}%`);
                }
            }
        } catch (error) {
            console.error('Error saving emotion:', error);
        }
    }
    
    // Load emotion history from database
    async function loadEmotionHistory() {
        try {
            const response = await fetch(`/api/emotions?session_id=${sessionId}&limit=10`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.count > 0) {
                    updateEmotionHistoryDisplay(data.data);
                }
            }
        } catch (error) {
            console.error('Error loading emotion history:', error);
        }
    }
    
    // Update the emotion history display
    function updateEmotionHistoryDisplay(records) {
        if (!emotionHistoryContainer) return;
        
        // Clear existing content
        emotionHistoryContainer.innerHTML = '';
        
        // Also update the compact history and statistics
        const compactHistory = document.getElementById('compactHistory');
        if (compactHistory) {
            compactHistory.innerHTML = '';
        }
        
        // Update the statistics section elements
        const statCurrentEmotion = document.getElementById('statCurrentEmotion');
        const statDetectionCount = document.getElementById('statDetectionCount');
        const statDominantEmotion = document.getElementById('statDominantEmotion');
        const statAvgConfidence = document.getElementById('statAvgConfidence');
        const emotionHistoryTable = document.getElementById('emotionHistoryTable');
        
        if (records.length === 0) {
            // Set default values for empty records
            if (statCurrentEmotion) statCurrentEmotion.textContent = '-';
            if (statDetectionCount) statDetectionCount.textContent = '0';
            if (statDominantEmotion) statDominantEmotion.textContent = '-';
            if (statAvgConfidence) statAvgConfidence.textContent = '0%';
            
            if (emotionHistoryTable) {
                emotionHistoryTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No emotions recorded yet</td></tr>';
            }
            
            if (compactHistory) {
                compactHistory.innerHTML = '<div class="alert alert-secondary text-center">' +
                    '<i class="fas fa-info-circle me-2"></i>Start emotion detection to see your history</div>';
            }
            
            emotionHistoryContainer.innerHTML = '<p class="text-muted">No emotions recorded yet.</p>';
            return;
        }
        
        // Get statistics for the stats section
        const latestEmotion = records[0].emotion;
        const detectionCount = records.length;
        
        // Calculate most frequent emotion
        const emotionCounts = {};
        let totalConfidence = 0;
        
        records.forEach(record => {
            emotionCounts[record.emotion] = (emotionCounts[record.emotion] || 0) + 1;
            totalConfidence += record.confidence || 0;
        });
        
        const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) => 
            emotionCounts[a] > emotionCounts[b] ? a : b, Object.keys(emotionCounts)[0]);
        
        const averageConfidence = Math.round((totalConfidence / records.length) * 100);
        
        // Update statistics cards
        if (statCurrentEmotion) statCurrentEmotion.textContent = latestEmotion;
        if (statDetectionCount) statDetectionCount.textContent = detectionCount;
        if (statDominantEmotion) statDominantEmotion.textContent = dominantEmotion;
        if (statAvgConfidence) statAvgConfidence.textContent = `${averageConfidence}%`;
        
        // Create a list group for the emotion history
        const listGroup = document.createElement('ul');
        listGroup.className = 'list-group';
        
        // Update the detailed history table
        if (emotionHistoryTable) {
            emotionHistoryTable.innerHTML = '';
            
            // Add the latest 10 records to the table
            records.slice(0, 10).forEach(record => {
                const tr = document.createElement('tr');
                
                const timeCell = document.createElement('td');
                timeCell.textContent = new Date(record.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', minute: '2-digit', second: '2-digit' 
                });
                
                const emotionCell = document.createElement('td');
                emotionCell.innerHTML = `<span class="text-${getEmotionColor(record.emotion)}">
                    <i class="${getEmotionIconClass(record.emotion)} me-1"></i>${record.emotion}</span>`;
                
                const sourceCell = document.createElement('td');
                sourceCell.textContent = record.source || 'face';
                
                const confidenceCell = document.createElement('td');
                confidenceCell.textContent = record.confidence ? `${Math.round(record.confidence * 100)}%` : 'N/A';
                
                tr.appendChild(timeCell);
                tr.appendChild(emotionCell);
                tr.appendChild(sourceCell);
                tr.appendChild(confidenceCell);
                
                emotionHistoryTable.appendChild(tr);
            });
        }
        
        // Update compact history
        if (compactHistory) {
            records.slice(0, 15).forEach(record => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                // Apply color based on emotion
                historyItem.classList.add(`text-${getEmotionColor(record.emotion)}`);
                
                // Add icon
                const iconElement = document.createElement('i');
                const iconClass = getEmotionIconClass(record.emotion).split(' ');
                iconElement.className = iconClass[0] + ' ' + iconClass[1];
                
                // Add timestamp
                const timestamp = new Date(record.timestamp);
                const timeText = document.createElement('span');
                timeText.textContent = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                timeText.classList.add('ms-1');
                
                historyItem.appendChild(iconElement);
                historyItem.appendChild(timeText);
                
                compactHistory.appendChild(historyItem);
            });
        }
        
        // Add each emotion record to the list for the original container
        records.slice(0, 10).forEach(record => {
            const timestamp = new Date(record.timestamp);
            const formattedTime = timestamp.toLocaleTimeString();
            
            // Create list item for full history
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            // Create the emotion icon
            const iconSpan = document.createElement('span');
            iconSpan.className = getEmotionIconClass(record.emotion);
            
            // Create the emotion text
            const emotionText = document.createElement('span');
            emotionText.textContent = record.emotion;
            emotionText.classList.add(`text-${getEmotionColor(record.emotion)}`);
            
            // Create the timestamp
            const timeSpan = document.createElement('small');
            timeSpan.className = 'text-muted';
            timeSpan.textContent = formattedTime;
            
            // Add content to list item
            listItem.appendChild(iconSpan);
            listItem.appendChild(emotionText);
            listItem.appendChild(timeSpan);
            
            // Add the list item to the list group
            listGroup.appendChild(listItem);
        });
        
        // Add the list group to the container
        emotionHistoryContainer.appendChild(listGroup);
    }
    
    // Helper function to get emotion color name
    function getEmotionColor(emotion) {
        const emotionColors = {
            'Happy': 'success',
            'Joyful': 'success',
            'Content': 'success',
            'Excited': 'success',
            'Proud': 'success',
            'Grateful': 'success',
            'Amused': 'success',
            
            'Sad': 'primary',
            'Melancholic': 'primary',
            'Disappointed': 'primary',
            'Grieving': 'primary',
            'Lonely': 'primary',
            'Nostalgic': 'primary',
            
            'Angry': 'danger',
            'Irritated': 'danger',
            'Frustrated': 'danger',
            'Indignant': 'danger',
            'Defensive': 'danger',
            'Resentful': 'danger',
            
            'Surprised': 'warning',
            'Amazed': 'warning',
            'Astonished': 'warning',
            'Confused': 'warning',
            'Perplexed': 'warning',
            'Curious': 'warning',
            
            'Fearful': 'dark',
            'Anxious': 'dark',
            'Overwhelmed': 'dark',
            'Worried': 'dark',
            'Nervous': 'dark',
            'Insecure': 'dark',
            
            'Disgusted': 'secondary',
            
            'Neutral': 'info',
            
            // Complex emotion mapping
            'Hopeful': 'teal',
            'Bored': 'teal',
            'Uncertain': 'teal',
            'Embarrassed': 'teal',
            'Confident': 'teal',
            'Calm': 'teal',
            'Distracted': 'teal',
            'Thoughtful': 'teal',
            'Interested': 'teal',
            'Skeptical': 'teal'
        };
        
        return emotionColors[emotion] || 'light';
    }
    
    // Function to update the emotion dashboard UI
    function updateEmotionDashboard(emotion, confidence) {
        // Update the confidence display
        const confidencePercent = Math.round(confidence * 100);
        const confidenceDisplay = document.getElementById('currentConfidence');
        if (confidenceDisplay) {
            confidenceDisplay.textContent = confidencePercent + '%';
        }
        
        // Update the confidence bar
        const confidenceBar = document.getElementById('confidenceBar');
        if (confidenceBar) {
            confidenceBar.style.width = confidencePercent + '%';
        }
        
        // Reset all emotion cards
        document.querySelectorAll('.emotion-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Highlight the current emotion card
        if (emotion !== 'No face detected') {
            const cardId = emotion.toLowerCase() + '-card';
            const activeCard = document.getElementById(cardId);
            if (activeCard) {
                activeCard.classList.add('active');
            }
            
            // Update the face mood value in the overall mood analysis (new)
            const faceMoodValue = document.getElementById('faceMoodValue');
            if (faceMoodValue) {
                faceMoodValue.textContent = emotion;
                
                // Add emotion-specific color classes
                faceMoodValue.className = 'mood-value';
                if (emotion === 'Happy') faceMoodValue.classList.add('text-success');
                else if (emotion === 'Sad') faceMoodValue.classList.add('text-primary');
                else if (emotion === 'Angry') faceMoodValue.classList.add('text-danger');
                else if (emotion === 'Surprised') faceMoodValue.classList.add('text-warning');
                else if (emotion === 'Fearful') faceMoodValue.classList.add('text-dark');
                else if (emotion === 'Neutral') faceMoodValue.classList.add('text-info');
            }
            
            // Also get the latest overall mood data
            updateOverallMoodFromServer();
        }
    }
    
    // Function to get the latest overall mood data from the server
    async function updateOverallMoodFromServer() {
        try {
            const response = await fetch(`/api/combined-mood?session_id=${sessionId}`);
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.status === 'success' && result.data) {
                    // Update the overall mood value
                    const overallMoodValue = document.getElementById('overallMoodValue');
                    const overallMood = result.data.overall_mood;
                    
                    if (overallMoodValue && overallMood) {
                        overallMoodValue.textContent = overallMood;
                        
                        // Add emotion-specific color classes
                        overallMoodValue.className = 'mood-value';
                        if (overallMood === 'Happy') overallMoodValue.classList.add('text-success');
                        else if (overallMood === 'Sad') overallMoodValue.classList.add('text-primary');
                        else if (overallMood === 'Angry') overallMoodValue.classList.add('text-danger');
                        else if (overallMood === 'Surprised') overallMoodValue.classList.add('text-warning');
                        else if (overallMood === 'Fearful') overallMoodValue.classList.add('text-dark'); 
                        else if (overallMood === 'Neutral') overallMoodValue.classList.add('text-info');
                    }
                    
                    // Update voice mood value if not yet set by voice analysis
                    const voiceMoodValue = document.getElementById('voiceMoodValue');
                    const voiceEmotion = result.data.voice_emotion;
                    
                    if (voiceMoodValue && voiceEmotion && voiceMoodValue.textContent === 'Not detected') {
                        voiceMoodValue.textContent = voiceEmotion;
                        
                        // Add emotion-specific color classes
                        voiceMoodValue.className = 'mood-value';
                        if (voiceEmotion === 'Happy') voiceMoodValue.classList.add('text-success');
                        else if (voiceEmotion === 'Sad') voiceMoodValue.classList.add('text-primary');
                        else if (voiceEmotion === 'Angry') voiceMoodValue.classList.add('text-danger');
                        else if (voiceEmotion === 'Surprised') voiceMoodValue.classList.add('text-warning');
                        else if (voiceEmotion === 'Fearful') voiceMoodValue.classList.add('text-dark');
                        else if (voiceEmotion === 'Neutral') voiceMoodValue.classList.add('text-info');
                    }
                }
            }
        } catch (error) {
            console.error('Error getting overall mood:', error);
        }
    }
    
    // Variables to control detection frequency and emotion stability
    let lastDetectionTime = 0;
    const detectionInterval = 500; // Detect every 500ms instead of every frame
    let emotionHistory = [];
    let currentEmotion = 'No face detected';
    let noFaceDetectionCount = 0;
    
    // Helper function to get the most stable emotion from recent history
    function getStableEmotion(newEmotion) {
        // Add the new emotion to history, keeping last 5 emotions
        emotionHistory.push(newEmotion);
        if (emotionHistory.length > 5) {
            emotionHistory.shift();
        }
        
        // Count occurrences of each emotion in history
        const counts = {};
        emotionHistory.forEach(emotion => {
            counts[emotion] = (counts[emotion] || 0) + 1;
        });
        
        // Find the most frequent emotion
        let maxCount = 0;
        let stableEmotion = newEmotion; // Default to new emotion
        
        for (const [emotion, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                stableEmotion = emotion;
            }
        }
        
        return stableEmotion;
    }
    
    // Detect faces and emotions in video stream
    async function detectFaces() {
        if (!isStreaming) return;
        
        const now = Date.now();
        
        // Only run detection at specified intervals to reduce CPU usage
        if (now - lastDetectionTime < detectionInterval) {
            requestAnimationFrame(detectFaces);
            return;
        }
        
        lastDetectionTime = now;
        
        // Make sure we have a valid video stream
        if (!video.videoWidth || !video.videoHeight || video.paused || video.ended) {
            console.log("Video not ready or paused/ended. Retrying...");
            requestAnimationFrame(detectFaces);
            return;
        }
        
        // Debug logging (once every 5 seconds)
        if (now % 5000 < detectionInterval) {
            console.log("Video state:", {
                playing: !video.paused,
                time: video.currentTime,
                width: video.videoWidth,
                height: video.videoHeight,
                readyState: video.readyState
            });
        }
        
        // Set up the detection canvas size
        const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
        faceapi.matchDimensions(overlay, displaySize);
        
        // Clear previous drawings
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        
        try {
            // CRITICAL CHANGE: Use a simpler approach first - try direct detection on the video element
            let detections;
            
            try {
                // Simplified detection with very permissive parameters
                const tinyOptions = new faceapi.TinyFaceDetectorOptions({ 
                    inputSize: 160,      // Use smaller input size for faster processing
                    scoreThreshold: 0.1  // Very low threshold to catch more faces
                });
                
                // Try direct detection on video element first
                detections = await faceapi.detectAllFaces(video, tinyOptions).withFaceExpressions();
                console.log(`Direct video element detection results: ${detections.length} faces found`);
                
                // If that failed, try with a canvas approach
                if (detections.length === 0) {
                    // Create a temporary canvas
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = video.videoWidth || 640;
                    tempCanvas.height = video.videoHeight || 480;
                    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
                    
                    // Draw video frame to canvas
                    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
                    
                    // Try detection with TinyFaceDetector on canvas
                    detections = await faceapi.detectAllFaces(tempCanvas, tinyOptions).withFaceExpressions();
                    console.log(`Canvas-based detection results: ${detections.length} faces found`);
                    
                    // Last resort - try with SSD MobileNet
                    if (detections.length === 0 && faceapi.nets.ssdMobilenetv1.isLoaded) {
                        try {
                            detections = await faceapi
                                .detectAllFaces(tempCanvas, new faceapi.SsdMobilenetv1Options({ 
                                    minConfidence: 0.05  // Extremely low threshold as last resort
                                }))
                                .withFaceExpressions();
                            console.log(`SSD MobileNet detection results: ${detections.length} faces found`);
                        } catch (ssdError) {
                            console.warn("SSD MobileNet detection failed:", ssdError);
                        }
                    }
                }
            } catch (detectionError) {
                console.error('All face detection methods failed:', detectionError);
                detections = [];
            }
            
            // Log detection status for debugging
            console.log(`Face detection result: ${detections.length} faces detected`);
            
            if (detections.length > 0) {
                // Reset no face detection counter
                noFaceDetectionCount = 0;
                
                // Resize detections to match display size
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                
                // Get the most prominent face (the first one detected)
                const detection = resizedDetections[0];
                
                // Verify expressions exist
                if (detection.expressions) {
                    const expressions = detection.expressions;
                    console.log("Detected expressions:", JSON.stringify(expressions));
                    
                    const { emotion, confidence } = mapEmotion(expressions);
                    console.log("Mapped emotion:", emotion, "with confidence:", confidence);
                    
                    // Only accept emotions with reasonable confidence
                    if (confidence > 0.2) {  // Lower threshold for better usability
                        // Get stable emotion to prevent flashing
                        const stableEmotion = getStableEmotion(emotion);
                        
                        // Always update dashboard with current confidence level
                        updateEmotionDashboard(stableEmotion, confidence);
                        
                        // Only update main UI if the emotion has actually changed
                        if (stableEmotion !== currentEmotion) {
                            currentEmotion = stableEmotion;
                            updateEmotionDisplay(stableEmotion);
                            
                            // Save emotion to database (only when it changes)
                            saveEmotion(stableEmotion, confidence);
                        }
                        
                        // Draw face detection results on canvas
                        faceapi.draw.drawDetections(overlay, [detection]);
                        
                        // Draw a box with the emotion text if we have valid dimensions
                        if (detection.detection && detection.detection.box) {
                            const { x, y, width, height } = detection.detection.box;
                            ctx.strokeStyle = '#00ff00';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(x, y, width, height);
                            
                            // Draw emotion label
                            ctx.font = '16px Arial';
                            ctx.fillStyle = '#00ff00';
                            ctx.fillText(`${currentEmotion} (${Math.round(confidence * 100)}%)`, x, y - 10);
                        }
                    } else {
                        console.log("Emotion confidence too low:", confidence);
                    }
                } else {
                    console.warn("Face detected but no expressions found in detection result");
                }
            } else {
                // Increment no face detection counter
                noFaceDetectionCount++;
                
                // Only update to "No face detected" after several consecutive frames without faces
                // This prevents flickering when detection temporarily fails
                if (noFaceDetectionCount > 5 && currentEmotion !== 'No face detected') {
                    currentEmotion = 'No face detected';
                    emotionHistory = [];
                    updateEmotionDisplay('No face detected');
                    
                    // Reset emotion cards and confidence bar
                    document.querySelectorAll('.emotion-card').forEach(card => {
                        card.classList.remove('active');
                    });
                    
                    const confidenceBar = document.getElementById('confidenceBar');
                    if (confidenceBar) {
                        confidenceBar.style.width = '0%';
                    }
                    
                    const confidenceDisplay = document.getElementById('currentConfidence');
                    if (confidenceDisplay) {
                        confidenceDisplay.textContent = '0%';
                    }
                }
            }
        } catch (error) {
            console.error('Error in face detection:', error);
        }
        
        // Call the function again for continuous detection
        requestAnimationFrame(detectFaces);
    }
    
    // We no longer need the toggle, voice analysis will start/stop with the camera

    // Start the camera and emotion detection with the unified button
    startButton.addEventListener('click', async function() {
        if (!isStreaming) {
            try {
                // Show loading indicator
                if (loadingIndicator) loadingIndicator.classList.remove('d-none');
                
                console.log("Starting camera...");
                statusText.textContent = 'Starting camera...';
                
                // Request access to the webcam with specific constraints for better compatibility
                const constraints = { 
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                };
                
                console.log("Requesting video with constraints:", constraints);
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                console.log("Stream obtained:", stream.getVideoTracks()[0].getSettings());
                
                // Set up the video stream
                video.srcObject = stream;
                video.style.display = 'block';
                cameraPlaceholder.style.display = 'none';
                
                // Enable autoplay and set sizes explicitly
                video.autoplay = true;
                video.muted = true;
                video.setAttribute('playsinline', true); // Important for iOS
                
                // Wait for video to be ready with timeout
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Video load timeout'));
                    }, 5000);
                    
                    video.onloadedmetadata = () => {
                        clearTimeout(timeout);
                        console.log("Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight);
                        
                        // Ensure we have dimensions
                        if (video.videoWidth === 0 || video.videoHeight === 0) {
                            console.warn("Video dimensions are zero, using fallback sizes");
                            video.width = 640;
                            video.height = 480;
                        }
                        
                        // Play video
                        video.play().then(() => {
                            console.log("Video playing successfully");
                            
                            // Set canvas size to match video
                            overlay.width = video.clientWidth || 640;
                            overlay.height = video.clientHeight || 480;
                            console.log("Canvas size set to:", overlay.width, "x", overlay.height);
                            
                            resolve();
                        }).catch(err => {
                            console.error("Error playing video:", err);
                            reject(err);
                        });
                    };
                    
                    video.onerror = (err) => {
                        clearTimeout(timeout);
                        console.error("Video error:", err);
                        reject(err);
                    };
                });
                
                // Update UI
                startButton.disabled = true;
                startButton.classList.add('d-none'); // Hide start button
                stopButton.classList.remove('d-none'); // Show stop button
                stopButton.disabled = false;
                statusText.textContent = 'Full analysis active - Detecting emotions from face and voice...';
                statusText.className = 'alert alert-success';
                
                // Hide loading indicator
                if (loadingIndicator) loadingIndicator.classList.add('d-none');
                
                isStreaming = true;
                
                console.log("Starting face detection...");
                // Start face detection
                detectFaces();
                
                // Show the emotion history section
                const historySection = document.getElementById('emotionHistorySection');
                if (historySection) {
                    historySection.classList.remove('d-none');
                }
                
                // Automatically start voice analysis too
                if (startAudioButton) {
                    console.log("Automatically starting voice analysis...");
                    startAudioButton.click();
                    // Update voice status
                    if (voiceAnalysisStatus) {
                        voiceAnalysisStatus.textContent = 'On';
                        voiceAnalysisStatus.className = 'small text-success';
                    }
                }
                
            } catch (error) {
                console.error('Error accessing camera:', error);
                statusText.textContent = 'Error accessing camera: ' + error.message;
                statusText.className = 'alert alert-danger';
            }
        }
    });
    
    // Stop the camera and emotion detection
    stopButton.addEventListener('click', function() {
        if (isStreaming) {
            // Stop all video tracks
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            
            // Reset video
            video.srcObject = null;
            video.style.display = 'none';
            
            // Clear canvas
            const ctx = overlay.getContext('2d');
            ctx.clearRect(0, 0, overlay.width, overlay.height);
            
            // Update UI
            startButton.disabled = false;
            startButton.classList.remove('d-none'); // Show start button
            stopButton.classList.add('d-none'); // Hide stop button
            stopButton.disabled = true;
            statusText.textContent = 'Analysis stopped. Click "Start Full Analysis" to begin again.';
            statusText.className = 'alert alert-secondary';
            emotionDisplay.textContent = 'Waiting for detection...';
            
            // Reset emotion icon
            const iconElement = document.getElementById('emotionIcon');
            iconElement.className = 'emotion-icon fas fa-question-circle text-muted';
            
            // Always stop voice analysis when stopping detection
            if (stopAudioButton) {
                console.log("Stopping voice analysis...");
                stopAudioButton.click();
                // Update voice status
                if (voiceAnalysisStatus) {
                    voiceAnalysisStatus.textContent = 'Off';
                    voiceAnalysisStatus.className = 'small text-muted';
                }
            }
            
            // Reset emotion cards and confidence bar
            document.querySelectorAll('.emotion-card').forEach(card => {
                card.classList.remove('active');
            });
            
            const confidenceBar = document.getElementById('confidenceBar');
            if (confidenceBar) {
                confidenceBar.style.width = '0%';
            }
            
            const confidenceDisplay = document.getElementById('currentConfidence');
            if (confidenceDisplay) {
                confidenceDisplay.textContent = '0%';
            }
            
            // Show camera placeholder
            cameraPlaceholder.style.display = 'flex';
            
            isStreaming = false;
        }
    });
    
    // Function to animate the emotion text appearance
    function updateEmotionDisplay(emotion) {
        // Remove previous animation classes
        emotionDisplay.classList.remove('emotion-update');
        
        // Force reflow to restart animation
        void emotionDisplay.offsetWidth;
        
        // Update text and add animation class
        emotionDisplay.textContent = emotion;
        emotionDisplay.classList.add('emotion-update');
        
        // Set appropriate icon based on emotion
        const iconElement = document.getElementById('emotionIcon');
        iconElement.className = getEmotionIconClass(emotion);
    }
    
    // Map emotions to FontAwesome icon classes
    function getEmotionIconClass(emotion) {
        const iconMap = {
            'Happy': 'fas fa-smile text-success',
            'Sad': 'fas fa-frown text-primary',
            'Angry': 'fas fa-angry text-danger',
            'Surprised': 'fas fa-surprise text-warning',
            'Neutral': 'fas fa-meh text-info',
            'Fearful': 'fas fa-grimace text-dark', // Using grimace for fearful
            'Disgusted': 'fas fa-dizzy text-secondary',
            'No face detected': 'fas fa-question-circle text-muted'
        };
        
        return iconMap[emotion] || 'fas fa-question-circle text-muted';
    }
    
    // Check for camera and microphone permissions
    function checkMediaPermissions() {
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                const videoInputs = devices.filter(device => device.kind === 'videoinput');
                
                if (videoInputs.length === 0) {
                    statusText.textContent = 'No camera detected on your device.';
                    statusText.className = 'alert alert-warning';
                    startButton.disabled = true;
                }
            })
            .catch(error => {
                console.error('Error checking media devices:', error);
                statusText.textContent = 'Could not access media devices.';
                statusText.className = 'alert alert-danger';
            });
    }
    
    // Initialize
    startButton.disabled = true;
    stopButton.disabled = true;
    
    // Load face-api.js models and check permissions
    await loadModels();
    checkMediaPermissions();
});
