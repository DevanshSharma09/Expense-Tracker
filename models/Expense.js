const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  // 🌟 ULTRA FIX: Schema ko danke ki chot par batao ki walletType save karna hi padega!
  walletType: {
    type: String,
    required: true,
    default: 'personal'
  }
}, { 
  timestamps: true,
  strict: false // 🚀 BEAST MODE: Yeh MongoDB ko mana karne se rokega, jo bhi data aayega sab allow karega!
});

module.exports = mongoose.model('Expense', expenseSchema);