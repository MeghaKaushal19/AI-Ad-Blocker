// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    // Set default preferences
    chrome.storage.sync.get(['adPreferences'], (result) => {
        if (!result.adPreferences) {
            const defaultPreferences = {
                'tech': false,
                'fashion': false,
                'sponsored': false,
                'affiliate': false,
                'shopping': false,
                'travel': false,
                'finance': false,
                'gaming': false,
                'social': false,
                'video': false
            };
            chrome.storage.sync.set({ adPreferences: defaultPreferences });
        }
    });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PREFERENCES') {
        chrome.storage.sync.get(['adPreferences', 'whitelist'], (result) => {
            sendResponse({
                preferences: result.adPreferences || {},
                whitelist: result.whitelist || []
            });
        });
        return true; // Will respond asynchronously
    }
});

// Inject content script into all tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.startsWith('http')) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });
    }
});

const metrics = await adShield.personalizedTrainer.getPerformanceMetrics();
console.log(metrics);
