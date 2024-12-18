import {
  customersCollection,
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
    if (!mobile) {
      throw createError(400, "Mobile is required.");
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

      // Check for duplicate mobile in tempCustomersCollection
      const existingTempCustomer = await tempCustomersCollection.findOne({
        mobile,
      });

      if (existingTempCustomer) {
        throw createError(
          400,
          "Mobile number already exists in temporary customers"
        );
      }
    }

    const generateCode = crypto.randomBytes(8).toString("hex");

    const tempCustomer = {
      temp_customer_id: generateCode,
      name: processedName,
      served_by: existingEmployee?.name,
      mobile: mobile,
      paid: false,
      createdAt: new Date(),
    };

    // Insert into temp customers collection
    const tempResult = await tempCustomersCollection.insertOne(tempCustomer);

    if (!tempResult?.insertedId) {
      throw createError(500, "Failed to create temporary customer");
    }

    // Check if customer already exists in customersCollection
    const existingCustomer = await customersCollection.findOne({
      mobile: tempCustomer?.mobile,
    });

    if (!existingCustomer) {
      // Customer does not exist, insert into customersCollection
      const newCustomer = {
        customer_id: generateCode,
        name: processedName,
        mobile: mobile,
        createdAt: new Date(),
      };

      const customerResult = await customersCollection.insertOne(newCustomer);

      if (!customerResult?.insertedId) {
        throw createError(
          500,
          "Failed to add customer to customers collection"
        );
      }

      res.status(200).send({
        success: true,
        message:
          "Temporary customer created and added to customers collection successfully",
      });
    } else {
      // Customer already exists, no insertion needed
      res.status(200).send({
        success: true,
        message:
          "Temporary customer created, but customer already exists in the database",
      });
    }
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
      data: result,
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
      throw createError(404, "Temporary customer not found");
    }

    // Check if there are associated logs
    const existingLogs = await tempOrderLogsCollection.findOne({
      temp_customer_id: tempId,
    });

    if (existingLogs) {
      // Begin deletion process for logs
      const deleteLogsResponse = await tempOrderLogsCollection.deleteMany({
        temp_customer_id: tempId,
      });

      if (deleteLogsResponse.deletedCount === 0) {
        throw createError(500, "Failed to delete associated logs");
      }
    }

    // Proceed to delete the temporary customer
    const deleteCustomerResponse = await tempCustomersCollection.deleteOne({
      temp_customer_id: tempId,
    });

    if (deleteCustomerResponse.deletedCount === 0) {
      throw createError(500, "Failed to delete temporary customer");
    }

    res.status(200).send({
      success: true,
      message:
        "Temporary customer and associated logs (if any) deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleMarkedAsPaid = async (req, res, next) => {
  const { tempId } = req.params;
  try {
    // Find the temporary customer by ID
    const existingTempCustomer = await tempCustomersCollection.findOne({
      temp_customer_id: tempId,
    });

    if (!existingTempCustomer) {
      throw createError(400, "Temp customer not found");
    }

    // Toggle the 'paid' status
    const updatedPaidStatus = !existingTempCustomer.paid;

    // Update the record in the database
    await tempCustomersCollection.updateOne(
      { temp_customer_id: tempId },
      { $set: { paid: updatedPaidStatus } }
    );

    res.status(200).send({
      success: true,
      message: `Successfully marked as ${
        updatedPaidStatus ? "paid" : "unpaid"
      }`,
    });
  } catch (error) {
    next(error);
  }
};
