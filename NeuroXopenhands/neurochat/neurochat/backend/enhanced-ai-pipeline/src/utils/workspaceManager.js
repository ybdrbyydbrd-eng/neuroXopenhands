const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('./logger');

class WorkspaceManager {
    constructor() {
        // Base directory for all workspaces
        this.baseDir = path.join(__dirname, '../../../../workspaces');
        this.workspaces = new Map();
        this.uploadedFiles = new Map();
        this.initializeBaseDirectory();
    }

    async initializeBaseDirectory() {
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
            logger.info('Workspace base directory initialized', { baseDir: this.baseDir });
        } catch (error) {
            logger.error('Failed to initialize workspace base directory', { error });
        }
    }

    /**
     * Create a new workspace for a session
     */
    async createWorkspace(sessionId = null) {
        const workspaceId = sessionId || uuidv4();
        const workspacePath = path.join(this.baseDir, workspaceId);

        try {
            // Create workspace directory
            await fs.mkdir(workspacePath, { recursive: true });
            
            // Create subdirectories
            await fs.mkdir(path.join(workspacePath, 'uploads'), { recursive: true });
            await fs.mkdir(path.join(workspacePath, 'generated'), { recursive: true });
            await fs.mkdir(path.join(workspacePath, 'temp'), { recursive: true });

            const workspace = {
                id: workspaceId,
                path: workspacePath,
                files: new Map(),
                createdAt: new Date(),
                lastModified: new Date()
            };

            this.workspaces.set(workspaceId, workspace);
            
            logger.info('Workspace created', { workspaceId, path: workspacePath });
            
            return workspace;
        } catch (error) {
            logger.error('Failed to create workspace', { workspaceId, error });
            throw error;
        }
    }

    /**
     * Get or create workspace
     */
    async getOrCreateWorkspace(workspaceId) {
        if (this.workspaces.has(workspaceId)) {
            return this.workspaces.get(workspaceId);
        }
        return await this.createWorkspace(workspaceId);
    }

    /**
     * Add uploaded file to workspace
     */
    async addFileToWorkspace(workspaceId, fileInfo) {
        const workspace = await this.getOrCreateWorkspace(workspaceId);
        
        try {
            // Copy file to workspace uploads directory
            const destPath = path.join(workspace.path, 'uploads', fileInfo.name);
            
            if (fileInfo.path) {
                await fs.copyFile(fileInfo.path, destPath);
            } else if (fileInfo.content) {
                await fs.writeFile(destPath, fileInfo.content);
            }

            const workspaceFile = {
                id: fileInfo.id || uuidv4(),
                name: fileInfo.name,
                path: destPath,
                relativePath: path.join('uploads', fileInfo.name),
                size: fileInfo.size,
                mimetype: fileInfo.mimetype,
                content: fileInfo.content,
                metadata: fileInfo.metadata || {},
                addedAt: new Date()
            };

            workspace.files.set(workspaceFile.id, workspaceFile);
            workspace.lastModified = new Date();
            
            // Store in global uploaded files map for AI access
            this.uploadedFiles.set(workspaceFile.id, workspaceFile);
            
            logger.info('File added to workspace', { 
                workspaceId, 
                fileId: workspaceFile.id, 
                fileName: fileInfo.name 
            });
            
            return workspaceFile;
        } catch (error) {
            logger.error('Failed to add file to workspace', { workspaceId, error });
            throw error;
        }
    }

    /**
     * Get file from workspace
     */
    async getFile(workspaceId, fileId) {
        const workspace = this.workspaces.get(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace ${workspaceId} not found`);
        }

        const file = workspace.files.get(fileId);
        if (!file) {
            // Try to get from global uploaded files
            const uploadedFile = this.uploadedFiles.get(fileId);
            if (uploadedFile) {
                return uploadedFile;
            }
            throw new Error(`File ${fileId} not found in workspace`);
        }

        // Read file content if not already loaded
        if (!file.content && file.path) {
            try {
                file.content = await fs.readFile(file.path, 'utf8');
            } catch (error) {
                logger.warn('Could not read file content', { fileId, error });
            }
        }

        return file;
    }

    /**
     * Get all files in workspace
     */
    async listFiles(workspaceId) {
        const workspace = await this.getOrCreateWorkspace(workspaceId);
        return Array.from(workspace.files.values());
    }

    /**
     * Create a new file in workspace
     */
    async createFile(workspaceId, fileName, content, directory = 'generated') {
        const workspace = await this.getOrCreateWorkspace(workspaceId);
        
        try {
            const filePath = path.join(workspace.path, directory, fileName);
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            
            // Write file
            await fs.writeFile(filePath, content);
            
            const fileInfo = {
                id: uuidv4(),
                name: fileName,
                path: filePath,
                relativePath: path.join(directory, fileName),
                size: Buffer.byteLength(content),
                content: content,
                createdAt: new Date(),
                createdBy: 'ai'
            };
            
            workspace.files.set(fileInfo.id, fileInfo);
            workspace.lastModified = new Date();
            
            logger.info('File created in workspace', { 
                workspaceId, 
                fileName, 
                directory 
            });
            
            return fileInfo;
        } catch (error) {
            logger.error('Failed to create file in workspace', { 
                workspaceId, 
                fileName, 
                error 
            });
            throw error;
        }
    }

    /**
     * Update file in workspace
     */
    async updateFile(workspaceId, fileId, content) {
        const file = await this.getFile(workspaceId, fileId);
        
        try {
            await fs.writeFile(file.path, content);
            
            file.content = content;
            file.size = Buffer.byteLength(content);
            file.lastModified = new Date();
            
            const workspace = this.workspaces.get(workspaceId);
            workspace.lastModified = new Date();
            
            logger.info('File updated in workspace', { 
                workspaceId, 
                fileId, 
                fileName: file.name 
            });
            
            return file;
        } catch (error) {
            logger.error('Failed to update file in workspace', { 
                workspaceId, 
                fileId, 
                error 
            });
            throw error;
        }
    }

    /**
     * Delete file from workspace
     */
    async deleteFile(workspaceId, fileId) {
        const workspace = this.workspaces.get(workspaceId);
        if (!workspace) {
            throw new Error(`Workspace ${workspaceId} not found`);
        }

        const file = workspace.files.get(fileId);
        if (!file) {
            throw new Error(`File ${fileId} not found in workspace`);
        }

        try {
            // Delete physical file
            await fs.unlink(file.path).catch(() => {});
            
            // Remove from workspace
            workspace.files.delete(fileId);
            workspace.lastModified = new Date();
            
            // Remove from global uploaded files
            this.uploadedFiles.delete(fileId);
            
            logger.info('File deleted from workspace', { 
                workspaceId, 
                fileId, 
                fileName: file.name 
            });
            
            return true;
        } catch (error) {
            logger.error('Failed to delete file from workspace', { 
                workspaceId, 
                fileId, 
                error 
            });
            throw error;
        }
    }

    /**
     * Execute command in workspace directory
     */
    async executeCommand(workspaceId, command, options = {}) {
        const workspace = await this.getOrCreateWorkspace(workspaceId);
        
        try {
            const execOptions = {
                cwd: workspace.path,
                timeout: options.timeout || 30000,
                maxBuffer: 10 * 1024 * 1024, // 10MB
                ...options
            };
            
            logger.info('Executing command in workspace', { 
                workspaceId, 
                command: command.substring(0, 100) 
            });
            
            const { stdout, stderr } = await execPromise(command, execOptions);
            
            return {
                success: true,
                stdout,
                stderr,
                command,
                workspacePath: workspace.path
            };
        } catch (error) {
            logger.error('Command execution failed', { 
                workspaceId, 
                command, 
                error: error.message 
            });
            
            return {
                success: false,
                error: error.message,
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                command,
                workspacePath: workspace.path
            };
        }
    }

    /**
     * Get workspace directory structure
     */
    async getDirectoryStructure(workspaceId) {
        const workspace = await this.getOrCreateWorkspace(workspaceId);
        
        const walkDir = async (dir, relativePath = '') => {
            const items = [];
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = path.join(relativePath, entry.name);
                
                if (entry.isDirectory()) {
                    const children = await walkDir(fullPath, relPath);
                    items.push({
                        name: entry.name,
                        type: 'directory',
                        path: relPath,
                        children
                    });
                } else {
                    const stats = await fs.stat(fullPath);
                    items.push({
                        name: entry.name,
                        type: 'file',
                        path: relPath,
                        size: stats.size,
                        modified: stats.mtime
                    });
                }
            }
            
            return items;
        };
        
        try {
            const structure = await walkDir(workspace.path);
            return {
                workspaceId,
                path: workspace.path,
                structure
            };
        } catch (error) {
            logger.error('Failed to get directory structure', { workspaceId, error });
            throw error;
        }
    }

    /**
     * Clean up old workspaces
     */
    async cleanupOldWorkspaces(maxAgeHours = 24) {
        const now = new Date();
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        
        for (const [workspaceId, workspace] of this.workspaces.entries()) {
            const age = now - workspace.lastModified;
            
            if (age > maxAge) {
                try {
                    // Remove workspace directory
                    await fs.rm(workspace.path, { recursive: true, force: true });
                    
                    // Remove from memory
                    this.workspaces.delete(workspaceId);
                    
                    // Remove associated files from global map
                    for (const fileId of workspace.files.keys()) {
                        this.uploadedFiles.delete(fileId);
                    }
                    
                    logger.info('Cleaned up old workspace', { workspaceId, age });
                } catch (error) {
                    logger.error('Failed to cleanup workspace', { workspaceId, error });
                }
            }
        }
    }

    /**
     * Get file content for AI context
     */
    async getFilesForContext(fileIds) {
        const filesContext = [];
        
        for (const fileId of fileIds) {
            try {
                const file = this.uploadedFiles.get(fileId);
                if (file) {
                    // Read content if not already loaded
                    if (!file.content && file.path) {
                        try {
                            file.content = await fs.readFile(file.path, 'utf8');
                        } catch (error) {
                            logger.warn('Could not read file for context', { fileId, error });
                            file.content = `[Could not read file: ${file.name}]`;
                        }
                    }
                    
                    filesContext.push({
                        id: file.id,
                        name: file.name,
                        type: file.mimetype || 'unknown',
                        content: file.content || '',
                        metadata: file.metadata || {}
                    });
                }
            } catch (error) {
                logger.error('Error getting file for context', { fileId, error });
            }
        }
        
        return filesContext;
    }
}

// Create singleton instance
const workspaceManager = new WorkspaceManager();

// Schedule cleanup every hour
setInterval(() => {
    workspaceManager.cleanupOldWorkspaces();
}, 60 * 60 * 1000);

module.exports = workspaceManager;