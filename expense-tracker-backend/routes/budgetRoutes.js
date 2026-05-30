const express = require('express')
const router = express.Router()
const { setBudget, getBudgets } = require('../controllers/budgetController')
const { protect } = require('../middleware/authMiddleware')

router.use(protect)

router.route('/').post(setBudget).get(getBudgets)

module.exports = router
