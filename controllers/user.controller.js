import fs from "node:fs/promises";
import crypto from "node:crypto";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError, handleAsync } from "../middlewares/error.middleware.js";
import { uploadMedia, deleteMedia } from "../utils/cloudinary.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

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
  const userId = req.userId;

  const user = await User.findById(userId).select("+refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.refreshToken = undefined;

  await user.save({ validateBeforeSave: true });

  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions);

  return new ApiResponse(200, "User logout successful").send(res);
});

export const getCurrentUserProfile = handleAsync(async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId)
    .populate({
      path: "enrolledCourses",
      select: "_id title subtitle price thumbnail category level",
    })
    .populate({
      path: "createdCourses",
      select: "_id title subtitle price thumbnail category level",
    })
    .lean({ virtuals: true }); // point 2
  // point 3
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userInfo = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    totalEnrolledCourses: user.totalEnrolledCourses,
    enrolledCourses: user.enrolledCourses,
    createdCourses: user.createdCourses,
  };

  return new ApiResponse(
    200,
    "User information fetched successfully",
    userInfo
  ).send(res);
});

export const updateUserProfile = handleAsync(async (req, res) => {
  const { name, role, bio = "" } = req.validated;
  const avatarPath = req.file?.path;

  const userId = req.userId;

  const user = await User.findById(userId).select("+avatarId");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (avatarPath) {
    const response = await uploadMedia(avatarPath);
    await deleteMedia(user.avatarId);
    user.avatar = response.secure_url;
    user.avatarId = response.public_id;
  }

  user.name = name;
  user.role = role;
  if (bio) user.bio = bio;

  await user.save({ validateBefore: false });

  const updatedInfo = {
    _id: user._id,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    bio: user.bio,
  };

  return new ApiResponse(
    200,
    "User Profile updated successfully",
    updatedInfo
  ).send(res);
});

export const changeUserPassword = handleAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.validated;
  const userId = req.userId;
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(
      400,
      "New password must be different from the old password"
    );
  }

  const isPasswordValid = await user.comparePassword(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Old Password is invalid");
  }

  user.password = newPassword;

  await user.save(); // point 4

  return new ApiResponse(200, "Password updated successfully").send(res);
});

export const forgotPassword = handleAsync(async (req, res) => {
  const { email } = req.validated;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const message = `
    <p>You requested a password reset.</p>
    <p>Click this link to reset your password:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>If you did not request this, please ignore this email.</p>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: message,
    });

    return new ApiResponse(200, "Password reset email sent successfully").send(
      res
    );
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    throw new ApiError(500, "Error sending email. Please try again later.");
  }
});

export const resetPassword = handleAsync(async (req, res) => {
  const { token } = req.params;
  const { email, password } = req.validated;

  const user = await user.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const hashToken = crypto.createHash("sha256").update(token).digest("hex");

  if (
    user.resetPasswordToken !== hashToken ||
    user.resetPasswordExpire < Date.now()
  ) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  if (await user.comparePassword(password)) {
    throw new ApiError(400, "New password must be different from old password");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  return new ApiResponse(200, "Password reset successful").send(res);
});

export const deleteUserAccount = handleAsync(async (req, res) => {
  const userId = req.userId;

  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.avatar !== "default-avatar.png") {
    await deleteMedia(user.avatarId);
  }

  res.clearCookie("refreshToken", cookieOptions);

  return new ApiResponse(200, "User account deleted successfully").send(res);
});

export const refreshAccessToken = handleAsync(async (req, res) => {

  const tokenFromHeader = req.headers.authorization?.trim().startswith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : undefined;

  const refreshTokenClient = req.cookies?.refreshToken || tokenFromHeader;

  if (!refreshTokenClient) {
    throw new ApiError(
      400,
      "Refresh Token is not present. User needs to login again."
    );
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshTokenClient, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(400, "Invalid Refresh Token. Please login");
  }

  const user = await User.findById(decoded._id).select("+refreshToken")

  if(!user){
     throw new ApiError(404, "User not found")
  }

  if(user.refreshToken !== refreshTokenClient){
     throw new ApiError(400, "Refresh token does not match")
  }

  const {accessToken, refreshToken} = await generateAccessRefreshToken(user._id)

  user.refreshToken = refreshToken

  await user.save({validateBeforeSave: false})

  res.cookie("accessToken", accessToken, {...cookieOptions, maxAge: 4 * 60 * 60 * 1000})
     .cookie("refreshToken", refreshToken, {...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000})

  return new ApiResponse(200, "Access token renewed successfully", {accessToken, refreshToken, _id: user._id}).send(res)
 
});

// point 1

/*
You only need to apply the mongoose-aggregate-paginate-v2 plugin 
on the schema you're querying from — the "main" schema where the 
aggregation starts. The other schema (used via $lookup) does NOT 
need the plugin.
*/

// point 2

/*
When you call .lean() on a query in Mongoose, 
it tells Mongoose to skip creating full Mongoose 
documents and instead return plain JavaScript 
objects (POJOs).

By default, Mongoose wraps each document it returns in a full Mongoose model instance, which:

Adds getters/setters

Adds virtuals

Adds helper methods (.save(), .validate(), etc.)

Tracks changes to fields for updates

Enables casting and schema logic
*/

// point 3

/*
If you want to use lean but with virtuals then you have to plugin 
this import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
in the schema and use like
lean({virtuals: true})
*/

// point 4
/*
if we do this await user.save() then those fields 
are present in the user the schema level validation runs for those fields

const user = await User.findById(userId).select("email"); // 'name' is required but not selected
user.email = "new@email.com";
await user.save(); // ✅ Will succeed if 'name' is not touched

If you manually set a required field to undefined or remove it:

user.name = undefined;
await user.save(); // ❌ Will trigger "name is required"
*/
