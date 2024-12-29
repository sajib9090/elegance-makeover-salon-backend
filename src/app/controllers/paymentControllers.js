import {
  brandsCollection,
  paymentRecordCollection,
} from "../collections/collections.js";
import createError from "http-errors";
import { ObjectId } from "mongodb";

export const handleIncreaseSubscription = async (req, res, next) => {
  const { transactionId } = req.params;
  const { days } = req.body;

  // Check if 'days' is provided and is a valid number
  if (!days || isNaN(days) || days <= 0) {
    return res.status(400).send({
      success: false,
      message: "'days' is required and must be a positive number",
    });
  }

  try {
    // Find the payment record
    const existingPayment = await paymentRecordCollection.findOne(
      {
        transaction_id: transactionId,
      },
      { projection: { transaction_id: 1, brand_id: 1 } }
    );

    if (!existingPayment) {
      throw createError(400, "Invalid request");
    }

    // Find the brand by brand_id
    const brand = await brandsCollection.findOne(
      { _id: new ObjectId(existingPayment.brand_id) },
      { projection: { "subscription_info.end_date": 1 } }
    );

    if (!brand) {
      throw createError(400, "Brand not found");
    }

    // Calculate the new end_date
    const currentEndDate = new Date(
      brand.subscription_info.end_date || new Date()
    );
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(currentEndDate.getDate() + parseInt(days));
    newEndDate.setHours(23, 59, 59, 999); // Ensure the time is at the end of the day

    // Update the brand's subscription end_date
    const updatedBrand = await brandsCollection.updateOne(
      { _id: new ObjectId(existingPayment?.brand_id) },
      { $set: { "subscription_info.end_time": newEndDate } } // Use the Date object directly
    );

    if (updatedBrand.modifiedCount === 0) {
      throw createError(400, "Failed to update subscription end date");
    }

    // Update the payment status to success
    await paymentRecordCollection.updateOne(
      { transaction_id: existingPayment.transaction_id },
      { $set: { status: "success" } }
    );

    // Send the success response
    res.status(200).send({
      success: true,
      message: "Subscription increased successfully",
    });
  } catch (error) {
    next(error); // Pass error to the next middleware
  }
};

export const handleGetPayments = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  try {
    const result = await paymentRecordCollection
      .find({ brand_id: user?.brand?._id })
      .sort({ createdAt: -1 })
      .toArray();

    const brandInfo = await brandsCollection.findOne({
      _id: new ObjectId(user?.brand?._id),
    });

    // Calculate remaining days
    let remainingDays = null;
    if (brandInfo?.subscription_info?.end_time) {
      const currentDate = new Date();
      const endDate = new Date(brandInfo.subscription_info.end_time);
      remainingDays = Math.ceil(
        (endDate - currentDate) / (1000 * 60 * 60 * 24)
      );
    }

    res.status(200).send({
      success: true,
      message: "Data retrieved successfully",
      data: result,
      subscriptionInfo: {
        remainingDays: remainingDays > 0 ? remainingDays : 0,
        endDate: brandInfo?.subscription_info?.end_time,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleRejectPayment = async (req, res, next) => {
  const { transactionId, declinedReason } = req.body;
  try {
    if (!declinedReason || typeof declinedReason !== "string") {
      throw createError(
        400,
        "'declinedReason' is required and must be a string"
      );
    }

    const formattedReason = declinedReason.trim().toLowerCase();
    const existingPayment = await paymentRecordCollection.findOne({
      transaction_id: transactionId,
    });
    if (!existingPayment) {
      throw createError(400, "Invalid request");
    }
    const updatedPayment = await paymentRecordCollection.updateOne(
      { transaction_id: transactionId },
      { $set: { status: "rejected", declined_reason: formattedReason } }
    );

    if (updatedPayment.modifiedCount === 0) {
      throw createError(400, "Failed to update payment status");
    }
    res.status(200).send({
      success: true,
      message: "Payment rejected successfully",
    });
  } catch (error) {
    next(error);
  }
};
