import fs from "node:fs/promises";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import {ApiError} from "../middlewares/error.middleware.js"

dotenv.config();

cloudinary.config({
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  cloud_name: process.env.CLOUD_NAME,
});

export const uploadMedia = async (filePath) => {
  try {
    const uploadResponse = await cloudinary.uploader.upload(filePath, {
       resource_type: "auto"
    });
    await fs.unlink(filePath);
    return uploadResponse;
  } catch (error) {
    await fs.unlink(filePath).catch(() => {})
    throw new ApiError(500, "Error occurred while uploading file")
  }
};

export const deleteMedia = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return result
  } catch (error) {
    throw new ApiError(500, "Error occurred while deleting file")
  }
};

export const deleteVideoCloudinary = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: "video",
    });
    return result
  } catch (error) {
    throw new ApiError(500, "Error occurred while deleting video")
  }
};
