import { User } from "../models/user.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Jwt from 'jsonwebtoken';

export const verifyJwt = asyncHandler(async(req,res,next) => {

    const token = req.cookies?.accessToken || req.header("authorization")?.replace("Bearer ","");

    if(!token) {
        throw new ApiError(401,'Unauthorized acess');
    }

    const decodedToken = Jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    if(!user) {
        throw new ApiError(401,"Invalid Access Token");
    }

    req.user = user;

    next();

})