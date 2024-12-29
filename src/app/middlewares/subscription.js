import createError from "http-errors";
import { brandsCollection } from "../collections/collections.js";
import { ObjectId } from "mongodb";

export const subscriptionUser = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  try {
    const existingBrand = await brandsCollection.findOne({
      _id: new ObjectId(user?.brand?._id),
    });
    
    if (!existingBrand?.selected_plan?.id) {
      throw createError(402, "Subscription is required");
    }

    const endTime = existingBrand?.subscription_info?.end_time
      ? new Date(existingBrand.subscription_info.end_time)
      : null;

    const currentTime = new Date();

    // If end_time is null, undefined, or in the past
    if (!endTime || currentTime > endTime) {
      throw createError(402, "Your subscription has expired");
    }

    next();
  } catch (error) {
    next(error);
  }
};
