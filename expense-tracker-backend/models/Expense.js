const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    walletMode: {
      type: String,
      enum: ['personal', 'shared'],
      default: 'personal',
      required: true,
    },
    sharedUser: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true, strict: false }
)

module.exports = mongoose.model('Expense', expenseSchema)
