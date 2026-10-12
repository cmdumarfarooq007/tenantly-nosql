const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');

// Background scheduler for periodic system maintenance and overdue task checks
const initScheduler = () => {
  const exportsDir = path.join(__dirname, '../../temp_exports');
  
  // Ensure temp export folder exists
  if (!fs.existsSync(exportsDir)) {
    try {
      fs.mkdirSync(exportsDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create temp_exports directory:', e.message);
    }
  }

  // Periodic interval (every 30 minutes) to check overdue tasks and clean temp files
  const intervalMs = 30 * 60 * 1000;
  const maintenanceInterval = setInterval(async () => {
    try {
      // 1. Check for overdue tasks
      const now = new Date();
      const overdueTasks = await Task.countDocuments({
        due_date: { $lt: now },
        status: { $ne: 'completed' }
      });
      if (overdueTasks > 0) {
        console.log(`[Scheduler] Notice: ${overdueTasks} active tasks currently past due date.`);
      }

      // 2. Clean temporary export files older than 1 hour using Node fs callbacks
      if (fs.existsSync(exportsDir)) {
        fs.readdir(exportsDir, (err, files) => {
          if (err) return;
          files.forEach(file => {
            const filePath = path.join(exportsDir, file);
            fs.stat(filePath, (statErr, stats) => {
              if (!statErr && stats) {
                const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
                if (ageHours > 1) {
                  fs.unlink(filePath, () => {});
                }
              }
            });
          });
        });
      }
    } catch (err) {
      console.error('[Scheduler Error]:', err.message);
    }
  }, intervalMs);

  // Unref interval so it doesn't block graceful shutdown
  if (maintenanceInterval && maintenanceInterval.unref) {
    maintenanceInterval.unref();
  }

  console.log('[Scheduler] Background maintenance timer initialized.');
};

// Delayed action helper using setTimeout
const scheduleDelayedNotification = (callback, delayMs = 5000) => {
  return setTimeout(callback, delayMs);
};

module.exports = {
  initScheduler,
  scheduleDelayedNotification
};
