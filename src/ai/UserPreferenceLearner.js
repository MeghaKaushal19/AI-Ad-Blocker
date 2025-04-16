class UserPreferenceLearner {
    constructor() {
        this.preferences = {};
        this.userHistory = {};
        this.learningRate = 0.1;
        this.categories = [
            'tech', 'fashion', 'sponsored', 'affiliate',
            'shopping', 'travel', 'finance', 'gaming',
            'social', 'video'
        ];
    }

    async initialize() {
        try {
            // Load saved preferences and history
            const data = await this.loadUserData();
            this.preferences = data.preferences || {};
            this.userHistory = data.history || this.initializeHistory();
            return true;
        } catch (error) {
            console.error("Error initializing preference learner:", error);
            return false;
        }
    }

    initializeHistory() {
        const history = {};
        this.categories.forEach(category => {
            history[category] = {
                shown: 0,
                clicked: 0,
                blocked: 0,
                lastInteraction: null
            };
        });
        return history;
    }

    async loadUserData() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['adPreferences', 'adHistory'], (result) => {
                resolve({
                    preferences: result.adPreferences || {},
                    history: result.adHistory || {}
                });
            });
        });
    }

    async saveUserData() {
        return new Promise((resolve) => {
            chrome.storage.sync.set({
                adPreferences: this.preferences,
                adHistory: this.userHistory
            }, resolve);
        });
    }

    // Record user interaction with an ad
    async recordInteraction(category, interaction) {
        if (!this.userHistory[category]) {
            this.userHistory[category] = {
                shown: 0,
                clicked: 0,
                blocked: 0,
                lastInteraction: null
            };
        }

        const history = this.userHistory[category];
        history.lastInteraction = Date.now();

        switch (interaction) {
            case 'shown':
                history.shown++;
                break;
            case 'clicked':
                history.clicked++;
                this.updatePreference(category, true);
                break;
            case 'blocked':
                history.blocked++;
                this.updatePreference(category, false);
                break;
        }

        await this.saveUserData();
    }

    // Update preference based on user interaction
    updatePreference(category, positive) {
        if (!this.preferences[category]) {
            this.preferences[category] = 0.5; // Initial neutral preference
        }

        const currentPreference = this.preferences[category];
        const delta = positive ? this.learningRate : -this.learningRate;
        
        // Update preference with bounds checking
        this.preferences[category] = Math.max(0, Math.min(1, currentPreference + delta));
    }

    // Get personalized recommendations
    getRecommendations() {
        const recommendations = {};
        
        for (const category of this.categories) {
            const history = this.userHistory[category] || { shown: 0, clicked: 0, blocked: 0 };
            const preference = this.preferences[category] || 0.5;
            
            // Calculate engagement rate
            const totalInteractions = history.shown || 1;
            const engagementRate = history.clicked / totalInteractions;
            
            // Calculate recency factor (higher for recent interactions)
            const daysSinceLastInteraction = history.lastInteraction 
                ? (Date.now() - history.lastInteraction) / (1000 * 60 * 60 * 24)
                : 30; // Default to 30 days if no interaction
            const recencyFactor = Math.exp(-0.1 * daysSinceLastInteraction);
            
            // Combine factors
            recommendations[category] = {
                score: (preference * 0.4 + engagementRate * 0.4 + recencyFactor * 0.2),
                preference: preference,
                engagementRate: engagementRate,
                recency: recencyFactor
            };
        }

        return recommendations;
    }

    // Get suggested categories to show/hide
    getSuggestions() {
        const recommendations = this.getRecommendations();
        const threshold = 0.4; // Threshold for showing ads

        return Object.entries(recommendations).reduce((acc, [category, data]) => {
            acc[category] = {
                show: data.score > threshold,
                confidence: Math.abs(data.score - threshold) / 0.5, // Convert to confidence score
                reason: this.getRecommendationReason(category, data)
            };
            return acc;
        }, {});
    }

    getRecommendationReason(category, data) {
        if (data.score > 0.6) {
            return `High engagement with ${category} ads`;
        } else if (data.score < 0.3) {
            return `Low interest in ${category} ads`;
        } else {
            return `Moderate interest in ${category} ads`;
        }
    }

    // Reset preferences for a category
    async resetCategory(category) {
        if (this.userHistory[category]) {
            this.userHistory[category] = {
                shown: 0,
                clicked: 0,
                blocked: 0,
                lastInteraction: null
            };
        }
        this.preferences[category] = 0.5;
        await this.saveUserData();
    }
}

export default UserPreferenceLearner; 