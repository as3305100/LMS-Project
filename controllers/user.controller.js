import fs from "node:fs/promises";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError, handleAsync } from "../middlewares/error.middleware.js";
import { uploadMedia, deleteMedia } from "../utils/cloudinary.js";

export const createUserAccount = handleAsync(async (req, res) => {
  const { name, email, password, role, bio = "" } = req.validated;

  const avatarPath = req.file?.path;

  const existedUser = await User.findOne({ email });

  if (existedUser) {
    if (avatarPath) {
      try {
        await fs.unlink(avatarPath);
      } catch (err) {
        console.warn("Failed to delete file:", err.message);
      }
    }
    throw new ApiError(400, "User already exists. Please log in.");
  }

  let avatar = {
    secure_url: "default-avatar.png",
    public_id: "",
  };

  if (avatarPath) {
    const response = await uploadMedia(avatarPath);
    avatar.secure_url = response.secure_url;
    avatar.public_id = response.public_id;
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    bio,
    avatar: avatar.secure_url,
    avatarId: avatar.public_id,
  });
  user.password = undefined;
  user.avatar = undefined;

  return new ApiResponse(200, "User created successfully", user).send(res);
});

const generateAccessRefreshToken = async (_id) => {
  const user = await User.findById(_id).select("+refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const accessToken = user.getAccessToken();
  const refreshToken = user.getRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // The secure attribute in a cookie tells the browser to only send the cookie over HTTPS connections — meaning the cookie will not be sent over an unencrypted HTTP connection. 
//   go and learn about sameSite and secure
};

export const authenticateUser = handleAsync(async (req, res) => {
  const { email, password } = req.validated;

  const existedUser = await User.findOne({ email }).select("+password");

  if (!existedUser) {
    throw new ApiError(404, "User not found. Please signup first.");
  }

  const passwordValidation = await existedUser.comparePassword(password);

  if (!passwordValidation) {
    throw new ApiError(400, "Invalid Password");
  }

  const { accessToken, refreshToken } = await generateAccessRefreshToken(
    existedUser._id
  );

  const userInfo = {
    _id: existedUser._id,
    name: existedUser.name,
    email: existedUser.email,
    role: existedUser.role,
    avatar: existedUser.avatar,
    accessToken,
    refreshToken,
  };

  res
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 4 * 60 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

  return new ApiResponse(200, "User login successful", userInfo).send(res);
});

export const signOutUser = handleAsync(async (req, res) => {
    
});

export const getCurrentUserProfile = handleAsync(async (req, res) => {});

// point 1
/*
 sameSite: "strict" — What It Means
It prevents cookies from being sent with any cross-site requests, such as:

Links clicked from another site

Forms submitted from another site

<img>, <iframe>, or <script> tags

✅ Example:
If a user is logged in on your domain (yourdomain.com), and they:

Click a link from another domain (e.g., otherdomain.com) → accessToken cookie won’t be sent.

Visit your app directly or navigate within your app → cookie is sent as expected.
*/
