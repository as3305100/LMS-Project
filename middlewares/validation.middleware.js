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

const updateSchema = Joi.object({
  name: validationFields.name,
  role: validationFields.role,
  bio: validationFields.bio
})

const changePasswordSchema = Joi.object({
  oldPassword: validationFields.password,
  newPassword: validationFields.password
})

const forgotPasswordSchema = Joi.object({
  email: validationFields.email
})

const resetPasswordSchema = Joi.object({
  email: validationFields.email,
  password: validationFields.password
})

export const signupValidation = validate(signupSchema);
export const loginValidation = validate(loginSchema);
export const updateValidation = validate(updateSchema)
export const changePasswordValidation = validate(changePasswordSchema)
export const forgotPasswordValidation = validate(forgotPasswordSchema)
export const resetPasswordValidation = validate(resetPasswordSchema)
