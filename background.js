chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ whitelist: [] }, () => {
        console.log("Whitelist Initialized");
    });
});
