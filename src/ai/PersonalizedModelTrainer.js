import * as tf from '@tensorflow/tfjs';

class PersonalizedModelTrainer {
    constructor() {
        this.model = null;
        this.isInitialized = false;
        this.metrics = {
            totalPredictions: 0,
            correctPredictions: 0,
            falsePositives: 0,
            falseNegatives: 0,
            avgInferenceTime: 0
        };
    }

    async initialize() {
        try {
            console.log("🔄 Initializing model...");
            
            // Get the model URL using chrome.runtime.getURL
            const modelPath = chrome.runtime.getURL('model/model.json');
            console.log("📂 Loading model from:", modelPath);

            // Load the model
            this.model = await tf.loadGraphModel(modelPath);
            console.log("✅ Model loaded successfully");

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("❌ Error initializing model:", error);
            // Log more details about the error
            if (error.message.includes('Failed to fetch')) {
                console.error("💡 This might be due to CORS or file access issues.");
                console.error("🔍 Make sure the model files are in the correct location:");
                console.error("   - dist/model/model.json");
                console.error("   - dist/model/group1-shard1of1.bin");
            }
            return false;
        }
    }

    async predict(imageElement) {
        if (!this.isInitialized || !this.model) {
            console.error("❌ Model not initialized");
            return null;
        }

        try {
            const startTime = performance.now();
            
            // Preprocess the image
            const tensor = await this.preprocessImage(imageElement);
            if (!tensor) {
                throw new Error("Failed to preprocess image");
            }

            // Make prediction
            const predictions = await this.model.predict(tensor).data();
            const inferenceTime = performance.now() - startTime;
            
            // Update metrics
            this.metrics.totalPredictions++;
            this.metrics.avgInferenceTime = 
                (this.metrics.avgInferenceTime * (this.metrics.totalPredictions - 1) + inferenceTime) 
                / this.metrics.totalPredictions;

            // Cleanup
            tf.dispose(tensor);
            
            // Return the prediction (1 for ad, 0 for not ad)
            return predictions[0];
        } catch (error) {
            console.error("❌ Error making prediction:", error);
            return null;
        }
    }

    async preprocessImage(element) {
        try {
            return tf.tidy(() => {
                // Convert the image element to a tensor
                let tensor = tf.browser.fromPixels(element);
                
                // Resize to 224x224 (MobileNetV2 input size)
                tensor = tf.image.resizeBilinear(tensor, [224, 224]);
                
                // Normalize values to [-1, 1]
                tensor = tensor.toFloat().div(127.5).sub(1);
                
                // Add batch dimension
                tensor = tensor.expandDims(0);
                
                return tensor;
            });
        } catch (error) {
            console.error("❌ Error preprocessing image:", error);
            return null;
        }
    }

    getPerformanceMetrics() {
        return {
            totalPredictions: this.metrics.totalPredictions,
            avgInferenceTime: this.metrics.avgInferenceTime,
            accuracy: this.metrics.correctPredictions / this.metrics.totalPredictions || 0
        };
    }
} 