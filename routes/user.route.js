import express from "express";
import {
  signupValidation,
  loginValidation,
  updateValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "../middlewares/validation.middleware.js";
import {
  authenticateUser,
  changeUserPassword,
  createUserAccount,
  deleteUserAccount,
  forgotPassword,
  getCurrentUserProfile,
  refreshAccessToken,
  resetPassword,
  signOutUser,
  updateUserProfile,
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { upload } from "../utils/multer.js";

const router = express.Router();

router.post(
  "/signup",
  upload.single("avatar"),
  signupValidation,
  createUserAccount
);
router.post("/signin", loginValidation, authenticateUser);
router.post("/signout", isAuthenticated, signOutUser);
router.post("/renew-token", refreshAccessToken);

router.get("/profile", isAuthenticated, getCurrentUserProfile);
router.patch(
  "/profile",
  isAuthenticated,
  upload.single("avatar"),
  updateValidation,
  updateUserProfile
);

router.patch(
  "/change-password",
  isAuthenticated,
  changePasswordValidation,
  changeUserPassword
);
router.patch("/forgot-password", forgotPasswordValidation, forgotPassword);
router.patch("/reset-password/:token", resetPasswordValidation, resetPassword);

router.delete("/account", isAuthenticated, deleteUserAccount);

export default router
