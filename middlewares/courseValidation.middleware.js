import Joi from "joi";
import {
  courseSchema,
  lectureValidationSchema,
} from "../utils/courseValidationFields.js";
import { validate } from "../utils/validateSchema.js";

const createCourseSchema = Joi.object({
  title: courseSchema.title,
  subtitle: courseSchema.subtitle,
  description: courseSchema.description,
  level: courseSchema.level,
  category: courseSchema.category,
  price: courseSchema.price,
  isPublished: courseSchema.isPublished,
  instructors: courseSchema.instructors,
});

const addLectureValidation = Joi.object({
  title: lectureValidationSchema.title,
  description: lectureValidationSchema.description,
  isPreview: lectureValidationSchema.isPreview,
  order: lectureValidationSchema.order,
});

export const courseValidation = validate(createCourseSchema);
export const lectureValidation = validate(addLectureValidation)
