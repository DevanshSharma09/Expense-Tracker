const express = require('express')
const router = express.Router()
const { addIncome, getIncomes, deleteIncome } = require('../controllers/incomeController')
const { protect } = require('../middleware/authMiddleware')

router.use(protect)

router.route('/').post(addIncome).get(getIncomes)
router.route('/:id').delete(deleteIncome)

module.exports = router
