import createError from "http-errors";
import {
  expensesCollection,
  stockCollection,
} from "../collections/collections.js";
import { ObjectId } from "mongodb";
import crypto from "crypto";

export const handleAddProduct = async (req, res, next) => {
  const { title, price } = req.body;

  try {
    // ✅ Validation for title
    if (!title) throw createError(400, "Title is required");

    // ✅ Convert price to number and validate
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      throw createError(400, "Price must be a positive number");
    }

    // ✅ Check if the product already exists
    const existingItem = await stockCollection.findOne({
      title,
      price: numericPrice,
    });
    if (existingItem) throw createError(400, "Item already exists");

    // ✅ Create new product item
    const newItem = {
      title: title,
      price: numericPrice,
      createdAt: new Date(),
      total_increase: 0,
      total_decrease: 0,
      stock: 0,
    };

    const result = await stockCollection.insertOne(newItem);
    if (!result?.insertedId) throw createError(500, "Something went wrong");

    res.status(200).send({
      success: true,
      message: "New stock added successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetItems = async (req, res, next) => {
  const search = req.query.search || "";
  const page = Number(req.query.page) || 1;
  const limit = req.query.limit ? Number(req.query.limit) : null;

  try {
    const regExSearch = new RegExp(".*" + search + ".*", "i");

    // Initialize the query object
    let query = {};

    if (search) {
      query.$or = [{ title: regExSearch }];
    }
    let sortCriteria = { title: 1 };
    const findQuery = stockCollection.find(query).sort(sortCriteria);

    if (limit) {
      findQuery.limit(limit).skip((page - 1) * limit);
    }

    const items = await findQuery.toArray();
    const count = await stockCollection.countDocuments(query);
    res.status(200).send({
      success: true,
      message: "Data retrieved successfully",
      data_found: count,
      pagination: limit
        ? {
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            previousPage: page - 1 > 0 ? page - 1 : null,
            nextPage: page + 1 <= Math.ceil(count / limit) ? page + 1 : null,
          }
        : null,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

export const handleIncreaseStock = async (req, res, next) => {
  const { id } = req.params;
  let { quantity } = req.body; // Added title to avoid undefined error

  try {
    // ✅ Convert quantity to a number (whether it's string or number)
    quantity = Number(quantity);

    // ✅ Check if quantity is a valid positive number
    if (isNaN(quantity) || quantity <= 0) {
      throw createError(400, "Quantity must be a positive number");
    }

    const existingItem = await stockCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingItem) {
      throw createError(404, "Item not found");
    }

    // ✅ Update the stock
    const result = await stockCollection.updateOne(
      { _id: existingItem._id },
      { $inc: { stock: quantity, total_increase: quantity } }
    );

    if (!result) throw createError(500, "Stock update failed");
    const generateCode = crypto.randomBytes(16).toString("hex");

    const newExpense = {
      expense_id: generateCode,
      title: existingItem?.title || "Stock Update",
      total_bill: existingItem?.price * quantity,
      createdAt: new Date(),
    };

    const expense = await expensesCollection.insertOne(newExpense);
    if (!expense.insertedId) {
      throw createError(500, "Failed to create expense");
    }

    res.status(200).send({
      success: true,
      message: "Stock increased successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleDecreaseStock = async (req, res, next) => {
  const { id } = req.params;
  let { quantity } = req.body;

  try {
    quantity = Number(quantity);

    if (isNaN(quantity) || quantity <= 0) {
      throw createError(400, "Quantity must be a positive number");
    }

    const existingItem = await stockCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!existingItem) {
      throw createError(404, "Item not found");
    }

    if (existingItem.stock < quantity) {
      throw createError(400, "Insufficient stock to decrease");
    }

    // Update the stock and check if it was successful
    const result = await stockCollection.updateOne(
      { _id: existingItem._id },
      { $inc: { stock: -quantity, total_decrease: quantity } }
    );

    // Check if the update actually modified the document
    if (result.modifiedCount === 0) {
      throw createError(500, "Stock update failed");
    }

    res.status(200).send({
      success: true,
      message: "Stock decreased successfully",
    });
  } catch (error) {
    next(error);
  }
};
