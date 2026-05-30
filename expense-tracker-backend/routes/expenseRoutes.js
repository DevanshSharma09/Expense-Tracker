const express = require('express')
const router = express.Router()
const {
  addExpense,
  getExpenses,
  getBalanceSheet,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController')
const { protect } = require('../middleware/authMiddleware')

router.use(protect)

router.route('/').post(addExpense).get(getExpenses)
router.get('/balance-sheet', getBalanceSheet)
router.route('/:id').put(updateExpense).delete(deleteExpense)

module.exports = router
