const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Express app and Google Cloud Storage client
const app = express();
const storage = new Storage({ keyFilename: 'C:\Users\FUJISU\Desktop\rrroott\alphie\video-upload-backend\forward-script-449523-v6-97a4dc96990c.json' }); // Use the path to your JSON key
const bucket = storage.bucket('alphie'); // Replace with your bucket name

// Set up multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files temporarily in memory
  limits: { fileSize: 100 * 1024 * 1024 }, // Max file size (100 MB)
});

// POST endpoint to upload video
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Create a unique file name using timestamp
  const fileName = Date.now() + path.extname(req.file.originalname);
  const file = bucket.file(fileName);
  
  // Create a writable stream to Google Cloud Storage
  const blobStream = file.createWriteStream({
    resumable: false,
    contentType: req.file.mimetype,
  });

  // When the upload finishes, make the file public and send back the URL
  blobStream.on('finish', () => {
    file.makePublic().then(() => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      return res.status(200).json({ videoUrl: publicUrl }); // Send video URL as response
    });
  });

  // Handle any errors
  blobStream.on('error', (err) => {
    console.error('Error uploading file:', err);
    return res.status(500).send('Error uploading file.');
  });

  // Upload the file buffer to Cloud Storage
  blobStream.end(req.file.buffer);
});

// GET endpoint to retrieve video URL by file name
app.get('/video/:videoName', (req, res) => {
  const videoName = req.params.videoName;
  const file = bucket.file(videoName);

  file.exists().then(([exists]) => {
    if (!exists) {
      return res.status(404).send('Video not found');
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${videoName}`;
    return res.status(200).json({ videoUrl: publicUrl });
  });
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
