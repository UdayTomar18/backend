import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
// import { url } from "inspector";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret:process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath)=>{
  try{
    if(!localFilePath) return null;
    // upload the file on cloudinary

    const response = await cloudinary.uploader.upload(localFilePath,{
      resource_type:"auto"
    });
    // file has been sucessfully uploaded
    console.log("cloudinary upload response",response);
    return response;
  }
  catch(error){
    fs.unlinkSync(localFilePath);
    console.log("cloudinary upload error",error);
  }
}

export {uploadOnCloudinary};