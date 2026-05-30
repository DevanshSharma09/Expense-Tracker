const Budget = require('../models/Budget')

// @desc    Set or Update a budget limit
// @route   POST /api/budgets
const setBudget = async (req, res) => {
  const { category, limit, month } = req.body
  try {
    // Upsert logic: If it exists, update it. If not, create it.
    const budget = await Budget.findOneAndUpdate(
      { user: req.user.id, category, month },
      { limit },
      { new: true, upsert: true }
    )
    res.status(200).json(budget)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all budgets for logged-in user
// @route   GET /api/budgets
const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id })
    res.json(budgets)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { setBudget, getBudgets }
