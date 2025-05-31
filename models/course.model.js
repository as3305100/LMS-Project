import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      maxLength: [100, "Course title cannot exceed 100 characters"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner ref is required"]
    },
    subtitle: {
      type: String,
      trim: true,
      maxLength: [200, "Course subtitle cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [5000, "Course description not more than 8000 characters"],
    },
    category: {
      type: String,
      required: [true, "Course category is required"],
      trim: true,
    },
    level: {
      type: String,
      enum: {
        values: ["beginner", "intermediate", "advanced"],
        message: "Please select a valid course level",
      },
      default: "beginner",
    },
    price: {
      type: Number,
      required: [true, "Course price is required"],
      min: [0, "Course price must be non-negative"],
    },
    thumbnail: {
      type: String,
      required: [true, "Course thumbnail is required"],
    },
    thumbnailId: {
      type: String,
      required: [true, "Thumbnail public_id is required"],
    },
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lectures: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture",
      },
    ],
    instructors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Course instructor is required"],
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    totalDuration: {
      type: Number,
      default: 0,
    },
    totalLectures: {
      type: Number,
      default: 0,
    },
  }, 
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.plugin(mongooseAggregatePaginate)

courseSchema.index({title: "text"})

courseSchema.pre("save", function (next) {
    if(this.lectures.length > 0){
        this.totalLectures = this.lectures.length;
    }
    next()
})

export const Course = mongoose.model("Course", courseSchema)
