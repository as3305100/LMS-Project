import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";

import connectDB, { getDBStatus } from "./database/db.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import healthRouter from "./routes/health.route.js"
import userRouter from "./routes/user.route.js"
import courseRouter from "./routes/course.route.js"
import progressRouter from "./routes/courseProgress.route.js"
import purchaseRouter from "./routes/courseProgress.route.js"
import razorpayRouter from "./routes/razorpay.route.js"


// loading environment variable
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

const MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100

// global rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: MAX,
  message: "Too many requests from this IP, please try again later."
})

// security middleware
app.use(helmet()) // point 1
app.use(hpp())  // point 2
app.use("/api", limiter)

// logging middleware
if(process.env.NODE_ENV === "development"){
    app.use(morgan("dev"))
}

// body parser middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// cors configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5371",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
  })
);

// Api routes
app.use("/health", healthRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/courses", courseRouter)
app.use("/api/v1/progress", progressRouter)
app.use("/api/v1/purchase", purchaseRouter)
app.use("/api/v1/razorpay", razorpayRouter)

// 404 handler
app.use((req, res) => {
   res.status(404).json({
    status: "error",
    statusCode: 404,
    message: "Route not found"
   })
})

// global error handler
app.use(errorHandler);

// start server
connectDB().then(() => {
  if (getDBStatus().isConnected) {
    app.listen(PORT, () => {
      console.log(`Server is running on the port ${PORT}`);
    });
  }
});

// point 1
/*
Yes, helmet in Node.js/Express is primarily 
used to set various HTTP response headers 
that help secure your app. It does not modify 
request headers or any other part of the 
request/response cycle outside of security-related 
headers.
*/

// point 2
/* 
It sanitizes the request by removing duplicate 
query parameters, keeping only the last one by default.

// before using hpp
// Request: /search?item=pen&item=eraser
// Output: { item: ['pen', 'eraser'] }

// after using hpp
// Request: /search?item=pen&item=eraser
// Output: { item: 'eraser' }
*/