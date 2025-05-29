import { ApiError } from "../middlewares/error.middleware.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false
    });

    if (error) {
      const message = error.details.map((err) => err.message).join(", ");

      throw new ApiError(400, "validation error", message);
    }
    req.validated = value
    next();
  };
};
