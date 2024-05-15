import {asyncHandler} from "../Utils/asyncHandler.js";
import {ApiError} from "../Utils/ApiError.js";
import jwt from "jsonwebtoken";
import {User} from "../Models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(400, "Unauthorized Request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(400, "Invalid token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(500, error?.message || "Invalid access token");
  }
});
