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

// progress validation

const updateProgressSchema = Joi.object({
  isCompleted: Joi.boolean().required().messages({
    "any.required": "isCompleted is required",
    "boolean.base": "isCompleted should be a boolean",
  }),
  watchTime: Joi.number().min(0).required().messages({
    "any.required": "watchTime is required",
    "number.base": "watchTime should be a number",
    "number.min": "watchTime cannot be negative",
  }),
});


export const courseValidation = validate(createCourseSchema);
export const lectureValidation = validate(addLectureValidation)
export const updateProgressValidation = validate(updateProgressSchema)
