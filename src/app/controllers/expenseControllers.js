import createError from "http-errors";
import crypto from "crypto";
import { expensesCollection } from "../collections/collections.js";

export const handleAddExpense = async (req, res, next) => {
  let { title, total_bill } = req.body;

  try {
    // Input validations
    title = title?.trim();
    if (!title) throw createError(400, "Title is required");
    if (!total_bill) throw createError(400, "Total bill is required");

    const numericTotalBill = Number(total_bill);
    if (isNaN(numericTotalBill))
      throw createError(400, "Total bill must be a valid number");

    // Generate unique invoice ID
    const generateCode = crypto.randomBytes(16).toString("hex");
    const newExpense = {
      expense_id: generateCode,
      title: title,
      total_bill: numericTotalBill,
      createdAt: new Date(),
    };

    // Insert the sold invoice
    const response = await expensesCollection.insertOne(newExpense);
    if (!response?.insertedId)
      throw createError(500, "Expense creation failed");

    // Send success response
    res.status(200).send({
      success: true,
      message: "Expense created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetExpensesByDate = async (req, res, next) => {
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
    const result = await expensesCollection.find(query).toArray();

    // Respond with data
    res.status(200).send({
      success: true,
      message: "Expenses retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRemoveExpense = async (req, res, next) => {
  const { expenseId } = req.params;

  try {
    const existingExpense = await expensesCollection.findOne({
      expense_id: expenseId,
    });

    if (!existingExpense) {
      throw createError(404, "Expense not found");
    }

    const result = await expensesCollection.deleteOne({
      expense_id: expenseId,
    });

    if (result?.deletedCount === 0) {
      throw createError(500, "Something went wrong try again");
    }

    res.status(200).send({
      success: true,
      message: "Expense removed successfully",
    });
  } catch (error) {
    next(error);
  }
};
