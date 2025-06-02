import express from "express";
import { addLectureToCourse, createNewCourse, getCourseDetails, getCourseLectures, getMyCreatedCourses, getPublishedCourses, searchCourses, updateCourseDetails } from "../controllers/course.controller.js";
import { upload } from "../utils/multer.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js"
import { courseValidation, lectureValidation } from "../middlewares/courseValidation.middleware.js";

const router = express.Router();

router.post("/", isAuthenticated, upload.single("thumbnail"), courseValidation, createNewCourse) // admin he keval

router.get("/search", searchCourses)
router.get("/published", getPublishedCourses)
router.get("/my-courses", isAuthenticated, getMyCreatedCourses) // admin he keval

router.patch("/:courseId", isAuthenticated, upload.single("thumbnail"), courseValidation, updateCourseDetails) // admin he keval

router.get("/:courseId", getCourseDetails)

router.post("/:courseId/lectures", isAuthenticated, upload.single("video"), lectureValidation, addLectureToCourse) // admin he keval

router.get("/:courseId/lectures", isAuthenticated, getCourseLectures)

export default router