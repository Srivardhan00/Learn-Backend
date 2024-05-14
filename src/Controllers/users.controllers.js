import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import User from "../Models/user.model.js";
import { uploadOnCloudinary } from "../Utils/cloudinary.js";
import { ApiResponse } from "../Utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  //to check any fields are empty
  if ([fullname, email, username, password].some((ele) => ele?.trim() === "")) {
    throw new ApiError(400, "All fields are necessary");
  }
  //checking for email
  const existedUser = User.findOne({ email });
  if (existedUser) {
    throw new ApiError(400, "Email already in use");
  }
  //checking for username
  const existedUsername = User.findOne({ username });
  if (existedUsername) {
    throw new ApiError(400, "Username already taken");
  }

  //looking into local path of avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  //uploading on cloudinary
  const responseAvatar = await uploadOnCloudinary(avatarLocalPath);
  const responseCoverImage = await uploadOnCloudinary(avatarLocalPath);

  //cloudinary upload failed
  if (!responseAvatar) {
    throw new ApiError(400, "Avatar is required");
  }

  //uploading to DB
  const user = await User.create({
    fullname,
    avatar: responseAvatar.url,
    coverImage: responseCoverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //we verify by searching in DB and remove password and refresh token fieds
  const createUser = User.findById(user._id).select("-password -refreshToken");

  if (!createUser) {
    throw new ApiError(500, "Something went wrong while registration");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "User Registered Successfully"));
});

export default registerUser;
