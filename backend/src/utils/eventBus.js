const EventEmitter = require('events');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { logTenantActivity } = require('../config/dynamodb');

class AppEventBus extends EventEmitter {}
const eventBus = new AppEventBus();

// Helper to look up user name/email if not provided
const getUserInfo = async (userId) => {
  if (!userId) return { userName: 'System', userEmail: null };
  try {
    const user = await User.findById(userId).select('full_name email');
    if (user) {
      return { userName: user.full_name, userEmail: user.email };
    }
  } catch (err) {
    // Ignore error, fallback
  }
  return { userName: 'User', userEmail: null };
};

// ========================
// CLIENT EVENTS
// ========================
eventBus.on('clientCreated', async ({ tenantId, userId, client, ipAddress }) => {
  try {
    const clientId = client?._id ? client._id.toString() : client?.id;
    const clientName = client?.name || client?.company_name || 'Client';

    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'CREATE_CLIENT',
      entity_type: 'client',
      entity_id: clientId,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'CLIENT_CREATED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: clientId,
      entityType: 'client',
      summary: `Created new client: ${clientName}`,
      metadata: { clientName, industry: client?.industry, budget: client?.allotted_budget }
    });
  } catch (error) {
    console.error('EventBus clientCreated error:', error.message);
  }
});

eventBus.on('clientUpdated', async ({ tenantId, userId, clientId, clientName, ipAddress }) => {
  try {
    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'UPDATE_CLIENT',
      entity_type: 'client',
      entity_id: clientId ? clientId.toString() : null,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'CLIENT_UPDATED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: clientId ? clientId.toString() : null,
      entityType: 'client',
      summary: `Updated client: ${clientName || clientId}`,
      metadata: { clientName }
    });
  } catch (error) {
    console.error('EventBus clientUpdated error:', error.message);
  }
});

eventBus.on('clientDeleted', async ({ tenantId, userId, clientId, clientName, ipAddress }) => {
  try {
    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'DELETE_CLIENT',
      entity_type: 'client',
      entity_id: clientId ? clientId.toString() : null,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'CLIENT_DELETED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: clientId ? clientId.toString() : null,
      entityType: 'client',
      summary: `Deleted client: ${clientName || clientId}`,
      metadata: { clientName }
    });
  } catch (error) {
    console.error('EventBus clientDeleted error:', error.message);
  }
});

// ========================
// PROJECT EVENTS
// ========================
eventBus.on('projectCreated', async ({ tenantId, userId, project, ipAddress }) => {
  try {
    const projectId = project?._id ? project._id.toString() : project?.id;
    const projectName = project?.name || 'Project';

    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'CREATE_PROJECT',
      entity_type: 'project',
      entity_id: projectId,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'PROJECT_CREATED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: projectId,
      entityType: 'project',
      summary: `Created new project: ${projectName}`,
      metadata: { projectName, priority: project?.priority, budget: project?.budget }
    });
  } catch (error) {
    console.error('EventBus projectCreated error:', error.message);
  }
});

eventBus.on('projectUpdated', async ({ tenantId, userId, projectId, projectName, ipAddress }) => {
  try {
    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'UPDATE_PROJECT',
      entity_type: 'project',
      entity_id: projectId ? projectId.toString() : null,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'PROJECT_UPDATED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: projectId ? projectId.toString() : null,
      entityType: 'project',
      summary: `Updated project: ${projectName || projectId}`,
      metadata: { projectName }
    });
  } catch (error) {
    console.error('EventBus projectUpdated error:', error.message);
  }
});

eventBus.on('projectDeleted', async ({ tenantId, userId, projectId, projectName, ipAddress }) => {
  try {
    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'DELETE_PROJECT',
      entity_type: 'project',
      entity_id: projectId ? projectId.toString() : null,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'PROJECT_DELETED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: projectId ? projectId.toString() : null,
      entityType: 'project',
      summary: `Deleted project: ${projectName || projectId}`,
      metadata: { projectName }
    });
  } catch (error) {
    console.error('EventBus projectDeleted error:', error.message);
  }
});

// ========================
// TASK EVENTS
// ========================
eventBus.on('taskCreated', async ({ tenantId, userId, task, ipAddress }) => {
  try {
    const taskId = task?._id ? task._id.toString() : task?.id;
    const taskTitle = task?.title || 'Task';

    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'CREATE_TASK',
      entity_type: 'task',
      entity_id: taskId,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'TASK_CREATED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: taskId,
      entityType: 'task',
      summary: `Created task: "${taskTitle}"`,
      metadata: { taskTitle, priority: task?.priority, status: task?.status }
    });
  } catch (error) {
    console.error('EventBus taskCreated error:', error.message);
  }
});

eventBus.on('taskUpdated', async ({ tenantId, userId, taskId, taskTitle, status, priority, ipAddress }) => {
  try {
    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'UPDATE_TASK',
      entity_type: 'task',
      entity_id: taskId ? taskId.toString() : null,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'TASK_UPDATED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: taskId ? taskId.toString() : null,
      entityType: 'task',
      summary: `Updated task: "${taskTitle || taskId}"${status ? ` (Status: ${status})` : ''}`,
      metadata: { taskTitle, status, priority }
    });
  } catch (error) {
    console.error('EventBus taskUpdated error:', error.message);
  }
});

eventBus.on('taskDeleted', async ({ tenantId, userId, taskId, taskTitle, ipAddress }) => {
  try {
    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'DELETE_TASK',
      entity_type: 'task',
      entity_id: taskId ? taskId.toString() : null,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'TASK_DELETED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: taskId ? taskId.toString() : null,
      entityType: 'task',
      summary: `Deleted task: "${taskTitle || taskId}"`,
      metadata: { taskTitle }
    });
  } catch (error) {
    console.error('EventBus taskDeleted error:', error.message);
  }
});

// ========================
// MEETING EVENTS
// ========================
eventBus.on('meetingCreated', async ({ tenantId, userId, meeting, ipAddress }) => {
  try {
    const meetingId = meeting?._id ? meeting._id.toString() : meeting?.id;
    const meetingTitle = meeting?.title || 'Meeting';

    await AuditLog.create({
      tenant_id: tenantId,
      user_id: userId,
      action: 'CREATE_MEETING',
      entity_type: 'meeting',
      entity_id: meetingId,
      ip_address: ipAddress || null
    });

    const userInfo = await getUserInfo(userId);
    await logTenantActivity({
      tenantId,
      eventType: 'MEETING_SCHEDULED',
      userId,
      userEmail: userInfo.userEmail,
      userName: userInfo.userName,
      entityId: meetingId,
      entityType: 'meeting',
      summary: `Scheduled meeting: "${meetingTitle}"`,
      metadata: { meetingTitle, startTime: meeting?.start_time, link: meeting?.meeting_link }
    });
  } catch (error) {
    console.error('EventBus meetingCreated error:', error.message);
  }
});

module.exports = eventBus;
