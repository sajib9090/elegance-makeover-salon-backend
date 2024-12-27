import { customersCollection } from "../collections/collections.js";

export const handleGetCustomers = async (req, res, next) => {
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
          from: "sold-Invoices",
          localField: "mobile",
          foreignField: "customer_mobile",
          as: "purchased",
        },
      },
      ...(limit ? [{ $skip: skip }, { $limit: limit }] : []),
    ];

    // Execute the aggregation pipeline
    const customers = await customersCollection.aggregate(pipeline).toArray();

    // Count total matching documents
    const countPipeline = [
      ...(regExSearch ? [{ $match: { name: { $regex: regExSearch } } }] : []),
      { $count: "totalCount" },
    ];
    const countResult = await customersCollection
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
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetCustomer = async (req, res, next) => {
  const { customerId } = req.params;

  try {
    const result = await customersCollection
      .aggregate([
        {
          $match: { customer_id: customerId },
        },
        {
          $lookup: {
            from: "sold-Invoices",
            localField: "mobile",
            foreignField: "customer_mobile",
            as: "purchased",
          },
        },
        {
          $unwind: {
            path: "$purchased",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: { "purchased.createdAt": -1 },
        },
        {
          $group: {
            _id: "$_id",
            customer_id: { $first: "$customer_id" },
            name: { $first: "$name" },
            mobile: { $first: "$mobile" },
            createdAt: { $first: "$createdAt" },
            purchased: { $push: "$purchased" },
          },
        },
        {
          $project: {
            customer_id: 1,
            name: 1,
            mobile: 1,
            createdAt: 1,
            purchased: 1,
          },
        },
      ])
      .toArray();

    if (!result || result.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Customer retrieved successfully",
      data: result[0],
    });
  } catch (error) {
    next(error);
  }
};
