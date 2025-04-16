import * as tf from '@tensorflow/tfjs';

class AdClassifier {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.confidenceThreshold = 0.7;
        this.categories = [
            'tech', 'fashion', 'sponsored', 'affiliate',
            'shopping', 'travel', 'finance', 'gaming',
            'social', 'video'
        ];
    }

    async initialize() {
        try {
            // Load the TensorFlow model
            const modelURL = chrome.runtime.getURL('model/model.json');
            this.model = await tf.loadGraphModel(modelURL);
            this.isModelLoaded = true;
            console.log("✅ AI Model Loaded Successfully");
            return true;
        } catch (error) {
            console.error("❌ Error loading AI model:", error);
            return false;
        }
    }

    async classifyAd(element) {
        if (!this.isModelLoaded) return null;

        try {
            // Convert element to tensor
            const tensor = await this.elementToTensor(element);
            if (!tensor) return null;

            // Get model prediction
            const predictions = await this.model.predict(tensor).data();
            tensor.dispose(); // Clean up tensor memory

            // Get category with highest confidence
            const maxIndex = predictions.indexOf(Math.max(...predictions));
            const confidence = predictions[maxIndex];

            if (confidence >= this.confidenceThreshold) {
                return {
                    category: this.categories[maxIndex],
                    confidence: confidence,
                    predictions: Object.fromEntries(
                        this.categories.map((cat, i) => [cat, predictions[i]])
                    )
                };
            }
            return null;
        } catch (error) {
            console.error("Classification error:", error);
            return null;
        }
    }

    async elementToTensor(element) {
        try {
            let imageData;

            if (element instanceof HTMLImageElement && element.complete) {
                imageData = element;
            } else if (element instanceof HTMLIFrameElement) {
                // Capture iframe content as image
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = element.offsetWidth;
                canvas.height = element.offsetHeight;
                context.drawWindow(element.contentWindow, 0, 0, canvas.width, canvas.height, "rgb(255,255,255)");
                imageData = canvas;
            } else {
                // For other elements, try to capture as screenshot
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = element.offsetWidth;
                canvas.height = element.offsetHeight;
                context.drawWindow(window, element.offsetLeft, element.offsetTop, canvas.width, canvas.height, "rgb(255,255,255)");
                imageData = canvas;
            }

            // Convert to tensor and preprocess
            return tf.tidy(() => {
                const tensor = tf.browser.fromPixels(imageData)
                    .resizeNearestNeighbor([224, 224]) // Standard input size
                    .toFloat()
                    .expandDims();
                
                // Normalize values to [-1, 1]
                return tensor.div(127.5).sub(1);
            });
        } catch (error) {
            console.error("Error converting element to tensor:", error);
            return null;
        }
    }

    // Get explanation for classification
    getExplanation(predictions) {
        if (!predictions) return null;

        const topCategories = Object.entries(predictions.predictions)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        return {
            mainCategory: predictions.category,
            confidence: Math.round(predictions.confidence * 100),
            alternativeCategories: topCategories.map(([cat, conf]) => ({
                category: cat,
                confidence: Math.round(conf * 100)
            }))
        };
    }
}

export default AdClassifier; 