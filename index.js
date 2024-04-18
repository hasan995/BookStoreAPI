const express = require("express");
const mongoose = require("mongoose");
const joi = require("joi").extend(require("@joi/date"));
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

const userRouter = require("./routes/UserRoute.js");
const adminRouter = require("./routes/AdminRoute.js");
const bookRouter = require("./routes/BookRoute.js");
const AppError = require("./ErrorClass/AppError");

mongoose.connect(process.env.DBUrl).then(() => {
  console.log("Connected to mongoose!");
});

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", userRouter);
app.use("/", adminRouter);
app.use("/", bookRouter);

app.use((err, req, res, next) => {
  const { message = "An error occured!" } = err;
  res.status(401).send(message);
});

app.listen(3000, () => {
  console.log("Server working!");
});
