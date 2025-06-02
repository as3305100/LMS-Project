import { CourseProgress } from "../models/courseProgress.js";
import { ApiError, handleAsync } from "../middlewares/error.middleware.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

export const getUserCourseProgress = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const userId = req.userId;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Course Id is not valid");
  }
  const courseProgress = await CourseProgress.findOne({ courseId, userId });
  // .populate("courseId", "title")
  // .populate("lectureProgress.lectureId", "title");

  if (!courseProgress) {
    throw new ApiError(404, "Course Progress is not found");
  }

  await courseProgress.updateLastAccessed();

  return new ApiResponse(
    200,
    "Course Progress Data fetched successfully",
    courseProgress
  ).send(res);
});
// PATCH /api/v1/progress/:courseId/lectures/:lectureId
export const updateLectureProgress = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const lectureId = req.params?.lectureId;
  const userId = req.userId;

  const { isCompleted, watchTime } = req.validated;

  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(lectureId)
  ) {
    throw new ApiError(400, "Course Id or Lecture Id is invalid");
  }

  const courseProgress = await CourseProgress.findOne({ userId, courseId });

  if (!courseProgress) {
    throw new ApiError(404, "Course Progess not found");
  }

  const existingLectureProgress = courseProgress.lectureProgress.find(
    (lecture) => lecture.lectureId.toString() === lectureId
  );

  if (existingLectureProgress) {
    existingLectureProgress.isCompleted = isCompleted;
    existingLectureProgress.watchTime = watchTime;
    existingLectureProgress.lastWatched = new Date();
  } else {
    courseProgress.lectureProgress.push({
      lectureId,
      isCompleted,
      watchTime: watchTime,
      lastWatched: new Date(),
    });
  }

  await courseProgress.save();
  await courseProgress.updateLastAccessed();

  return new ApiResponse(
    200,
    "Lecture progress updated successfully",
    courseProgress
  ).send(res);
});

export const markCourseAsCompleted = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const userId = req.userId;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Invalid course id");
  }

  const courseProgress = await CourseProgress.findOne({ courseId, userId });

  if (!courseProgress) {
    throw new ApiError(404, "Course Progress is not found");
  }

  courseProgress.lectureProgress.forEach((progress) => {
    progress.isCompleted = true;
  });
  courseProgress.isCompleted = true;
  courseProgress.lastAccessed = new Date();

  await courseProgress.save();

  return new ApiResponse(
    200,
    "Course marked as completed successfully",
    courseProgress
  ).send(res);
});

export const resetCourseProgress = catchAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const userId = req.userId;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Invalid course id");
  }

  const courseProgress = await CourseProgress.findOne({ courseId, userId });

  if (!courseProgress) {
    throw new ApiError(404, "Course Progress is not found");
  }

  courseProgress.lectureProgress.forEach((progress) => {
    progress.isCompleted = false;
    progress.watchTime = 0;
    progress.lastWatched = undefined
  });

  courseProgress.isCompleted = false;
  courseProgress.lastAccessed = new Date();

  await courseProgress.save();

  return new ApiResponse(
    200,
    "Course Progress reset successfully",
    courseProgress
  ).send(res);
});
