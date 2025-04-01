document.getElementById("addToWhitelist").addEventListener("click", function () {
    let url = document.getElementById("whitelistURL").value;
    chrome.storage.sync.get(["whitelist"], function (data) {
        let whitelist = data.whitelist || [];
        whitelist.push(url);
        chrome.storage.sync.set({ "whitelist": whitelist }, function () {
            alert("Added to Whitelist!");
        });
    });
});
