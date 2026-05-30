const Income = require('../models/Income')

// @desc    Add a new income source
// @route   POST /api/income
const addIncome = async (req, res) => {
  const { title, amount, source, date, description } = req.body
  try {
    const income = await Income.create({
      user: req.user.id,
      title,
      amount,
      source,
      date,
      description,
    })
    res.status(201).json(income)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all income logs for logged-in user
// @route   GET /api/income
const getIncomes = async (req, res) => {
  try {
    const incomes = await Income.find({ user: req.user.id }).sort({ date: -1 })
    res.json(incomes)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Delete an income log
// @route   DELETE /api/income/:id
const deleteIncome = async (req, res) => {
  try {
    const income = await Income.findById(req.params.id)
    if (!income) return res.status(404).json({ message: 'Income log not found' })

    if (income.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' })
    }

    await income.deleteOne()
    res.json({ message: 'Income log removed' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { addIncome, getIncomes, deleteIncome }
