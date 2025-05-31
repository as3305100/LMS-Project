import Joi from "joi";
import { courseSchema } from "../utils/courseValidationFields.js";
import { validate } from "../utils/validateSchema.js";

const createCourseSchema = Joi.object({
    title: courseSchema.title,
    subtitle: courseSchema.subtitle,
    description: courseSchema.description,
    level: courseSchema.level,
    category: courseSchema.category,
    price: courseSchema.price,
    isPublished: courseSchema.isPublished,
    instructors: courseSchema.instructors
})

export const createCourseValidation = validate(createCourseSchema)