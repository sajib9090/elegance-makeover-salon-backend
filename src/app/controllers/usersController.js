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
import jwt from "jsonwebtoken";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

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
      throw createError(400, "Username, or mobile should be valid");
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
        createError.BadRequest("Invalid username, or mobile. Not found")
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

    const accessToken = await createJWT(userObject, jwtAccessToken, "10m");

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
      "10d"
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
    const result = await usersCollection
      .find({ username: { $ne: "sajib" } }, { projection: { password: 0 } })
      .sort({ name: 1 })
      .toArray();
    res.status(200).send({
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetSingleUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await usersCollection.findOne(
      { user_id: id },
      { projection: { password: 0 } }
    );
    if (!result) {
      throw createError(404, "User not found");
    }
    res.status(200).send({
      success: true,
      message: "User retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleChangePasswordByAuthority = async (req, res, next) => {
  const { id } = req.params;
  let { newPassword } = req.body;
  try {
    newPassword = newPassword.replace(/\s+/g, "");

    // Check password length
    if (newPassword.length < 6) {
      throw createError(400, "Password must be at least 6 characters long");
    }
    const existingUser = await usersCollection.findOne({ user_id: id });

    if (!existingUser) {
      throw createError(400, "User not found");
    }
    // Hash the new password
    const saltRounds = 10; // Recommended salt value
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password field in the database
    await usersCollection.updateOne(
      { user_id: id },
      { $set: { password: hashedPassword } }
    );

    res.status(200).send({
      success: true,
      message: "Password change successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleRemoveUserByAuthority = async (req, res, next) => {
  const { id } = req.params;
  try {
    const existingUser = await usersCollection.findOne({ user_id: id });
    if (!existingUser) {
      throw createError(400, "User not found");
    }

    const result = await usersCollection.deleteOne({
      user_id: existingUser?.user_id,
    });

    if (result?.deletedCount == 0) {
      throw createError(500, "Something went wrong. please try again");
    }
    res.status(200).send({
      success: true,
      message: "Removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleEditBrandInfo = async (req, res, next) => {
  const { userId } = req.params;
  const { brand_name, location, district, sub_district, mobile1, mobile2 } =
    req.body;

  try {
    const brand = await brandsCollection.findOne();

    if (!brand) {
      throw createError(400, "Brand not found");
    }

    const existingUser = await usersCollection.findOne({ user_id: userId });
    if (!existingUser) {
      throw createError(400, "Invalid request");
    }

    // Build the dynamic update object
    const updateFields = {};

    if (brand_name && brand_name !== undefined) {
      updateFields.brand_name = validateString(brand_name, "Brand Name", 3, 40);
    }

    if (location && location !== undefined) {
      updateFields["address.location"] = validateString(
        location,
        "Location",
        3,
        50
      );
    }

    if (district && district !== undefined) {
      updateFields["address.district"] = validateString(
        district,
        "District",
        3,
        30
      );
    }

    if (sub_district && sub_district !== undefined) {
      updateFields["address.sub_district"] = validateString(
        sub_district,
        "Sub District",
        3,
        30
      );
    }

    if (mobile1 && mobile1 !== undefined) {
      updateFields["contact.mobile1"] = validateString(
        mobile1,
        "Mobile1",
        11,
        11
      );
    }

    if (mobile2 && mobile2 !== undefined) {
      updateFields["contact.mobile2"] = validateString(
        mobile2,
        "Mobile2",
        11,
        11
      );
    }

    // If no fields are provided, throw an error
    if (Object.keys(updateFields).length === 0) {
      throw createError(400, "No fields provided for update");
    }

    // Update the brand in the database
    await brandsCollection.updateOne({}, { $set: updateFields });

    const brandInfo = await brandsCollection.findOne();

    res.status(200).send({
      success: true,
      message: "Brand info updated",
      data: brandInfo,
    });
  } catch (error) {
    next(error);
  }
};

export const handleEditUserInfo = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const { name, username, mobile } = req.body;

  try {
    const existingUser = await usersCollection.findOne({
      user_id: user?.user_id,
    });
    if (!existingUser) {
      throw createError(400, "Invalid request");
    }

    const updateFields = {};

    if (name && name !== undefined) {
      const validatedName = validateString(name, "Name", 3, 40);
      updateFields.name = validatedName;
    }

    if (username && username !== undefined) {
      const validatedUsername = validateString(username, "Username", 3, 40);

      // Check for duplicate username
      const usernameExists = await usersCollection.findOne({
        username: validatedUsername,
        user_id: { $ne: user?.user_id }, // Exclude the current user
      });
      if (usernameExists) {
        throw createError(
          400,
          "The username is already in use by another user"
        );
      }

      updateFields.username = validatedUsername;
    }

    if (mobile && mobile !== undefined) {
      const validatedMobile = validateString(mobile, "Mobile", 11, 11);

      // Check for duplicate mobile
      const mobileExists = await usersCollection.findOne({
        mobile: validatedMobile,
        user_id: { $ne: user?.user_id }, // Exclude the current user
      });
      if (mobileExists) {
        throw createError(
          400,
          "The mobile number is already in use by another user"
        );
      }

      updateFields.mobile = validatedMobile;
    }

    if (Object.keys(updateFields).length === 0) {
      throw createError(400, "No fields provided for update");
    }

    await usersCollection.updateOne(
      { user_id: existingUser?.user_id },
      { $set: updateFields }
    );

    const userInfo = await usersCollection.findOne({
      user_id: existingUser?.user_id,
    });

    res.status(200).send({
      success: true,
      message: "User info updated successfully",
      data: userInfo,
    });
  } catch (error) {
    next(error);
  }
};

export const handleForgotPassword = async (req, res, next) => {
  const { mobile } = req.params;
  const { answer, newPassword } = req.body;

  try {
    // Check if the user exists
    const existingUser = await usersCollection.findOne({ mobile: mobile });
    if (!existingUser) {
      throw createError(404, "User not found");
    }

    // Validate security question answer
    if (!answer || answer.toLowerCase() !== "black cat") {
      throw createError(400, "Incorrect answer to the security question");
    }

    // Validate new password
    if (!newPassword) {
      throw createError(400, "New Password is a required field");
    }

    const trimmedPassword = newPassword.replace(/\s/g, "");
    if (trimmedPassword.length < 6 || trimmedPassword.length > 30) {
      throw createError(
        400,
        "Password must be at least 6 characters long and not more than 30 characters long"
      );
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

    // Update the user's password in the database
    await usersCollection.updateOne(
      { mobile: mobile },
      { $set: { password: hashedPassword } }
    );

    res.status(200).send({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const handleUpdateUserAvatar = async (req, res, next) => {
  const user = req.user.user ? req.user.user : req.user;
  const bufferFile = req.file.buffer;
  try {
    if (!user) {
      throw createError(400, "User not found. Login Again");
    }

    if (!bufferFile) {
      throw createError(400, "Avatar is required");
    }

    const existingUser = await usersCollection.findOne({
      user_id: user?.user_id,
    });

    if (!existingUser) {
      throw createError(404, "User not found");
    }

    if (
      existingUser?.avatar &&
      existingUser?.avatar?.id &&
      existingUser?.avatar?.url
    ) {
      await deleteFromCloudinary(existingUser.avatar.id);
    }

    const avatar = await uploadOnCloudinary(bufferFile);

    if (!avatar?.public_id) {
      a;
      throw createError(500, "Something went wrong. Avatar not updated");
    }

    const result = await usersCollection.updateOne(
      { user_id: existingUser.user_id },
      { $set: { avatar: { id: avatar?.public_id, url: avatar?.secure_url } } },
      { returnOriginal: false }
    );
    if (result?.modifiedCount === 0) {
      throw createError(500, "Updated failed");
    }

    const updatedUser = await usersCollection.findOne(
      {
        user_id: existingUser?.user_id,
      },
      { projection: { password: 0 } }
    );
    res.status(200).send({
      success: true,
      message: "Avatar updated",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const handleUpdateBrandLogo = async (req, res, next) => {
  const bufferFile = req.file.buffer;

  try {
    if (!bufferFile) {
      throw createError(400, "Brand Logo is required");
    }

    const existingBrand = await brandsCollection.findOne({});

    if (!existingBrand) {
      throw createError(404, "Brand not found");
    }

    if (
      existingBrand?.brand_logo &&
      existingBrand?.brand_logo?.id &&
      existingBrand?.brand_logo?.url
    ) {
      await deleteFromCloudinary(existingBrand.brand_logo.id);
    }

    const brandLogo = await uploadOnCloudinary(bufferFile);

    if (!brandLogo?.public_id) {
      a;
      throw createError(500, "Something went wrong. Brand Logo not updated");
    }

    const result = await brandsCollection.updateOne(
      {},
      {
        $set: {
          brand_logo: { id: brandLogo?.public_id, url: brandLogo?.secure_url },
        },
      },
      { returnOriginal: false }
    );
    if (result?.modifiedCount === 0) {
      throw createError(500, "Updated failed");
    }

    const updatedBrand = await brandsCollection.findOne();
    res.status(200).send({
      success: true,
      message: "Brand logo updated",
      data: updatedBrand,
    });
  } catch (error) {
    next(error);
  }
};
