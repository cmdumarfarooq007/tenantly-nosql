const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Task = require('../models/Task');
const bcrypt = require('bcryptjs');
const logAction = require('../utils/auditLogger');
const { getCache, setCache, deleteCachePattern } = require('../config/redis');

// API 8: Add User to Tenant
exports.addUser = async (req, res) => {
    const { tenantId } = req.params;
    const { email, password, fullName, role } = req.body;

    // Authorization: Only Tenant Admin can add users
    if (req.user.role !== 'tenant_admin' || req.user.tenantId !== tenantId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    try {
        // 1. Check Subscription Limits
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

        const currentUsers = await User.countDocuments({ tenant_id: tenantId });
        if (currentUsers >= tenant.max_users) {
            return res.status(403).json({ success: false, message: 'Subscription user limit reached' });
        }

        // 2. Check if email exists in this tenant
        const existingUser = await User.findOne({ tenant_id: tenantId, email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already exists in this organization' });
        }

        let targetRole = 'employee';
        if (role === 'tenant_admin') targetRole = 'tenant_admin';
        else if (role === 'employee') targetRole = 'employee';

        if (targetRole === 'tenant_admin') {
            const existingAdmin = await User.findOne({ tenant_id: tenantId, role: 'tenant_admin' });
            if (existingAdmin) {
                return res.status(400).json({ success: false, message: 'Only 1 Organization Admin is allowed per organization.' });
            }
        }

        // 3. Create User
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            tenant_id: tenantId,
            email,
            password_hash: hashedPassword,
            full_name: fullName,
            role: targetRole
        });

        // Invalidate Redis cache for employees and tenant stats
        await deleteCachePattern(`employees:${tenantId}*`);
        await deleteCachePattern(`tenant_stats:${tenantId}*`);
        await deleteCachePattern(`tenant_details:${tenantId}*`);

        logAction(tenantId, req.user.userId, 'CREATE_USER', 'employee', newUser._id, req.ip);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: newUser._id,
                email: newUser.email,
                full_name: newUser.full_name,
                role: newUser.role,
                is_active: newUser.is_active,
                created_at: newUser.created_at,
                tenantId
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 9: List Tenant Users (Employees with Redis Caching)
exports.listUsers = async (req, res) => {
    const startTime = Date.now();
    let tenantId = req.params.tenantId || req.user.tenantId;
    const { search, role, page = 1, limit = 100 } = req.query;

    try {
        const cacheKey = `employees:${tenantId || 'all'}:${role || 'all'}:${search || ''}:${page}:${limit}`;

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

        const query = {};
        if (tenantId) {
            query.tenant_id = tenantId;
        } else if (req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (role) query.role = role;
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { full_name: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password_hash')
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const formattedUsers = users.map(u => ({
            id: u._id.toString(),
            email: u.email,
            fullName: u.full_name,
            full_name: u.full_name,
            role: u.role,
            isActive: u.is_active !== false,
            is_active: u.is_active !== false,
            createdAt: u.created_at
        }));

        const responsePayload = {
            users: formattedUsers,
            total,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        };

        // Cache in Redis (uses dynamic TTL)
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

// API 10: Update User
exports.updateUser = async (req, res) => {
    const { userId } = req.params;
    const { fullName, role, isActive } = req.body;

    const isSelf = req.user.userId === userId;
    const isAdmin = req.user.role === 'tenant_admin';

    if (!isSelf && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.tenant_id.toString() !== req.user.tenantId && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized access to other tenant data' });
        }

        const updateData = {};
        if (fullName) updateData.full_name = fullName;

        if (isAdmin) {
            if (role) {
                // Prevent Tenant Admin from changing their own role or demoting the tenant_admin
                if (user.role === 'tenant_admin' && role !== 'tenant_admin') {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Tenant Admin role cannot be changed to prevent organization lockout.' 
                    });
                }
                if (role === 'tenant_admin' && user.role !== 'tenant_admin') {
                    const existingManager = await User.findOne({ tenant_id: user.tenant_id, role: 'tenant_admin', _id: { $ne: userId } });
                    if (existingManager) {
                        return res.status(400).json({ success: false, message: 'Only 1 Manager is allowed per organization.' });
                    }
                }
                updateData.role = role;
            }
            if (isActive !== undefined) {
                // Prevent Tenant Admin from deactivating their own account
                if (isSelf && isActive === false) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Tenant Admin cannot deactivate their own account.' 
                    });
                }
                updateData.is_active = isActive;
            }
        } else if (role || isActive !== undefined) {
            return res.status(403).json({ success: false, message: 'Only admins can change role or status' });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select('-password_hash');

        // Invalidate Redis cache for employees and tenant stats
        await deleteCachePattern(`employees:${req.user.tenantId}*`);
        await deleteCachePattern(`tenant_stats:${req.user.tenantId}*`);

        logAction(req.user.tenantId, req.user.userId, 'UPDATE_USER', 'employee', userId, req.ip);

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 11: Delete User
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;

    if (req.user.role !== 'tenant_admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (req.user.userId === userId) {
        return res.status(403).json({ success: false, message: 'Cannot delete yourself' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.tenant_id.toString() !== req.user.tenantId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Unassign tasks assigned to this user
        await Task.updateMany({ assigned_to: userId }, { $set: { assigned_to: null } });

        // Delete User
        await User.findByIdAndDelete(userId);

        // Invalidate Redis cache for employees, tasks, and tenant stats
        await deleteCachePattern(`employees:${req.user.tenantId}*`);
        await deleteCachePattern(`tasks:workspace:${req.user.tenantId}*`);
        await deleteCachePattern(`tenant_stats:${req.user.tenantId}*`);

        logAction(req.user.tenantId, req.user.userId, 'DELETE_USER', 'employee', userId, req.ip);

        res.status(200).json({ success: true, message: 'User deleted successfully' });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};