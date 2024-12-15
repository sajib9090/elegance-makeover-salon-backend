import createError from "http-errors";
import { validateString } from "../utils/validateString.js";
import bcrypt from "bcryptjs";
import {
  brandsCollection,
  usersCollection,
} from "../collections/collections.js";
import validator from "validator";
import crypto from "crypto";
import createJWT from "../utils/createJWT.js";
import { jwtAccessToken, jwtRefreshToken } from "../../../important.js";

export const handleRegisterUser = async (req, res, next) => {
  try {
    const { name, username, mobile, password, role } = req.body;

    if (!name) {
      throw createError(400, "Name is required field");
    }
    if (!username) {
      throw createError(400, "Username is required field");
    }
    if (!mobile) {
      throw createError(400, "Mobile is required field");
    }

    if (!password) {
      throw createError(400, "Password is required field");
    }
    if (!role) {
      throw createError(400, "Role is required field");
    }

    const processedName = validateString(name, "Name", 3, 30);
    const processedUsername = validateString(username, "Username", 3, 30);

    if (mobile?.length !== 11) {
      throw createError(400, "Mobile number must be 11 characters");
    }

    if (!validator.isMobilePhone(mobile, "any")) {
      throw createError(400, "Invalid mobile number");
    }
    const allowedRoles = ["admin", "user"];

    if (!allowedRoles.includes(role)) {
      return res
        .status(400)
        .json({ error: 'Invalid role. Only "admin" or "user" are allowed.' });
    }

    const existingUsername = await usersCollection.findOne({
      username: processedUsername,
    });

    if (existingUsername) {
      throw createError(400, "Username already exists");
    }
    const existingMobile = await usersCollection.findOne({
      mobile: mobile,
    });

    if (existingMobile) {
      throw createError(400, "Mobile already exists");
    }

    const trimmedPassword = password.replace(/\s/g, "");
    if (trimmedPassword.length < 6 || trimmedPassword.length > 30) {
      throw createError(
        400,
        "Password must be at least 6 characters long and not more than 30 characters long"
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

    const generateCode = crypto.randomBytes(16).toString("hex");

    const newUser = {
      user_id: generateCode,
      name: processedName,
      avatar: { id: null, url: null },
      username: processedUsername,
      mobile: mobile,
      password: hashedPassword,
      role: "admin",
      banned_user: false,
      createdAt: new Date(),
    };

    const userResult = await usersCollection.insertOne(newUser);
    if (!userResult?.insertedId) {
      throw createError(500, "User created failed.");
    }
    res.status(200).send({
      success: true,
      message: "User register in successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleLoginUser = async (req, res, next) => {
  const { usernameOrMobile, password } = req.body;
  try {
    if (!usernameOrMobile || !password) {
      throw createError(400, "Username or mobile and password are required");
    }

    const stringData = usernameOrMobile
      ?.trim()
      .replace(/\s+/g, "")
      .toLowerCase();

    if (usernameOrMobile?.length > 30 || usernameOrMobile?.length < 3) {
      throw createError(400, "Email, or mobile should be valid");
    }

    const trimmedPassword = password.replace(/\s/g, "");

    if (trimmedPassword.length < 6 || trimmedPassword.length > 30) {
      throw createError(
        400,
        "Password must be at least 6 characters long and not more than 30 characters long"
      );
    }

    const user = await usersCollection.findOne({
      $or: [{ username: stringData }, { mobile: stringData }],
    });

    if (!user) {
      return next(
        createError.BadRequest("Invalid email address, or mobile. Not found")
      );
    }

    // Match password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(createError.Unauthorized("Invalid Password"));
    }

    // Check if user is banned
    if (user?.banned_user) {
      return next(
        createError.Unauthorized("You are banned. Please contact authority")
      );
    }

    const loggedInUser = {
      _id: user?._id,
      user_id: user?.user_id,
      name: user?.name,
      avatar: user?.avatar,
      username: user?.username,
      mobile: user?.mobile,
      banned_user: user?.banned_user,
      role: user?.role,
      createdAt: user?.createdAt,
    };

    const brand = await brandsCollection.findOne();
    if (!brand) {
      return next(createError(404, "Brand not found"));
    }

    let userObject = { ...loggedInUser, brand };

    const accessToken = await createJWT(userObject, jwtAccessToken, "1d");

    const refreshToken = await createJWT(userObject, jwtRefreshToken, "7d");

    res.cookie("refreshToken", refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.status(200).send({
      success: true,
      message: "LoggedIn Successfully",
      data: {
        ...userObject,
      },
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRefreshToken = async (req, res, next) => {
  const oldRefreshToken = req.cookies.refreshToken;
  try {
    if (!oldRefreshToken) {
      throw createError(404, "Refresh token not found. Login first");
    }
    //verify refresh token
    const decodedToken = jwt.verify(oldRefreshToken, jwtRefreshToken);

    if (!decodedToken) {
      throw createError(401, "Invalid refresh token. Please Login");
    }

    // if token validation success generate new access token
    const accessToken = await createJWT(
      { user: decodedToken },
      jwtAccessToken,
      "10m"
    );
    // Update req.user with the new decoded user information
    req.user = decodedToken.user;

    res.status(200).send({
      success: true,
      message: "New access token generate successfully",
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetUsers = async (req, res, next) => {
  try {
    const result = await usersCollection.find().toArray();
    console.log(result);

    res.status(200).send({
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
