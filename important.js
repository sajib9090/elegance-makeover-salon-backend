import "dotenv/config";

const port = process.env.PORT;
const mongoDB_URI = process.env.MONGODB_URI;

const jwtSecret = process.env.JWT_SECRET;
const jwtAccessToken = process.env.JWT_ACCESS_KEY;
const jwtRefreshToken = process.env.JWT_REFRESH_KEY;

export { port, mongoDB_URI, jwtSecret, jwtAccessToken, jwtRefreshToken };