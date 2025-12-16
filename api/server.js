import express from "express";
import ffmpeg from "fluent-ffmpeg";
import axios from "axios";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.APP_URL; // Optional: Override auto-detection

app.use(helmet());
app.use(cors());
app.use(express.json());

// Ensure directories exist
const TEMP_DIR = path.join(__dirname, "temp");
const OUTPUT_DIR = path.join(__dirname, "output");

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Serve static files from output directory
app.use("/output", express.static(OUTPUT_DIR));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.post("/api/mix", async (req, res) => {
  const { audio1, audio2, volume1 = 1.0, volume2 = 1.0 } = req.body;

  if (!audio1 || !audio2) {
    return res
      .status(400)
      .json({ error: "Please provide audio1 and audio2 URLs" });
  }

  const timestamp = Date.now();
  const tempFile1 = path.join(TEMP_DIR, `${timestamp}_1.mp3`);
  const tempFile2 = path.join(TEMP_DIR, `${timestamp}_2.mp3`);
  const outputFilename = `${timestamp}_mixed.mp3`;
  const outputFile = path.join(OUTPUT_DIR, outputFilename);

  try {
    // 1. Download files
    await Promise.all([
      downloadFile(audio1, tempFile1),
      downloadFile(audio2, tempFile2),
    ]);

    // 2. Mix files
    await mixAudio(tempFile1, tempFile2, outputFile, volume1, volume2);

    // 3. Cleanup temp files
    cleanup([tempFile1, tempFile2]);

    // 4. Return response
    // Determine the host: use APP_URL env var if set, otherwise detect from request
    const protocol = req.protocol;
    const host = req.get("host");
    const baseUrl = BASE_URL || `${protocol}://${host}`;
    const publicUrl = `${baseUrl}/output/${outputFilename}`;

    res.json({
      success: true,
      result: publicUrl,
    });
  } catch (error) {
    console.error("Error processing audio:", error);
    // Cleanup on error
    cleanup([tempFile1, tempFile2]);
    if (fs.existsSync(outputFile)) cleanup([outputFile]);

    res.status(500).json({
      error: "Audio processing failed",
      details:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : error.message,
    });
  }
});

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

function mixAudio(input1, input2, output, vol1, vol2) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(input1)
      .input(input2)
      .complexFilter([
        {
          filter: "volume",
          options: { volume: vol1 },
          inputs: "0:a",
          outputs: "a1",
        },
        {
          filter: "volume",
          options: { volume: vol2 },
          inputs: "1:a",
          outputs: "a2",
        },
        {
          filter: "amix",
          options: { inputs: 2, duration: "shortest" },
          inputs: ["a1", "a2"],
        },
      ])
      .on("end", () => {
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      })
      .save(output);
  });
}

function cleanup(files) {
  files.forEach((file) => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (e) {
        console.error(`Failed to delete ${file}:`, e);
      }
    }
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
