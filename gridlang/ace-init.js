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
            mode: 'ace/mode/python',
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
    document.getElementById = function(id) {
        if (id === 'editor') {
            return proxy;
        }
        return originalGetElementById.call(document, id);
    };

    window.aceEditor = aceEditor;
    window.getEditorCode = () => aceEditor.getValue();
    window.setEditorCode = (code) => aceEditor.setValue(code, -1);
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
