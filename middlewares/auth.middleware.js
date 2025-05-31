import jwt from "jsonwebtoken";
import { ApiError, handleAsync } from "./error.middleware.js";

export const verifyJwt = handleAsync(async (req, _, next) => {
  const tokenFromHeader = req.headers.authorization?.startswith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : undefined;

  const token = req.cookies?.accessToken || tokenFromHeader;

  if (!token) {
    throw new ApiError(401, "Token is not present. User has to login");
  }

  let decoded;
  
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }

  req.userId = decoded._id;

  next();
});
