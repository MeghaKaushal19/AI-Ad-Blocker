const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_FILES = [
    {
        url: 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json',
        filename: 'model.json'
    },
    {
        url: 'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/group1-shard1of1.bin',
        filename: 'group1-shard1of1.bin'
    }
];

async function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${destPath}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

async function downloadModel() {
    const modelDir = path.join(__dirname, '..', 'dist', 'model');
    
    // Create model directory if it doesn't exist
    if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
    }

    // Download each file
    for (const file of MODEL_FILES) {
        const destPath = path.join(modelDir, file.filename);
        console.log(`Downloading ${file.filename}...`);
        await downloadFile(file.url, destPath);
    }

    console.log('Model files downloaded successfully!');
}

downloadModel().catch(console.error); 