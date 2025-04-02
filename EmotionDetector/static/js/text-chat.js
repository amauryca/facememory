/**
 * Text-only Therapeutic Chat
 * 
 * This module handles the text-only AI therapist chat interface
 * for users who prefer typing over speaking.
 */

document.addEventListener("DOMContentLoaded", function() {
    // Elements from the DOM
    const chatContainer = document.getElementById('chatContainer');
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const typingIndicator = document.getElementById('typingIndicator');

    // Chat state
    let conversationHistory = [];
    let userMood = 'neutral'; // Default mood if none detected

    // Initialize the chat interface
    function initChat() {
        // Add initial AI message to conversation history
        conversationHistory.push({
            role: 'ai',
            text: "Hello! I'm your AI therapist. I'm here to listen and offer support. How are you feeling today?",
            timestamp: new Date()
        });

        // Set up event listeners
        if (chatForm) {
            chatForm.addEventListener('submit', function(e) {
                e.preventDefault();
                sendMessage();
            });
        }

        // Focus the input field
        if (messageInput) {
            messageInput.focus();
        }
    }

    // Send a message from the user
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Clear input field
        messageInput.value = '';

        // Add user message to chat
        addMessageToChat('user', message);

        // Add to conversation history
        conversationHistory.push({
            role: 'user',
            text: message,
            timestamp: new Date()
        });

        // Analyze user message for emotional content
        analyzeUserMessage(message);

        // Show typing indicator
        typingIndicator.classList.remove('d-none');

        // Simulate AI thinking time (0.5-1.5 seconds)
        //const thinkingTime = 500 + Math.random() * 1000;
        //setTimeout(() => {
            // Generate AI response
            generateAIResponse(message);

            // Hide typing indicator
            typingIndicator.classList.add('d-none');
        //}, thinkingTime);
    }

    // Add a message to the chat interface
    function addMessageToChat(sender, text, timestamp = new Date()) {
        // Create message elements
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';

        const iconElement = document.createElement('i');
        iconElement.className = sender === 'user' ? 'fas fa-user' : 'fas fa-user-md';
        avatarDiv.appendChild(iconElement);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const textP = document.createElement('p');
        textP.textContent = text;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = formatTimestamp(timestamp);

        // Assemble message
        contentDiv.appendChild(textP);
        contentDiv.appendChild(timeSpan);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        // Add to chat container
        chatContainer.appendChild(messageDiv);

        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Format timestamp for display
    function formatTimestamp(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);

        if (diffSec < 60) {
            return 'Just now';
        } else if (diffMin < 60) {
            return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        } else if (diffHour < 24) {
            return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }

    // Analyze user message for emotional content
    function analyzeUserMessage(message) {
        const lowercaseText = message.toLowerCase();

        // Simple emotion detection based on keywords
        // In a real application, this would use more sophisticated NLP
        if (lowercaseText.includes('happy') || lowercaseText.includes('joy') || 
            lowercaseText.includes('excited') || lowercaseText.includes('great') ||
            lowercaseText.includes('wonderful')) {
            userMood = 'happy';
        } else if (lowercaseText.includes('sad') || lowercaseText.includes('down') || 
                  lowercaseText.includes('depressed') || lowercaseText.includes('unhappy') ||
                  lowercaseText.includes('miserable')) {
            userMood = 'sad';
        } else if (lowercaseText.includes('angry') || lowercaseText.includes('mad') || 
                  lowercaseText.includes('furious') || lowercaseText.includes('irritated') ||
                  lowercaseText.includes('annoyed')) {
            userMood = 'angry';
        } else if (lowercaseText.includes('afraid') || lowercaseText.includes('scared') || 
                  lowercaseText.includes('anxious') || lowercaseText.includes('nervous') ||
                  lowercaseText.includes('worried')) {
            userMood = 'fearful';
        } else if (lowercaseText.includes('surprised') || lowercaseText.includes('shocked') || 
                  lowercaseText.includes('amazed') || lowercaseText.includes('unexpected')) {
            userMood = 'surprised';
        } else if (lowercaseText.includes('disgusted') || lowercaseText.includes('gross') || 
                  lowercaseText.includes('repulsed') || lowercaseText.includes('awful')) {
            userMood = 'disgusted';
        }

        // If no emotional keywords, look for sentiment clues
        if (userMood === 'neutral') {
            const negativeWords = ['not', 'no', 'never', "don't", 'cant', 'cannot', 'wont', 'isnt', 'bad', 'terrible'];
            const negativeCount = negativeWords.filter(word => lowercaseText.includes(word)).length;

            if (negativeCount > 1) {
                userMood = 'sad'; // Default negative sentiment to sadness
            }
        }
    }

    // Generate AI therapist response based on conversation history and user mood
    async function generateAIResponse(lastUserMessage) {
        try {
            // Show typing indicator
            typingIndicator.classList.remove('d-none');

            // Add human-like reading delay (varies between 2-4 seconds)
            const readingDelay = 2000 + Math.random() * 2000;
            await new Promise(resolve => setTimeout(resolve, readingDelay));

            // Add thinking particles to show AI is processing
            const thinkingDots = [".", "..", "..."];
            let dotIndex = 0;
            const thinkingInterval = setInterval(() => {
                addMessageToChat('ai', `Thinking${thinkingDots[dotIndex]}`);
                dotIndex = (dotIndex + 1) % thinkingDots.length;
                // Remove previous thinking message
                if (chatContainer.lastChild) {
                    chatContainer.removeChild(chatContainer.lastChild);
                }
            }, 500);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: lastUserMessage,
                    emotion: userMood,
                    chat_type: 'text'
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                let aiResponse = result.response;
                const words = aiResponse.split(' ');
                
                // Clear thinking animation
                clearInterval(thinkingInterval);
                
                // Type out response gradually with variable speed
                for (let i = 0; i < words.length; i += 2) {
                    const partialResponse = words.slice(0, i + 2).join(' ');
                    addMessageToChat('ai', partialResponse + (i + 2 < words.length ? '...' : ''), new Date());
                    
                    // Random typing delay between 100-300ms per word
                    const typingDelay = 100 + Math.random() * 200;
                    await new Promise(resolve => setTimeout(resolve, typingDelay));
                    
                    // Remove the last partial message except for the final one
                    if (i + 2 < words.length) {
                        chatContainer.removeChild(chatContainer.lastChild);
                    }
                    
                    // Add occasional brief pauses for longer messages
                    if (i > 0 && i % 8 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }
                }
                
                // Add conversational fillers randomly
                const fillers = [
                    "*pauses thoughtfully*",
                    "*nods*",
                    "hmm...",
                    "let me think about that...",
                    "you know..."
                ];
                
                if (Math.random() > 0.7) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const filler = fillers[Math.floor(Math.random() * fillers.length)];
                    addMessageToChat('ai', filler);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Add a conversational touch occasionally
                if (!aiResponse.includes('?') && Math.random() > 0.8) {
                    const fillers = [
                        "I hope that helps... ",
                        "What do you think about that? ",
                        "Let me know if you'd like to explore this further. ",
                        "Take your time to process this... "
                    ];
                    aiResponse += fillers[Math.floor(Math.random() * fillers.length)];
                }

                // Hide typing indicator after full response
                typingIndicator.classList.add('d-none');
                
                // Save the final response to conversation history
                conversationHistory.push({ role: 'ai', text: aiResponse, timestamp: new Date() });
            } else {
                const errorResponse = "I hear you. What else is on your mind?";
                addMessageToChat('ai', errorResponse);
                conversationHistory.push({ role: 'ai', text: errorResponse, timestamp: new Date() });
            }
        } catch (error) {
            console.error('Error generating response:', error);
            const errorResponse = "I'm listening. Please continue.";
            addMessageToChat('ai', errorResponse);
            conversationHistory.push({ role: 'ai', text: errorResponse, timestamp: new Date() });
        }
    }


    // Get therapist response based on user message and mood (This function is largely unused now)
    function getTherapistResponseToText(userText, mood) {
        const lowercaseText = userText.toLowerCase();

        // Check for greetings or conversation starters
        if (isGreeting(lowercaseText)) {
            return "Hello! It's nice to connect with you. How have you been feeling lately?";
        }

        // Check for thank you messages
        if (isThankYou(lowercaseText)) {
            return "You're welcome. I'm here to support you whenever you need to talk.";
        }

        // Check for common keywords in the user's text

        // If the user mentions feeling worse or better
        if (lowercaseText.includes('worse') || lowercaseText.includes('bad') || 
            lowercaseText.includes('terrible') || lowercaseText.includes('awful')) {
            return "I'm sorry to hear you're feeling this way. It takes courage to acknowledge difficult emotions. What do you think might be contributing to these feelings? Often, identifying specific triggers can be a first step toward addressing them.";
        }

        if (lowercaseText.includes('better') || lowercaseText.includes('good') || 
            lowercaseText.includes('great') || lowercaseText.includes('improving')) {
            return "I'm glad to hear there's some positive movement in how you're feeling. What changes or actions do you think have been helpful? Recognizing what works for you can be valuable information for maintaining well-being in the future.";
        }

        // If the user asks how to feel better
        if (lowercaseText.includes('how') && 
            (lowercaseText.includes('better') || lowercaseText.includes('improve') || 
             lowercaseText.includes('help') || lowercaseText.includes('cope'))) {
            return "That's a thoughtful question. Different strategies work for different people, and it's okay to try various approaches. Some find that brief mindfulness practices help ground them in the present. Others benefit from physical movement or creative expression. Social connection can also be powerful. What types of activities have you found helpful in the past?";
        }

        // If the user mentions specific people
        if (lowercaseText.includes('friend') || lowercaseText.includes('family') || 
            lowercaseText.includes('partner') || lowercaseText.includes('spouse') || 
            lowercaseText.includes('colleague') || lowercaseText.includes('boss')) {
            return "Relationships play such a significant role in our emotional well-being. Could you tell me more about this particular relationship and how it's affecting you? Understanding the dynamics might help us explore constructive ways to navigate the situation while protecting your emotional health.";
        }

        // If the user mentions work or school stress
        if (lowercaseText.includes('work') || lowercaseText.includes('job') || 
            lowercaseText.includes('school') || lowercaseText.includes('study') || 
            lowercaseText.includes('stress') || lowercaseText.includes('pressure')) {
            return "Managing external pressures can be really challenging. It sounds like you're experiencing significant demands right now. How have you been balancing these responsibilities with your own needs? Sometimes even small adjustments to routines or expectations can help make these pressures more manageable.";
        }

        // If the user mentions sleep issues
        if (lowercaseText.includes('sleep') || lowercaseText.includes('tired') || 
            lowercaseText.includes('insomnia') || lowercaseText.includes('exhausted')) {
            return "Sleep and emotional well-being are so closely connected. Changes in sleep patterns can both reflect and impact our mental state. Have you noticed any patterns or factors that seem to affect your sleep quality? Sometimes creating a consistent pre-sleep routine can help signal to your body that it's time to wind down.";
        }

        // If the user mentions physical symptoms
        if (lowercaseText.includes('pain') || lowercaseText.includes('headache') || 
            lowercaseText.includes('stomach') || lowercaseText.includes('body') ||
            lowercaseText.includes('physically')) {
            return "Our physical and emotional well-being are deeply interconnected. Physical sensations can sometimes be expressions of emotional stress, while physical discomfort can certainly affect our mood. Have you noticed any relationship between these physical experiences and particular situations or emotions?";
        }

        // Default responses based on detected mood
        return getDefaultResponseForMood(mood);
    }

    // Check if the message is a greeting
    function isGreeting(text) {
        const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
        return greetings.some(greeting => text.includes(greeting));
    }

    // Check if the message is a thank you
    function isThankYou(text) {
        const thanks = ['thank you', 'thanks', 'appreciate it', 'grateful', 'thx'];
        return thanks.some(thank => text.includes(thank));
    }

    // Get default response based on user mood
    function getDefaultResponseForMood(mood) {
        const responses = {
            'happy': "It's wonderful to hear the positive energy in your message. What aspects of your current situation are bringing you joy? Sometimes reflecting on these positive elements can help us understand what truly matters to us.",

            'sad': "I can sense some sadness in your message. It's completely natural to experience these feelings. Would you like to explore what might be contributing to this? Understanding the underlying factors can sometimes help us process these emotions in a meaningful way.",

            'angry': "I notice some frustration in your message. Anger often signals that something important to us has been violated or threatened. What do you think might be at the core of these feelings? Sometimes identifying the underlying need can help address the source rather than just the symptom.",

            'surprised': "Your message suggests you might be processing something unexpected. When surprising events or information come our way, it can take time to integrate them into our understanding. What aspects of this situation feel most significant to you?",

            'fearful': "I can sense some anxiety or concern in your message. These feelings often emerge when we're facing uncertainty or perceived threats. Would you feel comfortable sharing what specific worries are on your mind? Sometimes naming our fears can help reduce their intensity.",

            'disgusted': "Your message suggests you might be experiencing a strong adverse reaction to something. These powerful responses often connect to our core values. What aspects of the situation trigger this reaction for you? Understanding the connection to our values can help process these feelings.",

            'neutral': "Thank you for sharing. I'm curious to learn more about what's on your mind today. What would be most helpful for us to explore together?"
        };

        return responses[mood] || "I appreciate you sharing with me. What's been most on your mind lately?";
    }

    // Initialize chat when DOM is ready
    initChat();
});