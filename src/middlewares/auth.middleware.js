import {asyncHandler} from '../utils/asyncHandler';
import {ApiError} from '../utils/apiError';
import jwt from 'jsonwebtoken';
import {User} from '../models/user.model.js'

export const verifyJWT = asyncHandler(async(req,_,next)=>{
 try {
       const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
       if(!token){
           throw new ApiError(410,"Unauthorized Request");
       }
   
       const user = decoedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
       await User.findById(decoedToken?._id).select("-password-refreshToken");
   
       if(!user){
           throw new ApiError(401,"Invali Access Denied!!!");
       }
   
       req.user = user;
       next();
 } catch (error) {
    throw new ApiError(401,error?.message || "Invalid Access Token");
 }

}) ;