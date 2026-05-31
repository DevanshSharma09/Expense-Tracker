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
    chargedFromPool: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    participantName: {
      type: String,
      trim: true,
      default: '',
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

expenseSchema.add({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
})

expenseSchema.pre('validate', function normalizeExpense() {
  if (typeof this.chargedFromPool === 'string') this.chargedFromPool = this.chargedFromPool.trim().toLowerCase()
})

module.exports = mongoose.model('Expense', expenseSchema)
