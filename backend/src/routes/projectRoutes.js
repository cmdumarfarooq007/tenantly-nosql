const express = require('express');
const router = express.Router();
const { createProject, listProjects, updateProject, deleteProject, getProject, exportProjects } = require('../controllers/projectController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const { check } = require('express-validator');

// Create
router.post('/', 
    verifyToken,
    [check('name', 'Project name is required').not().isEmpty()],
    createProject
);

// List (Get All)
router.get('/', verifyToken, listProjects);

// Export projects as structured JSON file (Tenant Admin & Super Admin Only)
router.get('/export', verifyToken, authorize(['tenant_admin', 'super_admin']), exportProjects);

// Get single project
router.get('/:projectId', verifyToken, getProject);

// Update
router.put('/:projectId', verifyToken, updateProject);

// Delete
router.delete('/:projectId', verifyToken, deleteProject);

module.exports = router;