const Expense = require('../models/Expense')

const toAmount = (amount) => {
  const parsed = Number(amount)
  return Number.isFinite(parsed) ? parsed : NaN
}

const getUserExpenseFilter = (userId) => ({
  $or: [{ userId }, { user: userId }],
})

const addExpense = async (req, res) => {
  try {
    const { title, amount, category, walletType, walletMode, sharedUser, participantId, participantName } = req.body
    const parsedAmount = toAmount(amount)

    if (!title || !category || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a title, category, and a valid amount.' })
    }

    const poolName = participantName || sharedUser || walletType || 'Personal'

    const newExpense = await Expense.create({
      userId: req.user.id,
      title: title.trim(),
      amount: parsedAmount,
      category: category.trim(),
      walletType: poolName.trim(),
      walletMode: walletMode || (poolName.toLowerCase().includes('personal') ? 'personal' : 'shared'),
      sharedUser: sharedUser || poolName,
      participantId: participantId || null,
      participantName: poolName,
    })

    res.status(201).json(newExpense)
  } catch (err) {
    console.error('Error saving expense:', err)
    res.status(500).json({ message: 'Server Error' })
  }
}

const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find(getUserExpenseFilter(req.user.id)).sort({ createdAt: -1 })
    res.json(expenses)
  } catch (err) {
    res.status(500).json({ message: 'Server Error' })
  }
}

const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
    if (!expense) return res.status(404).json({ message: 'Expense not found.' })

    const ownerId = expense.userId || expense.user
    if (!ownerId || ownerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'You are not allowed to edit this expense.' })
    }

    const updates = { ...req.body }
    if ('amount' in updates) {
      const parsedAmount = toAmount(updates.amount)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number.' })
      }
      updates.amount = parsedAmount
    }

    const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
    res.json(updatedExpense)
  } catch (err) {
    res.status(500).json({ message: 'Server Error' })
  }
}

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
    if (!expense) return res.status(404).json({ message: 'Expense not found.' })

    const ownerId = expense.userId || expense.user
    if (!ownerId || ownerId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'You are not allowed to delete this expense.' })
    }

    await expense.deleteOne()
    res.json({ message: 'Expense removed.' })
  } catch (err) {
    res.status(500).json({ message: 'Server Error' })
  }
}

module.exports = {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
}
