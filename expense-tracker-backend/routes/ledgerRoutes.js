const express = require('express')
const router = express.Router()
const {
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
} = require('../controllers/ledgerController')
const { protect } = require('../middleware/authMiddleware')

router.use(protect)

router.route('/').get(getLedger).put(updateLedger)
router.get('/analytics', getAnalytics)
router.get('/assistant-context', getAssistantContext)
router.post('/assistant-query', askAssistant)
router.post('/assistant-corrections', addAssistantCorrection)
router.post('/participants', addParticipant)
router.patch('/participants/reallocate-personal-pool', reallocatePersonalPool)
router.route('/participants/:id').patch(updateParticipant).delete(removeParticipant)

module.exports = router
