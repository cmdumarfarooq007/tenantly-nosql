const express = require('express');
const router = express.Router();
const { createTask, listTasks, listAllWorkspaceTasks, updateTaskStatus, updateTask, deleteTask } = require('../controllers/taskController');
const { verifyToken } = require('../middleware/authMiddleware');
const { check } = require('express-validator');

// Create Task (Nested under projects)
router.post('/projects/:projectId/tasks', 
    verifyToken,
    [check('title', 'Title is required').not().isEmpty()],
    createTask
);

// List All Tasks across Workspace
router.get('/tasks', verifyToken, listAllWorkspaceTasks);

// List Tasks (Nested under specific project)
router.get('/projects/:projectId/tasks', verifyToken, listTasks);

// Update Status
router.patch('/tasks/:taskId/status', verifyToken, updateTaskStatus);

// Update Task
router.put('/tasks/:taskId', verifyToken, updateTask);

// Delete Task
router.delete('/tasks/:taskId', verifyToken, deleteTask);

module.exports = router;