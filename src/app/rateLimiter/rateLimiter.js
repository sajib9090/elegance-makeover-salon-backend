import { rateLimit } from "express-rate-limit";

// Define the rate limiter
export const userLoggedInLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Maximum 5 requests per minute
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});
export const userForgotPasswordLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Maximum 5 requests per minute
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});

export const userCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});

export const categoryCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});
export const serviceCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});
export const employeeCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});
export const temCustomerCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});
export const temOrderLogCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});
export const soldInvoiceCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});
export const expenseCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, try again 1 minute later.",
    });
  },
});
