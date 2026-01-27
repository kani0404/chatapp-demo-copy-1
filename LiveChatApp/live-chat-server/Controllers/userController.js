const generateToken = require("../Config/generateToken");
const UserModel = require("../modals/userModel");
const expressAsyncHandler = require("express-async-handler");

// Login
const loginController = expressAsyncHandler(async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await UserModel.findOne({ name });

  if (user && (await user.matchPassword(password))) {
    // Update user online status
    await UserModel.findByIdAndUpdate(user._id, { 
      isOnline: true, 
      lastSeen: new Date() 
    });
    
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isOnline: true,
      token: generateToken(user._id),
    });
  } else {
    return res.status(401).json({ message: "Invalid UserName or Password" });
  }
});

// Registration
const registerController = expressAsyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "All necessary input fields have not been filled",
    });
  }

  const userExist = await UserModel.findOne({ email });
  if (userExist) {
    return res.status(409).json({ message: "User already exists" });
  }

  const userNameExist = await UserModel.findOne({ name });
  if (userNameExist) {
    return res.status(409).json({ message: "UserName already taken" });
  }

  const user = await UserModel.create({ name, email, password });
  if (user) {
    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    return res.status(500).json({ message: "Registration Error" });
  }
});

// Fetch all users (for search)
const fetchAllUsersController = expressAsyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await UserModel.find(keyword).find({
    _id: { $ne: req.user._id },
  });

  return res.status(200).json(users);
});

// Logout
const logoutController = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  await UserModel.findByIdAndUpdate(userId, { 
    isOnline: false, 
    lastSeen: new Date() 
  });
  
  return res.status(200).json({ message: "Logged out successfully" });
});

module.exports = {
  loginController,
  registerController,
  fetchAllUsersController,
  logoutController,
};
