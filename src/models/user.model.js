import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Jwt from "jsonwebtoken";

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const userSchema  = new mongoose.Schema({
    username:{
        type: String,
        required:true,
        unique: true,
        trim:true,
        index: true
    },
    email:{
        type: String,
        required:true,
        unique: true,
        trim:true,
    },
    fullName:{
        type: String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String,// coulnary
        required:true,
    },
    coverImage:{
         type:String,
    },
    watchHistory:[
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        }
    ],
    password:{
        type: String,
        required :[true, "Password is required"],
    },
    refreshToken:{
        type: String,
    }

},{timestamps: true});


userSchema.pre("save", async function (next){
    if(!this.isModified("password") )return next()
    this.password = await bcrypt.hash(this.password, 10);

});
userSchema.methods.comparePassword = async function (password){
    return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateAccessToken = function (){
  return  Jwt.sign(
        {
            _id: this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName,
        },
        proccess.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: proccess.env.ACCESS_TOKEN_EXPIRY,

        }
    )
}
userSchema.methods.generateAccessToken = function (){
  return  Jwt.sign(
        {
            _id: this._id,
            email:this.email,
        },
        proccess.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: proccess.env.REFRESH_TOKEN_EXPIRY,

        }
    )
}

const User = mongoose.model("User", userSchema);

export {User} ;