const express = require("express");
const joi = require("joi").extend(require("@joi/date"));
const appError = require("../ErrorClass/AppError");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Book = require("../models/Book");
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
    folder: "Books",
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

const bookError = joi.object({
  title: joi.string().required(),
  category: joi.string().required(),
  author: joi.string().required(),
  description: joi.string().required(),
  publishDate: joi.date().required(),
  price: joi.number().required().min(1),
});

const bookErrorEdit = joi.object({
  title: joi.string(),
  category: joi.string(),
  author: joi.string(),
  description: joi.string(),
  publishDate: joi.date(),
  price: joi.number().min(1),
});

// const verifytoken = (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     throw new appError("Unauthorized User");
//   }
//   const token = authHeader.split(" ")[1];
//   jwt.verify(token, process.env.JWTsecret, (err, decoded) => {
//     if (err) {
//       throw new appError("Unauthorized User");
//     } else {
//       if (verifyAdmin(decoded.id)) {
//         next();
//       } else {
//         throw new appError("Unauthorized User");
//       }
//     }
//   });
// };

const verifytoken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new appError("Unauthorized User");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWTsecret, (err, decoded) => {
    if (err || decoded.role !== "admin") {
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

const ValidateBook = (req, res, next) => {
  const { error } = bookError.validate(req.body);
  if (error) {
    throw new appError(error.details[0].message);
  } else {
    next();
  }
};

const ValidateBookEdit = (req, res, next) => {
  const { error } = bookErrorEdit.validate(req.body);
  if (error) {
    throw new appError(error.details[0].message);
  } else {
    next();
  }
};

router.post(
  "/Admin/Register",
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
        isAdmin: true,
      });
      await newUser.save();
      res.send(newUser);
    }
  })
);

router.post(
  "/Admin/Login",
  wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const FindUser = await User.findOne({ username });
    if (!FindUser || FindUser.isAdmin === false) {
      throw new appError("invalid credentials");
    } else {
      const result = await bcrypt.compare(password, FindUser.password);
      if (result) {
        const token = jwt.sign(
          { id: FindUser._id, role: "admin" },
          process.env.JWTsecret,
          {
            expiresIn: "2h",
          }
        );
        res.json({ UserInformation: FindUser, token: token });
      } else {
        throw new appError("invalid credentials");
      }
    }
  })
);

// Adding Modifiying books

router.post(
  "/Admin/Book",
  verifytoken,
  upload.fields([{ name: "image" }, { name: "pdf" }]),
  ValidateBook,
  wrapAsync(async (req, res) => {
    const {
      title,
      category,
      price,
      author,
      publishDate,
      description,
      upcoming,
    } = req.body;
    if (upcoming) {
      const Image = req.files.image[0];
      const book = await Book({
        title,
        category,
        author,
        publishDate,
        description,
        upcoming,
      });
      book.image.name = Image.filename;
      book.image.url = Image.path;
      await book.save();
      res.json({ book: book });
    } else {
      const Image = req.files.image[0];
      const PDF = req.files.pdf[0];
      const book = await Book({
        title,
        category,
        price,
        author,
        publishDate,
        description,
      });
      book.image.name = Image.filename;
      book.image.url = Image.path;
      book.pdf.name = PDF.filename;
      book.pdf.url = PDF.path;
      await book.save();
      res.json({ book: book });
    }
  })
);

router.delete(
  "/Admin/Book/:bookid",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOneAndDelete({ _id: bookid });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    } else {
      await cloudinary.uploader.destroy(book.image.name);
      await cloudinary.uploader.destroy(book.pdf.name);
      res.json(book);
    }
  })
);

router.put(
  "/Admin/Book/:bookid",
  verifytoken,
  upload.fields([{ name: "image" }, { name: "pdf" }]),
  ValidateBookEdit,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOneAndUpdate(
      { _id: bookid },
      { $set: req.body },
      { new: true }
    );
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    const Image = req.files && req.files.image ? req.files.image[0] : null;
    const PDF = req.files && req.files.pdf ? req.files.pdf[0] : null;
    if (Image) {
      await cloudinary.uploader.destroy(book.image.name);
      book.image.name = Image.filename;
      book.image.url = Image.path;
    }
    if (PDF) {
      if (book.upcoming) {
        book.upcoming = false;
        book.newarrival = true;
      }
      if (book.pdf.name !== "") {
        await cloudinary.uploader.destroy(book.pdf.name);
      }
      book.pdf.name = PDF.filename;
      book.pdf.url = PDF.path;
    }
    await book.save();
    res.json({ book: book });
  })
);

router.put(
  "/Admin/Book/:bookid/discount",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const { discount } = req.body;
    const book = await Book.findOne({ _id: bookid });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    book.onsale = true;
    book.saleprice = book.price - (book.price * discount) / 100;
    await book.save();
    res.json({ book: book });
  })
);

router.delete(
  "/Admin/Book/:bookid/discount",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOne({ _id: bookid });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    book.onsale = false;
    book.saleprice = 0;
    await book.save();
    res.json({ book: book });
  })
);

router.put(
  "/Admin/Book/:bookid/topseller",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOne({ _id: bookid });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    book.topseller = !book.topseller;
    await book.save();
    res.json({ book: book });
  })
);

router.put(
  "/Admin/Book/:bookid/newarrival",
  verifytoken,
  wrapAsync(async (req, res) => {
    const { bookid } = req.params;
    const book = await Book.findOne({ _id: bookid });
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    book.topseller = !book.topseller;
    await book.save();
    res.json({ book: book });
  })
);

module.exports = router;
