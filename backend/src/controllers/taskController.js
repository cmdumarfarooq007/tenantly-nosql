const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const logAction = require('../utils/auditLogger');
const eventBus = require('../utils/eventBus');
const { getCache, setCache, deleteCachePattern } = require('../config/redis');

// API 16: Create Task
exports.createTask = async (req, res) => {
    const { projectId } = req.params;
    const { title, description, assignedTo, priority, dueDate } = req.body;
    const { tenantId, userId, role } = req.user;

    // Permission Check: Standard Employees cannot create new tasks
    if (!['tenant_admin', 'manager', 'super_admin'].includes(role)) {
        return res.status(403).json({ 
            success: false, 
            message: 'Access Denied: Standard Employees cannot create tasks. Only Tenant Admins, Managers, and Super Admins can add tasks.' 
        });
    }

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        if (project.tenant_id.toString() !== tenantId) {
            return res.status(403).json({ success: false, message: 'Unauthorized project access' });
        }

        if (assignedTo) {
            const assignedUser = await User.findById(assignedTo);
            if (!assignedUser || assignedUser.tenant_id.toString() !== tenantId) {
                return res.status(400).json({ success: false, message: 'Assigned user does not belong to this organization' });
            }
        }

        const task = await Task.create({
            project_id: projectId,
            tenant_id: tenantId,
            title,
            description,
            status: 'todo',
            priority: priority || 'medium',
            assigned_to: assignedTo || null,
            due_date: dueDate || null
        });

        // Emit real application event via Node EventEmitter
        eventBus.emit('taskCreated', { tenantId, userId, task, ipAddress: req.ip });

        // Invalidate Redis cache for project tasks, workspace tasks, and details
        await deleteCachePattern(`tasks:project:${tenantId}:${projectId}*`);
        await deleteCachePattern(`tasks:workspace:${tenantId}:*`);
        await deleteCachePattern(`project:detail:${tenantId}:${projectId}*`);
        await deleteCachePattern(`tenant_stats:${tenantId}:*`);

        res.status(201).json({
            success: true,
            data: task
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 17: List Project Tasks (Single Specific Project with Redis Caching)
exports.listTasks = async (req, res) => {
    const startTime = Date.now();
    const { projectId } = req.params;
    const { tenantId } = req.user;
    const { status, priority, assignedTo, search, page = 1, limit = 50 } = req.query;

    try {
        const cacheKey = `tasks:project:${tenantId}:${projectId}:${status || 'all'}:${priority || 'all'}:${assignedTo || 'all'}:${search || ''}:${page}:${limit}`;

        // 1. Check Redis Cache
        const cached = await getCache(cacheKey);
        if (cached) {
            const duration = Date.now() - startTime;
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('X-Source', 'Redis');
            res.setHeader('X-Response-Time', `${duration}ms`);
            return res.status(200).json({
                success: true,
                data: cached,
                source: 'redis',
                cache: 'HIT',
                responseTimeMs: duration,
                cacheKey
            });
        }

        // 2. Cache MISS: Query MongoDB
        const project = await Project.findById(projectId);
        if (!project || project.tenant_id.toString() !== tenantId) {
            return res.status(403).json({ success: false, message: 'Unauthorized or project not found' });
        }

        const query = { project_id: projectId, tenant_id: tenantId };
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignedTo) query.assigned_to = assignedTo;
        if (search) query.title = { $regex: search, $options: 'i' };

        const total = await Task.countDocuments(query);
        const tasks = await Task.find(query)
            .populate('assigned_to', 'full_name email')
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const formattedTasks = tasks.map(t => ({
            id: t._id.toString(),
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            assignedTo: t.assigned_to ? {
                id: t.assigned_to._id.toString(),
                fullName: t.assigned_to.full_name,
                email: t.assigned_to.email
            } : null,
            dueDate: t.due_date,
            createdAt: t.created_at
        }));

        const responsePayload = {
            tasks: formattedTasks,
            total,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        };

        // 3. Store in Redis (uses REDIS_TTL from .env)
        await setCache(cacheKey, responsePayload);


        const duration = Date.now() - startTime;
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Source', 'MongoDB');
        res.setHeader('X-Response-Time', `${duration}ms`);

        res.status(200).json({
            success: true,
            data: responsePayload,
            source: 'mongodb',
            cache: 'MISS',
            responseTimeMs: duration,
            cacheKey
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 17b: List ALL Tasks Across All Workspace Projects (Dashboard)
exports.listAllWorkspaceTasks = async (req, res) => {
    const startTime = Date.now();
    const { tenantId } = req.user;
    const { status, priority, assignedTo, search, page = 1, limit = 100 } = req.query;

    const shouldSkipCache = req.query.skipCache === 'true' || req.headers['x-skip-cache'] === 'true';

    try {
        const cacheKey = `tasks:workspace:${tenantId}:${status || 'all'}:${priority || 'all'}:${assignedTo || 'all'}:${search || ''}:${page}:${limit}`;

        // 1. Check Redis Cache (unless skipped)
        if (!shouldSkipCache) {
            const cached = await getCache(cacheKey);
            if (cached) {
                const duration = Date.now() - startTime;
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('X-Source', 'Redis');
                res.setHeader('X-Response-Time', `${duration}ms`);
                return res.status(200).json({
                    success: true,
                    data: cached,
                    source: 'redis',
                    cache: 'HIT',
                    responseTimeMs: duration,
                    cacheKey
                });
            }
        }

        const query = { tenant_id: tenantId };
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignedTo) query.assigned_to = assignedTo;
        if (search) query.title = { $regex: search, $options: 'i' };

        const total = await Task.countDocuments(query);
        const tasks = await Task.find(query)
            .populate('project_id', 'name')
            .populate('assigned_to', 'full_name email')
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const formattedTasks = tasks.map(t => ({
            id: t._id.toString(),
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            projectId: t.project_id ? t.project_id._id.toString() : null,
            projectName: t.project_id ? t.project_id.name : 'Unknown Project',
            assignedTo: t.assigned_to ? {
                id: t.assigned_to._id.toString(),
                fullName: t.assigned_to.full_name,
                email: t.assigned_to.email
            } : null,
            dueDate: t.due_date,
            createdAt: t.created_at
        }));

        const responsePayload = {
            tasks: formattedTasks,
            total,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        };

        // Cache in Redis (unless skipped)
        if (!shouldSkipCache) {
            await setCache(cacheKey, responsePayload);

            const duration = Date.now() - startTime;
            res.setHeader('X-Cache', 'MISS');
            res.setHeader('X-Source', 'MongoDB');
            res.setHeader('X-Response-Time', `${duration}ms`);

            return res.status(200).json({
                success: true,
                data: responsePayload,
                source: 'mongodb',
                cache: 'MISS',
                responseTimeMs: duration,
                cacheKey
            });
        }

        return res.status(200).json({
            success: true,
            data: responsePayload,
            source: 'mongodb'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 18: Update Task Status
exports.updateTaskStatus = async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;
    const { tenantId } = req.user;

    if (!['todo', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    try {
        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, tenant_id: tenantId },
            { $set: { status } },
            { new: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Invalidate Redis cache for project tasks, workspace tasks, and details
        await deleteCachePattern(`tasks:project:${tenantId}:*`);
        await deleteCachePattern(`tasks:workspace:${tenantId}:*`);
        await deleteCachePattern(`project:detail:${tenantId}:*`);
        await deleteCachePattern(`tenant_stats:${tenantId}:*`);

        eventBus.emit('taskUpdated', {
            tenantId,
            userId: req.user.userId,
            taskId: updatedTask._id,
            taskTitle: updatedTask.title,
            status,
            ipAddress: req.ip
        });

        res.status(200).json({ success: true, data: updatedTask });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 19: Update Task (Full)
exports.updateTask = async (req, res) => {
    const { taskId } = req.params;
    const { title, description, status, priority, assignedTo, dueDate } = req.body;
    const { tenantId, userId, role } = req.user;

    // Permission Check: Employees cannot edit task details. Only Managers and Tenant Admins can edit task details.
    if (!['tenant_admin', 'manager', 'super_admin'].includes(role)) {
        return res.status(403).json({ 
            success: false, 
            message: 'Access Denied: Regular employees cannot edit task details. Only Managers and Tenant Admins have permission.' 
        });
    }

    try {
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        if (task.tenant_id.toString() !== tenantId) return res.status(403).json({ success: false, message: 'Unauthorized' });

        if (assignedTo) {
            const userCheck = await User.findById(assignedTo);
            if (!userCheck || userCheck.tenant_id.toString() !== tenantId) {
                return res.status(400).json({ success: false, message: 'Assigned user invalid' });
            }
        }

        const updateData = {};
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (dueDate !== undefined) updateData.due_date = dueDate;
        if (assignedTo !== undefined) updateData.assigned_to = assignedTo || null;

        const updatedTask = await Task.findByIdAndUpdate(taskId, { $set: updateData }, { new: true }).populate('assigned_to', 'full_name email');

        // Invalidate Redis cache for project tasks, workspace tasks, and details
        await deleteCachePattern(`tasks:project:${tenantId}:*`);
        await deleteCachePattern(`tasks:workspace:${tenantId}:*`);
        await deleteCachePattern(`project:detail:${tenantId}:*`);
        await deleteCachePattern(`tenant_stats:${tenantId}:*`);

        logAction(tenantId, userId, 'UPDATE_TASK', 'task', taskId, req.ip);
        eventBus.emit('taskUpdated', {
            tenantId,
            userId,
            taskId,
            taskTitle: updatedTask.title,
            status: updatedTask.status,
            priority: updatedTask.priority,
            ipAddress: req.ip
        });

        const data = updatedTask.toObject();
        data.assignedTo = updatedTask.assigned_to ? {
            id: updatedTask.assigned_to._id.toString(),
            fullName: updatedTask.assigned_to.full_name,
            email: updatedTask.assigned_to.email
        } : null;

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 20: Delete Task
exports.deleteTask = async (req, res) => {
    const { taskId } = req.params;
    const { tenantId, userId, role } = req.user;

    try {
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        if (task.tenant_id.toString() !== tenantId && role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await Task.findByIdAndDelete(taskId);

        // Invalidate Redis cache
        await deleteCachePattern(`tasks:project:${tenantId}:*`);
        await deleteCachePattern(`tasks:workspace:${tenantId}:*`);
        await deleteCachePattern(`project:detail:${tenantId}:*`);
        await deleteCachePattern(`tenant_stats:${tenantId}:*`);

        logAction(tenantId, userId, 'DELETE_TASK', 'task', taskId, req.ip);
        eventBus.emit('taskDeleted', {
            tenantId,
            userId,
            taskId,
            taskTitle: task.title,
            ipAddress: req.ip
        });

        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};