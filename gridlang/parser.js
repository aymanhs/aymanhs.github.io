// GridLang Parser - AST Generation

// Import TokenType when running in Node.js
if (typeof TokenType === 'undefined' && typeof require !== 'undefined') {
    const { TokenType: TT } = require('./lexer.js');
    global.TokenType = TT;
}

// Define GridLangError if not available
if (typeof window !== 'undefined' && typeof window.GridLangError === 'undefined') {
    // Browser context
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
    window.GridLangError = GridLangError;
} else if (typeof global !== 'undefined' && typeof global.GridLangError === 'undefined') {
    // Node.js context  
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
    global.GridLangError = GridLangError;
}

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.length = tokens.length;
        this.pos = 0;
    }

    current() {
        return this.tokens[this.pos];
    }

    peek(offset = 1) {
        const p = this.pos + offset;
        return p < this.length ? this.tokens[p] : this.tokens[this.length - 1];
    }

    advance() {
        if (this.pos < this.length - 1) {
            this.pos++;
        }
    }
    
    loc() {
        const token = this.current();
        return { line: token.line, col: token.col };
    }

    expect(type) {
        const token = this.current();
        if (token.type !== type) {
            throw new GridLangError(`Expected ${type} but got ${token.type}`, token.line, token.col, 'SyntaxError');
        }
        this.advance();
        return token;
    }

    match(...types) {
        const currentType = this.tokens[this.pos].type;
        for (let i = 0; i < types.length; i++) {
            if (currentType === types[i]) return true;
        }
        return false;
    }

    parse() {
        const statements = [];
        
        while (this.current().type !== TokenType.EOF) {
            statements.push(this.statement());
        }
        
        return { type: 'Program', body: statements };
    }

    statement() {
        if (this.match(TokenType.IF)) {
            return this.ifStatement();
        } else if (this.match(TokenType.FOR)) {
            return this.forStatement();
        } else if (this.match(TokenType.WHILE)) {
            return this.whileStatement();
        } else if (this.match(TokenType.FUNC)) {
            return this.funcStatement();
        } else if (this.match(TokenType.RETURN)) {
            return this.returnStatement();
        } else if (this.match(TokenType.BREAK)) {
            return this.breakStatement();
        } else if (this.match(TokenType.CONTINUE)) {
            return this.continueStatement();
        } else if (this.match(TokenType.LBRACE)) {
            return this.blockStatement();
        } else {
            return this.expressionStatement();
        }
    }

    blockStatement() {
        this.expect(TokenType.LBRACE);
        const statements = [];
        
        while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
            statements.push(this.statement());
        }
        
        this.expect(TokenType.RBRACE);
        return { type: 'Block', body: statements, ...this.loc() };
    }

    ifStatement() {
        this.expect(TokenType.IF);
        return this.parseIfChain();
    }

    parseIfChain() {
        const loc = this.loc();
        const condition = this.expression();
        const consequent = this.statement();
        let alternate = null;
        
        if (this.match(TokenType.ELSIF, TokenType.ELIF)) {
            this.advance();
            // Parse remaining elsif/elif chain recursively
            alternate = this.parseIfChain();
        } else if (this.match(TokenType.ELSE)) {
            this.advance();
            alternate = this.statement();
        }
        
        return { type: 'If', condition, consequent, alternate, ...loc };
    }

    forStatement() {
        const loc = this.loc();
        this.expect(TokenType.FOR);
        const ident = this.expect(TokenType.IDENT).value;
        
        // Check for second variable: for i, v in array or for k, v in map
        let secondIdent = null;
        if (this.match(TokenType.COMMA)) {
            this.advance();
            secondIdent = this.expect(TokenType.IDENT).value;
        }
        
        this.expect(TokenType.IN);
        const iterable = this.expression();
        const body = this.statement();
        
        return { type: 'For', variable: ident, valueVariable: secondIdent, iterable, body, ...loc };
    }

    whileStatement() {
        const loc = this.loc();
        this.expect(TokenType.WHILE);
        const condition = this.expression();
        const body = this.statement();
        
        return { type: 'While', condition, body, ...loc };
    }

    funcStatement() {
        const loc = this.loc();
        this.expect(TokenType.FUNC);
        const name = this.expect(TokenType.IDENT).value;
        this.expect(TokenType.LPAREN);
        
        const params = [];
        while (!this.match(TokenType.RPAREN)) {
            params.push(this.expect(TokenType.IDENT).value);
            if (this.match(TokenType.COMMA)) {
                this.advance();
            }
        }
        
        this.expect(TokenType.RPAREN);
        const body = this.statement();
        
        return { type: 'FuncDef', name, params, body, ...loc };
    }

    returnStatement() {
        const loc = this.loc();
        this.expect(TokenType.RETURN);
        const value = this.match(TokenType.RBRACE, TokenType.EOF) ? null : this.expression();
        return { type: 'Return', value, ...loc };
    }

    breakStatement() {
        const loc = this.loc();
        this.expect(TokenType.BREAK);
        return { type: 'Break', ...loc };
    }

    continueStatement() {
        const loc = this.loc();
        this.expect(TokenType.CONTINUE);
        return { type: 'Continue', ...loc };
    }

    funcExpression() {
        const loc = this.loc();
        this.expect(TokenType.FUNC);
        this.expect(TokenType.LPAREN);
        
        const params = [];
        while (!this.match(TokenType.RPAREN)) {
            params.push(this.expect(TokenType.IDENT).value);
            if (this.match(TokenType.COMMA)) {
                this.advance();
            }
        }
        
        this.expect(TokenType.RPAREN);
        const body = this.statement();
        
        return { type: 'FuncExpr', params, body, ...loc };
    }

    expressionStatement() {
        const loc = this.loc();
        const expr = this.expression();
        return { type: 'ExprStmt', expression: expr, ...loc };
    }

    expression() {
        return this.assignment();
    }

    assignment() {
        const expr = this.ternary();
        
        // Check for multiple assignment: a, b, c = [1, 2, 3]
        // Only if we see identifier followed by comma AND eventually an =
        if (expr.type === 'Identifier' && this.match(TokenType.COMMA)) {
            // Lookahead to see if this is actually multiple assignment
            // We need to see: ident, ident, ... = value
            const savedPos = this.pos;
            let isMultiAssign = false;
            
            try {
                // Try to parse identifiers separated by commas
                while (this.match(TokenType.COMMA)) {
                    this.advance();
                    if (!this.match(TokenType.IDENT)) {
                        break;
                    }
                    this.advance();
                }
                // Check if we hit an =
                if (this.match(TokenType.ASSIGN)) {
                    isMultiAssign = true;
                }
            } catch (e) {
                // Parsing failed, not a multi-assignment
            }
            
            // Reset position
            this.pos = savedPos;
            
            if (isMultiAssign) {
                const targets = [expr.name];
                const loc = this.loc();
                
                // Collect all target identifiers
                while (this.match(TokenType.COMMA)) {
                    this.advance();
                    if (!this.match(TokenType.IDENT)) {
                        throw new GridLangError('Expected identifier in multiple assignment', loc.line, loc.col, 'SyntaxError');
                    }
                    targets.push(this.current().value);
                    this.advance();
                }
                
                // Expect =
                if (!this.match(TokenType.ASSIGN)) {
                    throw new GridLangError('Expected = in multiple assignment', loc.line, loc.col, 'SyntaxError');
                }
                this.advance();
                
                const value = this.assignment();
                return { type: 'MultiAssignment', targets, value, ...loc };
            }
        }
        
        // Check for compound assignment operators
        const compoundOps = {
            [TokenType.PLUS_ASSIGN]: '+',
            [TokenType.MINUS_ASSIGN]: '-',
            [TokenType.STAR_ASSIGN]: '*',
            [TokenType.SLASH_ASSIGN]: '/',
            [TokenType.PERCENT_ASSIGN]: '%'
        };
        
        for (const [tokenType, op] of Object.entries(compoundOps)) {
            if (this.match(tokenType)) {
                const loc = this.loc();
                this.advance();
                const rightValue = this.assignment();
                
                // Convert x += y to x = x + y
                const binaryOp = { type: 'BinaryOp', left: expr, op, right: rightValue, ...loc };
                
                if (expr.type === 'Identifier') {
                    return { type: 'Assignment', target: expr.name, value: binaryOp, ...loc };
                } else if (expr.type === 'Index') {
                    return { type: 'IndexAssignment', object: expr.object, index: expr.index, value: binaryOp, ...loc };
                } else if (expr.type === 'MemberAccess') {
                    return { type: 'MemberAssignment', object: expr.object, property: expr.property, value: binaryOp, ...loc };
                }
                
                throw new GridLangError('Invalid assignment target', loc.line, loc.col, 'SyntaxError');
            }
        }
        
        if (this.match(TokenType.ASSIGN)) {
            const loc = this.loc();
            this.advance();
            const value = this.assignment();
            
            if (expr.type === 'Identifier') {
                return { type: 'Assignment', target: expr.name, value, ...loc };
            } else if (expr.type === 'Index') {
                return { type: 'IndexAssignment', object: expr.object, index: expr.index, value, ...loc };
            } else if (expr.type === 'MemberAccess') {
                return { type: 'MemberAssignment', object: expr.object, property: expr.property, value, ...loc };
            }
            
            throw new GridLangError('Invalid assignment target', loc.line, loc.col, 'SyntaxError');
        }
        
        return expr;
    }

    ternary() {
        let expr = this.elvis();
        
        if (this.match(TokenType.QUESTION)) {
            const loc = this.loc();
            this.advance();
            const consequent = this.expression();
            this.expect(TokenType.COLON);
            const alternate = this.ternary();
            return { type: 'Ternary', condition: expr, consequent, alternate, ...loc };
        }
        
        return expr;
    }

    elvis() {
        let left = this.logicalOr();
        
        while (this.match(TokenType.ELVIS)) {
            const loc = this.loc();
            this.advance();
            const right = this.logicalOr();
            left = { type: 'Elvis', left, right, ...loc };
        }
        
        return left;
    }

    logicalOr() {
        let left = this.logicalAnd();
        
        while (this.match(TokenType.OR)) {
            const loc = this.loc();
            const op = this.current().value;
            this.advance();
            const right = this.logicalAnd();
            left = { type: 'BinaryOp', op, left, right, ...loc };
        }
        
        return left;
    }

    logicalAnd() {
        let left = this.comparison();
        
        while (this.match(TokenType.AND)) {
            const loc = this.loc();
            const op = this.current().value;
            this.advance();
            const right = this.comparison();
            left = { type: 'BinaryOp', op, left, right, ...loc };
        }
        
        return left;
    }

    comparison() {
        let left = this.additive();
        
        while (this.match(TokenType.EQ, TokenType.NE, TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE, TokenType.IN)) {
            const loc = this.loc();
            const op = this.current().type === TokenType.IN ? 'in' : this.current().value;
            this.advance();
            const right = this.additive();
            left = { type: 'BinaryOp', op, left, right, ...loc };
        }
        
        return left;
    }

    additive() {
        let left = this.multiplicative();
        
        while (this.match(TokenType.PLUS, TokenType.MINUS)) {
            const loc = this.loc();
            const op = this.current().value;
            this.advance();
            const right = this.multiplicative();
            left = { type: 'BinaryOp', op, left, right, ...loc };
        }
        
        return left;
    }

    multiplicative() {
        let left = this.power();
        
        while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
            const loc = this.loc();
            const op = this.current().value;
            this.advance();
            const right = this.power();
            left = { type: 'BinaryOp', op, left, right, ...loc };
        }
        
        return left;
    }

    power() {
        let left = this.unary();
        
        if (this.match(TokenType.POWER)) {
            const loc = this.loc();
            const op = this.current().value;
            this.advance();
            const right = this.power(); // Right associative
            left = { type: 'BinaryOp', op, left, right, ...loc };
        }
        
        return left;
    }

    unary() {
        if (this.match(TokenType.MINUS, TokenType.NOT)) {
            const loc = this.loc();
            const op = this.current().value;
            this.advance();
            const operand = this.unary();
            return { type: 'UnaryOp', op, operand, ...loc };
        }
        
        return this.postfix();
    }

    postfix() {
        let expr = this.primary();
        
        while (true) {
            if (this.match(TokenType.LPAREN)) {
                // Function call
                const loc = this.loc();
                this.advance();
                const args = [];
                
                while (!this.match(TokenType.RPAREN)) {
                    args.push(this.expression());
                    if (this.match(TokenType.COMMA)) {
                        this.advance();
                    }
                }
                
                this.expect(TokenType.RPAREN);
                expr = { type: 'Call', func: expr, args, ...loc };
            } else if (this.match(TokenType.LBRACKET)) {
                // Index - arr[0] or map["key"]
                const loc = this.loc();
                this.advance();
                const index = this.expression();
                this.expect(TokenType.RBRACKET);
                expr = { type: 'Index', object: expr, index, ...loc };
            } else if (this.match(TokenType.DOT)) {
                // Member access - obj.property
                const loc = this.loc();
                this.advance();
                if (!this.match(TokenType.IDENT)) {
                    throw new GridLangError(`Expected property name after '.'`, loc.line, loc.col, 'SyntaxError');
                }
                const property = this.current().value;
                this.advance();
                expr = { type: 'MemberAccess', object: expr, property, ...loc };
            } else {
                break;
            }
        }
        
        return expr;
    }

    primary() {
        if (this.match(TokenType.NUMBER)) {
            const loc = this.loc();
            const value = this.current().value;
            this.advance();
            return { type: 'Number', value, ...loc };
        }
        
        if (this.match(TokenType.STRING)) {
            const loc = this.loc();
            const value = this.current().value;
            this.advance();
            return { type: 'String', value, ...loc };
        }
        
        if (this.match(TokenType.FSTRING)) {
            const loc = this.loc();
            const parts = this.current().value;
            this.advance();
            return { type: 'FString', parts, ...loc };
        }
        
        if (this.match(TokenType.REGEX)) {
            const loc = this.loc();
            const pattern = this.current().value;
            this.advance();
            return { type: 'RegexLiteral', pattern, ...loc };
        }
        
        if (this.match(TokenType.TRUE, TokenType.FALSE)) {
            const loc = this.loc();
            const value = this.current().value;
            this.advance();
            return { type: 'Boolean', value, ...loc };
        }
        
        if (this.match(TokenType.NULL)) {
            const loc = this.loc();
            this.advance();
            return { type: 'Null', value: null, ...loc };
        }
        
        if (this.match(TokenType.UNDEFINED)) {
            const loc = this.loc();
            this.advance();
            return { type: 'Undefined', value: undefined, ...loc };
        }
        
        if (this.match(TokenType.IDENT)) {
            const loc = this.loc();
            const name = this.current().value;
            this.advance();
            return { type: 'Identifier', name, ...loc };
        }
        
        if (this.match(TokenType.LBRACKET)) {
            return this.arrayLiteral();
        }
        
        if (this.match(TokenType.LBRACE)) {
            return this.mapLiteral();
        }
        
        if (this.match(TokenType.LPAREN)) {
            this.advance();
            const expr = this.expression();
            this.expect(TokenType.RPAREN);
            return expr;
        }
        
        // Anonymous function expression
        if (this.match(TokenType.FUNC)) {
            return this.funcExpression();
        }
        
        const loc = this.loc();
        throw new GridLangError(`Unexpected token ${this.current().type}`, loc.line, loc.col, 'SyntaxError');
    }

    arrayLiteral() {
        const loc = this.loc();
        this.expect(TokenType.LBRACKET);
        const elements = [];
        
        while (!this.match(TokenType.RBRACKET)) {
            elements.push(this.expression());
            if (this.match(TokenType.COMMA)) {
                this.advance();
            }
        }
        
        this.expect(TokenType.RBRACKET);
        return { type: 'Array', elements, ...loc };
    }

    mapLiteral() {
        const loc = this.loc();
        this.expect(TokenType.LBRACE);
        const entries = [];
        
        while (!this.match(TokenType.RBRACE)) {
            let key;
            
            if (this.match(TokenType.STRING)) {
                key = this.current().value;
                this.advance();
            } else if (this.match(TokenType.IDENT)) {
                key = this.current().value;
                this.advance();
            } else {
                const loc = this.loc();
                throw new GridLangError(`Expected string or identifier for map key`, loc.line, loc.col, 'SyntaxError');
            }
            
            this.expect(TokenType.COLON);
            const value = this.expression();
            entries.push({ key, value });
            
            if (this.match(TokenType.COMMA)) {
                this.advance();
            }
        }
        
        this.expect(TokenType.RBRACE);
        return { type: 'Map', entries, ...loc };
    }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Parser };
}
