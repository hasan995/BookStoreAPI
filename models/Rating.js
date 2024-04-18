const mongoose = require("mongoose");
const { Schema } = require("mongoose");
const User = require("./User");

const ratingSchema = new mongoose.Schema({
  bookid: String,
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  rating: Number,
  comment: String,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const Rating = mongoose.model("Rating", ratingSchema);

module.exports = Rating;
