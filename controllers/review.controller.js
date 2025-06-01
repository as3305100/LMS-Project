import { ApiError, handleAsync } from "../middlewares/error.middleware.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Review } from "../models/review.model.js";
import mongoose from "mongoose";

export const upsertReview = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const userId = req.userId;
  const { comment, rating } = req.validated;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Invalid course ID");
  }

  const updatedReview = await Review.findOneAndUpdate(
    { courseId, userId },
    { comment, rating },
    {
      new: true, // return the updated document
      upsert: true, // create if not exists
      setDefaultsOnInsert: true, // it enables the default field that are in this schema
    }
  );

  return new ApiResponse(
    200,
    "Review created or updated successfully",
    updatedReview
  ).send(res);
});

export const getCourseRating = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Course Id is not valid");
  }

  const ratingData = await Review.aggregate([
    { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  let totalRatings = 0;
  let ratingSum = 0;

  const breakdown = Array.from({ length: 5 }, (_, i) => {
    const rating = 5 - i;
    const found = ratingData.find((r) => r._id === rating);
    const count = found?.count || 0;

    totalRatings += count;
    ratingSum += rating * count;

    return { rating, count };
  });

  const averageRating =
    totalRatings === 0 ? 0 : (ratingSum / totalRatings).toFixed(1);

  return new ApiResponse(200, "Course rating fetched successfully", {
    averageRating: Number(averageRating),
    totalRatings,
    breakdown,
  }).send(res);
});

export const getCourseReview = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const { limit, page } = req.query;

  const parsedLimit = Math.min(50, parseInt(limit)) || 20;
  const parsedPage = Math.max(1, parseInt(page)) || 1;
  const skip = (parsedPage - 1) * parsedLimit;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Course ID is invalid");
  }

  const [courseReviews, totalReviews] = await Promise.all([
    Review.find({ courseId })
      .populate("userId", "name avatar")
      .skip(skip)
      .limit(parsedLimit),
    Review.countDocuments({ courseId }),
  ]);

  if (courseReviews.length === 0) {
    throw new ApiError(404, "No reviews found for this course");
  }

  return new ApiResponse(200, "Course reviews fetched successfully", {
    totalReviews,
    page: parsedPage,
    limit: parsedLimit,
    reviews: courseReviews,
  }).send(res);
});
