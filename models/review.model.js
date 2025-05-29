import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User reference is required"]
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: [true, "Course reference is required"]
  },
  comment: {
    type: String,
    trim: true,
    maxLength: [2000, "Comment cannot exceed 2000 characters"]
  },
  rating: {
    type: Number,
    required: true,
    min: [1, "Minimum rating is 1 star"],
    max: [5, "Maximum rating is 5 star"],
  },
}, {
    timestamps: true
});

reviewSchema.index({ userId: 1, courseId: 1 }, { unique: true }); // This ensures users can't leave multiple 
                                                                 // reviews for the same course — a common integrity constraint in review systems.

export const Review = mongoose.model("Review", reviewSchema)
