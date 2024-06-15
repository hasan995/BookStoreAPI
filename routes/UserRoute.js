const express = require("express");
const joi = require("joi").extend(require("@joi/date"));
const appError = require("../ErrorClass/AppError");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Book = require("../models/Book");
const Rating = require("../models/Rating");
const router = express.Router();
require("dotenv").config();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CNAME,
  api_key: process.env.CKEY,
  api_secret: process.env.CSECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "Users",
  },
});

const upload = multer({ storage });

const wrapAsync = function (fun) {
  return function (req, res, next) {
    fun(req, res).catch((e) => next(e));
  };
};

const userError = joi.object({
  firstname: joi.string().required(),
  lastname: joi.string().required(),
  email: joi.string().required(),
  password: joi.string().required(),
  username: joi.string().required(),
});

const userErrorEdit = joi.object({
  firstname: joi.string(),
  lastname: joi.string(),
  email: joi.string(),
  password: joi.string(),
  username: joi.string(),
});

const reviewError = joi.object({
  comment: joi.string().required(),
  rating: joi.number().required().min(0).max(5),
});

const reviewErrorEdit = joi.object({
  comment: joi.string(),
  rating: joi.number().required().min(0).max(5),
});

const verifytoken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new appError("Unauthorized User");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWTsecret, (err, decoded) => {
    if (err) {
      throw new appError("Unauthorized User");
    } else {
      req.user = decoded;
      next();
    }
  });
};

const ValidateUser = (req, res, next) => {
  const { error } = userError.validate(req.body);
  if (error) {
    throw new appError(error.details[0].message);
  } else {
    next();
  }
};

const ValidateUserEdit = (req, res, next) => {
  const { error } = userErrorEdit.validate(req.body);
  if (error) {
    throw new appError(error.details[0].message);
  } else {
    next();
  }
};

const ValidateReview = (req, res, next) => {
  const { error } = reviewError.validate(req.body);
  if (error) {
    throw new appError(error.details[0].message);
  } else {
    next();
  }
};

const ValidateReviewEdit = (req, res, next) => {
  const { error } = reviewErrorEdit.validate(req.body);
  if (error) {
    throw new appError(error.details[0].message);
  } else {
    next();
  }
};

router.post(
  "/User/Register",
  ValidateUser,
  wrapAsync(async (req, res) => {
    const { firstname, lastname, username, email, password } = req.body;
    const FindUser = await User.findOne({
      $or: [{ username: username }, { email: email }],
    });
    if (FindUser) {
      throw new appError("User already registered!");
    } else {
      const hash = await bcrypt.hash(password, 12);
      const newUser = await User({
        username: username,
        firstname: firstname,
        lastname: lastname,
        email: email,
        password: hash,
        isAdmin: false,
      });
      await newUser.save();
      res.send(newUser);
    }
  })
);

router.post(
  "/User/Login",
  wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const FindUser = await User.findOne({
      $or: [{ username: username }, { email: username }],
    });
    if (!FindUser) {
      throw new appError("invalid credentials");
    } else {
      const result = await bcrypt.compare(password, FindUser.password);
      if (result) {
        const token = jwt.sign(
          { id: FindUser._id, role: "user" },
          process.env.JWTsecret,
          {
            expiresIn: "30d",
          }
        );
        res.json({ UserInformation: FindUser, token: token });
      } else {
        throw new appError("invalid credentials");
      }
    }
  })
);

router.put(
  "/User/Edit",
  verifytoken,
  upload.single("image"),
  ValidateUserEdit,
  wrapAsync(async (req, res) => {
    const FindUser = await User.findOneAndUpdate(
      { _id: req.user.id },
      { $set: req.body },
      { new: true }
    );
    if (req.file) {
      if (FindUser.image.name)
        await cloudinary.uploader.destroy(FindUser.image.name);
      FindUser.image.name = req.file.filename;
      FindUser.image.url = req.file.path;
    }
    await FindUser.save();
    res.json({ message: "Success", UserInformation: FindUser });
  })
);

router.get(
  "/User/Info",
  verifytoken,
  wrapAsync(async (req, res) => {
    const FindUser = await User.findOne({ _id: req.user.id });
    res.json({ FindUser });
  })
);

// router.post(
//   "/User/Image",
//   verifytoken,
//   upload.single("image"),
//   wrapAsync(async (req, res) => {
//     const user = await User.findOne({ _id: req.user.id });
//     if (user.image.name !== "") {
//       await cloudinary.uploader.destroy(user.image.name);
//     }
//     user.image.name = req.file.filename;
//     user.image.url = req.file.path;
//     await user.save();
//     res.json({ message: "Image updated!", user });
//   })
// );

router.delete(
  "/User/Image",
  verifytoken,
  wrapAsync(async (req, res) => {
    const user = await User.findOne({ _id: req.user.id });
    await cloudinary.uploader.destroy(user.image.name);
    user.image.name = "";
    user.image.url = "";
    await user.save();
    res.json({ message: "Image deleted!", user });
  })
);

// router.post(
//   "/ForgotPassword",
//   verifytoken,
//   wrapAsync(async (req, res) => {
//     const { oldpassword, newpassword } = req.body;
//     const user = await User.findOne({ _id: req.user.id });
//     const result = bcrypt.compare(oldpassword, user.password);
//     if (result) {
//       const hash = bcrypt.hash(newpassword, 12);
//       user.password = hash;
//       await user.save();
//       res.json({ message: "Password updated!", user });
//     } else {
//       throw new appError("Passowrd don't match!");
//     }
//   })
// );

// get/delete/post User Favorite Books

router.get(
  "/User/Favorites",
  verifytoken,
  wrapAsync(async (req, res) => {
    const user = await User.findOne({ _id: req.user.id }).populate("Favorites");
    const favorites = user.Favorites;
    res.json({ favorites });
  })
);

router.post(
  "/User/Favorites/:bookid",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOne({ _id: bookid });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    const user = await User.findOne({ _id: req.user.id });
    if (user.Favorites.some((favoriteBook) => favoriteBook.equals(bookid))) {
      res.json({ user });
    } else {
      user.Favorites.push(book);
      await user.save();
      res.json({ user });
    }
  })
);

router.delete(
  "/User/Favorites/:bookid",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const user = await User.findOne({ _id: req.user.id });
    user.Favorites = user.Favorites.filter((id) => id.toString() !== bookid);
    await user.save();
    res.json({ user });
  })
);

// get/delete/post User Bookmarks

router.get(
  "/User/Bookmarks",
  verifytoken,
  wrapAsync(async (req, res) => {
    const user = await User.findOne({ _id: req.user.id }).populate("Bookmarks");
    const bookmarks = user.Bookmarks;
    res.json({ bookmarks });
  })
);

router.post(
  "/User/Bookmarks/:bookid",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOne({ _id: bookid });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    const user = await User.findOne({ _id: req.user.id });
    if (user.Bookmarks.some((bookmark) => bookmark.equals(bookid))) {
      res.json({ user });
    } else {
      user.Bookmarks.push(book);
      await user.save();
      res.json({ user });
    }
  })
);

router.delete(
  "/User/Bookmarks/:bookid",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const user = await User.findOne({ _id: req.user.id });
    user.Bookmarks = user.Bookmarks.filter((id) => id.toString() !== bookid);
    await user.save();
    res.json({ user });
  })
);

// get/delete/post User Books

router.get(
  "/User/Books",
  verifytoken,
  wrapAsync(async (req, res) => {
    const user = await User.findOne({ _id: req.user.id }).populate("Books");
    const books = user.Books;
    res.json({ books });
  })
);

router.post(
  "/User/Books",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookids } = req.body;
    const user = await User.findById(req.user.id).populate("Books");
    const validBooks = await Book.find({
      _id: {
        $in: bookids,
        $nin: user.Books,
      },
    });
    if (validBooks.length !== bookids.length) {
      throw new appError("Some book IDs are invalid/Already purchased books");
    }
    user.Books.push(...validBooks);
    await user.save();
    res.json({ user });
  })
);

router.post(
  "/User/Books1",
  verifytoken,
  wrapAsync(async (req, res) => {
    const user = await User.findById(req.user.id).populate("Books");
    const bookids = user.Bookmarks;
    const validBooks = await Book.find({
      _id: {
        $in: bookids,
        $nin: user.Books,
      },
    });
    if (validBooks.length !== bookids.length) {
      throw new appError("Some book IDs are invalid/Already purchased books");
    }
    user.Bookmarks = [];
    user.Books.push(...validBooks);
    await user.save();
    res.json({ user });
  })
);

// Reviews routes

router.post(
  "/User/Reviews/:bookid",
  ValidateReview,
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const { comment, rating } = req.body;
    const book = await Book.findOne({ _id: bookid }).populate("reviews");
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    const existingReview = book.reviews.find((review) =>
      review.user.equals(req.user.id)
    );
    if (existingReview) {
      throw new appError(
        "You have already registered a review on this book, please edit or delete for furthuer modifications"
      );
    }
    const user = await User.findOne({ _id: req.user.id });
    const newRating = await Rating({
      comment: comment,
      rating: rating,
      user: user,
    });
    await newRating.save();
    book.reviews.push(newRating);
    await book.save();
    await user.save();
    res.json({ book });
  })
);

// AlMOST FINSIHED ROUTES

router.delete(
  "/User/Reviews/:bookid/",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOne({ _id: bookid }).populate("reviews");
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    const findreview = book.reviews.find((review) =>
      review.user.equals(req.user.id)
    );
    if (!findreview) {
      return res.status(404).json({ message: "Review not found" });
    }
    await Rating.findOneAndDelete({ _id: findreview._id });
    book.reviews = book.reviews.filter(
      (review) => !review.user.equals(req.user.id)
    );
    await book.save();
    res.json({ book });
  })
);

router.put(
  "/User/Reviews/:bookid/",
  ValidateReviewEdit,
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOne({ _id: bookid }).populate("reviews");
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    const findreview = book.reviews.find((review) =>
      review.user.equals(req.user.id)
    );
    if (!findreview) {
      return res.status(404).json({ message: "Review not found" });
    }
    const updatedReview = await Rating.findOneAndUpdate(
      { _id: findreview._id },
      { $set: req.body },
      { new: true }
    );
    const indexToUpdate = book.reviews.findIndex((review) =>
      review._id.equals(findreview._id)
    );
    if (indexToUpdate !== -1) {
      book.reviews[indexToUpdate] = updatedReview;
    }

    await book.save();
    res.json({ book });
  })
);

router.get(
  "/User/Recommendations",
  verifytoken,
  wrapAsync(async (req, res) => {
    const user = await User.findById(req.user.id).populate(
      "Favorites Bookmarks Books"
    );

    // Category Analysis Logic (Updated)
    const categoryCounts = {};
    for (const book of [...user.Favorites, ...user.Bookmarks, ...user.Books]) {
      if (categoryCounts[book.category]) {
        categoryCounts[book.category]++;
      } else {
        categoryCounts[book.category] = 1;
      }
    }

    let mostInterestingCategory = null;
    let maxCount = 0;
    for (const category in categoryCounts) {
      if (categoryCounts[category] > maxCount) {
        mostInterestingCategory = category;
        maxCount = categoryCounts[category];
      }
    }
    const bookIds = user.Books.map((book) => book._id);
    const books = await Book.find({
      category: mostInterestingCategory,
      _id: { $nin: bookIds },
    });
    res.json({ books });
  })
);

module.exports = router;
