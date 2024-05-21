import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { User } from "../Models/user.model.js";
import { uploadOnCloudinary } from "../Utils/cloudinary.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

//to register user
const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  //to check any fields are empty
  if ([fullname, email, username, password].some((ele) => ele?.trim() === "")) {
    throw new ApiError(400, "All fields are necessary");
  }
  //checking for email
  const existedUser = await User.findOne({ email });
  if (existedUser) {
    throw new ApiError(400, "Email already in use");
  }
  //checking for username
  const existedUsername = await User.findOne({ username });
  if (existedUsername) {
    throw new ApiError(400, "Username already taken");
  }

  //looking into local path of avatar
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  //uploading on cloudinary
  const responseAvatar = await uploadOnCloudinary(avatarLocalPath);
  const responseCoverImage = await uploadOnCloudinary(coverImageLocalPath);

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
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registration");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get from req
  const { email, username, password } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "Username or email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }
  //finding user with email or password
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  //user unavailable
  if (!user) {
    throw new ApiError(400, "Invalid username or email");
  }

  //password check
  const passwordValid = await user.passwordCheck(password);
  if (!passwordValid) {
    throw new ApiError(400, "Wrong Password");
  }

  //generating tokens
  const { accessToken, refreshToken } = await generateAccessRefreshToken(
    user._id
  );

  //getting user from DB
  const loggedIn = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //set up cookie options
  //with these options only server can modify cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedIn,
          accessToken,
          refreshToken,
        },
        "Login Successful"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //here we just clear the cookies from user
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      //new is used to return the latest updated user data
      new: true,
    }
  );
  //set up cookie options
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

//function to generate refresh and access tokens
const generateAccessRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    // Generate access token and refresh token
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Ensure the tokens are returned from the methods
    if (!accessToken || !refreshToken) {
      throw new ApiError(500, "Failed to generate tokens");
    }

    // Assign refresh token to the user and save to database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const createAccessToken = asyncHandler(async (req, res) => {
  try {
    const presentRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!presentRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
      presentRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(400, "Invalid refresh token");
    }

    if (presentRefreshToken !== user?.refreshToken) {
      throw new ApiError("Refresh token is invalid or used");
    }
    //generating tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessRefreshToken(user._id);

    //getting user from DB
    const loggedIn = await User.findById(user._id).select("-password");

    //set up cookie options
    //with these options only server can modify cookies
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedIn,
            accessToken,
            newRefreshToken,
          },
          "Token recreated successfully"
        )
      );
  } catch (error) {
    throw new ApiError(400, error?.message || "Something went wrong");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "All fields are necessary");
  }
  const user = await User.findById(req.user?._id);

  //we check old password
  const oldPasswordCheck = await user.passwordCheck(oldPassword);

  if (!oldPasswordCheck) {
    throw new ApiError(400, "Wrong Old Password");
  }

  //update password in DB
  user.password = newPassword;
  user.save({
    validateBeforeSave: false,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User Fetched Successfully"));
});

const updateDetails = asyncHandler(async (req, res) => {
  //supposing fullname and email can be edited at once
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }

  //finding user and updating
  const user = await User.findByIdAndUpdate(
    req.user?._id, //as user is logged in the request consists user property
    {
      fullname: fullname,
      email: email,
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated!"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  //getting path
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  //uploading
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, "Upload to cloudinary failed");
  }

  //updating in DB
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  //getting path
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing");
  }
  //uploading
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(500, "Upload to cloudinary failed");
  }

  //updating in DB
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage Updated Successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  //empty username
  if (!username?.trim()) {
    throw new ApiError(400, "Username is Missing");
  }

  const channel = await User.aggregate([
    //matching username
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    //searching the subscribers from subscriptions
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    //searching the channels subscribed from subscriptions
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    //adding new fields to send response
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedTo: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    //projecting only necessary info
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedTo: 1,
        isSubscribed: 1,
      },
    },
  ]);

  //if not found
  if (!channel?.length) {
    throw new ApiError(400, "Channel does not exist");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel Fetched Successfully")
    );
  //channel[0]  because it contains all the required info as an object, channel here is an array
});

const getWatchHistory = asyncHandler(async (req, res) => {
  //mongoDB id is in form ObjectId('48454555')
  //here user._id would give the string only, but mongoose would convert it to above form and handle
  //but it doesn't work in pipelines, so we create new Object with id and use it for operations

  const user = await User.aggregate([
    {
      //to get user details
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      //to get video details from user's watchHistory array
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            //fro video details, we get user details of owner
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  //we project only required details of the owner
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          //we add a new field to user, an object of above details
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      //we send only watchHistory from the user array
      user[0].watchHistory,
      "Watch History fetched successfully"
    )
  );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  createAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
