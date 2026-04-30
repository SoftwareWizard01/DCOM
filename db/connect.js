const mongoose = require("mongoose");

const uri =
  "mongodb+srv://GodCode:lDzZwp2QM9Ehh5xX@laundry-db.ktwn8ei.mongodb.net/?appName=Laundry-DB";

const connectDB = () => {
  return mongoose.connect(uri);
};

module.exports = connectDB;
