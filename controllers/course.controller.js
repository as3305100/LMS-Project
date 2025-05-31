import { Course } from "../models/course.model.js";
import { ApiError, handleAsync } from "../middlewares/error.middleware.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { deleteMedia, uploadMedia } from "../utils/cloudinary.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";

export const createNewCourse = handleAsync(async (req, res) => {
  const {
    title,
    subtitle = "",
    description = "",
    category,
    level,
    price,
    instructors,
    isPublished,
  } = req.validated;

  const userId = req.userId;

  const thumbnailPath = req.file?.path;

  if (!thumbnailPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const user = await User.findById(userId).lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const thumbnailResponse = await uploadMedia(thumbnailPath);

  const course = await Course.create({
    title,
    subtitle,
    description,
    category,
    level,
    price,
    instructors,
    isPublished,
    owner: userId,
    thumbnail: thumbnailResponse.secure_url,
    thumbnailId: thumbnailResponse.public_id,
  });

  user.createdCourses.push(course._id);

  await user.save({ validateBeforeSave: false });

  const courseResponse = {
    _id: course._id,
    owner: course.owner,
    title: course.title,
    category: course.category,
    price: course.price,
    level: course.level,
    thumbnail: course.thumbnail,
  };

  return new ApiResponse(
    201,
    "Course created successfully",
    courseResponse
  ).send(res);
});

// use chatgpt to understand the full code and also use document
export const searchCourses = handleAsync(async (req, res) => {
  const {
    searchText = "",
    categories = [],
    level,
    priceRange,
    limit = 20,
    page = 1,
  } = req.query;

  const parsedLimit = Math.min(50, parseInt(limit)) || 20;
  const parsedPage = Math.max(1, parseInt(page)) || 1;

  const matchStage = {
    $text: { $search: searchText },
  };

  if (Array.isArray(categories) && categories.length > 0) {
    matchStage.category = { $in: categories };
  }

  if (level) {
    match.level = level;
  }

  if (priceRange) {
    const [min, max] = priceRange.split("-").map(Number);
    match.price = {};
    if (!isNaN(min)) match.price.$gte = min;
    if (!isNaN(max)) match.price.$lte = max;
  }

  const searchResult = await Course.aggregate([
    {
      $match: matchStage,
    },
    {
      $addFields: {
        score: { $meta: "textScore" },
      },
    },
    {
      $sort: {
        score: { $meta: "textScore" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "instructors",
        foreignField: "_id",
        as: "instructorsDetails",
      },
    },
    {
      $project: {
        title: 1,
        subtitle: 1,
        category: 1,
        level: 1,
        price: 1,
        thumbnail: 1,
        instructorDetails: {
          name: 1,
          email: 1,
          avatar: 1,
        },
      },
    },
    { $skip: (parsedPage - 1) * parsedLimit },
    { $limit: parsedLimit },
  ]);

  return new ApiResponse(
    200,
    "Courses fetched successfully",
    searchResult
  ).send(res);
});

export const getPublishedCourses = catchAsync(async (req, res) => {
  const { limit, page } = req.query;

  const parsedLimit = Math.min(50, parseInt(limit)) || 20;
  const parsedPage = Math.max(1, parseInt(page)) || 1;

  const skip = (parsedPage - 1) * parsedLimit;

  const [courses, total] = await Promise.all([
    Course.find({ isPublished: true })
     .select("title category price owner level thumbnail createdAt")
      .populate({
        path: "instructors",
        select: "name avatar",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),
    Course.countDocuments({ isPublished: true }),
  ]);

  return new ApiResponse(200, "Data fetched successfully", {
    courses,
    total,
  }).send(res);
});

export const getMyCreatedCourses = catchAsync(async (req, res) => {
  const userId = req.userId;

  const courses = await Course.find({ owner: userId })
    .select("title category price owner level thumbnail createdAt")
    .populate({
        path: "instructors",
        select: "name avatar"
    })
    .sort({ createdAt: -1 });

  return new ApiResponse(200, "Courses fetched successfully", courses).send(res);
});