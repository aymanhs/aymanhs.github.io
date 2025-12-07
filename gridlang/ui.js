// GridLang UI and Application Logic

// ============= UI =============
const editor = document.getElementById('editor');
const highlight = document.getElementById('highlight');
const highlightCode = highlight.querySelector('code');
const lineNumbers = document.getElementById('lineNumbers');
const canvas = document.getElementById('canvas');
const canvas3d = document.getElementById('canvas3d');
const canvasContainer = document.getElementById('canvasContainer');
const consoleEl = document.getElementById('console');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const statsBtn = document.getElementById('statsBtn');
const helpBtn = document.getElementById('helpBtn');
const scriptSelect = document.getElementById('scriptSelect');
const debugCheckbox = document.getElementById('debugCheckbox');
const debugBtn = document.getElementById('debugBtn');
// File management elements
const saveFileBtn = document.getElementById('saveFileBtn');
const saveAsBtn = document.getElementById('saveAsBtn');
const renameFileBtn = document.getElementById('renameFileBtn');
const deleteFileBtn = document.getElementById('deleteFileBtn');
const dirtyIndicator = document.getElementById('dirtyIndicator');
// Help modal elements
const helpModal = document.getElementById('helpModal');
const helpCloseBtn = document.getElementById('helpCloseBtn');
const helpSearch = document.getElementById('helpSearch');
const helpBody = document.getElementById('helpBody');
// Share elements
const shareBtn = document.getElementById('shareBtn');
const shareModal = document.getElementById('shareModal');
const shareUrl = document.getElementById('shareUrl');
const copyUrlBtn = document.getElementById('copyUrlBtn');
const closeShareBtn = document.getElementById('closeShareBtn');
const toast = document.getElementById('toast');

// Autocomplete elements
const autocomplete = document.getElementById('autocomplete');
const functionHint = document.getElementById('functionHint');
// Version display
const versionTextEl = document.getElementById('versionText');

// Input panel elements
const inputSection = document.getElementById('inputSection');
const inputData = document.getElementById('inputData');
const inputSelect = document.getElementById('inputSelect');
const addInputBtn = document.getElementById('addInputBtn');
const renameInputBtn = document.getElementById('renameInputBtn');
const deleteInputBtn = document.getElementById('deleteInputBtn');
const horizontalResizer = document.getElementById('horizontalResizer');
const codeSection = document.querySelector('.code-section');

// State
let currentInputId = 'default';
let inputs = { default: '' };
let currentInterpreter = null; // Track active interpreter for stop button

// Initialize 3D renderer
let renderer3d = null;
try {
    if (typeof THREE !== 'undefined' && canvas3d) {
        renderer3d = new Renderer3D(canvas3d);
    } else {
        console.error('THREE.js or canvas3d not available');
    }
} catch (e) {
    console.error('Failed to initialize 3D renderer:', e);
}

// Initialize Stats
let stats = null;
try {
    if (typeof Stats !== 'undefined') {
        stats = new Stats();
        stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        stats.dom.style.position = 'absolute';
        stats.dom.style.top = '0px';
        stats.dom.style.left = '0px';
        stats.dom.style.zIndex = '1000'; // Ensure it's on top
        stats.dom.style.display = 'none'; // Hidden by default

        // Append to canvas container instead of body
        if (canvasContainer) {
            canvasContainer.appendChild(stats.dom);
        } else {
            document.body.appendChild(stats.dom);
        }
        console.log('Stats initialized successfully');

        if (renderer3d) {
            renderer3d.setStats(stats);
        }
    } else {
        console.warn('Stats library not found');
    }
} catch (e) {
    console.error('Failed to initialize Stats:', e);
}

// Stats toggle
let statsVisible = false;
if (statsBtn) {
    statsBtn.addEventListener('click', () => {
        console.log('Stats button clicked. Stats object:', stats);
        if (!stats) {
            alert('Stats library not loaded. Check console for errors.');
            return;
        }

        statsVisible = !statsVisible;
        stats.dom.style.display = statsVisible ? 'block' : 'none';
        // Update button style only (icon remains)
        statsBtn.style.background = statsVisible ? '#0e639c' : '#6c6c6c';
    });
}

// Current mode
let currentMode = '2d';
let currentErrorLine = null;

// Error highlighting functions
function clearErrorHighlight() {
    if (currentErrorLine !== null) {
        updateHighlight();
        currentErrorLine = null;
    }
}

function highlightErrorLine(lineNumber) {
    if (!lineNumber || lineNumber < 1) return;

    currentErrorLine = lineNumber;

    // Get the current code
    const code = editor.value;
    const lines = code.split('\n');

    // Scroll to the error line
    const lineHeight = 21; // 14px font * 1.5 line-height
    const scrollTo = (lineNumber - 1) * lineHeight;
    editor.scrollTop = scrollTo - editor.clientHeight / 3; // Center it roughly

    // Update syntax highlighting with error line marked
    const highlightedLines = lines.map((line, idx) => {
        const lineNum = idx + 1;
        const highlighted = Prism.highlight(line, Prism.languages.python, 'python');
        if (lineNum === lineNumber) {
            return `<span class="error-line">${highlighted}</span>`;
        }
        return highlighted;
    });

    highlightCode.innerHTML = highlightedLines.join('\n');
    highlight.scrollTop = editor.scrollTop;
}

// Mode switching
function switchMode(mode) {
    currentMode = mode;

    if (mode === 'console') {
        // Hide canvas, show only console
        canvasContainer.classList.add('console-only');
        canvas.style.display = 'none';
        canvas3d.style.display = 'none';
    } else if (mode === '2d') {
        // Show 2D canvas
        canvasContainer.classList.remove('console-only');
        canvas.style.display = 'block';
        canvas3d.style.display = 'none';
    } else if (mode === '3d') {
        // Show 3D canvas
        canvasContainer.classList.remove('console-only');
        canvas.style.display = 'none';
        canvas3d.style.display = 'block';
        // Resize 3D renderer to fill container
        const containerWidth = canvasContainer.clientWidth - 40;
        const containerHeight = canvasContainer.clientHeight - 40;
        canvas3d.width = containerWidth;
        canvas3d.height = containerHeight;
        if (renderer3d) {
            renderer3d.resize();
        }
    }
}



// Initial mode
switchMode(currentMode);

// ============= HELP SYSTEM =============
const builtinFunctions = {
    "I/O": [
        { name: "print(...args)", desc: "Print values to console in blue." },
        { name: "debug(...args)", desc: "Print values in grey only when debug is enabled (checkbox or set_debug(true))." },
        { name: "set_debug(enabled)", desc: "Enable or disable debug output. Use with debug() for conditional logging." },
    ],
    "Functions": [
        { name: "func name(params) { ... }", desc: "Define named function." },
        { name: "func(params) { ... }", desc: "Anonymous function (lambda). Assign to variable: f = func(x) { return x * 2 }" },
        { name: "return value", desc: "Return value from function." },
    ],
    "Arrays & Iteration": [
        { name: "range(start, end, step=1)", desc: "Generate array of numbers. If only one arg, starts from 0." },
        { name: "len(obj)", desc: "Get length of array, string, or map." },
        { name: "add(arr, val, index=null)", desc: "Add element to array (push or insert). If index is null, appends." },
        { name: "remove(arr, index=null)", desc: "Remove element from array (pop or remove at index). If index is null, removes last element." },
        { name: "keys(obj)", desc: "Get array of keys from Map or Object." },
        { name: "values(obj)", desc: "Get array of values from Map or Object." },
        { name: "append(arr, val)", desc: "Append element to array (legacy, use add)." },
        { name: "merge(arr1, arr2)", desc: "Concatenate two arrays." },
        { name: "diff(arr1, arr2)", desc: "Return elements in arr1 that are not in arr2 (set difference)." },
        { name: "intersect(arr1, arr2)", desc: "Return unique elements present in both arrays." },
        { name: "union(arr1, arr2)", desc: "Return all unique elements from both arrays." },
        { name: "for item in array { ... }", desc: "Iterate over array values." },
        { name: "for i, v in array { ... }", desc: "Iterate with index and value. Like enumerate in Python." },
        { name: "for key in map { ... }", desc: "Iterate over map keys." },
        { name: "for k, v in map { ... }", desc: "Iterate over map keys and values." },
    ],
    "Array Methods": [
        { name: "arr.push(value)", desc: "Add element to end of array (mutates)." },
        { name: "arr.pop()", desc: "Remove and return last element (mutates)." },
        { name: "arr.insert(index, value)", desc: "Insert element at index (mutates)." },
        { name: "arr.remove(value)", desc: "Remove first occurrence of value (mutates)." },
        { name: "arr.removeAt(index)", desc: "Remove element at index (mutates). Returns removed element." },
        { name: "arr.clear()", desc: "Remove all elements (mutates)." },
        { name: "arr.slice(start, end)", desc: "Extract subarray from start to end (returns new array)." },
        { name: "arr.concat(other)", desc: "Combine two arrays (returns new array)." },
        { name: "arr.merge(other)", desc: "Alias for concat. Combine two arrays (returns new array)." },
        { name: "arr.diff(other)", desc: "Set difference (this - other). Returns new array." },
        { name: "arr.intersect(other)", desc: "Set intersection. Returns new unique array." },
        { name: "arr.union(other)", desc: "Set union. Returns new unique array." },
        { name: "arr.reverse()", desc: "Reverse array order (returns new array)." },
        { name: "arr.sort(compareFn=null)", desc: "Sort array. Default: numbers numerically, strings alphabetically. With compareFn: custom sort where fn(a,b) returns negative if a<b, 0 if equal, positive if a>b. Returns new array." },
        { name: "arr.join(separator)", desc: "Join elements into string with separator." },
        { name: "arr.indexOf(value)", desc: "Find first index of value. Returns -1 if not found." },
        { name: "arr.contains(value)", desc: "Check if array contains value." },
        { name: "arr.count(value)", desc: "Count occurrences of value." },
        { name: "arr.length", desc: "Get array length (property, not method)." },
    ],
    "Higher-Order Array Methods": [
        { name: "arr.map(fn)", desc: "Transform each element. Returns new array." },
        { name: "arr.filter(fn)", desc: "Keep elements where fn returns true. Returns new array." },
        { name: "arr.reduce(fn, initial)", desc: "Accumulate to single value. fn(acc, item). Initial is optional." },
        { name: "arr.forEach(fn)", desc: "Execute fn for each element. Returns null." },
        { name: "arr.find(fn)", desc: "First element where fn returns true. Returns null if not found." },
        { name: "arr.some(fn)", desc: "True if any element makes fn return true." },
        { name: "arr.every(fn)", desc: "True if all elements make fn return true." },
    ],
    "Type Conversion": [
        { name: "str(value)", desc: "Convert any value to string." },
        { name: "int(value)", desc: "Convert to integer (floors floats, parses strings)." },
        { name: "float(value)", desc: "Convert to float (parses strings)." },
        { name: "bool(value)", desc: "Convert to boolean (truthy check)." },
    ],
    "String Functions": [
        { name: "substr(str, start, length=null)", desc: "Extract substring from start position. If length omitted, extracts to end." },
        { name: "slice(str, start, end=null)", desc: "Slice string or array from start to end (exclusive)." },
        { name: "split(str, separator=' ')", desc: "Split string into array. Use '' to split into characters." },
        { name: "join(array, separator='')", desc: "Join array elements into string with separator." },
        { name: "upper(str)", desc: "Convert string to uppercase." },
        { name: "lower(str)", desc: "Convert string to lowercase." },
        { name: "trim(str)", desc: "Remove leading and trailing whitespace." },
        { name: "replace(str, search, replacement)", desc: "Replace all occurrences of search with replacement." },
        { name: "starts_with(str, prefix)", desc: "Check if string starts with prefix." },
        { name: "ends_with(str, suffix)", desc: "Check if string ends with suffix." },
        { name: "contains(str, item)", desc: "Check if string or array contains item." },
        { name: "index_of(str, item)", desc: "Find first index of item in string/array. Returns -1 if not found." },
        { name: "char_at(str, index)", desc: "Get character at specified index." },
        { name: "char_code(str, index=0)", desc: "Get ASCII/Unicode code of character at index." },
        { name: "from_char_code(code)", desc: "Create character from ASCII/Unicode code." },
        { name: "repeat(str, count)", desc: "Repeat string count times." },
        { name: "reverse(str)", desc: "Reverse string or array." },
    ],
    "String Methods": [
        { name: "str.upper()", desc: "Convert string to uppercase (returns new string)." },
        { name: "str.lower()", desc: "Convert string to lowercase (returns new string)." },
        { name: "str.trim()", desc: "Remove leading/trailing whitespace (returns new string)." },
        { name: "str.replace(search, replacement)", desc: "Replace all occurrences of search (returns new string)." },
        { name: "str.split(separator)", desc: "Split into array by separator (returns array)." },
        { name: "str.startsWith(prefix)", desc: "Check if string starts with prefix." },
        { name: "str.endsWith(suffix)", desc: "Check if string ends with suffix." },
        { name: "str.contains(substring)", desc: "Check if string contains substring." },
        { name: "str.indexOf(substring)", desc: "Find first index of substring. Returns -1 if not found." },
        { name: "str.substring(start, end)", desc: "Extract substring from start to end (returns new string)." },
        { name: "str.slice(start, end)", desc: "Extract substring. Supports negative indices (returns new string)." },
        { name: "str.length", desc: "Get string length (property, not method)." },
    ],
    "Template Strings": [
        { name: "f\"text {var}\"", desc: "F-string with variable interpolation. IMPORTANT: No space between f and quote. Use {var} not ${var}." },
        { name: "f\"Hello {name}!\"", desc: "Basic interpolation. Evaluates to 'Hello Alice!' if name='Alice'." },
        { name: "f\"{obj.prop}\"", desc: "Supports dot notation. Access nested properties: f\"{person.name}\"." },
        { name: "f\"{{literal}}\"", desc: "Use {{ and }} for literal braces. f\"{{value}}\" outputs '{value}'." },
    ],
    "Regular Expressions": [
        { name: "r\"pattern\"", desc: "Create regex literal. Use raw strings (r\"...\") to avoid escaping backslashes." },
        { name: "pattern.test(str)", desc: "Returns true if pattern matches string, false otherwise." },
        { name: "pattern.match(str)", desc: "Returns matched string on first match, or null. Use if match { ... } to check." },
        { name: "pattern.groups(str)", desc: "Returns array of capture groups, or object with named groups if pattern uses (?<name>...). Returns null if no match." },
        { name: "pattern.find_all(str)", desc: "Returns array of all matched strings (no groups)." },
        { name: "pattern.replace(str, replacement)", desc: "Replace all pattern matches in string with replacement." },
        { name: "pattern.split(str)", desc: "Split string by pattern into array." },
        { name: "Named groups example", desc: "r\"(?<year>\\d{4})-(?<month>\\d{2})\".groups(\"2025-12\") returns {year: \"2025\", month: \"12\"}. Access via .year or [\"year\"]." },
    ],
    "Math": [
        { name: "abs(x)", desc: "Absolute value." },
        { name: "sqrt(x)", desc: "Square root of x." },
        { name: "pow(x, y)", desc: "x raised to power y." },
        { name: "floor(x)", desc: "Round down to integer." },
        { name: "clamp(val, min, max)", desc: "Constrain val between min and max." },
        { name: "lerp(start, end, t)", desc: "Linear interpolate between start and end by t." },
        { name: "sign(x)", desc: "Return sign of x: 1, -1, or 0." },
        { name: "min(a, b, ...)", desc: "Return smallest value." },
        { name: "ceil(x)", desc: "Round up to integer." },
        { name: "round(x)", desc: "Round to nearest integer." },
        { name: "sin(x)", desc: "Sine function (radians)." },
        { name: "cos(x)", desc: "Cosine function (radians)." },
        { name: "tan(x)", desc: "Tangent function (radians)." },
        { name: "min(...args)", desc: "Find minimum value from arguments." },
        { name: "max(...args)", desc: "Find maximum value from arguments." },
        { name: "random()", desc: "Random number between 0 and 1." },
    ],
    "Timing & Animation": [
        { name: "time()", desc: "Current timestamp in seconds." },
        { name: "clock()", desc: "High-resolution performance timer in seconds." },
        { name: "benchmark(func, iterations=1)", desc: "Measure execution time of a function." },
        { name: "animate(callback, options)", desc: "Run callback at 60fps. Callback receives elapsed time. Return false to stop." },
        { name: "stop_animation()", desc: "Stop the current animation loop." },
        { name: "record_animation()", desc: "Start recording animation frames with canvas snapshots." },
        { name: "save_animation_gif(filename, delay=33)", desc: "Save recorded frames as animated GIF. Delay in milliseconds (33ms ≈ 30fps)." },
        { name: "stop_recording()", desc: "Stop recording frames." },
        { name: "clear_recording()", desc: "Clear all recorded frames." },
        { name: "get_animation_frames()", desc: "Get recording info: frame count, recording status, mode." },
        { name: "assert(condition, message='Assertion failed')", desc: "Throws error if condition is false. Use for runtime checks and testing." },
    ],
    "2D Drawing": [
        { name: "init_2d(gridSize, cellSize=20)", desc: "Initialize 2D grid. gridSize can be a number (square) or [rows, cols]." },
        { name: "set_cell(row, col, color)", desc: "Set cell color. Color can be hex (#ff0000) or from rgb()/hsl()." },
        { name: "clear_canvas()", desc: "Clear the 2D canvas." },
        { name: "set_pixel(x, y, color)", desc: "Set individual pixel (no grid)." },
        { name: "draw_line(x1, y1, x2, y2, color, width=1)", desc: "Draw a line." },
        { name: "draw_circle(x, y, radius, color, fill=true)", desc: "Draw a circle." },
        { name: "draw_rect(x, y, width, height, color, fill=true)", desc: "Draw a rectangle." },
    ],
    "Colors": [
        { name: "rgb(r, g, b)", desc: "Create RGB color. Values 0-255." },
        { name: "hsl(h, s, l)", desc: "Create HSL color. h: 0-360, s/l: 0-100." },
    ],
    "3D Voxels": [
        { name: "init_3d(voxelSize=8, spacing=10)", desc: "Initialize 3D renderer with voxel size and spacing." },
        { name: "set_voxel(x, y, z, color)", desc: "Place a voxel (cube) at coordinates with color." },
        { name: "remove_voxel(x, y, z)", desc: "Remove voxel at coordinates." },
        { name: "get_voxel(x, y, z)", desc: "Get color of voxel at coordinates, or null if empty." },
        { name: "clear_3d()", desc: "Remove all voxels from scene." },
        { name: "begin_3d_batch()", desc: "Start batching 3D updates for better performance. Call end_3d_batch() when done." },
        { name: "end_3d_batch()", desc: "End batching and render all 3D updates at once." },
    ],
    "Input Data": [
        { name: "input_string(filename=null)", desc: "Get raw input data as string. If filename is provided, reads from that named input, otherwise reads from active input." },
        { name: "input_lines(filename=null)", desc: "Get input as array of lines. If filename is provided, reads from that named input." },
        { name: "input_grid(type='int', separator=auto, filename=null)", desc: "Parse input as 2D grid. type: 'int', 'float', 'char', or 'string'. Auto-detects separator (space/comma/tabs). If filename is provided, reads from that named input." },
    ],
    "Operators": [
        { name: "key in map", desc: "Check if key exists in Map: returns true/false." },
        { name: "value in array", desc: "Check if value exists in Array: returns true/false." },
        { name: "substring in string", desc: "Check if substring exists in string: returns true/false." },
        { name: "condition ? true_val : false_val", desc: "Ternary operator: Returns true_val if condition is truthy, else false_val." },
        { name: "value ?: default", desc: "Elvis operator: Returns value if truthy, else default. Use for default values: port ?: 8080" },
        { name: "break", desc: "Exit loop immediately (for/while)." },
        { name: "continue", desc: "Skip to next iteration of loop (for/while)." },
        { name: "undefined", desc: "Special value returned when map key doesn't exist. Falsey. Check with: val == undefined" },
        { name: "null", desc: "Explicit null/empty value. Falsey. Different from undefined." },
    ]
};

function renderHelp(filter = '') {
    helpBody.innerHTML = '';
    const filterLower = filter.toLowerCase();

    for (const [category, functions] of Object.entries(builtinFunctions)) {
        const filteredFuncs = filter
            ? functions.filter(f =>
                f.name.toLowerCase().includes(filterLower) ||
                f.desc.toLowerCase().includes(filterLower)
            )
            : functions;

        if (filteredFuncs.length === 0) continue;

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'help-category';

        const categoryTitle = document.createElement('h3');
        categoryTitle.textContent = category;
        categoryDiv.appendChild(categoryTitle);

        filteredFuncs.forEach(func => {
            const funcDiv = document.createElement('div');
            funcDiv.className = 'help-function';

            const funcName = document.createElement('div');
            funcName.className = 'help-function-name';
            funcName.innerHTML = `<code>${func.name}</code>`;

            const funcDesc = document.createElement('div');
            funcDesc.className = 'help-function-desc';
            funcDesc.textContent = func.desc;

            funcDiv.appendChild(funcName);
            funcDiv.appendChild(funcDesc);
            categoryDiv.appendChild(funcDiv);
        });

        helpBody.appendChild(categoryDiv);
    }
}

helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'block';
    renderHelp();
    helpSearch.value = '';
    helpSearch.focus();
});

helpCloseBtn.addEventListener('click', () => {
    helpModal.style.display = 'none';
});

helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
        helpModal.style.display = 'none';
    }
});

helpSearch.addEventListener('input', (e) => {
    renderHelp(e.target.value);
});

// Keyboard shortcut for help
document.addEventListener('keydown', (e) => {
    if (e.key === 'F1' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        helpBtn.click();
    }
});

// ============= SHARE FUNCTIONALITY =============
// URL compression/decompression using pako
function compressCode(code) {
    try {
        const bytes = new TextEncoder().encode(code);
        const compressed = pako.gzip(bytes);
        const base64 = btoa(String.fromCharCode(...compressed));
        // URL-safe base64
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (e) {
        console.error('Compression failed:', e);
        // Fallback to plain base64 without compression
        return btoa(encodeURIComponent(code)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
}

function decompressCode(compressed) {
    try {
        // Convert back from URL-safe base64
        const base64 = compressed.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        const decompressed = pako.ungzip(bytes);
        return new TextDecoder().decode(decompressed);
    } catch (e) {
        // Fallback: try to decompress as plain base64
        try {
            const base64 = compressed.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
            return decodeURIComponent(atob(padded));
        } catch (e2) {
            console.error('Decompression failed:', e, e2);
            return null;

            // Set version text if available
            try {
                if (versionTextEl && window.GRIDLANG_VERSION) {
                    versionTextEl.textContent = String(window.GRIDLANG_VERSION).slice(0, 8);
                }
            } catch (e) {
                console.warn('Version display failed:', e);
            }
        }
    }
}

function showToast(message, isError = false) {
    toast.textContent = message;
    toast.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

function generateShareURL() {
    const code = editor.value;
    if (!code.trim()) {
        showToast('No code to share!', true);
        return null;
    }

    try {
        const compressed = compressCode(code);
        const url = new URL(window.location.href);
        url.search = '';
        url.searchParams.set('code', compressed);

        // Check URL length (most browsers support ~2000 chars)
        const urlString = url.toString();
        if (urlString.length > 2000) {
            showToast('Warning: URL is very long (' + urlString.length + ' chars). May not work in all browsers.', true);
        }

        return urlString;
    } catch (e) {
        console.error('Failed to generate share URL:', e);
        showToast('Failed to generate URL: ' + e.message, true);
        return null;
    }
}

function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');

    if (codeParam) {
        try {
            const code = decompressCode(codeParam);
            if (code) {
                editor.value = code;
                // Update Ace editor if it exists
                if (window.setEditorCode) {
                    window.setEditorCode(code);
                }
                updateHighlight();
                updateLineNumbers();
                showToast('Code loaded from URL!');

                // Set dropdown to show it's shared code
                scriptSelect.value = '';

                // Mark as unsaved so user can save it if they want
                hasUnsavedChanges = true;
                lastSavedContent = '';
                if (dirtyIndicator) {
                    dirtyIndicator.style.color = '#fbbf24';
                    dirtyIndicator.title = 'Shared code - not saved yet';
                }

                // Clear URL after loading (keeps URL clean)
                const url = new URL(window.location.href);
                url.search = '';
                window.history.replaceState({}, document.title, url.toString());

                return true; // Successfully loaded from URL
            } else {
                showToast('Failed to decode URL', true);
            }
        } catch (e) {
            console.error('Failed to load code from URL:', e);
            showToast('Failed to load code from URL', true);
        }
    }
    return false; // No URL code to load
}

// Share button handler
shareBtn.addEventListener('click', () => {
    const url = generateShareURL();
    if (url) {
        shareUrl.textContent = url;
        shareModal.classList.add('show');
    }
});

// Copy URL button
copyUrlBtn.addEventListener('click', () => {
    const url = shareUrl.textContent;
    navigator.clipboard.writeText(url).then(() => {
        showToast('URL copied to clipboard!');
    }).catch(err => {
        showToast('Failed to copy URL', true);
        console.error('Copy failed:', err);
    });
});

// Close share modal
closeShareBtn.addEventListener('click', () => {
    shareModal.classList.remove('show');
});

shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) {
        shareModal.classList.remove('show');
    }
});

// ============= AUTOCOMPLETE =============
// Flatten builtin functions for autocomplete
const allBuiltins = [];
for (const [category, functions] of Object.entries(builtinFunctions)) {
    functions.forEach(func => {
        const match = func.name.match(/^([a-z_][a-z0-9_]*)\(([^)]*)\)/);
        if (match) {
            allBuiltins.push({
                name: match[1],
                args: match[2] || '',
                desc: func.desc,
                full: func.name
            });
        }
    });
}

let selectedIndex = -1;
let filteredBuiltins = [];

function showAutocomplete(prefix) {
    if (prefix.length < 2) {
        hideAutocomplete();
        return;
    }

    filteredBuiltins = allBuiltins.filter(f =>
        f.name.toLowerCase().startsWith(prefix.toLowerCase())
    );

    if (filteredBuiltins.length === 0) {
        hideAutocomplete();
        return;
    }

    autocomplete.innerHTML = '';
    selectedIndex = 0;

    filteredBuiltins.forEach((func, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item' + (index === 0 ? ' selected' : '');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'autocomplete-name';
        nameSpan.textContent = func.name;

        const argsSpan = document.createElement('span');
        argsSpan.className = 'autocomplete-args';
        argsSpan.textContent = `(${func.args})`;

        const descDiv = document.createElement('div');
        descDiv.className = 'autocomplete-desc';
        descDiv.textContent = func.desc;

        item.appendChild(nameSpan);
        item.appendChild(argsSpan);
        item.appendChild(descDiv);

        item.addEventListener('click', () => {
            insertAutocomplete(func, prefix);
        });

        autocomplete.appendChild(item);
    });

    positionAutocomplete();
    autocomplete.style.display = 'block';
}

function hideAutocomplete() {
    autocomplete.style.display = 'none';
    selectedIndex = -1;
}

function positionAutocomplete() {
    const pos = getCaretCoordinates();
    autocomplete.style.left = pos.left + 'px';
    autocomplete.style.top = (pos.top + 20) + 'px';
}

function getCaretCoordinates() {
    const style = window.getComputedStyle(editor);
    const lineHeight = parseFloat(style.lineHeight);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingTop = parseFloat(style.paddingTop);

    const textBeforeCaret = editor.value.substring(0, editor.selectionStart);
    const lines = textBeforeCaret.split('\n');
    const currentLine = lines.length - 1;
    const currentLineText = lines[lines.length - 1];

    // Measure actual text width using canvas for accuracy
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = style.font;
    const textWidth = ctx.measureText(currentLineText).width;

    // Position relative to editor's own position, not viewport
    return {
        left: paddingLeft + textWidth - editor.scrollLeft + 60, // +60 for line numbers width
        top: paddingTop + (currentLine * lineHeight) - editor.scrollTop
    };
}

function insertAutocomplete(func, prefix) {
    const pos = editor.selectionStart;
    const text = editor.value;
    const before = text.substring(0, pos - prefix.length);
    const after = text.substring(pos);

    // Insert function name with parentheses and position cursor inside
    editor.value = before + func.name + '()' + after;
    editor.selectionStart = editor.selectionEnd = before.length + func.name.length + 1;

    hideAutocomplete();
    updateHighlight();
    saveToLocalStorage();
    editor.focus();

    // Show function hint after insertion
    setTimeout(() => showFunctionHint(func.name), 50);
}

function showFunctionHint(funcName) {
    const func = allBuiltins.find(f => f.name === funcName);
    if (!func) {
        hideFunctionHint();
        return;
    }

    functionHint.innerHTML = `
        <div class="function-hint-name">${func.name}</div>
        <div class="function-hint-args">(${func.args})</div>
        <div class="function-hint-desc">${func.desc}</div>
    `;

    const pos = getCaretCoordinates();
    functionHint.style.left = pos.left + 'px';
    functionHint.style.top = (pos.top + 20) + 'px';
    functionHint.style.display = 'block';
}

function hideFunctionHint() {
    functionHint.style.display = 'none';
}

function getCurrentWord() {
    const pos = editor.selectionStart;
    const text = editor.value;

    let start = pos;
    while (start > 0 && /[a-z0-9_]/i.test(text[start - 1])) {
        start--;
    }

    return text.substring(start, pos);
}

function getFunctionAtCursor() {
    const pos = editor.selectionStart;
    const text = editor.value;

    // Look backwards for function name before opening paren
    let parenCount = 0;
    let i = pos - 1;

    while (i >= 0) {
        if (text[i] === ')') parenCount++;
        if (text[i] === '(') {
            if (parenCount === 0) {
                // Found the opening paren, now get function name
                let j = i - 1;
                while (j >= 0 && /\s/.test(text[j])) j--;
                let nameEnd = j + 1;
                while (j >= 0 && /[a-z0-9_]/i.test(text[j])) j--;
                let nameStart = j + 1;
                return text.substring(nameStart, nameEnd);
            }
            parenCount--;
        }
        i--;
    }

    return null;
}

// Editor event handlers
editor.addEventListener('input', () => {
    markAsChanged();
    updateHighlight();
    updateLineNumbers();
    clearErrorHighlight();
    // Don't auto-save code - only save inputs

    const word = getCurrentWord();
    if (word.length >= 2) {
        showAutocomplete(word);
    } else {
        hideAutocomplete();
    }

    // Show function hint if inside function call
    const funcName = getFunctionAtCursor();
    if (funcName) {
        showFunctionHint(funcName);
    } else {
        hideFunctionHint();
    }
});

editor.addEventListener('keydown', (e) => {
    // Handle autocomplete navigation
    if (autocomplete.style.display === 'block') {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, filteredBuiltins.length - 1);
            updateAutocompleteSelection();
            return;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateAutocompleteSelection();
            return;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (selectedIndex >= 0 && selectedIndex < filteredBuiltins.length) {
                e.preventDefault();
                const word = getCurrentWord();
                insertAutocomplete(filteredBuiltins[selectedIndex], word);
                return;
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideAutocomplete();
            return;
        }
    }

    // Ctrl+Space to trigger autocomplete
    if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();
        const word = getCurrentWord();
        showAutocomplete(word || 'a'); // Show all if no word
        return;
    }

    // Ctrl+Enter to run code
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runCode();
        return;
    }

    // Tab support (only when autocomplete not showing)
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 4;
        updateHighlight();
    }
});

function updateAutocompleteSelection() {
    const items = autocomplete.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

// Hide autocomplete when clicking outside
document.addEventListener('click', (e) => {
    if (!autocomplete.contains(e.target) && e.target !== editor) {
        hideAutocomplete();
    }
    if (!functionHint.contains(e.target) && e.target !== editor) {
        hideFunctionHint();
    }
});

// ============= LOCAL STORAGE =============
function saveToLocalStorage() {
    try {
        // Only save inputs to localStorage automatically, not code
        localStorage.setItem('gridlang_inputs', JSON.stringify(inputs));
        localStorage.setItem('gridlang_currentInput', currentInputId);
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const savedInputs = localStorage.getItem('gridlang_inputs');
        const savedCurrentInput = localStorage.getItem('gridlang_currentInput');

        // Don't load old single 'gridlang_code' - we use the file system now

        if (savedInputs !== null) {
            inputs = JSON.parse(savedInputs);
            updateInputSelect();
        }

        if (savedCurrentInput !== null && inputs[savedCurrentInput] !== undefined) {
            currentInputId = savedCurrentInput;
            inputSelect.value = currentInputId;
            inputData.value = inputs[currentInputId];
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }
}

// Auto-save on changes (handled in autocomplete input handler now)

inputData.addEventListener('input', () => {
    inputs[currentInputId] = inputData.value;
    saveToLocalStorage();
});

// ============= INPUT MANAGEMENT =============
function updateInputSelect() {
    inputSelect.innerHTML = '';
    Object.keys(inputs).forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        inputSelect.appendChild(option);
    });
    inputSelect.value = currentInputId;
}

function switchInput(inputId) {
    // Save current input
    inputs[currentInputId] = inputData.value;

    // Switch to new input
    currentInputId = inputId;
    inputData.value = inputs[currentInputId] || '';
    inputSelect.value = currentInputId;

    saveToLocalStorage();
}

inputSelect.addEventListener('change', (e) => {
    switchInput(e.target.value);
});

addInputBtn.addEventListener('click', () => {
    const name = prompt('Enter input name:');
    if (name && name.trim() && !inputs[name]) {
        inputs[name.trim()] = '';
        updateInputSelect();
        switchInput(name.trim());
    } else if (inputs[name]) {
        alert('Input with that name already exists!');
    }
});

renameInputBtn.addEventListener('click', () => {
    if (currentInputId === 'default') {
        alert('Cannot rename default input!');
        return;
    }

    const newName = prompt('Enter new name:', currentInputId);
    if (newName && newName.trim() && newName !== currentInputId) {
        if (inputs[newName]) {
            alert('Input with that name already exists!');
            return;
        }
        inputs[newName.trim()] = inputs[currentInputId];
        delete inputs[currentInputId];
        currentInputId = newName.trim();
        updateInputSelect();
        saveToLocalStorage();
    }
});

deleteInputBtn.addEventListener('click', () => {
    if (currentInputId === 'default') {
        alert('Cannot delete default input!');
        return;
    }

    if (confirm(`Delete input "${currentInputId}"?`)) {
        delete inputs[currentInputId];
        currentInputId = 'default';
        updateInputSelect();
        switchInput('default');
    }
});

// ============= FILE MANAGEMENT =============
let savedFiles = { 'default': '' };
let currentFileId = 'default';
let hasUnsavedChanges = false;
let lastSavedContent = '';

function markAsChanged() {
    if (editor.value !== lastSavedContent) {
        hasUnsavedChanges = true;
        if (dirtyIndicator) {
            dirtyIndicator.style.color = '#fbbf24'; // Amber for unsaved
            dirtyIndicator.title = 'Unsaved changes';
        }
    } else {
        hasUnsavedChanges = false;
        if (dirtyIndicator) {
            dirtyIndicator.style.color = '#10b981'; // Green for saved
            dirtyIndicator.title = 'All changes saved';
        }
    }
}

function checkUnsavedChanges(action) {
    if (hasUnsavedChanges) {
        return confirm(`You have unsaved changes in "${currentFileId}". ${action} will discard these changes. Continue?`);
    }
    return true;
}

function updateScriptSelect() {
    // Build the YOUR FILES section
    const filesGroup = document.createElement('optgroup');
    filesGroup.label = '📁 YOUR FILES';
    Object.keys(savedFiles).forEach(id => {
        const option = document.createElement('option');
        option.value = 'file:' + id;
        
        // Check if this file is synced to a gist
        const hasGist = window.gistStorage && gistStorage.getGistIdForFile(id);
        option.textContent = hasGist ? `☁️ ${id}` : id;
        
        filesGroup.appendChild(option);
    });

    // Build the EXAMPLES section
    const examplesGroup = document.createElement('optgroup');
    examplesGroup.label = '📚 EXAMPLES';
    const exampleList = [
        ['hello', 'Hello World'],
        ['input_demo', 'Input Data Demo'],
        ['grid', 'Simple Grid'],
        ['checkerboard', 'Checkerboard'],
        ['spiral', 'Spiral Pattern'],
        ['wave_animation', '🎬 Wave Animation'],
        ['bouncing_ball', '🎬 Bouncing Ball'],
        ['recursive', 'Recursive Factorial'],
        ['benchmark', 'Benchmarking'],
        ['cube3d', '3D Cube'],
        ['checker3d', '3D Checkerboard'],
        ['spiral3d', '3D Spiral Tower'],
        ['rotating_cube', '🎬 3D Wave Animation'],
        ['mandelbrot', 'Mandelbrot Set']
    ];
    exampleList.forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = 'example:' + value;
        option.textContent = label;
        examplesGroup.appendChild(option);
    });

    // Rebuild the select
    scriptSelect.innerHTML = '';
    scriptSelect.appendChild(filesGroup);
    scriptSelect.appendChild(examplesGroup);
    scriptSelect.value = 'file:' + currentFileId;
}

function switchFile(fileId) {
    if (!checkUnsavedChanges('Switching files')) {
        // Reset select to current file
        scriptSelect.value = 'file:' + currentFileId;
        return;
    }

    // Don't save current file automatically - user must explicitly save
    // Switch to new file
    currentFileId = fileId;
    editor.value = savedFiles[currentFileId] || '';
    // Update Ace editor if it exists
    if (window.setEditorCode) {
        window.setEditorCode(savedFiles[currentFileId] || '');
    }
    scriptSelect.value = 'file:' + currentFileId;

    lastSavedContent = editor.value;
    hasUnsavedChanges = false;
    if (dirtyIndicator) {
        dirtyIndicator.style.color = '#10b981';
        dirtyIndicator.title = 'All changes saved';
    }
    updateHighlight();
    updateLineNumbers();
}

function saveFilesToLocalStorage() {
    try {
        savedFiles[currentFileId] = editor.value;
        lastSavedContent = editor.value;
        hasUnsavedChanges = false;
        if (dirtyIndicator) {
            dirtyIndicator.style.color = '#10b981';
            dirtyIndicator.title = 'All changes saved';
        }
        localStorage.setItem('gridlang_files', JSON.stringify(savedFiles));
        localStorage.setItem('gridlang_currentFile', currentFileId);
    } catch (e) {
        console.error('Failed to save files to localStorage:', e);
    }
}

function loadFilesFromLocalStorage() {
    try {
        const saved = localStorage.getItem('gridlang_files');
        const savedCurrent = localStorage.getItem('gridlang_currentFile');

        if (saved !== null) {
            savedFiles = JSON.parse(saved);
            updateScriptSelect();
        }

        // Only load the current file if no URL code is being loaded
        const params = new URLSearchParams(window.location.search);
        const hasUrlCode = params.get('code');

        if (!hasUrlCode && savedCurrent !== null && savedFiles[savedCurrent] !== undefined) {
            currentFileId = savedCurrent;
            scriptSelect.value = 'file:' + currentFileId;
            editor.value = savedFiles[currentFileId];
            // Update Ace editor if it exists
            if (window.setEditorCode) {
                window.setEditorCode(savedFiles[currentFileId]);
            }
            lastSavedContent = editor.value;
            hasUnsavedChanges = false;
            if (dirtyIndicator) {
                dirtyIndicator.style.color = '#10b981';
                dirtyIndicator.title = 'All changes saved';
            }
            updateHighlight();
            updateLineNumbers();
        }
    } catch (e) {
        console.error('Failed to load files from localStorage:', e);
    }
}

scriptSelect.addEventListener('change', (e) => {
    const selection = e.target.value;
    if (!selection) return;

    if (selection.startsWith('file:')) {
        // User selected a saved file
        const fileId = selection.substring(5); // Remove 'file:' prefix
        switchFile(fileId);
    } else if (selection.startsWith('example:')) {
        // User selected an example
        const exampleId = selection.substring(8); // Remove 'example:' prefix
        if (examples[exampleId]) {
            if (!checkUnsavedChanges('Loading an example')) {
                // Reset select to current file
                scriptSelect.value = 'file:' + currentFileId;
                return;
            }

            editor.value = examples[exampleId];
            // Update Ace editor if it exists
            if (window.setEditorCode) {
                window.setEditorCode(examples[exampleId]);
            }
            lastSavedContent = editor.value;
            hasUnsavedChanges = false;
            if (dirtyIndicator) {
                dirtyIndicator.style.color = '#10b981';
                dirtyIndicator.title = 'All changes saved';
            }
            updateHighlight();
            updateLineNumbers();

            // Auto-switch mode based on example name
            if (exampleId.includes('3d') || exampleId.includes('cube')) {
                switchMode('3d');
            } else {
                switchMode('2d');
            }

            // Keep showing the example name in selector
            scriptSelect.value = 'example:' + exampleId;
        }
    }
});

saveFileBtn.addEventListener('click', () => {
    savedFiles[currentFileId] = editor.value;
    saveFilesToLocalStorage();
    // No alert - just update the dirty indicator
});

saveAsBtn.addEventListener('click', () => {
    const name = prompt('Enter file name:');
    if (name && name.trim()) {
        const trimmedName = name.trim();
        savedFiles[trimmedName] = editor.value;
        currentFileId = trimmedName;
        lastSavedContent = editor.value;
        hasUnsavedChanges = false;
        if (dirtyIndicator) {
            dirtyIndicator.style.color = '#10b981';
            dirtyIndicator.title = 'All changes saved';
        }
        updateScriptSelect();
        saveFilesToLocalStorage();
    }
});

renameFileBtn.addEventListener('click', () => {
    if (currentFileId === 'default') {
        alert('Cannot rename default file!');
        return;
    }

    const newName = prompt('Enter new name:', currentFileId);
    if (newName && newName.trim() && newName !== currentFileId) {
        if (savedFiles[newName]) {
            alert('File with that name already exists!');
            return;
        }
        savedFiles[newName.trim()] = savedFiles[currentFileId];
        delete savedFiles[currentFileId];
        currentFileId = newName.trim();
        updateScriptSelect();
        saveFilesToLocalStorage();
    }
});

deleteFileBtn.addEventListener('click', () => {
    if (currentFileId === 'default') {
        alert('Cannot delete default file!');
        return;
    }

    if (confirm(`Delete file "${currentFileId}"?`)) {
        delete savedFiles[currentFileId];
        currentFileId = 'default';
        updateScriptSelect();
        switchFile('default');
    }
});

// Horizontal resizer (code/input)
let isResizingHorizontal = false;
let startYHorizontal = 0;
let startCodeHeight = 0;
let startInputHeight = 0;

horizontalResizer.addEventListener('mousedown', (e) => {
    isResizingHorizontal = true;
    startYHorizontal = e.clientY;
    startCodeHeight = codeSection.offsetHeight;
    startInputHeight = inputSection.offsetHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isResizingHorizontal) return;

    const delta = e.clientY - startYHorizontal;
    const newCodeHeight = startCodeHeight + delta;
    const newInputHeight = startInputHeight - delta;

    if (newCodeHeight >= 200 && newInputHeight >= 100) {
        codeSection.style.flex = 'none';
        codeSection.style.height = newCodeHeight + 'px';
        inputSection.style.height = newInputHeight + 'px';
    }
});

document.addEventListener('mouseup', () => {
    if (isResizingHorizontal) {
        isResizingHorizontal = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});

// Load saved data on startup
loadFromLocalStorage();
loadFilesFromLocalStorage(); // This now checks for URL params internally
updateInputSelect();
updateScriptSelect();

// Load code from URL if present (after files are loaded)
loadFromURL();

// Warn on page unload if there are unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Syntax highlighting using Prism
function updateHighlight() {
    const code = editor.value;
    highlightCode.textContent = code;
    Prism.highlightElement(highlightCode);
}

// Sync scrolling
function syncScroll() {
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
    lineNumbers.scrollTop = editor.scrollTop;
}

// Update line numbers
function updateLineNumbers() {
    const lines = editor.value.split('\n');
    const lineCount = lines.length;
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
        html += i + '\n';
    }
    lineNumbers.textContent = html;
}

// Jump to a specific line (for error navigation)
function jumpToLine(lineNumber) {
    const lines = editor.value.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) return;

    // Calculate position of the line
    let position = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
        position += lines[i].length + 1; // +1 for newline
    }

    // Set cursor and select the error line
    editor.focus();
    editor.setSelectionRange(position, position + lines[lineNumber - 1].length);

    // Scroll to make the line visible
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
    const scrollTop = (lineNumber - 1) * lineHeight - editor.clientHeight / 2;
    editor.scrollTop = Math.max(0, scrollTop);
}

// Override Prism to highlight our built-in functions and keywords
Prism.languages.insertBefore('python', 'function', {
    'builtin-function': {
        pattern: /\b(print|debug|set_debug|range|len|append|str|int|float|bool|substr|slice|split|join|upper|lower|trim|replace|starts_with|ends_with|contains|index_of|char_at|char_code|from_char_code|repeat|reverse|abs|sqrt|pow|floor|ceil|round|sin|cos|tan|min|max|random|time|clock|benchmark|animate|stop_animation|record_animation|save_animation_gif|stop_recording|clear_recording|get_animation_frames|init_2d|set_cell|clear_canvas|set_pixel|draw_line|draw_circle|draw_rect|rgb|hsl|init_3d|set_voxel|remove_voxel|get_voxel|clear_3d|begin_3d_batch|end_3d_batch|input_string|input_lines|input_grid)(?=\s*\()/,
        alias: 'function'
    }
});

// Override Python's def keyword with func for GridLang
Prism.languages.python.keyword = /\b(?:and|as|assert|async|await|break|case|class|continue|else|elif|except|exec|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|print|raise|return|try|while|with|yield|func)\b/;

// Highlight and scroll sync (handled in autocomplete input handler now for highlight)
editor.addEventListener('scroll', syncScroll);

// Initial highlight
updateHighlight();
updateLineNumbers();

const examples = {
    hello: `# Hello World
print("Hello, GridLang!")
print("2 + 2 =", 2 + 2)

arr = [1, 2, 3, 4, 5]
print("Array:", arr)
print("Sum:", arr[0] + arr[1] + arr[2] + arr[3] + arr[4])`,

    input_demo: `# Input Data Demo
# Try adding input data in the Input panel below!
# Example input:
# 5
# 10
# 15
# 20

# Read from active input
raw = input_string()
print("Raw input:", raw)
print("")

# Read from named input file
data1 = input_string("data1")
print("Data1:", data1)
print("")

# Read as lines (from active or named input)
lines = input_lines()
print("Lines:", len(lines))
for line in lines {
    print("  ", line)
}
print("")

# Read as integer grid (space-separated)
# Input: 1 2 3
#        4 5 6
grid = input_grid("int")
print("Int grid:", grid)
print("")

# Read from specific named input file
grid2 = input_grid("int", " ", "data2")
print("Grid from data2:", grid2)`,

    grid: `# Simple Grid Drawing
init_2d(10, 40)

# Color some cells
set_cell(0, 0, "#ff0000")
set_cell(0, 9, "#00ff00")
set_cell(9, 0, "#0000ff")
set_cell(9, 9, "#ffff00")
set_cell(5, 5, "#ff00ff")

print("Grid complete!")`,

    checkerboard: `# Checkerboard Pattern
init_2d(20, 30)

for i in range(20) {
    for j in range(20) {
        if (i + j) % 2 == 0 {
            set_cell(i, j, "#4ec9b0")
        } else {
            set_cell(i, j, "#ce9178")
        }
    }
}

print("Checkerboard complete!")`,

    spiral: `# Spiral Pattern
init_2d(40, 15)

func spiral(n) {
    x = n / 2
    y = n / 2
    steps = 1
    
    for i in range(n * n) {
        set_cell(floor(y), floor(x), hsl(i * 360 / (n * n), 70, 50))
        
        if i % steps == 0 {
            if i % (steps * 2) == 0 {
                steps = steps + 1
            }
        }
        
        dx = cos(i * 0.1) * 0.5
        dy = sin(i * 0.1) * 0.5
        x = x + dx
        y = y + dy
    }
}

spiral(40)
print("Spiral complete!")`,

    recursive: `# Recursive Factorial
func factorial(n) {
    if n <= 1 {
        return 1
    }
    return n * factorial(n - 1)
}

print("Factorial of 5:", factorial(5))
print("Factorial of 10:", factorial(10))
print("Factorial of 15:", factorial(15))

# Fibonacci
func fib(n) {
    if n <= 1 {
        return n
    }
    return fib(n - 1) + fib(n - 2)
}

print("Fibonacci 10:", fib(10))
print("Fibonacci 15:", fib(15))

# Visualize factorials
init_2d(10, 30)
for i in range(10) {
    for j in range(10) {
        val = factorial(i + 1) % 256
        set_cell(i, j, rgb(val, 100, 150))
    }
}`,

    benchmark: `# Performance Benchmarking
print("=== GridLang Benchmarking Demo ===")
print("")

# Simple fibonacci function
func fib(n) {
    if n <= 1 {
        return n
    }
    return fib(n - 1) + fib(n - 2)
}

# Test different values
print("Computing Fibonacci numbers...")
print("fib(10) =", fib(10))
print("fib(15) =", fib(15))
print("fib(20) =", fib(20))
print("")

# Benchmark fibonacci
print("Benchmarking fib(10):")
start = clock()
result = fib(10)
end = clock()
print("Result:", result)
print("Time:", (end - start), "seconds")
print("")

print("Benchmarking fib(15):")
start = clock()
result = fib(15)
end = clock()
print("Result:", result)
print("Time:", (end - start), "seconds")
print("")

print("Benchmarking fib(20):")
start = clock()
result = fib(20)
end = clock()
print("Result:", result)
print("Time:", (end - start), "seconds")
print("")

# Using benchmark function
print("Using benchmark() function:")

func test_fib_10() {
    fib(10)
}

func test_fib_15() {
    fib(15)
}

benchmark(test_fib_10, 100)
benchmark(test_fib_15, 10)

# Benchmark array operations
print("")
print("Array operations:")

func array_test() {
    arr = []
    for i in range(1000) {
        append(arr, i)
    }
}

benchmark(array_test, 10)`,

    cube3d: `# 3D Cube (Switch to 3D mode!)
init_3d(7, 10)

# Draw a simple cube
size = 5
for x in range(size) {
    for y in range(size) {
        for z in range(size) {
            # Only draw edges of cube
            if x == 0 or x == size-1 or y == 0 or y == size-1 or z == 0 or z == size-1 {
                set_voxel(x, y, z, "#4ec9b0")
            }
        }
    }
}

print("3D Cube complete!")
print("Use mouse to rotate, pan, zoom")`,

    checker3d: `# 3D Checkerboard (Switch to 3D mode!)
init_3d(6, 9)

size = 10
for x in range(size) {
    for y in range(size) {
        for z in range(size) {
            if (x + y + z) % 2 == 0 {
                set_voxel(x, y, z, "#4ec9b0")
            } else {
                set_voxel(x, y, z, "#ce9178")
            }
        }
    }
}

print("3D Checkerboard complete!")`,

    spiral3d: `# 3D Spiral Tower (Switch to 3D mode!)
init_3d(5, 8)

height = 30
radius = 8

for i in range(height) {
    angle = i * 0.5
    x = floor(cos(angle) * radius) + 10
    z = floor(sin(angle) * radius) + 10
    y = i
    
    # Color gradient based on height
    hue = (i * 360 / height)
    set_voxel(x, y, z, hsl(hue, 80, 60))
}

print("Spiral tower complete!")`,

    mandelbrot: `# Mandelbrot Set
width = 80
height = 60
init_2d([height, width], 8)

max_iter = 50

for py in range(height) {
    for px in range(width) {
        x0 = (px / width) * 3.5 - 2.5
        y0 = (py / height) * 2.0 - 1.0
        
        x = 0
        y = 0
        iteration = 0
        
        while x*x + y*y <= 4 and iteration < max_iter {
            xtemp = x*x - y*y + x0
            y = 2*x*y + y0
            x = xtemp
            iteration = iteration + 1
        }
        
        if iteration < max_iter {
            color = hsl(iteration * 360 / max_iter, 80, 50)
            set_cell(py, px, color)
        } else {
            set_cell(py, px, "#000000")
        }
    }
}

print("Mandelbrot set complete!")`,

    wave_animation: `# Wave Animation (2D)
init_2d(30, 20)

func draw_wave(t) {
    clear_canvas()
    
    for x in range(30) {
        # Calculate wave height
        wave_height = sin(x * 0.3 + t * 2) * 5 + 15
        y = floor(wave_height)
        
        # Draw water column
        for dy in range(y, 30) {
            brightness = 40 + dy * 2
            set_cell(dy, x, hsl(200, 80, brightness))
        }
    }
}

animate(draw_wave, 30)
print("Wave animation started! Run again to restart.")`,

    bouncing_ball: `# Bouncing Ball Animation (2D)
init_2d(20, 15)

# Ball state with JS-style object syntax
state = {x: 10.0, y: 5.0, vx: 0.3, vy: 0.2, gravity: 0.02}

func draw_frame(t) {
    clear_canvas()
    
    # Update physics - dot notation!
    state.vy = state.vy + state.gravity
    state.x = state.x + state.vx
    state.y = state.y + state.vy
    
    # Bounce off walls
    if state.x < 0 or state.x >= 20 {
        state.vx = -state.vx
        state.x = max(0, min(19, state.x))
    }
    if state.y >= 20 {
        state.vy = -state.vy * 0.8  # Energy loss
        state.y = 20
    }
    
    # Draw ball
    ball_x = floor(state.x)
    ball_y = floor(state.y)
    set_cell(ball_y, ball_x, "#ff6b6b")
    
    # Draw trail
    if ball_x > 0 {
        set_cell(ball_y, ball_x - 1, "#ff6b6b80")
    }
}

animate(draw_frame, 60)
print("Ball animation started!")`,

    rotating_cube: `# 3D Wave Animation (Switch to 3D mode!)
init_3d(5, 8)

width = 20
depth = 20

func draw_wave(t) {
    for x in range(width) {
        for z in range(depth) {
            # Calculate wave height using sine waves
            wave1 = sin(x * 0.3 + t * 2) * 3
            wave2 = cos(z * 0.3 + t * 2) * 3
            height = floor((wave1 + wave2) / 2) + 8
            
            # Draw only the top voxel
            hue = (height * 20 + t * 30) % 360
            brightness = 50 + height * 3
            set_voxel(x, height, z, hsl(hue, 80, brightness))
        }
    }
}

# animate() with clear3d and batch3d options
animate(draw_wave, 30, { clear3d: true })
print("3D Wave animation started!")
print("Use mouse to rotate, pan, zoom")`,

    mandelbrot: `# Mandelbrot Set
width = 80
height = 60
init_2d([height, width], 8)

max_iter = 50

for py in range(height) {
    for px in range(width) {
        x0 = (px / width) * 3.5 - 2.5
        y0 = (py / height) * 2.0 - 1.0
        
        x = 0
        y = 0
        iteration = 0
        
        while x*x + y*y <= 4 and iteration < max_iter {
            xtemp = x*x - y*y + x0
            y = 2*x*y + y0
            x = xtemp
            iteration = iteration + 1
        }
        
        if iteration < max_iter {
            color = hsl(iteration * 360 / max_iter, 80, 50)
            set_cell(py, px, color)
        } else {
            set_cell(py, px, "#000000")
        }
    }
}

print("Mandelbrot set complete!")`
};

function runCode() {
    // Auto-save if we are editing a file (not an example)
    if (scriptSelect.value && scriptSelect.value.startsWith('file:')) {
        saveFilesToLocalStorage();
    }

    const code = editor.value;
    consoleEl.innerHTML = '';

    // Start high-resolution timer
    const startTime = performance.now();

    // Stop any running animation first
    if (currentInterpreter) {
        currentInterpreter.animationRunning = false;
        if (currentInterpreter.animationId) {
            cancelAnimationFrame(currentInterpreter.animationId);
            clearTimeout(currentInterpreter.animationId);
        }
    }

    try {
        const lexer = new Lexer(code);
        const tokens = lexer.tokenize();

        const parser = new Parser(tokens);
        const ast = parser.parse();

        const currentInput = inputs[currentInputId] || '';
        currentInterpreter = new Interpreter(canvas, canvas3d, consoleEl, renderer3d, currentInput, canvasContainer, inputs);

        // Set debug mode from checkbox
        currentInterpreter.debugEnabled = debugCheckbox.checked;

        // Clear any previous error highlighting
        clearErrorHighlight();

        currentInterpreter.run(ast);

        // Transform run button to stop button if animation is running
        if (currentInterpreter.animationRunning) {
            runBtn.textContent = '⏹';
            runBtn.title = 'Stop';
            runBtn.style.backgroundColor = '#dc2626'; // Red color
            runBtn.style.color = 'white';

            // Set callback to reset button when animation stops
            currentInterpreter.onAnimationStop = resetRunButton;
        }

        // Calculate and display execution time
        const endTime = performance.now();
        const elapsed = endTime - startTime;
        const formattedTime = formatExecutionTime(elapsed);

        const completionMsg = `<span style="color:#10b981;font-weight:bold">\n✓ Completed in ${formattedTime}</span>\n`;
        currentInterpreter.cachedConsoleHTML += completionMsg;
        consoleEl.innerHTML = currentInterpreter.cachedConsoleHTML;
        consoleEl.scrollTop = consoleEl.scrollHeight;

    } catch (e) {
        // Calculate execution time even on error
        const endTime = performance.now();
        const elapsed = endTime - startTime;
        const formattedTime = formatExecutionTime(elapsed);

        // Format error with location if available
        let errorText = e.message;
        if (e instanceof GridLangError || (e.line !== undefined && e.col !== undefined)) {
            errorText = e.format ? e.format() : `${e.errorType || 'Error'} at line ${e.line}, col ${e.col}: ${e.message}`;

            // Highlight the error line in the editor
            if (e.line) {
                highlightErrorLine(e.line);
            }
        }

        const escapedMsg = errorText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const errorMsg = `<span style="color:#f48771">${escapedMsg}</span>\n<span style="color:#ef4444;font-weight:bold">\n✗ Failed after ${formattedTime}</span>\n`;

        if (currentInterpreter) {
            currentInterpreter.cachedConsoleHTML += errorMsg;
            consoleEl.innerHTML = currentInterpreter.cachedConsoleHTML;
        } else {
            consoleEl.innerHTML += errorMsg;
        }
        consoleEl.scrollTop = consoleEl.scrollHeight;

        console.error(e);

        // Extract line number and jump to it
        const lineMatch = e.message.match(/at line (\d+)/);
        if (lineMatch) {
            const errorLine = parseInt(lineMatch[1]);
            jumpToLine(errorLine);
        }
    }
}

function formatExecutionTime(ms) {
    if (ms < 1) {
        return `${(ms * 1000).toFixed(2)}µs`;
    } else if (ms < 1000) {
        return `${ms.toFixed(2)}ms`;
    } else if (ms < 60000) {
        return `${(ms / 1000).toFixed(2)}s`;
    } else {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(2);
        return `${minutes}m ${seconds}s`;
    }
}

function resetRunButton() {
    runBtn.textContent = '▶';
    runBtn.title = 'Run (Ctrl+Enter)';
    runBtn.style.backgroundColor = '';
    runBtn.style.color = '';
}

function stopAnimation() {
    if (currentInterpreter) {
        currentInterpreter.animationRunning = false;
        if (currentInterpreter.animationId) {
            cancelAnimationFrame(currentInterpreter.animationId);
            clearTimeout(currentInterpreter.animationId);
            currentInterpreter.animationId = null;
        }
    }

    resetRunButton();

    const line = document.createElement('div');
    line.className = 'console-line output';
    line.textContent = 'Animation stopped.';
    consoleEl.appendChild(line);
}

function clearCanvas() {
    // Clear 2D canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 600;
    canvas.height = 400;

    // Clear 3D canvas
    if (renderer3d) {
        renderer3d.clear();
    }
}

runBtn.addEventListener('click', () => {
    // Check if we're in stop mode (animation running)
    if (currentInterpreter && currentInterpreter.animationRunning) {
        stopAnimation();
    } else {
        runCode();
    }
});
clearBtn.addEventListener('click', clearCanvas);

// Debug button toggle
debugBtn.addEventListener('click', () => {
    debugCheckbox.checked = !debugCheckbox.checked;
    updateDebugButtonStyle();
});

function updateDebugButtonStyle() {
    if (debugCheckbox.checked) {
        debugBtn.style.background = '#0e639c';
    } else {
        debugBtn.style.background = '#6c6c6c';
    }
}
updateDebugButtonStyle(); // Set initial state

// Resizer functionality
const resizer = document.getElementById('resizer');
const consolePanel = document.getElementById('console');

let isResizing = false;
let startY = 0;
let startCanvasHeight = 0;
let startConsoleHeight = 0;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startCanvasHeight = canvasContainer.offsetHeight;
    startConsoleHeight = consolePanel.offsetHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const delta = e.clientY - startY;
    const newCanvasHeight = startCanvasHeight + delta;
    const newConsoleHeight = startConsoleHeight - delta;

    // Minimum heights
    if (newCanvasHeight >= 100 && newConsoleHeight >= 50) {
        canvasContainer.style.flex = 'none';
        canvasContainer.style.height = newCanvasHeight + 'px';
        consolePanel.style.height = newConsoleHeight + 'px';
    }
});

document.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
});

// Keyboard shortcuts setup
function setupKeyboardShortcuts(aceInstance) {
    if (!aceInstance) return;

    // Run Code: Ctrl+Enter (Cmd+Enter on Mac)
    aceInstance.commands.addCommand({
        name: 'runCode',
        bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
        exec: function (editor) {
            console.log('Shortcut: Run Code');
            // Trigger the run button click to reuse logic (animation handling etc)
            runBtn.click();
        },
        readOnly: true // Allow in read only mode if needed
    });

    // Save File: Ctrl+S (Cmd+S on Mac)
    aceInstance.commands.addCommand({
        name: 'saveFile',
        bindKey: { win: 'Ctrl-S', mac: 'Command-S' },
        exec: function (editor) {
            console.log('Shortcut: Save File');
            saveFileBtn.click();
            // Prevent browser save dialog
            return true;
        },
        readOnly: true
    });

    // Cut or Remove Line: Ctrl+X (Cmd+X on Mac)
    // If selection is empty, remove line. If selection exists, perform standard cut.
    aceInstance.commands.addCommand({
        name: 'cutOrRemoveLine',
        bindKey: { win: 'Ctrl-X', mac: 'Command-X' },
        exec: function (editor) {
            if (editor.selection.isEmpty()) {
                editor.removeLines();
                return true;
            }
            // If selection exists, return false to let Ace handle the default behavior (Cut)
            return false;
        },
        readOnly: false
    });


    // --- VS Code Compatibility ---

    // Move Line Up: Alt+Up
    aceInstance.commands.addCommand({
        name: 'moveLineUp',
        bindKey: { win: 'Alt-Up', mac: 'Option-Up' },
        exec: function (editor) { editor.execCommand('movelinesup'); },
        readOnly: false
    });

    // Move Line Down: Alt+Down
    aceInstance.commands.addCommand({
        name: 'moveLineDown',
        bindKey: { win: 'Alt-Down', mac: 'Option-Down' },
        exec: function (editor) { editor.execCommand('movelinesdown'); },
        readOnly: false
    });

    // Copy Line Up: Shift+Alt+Up
    aceInstance.commands.addCommand({
        name: 'copyLineUp',
        bindKey: { win: 'Shift-Alt-Up', mac: 'Shift-Option-Up' },
        exec: function (editor) { editor.execCommand('copylinesup'); },
        readOnly: false
    });

    // Copy Line Down: Shift+Alt+Down
    aceInstance.commands.addCommand({
        name: 'copyLineDown',
        bindKey: { win: 'Shift-Alt-Down', mac: 'Shift-Option-Down' },
        exec: function (editor) { editor.execCommand('copylinesdown'); },
        readOnly: false
    });

    // Delete Line: Ctrl+Shift+K
    aceInstance.commands.addCommand({
        name: 'deleteLineVSCode',
        bindKey: { win: 'Ctrl-Shift-K', mac: 'Command-Shift-K' },
        exec: function (editor) { editor.execCommand('removeline'); },
        readOnly: false
    });

    // Select Next Occurrence (Multi-cursor): Ctrl+D
    aceInstance.commands.addCommand({
        name: 'selectNextOccurrence',
        bindKey: { win: 'Ctrl-D', mac: 'Command-D' },
        exec: function (editor) { editor.execCommand('selectMoreAfter'); },
        readOnly: false
    });

    console.log('✓ Keyboard shortcuts initialized');
}

// Listen for Ace Editor ready event
window.addEventListener('GridLangAceReady', (e) => {
    console.log('GridLangAceReady received');
    setupKeyboardShortcuts(e.detail.editor);
});

// Fallback: Check if already loaded (race condition safety)
if (window.aceEditor) {
    setupKeyboardShortcuts(window.aceEditor);
}

// Don't auto-run code on load - user must explicitly run

// ============= GITHUB GIST INTEGRATION =============

// Get UI elements for gist functionality
const gistConfigModal = document.getElementById('gistConfigModal');
const gistBrowserModal = document.getElementById('gistBrowserModal');
const gistConfigBtn = document.getElementById('gistConfigBtn');
const gistSyncBtn = document.getElementById('gistSyncBtn');
const gistLoadBtn = document.getElementById('gistLoadBtn');
const gistStatus = document.getElementById('gistStatus');
const githubToken = document.getElementById('githubToken');
const showTokenCheckbox = document.getElementById('showToken');
const saveGistConfigBtn = document.getElementById('saveGistConfigBtn');
const testGistConnectionBtn = document.getElementById('testGistConnectionBtn');
const closeGistConfigBtn = document.getElementById('closeGistConfigBtn');
const gistList = document.getElementById('gistList');
const refreshGistListBtn = document.getElementById('refreshGistListBtn');
const closeGistBrowserBtn = document.getElementById('closeGistBrowserBtn');

// Update gist status indicator
function updateGistStatus() {
    if (!window.gistStorage) return;
    
    const gistId = gistStorage.getGistIdForFile(currentFileId);
    if (gistId) {
        gistStatus.textContent = '☁️ Synced';
        gistStatus.style.color = '#10b981';
        gistStatus.title = `Linked to gist: ${gistId}`;
    } else {
        gistStatus.textContent = '';
        gistStatus.title = 'Not synced to GitHub';
    }
    
    // Update the file dropdown to show cloud icon
    updateScriptSelect();
}

// Show gist config modal
gistConfigBtn.addEventListener('click', () => {
    if (!window.gistStorage) {
        showToast('Gist storage not available', 'error');
        return;
    }
    
    githubToken.value = gistStorage.getToken();
    gistConfigModal.classList.add('show');
});

// Close gist config modal
closeGistConfigBtn.addEventListener('click', () => {
    gistConfigModal.classList.remove('show');
});

// Toggle token visibility
showTokenCheckbox.addEventListener('change', (e) => {
    githubToken.type = e.target.checked ? 'text' : 'password';
});

// Save GitHub token
saveGistConfigBtn.addEventListener('click', () => {
    const token = githubToken.value.trim();
    if (!token) {
        showToast('Please enter a valid token', 'error');
        return;
    }
    
    gistStorage.setToken(token);
    showToast('GitHub token saved successfully! ✓');
    gistConfigModal.classList.remove('show');
});

// Test GitHub connection
testGistConnectionBtn.addEventListener('click', async () => {
    const token = githubToken.value.trim();
    if (!token) {
        showToast('Please enter a token first', 'error');
        return;
    }
    
    gistStorage.setToken(token);
    testGistConnectionBtn.disabled = true;
    testGistConnectionBtn.textContent = 'Testing...';
    
    try {
        await gistStorage.listGists(1, 1);
        showToast('Connection successful! ✓');
    } catch (error) {
        showToast(`Connection failed: ${error.message}`, 'error');
    } finally {
        testGistConnectionBtn.disabled = false;
        testGistConnectionBtn.textContent = '🔍 Test Connection';
    }
});

// Save current file to GitHub Gist
gistSyncBtn.addEventListener('click', async () => {
    if (!window.gistStorage) {
        showToast('Gist storage not available', 'error');
        return;
    }
    
    if (!gistStorage.hasToken()) {
        showToast('Please configure your GitHub token first', 'error');
        gistConfigModal.classList.add('show');
        return;
    }
    
    const code = editor.value;
    if (!code || !code.trim()) {
        showToast('Cannot save empty file', 'error');
        return;
    }
    
    gistSyncBtn.disabled = true;
    gistSyncBtn.textContent = '☁️⏳';
    
    try {
        const gistId = gistStorage.getGistIdForFile(currentFileId);
        const result = await gistStorage.saveFile(currentFileId, code, gistId);
        
        // Map this file to the gist
        gistStorage.mapFileToGist(currentFileId, result.id);
        
        updateGistStatus();
        showToast(`Saved to GitHub Gist! ✓`);
        
        // Optionally show the gist URL
        console.log('Gist URL:', result.url);
    } catch (error) {
        showToast(`Failed to save to gist: ${error.message}`, 'error');
        console.error('Gist save error:', error);
    } finally {
        gistSyncBtn.disabled = false;
        gistSyncBtn.textContent = '☁️↑';
    }
});

// Browse and load from GitHub Gists
gistLoadBtn.addEventListener('click', async () => {
    if (!window.gistStorage) {
        showToast('Gist storage not available', 'error');
        return;
    }
    
    if (!gistStorage.hasToken()) {
        showToast('Please configure your GitHub token first', 'error');
        gistConfigModal.classList.add('show');
        return;
    }
    
    gistBrowserModal.classList.add('show');
    await loadGistList();
});

// Close gist browser modal
closeGistBrowserBtn.addEventListener('click', () => {
    gistBrowserModal.classList.remove('show');
});

// Refresh gist list
refreshGistListBtn.addEventListener('click', async () => {
    await loadGistList();
});

// Load and display list of gists
async function loadGistList() {
    gistList.innerHTML = '<p style="text-align: center; color: #858585;">Loading...</p>';
    refreshGistListBtn.disabled = true;
    
    try {
        const gists = await gistStorage.listGists(50, 1);
        
        if (gists.length === 0) {
            gistList.innerHTML = '<p style="text-align: center; color: #858585;">No gists found. Create one by saving a file!</p>';
            return;
        }
        
        gistList.innerHTML = '';
        gists.forEach(gist => {
            const item = document.createElement('div');
            item.className = 'gist-item';
            
            const title = document.createElement('div');
            title.className = 'gist-item-title';
            const icon = gist.hasGridFile ? '📄 ' : '📝 ';
            title.textContent = icon + (gist.description || 'Untitled');
            
            const info = document.createElement('div');
            info.className = 'gist-item-info';
            const updated = new Date(gist.updated_at).toLocaleString();
            const fileInfo = gist.filename ? `${gist.filename} • ` : '';
            info.textContent = `${fileInfo}Updated: ${updated} • ${gist.public ? 'Public' : 'Private'}`;
            
            item.appendChild(title);
            item.appendChild(info);
            
            item.addEventListener('click', () => loadGistIntoEditor(gist.id, gist.filename));
            
            gistList.appendChild(item);
        });
        
        console.log(`Loaded ${gists.length} gists`);
    } catch (error) {
        gistList.innerHTML = `<p style="text-align: center; color: #f48771;">Error: ${error.message}</p>`;
        showToast(`Failed to load gists: ${error.message}`, 'error');
    } finally {
        refreshGistListBtn.disabled = false;
    }
}

// Load a specific gist into the editor
async function loadGistIntoEditor(gistId, filename) {
    try {
        const gist = await gistStorage.getGist(gistId);
        
        if (!checkUnsavedChanges('Loading a gist')) {
            return;
        }
        
        // Create or use existing file
        const localFilename = filename.replace('.grid', '');
        savedFiles[localFilename] = gist.content;
        currentFileId = localFilename;
        
        // Map to gist
        gistStorage.mapFileToGist(localFilename, gist.id);
        
        // Update editor
        editor.value = gist.content;
        if (window.setEditorCode) {
            window.setEditorCode(gist.content);
        }
        
        lastSavedContent = gist.content;
        hasUnsavedChanges = false;
        
        updateScriptSelect();
        saveFilesToLocalStorage();
        updateGistStatus();
        updateHighlight();
        updateLineNumbers();
        
        gistBrowserModal.classList.remove('show');
        showToast(`Loaded: ${filename} ✓`);
    } catch (error) {
        showToast(`Failed to load gist: ${error.message}`, 'error');
    }
}

// Close modals when clicking outside
gistConfigModal.addEventListener('click', (e) => {
    if (e.target === gistConfigModal) {
        gistConfigModal.classList.remove('show');
    }
});

gistBrowserModal.addEventListener('click', (e) => {
    if (e.target === gistBrowserModal) {
        gistBrowserModal.classList.remove('show');
    }
});

// Update gist status when switching files
const originalSwitchFile = switchFile;
switchFile = function(fileId) {
    originalSwitchFile(fileId);
    updateGistStatus();
};

// Initialize gist status on load
updateGistStatus();
