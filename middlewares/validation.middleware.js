import Joi from "joi";
import { validationFields } from "../utils/validationFields.js";
import { validate } from "../utils/validateSchema.js";

const signupSchema = Joi.object({
  name: validationFields.name,
  email: validationFields.email,
  password: validationFields.password,
  role: validationFields.role,
  bio: validationFields.bio,
});

const loginSchema = Joi.object({
  email: validationFields.email,
  password: validationFields.password,
});

export const signupValidation = validate(signupSchema);
export const loginValidation = validate(loginSchema);
