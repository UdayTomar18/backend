import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiErrors} from '../utils/ApiErrors.js';
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async(req,res)=>{
   
 




     // get details from the user frontend
    const {name,email,password,username} = req.body
    console.log("email:", email ,"name:",name)

     // validation - not empty ,email
    if([name,email,username,password].some((field)=>{
        field?.trim() === ""
    })){
        throw new ApiErrors(400,"All fields are required")

    }

        // check if user already exists
    const exsitedUser =  User.findOne({
            $or:[{ username},{email}]
        })
        if(exsitedUser){
            throw new ApiErrors(409,"User already exists")
        }


    // check for images , check for avatar
    const avatarLocalPath = req.files?.avatar?.[0];
    const coverImageLocalPath = req.files?.coverImage?.[0];
    if(!avatarLocalPath){
        throw new ApiErrors(400,"Avatar is required")
    }

        // upload to cloudinary if any,avatar , coverImage

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        
        throw new ApiErrors(400,"Avatar is required")
    }
     // create user object  - create a new user in db
    const user = await User.create({
        name,
        email,
        password,
        username:username.toLowerCase(),
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
    })
   // remove password and refresh token from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    // check for user creation
    if(!createdUser){
        throw new ApiErrors(500,"Something went wrong while registering the user")
    }
    // return response
    return res.status(201).json(
        new ApiResponse(201,createdUser,"User registered successfully")
    )
})

export {registerUser};

