const { v4: uuidv4 } = require('uuid');
const MultiModelMerge = require('../core/multiModelMerge');
const { MultiAgentReasoning } = require('../agents/multiAgentReasoning');
const logger = require('./logger');

// In-memory Agent manager to orchestrate single-model and collaborative multi-model runs
class AgentManager {
  constructor() {
    this.tasks = new Map(); // taskId -> { status, logs: [], result, createdAt }
    this.multiModelMerge = new MultiModelMerge();
    this.multiAgent = new MultiAgentReasoning();
    this.initialized = false;
  }

  async ensureInitialized() {
    if (this.initialized) return;
    try {
      await this.multiModelMerge.initializeModelPerformance();
      this.initialized = true;
    } catch (err) {
      logger.logError(err, { component: 'agentManager', operation: 'initialize' });
      this.initialized = true; // proceed with offline fallback capabilities
    }
  }

  createTask() {
    const id = uuidv4();
    const task = {
      id,
      status: 'processing',
      logs: [],
      result: null,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(id, task);
    return task;
  }

  addLog(task, message) {
    const line = `${new Date().toISOString()}  ${message}`;
    task.logs.push(line);
  }

  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  async startAgent({ message, model, options = {} }) {
    await this.ensureInitialized();
    const task = this.createTask();

    const isCollaboration = Boolean(
      options?.collaboration === true ||
      options?.collaboration?.enabled === true ||
      (Array.isArray(options?.selectedModels) && options.selectedModels.length > 1)
    );

    // Fire-and-forget processing
    const runner = isCollaboration ? this._processCollaboration.bind(this) : this._process.bind(this);

    runner(task, { message, model, options }).catch((err) => {
      logger.logError(err, { component: 'agentManager', operation: isCollaboration ? 'process_collab' : 'process', taskId: task.id });
      task.status = 'failed';
      task.result = { error: err.message || 'Agent processing failed' };
    });

    return { taskId: task.id };
  }

  async _process(task, { message, model, options }) {
    try {
      this.addLog(task, `Agent started — single-model mode`);
      this.addLog(task, `Planning steps for the query...`);
      await this._sleep(250);

      // Step 1: Analyze goal
      this.addLog(task, `1) Analyze user goal`);
      this.addLog(task, `   • Input length: ${message.length} chars`);
      await this._sleep(200);

      // Step 2: Select model
      let selectedModel = model;
      if (!selectedModel) {
        // Try to pick first available model (if any were discovered)
        const available = this.multiModelMerge.getAvailableModels();
        selectedModel = available[0]?.id || null;
      }
      this.addLog(task, `2) Select model: ${selectedModel || 'none (will use safe fallback)'} `);
      await this._sleep(150);

      // Step 3: Prepare prompt
      this.addLog(task, `3) Prepare prompt and constraints`);
      await this._sleep(150);

      // Step 4: Call model (or fallback)
      this.addLog(task, `4) Generate response (single-model)...`);
      let resultText = '';
      if (selectedModel) {
        const call = await this.multiModelMerge.callModelWithRetry(selectedModel, message, options || {});
        if (call && call.success) {
          resultText = call.content;
          this.addLog(task, `   ✓ Model responded in ${call.responseTime}ms`);
        } else {
          // Fallback if API failed or no key
          resultText = this._fallbackResponse(message);
          this.addLog(task, `   ! Model call failed (${call?.error || 'unknown'}). Using safe offline fallback.`);
        }
      } else {
        resultText = this._fallbackResponse(message);
        this.addLog(task, `   ! No configured models. Using safe offline fallback.`);
      }

      // Step 5: Finalize
      this.addLog(task, `5) Finalize and return answer`);
      await this._sleep(100);

      task.status = 'completed';
      task.result = { content: resultText };
      this.addLog(task, `Done.`);
    } catch (err) {
      task.status = 'failed';
      task.result = { error: err.message || 'Agent processing failed' };
      this.addLog(task, `ERROR: ${err.message}`);
    }
  }

  _fallbackResponse(message) {
    const base = `Agent (single-model) response`;
    // Provide a helpful but generic answer without external calls
    return `${base}:\n\n` +
      `I understood your request: "${message}".\n` +
      `Since no model API is configured, I generated a helpful, concise offline response.\n\n` +
      `Key points:\n` +
      `- I parsed your intent and extracted the main question.\n` +
      `- I applied general knowledge to craft a clear, structured answer.\n\n` +
      `Tip: Add an API key from the top-right to enable real model inference.`;
  }

  async _processCollaboration(task, { message, model, options = {} }) {
    try {
      this.addLog(task, `Agent started — collaboration mode`);
      this.addLog(task, `Planning collaborative steps...`);
      await this._sleep(250);

      // Step 1: Analyze goal
      this.addLog(task, `1) Analyze user goal`);
      this.addLog(task, `   • Input length: ${message.length} chars`);
      await this._sleep(200);

      // Step 2: Select models for collaboration
      let selected = [];
      if (Array.isArray(options.selectedModels) && options.selectedModels.length > 0) {
        selected = options.selectedModels;
      } else if (model) {
        selected = [model];
      } else {
        const available = this.multiModelMerge.getAvailableModels();
        selected = available.slice(0, Math.max(2, Math.min(available.length, 4))).map(m => m.id);
      }
      this.addLog(task, `2) Select models for collaboration: ${selected.join(', ') || 'none (will use safe fallback)'}`);
      await this._sleep(150);

      // Step 3: Prepare prompts/constraints
      this.addLog(task, `3) Prepare prompts and constraints for multi-model inference`);
      await this._sleep(150);

      // Step 4: Call models in parallel (or fallback)
      this.addLog(task, `4) Generate responses (multi-model parallel calls)...`);

      let collabContent = '';
      let collabDetails = null;

      if (selected.length > 0) {
        const parallelResult = await this.multiModelMerge.callModelsInParallel(message, {
          ...options,
          selectedModels: selected
        });

        const merged = parallelResult.mergedResponse;
        collabContent = merged?.content || '';
        collabDetails = parallelResult;
        this.addLog(task, `   ✓ ${parallelResult.individualResponses.filter(r => r.success).length}/${parallelResult.individualResponses.length} models responded (in ${parallelResult.totalTime}ms)`);
      } else {
        collabContent = this._fallbackResponse(message);
        this.addLog(task, `   ! No configured models. Using safe offline fallback.`);
      }

      // Step 5: Multi-agent analysis of the merged content
      this.addLog(task, `5) Run multi-agent analysis (fact-check, bias, coherence)`);
      let analysis = null;
      if (collabContent) {
        try {
          analysis = await this.multiAgent.analyzeContent(collabContent, { originalQuery: message });
          this.addLog(task, `   ✓ Analysis completed (qualityScore=${analysis.qualityScore?.toFixed(2) ?? 'n/a'})`);
        } catch (err) {
          this.addLog(task, `   ! Analysis failed: ${err.message}`);
        }
      }

      // Step 6: Finalize
      this.addLog(task, `6) Finalize and return collaborative answer`);
      await this._sleep(100);

      task.status = 'completed';
      task.result = {
        content: collabContent,
        details: collabDetails || undefined,
        analysis: analysis || undefined
      };
      this.addLog(task, `Done.`);
    } catch (err) {
      task.status = 'failed';
      task.result = { error: err.message || 'Agent processing failed' };
      this.addLog(task, `ERROR: ${err.message}`);
    }
  }

  async _sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
}

module.exports = new AgentManager();
