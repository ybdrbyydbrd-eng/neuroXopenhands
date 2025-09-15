const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');
const pdf = require('pdf-parse');
const workspaceManager = require('../../utils/workspaceManager');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../../../uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads with disk storage
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
        files: 10 // Maximum 10 files at once
    },
    fileFilter: (req, file, cb) => {
        // Accept all file types for now
        cb(null, true);
    }
});

// Store uploaded files in memory for quick access
const uploadedFilesStore = new Map();

// Store workspace sessions
const workspaceSessions = new Map();

// Helper function to extract content from different file types
async function extractFileContent(filePath, mimeType, originalName) {
    let content = '';
    let metadata = {};
    
    try {
        if (mimeType === 'application/pdf') {
            // Extract text from PDF
            const dataBuffer = await fs.readFile(filePath);
            const pdfData = await pdf(dataBuffer);
            content = pdfData.text;
            metadata = {
                pages: pdfData.numpages,
                info: pdfData.info
            };
        } else if (mimeType === 'application/zip' || 
                   mimeType === 'application/x-zip-compressed' ||
                   originalName.endsWith('.zip')) {
            // Handle ZIP files
            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();
            const files = [];
            
            zipEntries.forEach(entry => {
                if (!entry.isDirectory) {
                    files.push({
                        name: entry.entryName,
                        size: entry.header.size,
                        content: entry.getData().toString('utf8').substring(0, 1000) // First 1000 chars
                    });
                }
            });
            
            content = `ZIP Archive containing ${files.length} file(s)`;
            metadata = { files };
        } else if (mimeType.startsWith('image/')) {
            // Handle images - store path for later processing
            content = `[Image file: ${originalName}]`;
            metadata = {
                type: 'image',
                path: filePath
            };
        } else if (mimeType.startsWith('text/') || 
                   mimeType === 'application/json' ||
                   mimeType === 'application/javascript') {
            // Handle text files
            content = await fs.readFile(filePath, 'utf8');
        } else {
            // For other file types, store basic info
            content = `[Binary file: ${originalName}]`;
        }
    } catch (error) {
        console.error(`Error extracting content from ${originalName}:`, error);
        content = `[Could not extract content from ${originalName}]`;
    }
    
    return { content, metadata };
}

// Upload files endpoint
router.post('/', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }
        
        // Get or create workspace for this session
        const sessionId = req.headers['x-session-id'] || req.body.sessionId || 'default';
        const workspace = await workspaceManager.getOrCreateWorkspace(sessionId);
        
        const uploadedFiles = [];
        
        for (const file of req.files) {
            // Extract content based on file type
            const { content, metadata } = await extractFileContent(
                file.path,
                file.mimetype,
                file.originalname
            );
            
            // Store file info
            const fileInfo = {
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                name: file.originalname,
                size: file.size,
                mimetype: file.mimetype,
                path: file.path,
                content: content,
                metadata: metadata,
                uploadedAt: new Date()
            };
            
            // Store in memory for quick access
            uploadedFilesStore.set(fileInfo.id, fileInfo);
            
            // Add file to workspace
            const workspaceFile = await workspaceManager.addFileToWorkspace(sessionId, fileInfo);
            
            uploadedFiles.push({
                id: fileInfo.id,
                name: fileInfo.name,
                size: fileInfo.size,
                type: fileInfo.mimetype,
                content: content.substring(0, 500), // Send preview
                metadata: metadata
            });
            
            console.log(`File uploaded: ${fileInfo.name} (${fileInfo.size} bytes, type: ${fileInfo.mimetype})`);
        }
        
        res.json({
            success: true,
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
            files: uploadedFiles,
            workspaceId: workspace.id,
            workspacePath: workspace.path
        });
        
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload files: ' + error.message
        });
    }
});

// Get file content by ID
router.get('/:fileId', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'] || 'default';
        let fileInfo = uploadedFilesStore.get(req.params.fileId);
        
        // Try to get from workspace if not in store
        if (!fileInfo) {
            try {
                fileInfo = await workspaceManager.getFile(sessionId, req.params.fileId);
            } catch (error) {
                // File not found in workspace either
            }
        }
        
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        
        res.json({
            success: true,
            file: {
                id: fileInfo.id,
                name: fileInfo.name,
                size: fileInfo.size,
                type: fileInfo.mimetype,
                content: fileInfo.content,
                metadata: fileInfo.metadata,
                uploadedAt: fileInfo.uploadedAt
            }
        });
    } catch (error) {
        console.error('Error getting file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get file'
        });
    }
});

// Delete file by ID
router.delete('/:fileId', async (req, res) => {
    try {
        const fileInfo = uploadedFilesStore.get(req.params.fileId);
        
        if (!fileInfo) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        
        // Delete file from disk
        await fs.unlink(fileInfo.path).catch(console.error);
        
        // Remove from store
        uploadedFilesStore.delete(req.params.fileId);
        
        res.json({
            success: true,
            message: `File ${fileInfo.name} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete file'
        });
    }
});

// List all uploaded files
router.get('/', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'] || 'default';
        
        // Get files from workspace
        const workspaceFiles = await workspaceManager.listFiles(sessionId);
        
        // Combine with uploaded files store
        const storeFiles = Array.from(uploadedFilesStore.values());
        const allFiles = [...workspaceFiles, ...storeFiles];
        
        // Remove duplicates
        const uniqueFiles = new Map();
        allFiles.forEach(file => uniqueFiles.set(file.id, file));
        
        const files = Array.from(uniqueFiles.values()).map(file => ({
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.mimetype,
            uploadedAt: file.uploadedAt
        }));
        
        res.json({
            success: true,
            files: files
        });
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list files'
        });
    }
});

// Get workspace structure
router.get('/workspace/structure', async (req, res) => {
    try {
        const sessionId = req.headers['x-session-id'] || 'default';
        const structure = await workspaceManager.getDirectoryStructure(sessionId);
        
        res.json({
            success: true,
            ...structure
        });
    } catch (error) {
        console.error('Error getting workspace structure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get workspace structure'
        });
    }
});

// Create file in workspace
router.post('/workspace/file', async (req, res) => {
    try {
        const { fileName, content, directory } = req.body;
        const sessionId = req.headers['x-session-id'] || 'default';
        
        const file = await workspaceManager.createFile(
            sessionId,
            fileName,
            content || '',
            directory || 'generated'
        );
        
        res.json({
            success: true,
            file
        });
    } catch (error) {
        console.error('Error creating file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create file'
        });
    }
});

// Update file in workspace
router.put('/workspace/file/:fileId', async (req, res) => {
    try {
        const { content } = req.body;
        const sessionId = req.headers['x-session-id'] || 'default';
        
        const file = await workspaceManager.updateFile(
            sessionId,
            req.params.fileId,
            content
        );
        
        res.json({
            success: true,
            file
        });
    } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update file'
        });
    }
});

// Export uploaded files for AI context
router.get('/context/:sessionId', async (req, res) => {
    try {
        const files = await workspaceManager.listFiles(req.params.sessionId);
        const filesContext = [];
        
        for (const file of files) {
            filesContext.push({
                id: file.id,
                name: file.name,
                type: file.mimetype || 'unknown',
                content: file.content || '',
                metadata: file.metadata || {}
            });
        }
        
        res.json({
            success: true,
            files: filesContext,
            workspaceId: req.params.sessionId
        });
    } catch (error) {
        console.error('Error getting files context:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get files context'
        });
    }
});

module.exports = router;