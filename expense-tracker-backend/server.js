const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')

dotenv.config()

const connectDB = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const expenseRoutes = require('./routes/expenseRoutes')
const budgetRoutes = require('./routes/budgetRoutes')
const incomeRoutes = require('./routes/incomeRoutes') // <-- 1. ADD THIS IMPORT
const ledgerRoutes = require('./routes/ledgerRoutes')

connectDB()

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/budgets', budgetRoutes)
app.use('/api/income', incomeRoutes) // <-- 2. ADD THIS MOUNT
app.use('/api/ledger', ledgerRoutes)

app.get('/', (req, res) => {
  res.send('Expense Tracker API is running')
})

const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on network port ${PORT}`)
})
