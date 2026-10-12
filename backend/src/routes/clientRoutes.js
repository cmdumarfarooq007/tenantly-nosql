const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const {
  getClients, getClientById, createClient, updateClient, deleteClient, addClientNote, exportClients
} = require('../controllers/clientController');

router.use(verifyToken);

router.get('/export', authorize(['tenant_admin', 'super_admin']), exportClients);
router.get('/', getClients);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', authorize(['tenant_admin', 'super_admin']), deleteClient);
router.post('/:id/notes', addClientNote);

module.exports = router;
