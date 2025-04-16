import * as tf from '@tensorflow/tfjs';

class PersonalizedModelTrainer {
    constructor() {
        this.baseModel = null;
        this.personalizedModel = null;
        this.trainingData = {
            images: [],
            labels: []
        };
        this.isInitialized = false;
        this.metrics = {
            totalPredictions: 0,
            correctPredictions: 0,
            falsePositives: 0,
            falseNegatives: 0,
            avgInferenceTime: 0,
            trainingSessions: 0,
            avgTrainingTime: 0
        };
    }

    async initialize() {
        try {
            // Load the base model
            const modelURL = chrome.runtime.getURL('model/model.json');
            this.baseModel = await tf.loadGraphModel(modelURL);
            
            // Create personalized model structure
            this.personalizedModel = tf.sequential({
                layers: [
                    // Use base model as feature extractor (freeze weights)
                    ...this.baseModel.layers.slice(0, -1).map(layer => {
                        layer.trainable = false;
                        return layer;
                    }),
                    // Add personalization layers
                    tf.layers.dense({units: 64, activation: 'relu'}),
                    tf.layers.dropout({rate: 0.5}),
                    tf.layers.dense({units: 1, activation: 'sigmoid'})
                ]
            });

            // Compile the model
            this.personalizedModel.compile({
                optimizer: tf.train.adam(0.0001),
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });

            this.isInitialized = true;
            console.log("✅ Personalized Model Trainer Initialized");
            return true;
        } catch (error) {
            console.error("❌ Error initializing personalized model:", error);
            return false;
        }
    }

    async addTrainingExample(imageElement, label) {
        try {
            // Convert image to tensor
            const tensor = await this.preprocessImage(imageElement);
            if (tensor) {
                this.trainingData.images.push(tensor);
                this.trainingData.labels.push(label);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error adding training example:", error);
            return false;
        }
    }

    async preprocessImage(element) {
        try {
            return tf.tidy(() => {
                const tensor = tf.browser.fromPixels(element)
                    .resizeNearestNeighbor([224, 224])
                    .toFloat()
                    .expandDims();
                return tensor.div(255.0);
            });
        } catch (error) {
            console.error("Error preprocessing image:", error);
            return null;
        }
    }

    async trainOnUserData() {
        if (this.trainingData.images.length < 5) {
            console.log("Not enough training data yet");
            return false;
        }

        try {
            const startTime = performance.now();
            
            // Convert training data to tensors
            const xs = tf.concat(this.trainingData.images);
            const ys = tf.tensor2d(this.trainingData.labels, [this.trainingData.labels.length, 1]);

            // Train the model
            const history = await this.personalizedModel.fit(xs, ys, {
                epochs: 10,
                batchSize: 32,
                validationSplit: 0.2,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
                    }
                }
            });

            const trainingTime = performance.now() - startTime;
            
            // Update metrics
            this.metrics.trainingSessions++;
            this.metrics.avgTrainingTime = 
                (this.metrics.avgTrainingTime * (this.metrics.trainingSessions - 1) + trainingTime) 
                / this.metrics.trainingSessions;

            // Save the updated model
            await this.saveModel();
            
            // Save metrics
            await this.saveMetrics();
            
            return true;
        } catch (error) {
            console.error("Error training model:", error);
            return false;
        }
    }

    async predict(imageElement) {
        try {
            const startTime = performance.now();
            const tensor = await this.preprocessImage(imageElement);
            if (tensor) {
                const prediction = await this.personalizedModel.predict(tensor).data();
                const inferenceTime = performance.now() - startTime;
                
                // Update metrics
                this.metrics.totalPredictions++;
                this.metrics.avgInferenceTime = 
                    (this.metrics.avgInferenceTime * (this.metrics.totalPredictions - 1) + inferenceTime) 
                    / this.metrics.totalPredictions;

                return prediction[0];
            }
            return null;
        } catch (error) {
            console.error("Error making prediction:", error);
            return null;
        }
    }

    async saveModel() {
        try {
            await this.personalizedModel.save('indexeddb://personalized-ad-model');
            console.log("✅ Personalized model saved");
            return true;
        } catch (error) {
            console.error("❌ Error saving personalized model:", error);
            return false;
        }
    }

    async loadSavedModel() {
        try {
            this.personalizedModel = await tf.loadLayersModel('indexeddb://personalized-ad-model');
            console.log("✅ Loaded saved personalized model");
            return true;
        } catch (error) {
            console.log("No saved personalized model found, using base model");
            return false;
        }
    }

    async updateMetricsWithFeedback(prediction, actualLabel) {
        if (prediction > 0.7 && actualLabel === 1) this.metrics.correctPredictions++;
        else if (prediction > 0.7 && actualLabel === 0) this.metrics.falsePositives++;
        else if (prediction <= 0.7 && actualLabel === 1) this.metrics.falseNegatives++;
        await this.saveMetrics();
    }

    getPerformanceMetrics() {
        const accuracy = this.metrics.totalPredictions > 0 
            ? this.metrics.correctPredictions / this.metrics.totalPredictions 
            : 0;
        
        const precision = (this.metrics.correctPredictions + this.metrics.falsePositives) > 0
            ? this.metrics.correctPredictions / (this.metrics.correctPredictions + this.metrics.falsePositives)
            : 0;
        
        const recall = (this.metrics.correctPredictions + this.metrics.falseNegatives) > 0
            ? this.metrics.correctPredictions / (this.metrics.correctPredictions + this.metrics.falseNegatives)
            : 0;

        return {
            accuracy,
            precision,
            recall,
            f1Score: precision && recall ? 2 * (precision * recall) / (precision + recall) : 0,
            avgInferenceTime: this.metrics.avgInferenceTime,
            avgTrainingTime: this.metrics.avgTrainingTime,
            totalPredictions: this.metrics.totalPredictions,
            trainingSessions: this.metrics.trainingSessions
        };
    }

    async saveMetrics() {
        try {
            await chrome.storage.local.set({ 'modelMetrics': this.metrics });
        } catch (error) {
            console.error("Error saving metrics:", error);
        }
    }

    async loadMetrics() {
        try {
            const result = await chrome.storage.local.get('modelMetrics');
            if (result.modelMetrics) {
                this.metrics = result.modelMetrics;
            }
        } catch (error) {
            console.error("Error loading metrics:", error);
        }
    }
} 