const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

async function createAndSaveModel() {
    // Create a sequential model
    const model = tf.sequential();

    // Add layers
    // Input layer - expects 224x224 RGB images
    model.add(tf.layers.conv2d({
        inputShape: [224, 224, 3],
        filters: 32,
        kernelSize: 3,
        activation: 'relu'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    model.add(tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: 'relu'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    model.add(tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: 'relu'
    }));
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

    // Flatten the 3D output to 1D
    model.add(tf.layers.flatten());

    // Dense layers
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.5 }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    // Compile the model
    model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });

    // Generate some dummy data for initialization
    const dummyData = tf.randomNormal([10, 224, 224, 3]);
    const dummyLabels = tf.randomUniform([10, 1]);

    // Train on dummy data just to initialize weights
    await model.fit(dummyData, dummyLabels, {
        epochs: 1,
        batchSize: 5
    });

    // Convert the model to JSON format
    const modelJSON = model.toJSON();
    
    // Create the dist/model directory if it doesn't exist
    const modelDir = path.join(__dirname, '..', '..', 'dist', 'model');
    if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
    }

    // Save the model.json file
    fs.writeFileSync(
        path.join(modelDir, 'model.json'),
        JSON.stringify(modelJSON, null, 2)
    );

    // Get the weights as ArrayBuffers
    const weightData = await model.getWeights()[0].data();
    
    // Save the weights to the binary file
    const weightBuffer = Buffer.from(weightData.buffer);
    fs.writeFileSync(
        path.join(modelDir, 'group1-shard1of1.bin'),
        weightBuffer
    );
    
    console.log('Model created and saved successfully!');
}

createAndSaveModel().catch(console.error); 