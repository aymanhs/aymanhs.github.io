// GridLang - Interpreter and Runtime
// Lexer and Parser are loaded from separate files

// ============= ERROR CLASS =============
class GridLangError extends Error {
    constructor(message, line = null, col = null, type = 'Error') {
        super(message);
        this.name = 'GridLangError';
        this.line = line;
        this.col = col;
        this.errorType = type;
    }
    
    format() {
        if (this.line !== null && this.col !== null) {
            return `${this.errorType} at line ${this.line}, col ${this.col}: ${this.message}`;
        } else if (this.line !== null) {
            return `${this.errorType} at line ${this.line}: ${this.message}`;
        }
        return `${this.errorType}: ${this.message}`;
    }
}

// GridLang Interpreter - Runtime execution
// ============= INTERPRETER =============
class ReturnValue {
    constructor(value) {
        this.value = value;
    }
}

class Regex {
    constructor(pattern) {
        this.pattern = pattern;
        try {
            this.compiled = new RegExp(pattern);
        } catch (e) {
            throw new GridLangError(`Invalid regex pattern: ${pattern}`, null, null, 'RuntimeError');
        }
    }
    
    test(str) {
        return this.compiled.test(String(str));
    }
    
    match(str) {
        const m = this.compiled.exec(String(str));
        return m ? m[0] : null;
    }
    
    groups(str) {
        const m = this.compiled.exec(String(str));
        if (!m) return null;
        
        // Check if there are named groups
        if (m.groups && Object.keys(m.groups).length > 0) {
            // Return Map object with named groups
            const groupMap = new Map();
            for (const [name, value] of Object.entries(m.groups)) {
                groupMap.set(name, value);
            }
            return groupMap;
        }
        
        // Return array for positional groups
        return Array.from(m).slice(1);
    }
    
    find_all(str) {
        const global = new RegExp(this.pattern, 'g');
        const matches = [];
        let m;
        while ((m = global.exec(String(str))) !== null) {
            matches.push(m[0]);
        }
        return matches;
    }
    
    replace(str, replacement) {
        const global = new RegExp(this.pattern, 'g');
        return String(str).replace(global, String(replacement));
    }
    
    split(str) {
        return String(str).split(this.compiled);
    }
    
    toString() {
        return `r"${this.pattern}"`;
    }
}

class Environment {
    constructor(parent = null) {
        this.vars = {};
        this.parent = parent;
    }

    get(name) {
        if (name in this.vars) {
            return this.vars[name];
        } else if (this.parent) {
            return this.parent.get(name);
        } else {
            // Helpful error for common f-string mistake
            if (name === 'f') {
                throw new GridLangError(`Undefined variable: ${name}. Did you mean to use an f-string? F-strings require no space between 'f' and the quote: f"..." not f "..."`, null, null, 'RuntimeError');
            }
            throw new GridLangError(`Undefined variable: ${name}`, null, null, 'RuntimeError');
        }
    }

    set(name, value) {
        this.vars[name] = value;
    }

    update(name, value) {
        if (name in this.vars) {
            this.vars[name] = value;
        } else if (this.parent) {
            this.parent.update(name, value);
        } else {
            throw new GridLangError(`Undefined variable: ${name}`, null, null, 'RuntimeError');
        }
    }
}

class Interpreter {
    constructor(canvas, canvas3d, consoleElement, renderer3d, inputData, canvasContainer, inputsMap = null) {
        this.canvas = canvas;
        this.canvas3d = canvas3d;
        this.ctx = canvas ? canvas.getContext('2d') : null;
        this.consoleElement = consoleElement;
        this.renderer3d = renderer3d;
        this.inputData = inputData || '';
        this.canvasContainer = canvasContainer;
        this.inputsMap = inputsMap || {};
        this.globalEnv = new Environment();
        this.gridSize = 0;
        this.cellSize = 0;
        this.gridRows = 0;
        this.gridCols = 0;
        this.renderingMode = 'console'; // 'console', '2d', or '3d'
        
        // Debug mode
        this.debugEnabled = false;
        
        // Print buffer for performance
        this.printBuffer = [];
        this.printBufferSize = 100; // Flush every 100 lines
        this.lastFlushTime = 0;
        this.flushInterval = 50; // Flush every 50ms minimum
        this.cachedConsoleHTML = ''; // Cache innerHTML to avoid DOM reads

        this.setupBuiltins();
    }

    setupBuiltins() {
        // Print function with buffering
        this.globalEnv.set('print', (...args) => {
            const msg = args.map(a => this.toString(a)).join(' ');
            this.logBuffered(msg, 'output');
        });
        
        // Debug function - only outputs when debug is enabled
        this.globalEnv.set('debug', (...args) => {
            if (this.debugEnabled) {
                const msg = args.map(a => this.toString(a)).join(' ');
                this.logBuffered(msg, 'debug');
            }
        });
        
        // Enable/disable debug output
        this.globalEnv.set('set_debug', (enabled) => {
            this.debugEnabled = !!enabled;
        });

        // Range function
        this.globalEnv.set('range', (start, end, step = 1) => {
            if (end === undefined) {
                end = start;
                start = 0;
            }

            const result = [];
            if (step > 0) {
                for (let i = start; i < end; i += step) {
                    result.push(i);
                }
            } else {
                for (let i = start; i > end; i += step) {
                    result.push(i);
                }
            }
            return result;
        });

        // Math functions
        this.globalEnv.set('abs', Math.abs);
        this.globalEnv.set('sqrt', Math.sqrt);
        this.globalEnv.set('pow', Math.pow);
        this.globalEnv.set('floor', Math.floor);
        this.globalEnv.set('ceil', Math.ceil);
        this.globalEnv.set('round', Math.round);
        this.globalEnv.set('sin', Math.sin);
        this.globalEnv.set('cos', Math.cos);
        this.globalEnv.set('tan', Math.tan);
        this.globalEnv.set('min', Math.min);
        this.globalEnv.set('max', Math.max);
        this.globalEnv.set('random', Math.random);

        // Array functions
        this.globalEnv.set('len', (arr) => {
            if (Array.isArray(arr) || typeof arr === 'string') {
                return arr.length;
            } else if (arr instanceof Map) {
                return arr.size;
            }
            return 0;
        });

        this.globalEnv.set('append', (arr, val) => {
            if (Array.isArray(arr)) {
                arr.push(val);
            }
            return arr;
        });

        // Type conversion functions
        this.globalEnv.set('str', (val) => {
            if (val === null) return 'null';
            if (val === undefined) return 'undefined';
            if (typeof val === 'string') return val;
            if (typeof val === 'number') return val.toString();
            if (typeof val === 'boolean') return val.toString();
            if (Array.isArray(val)) return '[' + val.map(v => this.toString(v)).join(', ') + ']';
            return String(val);
        });

        this.globalEnv.set('int', (val) => {
            if (typeof val === 'number') return Math.floor(val);
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? 0 : parsed;
            }
            if (typeof val === 'boolean') return val ? 1 : 0;
            return 0;
        });

        this.globalEnv.set('float', (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const parsed = parseFloat(val);
                return isNaN(parsed) ? 0.0 : parsed;
            }
            if (typeof val === 'boolean') return val ? 1.0 : 0.0;
            return 0.0;
        });

        this.globalEnv.set('bool', (val) => {
            return this.isTruthy(val);
        });

        // String manipulation functions
        this.globalEnv.set('substr', (str, start, length = null) => {
            if (typeof str !== 'string') return '';
            if (length === null) {
                return str.substring(start);
            }
            return str.substring(start, start + length);
        });

        this.globalEnv.set('slice', (strOrArr, start, end = null) => {
            if (typeof strOrArr === 'string' || Array.isArray(strOrArr)) {
                if (end === null) {
                    return strOrArr.slice(start);
                }
                return strOrArr.slice(start, end);
            }
            return null;
        });

        this.globalEnv.set('split', (str, separator = ' ') => {
            if (typeof str !== 'string') return [];
            if (separator === '') {
                return str.split('');
            }
            return str.split(separator);
        });

        this.globalEnv.set('join', (arr, separator = '') => {
            if (!Array.isArray(arr)) return '';
            return arr.join(separator);
        });

        this.globalEnv.set('upper', (str) => {
            if (typeof str !== 'string') return '';
            return str.toUpperCase();
        });

        this.globalEnv.set('lower', (str) => {
            if (typeof str !== 'string') return '';
            return str.toLowerCase();
        });

        this.globalEnv.set('trim', (str) => {
            if (typeof str !== 'string') return '';
            return str.trim();
        });

        this.globalEnv.set('replace', (str, search, replacement) => {
            if (typeof str !== 'string') return '';
            return str.replace(new RegExp(search, 'g'), replacement);
        });

        this.globalEnv.set('starts_with', (str, prefix) => {
            if (typeof str !== 'string') return false;
            return str.startsWith(prefix);
        });

        this.globalEnv.set('ends_with', (str, suffix) => {
            if (typeof str !== 'string') return false;
            return str.endsWith(suffix);
        });

        this.globalEnv.set('contains', (strOrArr, item) => {
            if (typeof strOrArr === 'string') {
                return strOrArr.includes(item);
            } else if (Array.isArray(strOrArr)) {
                return strOrArr.includes(item);
            }
            return false;
        });

        this.globalEnv.set('index_of', (strOrArr, item) => {
            if (typeof strOrArr === 'string' || Array.isArray(strOrArr)) {
                return strOrArr.indexOf(item);
            }
            return -1;
        });

        this.globalEnv.set('char_at', (str, index) => {
            if (typeof str !== 'string') return '';
            return str.charAt(index);
        });

        this.globalEnv.set('char_code', (str, index = 0) => {
            if (typeof str !== 'string') return 0;
            return str.charCodeAt(index);
        });

        this.globalEnv.set('from_char_code', (code) => {
            return String.fromCharCode(code);
        });

        this.globalEnv.set('repeat', (str, count) => {
            if (typeof str !== 'string') return '';
            return str.repeat(Math.max(0, count));
        });

        this.globalEnv.set('reverse', (strOrArr) => {
            if (typeof strOrArr === 'string') {
                return strOrArr.split('').reverse().join('');
            } else if (Array.isArray(strOrArr)) {
                return [...strOrArr].reverse();
            }
            return strOrArr;
        });

        // Grid drawing functions
        this.globalEnv.set('init_2d', (gridSize, cellSize = 20) => {
            // Auto-switch to 2D mode
            this.renderingMode = '2d';
            if (this.canvasContainer) {
                this.canvasContainer.classList.remove('console-only');
            }
            this.canvas.style.display = 'block';
            this.canvas3d.style.display = 'none';

            // gridSize can be a number (for square grid) or [rows, cols]
            let rows, cols;
            if (Array.isArray(gridSize)) {
                [rows, cols] = gridSize;
            } else {
                rows = cols = gridSize;
            }

            this.gridRows = rows;
            this.gridCols = cols;
            this.cellSize = cellSize;

            this.canvas.width = cols * cellSize;
            this.canvas.height = rows * cellSize;

            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.strokeStyle = '#ddd';
            this.ctx.lineWidth = 1;

            for (let i = 0; i <= rows; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, i * cellSize);
                this.ctx.lineTo(cols * cellSize, i * cellSize);
                this.ctx.stroke();
            }

            for (let j = 0; j <= cols; j++) {
                this.ctx.beginPath();
                this.ctx.moveTo(j * cellSize, 0);
                this.ctx.lineTo(j * cellSize, rows * cellSize);
                this.ctx.stroke();
            }
        });

        this.globalEnv.set('set_cell', (row, col, color = 'black') => {
            if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) {
                return;
            }

            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                col * this.cellSize + 1,
                row * this.cellSize + 1,
                this.cellSize - 2,
                this.cellSize - 2
            );
        });

        this.globalEnv.set('clear_canvas', () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        });

        this.globalEnv.set('set_pixel', (x, y, color = 'black') => {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, 1, 1);
        });

        this.globalEnv.set('draw_line', (x1, y1, x2, y2, color = 'black', width = 1) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        });

        this.globalEnv.set('draw_circle', (x, y, radius, color = 'black', fill = true) => {
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            if (fill) {
                this.ctx.fillStyle = color;
                this.ctx.fill();
            } else {
                this.ctx.strokeStyle = color;
                this.ctx.stroke();
            }
        });

        this.globalEnv.set('draw_rect', (x, y, width, height, color = 'black', fill = true) => {
            if (fill) {
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, y, width, height);
            } else {
                this.ctx.strokeStyle = color;
                this.ctx.strokeRect(x, y, width, height);
            }
        });

        // Color utilities
        this.globalEnv.set('rgb', (r, g, b) => {
            return `rgb(${r}, ${g}, ${b})`;
        });

        this.globalEnv.set('hsl', (h, s, l) => {
            return `hsl(${h}, ${s}%, ${l}%)`;
        });

        // 3D Voxel functions
        this.globalEnv.set('init_3d', (voxelSize = 8, spacing = 10) => {
            if (this.renderer3d) {
                // Auto-show 3D canvas
                this.renderingMode = '3d';
                if (this.canvasContainer) {
                    this.canvasContainer.classList.remove('console-only');
                }
                this.canvas.style.display = 'none';
                this.canvas3d.style.display = 'block';

                // Ensure canvas fills container
                const container = this.canvas3d.parentElement;
                const containerWidth = container.clientWidth - 40;
                const containerHeight = container.clientHeight - 40;
                this.canvas3d.width = containerWidth;
                this.canvas3d.height = containerHeight;

                this.renderer3d.init(voxelSize, spacing);
                this.renderer3d.resize();
            }
        });

        this.globalEnv.set('set_voxel', (x, y, z, color = '#4ec9b0') => {
            if (this.renderer3d) {
                this.renderer3d.setVoxel(x, y, z, color);
            }
        });

        this.globalEnv.set('remove_voxel', (x, y, z) => {
            if (this.renderer3d) {
                this.renderer3d.removeVoxel(x, y, z);
            }
        });

        this.globalEnv.set('get_voxel', (x, y, z) => {
            if (this.renderer3d) {
                return this.renderer3d.getVoxel(x, y, z);
            }
            return null;
        });

        this.globalEnv.set('clear_3d', () => {
            if (this.renderer3d) {
                this.renderer3d.clear(false); // Don't reset camera on manual clear
            }
        });

        this.globalEnv.set('begin_3d_batch', () => {
            if (this.renderer3d) {
                this.renderer3d.beginBatch();
            }
        });

        this.globalEnv.set('end_3d_batch', () => {
            if (this.renderer3d) {
                this.renderer3d.endBatch();
            }
        });

        // Input data functions
        this.globalEnv.set('input_string', (filename = null) => {
            const data = filename ? (this.inputsMap[filename] || '') : this.inputData;
            return data;
        });

        this.globalEnv.set('input_lines', (filename = null) => {
            const data = filename ? (this.inputsMap[filename] || '') : this.inputData;
            return data.split('\n').filter(line => line.length > 0);
        });

        this.globalEnv.set('input_grid', (type = 'char', separator = null, filename = null) => {
            const data = filename ? (this.inputsMap[filename] || '') : this.inputData;
            const lines = data.split('\n').filter(line => line.trim().length > 0);

            // Smart separator detection if not provided
            if (separator === null) {
                if (type === 'char') {
                    separator = ''; // Each character
                } else {
                    // Auto-detect: check first line for comma or space
                    const firstLine = lines[0] || '';
                    if (firstLine.includes(',')) {
                        separator = ',';
                    } else {
                        separator = ' ';
                    }
                }
            }

            return lines.map(line => {
                let elements;
                if (separator === '') {
                    // Split into characters
                    elements = line.split('');
                } else {
                    elements = line.split(separator).filter(e => e.trim().length > 0);
                }

                // Convert based on type
                if (type === 'int') {
                    return elements.map(e => parseInt(e.trim())).filter(n => !isNaN(n));
                } else if (type === 'float') {
                    return elements.map(e => parseFloat(e.trim())).filter(n => !isNaN(n));
                } else if (type === 'word') {
                    return elements.map(e => e.trim());
                } else {
                    // 'char' or default
                    return elements;
                }
            });
        });

        // Timing functions
        this.globalEnv.set('time', () => {
            return Date.now() / 1000; // Return time in seconds
        });

        this.globalEnv.set('clock', () => {
            return performance.now() / 1000; // High-resolution time in seconds
        });

        this.globalEnv.set('benchmark', (func, iterations = 1) => {
            if (typeof func !== 'function') {
                throw new Error('benchmark() requires a function as first argument');
            }

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                func();
            }
            const end = performance.now();
            const elapsed = (end - start) / 1000;

            this.log(`Benchmark: ${iterations} iteration(s) took ${elapsed.toFixed(6)}s (avg: ${(elapsed / iterations).toFixed(6)}s per call)`, 'output');

            return elapsed;
        });

        // Animation function
        this.globalEnv.set('animate', (callback, fps = 30, options = null) => {
            if (typeof callback !== 'function') {
                throw new Error('animate() requires a function as first argument');
            }

            // Handle options (can be passed as 2nd or 3rd argument, can be Map or object)
            let actualFps = fps;
            let actualOptions = options;

            // If 2nd arg is a Map or object, use it as options
            if (fps instanceof Map || (typeof fps === 'object' && fps !== null && !Array.isArray(fps))) {
                actualOptions = fps;
                // Check if fps is specified in the options
                if (actualOptions instanceof Map) {
                    actualFps = actualOptions.get('fps') || 30;
                } else {
                    actualFps = actualOptions.fps || 30;
                }
            }

            // Convert Map to object for easier access
            let opts = { clear3d: false, batch3d: true };
            if (actualOptions instanceof Map) {
                actualOptions.forEach((value, key) => {
                    opts[key] = value;
                });
            } else if (actualOptions) {
                opts = { ...opts, ...actualOptions };
            }

            // Stop any existing animation
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                clearInterval(this.animationInterval);
            }

            this.animationRunning = true;
            this.animationStartTime = performance.now() / 1000;
            const frameDelay = 1000 / actualFps;

            const animate = () => {
                if (!this.animationRunning) return;

                const currentTime = performance.now() / 1000;
                const elapsed = currentTime - this.animationStartTime;

                try {
                    // Auto-batch 3D operations if enabled
                    if (opts.batch3d && this.renderer3d) {
                        this.renderer3d.beginBatch();
                    }

                    // Auto-clear 3D if enabled
                    if (opts.clear3d && this.renderer3d) {
                        this.renderer3d.clear(false); // Don't reset camera during animation
                    }

                    callback(elapsed);

                    // End batch if enabled
                    if (opts.batch3d && this.renderer3d) {
                        this.renderer3d.endBatch();
                    }
                } catch (e) {
                    this.log(`Animation error: ${e.message}`, 'error');
                    this.animationRunning = false;
                    return;
                }

                this.animationId = setTimeout(() => {
                    requestAnimationFrame(animate);
                }, frameDelay);
            };

            animate();
        });

        // Stop animation
        this.globalEnv.set('stop_animation', () => {
            this.animationRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                clearInterval(this.animationInterval);
                this.animationId = null;
            }
        });
    }

    logBuffered(message, type = 'output') {
        // Store HTML with color spans for better performance
        let color;
        if (type === 'error') {
            color = '#f48771';
        } else if (type === 'debug') {
            color = '#888888'; // Grey for debug
        } else {
            color = '#4fc1ff'; // Blue for normal output
        }
        const escapedMsg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        this.printBuffer.push(`<span style="color:${color}">${escapedMsg}</span>`);
        
        // Flush if buffer is full or enough time has passed
        const now = performance.now();
        if (this.printBuffer.length >= this.printBufferSize || 
            (now - this.lastFlushTime) >= this.flushInterval) {
            this.flushPrintBuffer();
        }
    }
    
    flushPrintBuffer() {
        if (this.printBuffer.length === 0) return;
        
        // Build string in memory then write to DOM once
        this.cachedConsoleHTML += this.printBuffer.join('\n') + '\n';
        this.consoleElement.innerHTML = this.cachedConsoleHTML;
        this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
        
        this.printBuffer = [];
        this.lastFlushTime = performance.now();
    }

    log(message, type = 'output') {
        // Direct logging for non-print messages (errors, benchmarks, etc.)
        const color = type === 'error' ? '#f48771' : '#10b981';
        const escapedMsg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        this.cachedConsoleHTML += `<span style="color:${color}">${escapedMsg}</span>\n`;
        this.consoleElement.innerHTML = this.cachedConsoleHTML;
        this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
    }

    toString(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'boolean') return value.toString();
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') return value;
        if (value instanceof Regex) return value.toString();
        if (Array.isArray(value)) return '[' + value.map(v => this.toString(v)).join(', ') + ']';
        if (value instanceof Map) {
            const pairs = [];
            for (const [k, v] of value.entries()) {
                pairs.push(`${k}: ${this.toString(v)}`);
            }
            return '{' + pairs.join(', ') + '}';
        }
        if (typeof value === 'function') return '<function>';
        return String(value);
    }

    run(ast) {
        try {
            // Start in console-only mode
            this.renderingMode = 'console';
            if (this.canvasContainer) {
                this.canvasContainer.classList.add('console-only');
            }
            
            this.eval(ast, this.globalEnv);
            
            // Flush any remaining buffered prints
            this.flushPrintBuffer();
        } catch (e) {
            // Flush buffer even on error
            this.flushPrintBuffer();
            if (!(e instanceof ReturnValue)) {
                throw e;
            }
        }
    }

    eval(node, env) {
        switch (node.type) {
            case 'Program':
                let result = null;
                for (const stmt of node.body) {
                    result = this.eval(stmt, env);
                }
                return result;

            case 'ExprStmt':
                return this.eval(node.expression, env);

            case 'Block':
                let blockResult = null;
                for (const stmt of node.body) {
                    blockResult = this.eval(stmt, env);
                }
                return blockResult;

            case 'If':
                const condition = this.eval(node.condition, env);
                if (this.isTruthy(condition)) {
                    return this.eval(node.consequent, env);
                } else if (node.alternate) {
                    return this.eval(node.alternate, env);
                }
                return null;

            case 'While':
                while (this.isTruthy(this.eval(node.condition, env))) {
                    this.eval(node.body, env);
                }
                return null;

            case 'For': {
                const iterable = this.eval(node.iterable, env);
                const loopEnv = new Environment(env);

                if (Array.isArray(iterable)) {
                    for (const item of iterable) {
                        loopEnv.set(node.variable, item);
                        this.eval(node.body, loopEnv);
                    }
                } else if (iterable instanceof Map) {
                    for (const key of iterable.keys()) {
                        loopEnv.set(node.variable, key);
                        this.eval(node.body, loopEnv);
                    }
                } else {
                    throw new GridLangError('For loop requires an iterable', node.line, node.col, 'RuntimeError');
                }
                return null;
            }

            case 'FuncDef': {
                const func = (...args) => {
                    const funcEnv = new Environment(env);

                    for (let i = 0; i < node.params.length; i++) {
                        funcEnv.set(node.params[i], args[i] !== undefined ? args[i] : null);
                    }

                    try {
                        this.eval(node.body, funcEnv);
                        return null;
                    } catch (e) {
                        if (e instanceof ReturnValue) {
                            return e.value;
                        }
                        throw e;
                    }
                };

                env.set(node.name, func);
                return null;
            }

            case 'Return':
                const returnValue = node.value ? this.eval(node.value, env) : null;
                throw new ReturnValue(returnValue);

            case 'Assignment':
                const value = this.eval(node.value, env);
                try {
                    env.update(node.target, value);
                } catch (e) {
                    env.set(node.target, value);
                }
                return value;

            case 'IndexAssignment': {
                const obj = this.eval(node.object, env);
                const index = this.eval(node.index, env);
                const val = this.eval(node.value, env);

                if (Array.isArray(obj)) {
                    obj[index] = val;
                } else if (obj instanceof Map) {
                    obj.set(index, val);
                }
                return val;
            }

            case 'MemberAssignment': {
                const obj = this.eval(node.object, env);
                const property = node.property;
                const val = this.eval(node.value, env);

                if (obj instanceof Map) {
                    obj.set(property, val);
                }
                return val;
            }

            case 'BinaryOp':
                return this.evalBinaryOp(node, env);

            case 'UnaryOp':
                return this.evalUnaryOp(node, env);

            case 'Call': {
                const func = this.eval(node.func, env);
                const args = node.args.map(arg => this.eval(arg, env));

                if (typeof func !== 'function') {
                    throw new GridLangError(`${node.func.name} is not a function`, node.line, node.col, 'TypeError');
                }

                return func(...args);
            }

            case 'Index': {
                const obj = this.eval(node.object, env);
                const index = this.eval(node.index, env);

                if (Array.isArray(obj)) {
                    return obj[index];
                } else if (obj instanceof Map) {
                    return obj.get(index);
                } else if (typeof obj === 'string') {
                    return obj[index];
                }
                return null;
            }

            case 'MemberAccess': {
                const obj = this.eval(node.object, env);
                const property = node.property;

                if (obj instanceof Map) {
                    return obj.get(property);
                }
                
                // Handle Regex methods
                if (obj instanceof Regex) {
                    const method = obj[property];
                    if (typeof method === 'function') {
                        return method.bind(obj);
                    }
                    return null;
                }
                
                return null;
            }

            case 'Identifier':
                try {
                    return env.get(node.name);
                } catch (e) {
                    if (e instanceof GridLangError && !e.line) {
                        throw new GridLangError(e.message, node.line, node.col, e.errorType);
                    }
                    throw e;
                }

            case 'Number':
                return node.value;

            case 'String':
                return node.value;

            case 'FString': {
                let result = '';
                for (const part of node.parts) {
                    if (part.type === 'string') {
                        result += part.value;
                    } else if (part.type === 'var') {
                        // Resolve variable path (e.g., ["person", "name"])
                        let value;
                        
                        try {
                            // Start with the first variable name from environment
                            const varName = part.path[0];
                            value = env.get(varName);
                            
                            // Follow the rest of the path (dot notation)
                            for (let i = 1; i < part.path.length; i++) {
                                const prop = part.path[i];
                                if (value instanceof Map) {
                                    value = value.get(prop);
                                } else if (value && typeof value === 'object') {
                                    value = value[prop];
                                } else {
                                    value = undefined;
                                    break;
                                }
                            }
                        } catch (e) {
                            // Variable not found - use undefined
                            value = undefined;
                        }
                        
                        result += this.toString(value);
                    }
                }
                return result;
            }

            case 'RegexLiteral':
                return new Regex(node.pattern);

            case 'Boolean':
                return node.value;

            case 'Null':
                return null;

            case 'Array':
                return node.elements.map(el => this.eval(el, env));

            case 'Map': {
                const map = new Map();
                for (const entry of node.entries) {
                    const value = this.eval(entry.value, env);
                    map.set(entry.key, value);
                }
                return map;
            }

            default:
                throw new GridLangError(`Unknown node type: ${node.type}`, node.line, node.col, 'RuntimeError');
        }
    }

    evalBinaryOp(node, env) {
        if (node.op === 'and') {
            const left = this.eval(node.left, env);
            if (!this.isTruthy(left)) return left;
            return this.eval(node.right, env);
        }

        if (node.op === 'or') {
            const left = this.eval(node.left, env);
            if (this.isTruthy(left)) return left;
            return this.eval(node.right, env);
        }

        const left = this.eval(node.left, env);
        const right = this.eval(node.right, env);

        switch (node.op) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return left / right;
            case '%': return left % right;
            case '**': return Math.pow(left, right);
            case '==': return left === right;
            case '!=': return left !== right;
            case '<': return left < right;
            case '<=': return left <= right;
            case '>': return left > right;
            case '>=': return left >= right;
            default:
                throw new GridLangError(`Unknown operator: ${node.op}`, node.line, node.col, 'RuntimeError');
        }
    }

    evalUnaryOp(node, env) {
        const operand = this.eval(node.operand, env);

        switch (node.op) {
            case '-': return -operand;
            case 'not': return !this.isTruthy(operand);
            default:
                throw new GridLangError(`Unknown unary operator: ${node.op}`, node.line, node.col, 'RuntimeError');
        }
    }

    isTruthy(value) {
        if (value === null || value === false) return false;
        if (value === 0 || value === '') return false;
        return true;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Interpreter, GridLangError };
}

