import fs from "node:fs/promises";
import { Course } from "../models/course.model.js";
import { ApiError, handleAsync } from "../middlewares/error.middleware.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  deleteMedia,
  deleteVideoCloudinary,
  uploadMedia,
} from "../utils/cloudinary.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// utility function
const safeUnlink = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    console.warn("Failed to delete file:", err.message);
  }
};

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
    await safeUnlink(thumbnailPath);
    throw new ApiError(404, "User not found");
  }

  if(user.role !== "admin"){
     await safeUnlink(thumbnailPath)
     throw new ApiError(400, "User is not admin, so user cannot create the course")
  }

  const instructorUsers = await User.find(
    { email: { $in: instructors } }, // point 1
    "_id"
  ).lean();

  if (instructorUsers.length !== instructors.length) {
    await safeUnlink(thumbnailPath);
    throw new ApiError(400, "Some instructor emails are invalid or not found");
  }

  const instructorIds = instructorUsers.map((user) => user._id);

  const thumbnailResponse = await uploadMedia(thumbnailPath);

  const course = await Course.create({
    title,
    subtitle,
    description,
    category,
    level,
    price,
    instructors: instructorIds,
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

export const getPublishedCourses = handleAsync(async (req, res) => {
  const { limit, page } = req.query;

  const parsedLimit = Math.min(50, parseInt(limit)) || 20;
  const parsedPage = Math.max(1, parseInt(page)) || 1;

  const skip = (parsedPage - 1) * parsedLimit;

  const [courses, total] = await Promise.all([
    Course.find({ isPublished: true })
      .select("title category price owner level thumbnail createdAt")
      .populate({
        path: "instructors",
        select: "name avatar email",
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

export const getMyCreatedCourses = handleAsync(async (req, res) => {
  const userId = req.userId;

  const user = await User.findById(userId)

  if(!user){
     throw new ApiError(404, "User not found")
  }

  if(user.role !== "admin"){
     throw new ApiError(400, "Only admin can see my created courses, so update your account")
  }

  const courses = await Course.find({ owner: userId })
    .select("title category price owner level thumbnail createdAt")
    .populate({
      path: "instructors",
      select: "name avatar email",
    })
    .sort({ createdAt: -1 });

  return new ApiResponse(200, "Courses fetched successfully", courses).send(
    res
  );
});

export const updateCourseDetails = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const thumbnailPath = req.file?.path;
  const owner = req.userId;

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

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    if (thumbnailPath) await safeUnlink(thumbnailPath);
    throw new ApiError(400, "Invalid course ID");
  }

  const course = await Course.findOne({ owner, _id: courseId }).select(
    "+thumbnailId"
  );

  if (!course) {
    if (thumbnailPath) await safeUnlink(thumbnailPath);
    throw new ApiError(404, "Course is not found, which is created by you.");
  }

  const instructorUsers = await User.find(
    { email: { $in: instructors } }, // point 1
    "_id"
  ).lean();

  if (instructorUsers.length !== instructors.length) {
    if (thumbnailPath) await safeUnlink(thumbnailPath);
    throw new ApiError(400, "Some instructor emails are invalid or not found");
  }

  const instructorIds = instructorUsers.map((user) => user._id);

  const updateInfo = {
    title,
    subtitle,
    description,
    category,
    level,
    price,
    instructors: instructorIds,
    isPublished,
  };

  if (thumbnailPath) {
    const response = await uploadMedia(thumbnailPath);
    updateInfo.thumbnail = response.secure_url;
    updateInfo.thumbnailId = response.public_id;
  }

  const courseUpdate = await Course.findOneAndUpdate(
    { owner, _id: courseId },
    {
      $set: updateInfo,
    },
    { new: true }
  );

  if (!courseUpdate) {
    throw new ApiError(404, "Failed to update course. Course not found.");
  }

  if (thumbnailPath) await deleteMedia(course.thumbnailId);

  const responseData = courseUpdate.toObject(); // point 2
  delete responseData.thumbnailId;

  return new ApiResponse(200, "Course updated successfully", courseUpdate).send(
    res
  );
});

export const getCourseDetails = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Invalid course ID");
  }

  const course = await Course.findById(courseId)
    .populate({
      path: "instructors",
      select: "name bio avatar",
    })
    .populate({
      path: "lectures",
      select: "title duration order",
      options: { sort: { order: 1 } },
    });

  if (!course) {
    throw new ApiError("Course not found", 404);
  }

  return new ApiResponse(
    200,
    "Course detailed fetched successfully",
    course
  ).send(res);
});

export const addLectureToCourse = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const owner = req.userId;
  const videoPath = req.file?.path;
  const { title, description = "", isPreview = false, order } = req.validated;

  if (!videoPath) {
    throw new ApiError(400, "Lecture video is required");
  }

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    await safeUnlink(videoPath);
    throw new ApiError(400, "Invalid course ID");
  }

  const course = await Course.findOne({ owner, _id: courseId });

  if (!course) {
    await safeUnlink(videoPath);
    throw new ApiError(404, "No course is found which is created by you");
  }

  const existingLectureWithOrder = await Lecture.findOne({
    _id: { $in: course.lectures },
    order,
  });

  if (existingLectureWithOrder) {
    await safeUnlink(videoPath);
    throw new ApiError(
      400,
      `A lecture with order ${order} already exists in this course`
    );
  }

  const lectureResponse = await uploadMedia(videoPath);

  let createLecture;

  try {
    createLecture = await Lecture.create({
      title,
      description,
      isPreview,
      order,
      videoUrl: lectureResponse.secure_url,
      publicId: lectureResponse.public_id,
      duration: lectureResponse.duration,
    });
  } catch (error) {
    await deleteVideoCloudinary(lectureResponse.public_id);
    throw new ApiError(500, "Lecture creation failed");
  }

  course.lectures.push(createLecture._id);

  await course.save({ validateBeforeSave: false });

  return new ApiResponse(
    201,
    "Lecture uploaded successfully",
    createLecture
  ).send(res);
});

export const getCourseLectures = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const userId = req.userId;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Course Id is invalid");
  }

  const course = await Course.findById(courseId).populate({
    path: "lectures",
    select: "title description videoUrl duration isPreview order",
    options: { sort: { order: 1 } },
  });

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  const isEnrolled = course.enrolledStudents.includes(userId);
  const isInstructor = course.instructors.includes(userId);
  const isOwner = course.owner.toString() === userId;

  let lectures = [];

  if (!isEnrolled && !isInstructor && !isOwner) {
    lectures = course.lectures.filter((lecture) => lecture.isPreview);
  } else {
    lectures = course.lectures;
  }

  return new ApiResponse(200, "Lectures fetched successfully", lectures).send(
    res
  );
});

// point 1
/*
2️⃣ { email: { $in: instructors } }
This is the filter condition, and it says:

"Find all users whose email is in the array called instructors."

$in explained:
$in is a MongoDB operator that works like the JavaScript 
includes() method but on the database level.

"_id"
This is a projection, which tells MongoDB:
Only return the _id field of each matching user (ignore other fields like name, email, etc).

What does .map() do?
Array.map() takes an array and transforms it 
into a new array by running a function on each item.

const users = [
  { _id: "123", email: "alice@example.com" },
  { _id: "456", email: "bob@example.com" },
];

const ids = users.map(user => user._id);
// result: ["123", "456"]
*/

// point 2
/*
const responseData = courseUpdate.toObject();
👉 What it does:
Converts the Mongoose document (courseUpdate) into a plain JavaScript object.

💡 Why?
Mongoose documents come with a lot of internal functions and metadata (like .save(), .populate(), virtuals, etc).
If you want a clean, raw object that you can safely modify and send in a response, .toObject() is the way to go.

🔍 Without .toObject():
If you tried to do:
delete courseUpdate.thumbnailId;
You’d be mutating the Mongoose document, which could lead to unwanted 
side effects (like saving that mutation to the DB).
*/
