import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/apiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';


const generateAccessTokenAndRefreshToken = async(userId)=>{
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
   
    user.refreshToken =  refreshToken;
    await user.save({validateBeforeSave:false});

    return {accessToken,refreshToken};
    
  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating access and refresh token");
  }
}

const registerUser = asyncHandler(async (req,res) => {
      // get user details from frontend
      // validation - not empty
      // check if user alraedy exist : username , email
      // check for images, check for avatar
      // upload them to cloudinary, avatar
      // create user object - create entry in db
      // remove password and refersh token  field from refresh
      // check for user creation
      // return res

      const {fullName, email,username, password} = req.body;
 

      if([fullName, email , username , password ].some((field)=> field?.trim() === "")){
        throw new ApiError(400,"All fields are required");
      }

      const existedUser = await User.findOne({
        $or : [{email},{username}]
      });

      if(existedUser){
        throw new ApiError(409, "User with email or username already exist");
      }
      


      const avatarLocalPath = req.files?.avatar[0]?.path;
      // const coverImageLocalPath = req.files?.coverImage[0]?.path;

      let coverImageLocalPath;
      if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
      }

      if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
      }

        
      const avatar = await uploadOnCloudinary(avatarLocalPath);  
      const coverImage = await uploadOnCloudinary(coverImageLocalPath);  

      if(!avatar){
        throw new ApiError(400,"Avatar file is required---");
      }

      const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
      });

      const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
      );

      if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user");

      }

      return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully!!!")
      );


});

const loginUser = asyncHandler(async (req,res)=>{

  const {email,username,password} = req.body;
  if(!(username || email)){
    throw new ApiError(401,"Username or Email is required");
  }

  const user = await User.findOne({
    $or : [{username},{email}]
  });

  if(!user){
    throw new ApiError(404,"User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password); 
  if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credentials");
  }

  const {accessToken,refreshToken} = await generateAccessTokenAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly : true,
    secure:true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,{
      user : loggedInUser,accessToken,refreshToken
    })
  )


});

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set :{
          refreshToken : undefined
        }
      }
    )

    const options = {
      httpOnly : true,
      secure:true
    }
    
    return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200,{},"User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  // Ensure the refresh token is provided
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request: Refresh token is missing.");
  }

  try {
    // Verify the refresh token
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find the user by the ID in the decoded token
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    // Check if the refresh token matches the one stored for the user
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or does not match.");
    }

    // Generate new access and refresh tokens
    const { accessToken,newRefreshToken } = await generateAccessTokenAndRefreshToken(user.id);

    // Options for secure cookies
    const options = {
      httpOnly: true,
      secure: true, // Set true in production for HTTPS
    };

    // Send the new tokens as cookies and in the response
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully."
        )
      );
  } catch (error) {
    // Handle token errors or other exceptions
    throw new ApiError(401, error?.message || "Invalid Refresh Token.");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
      const {currentPassword, newPassword} = req.body;
      const user = await User.findById(req.user._id);
      const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
      if(!isPasswordCorrect){
        throw new ApiError(401,"Invalid current password");
      }

      user.password = newPassword;
      await user.save({validateBeforeSave:false});

      return res.status(200).json(new ApiResponse(200,"Password changed successfully")); 
});

const getCurrentUser = asyncHandler(async (req,res)=>{
  return res
  .status(200)
  .json(200,req.user,"User details fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req,res)=>{
  const {fullName, email, username} = req.body;

  if(!fullName || !email || !username){
    throw new ApiError(400,"All fields are required");
  }

  const user = User.findByIdAndUpdate(req.user?._id,
    {
      $set :{
        fullName,
        email,
        username
      }
    },
    {new:true}
  ).select("-password -refreshToken");

  return res
  .status(200)
  .json(200,user,"User details updated successfully");
});

const udpateUserAvatar = asyncHandler(async (req,res)=>{
  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if(!avatar.url){
    throw new ApiError(400,"Error while uploading avatar");
  }

  const user =  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set :{
        avatar : avatar.url
      },
     
    },
    {new:true})
    .select("-password -refreshToken");
    return response.status(200, user, "Avatar image updated successfully");

});

const udpateUserCoverImage = asyncHandler(async (req,res)=>{
  const udpateUserCoverImageLocalPath = req.file?.path;

  if(!avatarLocalPath){
    throw new ApiError(400,"Cover image file is required");
  }

  const coverImage = await uploadOnCloudinary(avatarLocalPath);

  if(!avatar.url){
    throw new ApiError(400,"Error while uploading cover image");
  }

   const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set :{
        avatar : avatar.url
      },
     
    },
    {new:true})
    .select("-password -refreshToken");

    return response.status(200, user, "Cover image updated successfully");


});




export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails} ;