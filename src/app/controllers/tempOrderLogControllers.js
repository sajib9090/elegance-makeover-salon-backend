import {
  servicesCollection,
  tempCustomersCollection,
  tempOrderLogsCollection,
} from "../collections/collections.js";
import createError from "http-errors";
import crypto from "crypto";

export const handleCreateTempOrderLog = async (req, res, next) => {
  const { temp_customer_id, service_id } = req.body;

  try {
    if (!temp_customer_id) {
      throw createError(400, "Temp customer id is required.");
    }
    if (!service_id) {
      throw createError(400, "Service id is required.");
    }
    const existingTempCustomer = await tempCustomersCollection.findOne({
      temp_customer_id,
    });

    if (!existingTempCustomer) {
      throw createError(404, "Temp customer not found.");
    }

    const existingService = await servicesCollection.findOne({
      service_id: service_id,
    });

    if (!existingService) {
      throw createError(404, "Service not found");
    }

    const existingOrderLog = await tempOrderLogsCollection.findOne({
      $and: [
        { temp_customer_id: temp_customer_id },
        { service_id: service_id },
      ],
    });

    if (existingOrderLog) {
      throw createError(400, "Order already exists");
    }

    const generateCode = crypto.randomBytes(16).toString("hex");

    const newOrderLog = {
      temp_order_log_id: generateCode,
      temp_customer_id: existingTempCustomer?.temp_customer_id,
      service_id: existingService?.service_id,
      service_name: existingService?.service_name,
      price: existingService?.price,
      category: existingService?.category,
      served_by: existingTempCustomer?.served_by,
      quantity: 1,
      createdAt: new Date(),
    };

    const result = await tempOrderLogsCollection.insertOne(newOrderLog);

    if (!result?.insertedId) {
      throw createError(500, "Something went wrong. Try again");
    }

    res.status(200).send({
      success: true,
      message: "Temporary order log created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetOrderLogById = async (req, res, next) => {
  const { tempCustomerId } = req.params;
  try {
    const result = await tempOrderLogsCollection
      .find({ temp_customer_id: tempCustomerId })
      .sort({ service_name: 1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Data retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleChangeOrderLogQuantity = async (req, res, next) => {
  const { tempOrderLogId } = req.params;
  const { increase, decrease } = req.body;

  try {
    // Find the existing temp order log by ID
    const existingTempOrderLog = await tempOrderLogsCollection.findOne({
      temp_order_log_id: tempOrderLogId,
    });

    if (!existingTempOrderLog) {
      throw createError(404, "Invalid request");
    }

    let newQuantity = existingTempOrderLog.quantity;

    // Adjust the quantity based on the request
    if (increase) {
      newQuantity += 1;
    } else if (decrease) {
      if (newQuantity > 1) {
        newQuantity -= 1;
      } else {
        throw createError(400, "Quantity cannot be less than 1");
      }
    }

    // Update the document in the database
    const updateResult = await tempOrderLogsCollection.updateOne(
      { temp_order_log_id: tempOrderLogId },
      { $set: { quantity: newQuantity } }
    );

    if (updateResult.modifiedCount === 0) {
      throw createError(500, "Failed to update quantity");
    }

    // Send success response
    res.status(200).send({
      success: true,
      message: "Quantity updated successfully",
      data: { tempOrderLogId, newQuantity },
    });
  } catch (error) {
    next(error);
  }
};

export const handleDeleteSingleOrderLog = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!id || typeof id !== "string" || id.trim() === "") {
      throw createError(400, "Invalid or missing ID parameter.");
    }
    const existingItem = await tempOrderLogsCollection.findOne({
      temp_order_log_id: id,
    });

    if (!existingItem) {
      throw createError(404, "Item not found.");
    }

    // Perform the delete operation
    const result = await tempOrderLogsCollection.deleteOne({
      temp_order_log_id: id,
    });

    if (result.deletedCount === 0) {
      throw createError(500, "Failed to delete the item. Please try again.");
    }

    res.status(200).send({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
