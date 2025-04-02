/**
 * Emotion Timeline Analysis
 * 
 * This script visualizes emotion data over time using Chart.js.
 * It displays trends, patterns, and insights about emotional states.
 */

document.addEventListener('DOMContentLoaded', function() {
    // UI elements
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const noDataMessage = document.getElementById('noDataMessage');
    const emotionVisualizations = document.getElementById('emotionVisualizations');
    const totalEmotionsValue = document.getElementById('totalEmotionsValue');
    const dominantEmotionValue = document.getElementById('dominantEmotionValue');
    const moodSwitchesValue = document.getElementById('moodSwitchesValue');
    const emotionLegend = document.getElementById('emotionLegend');
    const insightCards = document.getElementById('insightCards');
    const timePeriodButtons = document.querySelectorAll('.time-period-btn');
    
    // Chart objects
    let timelineChart = null;
    let distributionChart = null;
    let faceVsVoiceChart = null;
    
    // Session ID from localStorage (stored by camera.js)
    const sessionId = getSessionId();
    
    // Default time period
    let currentTimePeriod = 1; // hours
    
    // Emotion colors
    const emotionColors = {
        'Happy': '#28a745',      // Green
        'Sad': '#0d6efd',        // Blue
        'Angry': '#dc3545',      // Red
        'Surprised': '#ffc107',  // Yellow
        'Fearful': '#343a40',    // Dark
        'Disgusted': '#6c757d',  // Secondary
        'Neutral': '#17a2b8'     // Info
    };
    
    // Icons for each emotion
    const emotionIcons = {
        'Happy': 'fa-smile',
        'Sad': 'fa-frown',
        'Angry': 'fa-angry',
        'Surprised': 'fa-surprise',
        'Fearful': 'fa-grimace',
        'Disgusted': 'fa-dizzy',
        'Neutral': 'fa-meh'
    };
    
    // Function to get session ID
    function getSessionId() {
        // Try to get from window object (set by camera.js)
        if (window.getSessionId) {
            return window.getSessionId();
        }
        
        // Try to get from localStorage (also set by camera.js)
        const storedId = localStorage.getItem('emotionSessionId');
        if (storedId) {
            return storedId;
        }
        
        // Generate a random session ID if none exists
        // This is mainly for testing - in normal use, the user would come from the main page
        const newId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('emotionSessionId', newId);
        return newId;
    }
    
    // Initialize the page by loading emotion data
    function initTimeline() {
        loadEmotionData(currentTimePeriod);
        
        // Set up event listeners for time period buttons
        timePeriodButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Get the time period from the data attribute
                const hours = parseInt(this.getAttribute('data-hours'));
                
                // Update active button
                timePeriodButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Load data for the selected time period
                currentTimePeriod = hours;
                loadEmotionData(hours);
            });
        });
    }
    
    // Load emotion data from the server for the specified time period
    async function loadEmotionData(hours) {
        try {
            // Show loading indicator
            loadingIndicator.classList.remove('d-none');
            errorMessage.classList.add('d-none');
            noDataMessage.classList.add('d-none');
            emotionVisualizations.classList.add('d-none');
            
            // Clear existing charts
            destroyCharts();
            
            // Construct API URL
            let url = `/api/emotion-timeline?session_id=${sessionId}`;
            if (hours > 0) {
                url += `&hours=${hours}`;
            }
            
            // Fetch emotion data
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status !== 'success') {
                throw new Error(data.message || 'Failed to load emotion data');
            }
            
            // Check if we have any data
            if (data.data.total_records === 0) {
                loadingIndicator.classList.add('d-none');
                noDataMessage.classList.remove('d-none');
                return;
            }
            
            // Process and display the data
            processEmotionData(data.data);
            
            // Hide loading indicator and show visualizations
            loadingIndicator.classList.add('d-none');
            emotionVisualizations.classList.remove('d-none');
            
        } catch (error) {
            console.error('Error loading emotion data:', error);
            loadingIndicator.classList.add('d-none');
            errorMessage.classList.remove('d-none');
            errorText.textContent = error.message || 'Failed to load emotion data';
        }
    }
    
    // Process and display emotion data
    function processEmotionData(data) {
        // Update summary statistics
        updateSummaryStatistics(data);
        
        // Create emotion timeline chart
        createTimelineChart(data.timeline);
        
        // Create emotion distribution chart
        createDistributionChart(data.emotion_frequency);
        
        // Create face vs voice comparison chart
        createFaceVsVoiceChart(data.timeline);
        
        // Generate insights
        generateInsights(data);
        
        // Create emotion legend
        createEmotionLegend(Object.keys(data.emotion_frequency));
    }
    
    // Update summary statistics
    function updateSummaryStatistics(data) {
        // Total emotions detected
        totalEmotionsValue.textContent = data.total_records;
        
        // Dominant emotion (most frequent)
        const emotionFrequency = data.emotion_frequency;
        if (Object.keys(emotionFrequency).length > 0) {
            const dominantEmotion = Object.keys(emotionFrequency)[0]; // First key after sorting
            dominantEmotionValue.textContent = dominantEmotion;
            dominantEmotionValue.className = 'value';
            
            // Add color based on emotion
            if (dominantEmotion === 'Happy') dominantEmotionValue.classList.add('text-success');
            else if (dominantEmotion === 'Sad') dominantEmotionValue.classList.add('text-primary');
            else if (dominantEmotion === 'Angry') dominantEmotionValue.classList.add('text-danger');
            else if (dominantEmotion === 'Surprised') dominantEmotionValue.classList.add('text-warning');
            else if (dominantEmotion === 'Fearful') dominantEmotionValue.classList.add('text-dark');
            else if (dominantEmotion === 'Disgusted') dominantEmotionValue.classList.add('text-secondary');
            else if (dominantEmotion === 'Neutral') dominantEmotionValue.classList.add('text-info');
        } else {
            dominantEmotionValue.textContent = '-';
        }
        
        // Calculate mood switches (changes in emotion)
        let switchCount = 0;
        const overallMoods = data.mood_timeline.moods;
        
        for (let i = 1; i < overallMoods.length; i++) {
            if (overallMoods[i] !== overallMoods[i-1]) {
                switchCount++;
            }
        }
        
        moodSwitchesValue.textContent = switchCount;
    }
    
    // Create timeline chart
    function createTimelineChart(timelineData) {
        const canvas = document.getElementById('emotionTimelineChart');
        
        // Format timestamps for display
        const formattedLabels = timelineData.timestamps.map(timestamp => {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });
        
        // Create a numeric representation of emotions for the chart
        const emotionValues = {
            'Happy': 5,
            'Surprised': 4,
            'Neutral': 3,
            'Fearful': 2,
            'Sad': 1,
            'Angry': 0,
            'Disgusted': -1
        };
        
        // Convert face emotions to numeric values
        const faceData = timelineData.face_emotions.map(emotion => 
            emotion ? emotionValues[emotion] : null
        );
        
        // Convert voice emotions to numeric values
        const voiceData = timelineData.voice_emotions.map(emotion => 
            emotion ? emotionValues[emotion] : null
        );
        
        // Create the chart
        timelineChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: formattedLabels,
                datasets: [
                    {
                        label: 'Face Emotion',
                        data: faceData,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                        pointBorderColor: '#fff',
                        pointRadius: 5,
                        tension: 0.1,
                        fill: false,
                        spanGaps: true
                    },
                    {
                        label: 'Voice Emotion',
                        data: voiceData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                        pointBorderColor: '#fff',
                        pointRadius: 5,
                        tension: 0.1,
                        fill: false,
                        spanGaps: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: -1,
                        max: 5,
                        ticks: {
                            callback: function(value) {
                                // Convert numeric values back to emotion labels
                                const emotions = Object.keys(emotionValues);
                                for (const emotion of emotions) {
                                    if (emotionValues[emotion] === value) {
                                        return emotion;
                                    }
                                }
                                return '';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const datasetLabel = context.dataset.label;
                                const value = context.parsed.y;
                                
                                // Convert numeric value back to emotion label
                                const emotions = Object.keys(emotionValues);
                                let emotionLabel = 'Unknown';
                                
                                for (const emotion of emotions) {
                                    if (emotionValues[emotion] === value) {
                                        emotionLabel = emotion;
                                        break;
                                    }
                                }
                                
                                return `${datasetLabel}: ${emotionLabel}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Create emotion distribution chart
    function createDistributionChart(emotionFrequency) {
        const canvas = document.getElementById('emotionDistributionChart');
        
        // Extract data for the chart
        const labels = Object.keys(emotionFrequency);
        const data = Object.values(emotionFrequency);
        
        // Get colors for each emotion
        const backgroundColors = labels.map(emotion => emotionColors[emotion] || '#6c757d');
        
        // Create the chart
        distributionChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#fff'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Create face vs voice comparison chart
    function createFaceVsVoiceChart(timelineData) {
        const canvas = document.getElementById('faceVsVoiceChart');
        
        // Count the occurrences of each emotion for face and voice
        const faceEmotions = {};
        const voiceEmotions = {};
        
        // Process face emotions
        timelineData.face_emotions.forEach(emotion => {
            if (emotion) {
                if (!faceEmotions[emotion]) {
                    faceEmotions[emotion] = 0;
                }
                faceEmotions[emotion]++;
            }
        });
        
        // Process voice emotions
        timelineData.voice_emotions.forEach(emotion => {
            if (emotion) {
                if (!voiceEmotions[emotion]) {
                    voiceEmotions[emotion] = 0;
                }
                voiceEmotions[emotion]++;
            }
        });
        
        // Get all unique emotions from both sources
        const allEmotions = [...new Set([
            ...Object.keys(faceEmotions),
            ...Object.keys(voiceEmotions)
        ])];
        
        // Prepare data for the chart
        const faceData = allEmotions.map(emotion => faceEmotions[emotion] || 0);
        const voiceData = allEmotions.map(emotion => voiceEmotions[emotion] || 0);
        
        // Create the chart
        faceVsVoiceChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: allEmotions,
                datasets: [
                    {
                        label: 'Face',
                        data: faceData,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Voice',
                        data: voiceData,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Emotion'
                        }
                    }
                }
            }
        });
    }
    
    // Generate insights based on the emotion data
    function generateInsights(data) {
        // Clear existing insight cards
        insightCards.innerHTML = '';
        
        // Insights to generate
        const insights = [];
        
        // Dominant emotion
        if (Object.keys(data.emotion_frequency).length > 0) {
            const dominantEmotion = Object.keys(data.emotion_frequency)[0];
            const dominantCount = data.emotion_frequency[dominantEmotion];
            const percentage = Math.round((dominantCount / data.total_records) * 100);
            
            insights.push({
                title: 'Dominant Emotion',
                description: `Your dominant emotion was <strong>${dominantEmotion}</strong>, making up ${percentage}% of all emotions detected.`,
                icon: `fa-${emotionIcons[dominantEmotion]}`,
                color: emotionColors[dominantEmotion]
            });
        }
        
        // Emotion stability
        const overallMoods = data.mood_timeline.moods;
        let switchCount = 0;
        for (let i = 1; i < overallMoods.length; i++) {
            if (overallMoods[i] !== overallMoods[i-1]) {
                switchCount++;
            }
        }
        
        const stabilityRatio = switchCount / Math.max(1, overallMoods.length);
        let stabilityInsight = '';
        
        if (stabilityRatio < 0.1) {
            stabilityInsight = 'Your emotions were very stable during this period.';
        } else if (stabilityRatio < 0.3) {
            stabilityInsight = 'Your emotions showed moderate stability during this period.';
        } else {
            stabilityInsight = 'Your emotions showed significant variability during this period.';
        }
        
        insights.push({
            title: 'Emotional Stability',
            description: stabilityInsight,
            icon: 'fa-balance-scale',
            color: '#6f42c1' // Purple
        });
        
        // Face-voice agreement
        const faceEmotions = data.timeline.face_emotions.filter(e => e !== null);
        const voiceEmotions = data.timeline.voice_emotions.filter(e => e !== null);
        
        // Only add this insight if we have both face and voice data
        if (faceEmotions.length > 0 && voiceEmotions.length > 0) {
            // Count of matching timestamps
            let matchCount = 0;
            let totalPairs = 0;
            
            // Simplified: just check if the latest face and voice emotions match
            const latestFace = faceEmotions[faceEmotions.length - 1];
            const latestVoice = voiceEmotions[voiceEmotions.length - 1];
            
            let agreementInsight = '';
            
            if (latestFace === latestVoice) {
                agreementInsight = `Your facial expressions and voice tone are in alignment, both showing <strong>${latestFace}</strong> emotion.`;
            } else {
                agreementInsight = `Your facial expressions (${latestFace}) and voice tone (${latestVoice}) are showing different emotions.`;
            }
            
            insights.push({
                title: 'Face-Voice Agreement',
                description: agreementInsight,
                icon: 'fa-check-circle',
                color: '#20c997' // Teal
            });
        }
        
        // Add emotional trend insight
        if (overallMoods.length >= 3) {
            const firstMood = overallMoods[0];
            const lastMood = overallMoods[overallMoods.length - 1];
            const midMood = overallMoods[Math.floor(overallMoods.length / 2)];
            
            let trendInsight = '';
            
            if (firstMood === lastMood) {
                trendInsight = `Your overall mood started and ended as <strong>${firstMood}</strong>.`;
            } else {
                trendInsight = `Your mood shifted from <strong>${firstMood}</strong> to <strong>${lastMood}</strong> during this period.`;
            }
            
            insights.push({
                title: 'Emotional Trend',
                description: trendInsight,
                icon: 'fa-chart-line',
                color: '#fd7e14' // Orange
            });
        }
        
        // Create insight cards
        insights.forEach(insight => {
            const card = document.createElement('div');
            card.className = 'col-md-6 mb-3';
            card.innerHTML = `
                <div class="stat-card">
                    <div class="d-flex align-items-center mb-2">
                        <i class="fas ${insight.icon} me-2" style="color: ${insight.color}"></i>
                        <h5 class="mb-0">${insight.title}</h5>
                    </div>
                    <p class="mb-0">${insight.description}</p>
                </div>
            `;
            
            insightCards.appendChild(card);
        });
    }
    
    // Create emotion legend for the timeline
    function createEmotionLegend(emotions) {
        // Clear existing legend
        emotionLegend.innerHTML = '';
        
        // Add legend items for each emotion
        emotions.forEach(emotion => {
            const legendItem = document.createElement('div');
            legendItem.className = 'emotion-legend-item';
            legendItem.innerHTML = `
                <i class="fas ${emotionIcons[emotion]}" style="color: ${emotionColors[emotion]}"></i>
                ${emotion}
            `;
            
            emotionLegend.appendChild(legendItem);
        });
    }
    
    // Destroy existing charts to prevent memory leaks
    function destroyCharts() {
        if (timelineChart) {
            timelineChart.destroy();
            timelineChart = null;
        }
        
        if (distributionChart) {
            distributionChart.destroy();
            distributionChart = null;
        }
        
        if (faceVsVoiceChart) {
            faceVsVoiceChart.destroy();
            faceVsVoiceChart = null;
        }
    }
    
    // Initialize the page
    initTimeline();
});