import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export {
    registerUser
}