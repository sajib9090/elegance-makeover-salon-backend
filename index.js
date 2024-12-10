import { port } from "./important.js";
import app from "./src/app/app.js";
import connectDB from "./src/app/config/db.js";

(async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Backend app listening on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
})();
