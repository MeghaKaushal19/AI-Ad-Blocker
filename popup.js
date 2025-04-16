document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("whitelistForm");

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const url = document.getElementById("whitelistURL").value.trim();
        if (!url) {
            alert("Please enter a URL.");
            return;
        }

        // Gather ad preferences
        const preferences = [];
        document.querySelectorAll("input[name='adConsent']:checked").forEach(checkbox => {
            preferences.push(checkbox.value);
        });

        if (preferences.length === 0) {
            alert("Please select at least one ad type you're okay with.");
            return;
        }

        chrome.storage.sync.get(["whitelist", "adPreferences"], function (data) {
            let whitelist = data.whitelist || [];
            let adPreferences = data.adPreferences || {};

            if (!whitelist.includes(url)) {
                whitelist.push(url);
            }

            adPreferences[url] = preferences;

            chrome.storage.sync.set({
                "whitelist": whitelist,
                "adPreferences": adPreferences
            }, function () {
                alert("Site added with ad preferences!");
                form.reset();
            });
        });
    });
});
