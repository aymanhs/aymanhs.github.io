/**
 * Ace Editor Initialization for GridLang
 * Simple, lightweight, works without module loaders
 */

let aceEditor = null;

function initAceEditor() {
    const container = document.getElementById('ace-editor-container');
    if (!container) {
        console.warn('Ace container not found, using textarea');
        return false;
    }

    try {
        // Create Ace editor
        aceEditor = ace.edit('ace-editor-container', {
            mode: 'ace/mode/gridlang',
            theme: 'ace/theme/tomorrow_night',
            fontSize: 14,
            fontFamily: "'Consolas', 'Monaco', monospace",
            tabSize: 4,
            useSoftTabs: true,
            wrap: true,
            showLineNumbers: true,
            showFoldWidgets: true,
            highlightActiveLine: true,
            displayIndentGuides: true,
            showInvisibles: false,
            scrollPastEnd: 0.1,
            enableLiveAutocompletion: true,
            enableSnippets: true
        });

        // Enable context menu on editor container
        const editorContainer = document.getElementById('ace-editor-container');
        if (editorContainer) {
            editorContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showAceContextMenu(e, aceEditor);
            });
        }

        // Get initial code from textarea
        const textarea = document.getElementById('editor');
        if (textarea && textarea.value) {
            aceEditor.setValue(textarea.value.trim(), -1);
        } else {
            aceEditor.setValue(getDefaultCode(), -1);
        }

        // Sync back to textarea
        aceEditor.session.on('change', () => {
            if (textarea) {
                textarea.value = aceEditor.getValue();
                // Trigger input event for ui.js to detect changes
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        // Create proxy for ui.js compatibility
        setupAceProxy();

        // Hide textarea and fallback elements
        if (textarea) textarea.style.display = 'none';
        const lineNumbers = document.getElementById('lineNumbers');
        if (lineNumbers) lineNumbers.style.display = 'none';
        const highlight = document.getElementById('highlight');
        if (highlight) highlight.style.display = 'none';

        console.log('✓ Ace Editor initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize Ace:', error);
        return false;
    }
}

function setupAceProxy() {
    if (!aceEditor) return;

    // Add GridLang completers
    addGridLangCompleters();

    const proxy = {
        get value() {
            return aceEditor.getValue();
        },
        set value(code) {
            aceEditor.setValue(code, -1);
        },
        get selectionStart() {
            const pos = aceEditor.getSession().getDocument().positionToIndex(aceEditor.getCursorPosition());
            return pos;
        },
        set selectionStart(val) {
            const pos = aceEditor.getSession().getDocument().indexToPosition(val);
            aceEditor.moveCursorToPosition(pos);
        },
        get scrollTop() {
            return aceEditor.getSession().getScrollTop();
        },
        set scrollTop(val) {
            aceEditor.getSession().setScrollTop(val);
        },
        get clientHeight() {
            return aceEditor.container.clientHeight;
        },
        get clientWidth() {
            return aceEditor.container.clientWidth;
        },
        get offsetHeight() {
            return aceEditor.container.offsetHeight;
        },
        get offsetWidth() {
            return aceEditor.container.offsetWidth;
        },
        get textContent() {
            return this.value;
        },
        set textContent(code) {
            this.value = code;
        },
        dispatchEvent(event) {
            // No-op
        },
        focus() {
            aceEditor.focus();
        },
        blur() {
            // No-op
        },
        addEventListener(event, handler) {
            if (event === 'scroll') {
                aceEditor.session.on('changeScrollTop', () => handler({ target: proxy }));
            } else if (event === 'input' || event === 'change') {
                aceEditor.session.on('change', () => handler({ target: proxy }));
            }
        },
        contains(element) {
            return aceEditor.container.contains(element);
        }
    };

    // Override document.getElementById
    const originalGetElementById = document.getElementById;
    document.getElementById = function (id) {
        if (id === 'editor') {
            return proxy;
        }
        return originalGetElementById.call(document, id);
    };

    window.aceEditor = aceEditor;
    window.getEditorCode = () => aceEditor.getValue();
    window.setEditorCode = (code) => aceEditor.setValue(code, -1);
}

function showAceContextMenu(event, editor) {
    const menu = document.createElement('div');
    menu.style.position = 'fixed';
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    menu.style.backgroundColor = '#2d2d30';
    menu.style.border = '1px solid #3e3e42';
    menu.style.borderRadius = '3px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    menu.style.zIndex = '10000';
    menu.style.minWidth = '200px';
    menu.style.fontFamily = "'Consolas', 'Monaco', monospace";
    menu.style.fontSize = '13px';

    const items = [
        { label: 'Cut', key: 'Ctrl+X', action: () => editor.execCommand('cut') },
        { label: 'Copy', key: 'Ctrl+C', action: () => editor.execCommand('copy') },
        { label: 'Paste', key: 'Ctrl+V', action: () => editor.execCommand('paste') },
        { sep: true },
        { label: 'Find', key: 'Ctrl+F', action: () => editor.execCommand('find') },
        { label: 'Replace', key: 'Ctrl+H', action: () => editor.execCommand('replace') },
        { sep: true },
        { label: 'Select All', key: 'Ctrl+A', action: () => editor.execCommand('selectAll') }
    ];

    items.forEach(item => {
        if (item.sep) {
            const sep = document.createElement('div');
            sep.style.height = '1px';
            sep.style.backgroundColor = '#3e3e42';
            sep.style.margin = '4px 0';
            menu.appendChild(sep);
        } else {
            const btn = document.createElement('div');
            btn.style.padding = '8px 12px';
            btn.style.color = '#d4d4d4';
            btn.style.cursor = 'pointer';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'space-between';
            btn.style.alignItems = 'center';

            const label = document.createElement('span');
            label.textContent = item.label;
            btn.appendChild(label);

            if (item.key) {
                const key = document.createElement('span');
                key.textContent = item.key;
                key.style.fontSize = '11px';
                key.style.color = '#858585';
                key.style.marginLeft = '20px';
                btn.appendChild(key);
            }

            btn.addEventListener('mouseover', () => {
                btn.style.backgroundColor = '#0e639c';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.backgroundColor = 'transparent';
            });
            btn.addEventListener('click', () => {
                item.action();
                document.body.removeChild(menu);
            });

            menu.appendChild(btn);
        }
    });

    document.body.appendChild(menu);

    // Close menu when clicking elsewhere
    const closeMenu = () => {
        if (menu.parentNode) {
            document.body.removeChild(menu);
        }
        document.removeEventListener('click', closeMenu);
    };

    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

function addGridLangCompleters() {
    if (!aceEditor) return;

    const gridLangCompleter = {
        getCompletions: (editor, session, pos, prefix, callback) => {
            const builtins = [
                { name: 'print', value: 'print', score: 100, meta: 'function' },
                { name: 'debug', value: 'debug', score: 100, meta: 'function' },
                { name: 'set_debug', value: 'set_debug', score: 100, meta: 'function' },
                { name: 'assert', value: 'assert', score: 100, meta: 'function' },
                { name: 'range', value: 'range', score: 100, meta: 'function' },
                { name: 'abs', value: 'abs', score: 100, meta: 'math' },
                { name: 'sqrt', value: 'sqrt', score: 100, meta: 'math' },
                { name: 'pow', value: 'pow', score: 100, meta: 'math' },
                { name: 'floor', value: 'floor', score: 100, meta: 'math' },
                { name: 'ceil', value: 'ceil', score: 100, meta: 'math' },
                { name: 'round', value: 'round', score: 100, meta: 'math' },
                { name: 'sin', value: 'sin', score: 100, meta: 'math' },
                { name: 'cos', value: 'cos', score: 100, meta: 'math' },
                { name: 'tan', value: 'tan', score: 100, meta: 'math' },
                { name: 'min', value: 'min', score: 100, meta: 'math' },
                { name: 'max', value: 'max', score: 100, meta: 'math' },
                { name: 'random', value: 'random', score: 100, meta: 'math' },
                { name: 'len', value: 'len', score: 100, meta: 'array' },
                { name: 'add', value: 'add', score: 100, meta: 'array' },
                { name: 'remove', value: 'remove', score: 100, meta: 'array' },
                { name: 'append', value: 'append', score: 90, meta: 'array' },
                { name: 'range', value: 'range', score: 100, meta: 'array' },
                { name: 'str', value: 'str', score: 100, meta: 'convert' },
                { name: 'int', value: 'int', score: 100, meta: 'convert' },
                { name: 'float', value: 'float', score: 100, meta: 'convert' },
                { name: 'bool', value: 'bool', score: 100, meta: 'convert' },
                { name: 'substr', value: 'substr', score: 100, meta: 'string' },
                { name: 'slice', value: 'slice', score: 100, meta: 'string' },
                { name: 'split', value: 'split', score: 100, meta: 'string' },
                { name: 'join', value: 'join', score: 100, meta: 'string' },
                { name: 'upper', value: 'upper', score: 100, meta: 'string' },
                { name: 'lower', value: 'lower', score: 100, meta: 'string' },
                { name: 'trim', value: 'trim', score: 100, meta: 'string' },
                { name: 'replace', value: 'replace', score: 100, meta: 'string' },
                { name: 'starts_with', value: 'starts_with', score: 100, meta: 'string' },
                { name: 'ends_with', value: 'ends_with', score: 100, meta: 'string' },
                { name: 'contains', value: 'contains', score: 100, meta: 'string' },
                { name: 'index_of', value: 'index_of', score: 100, meta: 'string' },
                { name: 'char_at', value: 'char_at', score: 100, meta: 'string' },
                { name: 'char_code', value: 'char_code', score: 100, meta: 'string' },
                { name: 'from_char_code', value: 'from_char_code', score: 100, meta: 'string' },
                { name: 'repeat', value: 'repeat', score: 100, meta: 'string' },
                { name: 'reverse', value: 'reverse', score: 100, meta: 'string' },
                { name: 'init_2d', value: 'init_2d', score: 100, meta: 'graphics' },
                { name: 'set_cell', value: 'set_cell', score: 100, meta: 'graphics' },
                { name: 'clear_canvas', value: 'clear_canvas', score: 100, meta: 'graphics' },
                { name: 'set_pixel', value: 'set_pixel', score: 100, meta: 'graphics' },
                { name: 'draw_line', value: 'draw_line', score: 100, meta: 'graphics' },
                { name: 'draw_circle', value: 'draw_circle', score: 100, meta: 'graphics' },
                { name: 'draw_rect', value: 'draw_rect', score: 100, meta: 'graphics' },
                { name: 'rgb', value: 'rgb', score: 100, meta: 'color' },
                { name: 'hsl', value: 'hsl', score: 100, meta: 'color' },
                { name: 'init_3d', value: 'init_3d', score: 100, meta: '3d' },
                { name: 'set_voxel', value: 'set_voxel', score: 100, meta: '3d' },
                { name: 'remove_voxel', value: 'remove_voxel', score: 100, meta: '3d' },
                { name: 'get_voxel', value: 'get_voxel', score: 100, meta: '3d' },
                { name: 'clear_3d', value: 'clear_3d', score: 100, meta: '3d' },
                { name: 'begin_3d_batch', value: 'begin_3d_batch', score: 100, meta: '3d' },
                { name: 'end_3d_batch', value: 'end_3d_batch', score: 100, meta: '3d' },
                { name: 'input_string', value: 'input_string', score: 100, meta: 'input' },
                { name: 'input_lines', value: 'input_lines', score: 100, meta: 'input' },
                { name: 'input_grid', value: 'input_grid', score: 100, meta: 'input' },
                { name: 'time', value: 'time', score: 100, meta: 'time' },
                { name: 'clock', value: 'clock', score: 100, meta: 'time' },
                { name: 'benchmark', value: 'benchmark', score: 100, meta: 'time' },
                { name: 'animate', value: 'animate', score: 100, meta: 'animation' },
                { name: 'stop_animation', value: 'stop_animation', score: 100, meta: 'animation' },
                { name: 'record_animation', value: 'record_animation', score: 100, meta: 'animation' },
                { name: 'save_animation_gif', value: 'save_animation_gif', score: 100, meta: 'animation' },
                { name: 'stop_recording', value: 'stop_recording', score: 100, meta: 'animation' },
                { name: 'clear_recording', value: 'clear_recording', score: 100, meta: 'animation' },
                { name: 'get_animation_frames', value: 'get_animation_frames', score: 100, meta: 'animation' }
            ];

            // Filter by prefix
            const completions = builtins.filter(c => c.name.startsWith(prefix));
            callback(null, completions);
        }
    };

    // Add to completers
    aceEditor.completers = [gridLangCompleter];
}

function getDefaultCode() {
    return `# Welcome to GridLang!
# Try examples from the dropdown or press F1 for help

init_2d(20, 20)

for i in range(20) {
    for j in range(20) {
        if (i + j) % 2 == 0 {
            set_cell(i, j, "#4ec9b0")
        } else {
            set_cell(i, j, "#ce9178")
        }
    }
}

print("Pattern complete!")`;
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAceEditor);
} else {
    initAceEditor();
}
