import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiErrors } from '../utils/ApiErrors.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config({
    path: "./.env"
});




const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiErrors(404, "User not found while generating tokens");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };

  } catch (error) {

    console.error("TOKEN ERROR:", error);

    throw new ApiErrors(
      500,
      error.message || "Something went wrong while generating tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, username } = req.body;

  // validation
  if ([fullName, email, username, password].some(field => field?.trim() === "")) {
    throw new ApiErrors(400, "All fields are required");
  }

  // check existing user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (existedUser) {
    throw new ApiErrors(409, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiErrors(400, "Avatar is required");
  }

  // upload to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new ApiErrors(400, "Avatar upload failed");
  }

  // create user
  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiErrors(
      500,
      "Something went wrong while registering the user"
    );
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      createdUser,
      "User registered successfully"
    )
  );
});

const logInUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  // validation
  if (!email && !username) {
    throw new ApiErrors(
      400,
      "username or email are required"
    );
  }

  const user = await User.findOne({
    $or: [
      { email },
      { username: username?.toLowerCase() }
    ]
  });

  if (!user) {
    throw new ApiErrors(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiErrors(401, "Password is incorrect");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const logedInUser = await User.findById(user._id)
    .select('-password -refreshToken');

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: logedInUser,
          accessToken,
          refreshToken
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined }
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        "User logged out successfully"
      )
    );
});

const refreshAccessToken  = asyncHandler(async (req,res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if(!incomingRefreshToken){
    throw new ApiErrors(401,"unauthorized request ")
  }

 try {
  const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
   const user=await User.findById(decodedToken?._id);
   if(!user || user.refreshToken !== incomingRefreshToken){
 
     throw new ApiErrors(401,"invalid refresh token")
   }
 
   const {accessToken,newRefreshToken}=await generateAccessTokenAndRefreshToken(user._id);
 
   const options={
     httpOnly:true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'Lax'
   };
 
   return res
     .status(200)
     .cookie("refreshToken", newRefreshToken, options)
     .cookie("accessToken", accessToken, options)
     .json(
       new ApiResponse(
         200,
         {
           accessToken,
           refreshToken:newRefreshToken
         },
         "Access token refreshed successfully"
       )
     );
 } catch (error) {
  throw new ApiErrors(401,error.message || "invalid or expired refresh token")
  
 }
});

const changePassword = asyncHandler(async(req,res)=>{

  //taking old and new password from the body

  const {oldPassword,newPassword} = req.body;

  // validation of user input

  const user = await User.findById(req.user?._id);

  if(!user){
    throw new ApiErrors(404,"User not found");
  }
// checking old password
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if(!isPasswordCorrect){
    throw new ApiErrors(400,"Invalid old password");
  }
// setting new password
  user.password=newPassword;
  await user.save({validateBeforeSave:false});

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully"
      )
    );
})

const updateAccountDetails = asyncHandler(async(req,res)=>
  {
    const {fullName,username} = req.body;

    if(!fullName || !username)
      {
        throw new ApiErrors(400,"fullName and username are required");

      }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { fullName, username } },
      { new: true }
    ).select('-password');

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user,
          "Account details updated successfully"
        )
      );
});

const getCurrentUserDetails = asyncHandler(async(req,res)=>{
  return res.status(200)
    .json(
      new ApiResponse(
        200,
        req.user,
        "Current user details fetched successfully"
      )
    );
});

const updateUserAvatar = asyncHandler(async(req,res)=>{
  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    throw new ApiErrors(400,"Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if(!avatar.url){
    throw new ApiErrors(500,"Error while uploading avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select('-password');
  return res.status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "User avatar updated successfully"
      )
    );

})
const updateUserCoverImage = asyncHandler(async(req,res)=>{
  const coverImageLocalPath = req.file?.path;
  if(!coverImageLocalPath){
    throw new ApiErrors(400,"Cover image file is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if(!coverImage.url){
    throw new ApiErrors(500,"Error while uploading cover image")
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select('-password');
  return res.status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "User cover image updated successfully"
      )
    );

})

export {
  registerUser,
  logInUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  updateAccountDetails,
  getCurrentUserDetails,
  updateUserAvatar,
  updateUserCoverImage
};
