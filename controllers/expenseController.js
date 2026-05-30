const Expense = require('../models/Expense');

const addExpense = async (req, res) => {
  try {
    const { title, amount, category, walletType } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ message: "Title and amount are required" });
    }

    const newExpense = new Expense({
      userId: req.user.id,
      title,
      amount: parseFloat(amount),
      category,
      // 🌟 Don't forcefully change casing here anymore, save whatever pristine string frontend sends!
      walletType: walletType ? walletType.trim() : 'Personal'
    });

    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);

  } catch (err) {
    console.error("Error saving expense:", err);
    res.status(500).json({ message: "Server Error" });
  }
};