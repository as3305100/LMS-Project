import crypto from "node:crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { v4 as uuidv4 } from "uuid";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new ApiError(400, "Course Id is invalid");
    }

    const course = await Course.findById(courseId);

    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.price,
      status: "pending",
      paymentMethod: "razorpay",
      currency: "INR",
    });

    const options = {
      amount: course.price * 100,
      currency: "INR",
      receipt: `course_${courseId}_${uuidv4()}`,
      notes: {
        courseId: courseId,
        userId: userId,
      },
    };

    const order = await razorpay.orders.create(options);

    newPurchase.paymentId = order.id;

    await newPurchase.save();

    const data = {
      order,
      course: {
        name: course.title,
        description: course.description,
        image: course.thumbnail,
      },
    };

    return new ApiResponse(200, "Order created successfully", data).send(res);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw new ApiError(
      500,
      "Error occured while creating razorpay order",
      error.message
    );
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ApiError(400, "Payment verfication details are missing");
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      throw new ApiError(400, "Payment verification failed");
    }

    const purchase = await CoursePurchase.findOne({
      paymentId: razorpay_order_id,
    });

    if (!purchase) {
      throw new ApiError(404, "Purchase record not found");
    }

    purchase.status = "completed";

    await purchase.save();
  } catch (error) {
    console.error("Error verifying payment:", error);
    throw new ApiError(500, "Error verifying payment:", error.message);
  }
};
