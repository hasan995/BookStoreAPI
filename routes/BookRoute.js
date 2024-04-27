const express = require("express");
const joi = require("joi").extend(require("@joi/date"));
const appError = require("../ErrorClass/AppError");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Book = require("../models/Book");
const Rating = require("../models/Rating");
const router = express.Router();

const wrapAsync = function (fun) {
  return function (req, res, next) {
    fun(req, res).catch((e) => next(e));
  };
};

router.get(
  "/Books",
  wrapAsync(async (req, res) => {
    const query = req.query.search || "";
    const topsellerFilter = req.query.topseller === "true";
    const onsaleFilter = req.query.onsale === "true";

    let books = await Book.find({
      upcoming: false,
      $or: [
        { title: { $regex: query, $options: "i" } },
        { author: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    });

    if (topsellerFilter) {
      books = books.filter((book) => book.topseller === true);
    }
    if (onsaleFilter) {
      books = books.filter((book) => book.onsale === true);
    }

    if (req.query.sort) {
      const sortField = req.query.sort.startsWith("-")
        ? req.query.sort.slice(1)
        : req.query.sort;
      const sortOrder = req.query.sort.startsWith("-") ? -1 : 1;

      books.sort((bookA, bookB) => {
        if (bookA[sortField] < bookB[sortField]) {
          return sortOrder * -1;
        } else if (bookA[sortField] > bookB[sortField]) {
          return sortOrder * 1;
        } else {
          return 0;
        }
      });
    }

    res.json(books);
  })
);

router.get(
  "/Books/topseller",
  wrapAsync(async (req, res) => {
    const book = await Book.find({ topseller: true });
    res.json({ book });
  })
);

router.get(
  "/Books/upcoming",
  wrapAsync(async (req, res) => {
    const book = await Book.find({ upcoming: true });
    res.json({ book });
  })
);

router.get(
  "/Books/onsale",
  wrapAsync(async (req, res) => {
    const book = await Book.find({ onsale: true });
    res.json({ book });
  })
);

router.get(
  "/Books/newarrival",
  wrapAsync(async (req, res) => {
    const book = await Book.find({ newarrival: true });
    res.json({ book });
  })
);

router.get(
  "/Books/:bookid",
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOne({ _id: bookid }).populate({
      path: "reviews",
      populate: {
        path: "user",
        select: "firstname lastname image createdAt",
      },
    });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.json({ book });
  })
);

router.get(
  "/Books/categories/:category",
  wrapAsync(async (req, res) => {
    const { category } = req.params;
    const query = req.query.search || "";
    const topsellerFilter = req.query.topseller === "true";
    const onsaleFilter = req.query.onsale === "true";

    const capitalizedCategory =
      category.charAt(0).toUpperCase() + category.slice(1);
    let books = await Book.find({
      category: capitalizedCategory,
      upcoming: false,
      $or: [
        { title: { $regex: query, $options: "i" } },
        { author: { $regex: query, $options: "i" } },
      ],
    });

    if (topsellerFilter) {
      books = books.filter((book) => book.topseller === true);
    }
    if (onsaleFilter) {
      books = books.filter((book) => book.onsale === true);
    }

    if (req.query.sort) {
      const sortField = req.query.sort.startsWith("-")
        ? req.query.sort.slice(1)
        : req.query.sort;
      const sortOrder = req.query.sort.startsWith("-") ? -1 : 1;

      books.sort((bookA, bookB) => {
        if (bookA[sortField] < bookB[sortField]) {
          return sortOrder * -1;
        } else if (bookA[sortField] > bookB[sortField]) {
          return sortOrder * 1;
        } else {
          return 0;
        }
      });
    }

    res.json({ books });
  })
);

// router.get(
//   "/Books/Reviews/:bookid",
//   wrapAsync(async (req, res) => {
//     const { bookid } = req.params;
//     const book = await Book.findOne({ _id: bookid }).populate("reviews");
//     if (!book) {
//       return res.status(404).json({ message: "Book not found" });
//     }
//     const Reviews = book.reviews;
//     res.json({ Reviews });
//   })
// );

module.exports = router;
