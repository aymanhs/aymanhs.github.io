// GridLang Bytecode Compiler and VM
// Compiles AST to bytecode and executes via stack-based virtual machine

// Wrap in IIFE for browser to avoid global scope pollution
(function() {

// Import Regex class based on environment
var Regex;
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    try {
        const gridlang = require('./gridlang.js');
        Regex = gridlang.Regex;
    } catch (e) {
        // Regex not available
    }
} else {
    // Browser environment - use global
    Regex = window.Regex;
}

// ============= OPCODES =============
const OpCode = {
    // Literals and constants
    LOAD_CONST: 0,      // Push constant from constant pool
    LOAD_NULL: 1,
    LOAD_TRUE: 2,
    LOAD_FALSE: 3,
    LOAD_UNDEFINED: 4,
    
    // Variables
    LOAD_VAR: 10,       // Load variable by name
    STORE_VAR: 11,      // Store variable by name
    LOAD_FAST: 12,      // Load local variable by index (optimization)
    STORE_FAST: 13,     // Store local variable by index
    
    // Stack operations
    POP: 20,
    DUP: 21,            // Duplicate top of stack
    
    // Arithmetic
    ADD: 30,
    SUB: 31,
    MUL: 32,
    DIV: 33,
    MOD: 34,
    POW: 35,
    NEG: 36,            // Unary negation
    
    // Comparison
    EQ: 40,
    NEQ: 41,
    LT: 42,
    LTE: 43,
    GT: 44,
    GTE: 45,
    IN: 46,
    
    // Logical
    NOT: 50,
    AND: 51,            // Short-circuit AND
    OR: 52,             // Short-circuit OR
    
    // Jumps
    JUMP: 60,           // Unconditional jump
    JUMP_IF_FALSE: 61,  // Jump if TOS is falsy
    JUMP_IF_TRUE: 62,   // Jump if TOS is truthy
    
    // Loops
    SETUP_LOOP: 70,     // Set up loop context
    POP_LOOP: 71,       // Pop loop context
    BREAK: 72,
    CONTINUE: 73,
    
    // Functions
    MAKE_FUNCTION: 80,  // Create function object
    CALL: 81,           // Call function
    RETURN: 82,
    
    // Collections
    BUILD_ARRAY: 90,    // Build array from N stack items
    BUILD_MAP: 91,      // Build map from N*2 stack items
    INDEX: 92,          // Array/Map/String indexing
    STORE_INDEX: 93,    // Array/Map index assignment
    GET_MEMBER: 94,     // Get object member (obj.prop)
    STORE_MEMBER: 95,   // Set object member (obj.prop = val)
    
    // Iteration
    GET_ITER: 100,      // Get iterator for object
    FOR_ITER: 101,      // Iterator step (pop iterator, push next value, or jump)
    
    // Special
    PRINT: 110,         // Built-in print (optimization)
    SWAP: 111,          // Swap top two stack values
    HALT: 255           // End of program
};

// Reverse lookup for debugging
const OpName = {};
for (const [name, code] of Object.entries(OpCode)) {
    OpName[code] = name;
}

// ============= BYTECODE CHUNK =============
class BytecodeChunk {
    constructor(name = '<main>') {
        this.name = name;
        this.code = [];           // Bytecode instructions
        this.constants = [];      // Constant pool
        this.lines = [];          // Line numbers for each instruction
        this.names = [];          // Variable/function names
    }
    
    write(opcode, line = 0) {
        this.code.push(opcode);
        this.lines.push(line);
        return this.code.length - 1;
    }
    
    writeShort(value) {
        // Write 16-bit value as two bytes (big-endian)
        this.code.push((value >> 8) & 0xFF);
        this.code.push(value & 0xFF);
    }
    
    addConstant(value) {
        // Check if constant already exists
        const idx = this.constants.findIndex(c => c === value);
        if (idx !== -1) return idx;
        
        this.constants.push(value);
        return this.constants.length - 1;
    }
    
    addName(name) {
        const idx = this.names.indexOf(name);
        if (idx !== -1) return idx;
        
        this.names.push(name);
        return this.names.length - 1;
    }
    
    disassemble() {
        console.log(`=== ${this.name} ===`);
        let offset = 0;
        while (offset < this.code.length) {
            offset = this.disassembleInstruction(offset);
        }
    }
    
    disassembleInstruction(offset) {
        const line = this.lines[offset];
        const opcode = this.code[offset];
        const opname = OpName[opcode] || `UNKNOWN(${opcode})`;
        
        let output = `${String(offset).padStart(4, '0')} [${String(line).padStart(3, ' ')}] ${opname.padEnd(16, ' ')}`;
        
        // Instructions with operands
        switch (opcode) {
            case OpCode.LOAD_CONST:
            case OpCode.LOAD_VAR:
            case OpCode.STORE_VAR:
            case OpCode.LOAD_FAST:
            case OpCode.STORE_FAST:
            case OpCode.BUILD_ARRAY:
            case OpCode.BUILD_MAP:
            case OpCode.CALL: {
                const operand = this.code[offset + 1];
                if (opcode === OpCode.LOAD_CONST) {
                    output += ` ${operand} (${JSON.stringify(this.constants[operand])})`;
                } else if (opcode === OpCode.LOAD_VAR || opcode === OpCode.STORE_VAR) {
                    output += ` ${operand} (${this.names[operand]})`;
                } else {
                    output += ` ${operand}`;
                }
                console.log(output);
                return offset + 2;
            }
            
            case OpCode.JUMP:
            case OpCode.JUMP_IF_FALSE:
            case OpCode.JUMP_IF_TRUE:
            case OpCode.FOR_ITER: {
                const target = (this.code[offset + 1] << 8) | this.code[offset + 2];
                output += ` -> ${target}`;
                console.log(output);
                return offset + 3;
            }
            
            default:
                console.log(output);
                return offset + 1;
        }
    }
}

// ============= COMPILER =============
class Compiler {
    constructor() {
        this.chunk = new BytecodeChunk();
        this.loopStack = [];  // Track loop contexts for break/continue
        this.localScopes = [new Map()];  // Track local variables
    }
    
    compile(ast) {
        this.compileNode(ast);
        this.chunk.write(OpCode.HALT);
        return this.chunk;
    }
    
    compileNode(node) {
        if (!node) return;
        
        const line = node.line || 0;
        
        switch (node.type) {
            case 'Program':
                for (let i = 0; i < node.body.length; i++) {
                    const stmt = node.body[i];
                    this.compileNode(stmt);
                    // Pop expression results except for the last one
                    if (this.isExpression(stmt) && i < node.body.length - 1) {
                        this.chunk.write(OpCode.POP, line);
                    }
                }
                break;
                
            case 'ExprStmt':
            case 'ExpressionStatement':
                this.compileNode(node.expression);
                break;
                
            case 'Block':
                this.enterScope();
                for (const stmt of node.body) {
                    this.compileNode(stmt);
                    if (this.isExpression(stmt)) {
                        this.chunk.write(OpCode.POP, line);
                    }
                }
                this.exitScope();
                break;
                
            case 'Number':
                this.emitConstant(node.value, line);
                break;
                
            case 'String':
                this.emitConstant(node.value, line);
                break;
                
            case 'Boolean':
                this.chunk.write(node.value ? OpCode.LOAD_TRUE : OpCode.LOAD_FALSE, line);
                break;
                
            case 'Null':
                this.chunk.write(OpCode.LOAD_NULL, line);
                break;
                
            case 'Undefined':
                this.chunk.write(OpCode.LOAD_UNDEFINED, line);
                break;
                
            case 'Identifier':
                this.emitLoadVar(node.name, line);
                break;
                
            case 'var':
                // Variable reference with path (used in f-strings and elsewhere)
                // path is an array like ["name"] or ["person", "name"]
                if (node.path.length === 1) {
                    this.emitLoadVar(node.path[0], line);
                } else {
                    // Multi-level access: person.name.first
                    this.emitLoadVar(node.path[0], line);
                    for (let i = 1; i < node.path.length; i++) {
                        const memberIdx = this.chunk.addName(node.path[i]);
                        this.chunk.write(OpCode.GET_MEMBER, line);
                        this.chunk.write(memberIdx, line);
                    }
                }
                break;
                
            case 'Assignment':
                this.compileNode(node.value);
                this.chunk.write(OpCode.DUP, line);  // Keep value on stack
                this.emitStoreVar(node.target, line);  // target is string
                break;
                
            case 'BinaryOp':
                this.compileBinaryOp(node, line);
                break;
                
            case 'UnaryOp':
                this.compileNode(node.operand);
                if (node.op === '-') {
                    this.chunk.write(OpCode.NEG, line);
                } else if (node.op === 'not') {
                    this.chunk.write(OpCode.NOT, line);
                }
                break;
                
            case 'If':
            case 'IfStatement':
                this.compileIfStatement(node, line);
                break;
                
            case 'While':
            case 'WhileLoop':
                this.compileWhileLoop(node, line);
                break;
                
            case 'For':
            case 'ForLoop':
                this.compileForLoop(node, line);
                break;
                
            case 'FunctionDeclaration':
                this.compileFunctionDeclaration(node, line);
                break;
                
            case 'Call':
                this.compileCall(node, line);
                break;
                
            case 'Return':
                if (node.value) {
                    this.compileNode(node.value);
                } else {
                    this.chunk.write(OpCode.LOAD_NULL, line);
                }
                this.chunk.write(OpCode.RETURN, line);
                break;
                
            case 'Break':
                if (this.loopStack.length === 0) {
                    throw new Error('break outside of loop');
                }
                const breakJump = this.emitJump(OpCode.JUMP, line);
                this.loopStack[this.loopStack.length - 1].breaks.push(breakJump);
                break;
                
            case 'Continue':
                if (this.loopStack.length === 0) {
                    throw new Error('continue outside of loop');
                }
                const continueJump = this.emitJump(OpCode.JUMP, line);
                this.loopStack[this.loopStack.length - 1].continues.push(continueJump);
                break;
                
            case 'Array':
                for (const el of node.elements) {
                    this.compileNode(el);
                }
                this.chunk.write(OpCode.BUILD_ARRAY, line);
                this.chunk.write(node.elements.length, line);
                break;
                
            case 'Index':
                this.compileNode(node.object);
                this.compileNode(node.index);
                this.chunk.write(OpCode.INDEX, line);
                break;
                
            case 'IndexAssignment':
                this.compileNode(node.object);
                this.compileNode(node.index);
                this.compileNode(node.value);
                this.chunk.write(OpCode.STORE_INDEX, line);
                break;
                
            case 'Map':
                for (const entry of node.entries) {
                    this.emitConstant(entry.key, line);
                    this.compileNode(entry.value);
                }
                this.chunk.write(OpCode.BUILD_MAP, line);
                this.chunk.write(node.entries.length, line);
                break;
                
            case 'ConditionalExpression':
                this.compileNode(node.condition);
                const elseJump = this.emitJump(OpCode.JUMP_IF_FALSE, line);
                this.compileNode(node.consequent);
                const endJump = this.emitJump(OpCode.JUMP, line);
                this.patchJump(elseJump);
                this.compileNode(node.alternate);
                this.patchJump(endJump);
                break;
                
            case 'MemberAccess':
                // obj.member or obj.property
                this.compileNode(node.object);
                const memberName = node.member || node.property;
                const memberIdx = this.chunk.addName(memberName);
                this.chunk.write(OpCode.GET_MEMBER, line);
                this.chunk.write(memberIdx, line);
                break;
                
            case 'MemberAssignment':
                // obj.member = value
                this.compileNode(node.value);
                this.chunk.write(OpCode.DUP, line);
                this.compileNode(node.object);
                const assignMemberName = node.member || node.property;
                const assignMemberIdx = this.chunk.addName(assignMemberName);
                this.chunk.write(OpCode.STORE_MEMBER, line);
                this.chunk.write(assignMemberIdx, line);
                break;
                
            case 'FString':
                // Compile f-string parts into concatenation
                this.compileFString(node, line);
                break;
                
            case 'FuncDef':
            case 'FuncExpr':
                this.compileFunctionDef(node, line);
                break;
                
            case 'RegexLiteral':
                // Create actual Regex instance so methods work
                const regex = new Regex(node.pattern);
                this.emitConstant(regex, line);
                break;
                
            case 'Ternary':
                this.compileTernary(node, line);
                break;
                
            case 'Elvis':
                this.compileElvis(node, line);
                break;
                
            case 'MultiAssignment':
                this.compileMultiAssignment(node, line);
                break;
                
            default:
                throw new Error(`Compiler: Unknown node type: ${node.type}`);
        }
    }
    
    compileBinaryOp(node, line) {
        // Short-circuit for 'and' and 'or'
        if (node.op === 'and') {
            this.compileNode(node.left);
            this.chunk.write(OpCode.DUP, line);
            const endJump = this.emitJump(OpCode.JUMP_IF_FALSE, line);
            this.chunk.write(OpCode.POP, line);
            this.compileNode(node.right);
            this.patchJump(endJump);
            return;
        }
        
        if (node.op === 'or') {
            this.compileNode(node.left);
            this.chunk.write(OpCode.DUP, line);
            const endJump = this.emitJump(OpCode.JUMP_IF_TRUE, line);
            this.chunk.write(OpCode.POP, line);
            this.compileNode(node.right);
            this.patchJump(endJump);
            return;
        }
        
        // Regular binary ops
        this.compileNode(node.left);
        this.compileNode(node.right);
        
        const opMap = {
            '+': OpCode.ADD,
            '-': OpCode.SUB,
            '*': OpCode.MUL,
            '/': OpCode.DIV,
            '%': OpCode.MOD,
            '**': OpCode.POW,
            '==': OpCode.EQ,
            '!=': OpCode.NEQ,
            '<': OpCode.LT,
            '<=': OpCode.LTE,
            '>': OpCode.GT,
            '>=': OpCode.GTE,
            'in': OpCode.IN
        };
        
        const opcode = opMap[node.op];
        if (opcode === undefined) {
            throw new Error(`Unknown operator: ${node.op}`);
        }
        
        this.chunk.write(opcode, line);
    }
    
    compileIfStatement(node, line) {
        this.compileNode(node.condition);
        const elseJump = this.emitJump(OpCode.JUMP_IF_FALSE, line);
        
        this.compileNode(node.consequent);
        
        if (node.alternate) {
            const endJump = this.emitJump(OpCode.JUMP, line);
            this.patchJump(elseJump);
            this.compileNode(node.alternate);
            this.patchJump(endJump);
        } else {
            this.patchJump(elseJump);
        }
    }
    
    compileWhileLoop(node, line) {
        const loopStart = this.chunk.code.length;
        
        this.compileNode(node.condition);
        const exitJump = this.emitJump(OpCode.JUMP_IF_FALSE, line);
        
        this.loopStack.push({ start: loopStart, breaks: [], continues: [] });
        this.compileNode(node.body);
        const loopCtx = this.loopStack.pop();
        
        this.emitLoop(loopStart, line);
        this.patchJump(exitJump);
        
        // Patch break/continue jumps
        for (const breakAddr of loopCtx.breaks) {
            this.patchJumpAt(breakAddr, this.chunk.code.length);
        }
        for (const continueAddr of loopCtx.continues) {
            this.patchJumpAt(continueAddr, loopStart);
        }
    }
    
    compileForLoop(node, line) {
        this.enterScope();
        
        // Compile iterable
        this.compileNode(node.iterable);
        this.chunk.write(OpCode.GET_ITER, line);
        
        const loopStart = this.chunk.code.length;
        const exitJump = this.emitJump(OpCode.FOR_ITER, line);
        
        // Emit a flag byte: 0 for single-variable, 1 for two-variable
        const isTwoVar = node.valueVariable ? 1 : 0;
        this.chunk.write(isTwoVar, line);
        
        // FOR_ITER will push appropriate values based on the flag
        if (node.valueVariable) {
            // Two-variable: FOR_ITER pushes [first, second]
            this.emitStoreVar(node.valueVariable, line); // Store second (top of stack)
            this.emitStoreVar(node.variable, line); // Store first
        } else {
            // Single variable: FOR_ITER pushes only one value
            this.emitStoreVar(node.variable, line); // Store the value
        }
        
        this.loopStack.push({ start: loopStart, breaks: [], continues: [] });
        this.compileNode(node.body);
        const loopCtx = this.loopStack.pop();
        
        this.emitLoop(loopStart, line);
        this.patchJump(exitJump);
        
        // Breaks should jump to the POP, to clean up the iterator before continuing
        const breakTarget = this.chunk.code.length;
        
        // Clean up iterator
        this.chunk.write(OpCode.POP, line);
        
        // Patch break/continue
        for (const breakAddr of loopCtx.breaks) {
            this.patchJumpAt(breakAddr, breakTarget);
        }
        for (const continueAddr of loopCtx.continues) {
            this.patchJumpAt(continueAddr, loopStart);
        }
        
        this.exitScope();
    }
    
    compileFunctionDeclaration(node, line) {
        // Create a new compiler for the function body
        const funcCompiler = new Compiler();
        funcCompiler.chunk.name = node.name;
        
        // Compile function body
        funcCompiler.enterScope();
        for (const param of node.params) {
            funcCompiler.addLocal(param);
        }
        funcCompiler.compileNode(node.body);
        funcCompiler.chunk.write(OpCode.LOAD_NULL, line);
        funcCompiler.chunk.write(OpCode.RETURN, line);
        
        // Add function chunk as constant
        const funcIdx = this.chunk.addConstant(funcCompiler.chunk);
        this.chunk.write(OpCode.LOAD_CONST, line);
        this.chunk.write(funcIdx, line);
        
        // Create function object with params
        this.chunk.write(OpCode.MAKE_FUNCTION, line);
        this.chunk.write(node.params.length, line);
        
        // Store function
        this.emitStoreVar(node.name, line);
    }
    
    compileCall(node, line) {
        // Compile function
        this.compileNode(node.func);
        
        // Compile arguments
        for (const arg of node.args) {
            this.compileNode(arg);
        }
        
        this.chunk.write(OpCode.CALL, line);
        this.chunk.write(node.args.length, line);
    }
    
    emitConstant(value, line) {
        const idx = this.chunk.addConstant(value);
        this.chunk.write(OpCode.LOAD_CONST, line);
        this.chunk.write(idx, line);
    }
    
    emitLoadVar(name, line) {
        const idx = this.chunk.addName(name);
        this.chunk.write(OpCode.LOAD_VAR, line);
        this.chunk.write(idx, line);
    }
    
    emitStoreVar(name, line) {
        const idx = this.chunk.addName(name);
        this.chunk.write(OpCode.STORE_VAR, line);
        this.chunk.write(idx, line);
    }
    
    emitJump(opcode, line) {
        this.chunk.write(opcode, line);
        this.chunk.writeShort(0xFFFF);  // Placeholder
        return this.chunk.code.length - 2;
    }
    
    emitLoop(loopStart, line) {
        this.chunk.write(OpCode.JUMP, line);
        // Use absolute addressing to match patchJumpAt
        this.chunk.writeShort(loopStart);
    }
    
    patchJump(offset) {
        // Use absolute addressing to match patchJumpAt
        const target = this.chunk.code.length;
        this.chunk.code[offset] = (target >> 8) & 0xFF;
        this.chunk.code[offset + 1] = target & 0xFF;
    }
    
    patchJumpAt(offset, target) {
        this.chunk.code[offset] = (target >> 8) & 0xFF;
        this.chunk.code[offset + 1] = target & 0xFF;
    }
    
    isExpression(node) {
        return node.type === 'ExprStmt' ||
               node.type === 'ExpressionStatement' || 
               node.type === 'Call' ||
               node.type === 'BinaryOp' ||
               node.type === 'UnaryOp';
    }
    
    enterScope() {
        this.localScopes.push(new Map());
    }
    
    exitScope() {
        this.localScopes.pop();
    }
    
    addLocal(name) {
        const scope = this.localScopes[this.localScopes.length - 1];
        scope.set(name, scope.size);
    }
    
    compileFString(node, line) {
        // F-strings are compiled as string concatenation
        // f"Hello {name}!" becomes "Hello " + str(name) + "!"
        if (node.parts.length === 0) {
            this.emitConstant('', line);
            return;
        }
        
        // Compile first part
        const firstPart = node.parts[0];
        if (firstPart.type === 'string') {
            this.emitConstant(firstPart.value, line);
        } else {
            // Expression - convert to string
            // Stack order: function, then args
            this.emitLoadVar('str', line);  // Load function first
            this.compileNode(firstPart);     // Then the argument
            this.chunk.write(OpCode.CALL, line);
            this.chunk.write(1, line); // 1 argument
        }
        
        // Compile remaining parts and concatenate
        for (let i = 1; i < node.parts.length; i++) {
            const part = node.parts[i];
            if (part.type === 'string') {
                this.emitConstant(part.value, line);
            } else {
                // Expression - convert to string
                this.emitLoadVar('str', line);  // Load function first
                this.compileNode(part);          // Then the argument
                this.chunk.write(OpCode.CALL, line);
                this.chunk.write(1, line); // 1 argument
            }
            // Add to accumulated string
            this.chunk.write(OpCode.ADD, line);
        }
    }
    
    compileFunctionDef(node, line) {
        // Compile function body to a separate chunk
        const funcName = node.name || '<anonymous>';
        const funcChunk = new BytecodeChunk(funcName);
        
        // Save current chunk and switch to function chunk
        const savedChunk = this.chunk;
        this.chunk = funcChunk;
        
        // Add parameter names to the function's name table
        for (const param of node.params || []) {
            this.chunk.addName(param);
        }
        
        // Compile function body
        if (node.body) {
            this.compileNode(node.body);
        }
        
        // Ensure function returns (push null if no explicit return)
        this.chunk.write(OpCode.LOAD_NULL, line);
        this.chunk.write(OpCode.RETURN, line);
        
        // Restore original chunk
        this.chunk = savedChunk;
        
        // Create function object as a constant
        const funcData = {
            type: 'function',
            name: funcName,
            chunk: funcChunk,
            paramCount: (node.params || []).length,
            closure: null  // Will be set at runtime
        };
        this.emitConstant(funcData, line);
        
        if (node.name) {
            // Store in variable if it has a name
            this.chunk.write(OpCode.DUP, line);
            this.emitStoreVar(node.name, line);
        }
    }
    
    compileTernary(node, line) {
        // condition ? consequent : alternate
        this.compileNode(node.condition);
        const elseJump = this.emitJump(OpCode.JUMP_IF_FALSE, line);
        
        this.compileNode(node.consequent);
        const endJump = this.emitJump(OpCode.JUMP, line);
        
        this.patchJump(elseJump);
        this.compileNode(node.alternate);
        
        this.patchJump(endJump);
    }
    
    compileElvis(node, line) {
        // a ?: b - use a if truthy, else b
        this.compileNode(node.left);
        this.chunk.write(OpCode.DUP, line); // Keep value for testing
        
        const elseJump = this.emitJump(OpCode.JUMP_IF_FALSE, line);
        // If truthy, we already have the value on stack
        const endJump = this.emitJump(OpCode.JUMP, line);
        
        this.patchJump(elseJump);
        this.chunk.write(OpCode.POP, line); // Pop the falsy value
        this.compileNode(node.right);
        
        this.patchJump(endJump);
    }
    
    compileMultiAssignment(node, line) {
        // a, b = [1, 2] - destructuring
        this.compileNode(node.value);
        
        // For each target, extract from array
        for (let i = 0; i < node.targets.length; i++) {
            this.chunk.write(OpCode.DUP, line); // Keep array on stack
            this.emitConstant(i, line); // Index
            this.chunk.write(OpCode.INDEX, line); // Get element
            this.emitStoreVar(node.targets[i], line); // Store (pops the value)
        }
        
        // Leave the array on stack (like regular assignment leaves value on stack)
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Compiler, BytecodeChunk, OpCode, OpName };
} else if (typeof window !== 'undefined') {
    // Browser: expose globally
    window.Compiler = Compiler;
    window.BytecodeChunk = BytecodeChunk;
    window.OpCode = OpCode;
    window.OpName = OpName;
}

})();
