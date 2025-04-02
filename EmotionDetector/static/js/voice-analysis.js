/**
 * Voice Analysis Module
 * 
 * This module handles voice recording, audio processing, tone analysis,
 * and speech recognition for the AI therapist interaction.
 */

document.addEventListener("DOMContentLoaded", function() {
    // Elements from the DOM
    const startAudioButton = document.getElementById('startAudioButton');
    const stopAudioButton = document.getElementById('stopAudioButton');
    const audioStatusText = document.getElementById('audioStatusText');
    const voiceMoodValue = document.getElementById('voiceMoodValue');
    const overallMoodValue = document.getElementById('overallMoodValue');
    const faceMoodValue = document.getElementById('faceMoodValue');

    // Therapy advice elements
    const therapyAdviceContainer = document.getElementById('therapyAdviceContainer');
    const therapyAdviceText = document.getElementById('therapyAdviceText');
    const speechStatus = document.getElementById('speechStatus');
    const recognizedSpeech = document.getElementById('recognizedSpeech');
    const speechText = document.getElementById('speechText');

    // Audio analysis state
    let mediaRecorder;
    let audioChunks = [];
    let audioContext;
    let analyser;
    let isRecording = false;
    let audioAnalysisInterval;

    // Speech recognition
    let speechRecognition;
    let isListening = false;

    // Get the same session ID that's used by the face detection
    const getSessionId = () => {
        // This function is defined in camera.js
        if (window.getSessionId) {
            return window.getSessionId();
        }
        // Fallback: generate a random session ID
        return Math.random().toString(36).substring(2, 15);
    };

    // Initialize the Web Audio API
    function initializeAudioContext() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            return true;
        } catch (err) {
            console.error('Error initializing Web Audio API:', err);
            audioStatusText.textContent = 'Error initializing audio analysis. Your browser may not support this feature.';
            audioStatusText.className = 'alert alert-danger';
            return false;
        }
    }

    // Initialize speech recognition
    function initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error("Speech recognition not supported in this browser");
            if (audioStatusText) {
                audioStatusText.textContent = 'Speech recognition is not supported in your browser.';
                audioStatusText.className = 'alert alert-warning';
            }
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRecognition();

        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
        speechRecognition.lang = 'en-US';

        // Handle speech recognition results
        speechRecognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            console.log("Speech recognized:", transcript);

            // Display recognized speech
            if (recognizedSpeech && speechText) {
                recognizedSpeech.classList.remove('d-none');
                speechText.textContent = transcript;
            }

            // Process the speech
            processSpeech(transcript);
        };

        speechRecognition.onerror = function(event) {
            console.error("Speech recognition error:", event.error);
            stopListening();
        };

        speechRecognition.onend = function() {
            console.log("Speech recognition ended");
            stopListening();

            // Restart after a short delay
            if (isRecording) {
                setTimeout(() => {
                    startListening();
                }, 1000);
            }
        };

        return true;
    }

    // Start listening for speech
    function startListening() {
        if (speechRecognition && !isListening) {
            try {
                speechRecognition.start();
                isListening = true;

                // Show listening indicator
                if (speechStatus) {
                    speechStatus.classList.remove('d-none');
                }

                console.log("Speech recognition started");
            } catch (e) {
                console.error("Error starting speech recognition:", e);
            }
        }
    }

    // Stop listening for speech
    function stopListening() {
        if (speechRecognition && isListening) {
            try {
                speechRecognition.stop();
                isListening = false;

                // Hide listening indicator
                if (speechStatus) {
                    speechStatus.classList.add('d-none');
                }

                console.log("Speech recognition stopped");
            } catch (e) {
                console.error("Error stopping speech recognition:", e);
            }
        }
    }

    // Process recognized speech
    async function processSpeech(transcript) {
        if (!transcript) return;

        const sessionId = getSessionId();

        // Update recognized speech display
        if (recognizedSpeech && speechText) {
            recognizedSpeech.classList.remove('d-none');
            speechText.innerHTML = `<p>I heard you say: "${transcript}"</p>`;
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: transcript,
                    emotion: document.getElementById('overallMoodValue')?.textContent || 'neutral',
                    chat_type: 'voice',
                    session_id: sessionId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const chatResult = await response.json();


            // Update UI with recognized speech
            if (recognizedSpeech && speechText) {
                recognizedSpeech.classList.remove('d-none');
                speechText.textContent = transcript;
            }

            // Show typing indicator
            const typingIndicator = document.querySelector('.speech-indicator');
            if (typingIndicator) {
                typingIndicator.classList.remove('d-none');
            }

            // Short delay for natural conversation flow
            await new Promise(resolve => setTimeout(resolve, 800));

            // Update the response
            if (chatResult.status === 'success') {
                updateTherapistResponse(chatResult.response, chatResult.overall_mood); //Assuming overall mood is returned
            }

            // Hide typing indicator
            if (typingIndicator) {
                typingIndicator.classList.add('d-none');
            }
        } catch (error) {
            console.error("Error processing speech:", error);
        }
    }


    // Update the therapist's response
    function updateTherapistResponse(response, emotion) {
        if (!therapyAdviceText) return;

        // Update the therapy advice text with the AI response
        therapyAdviceText.textContent = response;

        // Change the header color based on emotion
        const therapyHeader = document.getElementById('therapyAdviceHeader');
        if (therapyHeader) {
            // Remove any existing emotion classes
            const emotionClasses = ['bg-happy', 'bg-sad', 'bg-angry', 'bg-surprised', 'bg-fearful', 'bg-disgusted', 'bg-neutral'];
            therapyHeader.classList.remove(...emotionClasses);

            // Add the current emotion class
            if (emotion) {
                therapyHeader.classList.add('bg-' + emotion.toLowerCase());
            }
        }
    }

    // Start voice recording and analysis
    async function startVoiceAnalysis() {
        if (isRecording) return;

        try {
            // Initialize audio context if not already done
            if (!audioContext && !initializeAudioContext()) {
                return; // Failed to initialize
            }

            // Request microphone access
            audioStatusText.textContent = 'Requesting microphone access...';
            audioStatusText.className = 'alert alert-info';

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Connect the microphone to the audio analyzer
            const microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            // Set up the media recorder for saving audio chunks if needed
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            // Collect audio data in chunks
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            // Start recording
            mediaRecorder.start();
            isRecording = true;

            // Update UI
            startAudioButton.disabled = true;
            stopAudioButton.disabled = false;
            audioStatusText.textContent = 'Listening to your voice... Speak normally to analyze tone.';
            audioStatusText.className = 'alert alert-success';
            console.log('Voice analysis started successfully');

            // Start periodic voice analysis
            startPeriodicVoiceAnalysis();

            // Initialize and start speech recognition
            if (!speechRecognition) {
                initSpeechRecognition();
            }

            // Show the therapy advice section once recording starts
            if (therapyAdviceContainer) {
                therapyAdviceContainer.classList.remove('d-none');
            }

            // Start listening for speech
            startListening();

        } catch (err) {
            console.error('Error accessing microphone:', err);
            audioStatusText.textContent = 'Error accessing microphone: ' + err.message;
            audioStatusText.className = 'alert alert-danger';
        }
    }

    // Stop voice recording and analysis
    function stopVoiceAnalysis() {
        if (!isRecording) return;

        // Stop the media recorder
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        // Stop all microphone tracks
        if (mediaRecorder && mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }

        // Clear analysis interval
        if (audioAnalysisInterval) {
            clearInterval(audioAnalysisInterval);
            audioAnalysisInterval = null;
        }

        // Stop speech recognition
        stopListening();

        // Update UI
        isRecording = false;
        startAudioButton.disabled = false;
        stopAudioButton.disabled = true;
        audioStatusText.textContent = 'Voice analysis stopped.';
        audioStatusText.className = 'alert alert-secondary';

        // Hide therapy advice section when stopping
        if (therapyAdviceContainer) {
            therapyAdviceContainer.classList.add('d-none');
        }
    }

    // Perform periodic voice analysis
    function startPeriodicVoiceAnalysis() {
        // Clear any existing interval
        if (audioAnalysisInterval) {
            clearInterval(audioAnalysisInterval);
        }

        // Analyze voice every 2 seconds
        audioAnalysisInterval = setInterval(() => {
            if (isRecording) {
                analyzeVoice();
            }
        }, 2000);
    }

    // Analyze voice characteristics to determine emotion
    function analyzeVoice() {
        try {
            if (!analyser) return;

            // Get frequency data from the analyzer
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            // Calculate voice characteristics
            const audioFeatures = calculateAudioFeatures(dataArray);

            // Send audio features to the server for emotion analysis
            sendAudioFeaturesForAnalysis(audioFeatures);

        } catch (err) {
            console.error('Error analyzing voice:', err);
        }
    }

    // Calculate audio features from frequency data with enhanced accuracy
    function calculateAudioFeatures(frequencyData) {
        const bufferLength = frequencyData.length;
        
        // Define more precise frequency bands
        const bassRange = Math.floor(bufferLength * 0.1);  // 0-10% of spectrum
        const lowMidRange = Math.floor(bufferLength * 0.3); // 10-30% of spectrum
        const midRange = Math.floor(bufferLength * 0.6);    // 30-60% of spectrum
        const presenceRange = Math.floor(bufferLength * 0.8); // 60-80% of spectrum
        const brillianceRange = bufferLength;               // 80-100% of spectrum

        // Calculate energy in each band with weighted importance
        const bassEnergy = frequencyData.slice(0, bassRange)
            .reduce((sum, val) => sum + (val * 1.2), 0) / (bassRange * 255);
            
        const lowMidEnergy = frequencyData.slice(bassRange, lowMidRange)
            .reduce((sum, val) => sum + (val * 1.5), 0) / ((lowMidRange - bassRange) * 255);
            
        const midEnergy = frequencyData.slice(lowMidRange, midRange)
            .reduce((sum, val) => sum + (val * 2.0), 0) / ((midRange - lowMidRange) * 255);
            
        const presenceEnergy = frequencyData.slice(midRange, presenceRange)
            .reduce((sum, val) => sum + (val * 1.8), 0) / ((presenceRange - midRange) * 255);
            
        const brillianceEnergy = frequencyData.slice(presenceRange)
            .reduce((sum, val) => sum + (val * 1.3), 0) / ((brillianceRange - presenceRange) * 255);

        // Calculate advanced metrics
        const totalEnergy = frequencyData.reduce((sum, val) => sum + val, 0) / (bufferLength * 255);
        
        // Enhanced pitch detection using weighted frequency ratios
        const pitch = (presenceEnergy * 1.5 + brillianceEnergy) / (bassEnergy + lowMidEnergy);
        
        // Improved volume detection with frequency weighting
        const volume = (midEnergy * 2 + presenceEnergy * 1.5 + bassEnergy) / 3;
        
        // More accurate speech rate detection using energy variations
        const speechRate = (presenceEnergy + midEnergy) / (bassEnergy + lowMidEnergy);
        
        // Calculate spectral centroid for tone color
        let spectralCentroid = 0;
        let totalWeight = 0;
        for (let i = 0; i < bufferLength; i++) {
            spectralCentroid += i * frequencyData[i];
            totalWeight += frequencyData[i];
        }
        spectralCentroid = totalWeight > 0 ? spectralCentroid / totalWeight / bufferLength : 0;

        // Calculate spectral spread for voice consistency
        const spectralSpread = Math.sqrt(
            frequencyData.reduce((sum, val, i) => {
                const diff = (i / bufferLength) - spectralCentroid;
                return sum + (diff * diff * val);
            }, 0) / totalWeight
        );

        return {
            pitch: Math.min(1, Math.max(0, pitch)),
            volume: Math.min(1, Math.max(0, volume)),
            speechRate: Math.min(1, Math.max(0, speechRate)),
            spectralCentroid: Math.min(1, Math.max(0, spectralCentroid)),
            spectralSpread: Math.min(1, Math.max(0, spectralSpread)),
            bassEnergy,
            lowMidEnergy,
            midEnergy,
            presenceEnergy,
            brillianceEnergy,
            totalEnergy,
            consistency: 1 - spectralSpread // Higher value means more consistent voice
        };
    }

    // Send audio features to the server for emotion analysis
    async function sendAudioFeaturesForAnalysis(audioFeatures) {
        try {
            const sessionId = getSessionId();

            const response = await fetch('/api/voice-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audio_features: audioFeatures,
                    session_id: sessionId
                })
            });

            if (response.ok) {
                const result = await response.json();
                updateVoiceEmotionDisplay(result);
            } else {
                console.error('Error from voice analysis server:', await response.text());
            }
        } catch (err) {
            console.error('Error sending audio features for analysis:', err);
        }
    }

    // Update the UI with the detected voice emotion
    function updateVoiceEmotionDisplay(analysisResult) {
        if (!analysisResult) return;

        // Extract emotion data
        const voiceEmotion = analysisResult.voice_emotion;
        const faceEmotion = analysisResult.face_emotion;
        const overallMood = analysisResult.overall_mood;
        const confidence = analysisResult.confidence * 100;

        console.log('Voice analysis result:', analysisResult);

        // Update the voice mood value
        if (voiceMoodValue) {
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

        // Update the overall mood if available
        if (overallMood && overallMoodValue) {
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

        // Also update face emotion display if it's not already updated by the camera.js
        if (faceEmotion && faceMoodValue && faceMoodValue.textContent === 'Not detected') {
            faceMoodValue.textContent = faceEmotion;

            // Add emotion-specific color classes
            faceMoodValue.className = 'mood-value';
            if (faceEmotion === 'Happy') faceMoodValue.classList.add('text-success');
            else if (faceEmotion === 'Sad') faceMoodValue.classList.add('text-primary');
            else if (faceEmotion === 'Angry') faceMoodValue.classList.add('text-danger');
            else if (faceEmotion === 'Surprised') faceMoodValue.classList.add('text-warning');
            else if (faceEmotion === 'Fearful') faceMoodValue.classList.add('text-dark');
            else if (faceEmotion === 'Neutral') faceMoodValue.classList.add('text-info');
        }
    }

    // Event listeners for buttons
    if (startAudioButton) {
        startAudioButton.addEventListener('click', startVoiceAnalysis);
    }

    if (stopAudioButton) {
        stopAudioButton.addEventListener('click', stopVoiceAnalysis);
    }

    // Initialize audio context if it's supported
    if (window.AudioContext || window.webkitAudioContext) {
        console.log('Web Audio API is supported in this browser.');
    } else {
        console.warn('Web Audio API is not supported in this browser.');
        if (audioStatusText) {
            audioStatusText.textContent = 'Voice analysis is not supported in your browser.';
            audioStatusText.className = 'alert alert-warning';
        }
        if (startAudioButton) {
            startAudioButton.disabled = true;
        }
    }
});