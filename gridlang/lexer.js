// GridLang Lexer - Tokenization

class Token {
    constructor(type, value, line, col) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.col = col;
    }
}

const TokenType = {
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    REGEX: 'REGEX',
    FSTRING: 'FSTRING',
    IDENT: 'IDENT',
    PLUS: 'PLUS',
    MINUS: 'MINUS',
    STAR: 'STAR',
    SLASH: 'SLASH',
    PERCENT: 'PERCENT',
    POWER: 'POWER',
    ASSIGN: 'ASSIGN',
    EQ: 'EQ',
    NE: 'NE',
    LT: 'LT',
    LE: 'LE',
    GT: 'GT',
    GE: 'GE',
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    LBRACKET: 'LBRACKET',
    RBRACKET: 'RBRACKET',
    LBRACE: 'LBRACE',
    RBRACE: 'RBRACE',
    COMMA: 'COMMA',
    COLON: 'COLON',
    DOT: 'DOT',
    IF: 'IF',
    ELSE: 'ELSE',
    FOR: 'FOR',
    WHILE: 'WHILE',
    FUNC: 'FUNC',
    RETURN: 'RETURN',
    IN: 'IN',
    TRUE: 'TRUE',
    FALSE: 'FALSE',
    NULL: 'NULL',
    NEWLINE: 'NEWLINE',
    EOF: 'EOF'
};

const KEYWORDS = {
    'if': TokenType.IF,
    'else': TokenType.ELSE,
    'for': TokenType.FOR,
    'while': TokenType.WHILE,
    'func': TokenType.FUNC,
    'return': TokenType.RETURN,
    'in': TokenType.IN,
    'true': TokenType.TRUE,
    'false': TokenType.FALSE,
    'null': TokenType.NULL,
    'and': TokenType.AND,
    'or': TokenType.OR,
    'not': TokenType.NOT
};

class Lexer {
    constructor(input) {
        this.input = input;
        this.length = input.length;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
    }

    current() {
        return this.pos < this.length ? this.input[this.pos] : null;
    }

    peek(offset = 1) {
        const p = this.pos + offset;
        return p < this.length ? this.input[p] : null;
    }

    advance() {
        if (this.current() === '\n') {
            this.line++;
            this.col = 1;
        } else {
            this.col++;
        }
        this.pos++;
    }

    skipWhitespace() {
        let c;
        while ((c = this.current())) {
            // Space: 32, Tab: 9, CR: 13
            if (c === ' ' || c === '\t' || c === '\r') {
                this.advance();
            } else {
                break;
            }
        }
    }

    skipComment() {
        if (this.current() === '#') {
            while (this.current() && this.current() !== '\n') {
                this.advance();
            }
        }
    }

    readNumber() {
        let num = '';
        let hasDot = false;
        let c;
        
        while ((c = this.current())) {
            if (c >= '0' && c <= '9') {
                num += c;
                this.advance();
            } else if (c === '.') {
                if (hasDot) break;
                hasDot = true;
                num += c;
                this.advance();
            } else {
                break;
            }
        }
        
        return parseFloat(num);
    }

    readString(quote) {
        let str = '';
        this.advance(); // skip opening quote
        
        while (this.current() && this.current() !== quote) {
            if (this.current() === '\\') {
                this.advance();
                const escaped = this.current();
                if (escaped === 'n') str += '\n';
                else if (escaped === 't') str += '\t';
                else if (escaped === 'r') str += '\r';
                else if (escaped === '\\') str += '\\';
                else if (escaped === quote) str += quote;
                else str += escaped;
                this.advance();
            } else {
                str += this.current();
                this.advance();
            }
        }
        
        if (this.current() === quote) {
            this.advance(); // skip closing quote
        }
        
        return str;
    }

    readRawString(quote) {
        let str = '';
        this.advance(); // skip opening quote
        
        while (this.current() && this.current() !== quote) {
            // Only handle escaped quotes in raw strings
            if (this.current() === '\\' && this.peek() === quote) {
                this.advance();
                str += quote;
                this.advance();
            } else {
                str += this.current();
                this.advance();
            }
        }
        
        if (this.current() === quote) {
            this.advance(); // skip closing quote
        }
        
        return str;
    }

    readFString(quote) {
        this.advance(); // skip opening quote
        const parts = [];
        let currentString = '';
        
        while (this.current() && this.current() !== quote) {
            if (this.current() === '{') {
                // Save current string part if any
                if (currentString) {
                    parts.push({ type: 'string', value: currentString });
                    currentString = '';
                }
                
                this.advance(); // skip {
                
                // Check for escaped brace {{
                if (this.current() === '{') {
                    currentString += '{';
                    this.advance();
                    continue;
                }
                
                // Read variable path until }
                let varPath = '';
                while (this.current() && this.current() !== '}') {
                    varPath += this.current();
                    this.advance();
                }
                
                if (this.current() === '}') {
                    this.advance(); // skip }
                }
                
                // Parse the variable path (e.g., "person.name" -> ["person", "name"])
                varPath = varPath.trim();
                if (varPath) {
                    parts.push({ type: 'var', path: varPath.split('.') });
                }
            } else if (this.current() === '}') {
                // Check for escaped brace }}
                this.advance();
                if (this.current() === '}') {
                    currentString += '}';
                    this.advance();
                } else {
                    // Single } without matching { - treat as literal
                    currentString += '}';
                }
            } else if (this.current() === '\\') {
                // Handle escape sequences
                this.advance();
                if (this.current()) {
                    const escaped = this.current();
                    if (escaped === 'n') currentString += '\n';
                    else if (escaped === 't') currentString += '\t';
                    else if (escaped === 'r') currentString += '\r';
                    else if (escaped === '\\') currentString += '\\';
                    else if (escaped === quote) currentString += quote;
                    else currentString += escaped;
                    this.advance();
                }
            } else {
                currentString += this.current();
                this.advance();
            }
        }
        
        // Add final string part if any
        if (currentString) {
            parts.push({ type: 'string', value: currentString });
        }
        
        if (this.current() === quote) {
            this.advance(); // skip closing quote
        }
        
        return parts;
    }

    readIdentifier() {
        let ident = '';
        let c;
        
        while ((c = this.current())) {
            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || 
                (c >= '0' && c <= '9') || c === '_') {
                ident += c;
                this.advance();
            } else {
                break;
            }
        }
        
        return ident;
    }

    nextToken() {
        while (this.current()) {
            this.skipWhitespace();
            
            if (!this.current()) break;
            
            if (this.current() === '#') {
                this.skipComment();
                continue;
            }

            const line = this.line;
            const col = this.col;

            // Newline
            if (this.current() === '\n') {
                this.advance();
                return new Token(TokenType.NEWLINE, '\n', line, col);
            }

            const c = this.current();
            
            // Numbers
            if (c >= '0' && c <= '9') {
                const num = this.readNumber();
                return new Token(TokenType.NUMBER, num, line, col);
            }

            // Regex literals (r"..." or r'...')
            if (c === 'r' && (this.peek() === '"' || this.peek() === "'")) {
                this.advance(); // skip 'r'
                const quote = this.current();
                const pattern = this.readRawString(quote);
                return new Token(TokenType.REGEX, pattern, line, col);
            }

            // F-strings (f"..." or f'...')
            if (c === 'f' && (this.peek() === '"' || this.peek() === "'")) {
                this.advance(); // skip 'f'
                const quote = this.current();
                const parts = this.readFString(quote);
                return new Token(TokenType.FSTRING, parts, line, col);
            }

            // Strings
            if (c === '"' || c === "'") {
                const str = this.readString(c);
                return new Token(TokenType.STRING, str, line, col);
            }

            // Identifiers and keywords
            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
                const ident = this.readIdentifier();
                const type = KEYWORDS[ident] || TokenType.IDENT;
                const value = type === TokenType.TRUE ? true : 
                             type === TokenType.FALSE ? false :
                             type === TokenType.NULL ? null : ident;
                return new Token(type, value, line, col);
            }

            // Two-character operators
            if (this.current() === '=' && this.peek() === '=') {
                this.advance();
                this.advance();
                return new Token(TokenType.EQ, '==', line, col);
            }
            if (this.current() === '!' && this.peek() === '=') {
                this.advance();
                this.advance();
                return new Token(TokenType.NE, '!=', line, col);
            }
            if (this.current() === '<' && this.peek() === '=') {
                this.advance();
                this.advance();
                return new Token(TokenType.LE, '<=', line, col);
            }
            if (this.current() === '>' && this.peek() === '=') {
                this.advance();
                this.advance();
                return new Token(TokenType.GE, '>=', line, col);
            }
            if (this.current() === '*' && this.peek() === '*') {
                this.advance();
                this.advance();
                return new Token(TokenType.POWER, '**', line, col);
            }

            // Single-character operators
            const char = this.current();
            this.advance();
            
            switch (char) {
                case '+': return new Token(TokenType.PLUS, '+', line, col);
                case '-': return new Token(TokenType.MINUS, '-', line, col);
                case '*': return new Token(TokenType.STAR, '*', line, col);
                case '/': return new Token(TokenType.SLASH, '/', line, col);
                case '%': return new Token(TokenType.PERCENT, '%', line, col);
                case '=': return new Token(TokenType.ASSIGN, '=', line, col);
                case '<': return new Token(TokenType.LT, '<', line, col);
                case '>': return new Token(TokenType.GT, '>', line, col);
                case '(': return new Token(TokenType.LPAREN, '(', line, col);
                case ')': return new Token(TokenType.RPAREN, ')', line, col);
                case '[': return new Token(TokenType.LBRACKET, '[', line, col);
                case ']': return new Token(TokenType.RBRACKET, ']', line, col);
                case '{': return new Token(TokenType.LBRACE, '{', line, col);
                case '}': return new Token(TokenType.RBRACE, '}', line, col);
                case ',': return new Token(TokenType.COMMA, ',', line, col);
                case ':': return new Token(TokenType.COLON, ':', line, col);
                case '.': return new Token(TokenType.DOT, '.', line, col);
                default:
                    throw new Error(`Unknown character '${char}' at line ${line}, col ${col}`);
            }
        }

        return new Token(TokenType.EOF, null, this.line, this.col);
    }

    tokenize() {
        const tokens = [];
        let token;
        
        while ((token = this.nextToken()).type !== TokenType.EOF) {
            if (token.type !== TokenType.NEWLINE) {
                tokens.push(token);
            }
        }
        
        tokens.push(token); // EOF
        return tokens;
    }
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Token, TokenType, Lexer };
}
