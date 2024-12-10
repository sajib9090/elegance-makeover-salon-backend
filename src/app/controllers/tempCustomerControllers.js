import {
  employeesCollection,
  tempCustomersCollection,
  tempOrderLogsCollection,
} from "../collections/collections.js";
import createError from "http-errors";
import { validateString } from "../utils/validateString.js";
import validator from "validator";
import crypto from "crypto";

export const handleCreateTempCustomer = async (req, res, next) => {
  const { name, mobile, served_by } = req.body;

  try {
    if (!name) {
      throw createError(400, "Name is required.");
    }
    if (!served_by) {
      throw createError(400, "Served by is required.");
    }

    const processedName = validateString(name, "Name", 1, 50);
    const processedServedBy = validateString(served_by, "Served by", 1, 50);

    const existingEmployee = await employeesCollection.findOne({
      name: processedServedBy,
    });

    if (!existingEmployee) {
      throw createError(400, "Employee not found");
    }

    // Only validate mobile if it is provided
    if (mobile) {
      if (mobile.length !== 11) {
        throw createError(400, "Mobile number must be 11 characters");
      }

      if (!validator.isMobilePhone(mobile, "any")) {
        throw createError(400, "Invalid mobile number");
      }
    }

    const generateCode = crypto.randomBytes(8).toString("hex");

    const newEmployee = {
      temp_customer_id: generateCode,
      name: processedName,
      served_by: existingEmployee?.name,
      mobile: mobile || null,
      createdAt: new Date(),
    };

    const result = await tempCustomersCollection.insertOne(newEmployee);

    if (!result?.insertedId) {
      throw createError(500, "Something went wrong. Try again");
    }

    res.status(200).send({
      success: true,
      message: "Temporary customer created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetTemporaryCustomers = async (req, res, next) => {
  const search = req.query.search || "";

  try {
    const regExSearch = new RegExp(search, "i");
    const query = search ? { name: regExSearch } : {};

    const tempCustomers = await tempCustomersCollection
      .find(query)
      .sort({ createdAt: 1 })
      .toArray();

    // Send response
    res.status(200).send({
      success: true,
      message: "Data retrieved successfully",
      data: tempCustomers,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetTemporaryCustomerById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await tempCustomersCollection.findOne({
      temp_customer_id: id,
    });

    if (!result) {
      throw createError(404, "Temporary customer not found");
    }
    res.status(200).send({
      success: true,
      message: "Data retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
export const handleDeleteTemporaryCustomerById = async (req, res, next) => {
  const { tempId } = req.params;

  try {
    // Check if the temporary customer exists
    const existingTempCustomer = await tempCustomersCollection.findOne({
      temp_customer_id: tempId,
    });

    if (!existingTempCustomer) {
      throw createError(404, "Invalid request");
    }

    // Begin deletion process
    const deleteLogsResponse = await tempOrderLogsCollection.deleteMany({
      temp_customer_id: existingTempCustomer.temp_customer_id,
    });

    const deleteCustomerResponse = await tempCustomersCollection.deleteOne({
      temp_customer_id: existingTempCustomer.temp_customer_id,
    });

    // Check if both deletions were successful
    if (
      deleteLogsResponse.deletedCount === 0 ||
      deleteCustomerResponse.deletedCount === 0
    ) {
      throw createError(500, "Failed to delete temporary customer or logs");
    }

    res.status(200).send({
      success: true,
      message: "Temporary customer and associated logs deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
