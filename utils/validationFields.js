import Joi from "joi";

export const validationFields = {
  name: Joi.string().trim().min(3).max(50).required().messages({
    "any.required": "Name is required",
    "string.min": "Name length should not less than 3 characters",
    "string.max": "Name length not more than 50 characters",
  }),
  email: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .required()
    .messages({
      "any.required": "Email is required",
      "string.pattern.base": "Please provide a valid email",
    }),

  password: Joi.string().min(8).max(60).required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must not exceed 60 characters",
  }),

  role: Joi.string()
    .valid("student", "instructor", "admin")
    .default("student")
    .messages({
      "any.only": "Please select a valid role",
    }),

  bio: Joi.string().max(200).optional().messages({
    "string.max": "Bio cannot exceed 200 characters",
  }),
};
