const fs = require('fs');
const path = require('path');

const exportsDir = path.join(__dirname, '../../temp_exports');

// Ensure directory exists
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

/**
 * Utility for formatting and generating exported data files using Node.js fs APIs.
 * Uses Node error-first callback pattern to stream generated files to response handlers.
 */
const exportDataToJsonFile = (filename, data, callback) => {
  const filePath = path.join(exportsDir, `${filename}_${Date.now()}.json`);
  
  try {
    // Format structured data as JSON string
    const jsonContent = JSON.stringify(data, null, 2);

    // Write file using Node.js fs.writeFile callback
    fs.writeFile(filePath, jsonContent, 'utf8', (writeErr) => {
      if (writeErr) {
        return callback(writeErr, null);
      }

      // Verify file read using Node.js fs.readFile callback
      fs.readFile(filePath, 'utf8', (readErr, content) => {
        if (readErr) {
          return callback(readErr, null);
        }

        // Return path and parsed data length
        callback(null, {
          filePath,
          sizeBytes: Buffer.byteLength(content, 'utf8')
        });
      });
    });
  } catch (error) {
    callback(error, null);
  }
};

/**
 * Removes temporary export file using Node.js fs.unlink callback
 */
const cleanupExportFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to remove temp export file:', err.message);
    });
  }
};

module.exports = {
  exportDataToJsonFile,
  cleanupExportFile
};
