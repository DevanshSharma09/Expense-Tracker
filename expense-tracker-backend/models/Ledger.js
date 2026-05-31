const mongoose = require('mongoose')

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    initialShare: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ['Manager', 'Participant', 'Viewer'],
      default: 'Participant',
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    isPersonalPool: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

participantSchema.pre('validate', function normalizeParticipant() {
  if (typeof this.name === 'string') this.name = this.name.trim().toLowerCase()
})

const ledgerLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
)

const ledgerSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: 'Smart Expense Book',
      trim: true,
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
    customCategories: {
      type: [String],
      default: [],
    },
    assistantMemory: {
      corrections: {
        type: [String],
        default: [],
      },
      preferences: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    logs: {
      type: [ledgerLogSchema],
      default: [],
    },
  },
  { timestamps: true }
)

ledgerSchema.index({ ownerId: 1, updatedAt: -1 })

module.exports = mongoose.model('Ledger', ledgerSchema)
