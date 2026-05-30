const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Header se "Bearer <token>" format mein se token nikalna
      token = req.headers.authorization.split(' ')[1]

      // Token ko secret key se decrypt/verify karna
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Logged-in user ka data nikal kar 'req.user' mein store karna (password chhod kar)
      req.user = await User.findById(decoded.id).select('-password')

      return next()
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' })
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' })
  }
}

module.exports = { protect }
