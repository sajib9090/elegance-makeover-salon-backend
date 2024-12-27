import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import createError from "http-errors";
import { apiRouter } from "./routers/routers.js";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted.cdn.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://trusted.cdn.com"],
        imgSrc: ["'self'", "data:", "https://trusted.cdn.com"],
        connectSrc: ["'self'", "https://api.trustedsource.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
    frameguard: { action: "deny" },
  })
);
// Middleware setup
app.use(
  cors({
    origin: ["https://elegancemakeoversalon.web.app", "http://localhost:5173"],
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
