import * as tf from '@tensorflow/tfjs';

// Load AI Model for Image-Based Ad Detection
async function loadModel() {
    try {
        const model = await tf.loadLayersModel('http://localhost:3000/model/model.json');
        console.log("AI Model Loaded");
        return model;
    } catch (error) {
        console.error("Error loading the model:", error);
        return null;
    }
}

// Detect & Block Ads (Text + Images)
async function detectAndBlockAds() {
    const model = await loadModel();
    if (!model) {
        console.error("AI Model failed to load. Ad detection cannot proceed.");
        return;
    }

    // Remove known ad elements by CSS selectors
    document.querySelectorAll("iframe, .ad, .advertisement, [id^='google_ads'], [class*='ad-banner']").forEach(ad => {
        ad.style.display = "none";
        console.log("Blocked Element Ad:", ad);
    });

    // Process image and text elements
    document.querySelectorAll("img, iframe, div, span").forEach(async (el) => {
        if (el.tagName === 'IMG' || el.tagName === 'IFRAME') {
            // Process image-based ads
            let imageTensor = preprocessImage(el);
            let prediction = await model.predict(imageTensor);
            let isAd = prediction.dataSync()[0] > 0.5;

            if (isAd) {
                el.style.display = "none";
                console.log("Blocked Image Ad:", el.src);
            }
        } else {
            // Process text-based ads
            let text = el.innerText.trim();
            if (text.length > 10) {
                let isAd = await analyzeWithOpenAI(text);
                if (isAd) {
                    el.style.display = "none";
                    console.log("Blocked Text Ad:", text);
                }
            }
        }
    });
}

// OpenAI API Call for Text Ad Detection
async function analyzeWithOpenAI(text) {
    try {
        console.log("Sending request to OpenAI with text:", text);

        // API request
        let response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer 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`, // Your OpenAI key here
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4-turbo",
                messages: [{ role: "user", content: `Is this an advertisement? "${text}"` }]
            })
        });

        // Check if the response is okay
        if (!response.ok) {
            const errorDetails = await response.text();
            console.error("Error from OpenAI API:", errorDetails);
            return false;
        }

        // Parse the response
        let data = await response.json();
        console.log("OpenAI Response:", data);
        return data.choices[0].message.content.toLowerCase().includes("yes");
    } catch (error) {
        console.error("Error analyzing text with OpenAI:", error);
        return false;
    }
}

// Image Preprocessing for TensorFlow.js Model
function preprocessImage(imgElement) {
    return tf.browser.fromPixels(imgElement)
        .resizeNearestNeighbor([224, 224])  // Resize to the model's expected input size
        .toFloat()
        .expandDims();  // Add batch dimension
}

// Run Ad Detection
detectAndBlockAds();
console.log("Content Script Loaded");
