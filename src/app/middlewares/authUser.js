import { jwtAccessToken } from "../../../important.js";
import createError from "http-errors";
import jwt from "jsonwebtoken";

export const isSuperAdmin = async (req, res, next) => {
  try {
    const incomingToken =
      req.headers.authorization || req.headers.Authorization;

    if (!incomingToken) {
      throw createError(401, "Key not found. Please Login First");
    }

    const token = incomingToken.split(" ")[1];

    if (!token) {
      throw createError(401, "Token not found. Please Login First");
    }

    let decoded;

    try {
      decoded = jwt.verify(token, jwtAccessToken);
    } catch (error) {
      throw createError(401, "Unauthorized. Key expired");
    }

    if (!decoded) {
      throw createError(403, "Failed to authenticate. Please login");
    }

    if (decoded?.role !== "super admin") {
      throw createError(403, "You have not right to create admin user");
    }

    req.user = decoded;
    next();
  } catch (error) {
    return next(error);
  }
};

export const isLoggedIn = async (req, res, next) => {
  try {
    const incomingToken =
      req.headers.authorization || req.headers.Authorization;

    if (!incomingToken) {
      throw createError(401, "Key not found. Please Login First");
    }

    const token = incomingToken.split(" ")[1];

    if (!token) {
      throw createError(401, "Token not found. Please Login First");
    }

    let decoded;

    try {
      decoded = jwt.verify(token, jwtAccessToken);
    } catch (error) {
      throw createError(401, "Unauthorized. Key expired");
    }

    if (!decoded) {
      throw createError(403, "Failed to authenticate. Please login");
    }

    req.user = decoded;

    next();
  } catch (error) {
    return next(error);
  }
};
