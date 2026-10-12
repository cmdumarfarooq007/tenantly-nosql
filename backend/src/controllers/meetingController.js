const Meeting = require('../models/Meeting');
const Tenant = require('../models/Tenant');
const logAction = require('../utils/auditLogger');
const eventBus = require('../utils/eventBus');
const { getCache, setCache, deleteCachePattern } = require('../config/redis');

exports.getMeetings = async (req, res) => {
  const startTime = Date.now();
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const { status } = req.query;

    const cacheKey = `meetings:workspace:${tenantId || 'all'}:${status || 'all'}`;

    const shouldSkipCache = req.query.skipCache === 'true' || req.headers['x-skip-cache'] === 'true';

    // 1. Check Redis Cache (unless skipped)
    if (!shouldSkipCache) {
      const cached = await getCache(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Source', 'Redis');
        res.setHeader('X-Response-Time', `${duration}ms`);
        return res.json({
          success: true,
          data: cached,
          source: 'redis',
          cache: 'HIT',
          responseTimeMs: duration,
          cacheKey
        });
      }
    }

    const query = {};
    if (tenantId) {
      query.tenant_id = tenantId;
    } else if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (status) query.status = status;

    const meetings = await Meeting.find(query)
      .populate('client_id', 'name company_name email')
      .populate('created_by', 'full_name email role')
      .populate('attendees', 'full_name email role')
      .sort({ start_time: 1 });

    // Cache in Redis (unless skipped)
    if (!shouldSkipCache) {
      await setCache(cacheKey, meetings);

      const duration = Date.now() - startTime;
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Source', 'MongoDB');
      res.setHeader('X-Response-Time', `${duration}ms`);

      return res.json({
        success: true,
        data: meetings,
        source: 'mongodb',
        cache: 'MISS',
        responseTimeMs: duration,
        cacheKey
      });
    }

    return res.json({
      success: true,
      data: meetings,
      source: 'mongodb'
    });
  } catch (error) {
    console.error('getMeetings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMeetingById = async (req, res) => {
  const startTime = Date.now();
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const { id } = req.params;

    const cacheKey = `meeting:detail:${tenantId || 'global'}:${id}`;

    // 1. Check Redis Cache
    const cached = await getCache(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Source', 'Redis');
      res.setHeader('X-Response-Time', `${duration}ms`);
      return res.json({
        success: true,
        data: cached,
        source: 'redis',
        cache: 'HIT',
        responseTimeMs: duration,
        cacheKey
      });
    }

    const query = { _id: id };
    if (tenantId && req.user?.role !== 'super_admin') {
      query.tenant_id = tenantId;
    }

    const meeting = await Meeting.findOne(query)
      .populate('client_id', 'name company_name email phone')
      .populate('created_by', 'full_name email role')
      .populate('attendees', 'full_name email role');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Cache in Redis
    await setCache(cacheKey, meeting);

    const duration = Date.now() - startTime;
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Source', 'MongoDB');
    res.setHeader('X-Response-Time', `${duration}ms`);

    res.json({
      success: true,
      data: meeting,
      source: 'mongodb',
      cache: 'MISS',
      responseTimeMs: duration,
      cacheKey
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createMeeting = async (req, res) => {
  // Strict role check: No employee can create a meeting except manager, tenant admin, or super admin
  const allowedRoles = ['tenant_admin', 'manager', 'super_admin'];
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Regular employees cannot schedule meetings. Only Managers and Tenant Admins have permission.'
    });
  }
  try {
    let tenantId = req.user?.tenantId || req.user?.tenant_id;
    if (!tenantId && req.user?.role === 'super_admin') {
      tenantId = req.body.tenantId || req.body.tenant_id;
      if (!tenantId) {
        const firstTenant = await Tenant.findOne();
        if (firstTenant) tenantId = firstTenant._id;
      }
    }

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant ID is required' });
    }

    const userId = req.user.userId;
    const { title, description, agenda, startTime, endTime, durationMinutes, meetingLink, clientId, attendees } = req.body;

    const meeting = await Meeting.create({
      tenant_id: tenantId,
      client_id: clientId || null,
      title,
      description,
      agenda,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes || 60,
      meeting_link: meetingLink,
      created_by: userId,
      attendees: attendees || [userId]
    });

    logAction(tenantId, userId, 'CREATE_MEETING', 'meeting', meeting._id, req.ip);
    eventBus.emit('meetingCreated', { tenantId, userId, meeting, ipAddress: req.ip });

    // Invalidate Redis cache for meetings and client details
    await deleteCachePattern(`meetings:workspace:${tenantId}:*`);
    await deleteCachePattern(`meeting:detail:*`);
    await deleteCachePattern(`client:detail:*`);

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('client_id', 'name company_name')
      .populate('created_by', 'full_name email')
      .populate('attendees', 'full_name email role');

    res.status(201).json({ success: true, data: populatedMeeting });
  } catch (error) {
    console.error('createMeeting error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMeeting = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const userId = req.user.userId;
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.startTime) updateData.start_time = updateData.startTime;
    if (updateData.endTime) updateData.end_time = updateData.endTime;
    if (updateData.meetingLink) updateData.meeting_link = updateData.meetingLink;
    if (updateData.clientId) updateData.client_id = updateData.clientId;

    const query = { _id: id };
    if (tenantId && req.user?.role !== 'super_admin') {
      query.tenant_id = tenantId;
    }

    const meeting = await Meeting.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    ).populate('client_id', 'name company_name')
     .populate('attendees', 'full_name email role');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    logAction(meeting.tenant_id, userId, 'UPDATE_MEETING', 'meeting', id, req.ip);

    // Invalidate Redis cache for meetings and client details
    await deleteCachePattern(`meetings:workspace:${meeting.tenant_id}:*`);
    await deleteCachePattern(`meeting:detail:*`);
    await deleteCachePattern(`client:detail:*`);

    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const userId = req.user.userId;
    const { id } = req.params;

    const query = { _id: id };
    if (tenantId && req.user?.role !== 'super_admin') {
      query.tenant_id = tenantId;
    }

    const meeting = await Meeting.findOneAndDelete(query);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    logAction(meeting.tenant_id, userId, 'DELETE_MEETING', 'meeting', id, req.ip);

    // Invalidate Redis cache for meetings and client details
    await deleteCachePattern(`meetings:workspace:${meeting.tenant_id}:*`);
    await deleteCachePattern(`meeting:detail:*`);
    await deleteCachePattern(`client:detail:*`);

    res.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
