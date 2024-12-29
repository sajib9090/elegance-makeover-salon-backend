import { ObjectId } from "mongodb";
import {
  brandsCollection,
  paymentRecordCollection,
  plansCollection,
} from "../collections/collections.js";
import createError from "http-errors";

export const handleGetPlans = async (req, res, next) => {
  try {
    const result = await plansCollection.find().sort({ price: 1 }).toArray();

    res.status(200).send({
      success: true,
      message: "Plans retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
export const handleGetPlan = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid plan ID format",
      });
    }

    const result = await plansCollection.findOne({ _id: new ObjectId(id) });

    res.status(200).send({
      success: true,
      message: "Plans retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleSelectPlan = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { id } = req.params;
  const { transactionId, selectedAccount, method } = req.body;

  try {
    // Validate Plan ID format
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid plan ID format",
      });
    }

    // Find the plan in the database
    const existingPlan = await plansCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingPlan) {
      throw createError(404, "Plan not found");
    }

    const brand_id = user?.brand?._id;

    if (!brand_id || !ObjectId.isValid(brand_id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid or missing brand ID",
      });
    }

    // Fetch the current brand details
    const currentBrand = await brandsCollection.findOne({
      _id: new ObjectId(brand_id),
    });

    if (!currentBrand) {
      return res.status(404).send({
        success: false,
        message: "Brand not found",
      });
    }

    // Check if the transaction ID has already been used
    const existingTransaction = await paymentRecordCollection.findOne({
      transaction_id: transactionId,
    });

    if (existingTransaction) {
      return res.status(400).send({
        success: false,
        message: "This transaction ID has already been used.",
      });
    }

    // Create a new payment record
    const newRecord = {
      brand_id: brand_id,
      transaction_id: transactionId,
      account: selectedAccount,
      method: method,
      amount: existingPlan?.price,
      status: "pending",
      declined_reason: "",
      createdAt: new Date(),
    };

    const result = await paymentRecordCollection.insertOne(newRecord);
    if (!result) {
      throw createError(500, "Something went wrong, Please try again.");
    }

    // Check if the selected plan is already set
    if (
      currentBrand.selected_plan?.id?.toString() === existingPlan._id.toString()
    ) {
      return res.status(200).send({
        success: true,
        message: "Please Wait for the authority confirmation",
      });
    }

    // Update the brand with the selected plan details
    const updateResult = await brandsCollection.updateOne(
      { _id: new ObjectId(brand_id) },
      {
        $set: {
          "selected_plan.id": existingPlan._id,
          "selected_plan.name": existingPlan.plan_name,
        },
      }
    );

    // Verify if the update was successful
    if (updateResult.modifiedCount === 0) {
      return res.status(500).send({
        success: false,
        message: "Failed to update the brand with the selected plan.",
      });
    }

    const brandInfo = await brandsCollection.findOne({
      _id: new ObjectId(brand_id),
    });

    // Send success response
    res.status(200).send({
      success: true,
      message: "Plan selected successfully",
      data: brandInfo,
    });
  } catch (error) {
    next(error);
  }
};
