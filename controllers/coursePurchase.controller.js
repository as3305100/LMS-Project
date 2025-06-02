import Stripe from "stripe";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { ApiError, handleAsync } from "../middlewares/error.middleware.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const initiateStripeCheckout = handleAsync(async (req, res) => {
  const { courseId } = req.body;
  const userId = req.userId;

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
    paymentMethod: "stripe",
    currency: "INR",
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: course.title,
          },
          unit_amount: course.price * 100, // Amount in paise
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.CLIENT_URL}/course-progress/${courseId}?status=success`,
    cancel_url: `${process.env.CLIENT_URL}/course-detail/${courseId}?status=cancel`,
    metadata: {
      courseId: courseId,
      userId: req.id,
    },
    shipping_address_collection: {
      allowed_countries: ["IN"],
    },
  });

  if (!session.url) {
    throw new ApiError(400, "Failed to create checkout session");
  }

  newPurchase.paymentId = session.id;
  await newPurchase.save();

  return new ApiResponse(200, "Checkout session created successfully", {
    checkoutUrl: session.url,
  }).send(res);
});

export const handleStripeWebhook = handleAsync(async (req, res) => {
  let event;

  try {
    const payload = JSON.stringify(req.body, null, 2);
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    event = stripe.webhooks.constructEvent(payload, header, secret);
  } catch (error) {
    throw new ApiError(400, "Webhook error occured", error.message);
  }

  if (event.type !== "checkout.session.completed") {
    return new ApiResponse(200, null, { received: true }).send(res);
  }

  const session = event.data.object;
  const purchase = await CoursePurchase.findOne({
    paymentId: session.id,
  }).populate("courseId");

  if (!purchase) {
    throw new ApiError(404, "Purchase record not found");
  }

  purchase.status = "completed";

  if (session.amount_total) {
    purchase.amount = session.amount_total / 100;
  }

  await purchase.save();

  // Update user's enrolled courses and course's enrolled students
  await Promise.all([
    User.findByIdAndUpdate(purchase.userId, {
      $addToSet: { enrolledCourses: purchase.courseId._id },
    }),
    Course.findByIdAndUpdate(purchase.courseId._id, {
      $addToSet: { enrolledStudents: purchase.userId },
    }),
  ]);

  return new ApiResponse(200, null, { received: true }).send(res);
});

export const getCoursePurchaseStatus = handleAsync(async (req, res) => {
  const courseId = req.params?.courseId;
  const userId = req.userId;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Course Id is invalid");
  }

  const coursePurchase = await CoursePurchase.findOne({ courseId, userId });

  if (!coursePurchase) {
    throw new ApiError(404, "Course Purchase not found");
  }

  const purchasedData = {
    courseId: coursePurchase.courseId,
    userId: coursePurchase.userId,
    amount: coursePurchase.amount,
    currency: coursePurchase.currency,
    status: coursePurchase.status,
    paymentMethod: coursePurchase.paymentMethod,
    refundAmount: coursePurchase.refundAmount,
    refundReason: coursePurchase.refundReason || "",
    isRefundable: coursePurchase.isRefundable,
  };

  return new ApiResponse(
    200,
    "Course Purchase data fetched successfully",
    purchasedData
  ).send(res);
});

export const getPurchasedCourses = handleAsync(async (req, res) => {
  const userId = req.userId;

  const purchasedCourses = await CoursePurchase.aggregate([
    {
      $match: {
        $and: [{ userId }, { status: "completed" }],
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "courseId",
        foreignField: "_id",
        as: "course",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    name: 1,
                    email: 1,
                    avatar: 1,
                    bio: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $arrayElemAt: ["$owner", 0] },
            },
          },
          {
            $project: {
               title: 1,
               owner: 1,
               subtitle: 1,
               description: 1,
               category: 1,
               level: 1,
               thumbnail: 1,
               totalDuration: 1,
               totalLectures: 1
            }
          }
        ],
      },
    },
    {
      $addFields: {
         course: {
           $arrayElemAt: ["$course", 0]
         }
      }
    },
    {
      $project: {
         course: 1
      }
    }
  ])

  if (!purchasedCourses?.length) {
    throw new ApiError(404, "Purchased courses not found");
  }

  return new ApiResponse(200, "Purchased Courses Data fetched successfully", purchasedCourses).send(res)

});

// point 1
/*
JSON.stringify(value, replacer, space)
The second argument is called replacer. It's used to filter or customize which properties are included in the JSON string.

Here's what it can be:
null → Include everything in the object (default behavior)

Stripe requires the raw string payload to verify the webhook signature.
If you try to pass req.body directly (as an object), it won’t match the 
signature Stripe sent, and verification will fail.
*/
