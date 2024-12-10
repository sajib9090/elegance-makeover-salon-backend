import createError from "http-errors";

const validateString = (stringValue, errorTitle, min, max) => {
  const processedString = stringValue
    ?.toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s{2,}/g, " ");

  if (processedString.length < min) {
    throw createError(
      400,
      `${errorTitle} must be at least ${min} characters long`
    );
  }
  if (processedString.length > max) {
    throw createError(
      400,
      `${errorTitle} can't be more than ${max} characters long`
    );
  }

  return processedString;
};

export { validateString };