const app = require("./app");
const connectDB = require("../db/connect");

const PORT = process.env.PORT || 10000;

const start = async () => {
  try {
    await connectDB();
    console.log("📦 DB connected");
  } catch (err) {
    console.error("⚠️ DB failed:", err.message);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

start();
