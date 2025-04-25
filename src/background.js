// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    // Initialize all storage with default values
    chrome.storage.sync.get(['adPreferences', 'statistics', 'whitelist'], (result) => {
        const defaultData = {
            adPreferences: {
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
            },
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
            },
            whitelist: []
        };

        // Initialize storage with default values if they don't exist
        chrome.storage.sync.set({
            adPreferences: result.adPreferences || defaultData.adPreferences,
            statistics: result.statistics || defaultData.statistics,
            whitelist: result.whitelist || defaultData.whitelist
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error initializing storage:', chrome.runtime.lastError);
            } else {
                console.log('Storage initialized successfully');
            }
        });
    });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Wrap the switch statement in a try-catch block
    try {
        switch (request.type) {
            case 'GET_PREFERENCES':
                chrome.storage.sync.get(['adPreferences'], (result) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ preferences: result.adPreferences || {} });
                    }
                });
                return true;

            case 'GET_STATISTICS':
                chrome.storage.sync.get(['statistics'], (result) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ statistics: result.statistics || {} });
                    }
                });
                return true;

            case 'GET_WHITELIST':
                chrome.storage.sync.get(['whitelist'], (result) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ whitelist: result.whitelist || [] });
                    }
                });
                return true;

            case 'UPDATE_PREFERENCE':
                chrome.storage.sync.get(['adPreferences'], (result) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ error: chrome.runtime.lastError.message });
                        return;
                    }
                    const preferences = result.adPreferences || {};
                    preferences[request.category] = request.allowed;
                    chrome.storage.sync.set({ adPreferences: preferences }, () => {
                        if (chrome.runtime.lastError) {
                            sendResponse({ error: chrome.runtime.lastError.message });
                        } else {
                            sendResponse({ success: true });
                        }
                    });
                });
                return true;

            case 'ADD_TO_WHITELIST':
                if (!request.url) {
                    sendResponse({ error: 'URL is required' });
                    return true;
                }
                chrome.storage.sync.get(['whitelist'], (result) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ error: chrome.runtime.lastError.message });
                        return;
                    }
                    const whitelist = result.whitelist || [];
                    if (!whitelist.includes(request.url)) {
                        whitelist.push(request.url);
                        chrome.storage.sync.set({ whitelist }, () => {
                            if (chrome.runtime.lastError) {
                                sendResponse({ error: chrome.runtime.lastError.message });
                            } else {
                                sendResponse({ success: true });
                            }
                        });
                    } else {
                        sendResponse({ error: 'URL already in whitelist' });
                    }
                });
                return true;

            case 'REMOVE_FROM_WHITELIST':
                if (!request.url) {
                    sendResponse({ error: 'URL is required' });
                    return true;
                }
                chrome.storage.sync.get(['whitelist'], (result) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ error: chrome.runtime.lastError.message });
                        return;
                    }
                    const whitelist = result.whitelist || [];
                    const index = whitelist.indexOf(request.url);
                    if (index > -1) {
                        whitelist.splice(index, 1);
                        chrome.storage.sync.set({ whitelist }, () => {
                            if (chrome.runtime.lastError) {
                                sendResponse({ error: chrome.runtime.lastError.message });
                            } else {
                                sendResponse({ success: true });
                            }
                        });
                    } else {
                        sendResponse({ error: 'URL not found in whitelist' });
                    }
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

            case 'RESET_STATISTICS':
                chrome.storage.sync.get(['statistics'], (result) => {
                    const statistics = result.statistics || {};
                    statistics[request.category] = { shown: 0, clicked: 0, blocked: 0 };
                    chrome.storage.sync.set({ statistics }, () => {
                        sendResponse({ success: true });
                    });
                });
                return true;

            default:
                sendResponse({ error: 'Unknown message type' });
                return true;
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ error: error.message });
        return true;
    }
});

// Inject content script into all tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.startsWith('http')) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).catch(error => {
            console.error('Error injecting content script:', error);
        });
    }
}); 