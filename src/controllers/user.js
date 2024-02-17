import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async(userId) => {
    try {

        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({validateBeforeSave:false});

        return {
            refreshToken,
            accessToken
        }
        
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async(req,res) => {

    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName, email, userName, password } = req.body;

    console.log('fullName',fullName);

    if([fullName,email,userName,password].some((field) => field?.trim() === '')) {
        throw new ApiError(400,"All fieds are required");
    }

    const existingUser = await User.findOne({
        "$or": [{email},{userName}]
    })

    if(existingUser) {
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400,"Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    const createdUser = await User.create({
        fullName,
        email,
        userName,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ''
    });

    const registeredUser = await User.findById(createdUser._id).select(
        "-password -refreshToken"
    );

    if(!registeredUser) {
        throw new ApiError(500,"Error while registering user");
    }

    return res.status(201).json(
        new ApiResponse(200,registeredUser,"User Registered Successfully")
    )

})

const loginUser = asyncHandler (async(req,res) => {
    // extract body from request
    //validate using email aur username
    //check for password is correct or not
    //generate access and refresh token
    //send cookies

    let {userName,email,password} = req.body;

    if(!userName && !email) {
        throw new ApiError(400,'userName or email is required');
    }

    userName = userName.toLowerCase();

    const user = await User.findOne({
        $or: [{userName},{email}]
    });

    if(!user) {
        throw new ApiError(404,'User not found');
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);


    if(!isPasswordCorrect) {
        throw new ApiError(401,'Password is incorrect');
    }

   const {accessToken,refreshToken} =  await generateAccessAndRefreshToken(user._id);

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

   // options for securtiy purposes.
   const options = {
    httpsOnly:true,
    secure: true
   }

   res
   .status(200)
   .cookie("accessToken",accessToken)
   .cookie("refreshToken",refreshToken)
   .json(
    new ApiResponse(
        200,
        {
            user:loggedInUser,accessToken,refreshToken
        },
        "user Logged in successfully"
    )
   );
})

const logoutUser = asyncHandler(async(req,res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                "refreshToken" : 1
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpsOnly:true,
        secure: true
       }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(
            200,
            {},
            "User Logged Out Successfully"
        )
    )
})

const refreshAccesstoken = asyncHandler(async(req,res) => {
    const {incomingRefreshToken} = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorized access");
    }

    const decodedToken = Jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);

    const user = User.findById(decodedToken?._id).select("-password")

    if(!user) {
        throw new ApiError(401,"Invalid Refresh Token")
    }

    if(incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401,"Refresh Token is expired or invalid");
    }

    const {accessToken,refreshToken} = generateAccessAndRefreshToken(user._id);

    const options = {
        httpOnly:true,
        secure : true
    }

    res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {accessToken,refreshToken},
            "Access Token refreshed successfully"
        )
    )
    
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccesstoken
}