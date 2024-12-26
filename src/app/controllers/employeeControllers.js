import {
  advanceSalariesCollection,
  employeesCollection,
  expensesCollection,
} from "../collections/collections.js";
import createError from "http-errors";
import { validateString } from "../utils/validateString.js";
import validator from "validator";
import crypto from "crypto";
import { client } from "../config/db.js";

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
    const regExSearch = search ? new RegExp(`.*${search}.*`, "i") : null;
    const skip = (page - 1) * (limit || 0);

    // Construct the aggregation pipeline
    const pipeline = [
      ...(regExSearch ? [{ $match: { name: { $regex: regExSearch } } }] : []),
      { $sort: { name: 1 } },
      {
        $lookup: {
          from: "advanceSalaries",
          localField: "employee_id",
          foreignField: "employee_id",
          as: "advanceSalaries",
        },
      },
      ...(limit ? [{ $skip: skip }, { $limit: limit }] : []), // Pagination
    ];

    // Execute the aggregation pipeline
    const employees = await employeesCollection.aggregate(pipeline).toArray();

    // Count total matching documents
    const countPipeline = [
      ...(regExSearch ? [{ $match: { name: { $regex: regExSearch } } }] : []),
      { $count: "totalCount" },
    ];
    const countResult = await employeesCollection
      .aggregate(countPipeline)
      .toArray();

    const totalCount = countResult[0]?.totalCount || 0;

    // Send response
    res.status(200).send({
      success: true,
      message: "Data retrieved successfully",
      data_found: totalCount,
      pagination: limit
        ? {
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            previousPage: page - 1 > 0 ? page - 1 : null,
            nextPage:
              page + 1 <= Math.ceil(totalCount / limit) ? page + 1 : null,
          }
        : null,
      data: employees,
    });
  } catch (error) {
    console.error("Error in handleGetEmployees:", error);
    next(error);
  }
};

export const handleGetEmployee = async (req, res, next) => {
  const { employeeId } = req.params;

  try {
    const result = await employeesCollection.findOne({
      employee_id: employeeId,
    });
    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Employee not found",
      });
    }

    const advanceSalaries = await advanceSalariesCollection
      .find({ employee_id: result?.employee_id })
      .sort({ createdAt: 1 })
      .toArray();

    const extendedResult = {
      ...result,
      advanceSalaries,
    };
    res.status(200).send({
      success: true,
      message: "Employee retrieved successfully",
      data: extendedResult,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRemoveEmployee = async (req, res, next) => {
  const { employeeId } = req.params;

  try {
    // Check if advance salaries exist for the employee
    const advanceSalaries = await advanceSalariesCollection.findOne({
      employee_id: employeeId,
    });

    if (advanceSalaries) {
      // Advance salaries found, attempt to remove them
      const advanceSalaryRemove = await advanceSalariesCollection.deleteMany({
        employee_id: employeeId,
      });

      if (advanceSalaryRemove.deletedCount === 0) {
        return res.status(400).send({
          success: false,
          message:
            "Advance salaries found, but failed to remove them. Employee removal aborted.",
        });
      }

      // Proceed to remove the employee if advance salaries are successfully removed
    }

    // Remove the employee (advance salaries not found or successfully removed)
    const result = await employeesCollection.deleteOne({
      employee_id: employeeId,
    });

    if (result?.deletedCount === 0) {
      throw createError(404, "Employee not found");
    }

    res.status(200).send({
      success: true,
      message: advanceSalaries
        ? "Successfully removed employee and associated advance salaries."
        : "Successfully removed employee (no advance salaries found).",
    });
  } catch (error) {
    console.error("Error in handleRemoveEmployee:", error);
    next(error);
  }
};

export const handleHandleAddAdvanceSalary = async (req, res, next) => {
  const { employeeId } = req.params;
  const { payable_amount } = req.body;
  const user = req.user.user ? req.user.user : req.user;

  try {
    let amount = payable_amount;

    // If it's a string, attempt to convert to a number
    if (typeof amount === "string") {
      amount = parseFloat(amount);
    }

    // Check if amount is a valid number
    if (isNaN(amount)) {
      throw createError(400, "Payable amount must be a valid number.");
    }

    // Check if amount is greater than 0
    if (amount <= 0) {
      throw createError(400, "Payable amount must be greater than 0.");
    }
    const existingEmployee = await employeesCollection.findOne({
      employee_id: employeeId,
    });
    if (!existingEmployee) {
      throw createError(400, "Employee not found");
    }

    const addNewValue = {
      employee_id: employeeId,
      advance_salary: amount,
      createdBy: user?.user_id,
      createdAt: new Date(),
    };

    const result = await advanceSalariesCollection.insertOne(addNewValue);
    if (!result?.insertedId) {
      throw createError(500, "Something went wrong.");
    }

    const generateCode = crypto.randomBytes(16).toString("hex");
    const newExpense = {
      expense_id: generateCode,
      employee_id: employeeId,
      title:
        existingEmployee?.name +
        " " +
        existingEmployee?.mobile +
        " " +
        "(Advance)",
      total_bill: amount,
      createdAt: new Date(),
    };

    const response = await expensesCollection.insertOne(newExpense);
    if (!response?.insertedId)
      throw createError(500, "Expense creation failed");

    res.status(200).send({
      success: true,
      message: "Added successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleRemoveEmployeeAdvance = async (req, res, next) => {
  const { employeeId } = req.params;

  try {
    // Check if advance salary exists
    const existingAdvanceSalary = await advanceSalariesCollection.findOne({
      employee_id: employeeId,
    });
    if (!existingAdvanceSalary) {
      throw new Error("No advance salary found for the employee");
    }

    // Check if expense exists
    const existingExpense = await expensesCollection.findOne({
      employee_id: employeeId,
    });
    if (!existingExpense) {
      throw new Error("No expense found for the employee");
    }

    // Remove advance salary
    const advanceSalaryResult = await advanceSalariesCollection.deleteOne({
      employee_id: employeeId,
    });

    // Remove expense
    const expenseResult = await expensesCollection.deleteOne({
      employee_id: employeeId,
    });

    // Check if both deletions succeeded
    if (!advanceSalaryResult.deletedCount || !expenseResult.deletedCount) {
      throw new Error(
        "Failed to delete advance salary or expense. Data may be inconsistent."
      );
    }

    res.status(200).send({
      success: true,
      message: "Employee advance and expenses removed successfully",
    });
  } catch (error) {
    next(error);
  }
};
