// GridLang Virtual Machine
// Stack-based VM for executing bytecode

// Import OpCode if in Node.js environment
let OpCode, GridLangError, GridObject;
if (typeof require !== 'undefined') {
    const bytecode = require('./bytecode.js');
    OpCode = bytecode.OpCode;
    try {
        const gridlang = require('./gridlang.js');
        GridLangError = gridlang.GridLangError;
        GridObject = gridlang.GridObject;
    } catch (e) {
        // GridLangError not available, define it
        class GridLangErrorLocal extends Error {
            constructor(message, line, col, type = 'Error') {
                super(message);
                this.name = 'GridLangError';
                this.line = line;
                this.col = col;
                this.errorType = type;
            }
        }
        GridLangError = GridLangErrorLocal;
    }
}

// ChainedMap - a Map with a parent for fallback lookup (lexical scoping)
class ChainedMap extends Map {
    constructor(parent = null) {
        super();
        this.parent = parent;
    }
    
    get(key) {
        if (super.has(key)) {
            return super.get(key);
        }
        if (this.parent) {
            return this.parent.get(key);
        }
        return undefined;
    }
    
    has(key) {
        return super.has(key) || (this.parent && this.parent.has(key));
    }
    
    set(key, value) {
        // If the key exists in parent scope, update it there (for closures)
        // Otherwise create a new local binding
        if (!super.has(key) && this.parent && this.parent.has(key)) {
            this.parent.set(key, value);
        } else {
            super.set(key, value);
        }
        return this;
    }
}

// ============= VM =============
class VM {
    constructor(canvas, canvas3d, consoleElement, renderer3d, inputData, canvasContainer, inputsMap = null) {
        // Same interface as old Interpreter
        this.canvas = canvas;
        this.canvas3d = canvas3d;
        this.ctx = canvas ? canvas.getContext('2d') : null;
        this.consoleElement = consoleElement;
        this.renderer3d = renderer3d;
        this.inputData = inputData || '';
        this.canvasContainer = canvasContainer;
        this.inputsMap = inputsMap || {};
        
        // VM state
        this.stack = [];
        this.frames = [];  // Call frames
        this.globals = new Map();
        this.ip = 0;  // Instruction pointer
        this.chunk = null;
        
        // Runtime state (same as old interpreter)
        this.gridSize = 0;
        this.cellSize = 0;
        this.gridRows = 0;
        this.gridCols = 0;
        this.renderingMode = 'console';
        this.debugEnabled = false;
        
        // Print buffer
        this.printBuffer = [];
        this.printBufferSize = 100;
        this.lastFlushTime = 0;
        this.flushInterval = 50;
        this.cachedConsoleHTML = '';
        
        // Animation recording
        this.recordingFrames = [];
        this.isRecording = false;
        
        this.setupBuiltins();
    }
    
    setupBuiltins() {
        // Print function with buffering
        this.globals.set('print', (...args) => {
            const msg = args.map(a => this.toString(a)).join(' ');
            this.logBuffered(msg, 'output');
        });

        // Debug function - only outputs when debug is enabled
        this.globals.set('debug', (...args) => {
            if (this.debugEnabled) {
                const msg = args.map(a => this.toString(a)).join(' ');
                this.logBuffered(msg, 'debug');
            }
        });

        // Enable/disable debug output
        this.globals.set('set_debug', (enabled) => {
            this.debugEnabled = !!enabled;
        });

        // Assert function
        this.globals.set('assert', (condition, message = 'Assertion failed') => {
            if (!condition) {
                throw new Error(message);
            }
        });

        // Range function
        this.globals.set('range', (start, end, step = 1) => {
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
        this.globals.set('abs', Math.abs);
        this.globals.set('sqrt', Math.sqrt);
        this.globals.set('pow', Math.pow);
        this.globals.set('floor', Math.floor);
        this.globals.set('ceil', Math.ceil);
        this.globals.set('round', Math.round);
        this.globals.set('sin', Math.sin);
        this.globals.set('cos', Math.cos);
        this.globals.set('tan', Math.tan);
        this.globals.set('min', Math.min);
        this.globals.set('max', Math.max);
        this.globals.set('random', () => Math.random());

        this.globals.set('clamp', (val, min, max) => {
            if (typeof val !== 'number' || typeof min !== 'number' || typeof max !== 'number') return 0;
            return Math.min(Math.max(val, min), max);
        });

        this.globals.set('lerp', (start, end, t) => {
            if (typeof start !== 'number' || typeof end !== 'number' || typeof t !== 'number') return 0;
            return start + (end - start) * t;
        });

        this.globals.set('sign', (num) => {
            if (typeof num !== 'number') return 0;
            return Math.sign(num);
        });

        // Abstract Data Type functions
        this.globals.set('keys', (obj) => {
            if (obj instanceof Map) {
                return Array.from(obj.keys());
            } else if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                // For JS objects used as maps internally (less common in gridlang env but possible)
                return Object.keys(obj);
            }
            return [];
        });

        this.globals.set('values', (obj) => {
            if (obj instanceof Map) {
                return Array.from(obj.values());
            } else if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                return Object.values(obj);
            }
            return [];
        });

        // Array functions
        this.globals.set('len', (arr) => {
            if (Array.isArray(arr) || typeof arr === 'string') {
                return arr.length;
            } else if (arr instanceof Map) {
                return arr.size;
            }
            return 0;
        });

        this.globals.set('append', (arr, val) => {
            if (Array.isArray(arr)) {
                arr.push(val);
            }
            return arr;
        });

        this.globals.set('add', (arr, val, index = null) => {
            if (Array.isArray(arr)) {
                if (index === null) {
                    arr.push(val);
                } else {
                    // Ensure index is an integer
                    const idx = typeof index === 'number' ? Math.floor(index) : 0;
                    // Splice inserts at index
                    arr.splice(idx, 0, val);
                }
            }
            return arr;
        });

        // Array method aliases
        this.globals.set('insert', (arr, index, val) => {
            if (Array.isArray(arr)) {
                const idx = typeof index === 'number' ? Math.floor(index) : 0;
                arr.splice(idx, 0, val);
            }
            return arr;
        });

        // Global remove function - removes by INDEX (or pops if no index)
        this.globals.set('remove', (arr, index = null) => {
            if (Array.isArray(arr)) {
                if (index === null) {
                    // Pop from end if no index specified
                    return arr.pop();
                } else {
                    // Remove at index
                    const idx = typeof index === 'number' ? Math.floor(index) : 0;
                    const removed = arr.splice(idx, 1);
                    return removed.length > 0 ? removed[0] : null;
                }
            }
            return null;
        });

        this.globals.set('removeAt', (arr, index) => {
            if (Array.isArray(arr)) {
                const idx = typeof index === 'number' ? Math.floor(index) : 0;
                if (idx >= 0 && idx < arr.length) {
                    return arr.splice(idx, 1)[0];
                }
            }
            return null;
        });

        this.globals.set('clear', (arr) => {
            if (Array.isArray(arr)) {
                arr.length = 0;
            }
            return arr;
        });

        this.globals.set('count', (arr, val) => {
            if (Array.isArray(arr)) {
                return arr.filter(x => x === val).length;
            }
            return 0;
        });

        // Set Operations
        this.globals.set('merge', (arr1, arr2) => {
            if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
            return arr1.concat(arr2);
        });

        this.globals.set('diff', (arr1, arr2) => {
            if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
            const set2 = new Set(arr2);
            return arr1.filter(x => !set2.has(x));
        });

        this.globals.set('intersect', (arr1, arr2) => {
            if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
            const set2 = new Set(arr2);
            // Unique intersection
            const set1 = new Set(arr1);
            return [...set1].filter(x => set2.has(x));
        });

        this.globals.set('union', (arr1, arr2) => {
            if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
            return [...new Set([...arr1, ...arr2])];
        });

        // Type conversion functions
        this.globals.set('str', (val) => {
            if (val === null) return 'null';
            if (val === undefined) return 'undefined';
            if (typeof val === 'string') return val;
            if (typeof val === 'number') return val.toString();
            if (typeof val === 'boolean') return val.toString();
            if (Array.isArray(val)) return '[' + val.map(v => this.toString(v)).join(', ') + ']';
            return String(val);
        });

        this.globals.set('int', (val) => {
            if (typeof val === 'number') return Math.floor(val);
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                return isNaN(parsed) ? 0 : parsed;
            }
            if (typeof val === 'boolean') return val ? 1 : 0;
            return 0;
        });

        this.globals.set('float', (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const parsed = parseFloat(val);
                return isNaN(parsed) ? 0.0 : parsed;
            }
            if (typeof val === 'boolean') return val ? 1.0 : 0.0;
            return 0.0;
        });

        this.globals.set('bool', (val) => {
            return this.isTruthy(val);
        });

        // String manipulation functions
        this.globals.set('substr', (str, start, length = null) => {
            if (typeof str !== 'string') return '';
            if (length === null) {
                return str.substring(start);
            }
            return str.substring(start, start + length);
        });
        
        this.globals.set('substring', (str, start, end = null) => {
            if (typeof str !== 'string') return '';
            if (end === null) {
                return str.substring(start);
            }
            return str.substring(start, end);
        });

        this.globals.set('slice', (strOrArr, start, end = null) => {
            if (typeof strOrArr === 'string' || Array.isArray(strOrArr)) {
                if (end === null) {
                    return strOrArr.slice(start);
                }
                return strOrArr.slice(start, end);
            }
            return null;
        });

        this.globals.set('split', (str, separator = ' ') => {
            if (typeof str !== 'string') return [];
            if (separator === '') {
                return str.split('');
            }
            return str.split(separator);
        });

        this.globals.set('join', (arr, separator = '') => {
            if (!Array.isArray(arr)) return '';
            return arr.join(separator);
        });

        this.globals.set('upper', (str) => {
            if (typeof str !== 'string') return '';
            return str.toUpperCase();
        });

        this.globals.set('lower', (str) => {
            if (typeof str !== 'string') return '';
            return str.toLowerCase();
        });

        this.globals.set('trim', (str) => {
            if (typeof str !== 'string') return '';
            return str.trim();
        });

        this.globals.set('replace', (str, search, replacement) => {
            if (typeof str !== 'string') return '';
            return str.replace(new RegExp(search, 'g'), replacement);
        });

        this.globals.set('starts_with', (str, prefix) => {
            if (typeof str !== 'string') return false;
            return str.startsWith(prefix);
        });
        this.globals.set('startsWith', this.globals.get('starts_with')); // Alias

        this.globals.set('ends_with', (str, suffix) => {
            if (typeof str !== 'string') return false;
            return str.endsWith(suffix);
        });
        this.globals.set('endsWith', this.globals.get('ends_with')); // Alias

        this.globals.set('contains', (strOrArr, item) => {
            if (typeof strOrArr === 'string') {
                return strOrArr.includes(item);
            } else if (Array.isArray(strOrArr)) {
                return strOrArr.includes(item);
            }
            return false;
        });

        this.globals.set('index_of', (strOrArr, item) => {
            if (typeof strOrArr === 'string' || Array.isArray(strOrArr)) {
                return strOrArr.indexOf(item);
            }
            return -1;
        });
        this.globals.set('indexOf', this.globals.get('index_of')); // Alias

        this.globals.set('char_at', (str, index) => {
            if (typeof str !== 'string') return '';
            return str.charAt(index);
        });

        this.globals.set('char_code', (str, index = 0) => {
            if (typeof str !== 'string') return 0;
            return str.charCodeAt(index);
        });

        this.globals.set('from_char_code', (code) => {
            return String.fromCharCode(code);
        });

        this.globals.set('repeat', (str, count) => {
            if (typeof str !== 'string') return '';
            return str.repeat(Math.max(0, count));
        });

        this.globals.set('reverse', (strOrArr) => {
            if (typeof strOrArr === 'string') {
                return strOrArr.split('').reverse().join('');
            } else if (Array.isArray(strOrArr)) {
                return [...strOrArr].reverse();
            }
            return strOrArr;
        });

        this.globals.set('sort', (arr, compareFn = null) => {
            if (!Array.isArray(arr)) return arr;
            const copy = [...arr];
            if (compareFn && typeof compareFn === 'function') {
                copy.sort((a, b) => compareFn(a, b));
            } else {
                copy.sort((a, b) => {
                    const aStr = String(a);
                    const bStr = String(b);
                    return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
                });
            }
            return copy;
        });

        // Grid drawing functions
        this.globals.set('init_2d', (gridSize, cellSize = 20) => {
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

        this.globals.set('set_cell', (row, col, color = 'black') => {
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

        this.globals.set('clear_canvas', () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        });

        this.globals.set('set_pixel', (x, y, color = 'black') => {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, 1, 1);
        });

        this.globals.set('draw_line', (x1, y1, x2, y2, color = 'black', width = 1) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        });

        this.globals.set('draw_circle', (x, y, radius, color = 'black', fill = true) => {
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

        this.globals.set('draw_rect', (x, y, width, height, color = 'black', fill = true) => {
            if (fill) {
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, y, width, height);
            } else {
                this.ctx.strokeStyle = color;
                this.ctx.strokeRect(x, y, width, height);
            }
        });

        // Color utilities
        this.globals.set('rgb', (r, g, b) => {
            return `rgb(${r}, ${g}, ${b})`;
        });

        this.globals.set('hsl', (h, s, l) => {
            return `hsl(${h}, ${s}%, ${l}%)`;
        });

        // 3D Voxel functions
        this.globals.set('init_3d', (voxelSize = 8, spacing = 10) => {
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

        this.globals.set('set_voxel', (x, y, z, color = '#4ec9b0') => {
            if (this.renderer3d) {
                this.renderer3d.setVoxel(x, y, z, color);
            }
        });

        this.globals.set('remove_voxel', (x, y, z) => {
            if (this.renderer3d) {
                this.renderer3d.removeVoxel(x, y, z);
            }
        });

        this.globals.set('get_voxel', (x, y, z) => {
            if (this.renderer3d) {
                return this.renderer3d.getVoxel(x, y, z);
            }
            return null;
        });

        this.globals.set('clear_3d', () => {
            if (this.renderer3d) {
                this.renderer3d.clear(false); // Don't reset camera on manual clear
            }
        });

        this.globals.set('begin_3d_batch', () => {
            if (this.renderer3d) {
                this.renderer3d.beginBatch();
            }
        });

        this.globals.set('end_3d_batch', () => {
            if (this.renderer3d) {
                this.renderer3d.endBatch();
            }
        });

        // Input data functions
        this.globals.set('input_string', (filename = null) => {
            const data = filename ? (this.inputsMap[filename] || '') : this.inputData;
            return data;
        });

        this.globals.set('input_lines', (filename = null) => {
            const data = filename ? (this.inputsMap[filename] || '') : this.inputData;
            return data.split('\n').filter(line => line.length > 0);
        });

        this.globals.set('input_grid', (type = 'char', separator = null, filename = null) => {
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
        this.globals.set('time', () => {
            return Date.now() / 1000; // Return time in seconds
        });

        this.globals.set('clock', () => {
            return performance.now() / 1000; // High-resolution time in seconds
        });

        this.globals.set('benchmark', (func, iterations = 1) => {
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

        // Animation function - uses requestAnimationFrame for smooth 60fps animations
        this.globals.set('animate', (callback, options = null) => {
            if (typeof callback !== 'function') {
                throw new Error('animate() requires a function as first argument');
            }

            // Handle options parameter
            let opts = { clear3d: false, batch3d: true };
            if (options instanceof Map) {
                options.forEach((value, key) => {
                    opts[key] = value;
                });
            } else if (options && typeof options === 'object') {
                opts = { ...opts, ...options };
            }

            // Stop any existing animation
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }

            this.animationRunning = true;
            this.animationStartTime = performance.now() / 1000;
            let frameCount = 0;

            const animate = () => {
                if (!this.animationRunning) return;

                frameCount++;
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

                    // Call callback and check if it returns false to stop
                    const result = callback(elapsed);

                    if (result === false) {
                        this.animationRunning = false;
                        // End batch if enabled
                        if (opts.batch3d && this.renderer3d) {
                            this.renderer3d.endBatch();
                        }
                        this.flushPrintBuffer();
                        const totalTime = elapsed.toFixed(3);
                        this.log(`Animation stopped: ${frameCount} frames in ${totalTime}s (avg: ${(frameCount / elapsed).toFixed(1)} fps)`, 'output');
                        // Call stop callback if provided
                        if (this.onAnimationStop) {
                            this.onAnimationStop();
                        }
                        return;
                    }

                    // End batch if enabled
                    if (opts.batch3d && this.renderer3d) {
                        this.renderer3d.endBatch();
                    }

                    // Capture frame if recording
                    if (this.isRecording) {
                        const frameData = {
                            elapsed: elapsed,
                            timestamp: performance.now()
                        };
                        if (this.canvas && this.renderingMode === '2d') {
                            frameData.imageData = this.canvas.toDataURL('image/png');
                        } else if (this.canvas3d && this.renderingMode === '3d') {
                            frameData.imageData = this.canvas3d.toDataURL('image/png');
                        }
                        this.recordingFrames.push(frameData);
                    }
                } catch (e) {
                    this.flushPrintBuffer();
                    this.log(`Animation error: ${e.message}`, 'error');
                    this.animationRunning = false;
                    const totalTime = (performance.now() / 1000 - this.animationStartTime).toFixed(3);
                    this.log(`Animation stopped: ${frameCount} frames in ${totalTime}s`, 'output');
                    // Call stop callback if provided
                    if (this.onAnimationStop) {
                        this.onAnimationStop();
                    }
                    return;
                }

                // Schedule next frame
                if (this.animationRunning) {
                    this.animationId = requestAnimationFrame(animate);
                }
            };

            this.animationId = requestAnimationFrame(animate);
        });

        // Stop animation
        this.globals.set('stop_animation', () => {
            if (this.animationRunning) {
                this.animationRunning = false;
                if (this.animationId) {
                    cancelAnimationFrame(this.animationId);
                    clearInterval(this.animationInterval);
                    this.animationId = null;
                }
                this.log('Animation stopped by stop_animation()', 'output');
            }
        });

        // Start recording animation frames
        this.globals.set('record_animation', () => {
            this.recordingFrames = [];
            this.isRecording = true;
            this.log('Recording animation frames...', 'output');
        });

        // Save animation as animated GIF
        this.globals.set('save_animation_gif', (filename = 'animation.gif', delay = 33) => {
            if (!this.isRecording && this.recordingFrames.length === 0) {
                throw new Error('No animation frames recorded. Call record_animation() first and run an animation.');
            }

            this.isRecording = false;

            if (this.recordingFrames.length === 0) {
                this.log('No frames to save', 'error');
                return;
            }

            this.log(`Creating GIF from ${this.recordingFrames.length} frames...`, 'output');

            // Use GIF.js library
            if (typeof GIF === 'undefined') {
                throw new Error('GIF library not loaded');
            }

            const gif = new GIF({
                workers: 2,
                quality: 10,
                workerScript: 'gif.worker.js'
            });

            // Load all images and add frames to GIF
            let loadedCount = 0;
            const totalFrames = this.recordingFrames.length;

            this.recordingFrames.forEach((frameData, index) => {
                const img = new Image();
                img.onload = () => {
                    gif.addFrame(img, { delay: delay, copy: true });
                    loadedCount++;

                    // Start rendering when all frames are loaded
                    if (loadedCount === totalFrames) {
                        this.log('All frames loaded, rendering GIF...', 'output');
                        gif.render();
                    }
                };
                img.onerror = () => {
                    this.log(`Failed to load frame ${index}`, 'error');
                    loadedCount++;
                    if (loadedCount === totalFrames) {
                        gif.render();
                    }
                };
                img.src = frameData.imageData;
            });

            gif.on('finished', (blob) => {
                if (typeof document !== 'undefined') {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                }
                this.log(`GIF saved: ${filename} (${totalFrames} frames)`, 'output');
            });
        });

        // Stop recording
        this.globals.set('stop_recording', () => {
            if (this.isRecording) {
                this.isRecording = false;
                this.log(`Recording stopped: ${this.recordingFrames.length} frames captured`, 'output');
            }
        });

        // Clear recorded frames
        this.globals.set('clear_recording', () => {
            this.recordingFrames = [];
            this.isRecording = false;
            this.log('Recording cleared', 'output');
        });

        // Get recorded frames info
        this.globals.set('get_animation_frames', () => {
            return JSON.stringify({
                frameCount: this.recordingFrames.length,
                isRecording: this.isRecording,
                renderingMode: this.renderingMode,
                timestamp: new Date().toISOString()
            });
        });

        // Grid constructor
        this.globals.set('Grid', (data) => {
            return new GridObject(data, this);
        });
    }
    run(chunk) {
        this.chunk = chunk;
        this.ip = 0;
        this.stack = [];
        this.frames = [];
        
        try {
            const result = this.execute();
            this.flushPrintBuffer(); // Flush any remaining output
            return result;
        } catch (e) {
            this.flushPrintBuffer(); // Flush before throwing
            if (e.name === 'GridLangError') {
                throw e;
            }
            // Convert JS errors to GridLang errors
            const line = this.chunk.lines[this.ip] || 0;
            throw new GridLangError(e.message, line, null, 'RuntimeError');
        }
    }
    
    execute() {
        // Cache frequently accessed properties for better performance
        const code = this.chunk.code;
        const codeLength = code.length;
        const constants = this.chunk.constants;
        const stack = this.stack;
        
        while (this.ip < codeLength) {
            const opcode = code[this.ip++];
            
            if (this.debugEnabled && this.debugBytecodeMod > 0 && this.ip % this.debugBytecodeMod === 0) {
                console.log(`IP: ${this.ip}, Stack: [${stack.slice(-5).join(', ')}]`);
            }
            
            switch (opcode) {
                case OpCode.LOAD_CONST: {
                    const idx = code[this.ip++];
                    let value = constants[idx];
                    
                    // Wrap GridLang functions so they're callable from JS
                    if (value && value.type === 'function' && value.chunk) {
                        const vm = this;
                        const funcObj = value;
                        // Capture reference to current globals (not a copy)
                        // This allows closures to work AND mutations to propagate
                        const capturedGlobals = this.globals;
                        
                        value = function(...args) {
                            // Save VM state
                            const savedChunk = vm.chunk;
                            const savedIp = vm.ip;
                            const savedGlobals = vm.globals;
                            
                            // Create a new scope with the captured globals as parent
                            // This allows recursive calls to have separate parameter bindings
                            // while still accessing the outer scope
                            vm.globals = new ChainedMap(capturedGlobals);
                            
                            // Bind parameters
                            for (let i = 0; i < funcObj.paramCount; i++) {
                                const paramName = funcObj.chunk.names[i];
                                vm.globals.set(paramName, args[i] !== undefined ? args[i] : null);
                            }
                            
                            vm.chunk = funcObj.chunk;
                            vm.ip = 0;
                            
                            try {
                                vm.execute();
                                const result = vm.stack.length > 0 ? vm.pop() : null;
                                
                                // Restore state
                                vm.chunk = savedChunk;
                                vm.ip = savedIp;
                                vm.globals = savedGlobals;
                                
                                return result;
                            } catch (e) {
                                // Restore state on error
                                vm.chunk = savedChunk;
                                vm.ip = savedIp;
                                vm.globals = savedGlobals;
                                
                                throw e;
                            }
                        };
                        // Store original metadata on the wrapper
                        value._gridlangFunction = funcObj;
                        value._closure = capturedGlobals;
                    }
                    
                    stack.push(value);
                    break;
                }
                
                case OpCode.LOAD_NULL:
                    stack.push(null);
                    break;
                    
                case OpCode.LOAD_TRUE:
                    stack.push(true);
                    break;
                    
                case OpCode.LOAD_FALSE:
                    stack.push(false);
                    break;
                    
                case OpCode.LOAD_UNDEFINED:
                    stack.push(undefined);
                    break;
                    
                case OpCode.LOAD_VAR: {
                    const idx = code[this.ip++];
                    const name = this.chunk.names[idx];
                    if (!this.globals.has(name)) {
                        throw new Error(`Undefined variable: ${name}`);
                    }
                    stack.push(this.globals.get(name));
                    break;
                }
                
                case OpCode.STORE_VAR: {
                    const idx = code[this.ip++];
                    const name = this.chunk.names[idx];
                    const value = stack.pop();
                    this.globals.set(name, value);
                    break;
                }
                
                case OpCode.POP:
                    stack.pop();
                    break;
                    
                case OpCode.DUP:
                    stack.push(stack[stack.length - 1]);
                    break;
                    
                case OpCode.ADD: {
                    const b = stack.pop();
                    const a = stack.pop();
                    stack.push(a + b);
                    break;
                }
                
                case OpCode.SUB: {
                    const b = stack.pop();
                    const a = stack.pop();
                    stack.push(a - b);
                    break;
                }
                
                case OpCode.MUL: {
                    const b = stack.pop();
                    const a = stack.pop();
                    stack.push(a * b);
                    break;
                }
                
                case OpCode.DIV: {
                    const b = stack.pop();
                    const a = stack.pop();
                    stack.push(a / b);
                    break;
                }
                
                case OpCode.MOD: {
                    const b = stack.pop();
                    const a = stack.pop();
                    stack.push(a % b);
                    break;
                }
                
                case OpCode.POW: {
                    const b = stack.pop();
                    const a = stack.pop();
                    stack.push(Math.pow(a, b));
                    break;
                }
                
                case OpCode.NEG: {
                    stack.push(-stack.pop());
                    break;
                }
                
                case OpCode.EQ: {
                    const b = stack.pop();
                    stack.push(stack.pop() === b);
                    break;
                }
                
                case OpCode.NEQ: {
                    const b = stack.pop();
                    stack.push(stack.pop() !== b);
                    break;
                }
                
                case OpCode.LT: {
                    const b = stack.pop();
                    stack.push(stack.pop() < b);
                    break;
                }
                
                case OpCode.LTE: {
                    const b = stack.pop();
                    stack.push(stack.pop() <= b);
                    break;
                }
                
                case OpCode.GT: {
                    const b = stack.pop();
                    stack.push(stack.pop() > b);
                    break;
                }
                
                case OpCode.GTE: {
                    const b = stack.pop();
                    stack.push(stack.pop() >= b);
                    break;
                }
                
                case OpCode.IN: {
                    const container = stack.pop();
                    const item = stack.pop();
                    if (container instanceof Map) {
                        stack.push(container.has(item));
                    } else if (Array.isArray(container)) {
                        stack.push(container.includes(item));
                    } else if (typeof container === 'string') {
                        stack.push(container.includes(String(item)));
                    } else {
                        stack.push(false);
                    }
                    break;
                }
                
                case OpCode.NOT: {
                    const a = stack.pop();
                    stack.push(!this.isTruthy(a));
                    break;
                }
                
                case OpCode.JUMP: {
                    const high = code[this.ip++];
                    const low = code[this.ip++];
                    const target = (high << 8) | low;
                    this.ip = target > 0x7FFF ? target - 0x10000 : target;
                    break;
                }
                
                case OpCode.JUMP_IF_FALSE: {
                    const high = code[this.ip++];
                    const low = code[this.ip++];
                    const target = (high << 8) | low;
                    const condition = stack.pop();
                    if (!this.isTruthy(condition)) {
                        this.ip = target > 0x7FFF ? target - 0x10000 : target;
                    }
                    break;
                }
                
                case OpCode.JUMP_IF_TRUE: {
                    const high = code[this.ip++];
                    const low = code[this.ip++];
                    const target = (high << 8) | low;
                    const condition = stack.pop();
                    if (this.isTruthy(condition)) {
                        this.ip = target > 0x7FFF ? target - 0x10000 : target;
                    }
                    break;
                }
                
                case OpCode.BUILD_ARRAY: {
                    const count = code[this.ip++];
                    const arr = new Array(count);
                    for (let i = count - 1; i >= 0; i--) {
                        arr[i] = stack.pop();
                    }
                    stack.push(arr);
                    break;
                }
                
                case OpCode.BUILD_MAP: {
                    const count = code[this.ip++];
                    // Pop all key-value pairs into array to preserve order
                    const pairs = new Array(count);
                    for (let i = 0; i < count; i++) {
                        const value = stack.pop();
                        const key = stack.pop();
                        pairs[i] = [key, value];
                    }
                    // Build map in reverse order (since we popped in reverse)
                    const map = new Map();
                    for (let i = count - 1; i >= 0; i--) {
                        map.set(pairs[i][0], pairs[i][1]);
                    }
                    stack.push(map);
                    break;
                }
                
                case OpCode.INDEX: {
                    const index = stack.pop();
                    const obj = stack.pop();
                    if (Array.isArray(obj)) {
                        stack.push(obj[index]);
                    } else if (obj instanceof Map) {
                        stack.push(obj.get(index));
                    } else if (typeof obj === 'string') {
                        stack.push(obj[index]);
                    } else if (typeof obj === 'object' && obj !== null) {
                        stack.push(obj[index]);
                    } else {
                        throw new Error(`Cannot index ${typeof obj}`);
                    }
                    break;
                }
                
                case OpCode.STORE_INDEX: {
                    const value = stack.pop();
                    const index = stack.pop();
                    const obj = stack.pop();
                    if (Array.isArray(obj)) {
                        obj[index] = value;
                    } else if (obj instanceof Map) {
                        obj.set(index, value);
                    } else if (typeof obj === 'object' && obj !== null) {
                        obj[index] = value;
                    } else {
                        throw new Error(`Cannot index assign ${typeof obj}`);
                    }
                    stack.push(value);
                    break;
                }
                
                case OpCode.GET_MEMBER: {
                    const idx = code[this.ip++];
                    const member = this.chunk.names[idx];
                    const obj = stack.pop();
                    
                    if (obj instanceof Map) {
                        stack.push(obj.get(member));
                    } else if (Array.isArray(obj)) {
                        // Array methods/properties
                        // Special case: arr.remove(val) removes by VALUE (different from global remove function)
                        if (member === 'remove') {
                            stack.push((val) => {
                                const idx = obj.indexOf(val);
                                if (idx !== -1) {
                                    obj.splice(idx, 1);
                                }
                                return obj;
                            });
                        } else if (this.globals.has(member)) {
                            // Check GridLang functions for correct semantics
                            const func = this.globals.get(member);
                            if (typeof func === 'function') {
                                stack.push((...args) => func(obj, ...args));
                            } else {
                                throw new Error(`Cannot access member '${member}' of array`);
                            }
                        } else if (obj[member] !== undefined) {
                            // Fall back to native array property/method (length, etc.)
                            const value = obj[member];
                            if (typeof value === 'function') {
                                stack.push(value.bind(obj));
                            } else {
                                stack.push(value);
                            }
                        } else {
                            throw new Error(`Cannot access member '${member}' of array`);
                        }
                    } else if (typeof obj === 'string') {
                        // String properties and methods
                        if (member === 'length') {
                            stack.push(obj.length);
                        } else if (this.globals.has(member)) {
                            // String methods - look up global function and bind string as first arg
                            const func = this.globals.get(member);
                            if (typeof func === 'function') {
                                stack.push((...args) => func(obj, ...args));
                            } else {
                                throw new Error(`Cannot access member '${member}' of string`);
                            }
                        } else {
                            throw new Error(`Cannot access member '${member}' of string`);
                        }
                    } else if (typeof obj === 'object' && obj !== null) {
                        const value = obj[member];
                        // Bind methods to preserve 'this' context
                        if (typeof value === 'function') {
                            stack.push(value.bind(obj));
                        } else {
                            stack.push(value);
                        }
                    } else {
                        throw new Error(`Cannot access member '${member}' of ${typeof obj}`);
                    }
                    break;
                }
                
                case OpCode.STORE_MEMBER: {
                    const idx = code[this.ip++];
                    const member = this.chunk.names[idx];
                    const obj = stack.pop();
                    const value = stack.pop();
                    
                    if (obj instanceof Map) {
                        obj.set(member, value);
                    } else if (typeof obj === 'object' && obj !== null) {
                        obj[member] = value;
                    } else {
                        throw new Error(`Cannot set member '${member}' of ${typeof obj}`);
                    }
                    // Note: value was already popped, MemberAssignment has DUP before this
                    break;
                }
                
                case OpCode.GET_ITER: {
                    const obj = stack.pop();
                    const iterLine = this.chunk.lines[this.ip - 1]; // Line of GET_ITER opcode
                    // Create iterator object
                    if (Array.isArray(obj)) {
                        stack.push({ type: 'array', obj, index: 0 });
                    } else if (obj instanceof Map) {
                        stack.push({ type: 'map', obj, keys: Array.from(obj.keys()), index: 0 });
                    } else if (typeof obj === 'string') {
                        stack.push({ type: 'string', obj, index: 0 });
                    } else if (typeof obj === 'object' && obj !== null) {
                        stack.push({ type: 'object', obj, keys: Object.keys(obj), index: 0 });
                    } else {
                        throw new GridLangError(`${typeof obj} is not iterable`, iterLine, null, 'TypeError');
                    }
                    break;
                }
                
                case OpCode.FOR_ITER: {
                    const high = code[this.ip++];
                    const low = code[this.ip++];
                    const target = (high << 8) | low;
                    const targetIp = target > 0x7FFF ? target - 0x10000 : target;
                    const isTwoVar = code[this.ip++]; // 0 = single-var, 1 = two-var
                    const iter = stack[stack.length - 1];  // peek without function call
                    
                    let hasNext = false;
                    let first, second;
                    
                    if (iter.type === 'array') {
                        if (iter.index < iter.obj.length) {
                            first = iter.index;
                            second = iter.obj[iter.index];
                            iter.index++;
                            hasNext = true;
                        }
                    } else if (iter.type === 'map') {
                        if (iter.index < iter.keys.length) {
                            first = iter.keys[iter.index];
                            second = iter.obj.get(iter.keys[iter.index]);
                            iter.index++;
                            hasNext = true;
                        }
                    } else if (iter.type === 'string') {
                        if (iter.index < iter.obj.length) {
                            first = iter.index;
                            second = iter.obj[iter.index];
                            iter.index++;
                            hasNext = true;
                        }
                    } else if (iter.type === 'object') {
                        if (iter.index < iter.keys.length) {
                            first = iter.keys[iter.index];
                            second = iter.obj[iter.keys[iter.index]];
                            iter.index++;
                            hasNext = true;
                        }
                    }
                    
                    if (hasNext) {
                        if (isTwoVar) {
                            // Two-variable: push both (first then second)
                            stack.push(first);
                            stack.push(second);
                        } else {
                            // Single-variable: push what makes sense
                            // Arrays/strings: push value (second)
                            // Maps/objects: push key (first)
                            if (iter.type === 'array' || iter.type === 'string') {
                                stack.push(second); // value
                            } else {
                                stack.push(first); // key
                            }
                        }
                    } else {
                        this.ip = targetIp;
                    }
                    break;
                }
                
                case OpCode.MAKE_FUNCTION: {
                    const paramCount = code[this.ip++];
                    const funcChunk = stack.pop();
                    // Store function as callable
                    const func = {
                        type: 'function',
                        chunk: funcChunk,
                        paramCount,
                        closure: new Map(this.globals)  // Capture current globals
                    };
                    stack.push(func);
                    break;
                }
                
                case OpCode.CALL: {
                    const argCount = code[this.ip++];
                    const args = new Array(argCount);
                    for (let i = argCount - 1; i >= 0; i--) {
                        args[i] = stack.pop();
                    }
                    const func = stack.pop();
                    
                    if (typeof func === 'function') {
                        // Native JS function - wrap errors with line info
                        try {
                            const result = func.apply(this, args);
                            stack.push(result !== undefined ? result : null);
                        } catch (e) {
                            const callLine = this.chunk.lines[this.ip - 2]; // Line of CALL opcode
                            if (e instanceof GridLangError) {
                                throw e;
                            }
                            throw new GridLangError(e.message, callLine, null, 'RuntimeError');
                        }
                    } else if (func && func.type === 'function') {
                        // GridLang function - save state and execute
                        const savedChunk = this.chunk;
                        const savedIp = this.ip;
                        const savedGlobals = this.globals;
                        
                        this.globals = new ChainedMap(func.closure);
                        // Bind parameters
                        for (let i = 0; i < func.paramCount; i++) {
                            this.globals.set(func.chunk.names[i], args[i] !== undefined ? args[i] : null);
                        }
                        
                        this.chunk = func.chunk;
                        this.ip = 0;
                        
                        try {
                            this.execute();
                            // Function should RETURN, result is on stack
                            const result = this.stack.length > 0 ? stack.pop() : null;
                            
                            // Restore state
                            this.chunk = savedChunk;
                            this.ip = savedIp;
                            this.globals = savedGlobals;
                            
                            stack.push(result);
                        } catch (e) {
                            // Restore state on error
                            this.chunk = savedChunk;
                            this.ip = savedIp;
                            this.globals = savedGlobals;
                            throw e;
                        }
                    } else {
                        const callLine = this.chunk.lines[this.ip - 2];
                        throw new GridLangError('not a function', callLine, null, 'TypeError');
                    }
                    break;
                }
                
                case OpCode.RETURN: {
                    // Return value is already on stack
                    return;
                }
                
                case OpCode.BREAK:
                    // TODO: Implement proper break with jump patching
                    throw new Error('BREAK not yet fully implemented in VM');
                    
                case OpCode.CONTINUE:
                    // TODO: Implement proper continue with jump patching  
                    throw new Error('CONTINUE not yet fully implemented in VM');
                
                case OpCode.HALT:
                    return stack.length > 0 ? stack.pop() : null;
                    
                case OpCode.SWAP: {
                    const a = stack.pop();
                    const b = stack.pop();
                    stack.push(a);
                    stack.push(b);
                    break;
                }
                    
                default:
                    throw new Error(`Unknown opcode: ${opcode} at ${this.ip - 1}`);
            }
        }
        
        return null;
    }
    
    readByte() {
        return this.chunk.code[this.ip++];
    }
    
    readShort() {
        const high = this.chunk.code[this.ip++];
        const low = this.chunk.code[this.ip++];
        const value = (high << 8) | low;
        // Convert from unsigned to signed 16-bit
        return value > 0x7FFF ? value - 0x10000 : value;
    }
    
    push(value) {
        this.stack.push(value);
    }
    
    pop() {
        if (this.stack.length === 0) {
            throw new Error('Stack underflow');
        }
        return this.stack.pop();
    }
    
    peek(distance = 0) {
        return this.stack[this.stack.length - 1 - distance];
    }
    
    isTruthy(value) {
        return value !== null && value !== false && value !== undefined && value !== 0 && value !== '';
    }
    
    toString(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
            return '[' + value.map(v => this.toString(v)).join(', ') + ']';
        }
        if (value instanceof Map) {
            const entries = Array.from(value.entries())
                .map(([k, v]) => `${k}: ${this.toString(v)}`)
                .join(', ');
            return `{${entries}}`;
        }
        return String(value);
    }
    
    logBuffered(msg, type = 'output') {
        // Same buffering logic as old interpreter
        this.printBuffer.push({ msg, type });
        
        const now = Date.now();
        if (this.printBuffer.length >= this.printBufferSize || 
            (now - this.lastFlushTime) >= this.flushInterval) {
            this.flushPrintBuffer();
        }
    }
    
    flushPrintBuffer() {
        if (this.printBuffer.length === 0) return;
        
        let html = this.cachedConsoleHTML;
        for (const { msg, type } of this.printBuffer) {
            const color = type === 'error' ? '#f48771' : 
                         type === 'debug' ? '#9cdcfe' : '#4fc1ff';
            html += `<span style="color: ${color}">${this.escapeHtml(msg)}</span>\n`;
        }
        
        this.cachedConsoleHTML = html;
        if (this.consoleElement) {
            this.consoleElement.innerHTML = html;
            this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
        }
        
        this.printBuffer = [];
        this.lastFlushTime = Date.now();
    }
    
    escapeHtml(text) {
        if (typeof document === 'undefined') {
            return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VM };
}
