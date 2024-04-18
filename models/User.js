const mongoose = require("mongoose");
const { Schema } = require("mongoose");
const Book = require("./Book");

const userSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  username: String,
  email: String,
  password: String,
  image: {
    name: String,
    url: String,
  },
  Favorites: [
    {
      type: Schema.Types.ObjectId,
      ref: "Book",
    },
  ],
  Bookmarks: [
    {
      type: Schema.Types.ObjectId,
      ref: "Book",
    },
  ],
  Books: [
    {
      type: Schema.Types.ObjectId,
      ref: "Book",
    },
  ],
  isAdmin: Boolean,
});

const User = mongoose.model("User", userSchema);

module.exports = User;
