// GridLang CLI - Standalone Node.js interpreter
// Usage: node gridlang-cli.js <script.grid> [input.txt]

const fs = require('fs');
const readline = require('readline');

// Load GridLang components
const lexerModule = require('./lexer.js');
const parserModule = require('./parser.js');
const gridlangModule = require('./gridlang.js');

const Lexer = lexerModule.Lexer;
const Parser = parserModule.Parser;
const Interpreter = gridlangModule.Interpreter;

class GridLangCLI {
    constructor() {
        this.inputLines = [];
        this.inputIndex = 0;
        this.inputFile = null;
    }

    async run(scriptPath, inputPath = null) {
        // Read script
        if (!fs.existsSync(scriptPath)) {
            console.error(`Error: Script file not found: ${scriptPath}`);
            process.exit(1);
        }
        const code = fs.readFileSync(scriptPath, 'utf8');

        // Load input if provided
        if (inputPath) {
            if (!fs.existsSync(inputPath)) {
                console.error(`Error: Input file not found: ${inputPath}`);
                process.exit(1);
            }
            this.inputLines = fs.readFileSync(inputPath, 'utf8').split('\n');
        }

        // Create interpreter with CLI overrides
        // Mock minimal canvas/console for Node.js environment
        const mockConsole = {
            innerHTML: '',
            scrollTop: 0,
            scrollHeight: 0
        };
        const interpreter = new Interpreter(null, null, mockConsole, null, '', null, {});
        this.setupCLIEnvironment(interpreter);

        try {
            // Parse and execute
            const lexer = new Lexer(code);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            const ast = parser.parse();

            if (parser.errors && parser.errors.length > 0) {
                parser.errors.forEach(err => console.error(err));
                process.exit(1);
            }

            await interpreter.run(ast);
            
        } catch (error) {
            console.error('Error details:', error);
            if (error.format) {
                console.error(error.format());
            } else {
                console.error(error.message || error);
                if (error.stack) {
                    console.error(error.stack);
                }
            }
            process.exit(1);
        }
    }

    setupCLIEnvironment(interpreter) {
        // Override print to use stdout
        interpreter.globalEnv.set('print', (...args) => {
            const msg = args.map(a => interpreter.toString(a)).join(' ');
            console.log(msg);
        });

        // Override debug to use stderr
        interpreter.globalEnv.set('debug', (...args) => {
            if (interpreter.debugEnabled) {
                const msg = args.map(a => interpreter.toString(a)).join(' ');
                console.error(`[DEBUG] ${msg}`);
            }
        });

        // Override input to read from stdin or file
        interpreter.globalEnv.set('input', (prompt = '') => {
            if (prompt) {
                process.stdout.write(prompt);
            }

            // Read from file if available
            if (this.inputLines.length > 0 && this.inputIndex < this.inputLines.length) {
                const line = this.inputLines[this.inputIndex++];
                console.log(line); // Echo the input
                return line;
            }

            // Fall back to stdin (synchronous read)
            const buffer = Buffer.alloc(1024);
            const bytesRead = fs.readSync(process.stdin.fd, buffer, 0, 1024, null);
            if (bytesRead === 0) return '';
            
            const line = buffer.toString('utf8', 0, bytesRead).trim();
            return line;
        });

        // Add file I/O functions (CLI-only)
        interpreter.globalEnv.set('read_file', (filename) => {
            try {
                return fs.readFileSync(filename, 'utf8');
            } catch (error) {
                throw new Error(`Failed to read file: ${filename} - ${error.message}`);
            }
        });

        interpreter.globalEnv.set('write_file', (filename, content) => {
            try {
                fs.writeFileSync(filename, content, 'utf8');
                return true;
            } catch (error) {
                throw new Error(`Failed to write file: ${filename} - ${error.message}`);
            }
        });

        interpreter.globalEnv.set('file_exists', (filename) => {
            return fs.existsSync(filename);
        });

        // Disable/stub canvas-dependent functions
        const canvasFunctions = [
            'clear', 'color', 'rect', 'circle', 'line', 'text',
            'width', 'height', 'mouse_x', 'mouse_y', 'mouse_clicked',
            'key_pressed', 'animate', 'stop_animation', 'record_start',
            'record_stop', 'record_download'
        ];

        canvasFunctions.forEach(name => {
            interpreter.globalEnv.set(name, (...args) => {
                console.error(`Warning: ${name}() is not available in CLI mode (requires browser)`);
                return null;
            });
        });

        // Grid drawing methods won't work, but Grid data structure still works
        // We'll leave it as-is since the Grid object can still be useful for data
    }
}

// Main entry point
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('GridLang CLI - Standalone interpreter');
        console.log('');
        console.log('Usage:');
        console.log('  node gridlang-cli.js <script.grid>');
        console.log('  node gridlang-cli.js <script.grid> <input.txt>');
        console.log('');
        console.log('Examples:');
        console.log('  node gridlang-cli.js hello.grid');
        console.log('  node gridlang-cli.js solver.grid day1.txt');
        console.log('  echo "5" | node gridlang-cli.js script.grid');
        process.exit(0);
    }

    const scriptPath = args[0];
    const inputPath = args[1] || null;

    const cli = new GridLangCLI();
    cli.run(scriptPath, inputPath).catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { GridLangCLI };
