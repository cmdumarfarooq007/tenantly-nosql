const Client = require('../models/Client');
const Project = require('../models/Project');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const Tenant = require('../models/Tenant');
const logAction = require('../utils/auditLogger');
const eventBus = require('../utils/eventBus');
const { exportDataToJsonFile, cleanupExportFile } = require('../utils/fileExporter');
const { getCache, setCache, deleteCachePattern } = require('../config/redis');

exports.getClients = async (req, res) => {
  const startTime = performance.now();
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const cacheKey = `clients:${tenantId || 'all'}`;

    const shouldSkipCache = req.query.skipCache === 'true' || req.headers['x-skip-cache'] === 'true';

    // 1. Check Redis Cache First (unless skipped)
    if (!shouldSkipCache) {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        const duration = parseFloat((performance.now() - startTime).toFixed(2));
        console.log(`⚡ [Redis Cache HIT] clients for tenant: ${tenantId || 'all'} (${duration}ms)`);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Source', 'Redis');
        res.setHeader('X-Response-Time', `${duration}ms`);
        return res.json({ success: true, data: cachedData, source: 'redis', cache: 'HIT', responseTimeMs: duration, cacheKey });
      }
    }

    console.log(`🔍 [Redis Cache MISS] clients for tenant: ${tenantId || 'all'} -> querying MongoDB`);
    res.setHeader('X-Cache', 'MISS');

    const query = {};
    if (tenantId) {
      query.tenant_id = tenantId;
    } else if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const clients = await Client.find(query)
      .populate('assigned_to', 'full_name email role')
      .sort({ created_at: -1 });

    const clientData = await Promise.all(
      clients.map(async (c) => {
        const projectCount = await Project.countDocuments({ client_id: c._id });
        return {
          ...c.toObject(),
          projectCount
        };
      })
    );

    // Cache in Redis (unless skipped)
    if (!shouldSkipCache) {
      await setCache(cacheKey, clientData);

      const duration = parseFloat((performance.now() - startTime).toFixed(2));
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Source', 'MongoDB');
      res.setHeader('X-Response-Time', `${duration}ms`);

      return res.json({ success: true, data: clientData, source: 'mongodb', cache: 'MISS', responseTimeMs: duration, cacheKey });
    }

    return res.json({ success: true, data: clientData, source: 'mongodb' });
  } catch (error) {
    console.error('getClients error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClientById = async (req, res) => {
  const startTime = Date.now();
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const { id } = req.params;

    const cacheKey = `client:detail:${tenantId || 'global'}:${id}`;

    // 1. Check Redis Key-Value Store
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

    // 2. Cache MISS: Query MongoDB Document Store
    const query = { _id: id };
    if (tenantId && req.user?.role !== 'super_admin') {
      query.tenant_id = tenantId;
    }

    const client = await Client.findOne(query)
      .populate('assigned_to', 'full_name email role')
      .populate('notes.author_id', 'full_name email');

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const projects = await Project.find({ client_id: id });
    const meetings = await Meeting.find({ client_id: id })
      .populate('attendees', 'full_name email role');

    const clientPayload = {
      ...client.toObject(),
      projects,
      meetings
    };

    // 3. Store in Redis (uses REDIS_TTL from .env)
    await setCache(cacheKey, clientPayload);


    const duration = Date.now() - startTime;
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Source', 'MongoDB');
    res.setHeader('X-Response-Time', `${duration}ms`);

    res.json({
      success: true,
      data: clientPayload,
      source: 'mongodb',
      cache: 'MISS',
      responseTimeMs: duration,
      cacheKey
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createClient = async (req, res) => {
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

    const { name, companyName, contactPerson, email, phone, location, address, industry, status, allottedBudget, assignedTo, notes } = req.body;

    // --- Robust Backend Validation ---
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Client Name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Client Name must be at least 2 characters long' });
    }
    if (trimmedName.length > 100) {
      return res.status(400).json({ success: false, message: 'Client Name cannot exceed 100 characters' });
    }

    // Check duplicate client name within the tenant
    const existingClient = await Client.findOne({
      tenant_id: tenantId,
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existingClient) {
      return res.status(400).json({ success: false, message: `A client named "${trimmedName}" already exists in your workspace` });
    }

    // Primary Contact Person (Required)
    if (!contactPerson || typeof contactPerson !== 'string' || !contactPerson.trim()) {
      return res.status(400).json({ success: false, message: 'Primary contact person is required' });
    }

    // Email validation (Required)
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    let cleanEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address (e.g., client@domain.com)' });
    }

    // Phone validation (Required)
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    let cleanPhone = phone.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return res.status(400).json({ success: false, message: 'Phone number must contain between 7 and 15 digits' });
    }

    // Industry validation (Required)
    if (!industry || typeof industry !== 'string' || !industry.trim()) {
      return res.status(400).json({ success: false, message: 'Industry / domain is required' });
    }
    // Budget validation
    let budgetVal = 0;
    if (allottedBudget !== undefined && allottedBudget !== null && allottedBudget !== '') {
      budgetVal = Number(allottedBudget);
      if (isNaN(budgetVal) || budgetVal < 0) {
        return res.status(400).json({ success: false, message: 'Allotted budget cannot be negative' });
      }
    }

    // Status validation
    const validStatuses = ['active', 'inactive', 'lead'];
    const finalStatus = status && validStatuses.includes(status.toLowerCase()) ? status.toLowerCase() : 'active';

    const initialNotes = notes && notes.trim()
      ? [{ note: notes.trim(), author_id: req.user.userId, created_at: new Date() }]
      : [];

    const client = await Client.create({
      tenant_id: tenantId,
      name: trimmedName,
      company_name: companyName ? companyName.trim() : '',
      contact_person: contactPerson ? contactPerson.trim() : '',
      email: cleanEmail,
      phone: cleanPhone,
      location: location ? location.trim() : '',
      address: address ? address.trim() : '',
      industry: industry ? industry.trim() : '',
      status: finalStatus,
      allotted_budget: budgetVal,
      assigned_to: assignedTo || null,
      notes: initialNotes
    });

    // Emit real application event via Node EventEmitter
    eventBus.emit('clientCreated', { tenantId, userId: req.user.userId, client, ipAddress: req.ip });

    // Invalidate Redis cache for clients
    await deleteCachePattern(`clients:${tenantId}*`);
    await deleteCachePattern(`clients:all*`);

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    console.error('createClient error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const { id } = req.params;
    const updateData = { ...req.body };

    const query = { _id: id };
    if (tenantId && req.user?.role !== 'super_admin') {
      query.tenant_id = tenantId;
    }

    const currentClient = await Client.findOne(query);
    if (!currentClient) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // --- Validation on Updates ---
    if (updateData.name !== undefined) {
      if (!updateData.name || typeof updateData.name !== 'string' || !updateData.name.trim()) {
        return res.status(400).json({ success: false, message: 'Client Name cannot be empty' });
      }
      const trimmedName = updateData.name.trim();
      if (trimmedName.length < 2) {
        return res.status(400).json({ success: false, message: 'Client Name must be at least 2 characters long' });
      }
      if (trimmedName.length > 100) {
        return res.status(400).json({ success: false, message: 'Client Name cannot exceed 100 characters' });
      }

      // Check duplicate name excluding current record
      const dup = await Client.findOne({
        tenant_id: currentClient.tenant_id,
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (dup) {
        return res.status(400).json({ success: false, message: `Another client named "${trimmedName}" already exists` });
      }
      updateData.name = trimmedName;
    }

    if (updateData.email !== undefined) {
      const cleanEmail = updateData.email ? updateData.email.trim() : '';
      if (cleanEmail) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(cleanEmail)) {
          return res.status(400).json({ success: false, message: 'Please provide a valid email address (e.g., client@domain.com)' });
        }
      }
      updateData.email = cleanEmail;
    }

    if (updateData.phone !== undefined) {
      const cleanPhone = updateData.phone ? updateData.phone.trim() : '';
      if (cleanPhone) {
        const digitsOnly = cleanPhone.replace(/\D/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          return res.status(400).json({ success: false, message: 'Phone number must contain between 7 and 15 digits' });
        }
      }
      updateData.phone = cleanPhone;
    }

    if (updateData.companyName !== undefined) updateData.company_name = updateData.companyName.trim();
    if (updateData.contactPerson !== undefined) updateData.contact_person = updateData.contactPerson.trim();
    if (updateData.location !== undefined) updateData.location = updateData.location.trim();
    if (updateData.industry !== undefined) updateData.industry = updateData.industry.trim();

    const budgetInput = updateData.allottedBudget !== undefined ? updateData.allottedBudget : updateData.allotted_budget;
    if (budgetInput !== undefined && budgetInput !== null && budgetInput !== '') {
      const parsedBudget = Number(budgetInput);
      if (isNaN(parsedBudget) || parsedBudget < 0) {
        return res.status(400).json({ success: false, message: 'Allotted budget cannot be negative' });
      }
      updateData.allotted_budget = parsedBudget;
    }

    if (updateData.assignedTo !== undefined) {
      updateData.assigned_to = updateData.assignedTo || null;
    }

    if (updateData.status) {
      const validStatuses = ['active', 'inactive', 'lead'];
      if (validStatuses.includes(updateData.status.toLowerCase())) {
        updateData.status = updateData.status.toLowerCase();
      }
    }

    const updated = await Client.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    );

    // Emit real application event via Node EventEmitter
    eventBus.emit('clientUpdated', { tenantId: updated.tenant_id, userId: req.user.userId, clientId: id, clientName: updated.name, ipAddress: req.ip });

    // Invalidate Redis cache for clients and client detail
    await deleteCachePattern(`clients:${updated.tenant_id}*`);
    await deleteCachePattern(`clients:all*`);
    await deleteCachePattern(`client:detail:*${id}*`);

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const { id } = req.params;

    const query = { _id: id };
    if (tenantId && req.user?.role !== 'super_admin') {
      query.tenant_id = tenantId;
    }

    const client = await Client.findOneAndDelete(query);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Emit real application event via Node EventEmitter
    eventBus.emit('clientDeleted', { tenantId: client.tenant_id, userId: req.user.userId, clientId: id, clientName: client.name, ipAddress: req.ip });

    // Invalidate Redis cache for clients and client detail
    await deleteCachePattern(`clients:${client.tenant_id}*`);
    await deleteCachePattern(`clients:all*`);
    await deleteCachePattern(`client:detail:*${id}*`);

    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addClientNote = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const userId = req.user.userId;
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Note content cannot be empty' });
    }

    const query = { _id: id };
    if (tenantId && req.user?.role !== 'super_admin') {
      query.tenant_id = tenantId;
    }

    const client = await Client.findOne(query);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    client.notes.push({ note: note.trim(), author_id: userId, created_at: new Date() });
    await client.save();

    // Invalidate detail cache for this client so updated notes are reflected immediately
    await deleteCachePattern(`client:detail:*${id}*`);

    res.status(201).json({ success: true, data: client.notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Clients to structured JSON file using Node.js fs callbacks
exports.exportClients = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'tenant_admin' && userRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access Denied: Only Tenant Admins and Super Admins can export client data.' });
    }

    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const query = {};
    if (tenantId) query.tenant_id = tenantId;

    const clients = await Client.find(query).lean();
    const filename = `clients_workspace_${tenantId || 'all'}`;

    exportDataToJsonFile(filename, clients, (err, result) => {
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

