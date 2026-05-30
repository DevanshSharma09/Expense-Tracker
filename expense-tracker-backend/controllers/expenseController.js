const Expense = require('../models/Expense')

const getUserExpenseFilter = (userId) => ({
  $or: [{ userId }, { user: userId }],
})

const toAmount = (amount) => {
  const parsed = Number(amount)
  return Number.isFinite(parsed) ? parsed : NaN
}

const normalizeWalletMode = (walletMode) => {
  if (typeof walletMode !== 'string') return 'personal'
  return walletMode.trim().toLowerCase() === 'shared' ? 'shared' : 'personal'
}

const normalizeSharedUser = (sharedUser) => {
  if (typeof sharedUser !== 'string') return ''
  return sharedUser.trim()
}

const isSharedExpense = (expense) => {
  if (expense.walletMode === 'shared') return true
  if (typeof expense.walletType === 'string') {
    return expense.walletType.toLowerCase().includes('friend')
  }
  return false
}

const getSimpleBalanceSheet = async (userId) => {
  const expenses = await Expense.find(getUserExpenseFilter(userId))
  const mySpending = expenses
    .filter((expense) => !isSharedExpense(expense))
    .reduce((sum, expense) => sum + (toAmount(expense.amount) || 0), 0)
  const friendsSpending = expenses
    .filter(isSharedExpense)
    .reduce((sum, expense) => sum + (toAmount(expense.amount) || 0), 0)

  return {
    mySpending,
    friendsSpending,
    totalSpending: mySpending + friendsSpending,
  }
}

const addExpense = async (req, res) => {
  try {
    const { title, amount, category, walletMode, sharedUser } = req.body
    const parsedAmount = toAmount(amount)
    const cleanWalletMode = normalizeWalletMode(walletMode)
    const cleanSharedUser = normalizeSharedUser(sharedUser)

    if (!title || !category || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a title, category, and a valid amount.' })
    }

    if (cleanWalletMode === 'shared' && !cleanSharedUser) {
      return res.status(400).json({ message: "Please enter your friend's name." })
    }

    const expense = await Expense.create({
      userId: req.user.id,
      title: title.trim(),
      amount: parsedAmount,
      category: category.trim(),
      walletMode: cleanWalletMode,
      sharedUser: cleanWalletMode === 'shared' ? cleanSharedUser : '',
    })

    res.status(201).json(expense)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not save this expense.' })
  }
}

const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find(getUserExpenseFilter(req.user.id)).sort({ createdAt: -1, date: -1 })
    res.json(expenses)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not load expenses.' })
  }
}

const getBalanceSheet = async (req, res) => {
  try {
    const balanceSheet = await getSimpleBalanceSheet(req.user.id)
    res.json(balanceSheet)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not calculate balances.' })
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

    if ('title' in updates && typeof updates.title === 'string') {
      updates.title = updates.title.trim()
    }

    if ('category' in updates && typeof updates.category === 'string') {
      updates.category = updates.category.trim()
    }

    if ('walletMode' in updates) {
      updates.walletMode = normalizeWalletMode(updates.walletMode)
    }

    if ('sharedUser' in updates) {
      updates.sharedUser = normalizeSharedUser(updates.sharedUser)
    }

    if (updates.walletMode === 'shared' && !updates.sharedUser) {
      return res.status(400).json({ message: "Please enter your friend's name." })
    }

    if (updates.walletMode === 'personal') {
      updates.sharedUser = ''
    }

    const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })

    res.json(updatedExpense)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not update this expense.' })
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
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not delete this expense.' })
  }
}

module.exports = {
  addExpense,
  getExpenses,
  getBalanceSheet,
  updateExpense,
  deleteExpense,
}
