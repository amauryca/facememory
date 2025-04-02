/**
 * Therapeutic Advice Module
 * 
 * This module provides real-time therapeutic advice based on detected emotions,
 * similar to what a doctorate-level therapist might offer to help improve mood.
 */

document.addEventListener("DOMContentLoaded", function() {
    // Elements from the DOM
    const adviceContainer = document.getElementById('therapyAdviceContainer');
    const adviceText = document.getElementById('therapyAdviceText');
    const adviceHeader = document.getElementById('therapyAdviceHeader');
    const responseInput = document.getElementById('userResponseInput');
    const responseForm = document.getElementById('userResponseForm');

    // Keep track of the conversation and emotional state
    let conversationHistory = [];
    let currentEmotionalState = {
        face: 'Unknown',
        voice: 'Unknown',
        overall: 'Unknown',
        confidence: 0
    };

    // Reference to emotion update interval
    let emotionCheckInterval = null;

    // Initialize the therapy advice module
    function initTherapyAdvice() {
        // Wait for emotion data to be available before starting
        startEmotionChecking();

        // Set up event listeners
        if (responseForm) {
            responseForm.addEventListener('submit', function(e) {
                e.preventDefault();
                submitUserResponse();
            });
        }
    }

    // Start checking for emotion updates
    function startEmotionChecking() {
        if (emotionCheckInterval) {
            clearInterval(emotionCheckInterval);
        }

        // Check for emotion updates every 3 seconds
        emotionCheckInterval = setInterval(checkEmotionUpdates, 3000);
    }

    // Check for updates to the emotional state
    function checkEmotionUpdates() {
        const faceEmotion = document.getElementById('faceMoodValue');
        const voiceEmotion = document.getElementById('voiceMoodValue');
        const overallMood = document.getElementById('overallMoodValue');
        const confidenceEl = document.getElementById('currentConfidence');

        // Only proceed if we have elements and they're not showing the initial state
        if (!faceEmotion || !voiceEmotion || !overallMood) return;
        if (faceEmotion.textContent === 'Not detected' && 
            voiceEmotion.textContent === 'Not detected' && 
            overallMood.textContent === 'Not analyzed') return;

        // Check if emotions have changed
        const newState = {
            face: faceEmotion.textContent,
            voice: voiceEmotion.textContent,
            overall: overallMood.textContent,
            confidence: parseInt(confidenceEl?.textContent || '0')
        };

        // If significant change in emotional state, generate new advice
        if (hasEmotionChanged(currentEmotionalState, newState)) {
            currentEmotionalState = newState;
            generateTherapeuticAdvice(newState);
        }
    }

    // Determine if emotional state has significantly changed
    function hasEmotionChanged(oldState, newState) {
        // No change if both overall emotions are the same
        if (oldState.overall === newState.overall && oldState.overall !== 'Unknown') return false;

        // Consider it changed if the state moved from unknown to known
        if (oldState.overall === 'Unknown' && newState.overall !== 'Not analyzed') return true;

        // Consider it changed if either face or voice emotion changed
        if (oldState.face !== newState.face && newState.face !== 'Not detected') return true;
        if (oldState.voice !== newState.voice && newState.voice !== 'Not detected') return true;

        return false;
    }

    // Generate therapeutic advice based on the current emotional state
    function generateTherapeuticAdvice(emotionalState) {
        if (emotionalState.overall === 'Unknown' || 
            emotionalState.overall === 'Not analyzed') return;

        // Make sure the advice container is visible
        if (adviceContainer) {
            adviceContainer.classList.remove('d-none');
        }

        // Generate appropriate header based on emotional state
        if (adviceHeader) {
            const emotion = emotionalState.overall;
            adviceHeader.textContent = getAdviceHeaderForEmotion(emotion);

            // Update header background color based on emotion
            updateHeaderColorForEmotion(emotion);
        }

        // Generate advice text based on emotional state
        if (adviceText) {
            const advice = getTherapeuticAdviceForEmotion(emotionalState.overall);

            // Set the advice with a typing animation effect
            typeWriterEffect(adviceText, advice);

            // Add to conversation history
            conversationHistory.push({
                role: 'therapist',
                text: advice,
                emotion: emotionalState.overall
            });
        }
    }

    // Get appropriate header text based on emotion - now with support for nuanced emotions
    function getAdviceHeaderForEmotion(emotion) {
        // Basic emotion headers
        const basicHeaders = {
            'Happy': 'Reinforcing Positive Emotions',
            'Sad': 'Coping with Sadness',
            'Angry': 'Managing Anger and Frustration',
            'Surprised': 'Processing Unexpected Events',
            'Fearful': 'Addressing Fear and Anxiety',
            'Disgusted': 'Handling Negative Reactions',
            'Neutral': 'Emotional Check-in'
        };

        // Nuanced emotion headers grouped by category
        const nuancedHeaders = {
            // Happiness variants
            'Joyful': 'Celebrating Joy and Delight',
            'Content': 'Appreciating Contentment',
            'Excited': 'Channeling Excitement',
            'Proud': 'Honoring Achievements',
            'Grateful': 'Practicing Gratitude',
            'Amused': 'Finding Humor and Lightness',

            // Sadness variants
            'Melancholic': 'Understanding Melancholy',
            'Disappointed': 'Navigating Disappointment',
            'Grieving': 'Moving Through Grief',
            'Lonely': 'Addressing Loneliness',
            'Nostalgic': 'Reflecting on Nostalgia',

            // Anger variants
            'Irritated': 'Managing Irritation',
            'Frustrated': 'Working Through Frustration',
            'Indignant': 'Channeling Righteous Indignation',
            'Defensive': 'Understanding Defensive Reactions',
            'Resentful': 'Resolving Resentment',

            // Fear variants
            'Anxious': 'Calming Anxiety',
            'Overwhelmed': 'Finding Balance When Overwhelmed',
            'Worried': 'Addressing Specific Worries',
            'Nervous': 'Managing Nervousness',
            'Insecure': 'Building Security and Confidence',

            // Surprise variants
            'Amazed': 'Embracing Wonder and Amazement',
            'Confused': 'Clarifying Confusion',
            'Astonished': 'Processing Astonishment',
            'Perplexed': 'Navigating Perplexity',
            'Curious': 'Following Your Curiosity',

            // Complex emotions
            'Hopeful': 'Nurturing Hope',
            'Bored': 'Overcoming Boredom',
            'Uncertain': 'Finding Clarity in Uncertainty',
            'Embarrassed': 'Moving Past Embarrassment',
            'Confident': 'Building on Confidence',
            'Calm': 'Maintaining Inner Calm',
            'Distracted': 'Improving Focus',
            'Thoughtful': 'Deepening Reflection',
            'Interested': 'Exploring Areas of Interest',
            'Skeptical': 'Balancing Healthy Skepticism'
        };

        // Combine both header sets
        const allHeaders = {...basicHeaders, ...nuancedHeaders};

        // Return the appropriate header or a default if not found
        return allHeaders[emotion] || 'Therapeutic Guidance';
    }

    // Submit user's text response to the therapeutic advice
    function submitUserResponse() {
        if (!responseInput || !responseInput.value.trim()) return;

        const userText = responseInput.value.trim();

        // Create a user message element to show the user's input
        try {
            const userMessageContainer = document.createElement('div');
            userMessageContainer.className = 'user-message mb-4 d-flex justify-content-end';

            const messageBubble = document.createElement('div');
            messageBubble.className = 'message-bubble bg-primary text-white';

            const messageText = document.createElement('p');
            messageText.textContent = userText;

            messageBubble.appendChild(messageText);
            userMessageContainer.appendChild(messageBubble);

            // Add user message to the DOM right after the therapist message
            const therapistMessage = document.querySelector('.therapist-message');
            if (therapistMessage && therapistMessage.parentNode) {
                therapistMessage.parentNode.insertBefore(userMessageContainer, therapistMessage.nextSibling);
            }

            // Add to conversation history
            conversationHistory.push({
                role: 'user',
                text: userText,
                emotion: currentEmotionalState.overall
            });

            // Clear input and focus it for the next message
            responseInput.value = '';
            responseInput.focus();

            // Generate a response based on the conversation history
            generateTherapistResponse(userText);
        } catch (error) {
            console.error("Error creating user message:", error);
        }
    }

    // Generate therapist response based on user input and conversation history
    function generateTherapistResponse(userText) {
        // Show a "Thinking..." indicator while processing
        adviceText.textContent = "Thinking...";

        // Use setTimeout to create a small delay for a more natural conversation flow
        setTimeout(() => {
            // First, analyze the content of what the user is saying
            const messageAnalysis = analyzeUserMessage(userText);

            // Then generate a response that acknowledges both their emotional state and content
            const response = getEnhancedTherapistResponse(userText, currentEmotionalState.overall, messageAnalysis);

            // Sanitize the response to prevent any weird characters
            const sanitizedResponse = response.replace(/[^\x20-\x7E\s.,?!;:()\-'"/\\&$@#%^*+=[\]{}|<>]/g, '');

            // Update the advice text with the response
            if (adviceText) {
                typeWriterEffect(adviceText, sanitizedResponse);

                // Add to conversation history
                conversationHistory.push({
                    role: 'therapist',
                    text: sanitizedResponse,
                    emotion: currentEmotionalState.overall
                });

                // Update the header color based on emotion
                updateHeaderColorForEmotion(currentEmotionalState.overall);
            }
        }, 1000); // 1 second delay for natural conversation pace
    }

    // Analyze the content of the user's message to identify themes and concerns
    function analyzeUserMessage(text) {
        const lowercaseText = text.toLowerCase();

        // Identify key themes in the message
        const themes = {
            personal: /\b(i|me|my|myself)\b/.test(lowercaseText),
            relationships: /\b(friend|family|partner|spouse|relationship|people)\b/.test(lowercaseText),
            work: /\b(work|job|career|office|boss|colleague)\b/.test(lowercaseText),
            health: /\b(health|sick|pain|doctor|symptom|therapy)\b/.test(lowercaseText),
            future: /\b(future|plan|hope|dream|goal|aspire|achieve)\b/.test(lowercaseText),
            past: /\b(past|before|used to|memory|childhood|remember|regret)\b/.test(lowercaseText),
            anxiety: /\b(anxious|worry|stress|overwhelm|fear|afraid|panic)\b/.test(lowercaseText),
            depression: /\b(sad|depress|hopeless|lonely|blue|down|empty)\b/.test(lowercaseText),
            anger: /\b(angry|mad|frustrat|upset|rage|annoyed|irritat)\b/.test(lowercaseText),
            positive: /\b(happy|joy|excit|good|great|wonderful|love|like|enjoy)\b/.test(lowercaseText),
            question: /\?/.test(text) || /\bhow\b|\bwhy\b|\bwhat\b|\bwhere\b|\bwhen\b/.test(lowercaseText)
        };

        // Sentiment analysis (very simplified)
        let sentiment = 'neutral';
        const positiveWords = ['good', 'great', 'happy', 'joy', 'wonderful', 'love', 'like', 'enjoy', 'better', 'improving'];
        const negativeWords = ['bad', 'sad', 'angry', 'anxious', 'depressed', 'worried', 'upset', 'stressed', 'hurt', 'pain'];

        let positiveCount = 0;
        let negativeCount = 0;

        positiveWords.forEach(word => {
            if (lowercaseText.includes(word)) positiveCount++;
        });

        negativeWords.forEach(word => {
            if (lowercaseText.includes(word)) negativeCount++;
        });

        if (positiveCount > negativeCount) sentiment = 'positive';
        else if (negativeCount > positiveCount) sentiment = 'negative';

        // Length analysis
        const length = text.split(' ').length;
        const complexityLevel = length < 5 ? 'brief' : length > 20 ? 'detailed' : 'moderate';

        return {
            themes,
            sentiment,
            complexityLevel,
            wordCount: length
        };
    }

    // Enhanced therapist response that accounts for both emotion and message content
    function getEnhancedTherapistResponse(userText, currentEmotion, messageAnalysis) {
        // First, acknowledge the detected emotion
        let response = '';

        // Add emotion acknowledgment if the emotion is significant
        if (currentEmotion !== 'Neutral') {
            if (currentEmotion === 'Happy' || currentEmotion === 'Content' || currentEmotion === 'Excited') {
                response += "I notice that you're expressing positive emotions, which is wonderful to see. ";
            } else if (currentEmotion === 'Sad' || currentEmotion === 'Melancholic' || currentEmotion === 'Disappointed') {
                response += "I can see that you might be feeling some sadness right now. ";
            } else if (currentEmotion === 'Angry' || currentEmotion === 'Irritated' || currentEmotion === 'Frustrated') {
                response += "I'm observing some frustration or anger in your expression, which is completely valid. ";
            } else if (currentEmotion === 'Fearful' || currentEmotion === 'Anxious' || currentEmotion === 'Worried') {
                response += "Your expression suggests you might be feeling some anxiety or concern. ";
            } else if (currentEmotion === 'Surprised' || currentEmotion === 'Confused') {
                response += "You seem a bit surprised or uncertain right now. ";
            } else {
                response += `I notice your emotion appears to be ${currentEmotion.toLowerCase()}. `;
            }
        }

        // Next, respond to the content of their message
        const { themes, sentiment, complexityLevel } = messageAnalysis;

        // Handle questions directly
        if (themes.question) {
            response += getResponseToQuestion(userText, currentEmotion);
            return response;
        }

        // Handle specific themes
        if (themes.personal && themes.future) {
            response += "I hear you reflecting on your personal future. Taking time to consider your path forward shows self-awareness and thoughtfulness. ";
        } else if (themes.personal && themes.past) {
            response += "You're sharing about your past experiences, which can provide valuable insights into your current situation. How do you feel these experiences have shaped you? ";
        } else if (themes.relationships && sentiment === 'negative') {
            response += "Relationship challenges can be particularly difficult. What aspects of these interactions feel most important to address right now? ";
        } else if (themes.work && themes.anxiety) {
            response += "Work-related stress can be quite consuming. What specific aspects of your work situation feel most challenging? ";
        } else if (themes.health) {
            response += "Your health and wellbeing are important priorities. How are you balancing taking care of yourself with other responsibilities? ";
        }

        // If no specific themes matched, use the default response based on emotion
        if (response.length < 60) {
            response += getTherapistResponseToText(userText, currentEmotion);
        }

        // For very brief responses, encourage elaboration
        if (complexityLevel === 'brief' && messageAnalysis.wordCount < 5) {
            response += " Could you tell me a bit more about what's on your mind?";
        }

        return response;
    }

    // Generate responses for questions
    function getResponseToQuestion(question, emotion) {
        const lowercaseQuestion = question.toLowerCase();

        if (lowercaseQuestion.includes('how') && lowercaseQuestion.includes('feel better')) {
            return "That's a thoughtful question about feeling better. Small, consistent steps often lead to meaningful change. Consider activities that have brought you joy in the past, gentle physical movement, connecting with supportive people, or brief mindfulness practices. Which of these feels most accessible to you right now?";
        } else if (lowercaseQuestion.includes('why') && 
                  (lowercaseQuestion.includes('sad') || lowercaseQuestion.includes('depressed') || lowercaseQuestion.includes('unhappy'))) {
            return "You're asking about the nature of sadness, which is a profound question. Sadness can emerge from many sources—losses, unmet needs, chemical imbalances, or even as a natural response to difficult circumstances. What aspects of your experience with sadness feel most significant to you?";
        } else if (lowercaseQuestion.includes('what') && lowercaseQuestion.includes('wrong with me')) {
            return "I hear you questioning yourself, which can be painful. Rather than thinking in terms of something being 'wrong,' it might be helpful to consider what you're experiencing as a natural response to your circumstances or a signal from your mind and body. What specific concerns led you to this question?";
        } else if (lowercaseQuestion.includes('how') && lowercaseQuestion.includes('cope')) {
            return "Finding effective coping strategies is so important. Different approaches work for different people—some find relief through creative expression, physical movement, connecting with others, mindfulness practices, or professional support. What coping methods have you tried before, and how did they work for you?";
        } else {
            return "That's a thoughtful question. I'd like to understand more about what prompted you to ask this. Could you share what aspects of this question feel most important to explore?";
        }
    }

    // Get therapist response to user text based on current emotion
    function getTherapistResponseToText(userText, emotion) {
        // Check for common therapy-related keywords in the user's text
        const lowercaseText = userText.toLowerCase();

        // If the user mentions feeling worse or better
        if (lowercaseText.includes('worse') || lowercaseText.includes('bad') || 
            lowercaseText.includes('terrible') || lowercaseText.includes('awful')) {
            return "I'm sorry to hear you're feeling this way. It's important to acknowledge these feelings without judgment. What specific aspects feel most challenging right now? Remember that experiencing difficult emotions is a normal part of being human, and these feelings don't define you.";
        }

        if (lowercaseText.includes('better') || lowercaseText.includes('good') || 
            lowercaseText.includes('great') || lowercaseText.includes('improving')) {
            return "I'm glad to hear there's some positive movement. What do you think has been helping? Recognizing the factors that contribute to feeling better can help reinforce those positive changes and build resilience for the future.";
        }

        // If the user asks how to feel better
        if (lowercaseText.includes('how') && 
            (lowercaseText.includes('better') || lowercaseText.includes('improve') || 
             lowercaseText.includes('help') || lowercaseText.includes('cope'))) {
            return "That's a thoughtful question. Small steps often lead to meaningful change. Consider trying brief mindfulness exercises, gentle physical movement, or connecting with supportive people. Which of these resonates with you most right now? Remember, different strategies work for different people, and it's okay to experiment to find what works best for you.";
        }

        // If the user mentions specific people
        if (lowercaseText.includes('friend') || lowercaseText.includes('family') || 
            lowercaseText.includes('partner') || lowercaseText.includes('spouse') || 
            lowercaseText.includes('colleague') || lowercaseText.includes('boss')) {
            return "Relationships can significantly impact our emotional well-being. Could you share more about this interaction and how it made you feel? Understanding the dynamics at play can help us explore constructive ways to navigate these relationships while protecting your emotional health.";
        }

        // If the user mentions work or school stress
        if (lowercaseText.includes('work') || lowercaseText.includes('job') || 
            lowercaseText.includes('school') || lowercaseText.includes('study') || 
            lowercaseText.includes('stress') || lowercaseText.includes('pressure')) {
            return "Managing external pressures can be challenging. It sounds like you're experiencing significant demands. How have you been balancing these responsibilities with self-care? Sometimes establishing boundaries and prioritizing tasks can help make these pressures more manageable. What strategies have worked for you in the past?";
        }

        // Default responses based on current emotion
        return getDefaultResponseForEmotion(emotion);
    }

    // Get default therapist response based on current emotion - with support for nuanced emotions
    function getDefaultResponseForEmotion(emotion) {
        // Basic emotion responses
        const basicResponses = {
            'Happy': "I notice you're expressing positive emotions. What aspects of your current situation are contributing to these feelings? Identifying these positive elements can help reinforce them and build resilience for more challenging times.",

            'Sad': "I hear what you're saying. It takes courage to acknowledge feelings of sadness. Could you share a bit more about what might be contributing to these feelings? Understanding the context can help us explore ways to process these emotions constructively.",

            'Angry': "I can sense some frustration in your response. Anger often signals that important boundaries or values have been crossed. What do you think might be at the root of these feelings? Understanding the trigger points can help develop effective coping strategies.",

            'Surprised': "Unexpected situations can sometimes leave us feeling disoriented. How are you making sense of this new information or circumstance? Taking time to process surprising developments can help integrate them into your understanding.",

            'Fearful': "It sounds like you're experiencing some anxiety. This is a natural response to perceived threats or uncertainty. What specific concerns are most present for you right now? Naming these fears can sometimes help reduce their intensity and allow us to address them more effectively.",

            'Disgusted': "Strong negative reactions often connect to our core values or past experiences. What aspects of the situation trigger this response for you? Understanding this connection can help process these feelings in a healthy way.",

            'Neutral': "Thank you for sharing. I'm curious about what's on your mind today. What would be most helpful for us to explore together?"
        };

        // Nuanced emotion responses
        const nuancedResponses = {
            // Happiness variants
            'Joyful': "Your sense of joy is wonderful to hear. What experiences or aspects of your life have contributed to this feeling? Understanding what brings us joy can help us intentionally create more of these experiences.",

            'Content': "Contentment is such a grounded, stable emotional state. What feels satisfying in your life right now? How might you preserve or extend these elements of contentment?",

            'Excited': "I can sense your excitement. What opportunities or possibilities are energizing you right now? How might you channel this positive energy productively?",

            'Proud': "Pride often comes from recognizing our achievements or expressing our values. What accomplishment or action is giving you this sense of pride? How does this connect to what matters most to you?",

            'Grateful': "Gratitude is a powerful emotion that can enhance wellbeing. What are you feeling thankful for right now? How might you express or deepen this appreciation?",

            'Amused': "Finding humor and amusement in life can be so refreshing. What's bringing a smile to your face? How does this lightheartedness influence your overall perspective?",

            // Sadness variants
            'Melancholic': "Melancholy often has a contemplative, reflective quality to it. What thoughts or memories are accompanying this feeling? Sometimes this emotion can offer valuable insights about what matters to us.",

            'Disappointed': "Disappointment often comes when our expectations aren't met. What had you hoped would happen differently? How are you making sense of this outcome?",

            'Grieving': "Grief is a profound emotional process that honors what we've lost. What or who are you grieving? How might you create space to acknowledge and move through these feelings?",

            'Lonely': "Loneliness can be quite painful. How connected do you feel to others right now? What types of connection might be most nourishing for you at this time?",

            'Nostalgic': "Nostalgia often involves a bittersweet connection to the past. What memories are surfacing for you? What feelings do these recollections evoke?",

            // Anger variants
            'Irritated': "I sense some irritation in your response. What specific things have been bothering you? Sometimes minor frustrations can accumulate and affect our overall mood.",

            'Frustrated': "Frustration often arises when we encounter obstacles to our goals. What barriers are you facing right now? How have you been trying to address them?",

            'Indignant': "Indignation often emerges when we perceive injustice or unfairness. What principles or values feel like they've been violated? How does this connect to what matters most to you?",

            'Defensive': "Taking a defensive position is natural when we feel criticized or misunderstood. What are you feeling the need to protect or justify? How might we create more safety in this conversation?",

            'Resentful': "Resentment often builds when we perceive unfairness that hasn't been addressed. What situations or interactions have felt unfair to you? How might addressing these feelings help create more emotional freedom?",

            // Fear variants
            'Anxious': "Anxiety can be quite consuming. What uncertainties or potential threats are on your mind? What typically helps you feel more grounded when anxiety arises?",

            'Overwhelmed': "Feeling overwhelmed happens when demands exceed our perceived capacity. What responsibilities or situations feel most pressing right now? How might we break these down into more manageable pieces?",

            'Worried': "Worry often focuses on specific future concerns. What particular outcomes are you concerned about? How realistic are these possibilities, and how might you prepare without becoming consumed by worry?",

            'Nervous': "Nervousness often accompanies anticipation of important events. What upcoming situations are on your mind? What resources might help you navigate these effectively?",

            'Insecure': "Insecurity typically involves doubts about our adequacy or worthiness. What aspects of yourself or your situation are you questioning? How might we explore the accuracy of these self-perceptions?",

            // Surprise variants
            'Amazed': "Amazement can be awe-inspiring and perspective-changing. What has inspired this sense of wonder? How does this experience affect your broader outlook?",

            'Confused': "Confusion occurs when we can't make sense of information or experiences that don't fit our existing understanding. What specific aspects feel unclear or contradictory? How comfortable are you with uncertainty while clarity emerges?",

            'Astonished': "Astonishment suggests something has dramatically exceeded your expectations. What has so completely surprised you? How does this change your understanding or perspective?",

            'Perplexed': "Feeling perplexed often involves struggling to understand something despite effort. What aspects of your situation seem most difficult to make sense of? How do you typically navigate situations that don't immediately make sense?",

            'Curious': "Curiosity is such a wonderful state for exploration and learning. What questions or interests are capturing your attention? How might you follow this curiosity productively?",

            // Complex emotions
            'Hopeful': "Hope involves a positive orientation toward the future despite uncertainty. What possibilities are you looking forward to? How does this hope influence your actions in the present?",

            'Bored': "Boredom can sometimes signal a need for meaningful engagement or stimulation. What typically captivates your interest? How might you introduce more novelty or challenge into your current circumstances?",

            'Uncertain': "Uncertainty can be uncomfortable yet unavoidable in many situations. What decisions or circumstances feel unclear right now? How do you typically navigate ambiguity?",

            'Embarrassed': "Embarrassment often relates to our social concerns and how we're perceived. What triggered this feeling for you? How might you respond to yourself with the same compassion you might offer a good friend in this situation?",

            'Confident': "Confidence can be empowering. What areas of your life do you feel most sure about right now? How might you build on these strengths when approaching other aspects of your life?",

            'Calm': "Calmness provides a centered foundation for clear thinking. What has helped you achieve this sense of equilibrium? How might you maintain this balanced state when challenges arise?",

            'Distracted': "Being distracted involves divided attention that can make it difficult to fully engage. What thoughts or demands are pulling at your focus? How might you create more mental space for what matters most right now?",

            'Thoughtful': "A thoughtful state involves reflective consideration. What ideas or questions have you been pondering? How do these thoughts connect to what matters most to you?",

            'Interested': "Interest drives engagement and learning. What aspects of your current situation are capturing your attention? How might you explore these areas more deeply?",

            'Skeptical': "Skepticism involves questioning or doubt that can be valuable for critical thinking. What are you finding difficult to accept or believe? What evidence might help you evaluate these doubts?"
        };

        // Combine the response sets
        const allResponses = {...basicResponses, ...nuancedResponses};

        // Return appropriate response or default
        return allResponses[emotion] || "I'm here to listen and support you. What's been on your mind recently?";
    }

    // Get therapeutic advice based on detected emotion - with support for nuanced emotions
    function getTherapeuticAdviceForEmotion(emotion) {
        // Basic emotion advice
        const basicAdvice = {
            'Happy': "It's wonderful to notice these positive feelings. Research shows that taking a moment to savor positive emotions can help extend their benefits. Consider what specific aspects of your current situation are bringing you joy, and perhaps jot them down to revisit during more challenging times. How might you intentionally incorporate more of these positive elements into your daily routine?",

            'Sad': "I notice some sadness in your expression and tone. First, I want to acknowledge that sadness is a natural and important emotion that helps us process difficult experiences. Be gentle with yourself as you navigate these feelings. Sometimes sadness is telling us something important about our needs or values. Would you be willing to explore what might be contributing to these feelings? Simple self-care practices like a brief walk, connecting with a supportive person, or engaging in a calming activity might provide some temporary relief while you process these emotions.",

            'Angry': "I notice some anger or frustration in your expression and tone. Anger often signals that something important to us has been threatened or violated. While it's a protective emotion, finding constructive ways to express it is important for our wellbeing. Taking a few deep breaths can help activate your parasympathetic nervous system, creating some mental space to respond rather than react. Would you like to explore what might be triggering these feelings? Understanding the underlying needs or boundaries that have been crossed can help address the root causes.",

            'Surprised': "I notice an expression of surprise. Unexpected events or information can sometimes leave us feeling unsettled as we integrate them into our understanding. Give yourself permission to process this new development. What aspects of this situation are most surprising to you? Sometimes writing about unexpected experiences can help us make meaning of them and adjust our perspectives accordingly. How do you typically navigate unexpected changes or information?",

            'Fearful': "I notice signs of anxiety or fear in your expression and tone. First, I want to acknowledge that fear is our brain's way of trying to protect us from perceived threats. Taking a few slow, deep breaths can help calm your nervous system. Many find it helpful to ground themselves by noticing five things they can see, four things they can touch, three things they can hear, two things they can smell, and one thing they can taste. Would you be willing to share what specific concerns are on your mind? Often, articulating fears can help reduce their intensity and allow us to approach them more effectively.",

            'Disgusted': "I notice a strong negative reaction in your expression. These powerful responses often connect to our core values or boundaries that feel violated. It's important to acknowledge these feelings without judgment. What specific aspects of the situation are triggering this response for you? Understanding this connection can help process these feelings constructively. Sometimes temporarily distancing yourself from the triggering situation can provide space to determine how you want to respond.",

            'Neutral': "I notice a neutral expression and tone. This could reflect a state of calm, or perhaps mixed or subtle emotions that aren't immediately apparent. Moments of emotional neutrality can be good opportunities for reflection. How would you describe your current emotional state in your own words? What's been on your mind today? Sometimes checking in with our bodies can reveal emotional states we haven't fully recognized."
        };

        // Nuanced emotion advice
        const nuancedAdvice = {
            // Happiness variants
            'Joyful': "I notice a sense of genuine joy in your expression. This emotion is worth savoring fully. Research in positive psychology suggests that actively appreciating joyful moments can create lasting impacts on our wellbeing. What specifically is bringing you joy right now? Taking a few moments to mindfully experience this positive state can help encode these memories more deeply. Consider how you might document or share this joy in ways that feel meaningful to you.",

            'Content': "I notice a sense of contentment in how you're expressing yourself. This balanced, satisfied emotional state is valuable and worth acknowledging. Contentment often emerges when our needs are met and we're at peace with our circumstances. What aspects of your life feel particularly satisfying right now? Sometimes deliberately recognizing the elements that contribute to our contentment can help us prioritize what truly matters to us.",

            'Excited': "Your expression suggests excitement. This energized state can be a wonderful motivator and source of creativity. What possibilities or upcoming events are generating this enthusiasm? Channeling this positive energy productively can help maximize its benefits. How might you direct this excitement toward meaningful actions or projects? Sometimes writing down specific plans while in this energized state can help harness this momentum.",

            'Proud': "I notice a sense of pride in your expression. This feeling of satisfaction in your accomplishments or qualities reflects a healthy self-valuation. What achievement or aspect of yourself is generating this pride? Taking time to acknowledge our successes can reinforce positive behaviors and build confidence. How does this accomplishment connect to your broader values or goals? Recognizing these connections can deepen the meaning of our achievements.",

            'Grateful': "I'm noticing an expression of gratitude. This emotion has been strongly linked to enhanced wellbeing and resilience. What are you feeling particularly thankful for right now? Research suggests that regularly practicing gratitude can substantially improve our outlook and relationships. Consider how you might express this appreciation directly, perhaps through a thank-you note or conversation with those who've contributed to what you value.",

            'Amused': "There's a quality of amusement in your expression. Finding humor in life's situations can provide valuable perspective and emotional relief. What's bringing this lightness or playfulness right now? Humor can be a wonderful coping mechanism and connection point with others. How does this amusement influence your overall perspective? Sometimes capturing these lighthearted moments can provide welcome relief during more challenging times.",

            // Sadness variants
            'Melancholic': "I notice a melancholic quality in your expression. This reflective, gentle sadness often has a thoughtful, even philosophical nature to it. What contemplations or memories might be accompanying this feeling? Unlike more acute sadness, melancholy can sometimes offer valuable insights about our values and longings. Would you be willing to explore what wisdom this emotional state might be offering you? Sometimes creative expression through writing or art can be particularly meaningful during melancholic periods.",

            'Disappointed': "Your expression suggests disappointment. This feeling typically emerges when our expectations aren't met or hopes aren't fulfilled. What specific hopes or expectations weren't realized? Disappointment, while uncomfortable, can help us refine our understanding of what matters to us. How are you making sense of this unmet expectation? Sometimes re-evaluating our expectations while honoring our authentic desires can help us navigate forward constructively.",

            'Grieving': "I notice signs of grief in your expression. This profound emotional response to loss deserves gentle acknowledgment and space. What or who are yougrieving? The process of grief is deeply personal and rarely linear. What might you need right now as you move through this experience? Some find comfort in rituals, creative expression, or connecting with others who understand. How might you honor this loss while also attending to your present needs?",

            'Lonely': "Your expression suggests loneliness. This feeling of disconnection or isolation is a common but challenging human experience. How connected do you feel to others right now? Loneliness often signals our fundamental need for meaningful connection. What types of interaction or relationship might feel nourishing to you at this time? Sometimes small steps toward connection, even brief authentic exchanges, can begin to address these feelings.",

            'Nostalgic': "I notice a nostalgic quality in your expression. This bittersweet emotion connects us to meaningful past experiences. What memories are particularly present for you right now? Nostalgia can serve various psychological functions, from boosting our sense of meaning to providing emotional comfort during transitions. How do these memories inform your present understanding or choices? Sometimes intentionally integrating elements from treasured past experiences into our current lives can honor their significance.",

            // Anger variants
            'Irritated': "I notice signs of irritation in your expression. These minor frustrations, while less intense than anger, can still significantly impact our experiences when they accumulate. What specific things have been bothering you? Sometimes identifying the precise triggers for our irritation can help us address them more effectively. What boundaries or needs might these feelings be signaling? Often, irritation points to areas where we might benefit from establishing clearer limits or adjusting our environment.",

            'Frustrated': "Your expression suggests frustration. This emotion typically emerges when we encounter obstacles to our goals or when our efforts don't yield expected results. What barriers or challenges have you been facing? Frustration, while uncomfortable, often contains important information about what matters to us. How have you been approaching these obstacles so far? Sometimes stepping back to reassess our strategies or adjusting our expectations can help us navigate these blocked pathways more effectively.",

            'Indignant': "I notice a sense of indignation in your expression. This emotion often emerges when we perceive an injustice or violation of important principles. What values or standards feel like they've been compromised? This righteous anger can be clarifying about our core beliefs. How might you channel this energy constructively? Some find that directed action toward addressing the underlying issues can help transform indignation into meaningful change.",

            'Defensive': "Your expression suggests a defensive position. This protective stance typically emerges when we feel criticized, misunderstood, or attacked in some way. What are you feeling the need to protect or justify? While this reaction is natural, it sometimes creates barriers to understanding. How might we create more safety in this conversation? Sometimes acknowledging the legitimate concerns on both sides can help reduce defensiveness and open more productive dialogue.",

            'Resentful': "I notice signs of resentment in your expression. These feelings often develop when we perceive persistent unfairness that hasn't been addressed or acknowledged. What situations or interactions have felt unfair to you? Unaddressed resentment can become toxic over time. What needs or boundaries weren't respected in these circumstances? Sometimes clearly identifying and expressing these underlying needs can be a first step toward resolution and emotional freedom.",

            // Fear variants
            'Anxious': "Your expression suggests anxiety. This state of heightened alertness to potential threats can be exhausting when persistent. What uncertainties or concerns are most present for you right now? Anxiety often involves anticipating future problems, sometimes overestimating their likelihood or severity. What helps you feel more grounded when anxious feelings arise? Many find that mindfulness practices, physical movement, or talking through specific concerns with a trusted person can help manage anxiety's intensity.",

            'Overwhelmed': "I notice signs of feeling overwhelmed in your expression. This sensation typically occurs when the demands we're facing exceed our perceived capacity to meet them. What responsibilities or situations feel most pressing right now? When everything seems urgent, it can be difficult to know where to begin. How might we break these demands into more manageable pieces? Sometimes identifying just one small, concrete step can help restore a sense of agency when feeling overwhelmed.",

            'Worried': "Your expression suggests worry. This emotion typically focuses on specific concerns about future outcomes. What particular situations or possibilities are you concerned about? Worry sometimes attempts to prepare us for potential problems, though it can become counterproductive when excessive. How realistic are these possibilities, and how might you prepare without becoming consumed by worry? Some find that scheduled 'worry time' helps contain these thoughts and prevent them from dominating their day.",

            'Nervous': "I notice signs of nervousness in your expression. This anticipatory state often emerges before important events or interactions. What upcoming situations are on your mind? Some nervousness can actually enhance performance by keeping us alert and engaged. What resources or preparation might help you navigate these situations effectively? Sometimes visualization techniques or rehearsing specific scenarios can help manage nervousness and build confidence.",

            'Insecure': "Your expression suggests some insecurity. These feelings of self-doubt or uncertainty about our place or capabilities can be quite uncomfortable. What aspects of yourself or your situation are you questioning? Insecurity often involves harsh self-judgment against perceived standards. How accurate are these perceptions, and what evidence might provide a more balanced view? Sometimes identifying the specific triggers for insecurity can help us address the underlying beliefs more effectively.",

            // Surprise variants
            'Amazed': "I notice amazement in your expression. This emotion of wonder and awe can be perspective-shifting and deeply meaningful. What has inspired this sense of amazement? These experiences often connect us to something larger than ourselves and can create lasting positive memories. How does this experience affect your broader outlook? Some find that intentionally seeking out experiences that inspire awe can enhance wellbeing and broaden our understanding of what's possible.",

            'Confused': "Your expression suggests confusion. This state emerges when we struggle to make sense of information or experiences that don't fit our existing understanding. What specific aspects feel unclear or contradictory? Confusion, while uncomfortable, is often a necessary part of learning and developing new perspectives. How comfortable are you with sitting in this uncertainty as clarity emerges? Sometimes articulating our specific questions can help direct our attention productively as we work through confusion.",

            'Astonished': "I notice astonishment in your expression. This intense surprise occurs when something dramatically exceeds or contradicts our expectations or beliefs. What has so completely surprised you? Astonishment can temporarily disrupt our usual ways of thinking, sometimes creating openings for new understandings. How does this change your perspective or assumptions? These moments of cognitive disruption can sometimes lead to valuable insights if we stay open to their implications.",

            'Perplexed': "Your expression suggests perplexity. This state involves puzzlement despite efforts to understand, often creating a sense of being stuck or blocked. What aspects of your situation seem most difficult to make sense of? Being perplexed can be frustrating but is often part of engaging with complex ideas or situations. How do you typically navigate circumstances that don't immediately make sense? Sometimes approaching the puzzling situation from a completely different angle, or temporarily stepping away from it, can help fresh insights emerge.",

            'Curious': "I notice curiosity in your expression. This open, inquiring state drives exploration and learning, and has been linked to numerous psychological benefits. What questions or interests are capturing your attention? Curiosity helps us expand our understanding and can create meaningful engagement with our world. How might you follow this curiosity productively? Some find that keeping a running list of questions or dedicating specific time to exploration helps nurture this valuable state.",

            // Complex emotions
            'Hopeful': "Your expression suggests hopefulness. This emotion involves positive anticipation of future possibilities despite uncertainty. What specific possibilities are you looking forward to? Hope can be a powerful motivator and source of resilience during challenging times. How does this hopeful orientation influence your actions in the present? Some find that balancing optimism with realistic planning helps them maintain hope while taking concrete steps toward desired outcomes.",

            'Bored': "I notice signs of boredom in your expression. This state of disengagement can sometimes signal a need for more meaningful stimulation or challenges. What typically captivates your interest or attention? Boredom, while uncomfortable, sometimes creates space for creativity or re-evaluation of priorities. How might you introduce more novelty or purpose into your current circumstances? Some find that following their curiosity, even in small ways, can transform boredom into engagement.",

            'Uncertain': "Your expression suggests uncertainty. This state emerges when we lack clear information or direction about important matters. What decisions or circumstances feel unclear right now? Uncertainty, while often uncomfortable, is an inevitable part of complex decision-making and growth. How do you typically navigate ambiguous situations? Some find that clarifying their core values helps them move forward even when the complete picture isn't available.",

            'Embarrassed': "I notice signs of embarrassment in your expression. This self-conscious emotion typically emerges when we feel we've violated social norms or fallen short of standards we value. What triggered this feeling for you? Embarrassment, while uncomfortable, often reflects our care about relationships and social connection. How might you respond to yourself with the same compassion you might offer a good friend in this situation? Sometimes reframing these experiences as part of our shared humanity can help reduce their sting.",

            'Confident': "Your expression suggests confidence. This sense of self-assurance and trust in our capabilities can be empowering. What areas of your life do you feel most certain about right now? Confidence often emerges from experience, preparation, and realistic self-assessment. How might you build on these strengths when approaching other aspects of your life? Some find that identifying the specific factors that contribute to their confidence helps them extend this assurance to new challenges.",

            'Calm': "I notice a sense of calm in your expression. This centered, peaceful state provides a valuable foundation for clear thinking and thoughtful decisions. What has helped you achieve this sense of equilibrium? Cultivating calm can enhance our resilience and ability to respond rather than react. How might you maintain this balanced state when challenges arise? Some find that regular mindfulness practices or specific routines help them return to this centered state more readily during stressful times.",

            'Distracted': "Your expression suggests distraction. This divided attention state can make it difficult to fully engage with any single task or interaction. What thoughts or demands are pulling at your focus? Distraction sometimes signals competing priorities or unresolved concerns. How might you create more mental space for what matters most right now? Some find that externally organizing their thoughts and commitments, or deliberately scheduling time for different concerns, helps them become more present.",

            'Thoughtful': "I notice a thoughtful quality in your expression. This reflective state involves considering ideas, experiences, or decisions with careful attention. What ideas or questions have you been pondering? These contemplative periods can yield valuable insights and deeper understanding. How do these thoughts connect to what matters most to you? Some find that journaling or discussing their reflections with others helps clarify and extend their thinking in productive ways.",

            'Interested': "Your expression shows interest. This engaged state of attention and curiosity enhances learning and connection. What aspects of your current situation are capturing your attention? Interest directs our mental resources toward specific areas, often making experiences more meaningful and memorable. How might you explore these areas of interest more deeply? Some find that following their natural interests leads to unexpected discoveries and connections between seemingly unrelated domains.",

            'Skeptical': "I notice skepticism in your expression. This questioning stance involves doubt or reservation about accepting claims at face value. What are you finding difficult to accept or believe? Healthy skepticism can be valuable for critical thinking, though exhausting if applied universally. What evidence might help you evaluate these doubts? Some find that explicitly identifying their standards for evidence helps them apply skepticism selectively and productively."
        };

        // Combine advice sets
        const allAdvice = {...basicAdvice, ...nuancedAdvice};

        // Return the appropriate advice or a default if not found
        return allAdvice[emotion] || "I notice your emotional expression. Our emotions provide valuable information about our experiences and needs. What's been on your mind recently? Taking time to reflect on our feelings can help us understand ourselves better and navigate life's challenges more effectively.";
    }

    // Update the header color based on the current emotion - with support for nuanced emotions
    function updateHeaderColorForEmotion(emotion) {
        const headerElement = document.querySelector('#therapyAdviceContainer .card-header');
        if (!headerElement) return;

        // Remove all existing emotion background classes
        headerElement.classList.remove(
            'bg-happy', 'bg-sad', 'bg-angry', 
            'bg-surprised', 'bg-fearful', 'bg-disgusted', 
            'bg-neutral', 'bg-primary', 'bg-complex'
        );

        // Group emotions by category for consistent coloring
        const happinessGroup = ['Happy', 'Joyful', 'Content', 'Excited', 'Proud', 'Grateful', 'Amused'];
        const sadnessGroup = ['Sad', 'Melancholic', 'Disappointed', 'Grieving', 'Lonely', 'Nostalgic'];
        const angerGroup = ['Angry', 'Irritated', 'Frustrated', 'Indignant', 'Defensive', 'Resentful'];
        const fearGroup = ['Fearful', 'Anxious', 'Overwhelmed', 'Worried', 'Nervous', 'Insecure'];
        const surpriseGroup = ['Surprised', 'Amazed', 'Astonished', 'Curious', 'Perplexed', 'Confused'];
        const disgustGroup = ['Disgusted'];
        const neutralGroup = ['Neutral', 'Calm', 'Bored'];
        const complexGroup = ['Thoughtful', 'Interested', 'Uncertain', 'Embarrassed', 'Confident', 'Hopeful', 
                            'Distracted', 'Skeptical'];

        // Add the appropriate emotion background class based on emotion group
        if (happinessGroup.includes(emotion)) {
            headerElement.classList.add('bg-happy');
        } else if (sadnessGroup.includes(emotion)) {
            headerElement.classList.add('bg-sad');
        } else if (angerGroup.includes(emotion)) {
            headerElement.classList.add('bg-angry');
        } else if (surpriseGroup.includes(emotion)) {
            headerElement.classList.add('bg-surprised');
        } else if (fearGroup.includes(emotion)) {
            headerElement.classList.add('bg-fearful');
        } else if (disgustGroup.includes(emotion)) {
            headerElement.classList.add('bg-disgusted');
        } else if (neutralGroup.includes(emotion)) {
            headerElement.classList.add('bg-neutral');
        } else if (complexGroup.includes(emotion)) {
            headerElement.classList.add('bg-complex');
        } else {
            // Default for any other emotions
            headerElement.classList.add('bg-primary');
        }
    }

    // Create a typewriter effect for text display with improved reliability
    function typeWriterEffect(element, text, speed = 30) {
        // Safety check
        if (!element || !text) {
            console.error("Missing element or text for typewriter effect");
            return;
        }

        // Additional safety check to ensure text is a string
        const safeText = typeof text === 'string' ? text : String(text);

        // Sanitize text to prevent invalid characters
        const sanitizedText = safeText.replace(/[^\x20-\x7E\s.,?!;:()\-'"/\\&$@#%^*+=[\]{}|<>]/g, '');

        let i = 0;
        element.textContent = '';

        // Create a new therapist message element instead of modifying existing one
        // This prevents issues when rapidly generating multiple responses
        const newMessage = document.createElement('div');
        newMessage.className = 'therapist-message mb-4';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'therapist-avatar';
        avatarDiv.innerHTML = '<i class="fas fa-user-md"></i>';

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        const paragraph = document.createElement('p');

        bubbleDiv.appendChild(paragraph);
        newMessage.appendChild(avatarDiv);
        newMessage.appendChild(bubbleDiv);

        // Replace the current therapist message with this new one
        const currentMessage = document.querySelector('.therapist-message');
        if (currentMessage && currentMessage.parentNode) {
            currentMessage.parentNode.replaceChild(newMessage, currentMessage);
        }

        // Type with error handling
        function type() {
            try {
                if (i < sanitizedText.length) {
                    paragraph.textContent += sanitizedText.charAt(i);
                    i++;
                    setTimeout(type, speed);
                }
            } catch (error) {
                console.error("Error in typewriter effect:", error);
                // Just show the full text in case of error
                paragraph.textContent = sanitizedText;
            }
        }

        // Start typing with a try-catch for added safety
        try {
            type();
        } catch (error) {
            console.error("Failed to start typewriter effect:", error);
            paragraph.textContent = sanitizedText;
        }
    }

    // Initialize when DOM is ready
    initTherapyAdvice();
});