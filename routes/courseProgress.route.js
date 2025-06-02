import express from "express";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { getUserCourseProgress, markCourseAsCompleted, resetCourseProgress, updateLectureProgress } from "../controllers/courseProgress.controller.js";
import {updateProgressValidation} from "../middlewares/courseValidation.middleware.js"

const router = express.Router();

router.get("/:courseId", isAuthenticated, getUserCourseProgress);

router.patch("/:courseId/lectures/:lectureId", isAuthenticated, updateProgressValidation, updateLectureProgress)

router.patch("/:courseId/complete", isAuthenticated, markCourseAsCompleted)

router.patch("/:courseId/reset", isAuthenticated, resetCourseProgress)

export default router;
