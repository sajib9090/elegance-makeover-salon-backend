import { employeesCollection } from "../collections/collections.js";
import createError from "http-errors";
import { validateString } from "../utils/validateString.js";
import validator from "validator";
import crypto from "crypto";

export const handleCreateEmployee = async (req, res, next) => {
  const { name, designation, monthly_salary, mobile } = req.body;

  try {
    if (!name) {
      throw createError(400, "Name is required.");
    }
    if (!designation) {
      throw createError(400, "Designation is required field");
    }
    if (monthly_salary === undefined) {
      throw createError(400, "Monthly salary is required.");
    }
    if (!mobile) {
      throw createError(400, "Mobile is required field");
    }

    const parsedSalary =
      typeof monthly_salary === "string"
        ? parseFloat(monthly_salary)
        : monthly_salary;

    if (isNaN(parsedSalary)) {
      throw createError(400, "Salary must be a valid number.");
    }

    const processedName = validateString(name, "Name", 1, 50);
    const processedDesignation = validateString(
      designation,
      "Designation",
      1,
      50
    );

    if (mobile?.length !== 11) {
      throw createError(400, "Mobile number must be 11 characters");
    }

    if (!validator.isMobilePhone(mobile, "any")) {
      throw createError(400, "Invalid mobile number");
    }

    const generateCode = crypto.randomBytes(12).toString("hex");

    const newEmployee = {
      employee_id: generateCode,
      name: processedName,
      designation: processedDesignation,
      mobile: mobile,
      monthly_salary: parsedSalary,
      createdAt: new Date(),
    };

    const result = await employeesCollection.insertOne(newEmployee);

    if (!result?.insertedId) {
      throw createError(500, "Something went wrong. Try again");
    }

    res.status(200).send({
      success: true,
      message: "Employee created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetEmployees = async (req, res, next) => {
  const search = req.query.search || "";
  const page = Number(req.query.page) || 1;
  const limit = req.query.limit ? Number(req.query.limit) : null;

  try {
    const regExSearch = new RegExp(".*" + search + ".*", "i");

    // Initialize the query object
    let query = {};

    if (search) {
      query.$or = [{ name: regExSearch }];
    }

    // Determine sorting criteria
    let sortCriteria = { name: 1 };

    // Fetch services
    const findQuery = employeesCollection.find(query).sort(sortCriteria);

    if (limit) {
      findQuery.limit(limit).skip((page - 1) * limit);
    }

    const employees = await findQuery.toArray();

    // Count total documents matching the query
    const count = await employeesCollection.countDocuments(query);

    // Send response
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
      data: employees,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRemoveEmployee = async (req, res, next) => {
  const { employeeId } = req.params;
  try {
    const result = await employeesCollection.deleteOne({
      employee_id: employeeId,
    });

    if (result?.deletedCount === 0) {
      throw createError(404, "Service not found");
    }
    res.status(200).send({
      success: true,
      message: "Successfully removed",
    });
  } catch (error) {
    next(error);
  }
};
