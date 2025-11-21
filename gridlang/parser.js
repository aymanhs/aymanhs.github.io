// GridLang Parser - AST Generation

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    current() {
        return this.tokens[this.pos];
    }

    peek(offset = 1) {
        const p = this.pos + offset;
        return p < this.tokens.length ? this.tokens[p] : this.tokens[this.tokens.length - 1];
    }

    advance() {
        if (this.pos < this.tokens.length - 1) {
            this.pos++;
        }
    }

    expect(type) {
        const token = this.current();
        if (token.type !== type) {
            throw new Error(`Expected ${type} but got ${token.type} at line ${token.line}`);
        }
        this.advance();
        return token;
    }

    match(...types) {
        return types.includes(this.current().type);
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
        return { type: 'Block', body: statements };
    }

    ifStatement() {
        this.expect(TokenType.IF);
        const condition = this.expression();
        const consequent = this.statement();
        let alternate = null;
        
        if (this.match(TokenType.ELSE)) {
            this.advance();
            alternate = this.statement();
        }
        
        return { type: 'If', condition, consequent, alternate };
    }

    forStatement() {
        this.expect(TokenType.FOR);
        const ident = this.expect(TokenType.IDENT).value;
        this.expect(TokenType.IN);
        const iterable = this.expression();
        const body = this.statement();
        
        return { type: 'For', variable: ident, iterable, body };
    }

    whileStatement() {
        this.expect(TokenType.WHILE);
        const condition = this.expression();
        const body = this.statement();
        
        return { type: 'While', condition, body };
    }

    funcStatement() {
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
        
        return { type: 'FuncDef', name, params, body };
    }

    returnStatement() {
        this.expect(TokenType.RETURN);
        const value = this.match(TokenType.RBRACE, TokenType.EOF) ? null : this.expression();
        return { type: 'Return', value };
    }

    expressionStatement() {
        const expr = this.expression();
        return { type: 'ExprStmt', expression: expr };
    }

    expression() {
        return this.assignment();
    }

    assignment() {
        const expr = this.logicalOr();
        
        if (this.match(TokenType.ASSIGN)) {
            this.advance();
            const value = this.assignment();
            
            if (expr.type === 'Identifier') {
                return { type: 'Assignment', target: expr.name, value };
            } else if (expr.type === 'Index') {
                return { type: 'IndexAssignment', object: expr.object, index: expr.index, value };
            } else if (expr.type === 'MemberAccess') {
                return { type: 'MemberAssignment', object: expr.object, property: expr.property, value };
            }
            
            throw new Error('Invalid assignment target');
        }
        
        return expr;
    }

    logicalOr() {
        let left = this.logicalAnd();
        
        while (this.match(TokenType.OR)) {
            const op = this.current().value;
            this.advance();
            const right = this.logicalAnd();
            left = { type: 'BinaryOp', op, left, right };
        }
        
        return left;
    }

    logicalAnd() {
        let left = this.comparison();
        
        while (this.match(TokenType.AND)) {
            const op = this.current().value;
            this.advance();
            const right = this.comparison();
            left = { type: 'BinaryOp', op, left, right };
        }
        
        return left;
    }

    comparison() {
        let left = this.additive();
        
        while (this.match(TokenType.EQ, TokenType.NE, TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE)) {
            const op = this.current().value;
            this.advance();
            const right = this.additive();
            left = { type: 'BinaryOp', op, left, right };
        }
        
        return left;
    }

    additive() {
        let left = this.multiplicative();
        
        while (this.match(TokenType.PLUS, TokenType.MINUS)) {
            const op = this.current().value;
            this.advance();
            const right = this.multiplicative();
            left = { type: 'BinaryOp', op, left, right };
        }
        
        return left;
    }

    multiplicative() {
        let left = this.power();
        
        while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
            const op = this.current().value;
            this.advance();
            const right = this.power();
            left = { type: 'BinaryOp', op, left, right };
        }
        
        return left;
    }

    power() {
        let left = this.unary();
        
        if (this.match(TokenType.POWER)) {
            const op = this.current().value;
            this.advance();
            const right = this.power(); // Right associative
            left = { type: 'BinaryOp', op, left, right };
        }
        
        return left;
    }

    unary() {
        if (this.match(TokenType.MINUS, TokenType.NOT)) {
            const op = this.current().value;
            this.advance();
            const operand = this.unary();
            return { type: 'UnaryOp', op, operand };
        }
        
        return this.postfix();
    }

    postfix() {
        let expr = this.primary();
        
        while (true) {
            if (this.match(TokenType.LPAREN)) {
                // Function call
                this.advance();
                const args = [];
                
                while (!this.match(TokenType.RPAREN)) {
                    args.push(this.expression());
                    if (this.match(TokenType.COMMA)) {
                        this.advance();
                    }
                }
                
                this.expect(TokenType.RPAREN);
                expr = { type: 'Call', func: expr, args };
            } else if (this.match(TokenType.LBRACKET)) {
                // Index - arr[0] or map["key"]
                this.advance();
                const index = this.expression();
                this.expect(TokenType.RBRACKET);
                expr = { type: 'Index', object: expr, index };
            } else if (this.match(TokenType.DOT)) {
                // Member access - obj.property
                this.advance();
                if (!this.match(TokenType.IDENT)) {
                    throw new Error(`Expected property name after '.' at line ${this.current().line}`);
                }
                const property = this.current().value;
                this.advance();
                expr = { type: 'MemberAccess', object: expr, property };
            } else {
                break;
            }
        }
        
        return expr;
    }

    primary() {
        if (this.match(TokenType.NUMBER)) {
            const value = this.current().value;
            this.advance();
            return { type: 'Number', value };
        }
        
        if (this.match(TokenType.STRING)) {
            const value = this.current().value;
            this.advance();
            return { type: 'String', value };
        }
        
        if (this.match(TokenType.TRUE, TokenType.FALSE)) {
            const value = this.current().value;
            this.advance();
            return { type: 'Boolean', value };
        }
        
        if (this.match(TokenType.NULL)) {
            this.advance();
            return { type: 'Null', value: null };
        }
        
        if (this.match(TokenType.IDENT)) {
            const name = this.current().value;
            this.advance();
            return { type: 'Identifier', name };
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
        
        throw new Error(`Unexpected token ${this.current().type} at line ${this.current().line}`);
    }

    arrayLiteral() {
        this.expect(TokenType.LBRACKET);
        const elements = [];
        
        while (!this.match(TokenType.RBRACKET)) {
            elements.push(this.expression());
            if (this.match(TokenType.COMMA)) {
                this.advance();
            }
        }
        
        this.expect(TokenType.RBRACKET);
        return { type: 'Array', elements };
    }

    mapLiteral() {
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
                throw new Error(`Expected string or identifier for map key at line ${this.current().line}`);
            }
            
            this.expect(TokenType.COLON);
            const value = this.expression();
            entries.push({ key, value });
            
            if (this.match(TokenType.COMMA)) {
                this.advance();
            }
        }
        
        this.expect(TokenType.RBRACE);
        return { type: 'Map', entries };
    }
}
