import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import createError from "http-errors";
import { rateLimit } from "express-rate-limit";
import { apiRouter } from "./routers/routers.js";

const app = express();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res
      .status(429)
      .json({ success: false, message: "Too many requests, try again later." });
  },
});

// Middleware setup
app.use(
  cors({
    origin: [
      "https://elegance-makeover-salon.vercel.app",
      "https://elegancemakeoversalon.web.app",
      "http://localhost:5173",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api/v1", apiRouter);

app.get("/", async (req, res) => {
  res.status(200).send({
    success: true,
    message: "Server is running",
  });
});

// Client error handling
app.use((req, res, next) => {
  next(createError(404, "Route not found!"));
});

// Server error handling
app.use((err, req, res, next) => {
  return res.status(err.status || 500).json({
    success: false,
    message: err.message,
  });
});

export default app;
