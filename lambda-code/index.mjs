import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import Busboy from "busboy";
import { Buffer } from "buffer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// Initialize S3 client
const s3 = new S3Client({ region: process.env.AWS_REGION || "eu-west-1" });
const bucket = process.env.BUCKET_NAME;

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "false",
};

export const handler = async (event) => {
  console.log("HTTP Method:", event.httpMethod);

  // Handle preflight (OPTIONS) requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  // Handle GET request to fetch image list from 'originals/' folder
  if (event.httpMethod === "GET" && event.queryStringParameters?.fetchOnly === "true") {
    const listResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "originals/",
      })
    );

    const baseUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`;
    const allImages = (listResponse.Contents || []).map((item) => `${baseUrl}/${String(item.Key)}`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ allImages }),
    };
  }

  try {
    // Attempt to parse JSON body (fallback if needed)
    let jsonBody = {};
    if (event.isBase64Encoded) {
      try {
        jsonBody = JSON.parse(Buffer.from(event.body, "base64").toString("utf8"));
      } catch {
        jsonBody = {};
      }
    } else {
      try {
        jsonBody = JSON.parse(event.body || "{}");
      } catch {
        jsonBody = {};
      }
    }

    // Store uploaded file chunks
    const fileData = [];
    let fileName = "";

    // Parse multipart/form-data using Busboy
    const parseForm = () =>
      new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: event.headers });

        busboy.on("file", (fieldname, file, info) => {
          const safeFilename =
            info && typeof info.filename === "string" ? info.filename : "upload.jpg";
          const guid = uuidv4();
          fileName = `${guid}-${safeFilename}`;

          file.on("data", (data) => fileData.push(data));
          file.on("end", () => console.log("File received"));
        });

        busboy.on("error", (err) => reject(err));
        busboy.on("finish", () => resolve());

        // Start writing the incoming file stream
        busboy.write(Buffer.from(event.body, "base64"));
        busboy.end();
      });

    await parseForm();
    const buffer = Buffer.concat(fileData);

    // S3 keys for original and cropped versions
    const originalKey = `originals/${fileName}`;
    const croppedKey = `cropped/${fileName}`;

    // Upload original image to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: originalKey,
        Body: buffer,
        ContentType: "image/jpeg",
      })
    );

    // Crop image to 300x300 (center crop)
    const croppedBuffer = await sharp(buffer)
      .resize({ width: 300, height: 300, fit: sharp.fit.cover, position: "center" })
      .toBuffer();

    // Upload cropped image to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: croppedKey,
        Body: croppedBuffer,
        ContentType: "image/jpeg",
      })
    );

    // Fetch updated list of all original images
    const baseUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`;
    const listResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "originals/",
      })
    );

    const allImages = (listResponse.Contents || []).map((item) => `${baseUrl}/${String(item.Key)}`);

    // Return URLs of uploaded images and full gallery
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        originalUrl: `${baseUrl}/${originalKey}`,
        croppedUrl: `${baseUrl}/${croppedKey}`,
        allImages,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
