const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const workspaceManager = require('../../utils/workspaceManager');
const logger = require('../../utils/logger');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    }
});

// Store sandbox sessions
const sandboxSessions = new Map();

// Store terminal sessions
const terminalSessions = new Map();

// Initialize sandbox session
router.post('/init', async (req, res) => {
    try {
        const sessionId = req.body.sessionId || uuidv4();
        
        // Create workspace for this sandbox session
        const workspace = await workspaceManager.createWorkspace(sessionId);
        
        // Create sandbox session
        const session = {
            id: sessionId,
            workspaceId: workspace.id,
            workspacePath: workspace.path,
            files: [],
            terminals: new Map(),
            createdAt: new Date(),
            lastActivity: new Date()
        };
        
        sandboxSessions.set(sessionId, session);
        
        res.json({
            success: true,
            sessionId: sessionId,
            workspaceId: workspace.id,
            workspacePath: workspace.path,
            message: 'Sandbox initialized successfully'
        });
    } catch (error) {
        console.error('Error initializing sandbox:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize sandbox'
        });
    }
});

// Execute code in sandbox
router.post('/execute', async (req, res) => {
    try {
        const { sessionId, code, language } = req.body;
        
        if (!sandboxSessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Sandbox session not found'
            });
        }
        
        const session = sandboxSessions.get(sessionId);
        session.lastActivity = new Date();
        
        let command = '';
        let fileExtension = '';
        
        // Determine command based on language
        switch(language) {
            case 'python':
                fileExtension = '.py';
                command = 'python3';
                break;
            case 'javascript':
            case 'nodejs':
                fileExtension = '.js';
                command = 'node';
                break;
            case 'bash':
            case 'shell':
                fileExtension = '.sh';
                command = 'bash';
                break;
            case 'java':
                fileExtension = '.java';
                // Java requires compilation
                break;
            case 'cpp':
            case 'c++':
                fileExtension = '.cpp';
                // C++ requires compilation
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: `Unsupported language: ${language}`
                });
        }
        
        // Create temporary file with code
        const fileName = `temp_${Date.now()}${fileExtension}`;
        const filePath = path.join(session.workspacePath, 'temp', fileName);
        
        // Ensure temp directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Write code to file
        await fs.writeFile(filePath, code);
        
        let result;
        
        try {
            if (language === 'java') {
                // Compile and run Java
                const className = 'Main';
                const javaCode = code.includes('class Main') ? code : 
                    `public class Main {\n    public static void main(String[] args) {\n${code}\n    }\n}`;
                await fs.writeFile(filePath, javaCode);
                
                // Compile
                const { stdout: compileOut, stderr: compileErr } = await execPromise(
                    `javac ${fileName}`,
                    { cwd: path.dirname(filePath), timeout: 10000 }
                );
                
                if (compileErr && !compileErr.includes('warning')) {
                    throw new Error(`Compilation error: ${compileErr}`);
                }
                
                // Run
                const { stdout, stderr } = await execPromise(
                    `java ${className}`,
                    { cwd: path.dirname(filePath), timeout: 10000 }
                );
                
                result = {
                    output: stdout,
                    error: stderr,
                    executionTime: Date.now()
                };
            } else if (language === 'cpp' || language === 'c++') {
                // Compile and run C++
                const executablePath = filePath.replace('.cpp', '');
                
                // Compile
                const { stdout: compileOut, stderr: compileErr } = await execPromise(
                    `g++ ${fileName} -o ${path.basename(executablePath)}`,
                    { cwd: path.dirname(filePath), timeout: 10000 }
                );
                
                if (compileErr && !compileErr.includes('warning')) {
                    throw new Error(`Compilation error: ${compileErr}`);
                }
                
                // Run
                const { stdout, stderr } = await execPromise(
                    `./${path.basename(executablePath)}`,
                    { cwd: path.dirname(filePath), timeout: 10000 }
                );
                
                result = {
                    output: stdout,
                    error: stderr,
                    executionTime: Date.now()
                };
            } else {
                // Execute interpreted languages
                const { stdout, stderr } = await execPromise(
                    `${command} ${fileName}`,
                    { 
                        cwd: path.dirname(filePath), 
                        timeout: 10000,
                        maxBuffer: 1024 * 1024 * 10 // 10MB
                    }
                );
                
                result = {
                    output: stdout,
                    error: stderr,
                    executionTime: Date.now()
                };
            }
        } catch (error) {
            result = {
                output: error.stdout || '',
                error: error.stderr || error.message,
                executionTime: Date.now()
            };
        }
        
        // Clean up temporary file
        await fs.unlink(filePath).catch(() => {});
        
        res.json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('Error executing code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute code: ' + error.message
        });
    }
});

// Execute terminal command
router.post('/terminal/execute', async (req, res) => {
    try {
        const { sessionId, command } = req.body;
        
        if (!sandboxSessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Sandbox session not found'
            });
        }
        
        const session = sandboxSessions.get(sessionId);
        session.lastActivity = new Date();
        
        // Execute command in workspace directory
        const result = await workspaceManager.executeCommand(session.workspaceId, command);
        
        res.json({
            success: true,
            result: {
                output: result.stdout,
                error: result.stderr,
                success: result.success,
                command: command,
                executionTime: Date.now()
            }
        });
    } catch (error) {
        console.error('Error executing terminal command:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute command: ' + error.message
        });
    }
});

// Create persistent terminal session
router.post('/terminal/create', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sandboxSessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Sandbox session not found'
            });
        }
        
        const session = sandboxSessions.get(sessionId);
        const terminalId = uuidv4();
        
        // Create a persistent shell process
        const shell = spawn('bash', [], {
            cwd: session.workspacePath,
            env: { ...process.env, TERM: 'xterm-256color' }
        });
        
        const terminal = {
            id: terminalId,
            process: shell,
            output: [],
            createdAt: new Date()
        };
        
        // Store output
        shell.stdout.on('data', (data) => {
            terminal.output.push({
                type: 'stdout',
                data: data.toString(),
                timestamp: new Date()
            });
        });
        
        shell.stderr.on('data', (data) => {
            terminal.output.push({
                type: 'stderr',
                data: data.toString(),
                timestamp: new Date()
            });
        });
        
        shell.on('close', (code) => {
            terminal.output.push({
                type: 'exit',
                code: code,
                timestamp: new Date()
            });
            session.terminals.delete(terminalId);
        });
        
        session.terminals.set(terminalId, terminal);
        terminalSessions.set(terminalId, terminal);
        
        res.json({
            success: true,
            terminalId: terminalId,
            message: 'Terminal created successfully'
        });
    } catch (error) {
        console.error('Error creating terminal:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create terminal'
        });
    }
});

// Send command to terminal
router.post('/terminal/:terminalId/send', async (req, res) => {
    try {
        const { terminalId } = req.params;
        const { command } = req.body;
        
        const terminal = terminalSessions.get(terminalId);
        if (!terminal) {
            return res.status(404).json({
                success: false,
                error: 'Terminal not found'
            });
        }
        
        // Send command to terminal
        terminal.process.stdin.write(command + '\n');
        
        // Wait a bit for output
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get recent output
        const recentOutput = terminal.output.slice(-20);
        
        res.json({
            success: true,
            output: recentOutput
        });
    } catch (error) {
        console.error('Error sending command to terminal:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send command'
        });
    }
});

// Get terminal output
router.get('/terminal/:terminalId/output', async (req, res) => {
    try {
        const { terminalId } = req.params;
        
        const terminal = terminalSessions.get(terminalId);
        if (!terminal) {
            return res.status(404).json({
                success: false,
                error: 'Terminal not found'
            });
        }
        
        res.json({
            success: true,
            output: terminal.output
        });
    } catch (error) {
        console.error('Error getting terminal output:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get terminal output'
        });
    }
});

// Create file in sandbox
router.post('/file/create', async (req, res) => {
    try {
        const { sessionId, fileName, content } = req.body;
        
        if (!sandboxSessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Sandbox session not found'
            });
        }
        
        const session = sandboxSessions.get(sessionId);
        session.lastActivity = new Date();
        
        // Create file in workspace
        const file = await workspaceManager.createFile(
            session.workspaceId,
            fileName,
            content || '',
            'generated'
        );
        
        session.files.push(file);
        
        res.json({
            success: true,
            file: file,
            message: 'File created successfully'
        });
    } catch (error) {
        console.error('Error creating file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create file'
        });
    }
});

// Update file in sandbox
router.put('/file/:fileId', async (req, res) => {
    try {
        const { sessionId, content } = req.body;
        const { fileId } = req.params;
        
        if (!sandboxSessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Sandbox session not found'
            });
        }
        
        const session = sandboxSessions.get(sessionId);
        session.lastActivity = new Date();
        
        // Update file in workspace
        const file = await workspaceManager.updateFile(
            session.workspaceId,
            fileId,
            content
        );
        
        res.json({
            success: true,
            file: file,
            message: 'File updated successfully'
        });
    } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update file'
        });
    }
});

// List files in sandbox
router.get('/files/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sandboxSessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Sandbox session not found'
            });
        }
        
        const session = sandboxSessions.get(sessionId);
        
        // Get files from workspace
        const files = await workspaceManager.listFiles(session.workspaceId);
        
        res.json({
            success: true,
            files: files,
            workspacePath: session.workspacePath
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
router.get('/workspace/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sandboxSessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Sandbox session not found'
            });
        }
        
        const session = sandboxSessions.get(sessionId);
        const structure = await workspaceManager.getDirectoryStructure(session.workspaceId);
        
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

// Clean up old sessions (run periodically)
setInterval(() => {
    const now = new Date();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of sandboxSessions.entries()) {
        const age = now - session.lastActivity;
        if (age > maxAge) {
            // Clean up terminals
            for (const [terminalId, terminal] of session.terminals.entries()) {
                terminal.process.kill();
                terminalSessions.delete(terminalId);
            }
            
            sandboxSessions.delete(sessionId);
            console.log(`Cleaned up sandbox session: ${sessionId}`);
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes

module.exports = router;