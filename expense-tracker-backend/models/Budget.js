const mongoose = require('mongoose')

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    limit: {
      type: Number,
      required: true,
    },
    month: {
      type: String, // Format: "YYYY-MM" (e.g., "2026-05")
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Prevent a user from creating duplicate budget entries for the same category in the same month
budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true })

module.exports = mongoose.model('Budget', budgetSchema)
