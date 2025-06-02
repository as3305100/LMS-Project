import express from "express";

import { getCoursePurchaseStatus, getPurchasedCourses, handleStripeWebhook, initiateStripeCheckout } from "../controllers/coursePurchase.controller.js"
import {isAuthenticated} from "../middlewares/auth.middleware.js"

const router = express.Router()

router.post("/checkout/create-checkout-session", isAuthenticated, initiateStripeCheckout)

router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook) // go and ask chatgpt stripe webhood new raw data coming from client express.json() data that is why we use this

router.get("/course/:courseId/detail-with-status", isAuthenticated, getCoursePurchaseStatus)

router.get("/", isAuthenticated, getPurchasedCourses)

export default router