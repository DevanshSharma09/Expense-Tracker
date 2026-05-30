const User = require('../models/User')
const jwt = require('jsonwebtoken')

// Helper function: User ID ko pakad kar encrypted Token banane ke liye
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  })
}

// @desc    Naya user register karne ke liye
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  const { name, email, password } = req.body

  try {
    // 1. Check karo user pehle se register toh nahi hai
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // 2. Naya user create karo (Password automatically hash ho jayega model ke pre-save hook se)
    const user = await User.create({
      name,
      email,
      password,
    })

    // 3. Response mein data aur token bhej do
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      })
    } else {
      res.status(400).json({ message: 'Invalid user data' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    User Login karwane ke liye
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body

  try {
    // 1. Email ke zariye user ko database mein dhoodho
    const user = await User.findOne({ email })

    // 2. Agar user mil gaya aur password match ho gaya (model ke matchPassword method se)
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      })
    } else {
      res.status(401).json({ message: 'Invalid email or password' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { registerUser, loginUser }