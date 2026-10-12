const Project = require('../models/Project');
const Tenant = require('../models/Tenant');
const Task = require('../models/Task');
const User = require('../models/User');
const logAction = require('../utils/auditLogger');
const eventBus = require('../utils/eventBus');
const { exportDataToJsonFile, cleanupExportFile } = require('../utils/fileExporter');
const { getCache, setCache, deleteCachePattern } = require('../config/redis');

// API 12: Create Project (Restricted for Employees/Standard Users)
exports.createProject = async (req, res) => {
    const { name, description, status, assignedMembers, clientId, startDate, endDate, priority, budget, category } = req.body;
    const { tenantId, userId, role } = req.user;

    // Strict Role Check: Managers and Standard Employees cannot create projects
    if (role === 'user' || role === 'employee' || role === 'manager') {
        return res.status(403).json({
            success: false,
            message: 'Access Denied: Managers and Employees cannot create projects. Only Tenant Admins and Super Admins have permission to create projects.'
        });
    }

    try {
        // 1. Check Subscription Limits
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

        const currentProjects = await Project.countDocuments({ tenant_id: tenantId });
        if (currentProjects >= tenant.max_projects) {
            return res.status(403).json({ success: false, message: 'Subscription project limit reached' });
        }

        // 2. Create Project
        const newProject = await Project.create({
            tenant_id: tenantId,
            name,
            description,
            status: status || 'active',
            client_id: clientId || null,
            start_date: startDate ? new Date(startDate) : null,
            end_date: endDate ? new Date(endDate) : null,
            priority: priority || 'medium',
            budget: budget ? Number(budget) : 0,
            category: category || 'General',
            created_by: userId,
            assigned_members: assignedMembers || []
        });

        // Emit real application event via Node EventEmitter
        eventBus.emit('projectCreated', { tenantId, userId, project: newProject, ipAddress: req.ip });

        // Invalidate Redis cache for projects and tenant statistics
        await deleteCachePattern(`projects:${tenantId}:*`);
        await deleteCachePattern(`tenant_stats:${tenantId}:*`);

        res.status(201).json({
            success: true,
            data: newProject
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 13: List Projects (Employees only see projects they are assigned to)
exports.listProjects = async (req, res) => {
    const startTime = performance.now();
    const { tenantId, userId, role } = req.user;
    const { status, search, page = 1, limit = 20 } = req.query;

    const cacheKey = `projects:${tenantId || 'all'}:${role}:${role === 'employee' ? userId : 'all'}:${status || ''}:${search || ''}:${page}:${limit}`;

    const shouldSkipCache = req.query.skipCache === 'true' || req.headers['x-skip-cache'] === 'true';

    try {
        // 1. Check Redis Cache First (unless skipped)
        if (!shouldSkipCache) {
            const cachedData = await getCache(cacheKey);
            if (cachedData) {
                const duration = parseFloat((performance.now() - startTime).toFixed(2));
                console.log(`⚡ [Redis Cache HIT] projects for tenant: ${tenantId} (${duration}ms)`);
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('X-Source', 'Redis');
                res.setHeader('X-Response-Time', `${duration}ms`);
                return res.status(200).json({
                    success: true,
                    data: cachedData,
                    source: 'redis',
                    cache: 'HIT',
                    responseTimeMs: duration,
                    cacheKey
                });
            }
        }

        console.log(`🔍 [Redis Cache MISS] projects for tenant: ${tenantId} -> querying MongoDB`);
        res.setHeader('X-Cache', 'MISS');

        const query = { tenant_id: tenantId };
        if (status) query.status = status;
        if (search) query.name = { $regex: search, $options: 'i' };

        // For Employee / Standard User: ONLY show projects they are assigned to
        if (role === 'employee') {
            const assignedProjectIdsFromTasks = await Task.distinct('project_id', {
                tenant_id: tenantId,
                assigned_to: userId
            });

            // Include projects where employee has assigned tasks, is in assigned_members, or created the project
            query.$or = [
                { _id: { $in: assignedProjectIdsFromTasks } },
                { assigned_members: userId },
                { created_by: userId }
            ];
        }

        const total = await Project.countDocuments(query);
        const projects = await Project.find(query)
            .populate('created_by', 'full_name').populate('client_id', 'name company')
            .populate('assigned_members', 'full_name email role')
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Format projects with task counts for frontend parity
        const formattedProjects = await Promise.all(
            projects.map(async (p) => {
                const taskCount = await Task.countDocuments({ project_id: p._id });
                const completedTaskCount = await Task.countDocuments({ project_id: p._id, status: 'completed' });

                return {
                    id: p._id.toString(),
                    name: p.name,
                    description: p.description,
                    status: p.status,
                    startDate: p.start_date,
                    endDate: p.end_date,
                    priority: p.priority || 'medium',
                    budget: p.budget || 0,
                    category: p.category || 'General',
                    clientId: p.client_id ? (p.client_id._id ? p.client_id._id.toString() : p.client_id.toString()) : null,
                    client: p.client_id && typeof p.client_id === 'object' ? {
                        id: p.client_id._id?.toString(),
                        name: p.client_id.name,
                        company: p.client_id.company
                    } : null,
                    createdBy: {
                        id: p.created_by ? p.created_by._id.toString() : null,
                        fullName: p.created_by ? p.created_by.full_name : 'Unknown'
                    },
                    assignedMembers: p.assigned_members ? p.assigned_members.map(m => ({
                        id: m._id.toString(),
                        fullName: m.full_name,
                        email: m.email,
                        role: m.role
                    })) : [],
                    taskCount,
                    completedTaskCount,
                    createdAt: p.created_at
                };
            })
        );

        const responsePayload = {
            projects: formattedProjects,
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

            const duration = parseFloat((performance.now() - startTime).toFixed(2));
            console.log(`🔍 [Redis Cache MISS -> Saved to Redis] (${duration}ms)`);
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

// API 14: Update Project
exports.updateProject = async (req, res) => {
    const { projectId } = req.params;
    const { name, description, status, assignedMembers, clientId, startDate, endDate, priority, budget, category } = req.body;
    const { tenantId, userId, role } = req.user;

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        if (project.tenant_id.toString() !== tenantId && role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (role !== 'tenant_admin' && project.created_by.toString() !== userId && role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Only admin or creator can update' });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (status) updateData.status = status;
        if (assignedMembers !== undefined) updateData.assigned_members = assignedMembers;
        if (clientId !== undefined) updateData.client_id = clientId || null;
        if (startDate !== undefined) updateData.start_date = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.end_date = endDate ? new Date(endDate) : null;
        if (priority) updateData.priority = priority;
        if (budget !== undefined) updateData.budget = budget ? Number(budget) : 0;
        if (category !== undefined) updateData.category = category;

        const updatedProject = await Project.findByIdAndUpdate(projectId, { $set: updateData }, { new: true });

        // Invalidate Redis cache for projects, project detail, and tenant stats
        await deleteCachePattern(`projects:${tenantId}:*`);
        await deleteCachePattern(`project:detail:${tenantId}:${projectId}*`);
        await deleteCachePattern(`tenant_stats:${tenantId}:*`);

        logAction(tenantId, userId, 'UPDATE_PROJECT', 'project', projectId, req.ip);
        eventBus.emit('projectUpdated', { tenantId, userId, projectId, projectName: updatedProject.name, ipAddress: req.ip });

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: updatedProject
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 15: Delete Project
exports.deleteProject = async (req, res) => {
    const { projectId } = req.params;
    const { tenantId, userId, role } = req.user;

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        if (project.tenant_id.toString() !== tenantId && role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (role !== 'tenant_admin' && project.created_by.toString() !== userId && role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Only admin or creator can delete' });
        }

        await Task.deleteMany({ project_id: projectId });
        await Project.findByIdAndDelete(projectId);

        // Invalidate Redis cache for projects, project detail, tasks, and tenant stats
        await deleteCachePattern(`projects:${tenantId}:*`);
        await deleteCachePattern(`project:detail:${tenantId}:${projectId}*`);
        await deleteCachePattern(`tasks:project:${tenantId}:${projectId}*`);
        await deleteCachePattern(`tenant_stats:${tenantId}:*`);

        logAction(tenantId, userId, 'DELETE_PROJECT', 'project', projectId, req.ip);
        eventBus.emit('projectDeleted', { tenantId, userId, projectId, projectName: project.name, ipAddress: req.ip });

        res.status(200).json({ success: true, message: 'Project deleted successfully' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Single Project (Enforce assignment check for Employees with Redis Cache)
exports.getProject = async (req, res) => {
    const startTime = Date.now();
    try {
        const { projectId } = req.params;
        const { tenantId, userId, role } = req.user;

        const cacheKey = `project:detail:${tenantId}:${projectId}`;

        // 1. Try fetching from Redis Key-Value Store
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

        // 2. Cache MISS: Query MongoDB Document Store
        const project = await Project.findOne({ _id: projectId, tenant_id: tenantId })
            .populate('created_by', 'full_name')
            .populate('client_id', 'name company')
            .populate('assigned_members', 'full_name email role');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // For Employee / Standard User: Verify they are assigned to at least 1 task or created it
        if (role === 'employee') {
            const hasTaskInProject = await Task.exists({
                project_id: projectId,
                tenant_id: tenantId,
                assigned_to: userId
            });

            const isCreator = project.created_by && project.created_by.toString() === userId;

            if (!hasTaskInProject && !isCreator) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied: You are not assigned to any tasks in this project.'
                });
            }
        }

        const projectPayload = {
            projects: [project]
        };

        // 3. Store in Redis (uses REDIS_TTL from .env)
        await setCache(cacheKey, projectPayload);


        const duration = Date.now() - startTime;
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Source', 'MongoDB');
        res.setHeader('X-Response-Time', `${duration}ms`);

        res.status(200).json({
            success: true,
            data: projectPayload,
            source: 'mongodb',
            cache: 'MISS',
            responseTimeMs: duration,
            cacheKey
        });

    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ success: false, message: 'Server error fetching project' });
    }
};

// Export Projects to structured JSON file using Node.js fs callbacks
exports.exportProjects = async (req, res) => {
    try {
        const userRole = req.user?.role;
        if (userRole !== 'tenant_admin' && userRole !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access Denied: Only Tenant Admins and Super Admins can export project data.' });
        }

        const tenantId = req.user?.tenantId || req.user?.tenant_id;
        const query = {};
        if (tenantId) query.tenant_id = tenantId;

        const projects = await Project.find(query).populate('client_id', 'name').lean();
        const filename = `projects_workspace_${tenantId || 'all'}`;

        exportDataToJsonFile(filename, projects, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Export failed: ' + err.message });
            }

            res.download(result.filePath, `${filename}.json`, (downloadErr) => {
                cleanupExportFile(result.filePath);
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};