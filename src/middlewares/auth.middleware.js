import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/apiError.js';
import jwt from 'jsonwebtoken';
import {User} from '../models/user.model.js'

export const verifyJWT = asyncHandler(async(req,_,next)=>{
 try {
       const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
       if(!token){
           throw new ApiError(410,"Unauthorized Request");
       }
   
       const decoedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
       const user = await User.findById(decoedToken?._id).select("-password-refreshToken");
   
       if(!user){
           throw new ApiError(401,"Invalid Access Token!!!");
       }
   
       req.user = user;
       next();
 } catch (error) {
    throw new ApiError(401,error?.message || "Invalid Access Token");
 }

}) ;