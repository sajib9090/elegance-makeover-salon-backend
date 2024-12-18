import createError from "http-errors";
import validator from "validator";
import crypto from "crypto";
import {
  soldInvoicesCollection,
  tempCustomersCollection,
  tempOrderLogsCollection,
} from "../collections/collections.js";
import { ObjectId } from "mongodb";

export const handleCreateSoldInvoice = async (req, res, next) => {
  const {
    customer_name,
    customer_mobile,
    served_by,
    total_bill,
    total_discount,
    items,
  } = req.body;

  try {
    // Input validations
    if (!customer_name) throw createError(400, "Customer name is required");
    if (!served_by) throw createError(400, "Served by is required");
    if (!total_bill) throw createError(400, "Total bill is required");
    if (!Array.isArray(items) || items.length === 0)
      throw createError(400, "Items must be a non-empty array");
    if (customer_mobile && !validator.isMobilePhone(customer_mobile, "any"))
      throw createError(400, "Invalid mobile number format");

    // Ensure total_bill and total_discount are numbers
    const numericTotalBill = Number(total_bill);
    if (isNaN(numericTotalBill))
      throw createError(400, "Total bill must be a valid number");

    const numericTotalDiscount = total_discount ? Number(total_discount) : 0; // Default to 0 if not provided
    if (isNaN(numericTotalDiscount))
      throw createError(400, "Total discount must be a valid number");

    // Generate unique invoice ID
    const generateCode = crypto.randomBytes(16).toString("hex");
    const newInvoice = {
      invoice_id: generateCode,
      customer_name,
      customer_mobile,
      items,
      served_by,
      total_bill: numericTotalBill,
      total_discount: numericTotalDiscount,
      createdAt: new Date(),
    };

    // Insert the sold invoice
    const response = await soldInvoicesCollection.insertOne(newInvoice);
    if (!response?.insertedId)
      throw createError(500, "Invoice creation failed");

    // Delete temp order logs
    const removeTempOrder = await tempOrderLogsCollection.deleteMany({
      temp_customer_id: items[0]?.temp_customer_id,
    });
    if (removeTempOrder.deletedCount === 0)
      throw createError(500, "Failed to delete temporary order logs");

    // Delete temp customer
    const removeTempCustomer = await tempCustomersCollection.deleteOne({
      temp_customer_id: items[0]?.temp_customer_id,
    });
    if (removeTempCustomer.deletedCount === 0)
      throw createError(500, "Failed to delete temporary customer");

    // Send success response
    res.status(200).send({
      success: true,
      message: "Invoice created successfully and related data deleted",
      data: response?.insertedId,
    });
  } catch (error) {
    next(error);
  }
};
export const handleGetInvoiceById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await soldInvoicesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      throw createError(404, "Invoice not found");
    }
    res.status(200).send({
      success: true,
      message: "Invoice retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetInvoicesByDate = async (req, res, next) => {
  const { date, month, startDate, endDate } = req.query;

  try {
    let query = {};

    if (date) {
      // Parse the date and construct start and end of the day
      const parsedDate = new Date(date);
      if (isNaN(parsedDate)) {
        throw new Error("Invalid date format. Use YYYY-MM-DD.");
      }
      const startOfDay = new Date(parsedDate.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(parsedDate.setUTCHours(23, 59, 59, 999));

      // Set query for the day
      query.createdAt = { $gte: startOfDay, $lt: endOfDay };
    }

    if (month) {
      const parsedMonth = new Date(month);
      if (isNaN(parsedMonth)) {
        throw new Error("Invalid month format. Use YYYY-MM.");
      }
      const year = parsedMonth.getUTCFullYear();
      const monthIndex = parsedMonth.getUTCMonth();
      const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(
        Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)
      );

      query.createdAt = { $gte: startOfMonth, $lt: endOfMonth };
    }

    // Query for a date range
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date("1970-01-01");
      const end = endDate ? new Date(endDate) : new Date();
      if (isNaN(start) || isNaN(end)) {
        throw new Error("Invalid date range. Use YYYY-MM-DD.");
      }
      if (start > end) {
        throw new Error("Start date cannot be after end date.");
      }
      const startRange = new Date(start.setUTCHours(0, 0, 0, 0));
      const endRange = new Date(end.setUTCHours(23, 59, 59, 999));

      query.createdAt = { $gte: startRange, $lte: endRange };
    }
    // Fetch invoices from the database
    const result = await soldInvoicesCollection.find(query).toArray();

    // Respond with data
    res.status(200).send({
      success: true,
      message: "Invoices retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
