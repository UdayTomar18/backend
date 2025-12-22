import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";


dotenv.config({ path: "./.env" });

cloudinary.config({
  cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
  api_key:process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // remove file from local storage after successful upload
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    // safe delete
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    console.error("Cloudinary upload error:", error);
    return null;
  }
};

export { uploadOnCloudinary };
