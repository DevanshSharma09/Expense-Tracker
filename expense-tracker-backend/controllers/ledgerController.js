const mongoose = require('mongoose')
const Ledger = require('../models/Ledger')
const Expense = require('../models/Expense')

const SYSTEM_CATEGORIES = ['Food', 'Travel', 'Rent', 'Subscription', 'Utilities', 'Healthcare', 'Other']
const PERIODS = {
  weekly: { days: 7, unit: 'day' },
  monthly: { days: 30, unit: 'day' },
  yearly: { days: 365, unit: 'month' },
}

const toAmount = (amount) => {
  const parsed = Number(amount)
  return Number.isFinite(parsed) ? parsed : NaN
}

const normalizeName = (name) => String(name || '').trim().toLowerCase()

const normalizeRole = (role) => {
  const clean = String(role || '').trim().toLowerCase()
  if (clean === 'manager') return 'Manager'
  if (clean === 'viewer') return 'Viewer'
  return 'Participant'
}

const getExpenseOwnerFilter = (userId) => ({ $or: [{ userId }, { user: userId }] })

const getParticipantLabel = (participant) => normalizeName(participant.name)

const formatMoney = (amount) => `₹${Math.round(toAmount(amount) || 0)}`

const displayName = (name) =>
  normalizeName(name).replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Unnamed'

const expensePoolName = (expense) => normalizeName(expense.chargedFromPool || expense.participantName || expense.sharedUser)

const participantSpend = (participant, expenses) =>
  expenses
    .filter((expense) => {
      const participantId = expense.participantId?.toString()
      return participantId === participant._id.toString() || expensePoolName(expense) === normalizeName(participant.name)
    })
    .reduce((sum, expense) => sum + (toAmount(expense.amount) || 0), 0)

const pushLog = (ledger, type, message, metadata = {}) => {
  ledger.logs.unshift({ type, message, metadata })
  ledger.logs = ledger.logs.slice(0, 120)
}

const coalesceParticipantPools = (ledger) => {
  const byName = new Map()
  const merged = []

  ledger.participants.forEach((participant) => {
    participant.name = normalizeName(participant.name)
    participant.role = normalizeRole(participant.role)
    const existing = byName.get(participant.name)

    if (!existing) {
      byName.set(participant.name, participant)
      merged.push(participant)
      return
    }

    existing.initialShare = (toAmount(existing.initialShare) || 0) + (toAmount(participant.initialShare) || 0)
    existing.currentBalance = (toAmount(existing.currentBalance) || 0) + (toAmount(participant.currentBalance) || 0)
    existing.isPersonalPool = Boolean(existing.isPersonalPool || participant.isPersonalPool)
    existing.hidden = Boolean(existing.hidden && participant.hidden)
    if (existing.role !== 'Manager') existing.role = participant.role
  })

  ledger.participants = merged
}

const ensureLedger = async (user) => {
  let ledger = await Ledger.findOne({ ownerId: user.id })
  if (ledger) {
    coalesceParticipantPools(ledger)
    await ledger.save()
    return ledger
  }

  ledger = await Ledger.create({
    ownerId: user.id,
    participants: [],
    logs: [{ type: 'system', message: 'Account created.' }],
  })

  return ledger
}

const recalculateLedger = async (ledger) => {
  coalesceParticipantPools(ledger)
  const expenses = await Expense.find(getExpenseOwnerFilter(ledger.ownerId))
  const spentByParticipant = new Map()

  expenses.forEach((expense) => {
    const participantId = expense.participantId?.toString()
    const legacyLabel = normalizeName(expense.chargedFromPool || expense.sharedUser || expense.participantName)
    const key = participantId || legacyLabel || ledger.participants.find((p) => p.isPersonalPool)?._id?.toString()
    if (!key) return
    spentByParticipant.set(key, (spentByParticipant.get(key) || 0) + (toAmount(expense.amount) || 0))
  })

  ledger.participants = ledger.participants.map((participant) => {
    const idSpend = spentByParticipant.get(participant._id.toString()) || 0
    const nameSpend = spentByParticipant.get(getParticipantLabel(participant)) || 0
    participant.currentBalance = (toAmount(participant.initialShare) || 0) - idSpend - nameSpend
    return participant
  })

  await ledger.save()
  return ledger
}

const serializeLedger = async (ledger) => {
  const refreshed = await recalculateLedger(ledger)
  const metrics = await buildVaultMetrics(refreshed)
  return {
    _id: refreshed._id,
    name: refreshed.name,
    participants: refreshed.participants,
    customCategories: refreshed.customCategories,
    systemCategories: SYSTEM_CATEGORIES,
    assistantMemory: refreshed.assistantMemory,
    logs: refreshed.logs,
    metrics,
  }
}

const buildVaultMetrics = async (ledger) => {
  const [vault] = await Ledger.aggregate([
    { $match: { _id: ledger._id } },
    { $unwind: '$participants' },
    {
      $group: {
        _id: '$_id',
        totalVaultLiquidity: { $sum: '$participants.currentBalance' },
        escrowGroupCapital: {
          $sum: {
            $cond: [{ $eq: ['$participants.isPersonalPool', true] }, 0, '$participants.currentBalance'],
          },
        },
        myPersonalPoolBalance: {
          $sum: {
            $cond: [{ $eq: ['$participants.isPersonalPool', true] }, '$participants.currentBalance', 0],
          },
        },
      },
    },
  ])

  return {
    totalVaultLiquidity: vault?.totalVaultLiquidity || 0,
    escrowGroupCapital: vault?.escrowGroupCapital || 0,
    myPersonalPoolBalance: vault?.myPersonalPoolBalance || 0,
  }
}

const getLedger = async (req, res) => {
  try {
    const ledger = await ensureLedger(req.user)
    res.json(await serializeLedger(ledger))
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not load ledger.' })
  }
}

const updateLedger = async (req, res) => {
  try {
    const ledger = await ensureLedger(req.user)
    if (typeof req.body.name === 'string') ledger.name = req.body.name.trim() || ledger.name
    pushLog(ledger, 'settings', 'Ledger settings updated.')
    await ledger.save()
    res.json(await serializeLedger(ledger))
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not update ledger.' })
  }
}

const addParticipant = async (req, res) => {
  try {
    const { name, initialShare = 0, role } = req.body
    const parsedShare = toAmount(initialShare)
    const normalizedName = normalizeName(name)
    if (!normalizedName || !Number.isFinite(parsedShare) || parsedShare < 0) {
      return res.status(400).json({ message: 'Participant name and a valid initial share are required.' })
    }

    const ledger = await ensureLedger(req.user)
    const existing = ledger.participants.find((participant) => normalizeName(participant.name) === normalizedName)

    if (existing) {
      existing.initialShare = (toAmount(existing.initialShare) || 0) + parsedShare
      existing.currentBalance = (toAmount(existing.currentBalance) || 0) + parsedShare
      if (role) existing.role = normalizeRole(role)
      existing.hidden = false
      pushLog(ledger, 'participant', `${normalizedName} balance updated.`, { initialShare: parsedShare, role: existing.role })
    } else {
      ledger.participants.push({
        name: normalizedName,
        initialShare: parsedShare,
        currentBalance: parsedShare,
        role: normalizeRole(role),
      })
      pushLog(ledger, 'participant', `${normalizedName} added to the ledger.`, { initialShare: parsedShare, role: normalizeRole(role) })
    }

    await ledger.save()
    res.status(201).json(await serializeLedger(ledger))
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not add participant.' })
  }
}

const updateParticipant = async (req, res) => {
  try {
    const ledger = await ensureLedger(req.user)
    const participant = ledger.participants.id(req.params.id)
    if (!participant) return res.status(404).json({ message: 'Participant not found.' })

    const { name, initialShare, role, hidden, isPersonalPool } = req.body
    if (typeof name === 'string' && name.trim()) participant.name = normalizeName(name)
    if (initialShare !== undefined) {
      const parsedShare = toAmount(initialShare)
      if (!Number.isFinite(parsedShare) || parsedShare < 0) {
        return res.status(400).json({ message: 'Initial share must be zero or higher.' })
      }
      participant.initialShare = parsedShare
    }
    if (typeof role === 'string') participant.role = normalizeRole(role)
    if (typeof hidden === 'boolean') participant.hidden = hidden
    if (typeof isPersonalPool === 'boolean') {
      ledger.participants.forEach((item) => {
        item.isPersonalPool = item._id.toString() === participant._id.toString() ? isPersonalPool : false
      })
    }

    pushLog(ledger, 'participant', `${participant.name} profile updated.`)
    await ledger.save()
    res.json(await serializeLedger(ledger))
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not update participant.' })
  }
}

const removeParticipant = async (req, res) => {
  try {
    const ledger = await ensureLedger(req.user)
    const participant = ledger.participants.id(req.params.id)
    if (!participant) return res.status(404).json({ message: 'Participant not found.' })
    const name = participant.name
    participant.deleteOne()
    pushLog(ledger, 'participant', `${name} removed from the ledger.`)
    await ledger.save()
    res.json(await serializeLedger(ledger))
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not remove participant.' })
  }
}

const reallocatePersonalPool = async (req, res) => {
  try {
    const ledger = await ensureLedger(req.user)
    const participant = ledger.participants.id(req.body.participantId)
    if (!participant) return res.status(404).json({ message: 'Target participant not found.' })
    ledger.participants.forEach((item) => {
      item.isPersonalPool = item._id.toString() === participant._id.toString()
    })
    pushLog(ledger, 'profile', `Personal pool reassigned to ${participant.name}.`)
    await ledger.save()
    res.json(await serializeLedger(ledger))
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not reallocate personal pool.' })
  }
}

const getAnalytics = async (req, res) => {
  try {
    const scope = PERIODS[req.query.scope] ? req.query.scope : 'monthly'
    const period = PERIODS[scope]
    const since = new Date()
    since.setDate(since.getDate() - period.days)

    const expenses = await Expense.find({
      ...getExpenseOwnerFilter(req.user.id),
      createdAt: { $gte: since },
    }).sort({ createdAt: 1 })
    const ledger = await ensureLedger(req.user)
    const participantById = new Map(ledger.participants.map((participant) => [participant._id.toString(), participant]))
    const buckets = new Map()
    const spendingByParticipant = new Map()
    const spendingByCategory = new Map()

    expenses.forEach((expense) => {
      const date = new Date(expense.createdAt)
      const key =
        period.unit === 'month'
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : date.toISOString().slice(0, 10)
      const amount = toAmount(expense.amount) || 0
      const participant =
        participantById.get(expense.participantId?.toString()) ||
        ledger.participants.find((item) => item.name === expense.sharedUser) ||
        ledger.participants.find((item) => item.isPersonalPool)
      const participantName = participant?.name || 'Unassigned'

      const bucket = buckets.get(key) || { label: key, spending: 0, depletion: 0 }
      bucket.spending += amount
      bucket.depletion -= amount
      buckets.set(key, bucket)
      spendingByParticipant.set(participantName, (spendingByParticipant.get(participantName) || 0) + amount)
      spendingByCategory.set(expense.category || 'Other', (spendingByCategory.get(expense.category || 'Other') || 0) + amount)
    })

    await recalculateLedger(ledger)
    const metrics = await buildVaultMetrics(ledger)
    const totalInitial = ledger.participants.reduce((sum, participant) => sum + (toAmount(participant.initialShare) || 0), 0)
    const totalSpent = expenses.reduce((sum, expense) => sum + (toAmount(expense.amount) || 0), 0)

    res.json({
      scope,
      chart: Array.from(buckets.values()),
      macroMetrics: {
        totalEscrow: totalInitial,
        totalSpent,
        currentBalance: metrics.totalVaultLiquidity,
        activeParticipants: ledger.participants.filter((participant) => !participant.hidden).length,
        totalVaultLiquidity: metrics.totalVaultLiquidity,
        myPersonalPoolBalance: metrics.myPersonalPoolBalance,
        escrowGroupCapital: metrics.escrowGroupCapital,
      },
      spendingByParticipant: Array.from(spendingByParticipant, ([name, value]) => ({ name, value })),
      spendingByCategory: Array.from(spendingByCategory, ([name, value]) => ({ name, value })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not load analytics.' })
  }
}

const addAssistantCorrection = async (req, res) => {
  try {
    const ledger = await ensureLedger(req.user)
    if (typeof req.body.correction === 'string' && req.body.correction.trim()) {
      ledger.assistantMemory.corrections.unshift(req.body.correction.trim())
      ledger.assistantMemory.corrections = ledger.assistantMemory.corrections.slice(0, 25)
      pushLog(ledger, 'assistant', 'Assistant correction saved.')
      await ledger.save()
    }
    res.json(await serializeLedger(ledger))
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not save assistant correction.' })
  }
}

const getAssistantContext = async (req, res) => {
  try {
    const ledger = await ensureLedger(req.user)
    const expenses = await Expense.find(getExpenseOwnerFilter(req.user.id)).sort({ createdAt: -1 }).limit(80)
    const analyticsReq = { ...req, query: { scope: 'monthly' } }
    const context = {
      ledger: await serializeLedger(ledger),
      recentTransactions: expenses,
      activeVariables: {
        participants: ledger.participants.length,
        hiddenProfiles: ledger.participants.filter((participant) => participant.hidden).length,
        categories: [...SYSTEM_CATEGORIES, ...ledger.customCategories],
      },
      sessionLearning: ledger.assistantMemory,
    }

    res.json(context)
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not build assistant context.' })
  }
}

const askAssistant = async (req, res) => {
  try {
    const ledger = await ensureLedger(req.user)
    const expenses = await Expense.find(getExpenseOwnerFilter(req.user.id)).sort({ createdAt: -1 })
    const query = String(req.body.query || '').trim()
    const normalized = query.toLowerCase()

    if (!query) {
      return res.status(400).json({ message: 'Ask a question first.' })
    }

    await recalculateLedger(ledger)
    const metrics = await buildVaultMetrics(ledger)
    const totalEscrow = ledger.participants.reduce((sum, participant) => sum + (toAmount(participant.initialShare) || 0), 0)
    const totalSpent = expenses.reduce((sum, expense) => sum + (toAmount(expense.amount) || 0), 0)
    const balance = metrics.totalVaultLiquidity
    const participant = ledger.participants.find((item) => normalized.includes(item.name.toLowerCase()))
    const visibleParticipants = ledger.participants.filter((item) => !item.hidden)
    const hiddenParticipants = ledger.participants.filter((item) => item.hidden)
    const spendRows = ledger.participants
      .map((item) => ({
        name: displayName(item.name),
        spent: participantSpend(item, expenses),
        balance: toAmount(item.currentBalance) || 0,
        hidden: item.hidden,
      }))
      .sort((a, b) => b.spent - a.spent)
    let answer = ''

    if (participant) {
      const spent = participantSpend(participant, expenses)
      answer = `${displayName(participant.name)}: added ${formatMoney(participant.initialShare)}, spent ${formatMoney(spent)}, balance ${formatMoney(participant.currentBalance)}.${participant.hidden ? ' This person is hidden. Open Settings to show them again.' : ''}`
    } else if (normalized.includes('hidden') || normalized.includes('hide') || normalized.includes('show')) {
      answer = hiddenParticipants.length
        ? `Hidden people: ${hiddenParticipants.map((item) => displayName(item.name)).join(', ')}. Open Settings and press Show to bring them back.`
        : 'No one is hidden right now.'
    } else if (normalized.includes('low') || normalized.includes('empty') || normalized.includes('warning')) {
      const low = visibleParticipants.filter((item) => (toAmount(item.currentBalance) || 0) <= 0)
      answer = low.length
        ? `Low balance: ${low.map((item) => `${displayName(item.name)} (${formatMoney(item.currentBalance)})`).join(', ')}.`
        : 'All visible people have money left.'
    } else if (normalized.includes('top') || normalized.includes('highest') || normalized.includes('most')) {
      const top = spendRows.find((row) => row.spent > 0)
      answer = top
        ? `Top spender is ${top.name} with ${formatMoney(top.spent)} spent. Current balance: ${formatMoney(top.balance)}.`
        : 'No spending yet.'
    } else if (normalized.includes('category')) {
      const categoryTotals = new Map()
      expenses.forEach((expense) => {
        const category = String(expense.category || 'Other').trim() || 'Other'
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + (toAmount(expense.amount) || 0))
      })
      const rows = Array.from(categoryTotals, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
      answer = rows.length
        ? `Category spending: ${rows.slice(0, 5).map((row) => `${row.name} ${formatMoney(row.value)}`).join(', ')}.`
        : 'No category spending yet.'
    } else if (normalized.includes('transaction') || normalized.includes('recent')) {
      answer = expenses.length
        ? `Recent transactions: ${expenses.slice(0, 5).map((expense) => `${expense.title || 'Untitled'} ${formatMoney(expense.amount)} from ${displayName(expensePoolName(expense))}`).join(', ')}.`
        : 'No transactions yet.'
    } else if (normalized.includes('balance') || normalized.includes('summary') || normalized.includes('audit') || normalized.includes('status') || normalized.includes('money')) {
      answer = `Summary: total money ${formatMoney(balance)}, my balance ${formatMoney(metrics.myPersonalPoolBalance)}, others balance ${formatMoney(metrics.escrowGroupCapital)}, spent ${formatMoney(totalSpent)}. Visible people: ${visibleParticipants.length}. Hidden: ${hiddenParticipants.length}.`
    } else if (normalized.includes('user') || normalized.includes('participant') || normalized.includes('person') || normalized.includes('people')) {
      answer = visibleParticipants.length
        ? `Visible people: ${visibleParticipants.map((item) => `${displayName(item.name)} (${formatMoney(item.currentBalance)})`).join(', ')}.${hiddenParticipants.length ? ` Hidden: ${hiddenParticipants.length}.` : ''}`
        : 'No visible people yet. Add someone from People.'
    } else if (normalized.includes('pdf') || normalized.includes('download')) {
      answer = 'Open Transactions and click Download PDF.'
    } else if (normalized.includes('help') || normalized.includes('what')) {
      answer = 'You can ask: total money, my balance, hidden people, top spender, recent transactions, category spending, or any person name.'
    } else {
      const top = spendRows.find((row) => row.spent > 0)
      answer = top
        ? `Current status: total money ${formatMoney(balance)}, total spent ${formatMoney(totalSpent)}, top spender ${top.name} at ${formatMoney(top.spent)}.`
        : `Current status: total money ${formatMoney(balance)}. Add transactions to see spending insights.`
    }

    ledger.logs.unshift({ type: 'assistant', message: `Assistant answered: ${query.slice(0, 80)}` })
    ledger.logs = ledger.logs.slice(0, 120)
    await ledger.save()

    res.json({ answer })
  } catch (error) {
    res.status(500).json({ message: error.message || 'Assistant could not answer right now.' })
  }
}

module.exports = {
  SYSTEM_CATEGORIES,
  addAssistantCorrection,
  addParticipant,
  askAssistant,
  getAnalytics,
  getAssistantContext,
  getLedger,
  reallocatePersonalPool,
  removeParticipant,
  updateLedger,
  updateParticipant,
}
