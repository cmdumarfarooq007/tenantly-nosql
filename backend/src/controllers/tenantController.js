const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const logAction = require('../utils/auditLogger');
const { getCache, setCache, deleteCachePattern } = require('../config/redis');

// API 5: Get Tenant Details
exports.getTenantDetails = async (req, res) => {
    const { tenantId } = req.params;

    // Security Check: Users can only see their own tenant, unless Super Admin
    const userTenantId = (req.user.tenantId || req.user.tenant_id || '') ? (req.user.tenantId || req.user.tenant_id).toString() : '';
    if (req.user.role !== 'super_admin' && userTenantId !== (tenantId ? tenantId.toString() : '')) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to this tenant' });
    }

    const cacheKey = `tenant_details:${tenantId}`;

    const startTime = Date.now();
    try {
        // 1. Check Redis Cache First
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            const duration = Date.now() - startTime;
            console.log(`⚡ [Redis Cache HIT] details/stats for tenant: ${tenantId} (${duration}ms)`);
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

        console.log(`🔍 [Redis Cache MISS] details/stats for tenant: ${tenantId} -> querying MongoDB`);

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        // Calculate Stats
        const userCount = await User.countDocuments({ tenant_id: tenantId });
        const projectCount = await Project.countDocuments({ tenant_id: tenantId });
        const taskCount = await Task.countDocuments({ tenant_id: tenantId });

        const tenantObj = tenant.toObject();
        tenantObj.stats = {
            totalUsers: userCount,
            totalProjects: projectCount,
            totalTasks: taskCount
        };

        // Cache in Redis (uses REDIS_TTL from .env)
        await setCache(cacheKey, tenantObj);

        const duration = Date.now() - startTime;
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Source', 'MongoDB');
        res.setHeader('X-Response-Time', `${duration}ms`);

        res.status(200).json({
            success: true,
            data: tenantObj,
            source: 'mongodb',
            cache: 'MISS',
            responseTimeMs: duration,
            cacheKey
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 6: Update Tenant
exports.updateTenant = async (req, res) => {
    const { tenantId } = req.params;
    const { 
        name, status, subscriptionPlan, maxUsers, maxProjects,
        logo_url, logoUrl, headline, website, public_email, publicEmail,
        public_phone, publicPhone, location, about 
    } = req.body;
    const { role } = req.user;

    // Authorization: Only Tenant Admin or Super Admin
    if (role !== 'super_admin' && role !== 'tenant_admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Security Check: Tenant Admin can only update their own tenant
    const userTenantId = (req.user.tenantId || req.user.tenant_id || '') ? (req.user.tenantId || req.user.tenant_id).toString() : '';
    if (role === 'tenant_admin' && userTenantId !== (tenantId ? tenantId.toString() : '')) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Security Check: Tenant Admin cannot update system-level plan/limits
    if (role === 'tenant_admin' && (status || subscriptionPlan || maxUsers || maxProjects)) {
        return res.status(403).json({ success: false, message: 'Tenant Admins cannot alter tenant subscription limits' });
    }

    try {
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (logo_url !== undefined) updateData.logo_url = logo_url;
        if (logoUrl !== undefined) updateData.logo_url = logoUrl;
        if (headline !== undefined) updateData.headline = headline;
        if (website !== undefined) updateData.website = website;
        if (public_email !== undefined) updateData.public_email = public_email;
        if (publicEmail !== undefined) updateData.public_email = publicEmail;
        if (public_phone !== undefined) updateData.public_phone = public_phone;
        if (publicPhone !== undefined) updateData.public_phone = publicPhone;
        if (location !== undefined) updateData.location = location;
        if (about !== undefined) updateData.about = about;

        // Only Super Admin can update status, subscriptionPlan, maxUsers, maxProjects
        if (role === 'super_admin') {
            if (status) updateData.status = status;
            if (subscriptionPlan) updateData.subscription_plan = subscriptionPlan;
            if (maxUsers) updateData.max_users = maxUsers;
            if (maxProjects) updateData.max_projects = maxProjects;
        }

        const updatedTenant = await Tenant.findByIdAndUpdate(
            tenantId,
            { $set: updateData },
            { new: true }
        );

        if (!updatedTenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        // Invalidate Redis cache for tenant
        await deleteCachePattern(`tenant_details:${tenantId}*`);
        await deleteCachePattern(`tenants_list*`);

        logAction(tenantId, req.user.userId, 'UPDATE_TENANT', 'tenant', tenantId, req.ip);

        res.status(200).json({
            success: true,
            message: 'Tenant updated successfully',
            data: updatedTenant
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// API 7: List All Tenants (Super Admin Only)
exports.listTenants = async (req, res) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Super Admin only.' });
    }

    const { page = 1, limit = 10, status, subscriptionPlan } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (subscriptionPlan) filter.subscription_plan = subscriptionPlan;

    const cacheKey = `tenants_list:${status || ''}:${subscriptionPlan || ''}:${page}:${limit}`;

    const shouldSkipCache = req.query.skipCache === 'true' || req.headers['x-skip-cache'] === 'true';

    const startTime = Date.now();
    try {
        // 1. Check Redis Cache First (unless skipped)
        if (!shouldSkipCache) {
            const cachedData = await getCache(cacheKey);
            if (cachedData) {
                const duration = Date.now() - startTime;
                console.log(`⚡ [Redis Cache HIT] Super Admin listTenants (${duration}ms)`);
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

        console.log(`🔍 [Redis Cache MISS] Super Admin listTenants -> querying MongoDB`);

        const totalTenants = await Tenant.countDocuments(filter);
        const tenants = await Tenant.find(filter)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const tenantsWithCounts = await Promise.all(
            tenants.map(async (tenant) => {
                const tenantObj = tenant.toObject();
                tenantObj.employeeCount = await User.countDocuments({ tenant_id: tenant._id });
                tenantObj.projectCount = await Project.countDocuments({ tenant_id: tenant._id });
                return tenantObj;
            })
        );

        const responsePayload = {
            tenants: tenantsWithCounts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalTenants / limit),
                totalTenants,
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