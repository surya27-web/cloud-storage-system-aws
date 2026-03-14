require("dotenv").config();

const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();


// =============================
// Upload File
// =============================
app.post("/upload", upload.single("file"), async (req, res) => {

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filename = Date.now() + "-" + req.file.originalname;

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: filename,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    ContentDisposition: "inline"
  };

  try {

    const data = await s3.upload(params).promise();

    res.json({
      message: "File uploaded successfully",
      name: filename,
      size: req.file.size,
      date: new Date(),
      url: data.Location
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ message: "Upload failed" });

  }

});


// =============================
// Get All Files
// =============================
app.get("/files", async (req, res) => {

  const params = {
    Bucket: process.env.S3_BUCKET
  };

  try {

    const data = await s3.listObjectsV2(params).promise();

    if (!data.Contents || data.Contents.length === 0) {
      return res.json([]);
    }

    const files = data.Contents.map(file => ({

      name: file.Key,
      size: file.Size || 0,
      date: file.LastModified || new Date(),

      url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`

    }));

    res.json(files);

  } catch (error) {

    console.error(error);
    res.status(500).json({ message: "Failed to fetch files" });

  }

});


// =============================
// Delete File
// =============================
app.delete("/delete/:filename", async (req, res) => {

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: req.params.filename
  };

  try {

    await s3.deleteObject(params).promise();

    res.json({ message: "File deleted successfully" });

  } catch (error) {

    console.error(error);
    res.status(500).json({ message: "Delete failed" });

  }

});


// =============================
// Start Server
// =============================
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});