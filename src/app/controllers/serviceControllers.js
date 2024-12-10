import { validateString } from "../utils/validateString.js";
import createError from "http-errors";
import { servicesCollection } from "../collections/collections.js";
import crypto from "crypto";

export const handleCreateService = async (req, res, next) => {
  const { service_name, price, category } = req.body;

  try {
    if (!service_name) {
      throw createError(400, "Service name is required.");
    }

    if (price === undefined) {
      throw createError(400, "Price is required.");
    }

    const parsedPrice = typeof price === "string" ? parseFloat(price) : price;

    if (isNaN(parsedPrice)) {
      throw createError(400, "Price must be a valid number.");
    }

    const processedService = validateString(
      service_name,
      "Service Name",
      1,
      500
    );

    const existingService = await servicesCollection.findOne({
      $and: [
        {
          service_name: processedService,
        },
        {
          category: category,
        },
      ],
    });

    if (existingService) {
      throw createError(400, "Service already exist");
    }

    const generateCode = crypto.randomBytes(16).toString("hex");

    const newService = {
      service_id: generateCode,
      service_name: processedService,
      price: parsedPrice,
      category: category,
      createdAt: new Date(),
    };

    const result = await servicesCollection.insertOne(newService);

    if (!result?.insertedId) {
      throw createError(500, "Something went wrong. Try again");
    }

    res.status(200).send({
      success: true,
      message: "Service created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetServices = async (req, res, next) => {
  const search = req.query.search || "";
  const page = Number(req.query.page) || 1;
  const limit = req.query.limit ? Number(req.query.limit) : null;
  const sortPrice = req.query.sortPrice || "";
  const category = req.query.category || "";

  try {
    const regExSearch = new RegExp(".*" + search + ".*", "i");

    // Initialize the query object
    let query = {};

    if (search) {
      query.$or = [{ service_name: regExSearch }];
    }

    if (category) {
      query.category = new RegExp(`^${category}$`, "i");
    }

    // Determine sorting criteria
    let sortCriteria = { service_name: 1 }; // Default sorting by service_name (ascending)
    if (sortPrice === "high") {
      sortCriteria = { price: -1 };
    } else if (sortPrice === "low") {
      sortCriteria = { price: 1 };
    }

    // Fetch services
    const findQuery = servicesCollection.find(query).sort(sortCriteria);

    if (limit) {
      findQuery.limit(limit).skip((page - 1) * limit);
    }

    const services = await findQuery.toArray();

    // Count total documents matching the query
    const count = await servicesCollection.countDocuments(query);

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
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

export const handleDeleteService = async (req, res, next) => {
  const { serviceId } = req.params;
  try {
    const result = await servicesCollection.deleteOne({
      service_id: serviceId,
    });

    if (result?.deletedCount === 0) {
      throw createError(404, "Service not found");
    }
    res.status(200).send({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
