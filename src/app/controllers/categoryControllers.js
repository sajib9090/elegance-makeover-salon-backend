import createError from "http-errors";
import { categoriesCollection } from "../collections/collections.js";
import { validateString } from "../utils/validateString.js";
import crypto from "crypto";

export const handleCreateCategory = async (req, res, next) => {
  const { category } = req.body;
  const user = req.user.user ? req.user.user : req.user;
  try {
    if (!category) {
      throw createError(400, "Category is required.");
    }
    const processedCategoryName = validateString(
      category,
      "category Name",
      1,
      300
    );

    const existingCategoryName = await categoriesCollection.findOne({
      category: processedCategoryName,
    });

    if (existingCategoryName) {
      throw createError(400, "Category name already exist");
    }
    const generateCode = crypto.randomBytes(8).toString("hex");
    const newCategory = {
      category_id: generateCode,
      category: processedCategoryName,
      createdBy: user?.user_id,
      createdAt: new Date(),
    };

    const result = await categoriesCollection.insertOne(newCategory);

    if (!result?.insertedId) {
      throw createError(500, "Something went wrong. Try again");
    }

    res.status(200).send({
      success: true,
      message: "Created Successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetCategories = async (req, res, next) => {
  try {
    const categories = await categoriesCollection
      .find()
      .sort({ category: 1 })
      .toArray();

    res.status(200).send({
      success: true,
      message: "Data retrieved successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const handleDeleteCategory = async (req, res, next) => {
  const { categoryId } = req.params;
  try {
    const result = await categoriesCollection.deleteOne({
      category_id: categoryId,
    });

    if (result?.deletedCount === 0) {
      throw createError(404, "Group not found");
    }
    res.status(200).send({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
