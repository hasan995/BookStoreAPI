const mongoose = require("mongoose");
const { Schema } = require("mongoose");
const Rating = require("./Rating");

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  publishDate: Date,
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  image: {
    name: String,
    url: String,
  },
  pdf: {
    name: String,
    url: String,
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Rating",
    },
  ],
  description: String,
  category: String,
  price: Number,
  saleprice: Number,
  topseller: {
    type: Boolean,
    default: false,
  },
  onsale: {
    type: Boolean,
    default: false,
  },
  upcoming: {
    type: Boolean,
    default: false,
  },
  newarrival: {
    type: Boolean,
    default: false,
  },
});

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;
