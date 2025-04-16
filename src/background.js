// Initialize storage with default values
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['statistics', 'whitelist', 'preferences'], (result) => {
        if (!result.statistics) {
            chrome.storage.sync.set({
                statistics: {
                    tech: { shown: 0, clicked: 0, blocked: 0 },
                    fashion: { shown: 0, clicked: 0, blocked: 0 },
                    sponsored: { shown: 0, clicked: 0, blocked: 0 },
                    affiliate: { shown: 0, clicked: 0, blocked: 0 },
                    shopping: { shown: 0, clicked: 0, blocked: 0 },
                    travel: { shown: 0, clicked: 0, blocked: 0 },
                    finance: { shown: 0, clicked: 0, blocked: 0 },
                    gaming: { shown: 0, clicked: 0, blocked: 0 },
                    social: { shown: 0, clicked: 0, blocked: 0 },
                    video: { shown: 0, clicked: 0, blocked: 0 }
                }
            });
        }
        if (!result.whitelist) {
            chrome.storage.sync.set({ whitelist: [] });
        }
        if (!result.preferences) {
            chrome.storage.sync.set({ preferences: {} });
        }
    });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'GET_STATISTICS':
            chrome.storage.sync.get(['statistics'], (result) => {
                sendResponse({ statistics: result.statistics || {} });
            });
            return true;

        case 'GET_RECOMMENDATIONS':
            chrome.storage.sync.get(['preferences'], (result) => {
                const preferences = result.preferences || {};
                const recommendations = {};
                
                Object.keys(preferences).forEach(category => {
                    const preference = preferences[category] || 0.5;
                    recommendations[category] = {
                        show: preference >= 0.4,
                        confidence: Math.min(Math.abs(preference - 0.5) * 2, 1),
                    };
                });
                
                sendResponse({ recommendations });
            });
            return true;

        case 'UPDATE_PREFERENCE':
            chrome.storage.sync.get(['preferences'], (result) => {
                const preferences = result.preferences || {};
                preferences[request.category] = request.allowed ? 1 : 0;
                chrome.storage.sync.set({ preferences }, () => {
                    sendResponse({ success: true });
                });
            });
            return true;

        case 'RECORD_INTERACTION':
            chrome.storage.sync.get(['statistics'], (result) => {
                const statistics = result.statistics || {};
                if (!statistics[request.category]) {
                    statistics[request.category] = { shown: 0, clicked: 0, blocked: 0 };
                }
                
                switch (request.interactionType) {
                    case 'shown':
                        statistics[request.category].shown++;
                        break;
                    case 'clicked':
                        statistics[request.category].clicked++;
                        break;
                    case 'blocked':
                        statistics[request.category].blocked++;
                        break;
                }
                
                chrome.storage.sync.set({ statistics }, () => {
                    sendResponse({ success: true });
                });
            });
            return true;

        case 'RESET_CATEGORY':
            chrome.storage.sync.get(['statistics', 'preferences'], (result) => {
                const statistics = result.statistics || {};
                const preferences = result.preferences || {};
                
                statistics[request.category] = { shown: 0, clicked: 0, blocked: 0 };
                preferences[request.category] = 0.5;
                
                chrome.storage.sync.set({ statistics, preferences }, () => {
                    sendResponse({ success: true });
                });
            });
            return true;

        case 'ADD_TO_WHITELIST':
            chrome.storage.sync.get(['whitelist'], (result) => {
                const whitelist = result.whitelist || [];
                if (!whitelist.includes(request.url)) {
                    whitelist.push(request.url);
                    chrome.storage.sync.set({ whitelist }, () => {
                        sendResponse({ success: true });
                    });
                } else {
                    sendResponse({ success: false, message: 'URL already in whitelist' });
                }
            });
            return true;
    }
}); 