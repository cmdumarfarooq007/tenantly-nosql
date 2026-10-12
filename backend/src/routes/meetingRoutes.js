const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getMeetings, getMeetingById, createMeeting, updateMeeting, deleteMeeting
} = require('../controllers/meetingController');

router.use(verifyToken);

router.get('/', getMeetings);
router.get('/:id', getMeetingById);
router.post('/', createMeeting);
router.put('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);

module.exports = router;
