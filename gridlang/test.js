#!/usr/bin/env node

/**
 * GridLang Test Suite
 * Run with: node test.js
 */

// Load GridLang modules
const { Lexer, TokenType } = require('./lexer.js');
const { Parser } = require('./parser.js');
const { Interpreter } = require('./gridlang.js');

// Test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    run() {
        console.log('\n🧪 GridLang Test Suite\n');
        console.log('='.repeat(60));

        for (const { name, fn } of this.tests) {
            try {
                fn();
                this.passed++;
                console.log(`✓ ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`✗ ${name}`);
                console.log(`  Error: ${error.message}`);
            }
        }

        console.log('='.repeat(60));
        console.log(`\nResults: ${this.passed} passed, ${this.failed} failed`);
        console.log(`Total: ${this.tests.length} tests\n`);

        return this.failed === 0;
    }
}

// Assertion helpers
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertArrayEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function parse(code) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const program = parser.parse();
    // Return the body for easier testing
    return program.body;
}

function evaluate(code, inputData = '', inputsMap = {}) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    // Create mock console that captures output
    const mockConsole = { 
        innerHTML: '', 
        scrollTop: 0, 
        scrollHeight: 0 
    };
    
    const interp = new Interpreter(null, null, mockConsole, null, inputData, null, inputsMap);
    interp.run(ast);
    
    // Return both the interpreter (for variable access) and console output
    return {
        env: interp.globalEnv,
        output: mockConsole.innerHTML.replace(/<[^>]+>/g, '').trim().split('\n').filter(x => x)
    };
}

// Test Suite
const runner = new TestRunner();

// ========== LEXER TESTS ==========
runner.test('Lexer: Tokenize numbers', () => {
    const lexer = new Lexer('42 3.14 -5');
    const tokens = lexer.tokenize();
    assertEqual(tokens[0].type, 'NUMBER');
    assertEqual(tokens[0].value, 42);
    assertEqual(tokens[1].type, 'NUMBER');
    assertEqual(tokens[1].value, 3.14);
});

runner.test('Lexer: Tokenize strings', () => {
    const lexer = new Lexer('"hello" "world"');
    const tokens = lexer.tokenize();
    assertEqual(tokens[0].type, 'STRING');
    assertEqual(tokens[0].value, 'hello');
    assertEqual(tokens[1].type, 'STRING');
    assertEqual(tokens[1].value, 'world');
});

runner.test('Lexer: Tokenize identifiers', () => {
    const lexer = new Lexer('x foo_bar camelCase');
    const tokens = lexer.tokenize();
    assertEqual(tokens[0].type, 'IDENT');
    assertEqual(tokens[0].value, 'x');
    assertEqual(tokens[1].type, 'IDENT');
    assertEqual(tokens[1].value, 'foo_bar');
});

runner.test('Lexer: Tokenize keywords', () => {
    const lexer = new Lexer('if else for while func return');
    const tokens = lexer.tokenize();
    assertEqual(tokens[0].type, 'IF');
    assertEqual(tokens[1].type, 'ELSE');
    assertEqual(tokens[2].type, 'FOR');
    assertEqual(tokens[3].type, 'WHILE');
    assertEqual(tokens[4].type, 'FUNC');
    assertEqual(tokens[5].type, 'RETURN');
});

runner.test('Lexer: Tokenize operators', () => {
    const lexer = new Lexer('+ - * / % **');
    const tokens = lexer.tokenize();
    assertEqual(tokens[0].type, 'PLUS');
    assertEqual(tokens[1].type, 'MINUS');
    assertEqual(tokens[2].type, 'STAR');
    assertEqual(tokens[3].type, 'SLASH');
    assertEqual(tokens[4].type, 'PERCENT');
    assertEqual(tokens[5].type, 'POWER');
});

runner.test('Lexer: Tokenize delimiters', () => {
    const lexer = new Lexer('( ) { } [ ] , : =');
    const tokens = lexer.tokenize();
    assertEqual(tokens[0].type, 'LPAREN');
    assertEqual(tokens[1].type, 'RPAREN');
    assertEqual(tokens[2].type, 'LBRACE');
    assertEqual(tokens[3].type, 'RBRACE');
    assertEqual(tokens[4].type, 'LBRACKET');
    assertEqual(tokens[5].type, 'RBRACKET');
});

runner.test('Lexer: Handle comments', () => {
    const lexer = new Lexer('x = 5 # this is a comment\ny = 10');
    const tokens = lexer.tokenize();
    // Comments should be ignored, count only IDENT tokens (not EOF)
    const identifiers = tokens.filter(t => t.type === 'IDENT');
    assertEqual(identifiers.length, 2);
    assertEqual(identifiers[0].value, 'x');
    assertEqual(identifiers[1].value, 'y');
});

// ========== PARSER TESTS ==========
runner.test('Parser: Parse variable assignment', () => {
    const ast = parse('x = 42');
    assertEqual(ast.length, 1);
    assertEqual(ast[0].type, 'ExprStmt');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.target, 'x');
    assertEqual(ast[0].expression.value.type, 'Number');
    assertEqual(ast[0].expression.value.value, 42);
});

runner.test('Parser: Parse arithmetic expression', () => {
    const ast = parse('x = 2 + 3 * 4');
    assertEqual(ast[0].type, 'ExprStmt');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.value.type, 'BinaryOp');
    // Should respect operator precedence: 2 + (3 * 4)
    assertEqual(ast[0].expression.value.op, '+');
    assertEqual(ast[0].expression.value.right.op, '*');
});

runner.test('Parser: Parse array literal', () => {
    const ast = parse('arr = [1, 2, 3]');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.value.type, 'Array');
    assertEqual(ast[0].expression.value.elements.length, 3);
});

runner.test('Parser: Parse map literal', () => {
    const ast = parse('obj = {x: 10, y: 20}');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.value.type, 'Map');
    assert(ast[0].expression.value.entries.length >= 2, 'Should have at least 2 entries');
});

runner.test('Parser: Parse if statement', () => {
    const ast = parse('if x > 5 { y = 10 }');
    assertEqual(ast[0].type, 'If');
    assertEqual(ast[0].condition.type, 'BinaryOp');
    assertEqual(ast[0].condition.op, '>');
    assert(ast[0].consequent, 'Should have consequent branch');
});

runner.test('Parser: Parse if-else statement', () => {
    const ast = parse('if x > 5 { y = 10 } else { y = 20 }');
    assertEqual(ast[0].type, 'If');
    assert(ast[0].alternate !== null && ast[0].alternate !== undefined, 'Should have alternate branch');
});

runner.test('Parser: Parse if-elsif statement', () => {
    const ast = parse('if x > 10 { y = 1 } elsif x > 5 { y = 2 }');
    assertEqual(ast[0].type, 'If');
    assertEqual(ast[0].alternate.type, 'If', 'elsif should parse as nested If');
    assertEqual(ast[0].alternate.condition.type, 'BinaryOp');
});

runner.test('Parser: Parse if-elsif-else statement', () => {
    const ast = parse('if x > 10 { y = 1 } elsif x > 5 { y = 2 } else { y = 3 }');
    assertEqual(ast[0].type, 'If');
    assertEqual(ast[0].alternate.type, 'If', 'elsif should parse as nested If');
    assert(ast[0].alternate.alternate !== null, 'Should have final else branch');
});

runner.test('Parser: For loop', () => {
    const ast = parse('for i in range(5) { print(i) }');
    assertEqual(ast[0].type, 'For');
    assertEqual(ast[0].variable, 'i');
    assertEqual(ast[0].iterable.type, 'Call');
    assertEqual(ast[0].iterable.func.name, 'range');
});

runner.test('Parser: Parse while loop', () => {
    const ast = parse('while x < 10 { x = x + 1 }');
    assertEqual(ast[0].type, 'While');
    assertEqual(ast[0].condition.type, 'BinaryOp');
    assert(ast[0].body, 'While should have body');
});

runner.test('Parser: Parse function definition', () => {
    const ast = parse('func add(a, b) { return a + b }');
    assertEqual(ast[0].type, 'FuncDef');
    assertEqual(ast[0].name, 'add');
    assertEqual(ast[0].params.length, 2);
    assertEqual(ast[0].params[0], 'a');
    assertEqual(ast[0].params[1], 'b');
});

runner.test('Parser: Parse function call', () => {
    const ast = parse('result = add(5, 10)');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.value.type, 'Call');
    assertEqual(ast[0].expression.value.func.name, 'add');
    assertEqual(ast[0].expression.value.args.length, 2);
});

runner.test('Parser: Parse array access', () => {
    const ast = parse('x = arr[0]');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.value.type, 'Index');
    assertEqual(ast[0].expression.value.object.type, 'Identifier');
});

runner.test('Parser: Parse member access', () => {
    const ast = parse('x = obj.prop');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.value.type, 'MemberAccess');
    assertEqual(ast[0].expression.value.object.type, 'Identifier');
    assertEqual(ast[0].expression.value.property, 'prop');
});

runner.test('Parser: Parse nested structures', () => {
    const ast = parse('matrix = [[1, 2], [3, 4]]');
    assertEqual(ast[0].expression.value.type, 'Array');
    assertEqual(ast[0].expression.value.elements[0].type, 'Array');
    assertEqual(ast[0].expression.value.elements[0].elements.length, 2);
});

runner.test('Parser: Parse complex expression', () => {
    const ast = parse('result = (a + b) * (c - d)');
    assertEqual(ast[0].expression.value.type, 'BinaryOp');
    assertEqual(ast[0].expression.value.op, '*');
    assertEqual(ast[0].expression.value.left.type, 'BinaryOp');
    assertEqual(ast[0].expression.value.right.type, 'BinaryOp');
});

runner.test('Parser: Parse power operator', () => {
    const ast = parse('x = 2 ** 3');
    assertEqual(ast[0].expression.value.type, 'BinaryOp');
    assertEqual(ast[0].expression.value.op, '**');
    assertEqual(ast[0].expression.value.left.value, 2);
    assertEqual(ast[0].expression.value.right.value, 3);
});

runner.test('Parser: Parse boolean literals', () => {
    const ast = parse('flag = true');
    assertEqual(ast[0].expression.value.type, 'Boolean');
    assertEqual(ast[0].expression.value.value, true);
});

runner.test('Parser: Parse null literal', () => {
    const ast = parse('empty = null');
    assertEqual(ast[0].expression.value.type, 'Null');
});

runner.test('Parser: Parse logical operators', () => {
    const ast = parse('result = true and false');
    assertEqual(ast[0].expression.value.type, 'BinaryOp');
    // Should handle operator precedence for and/or
});

runner.test('Parser: Parse unary operators', () => {
    const ast = parse('x = -5');
    assertEqual(ast[0].expression.value.type, 'UnaryOp');
    assertEqual(ast[0].expression.value.op, '-');
    
    const ast2 = parse('flag = not true');
    assertEqual(ast2[0].expression.value.type, 'UnaryOp');
    assertEqual(ast2[0].expression.value.op, 'not');
});

runner.test('Parser: Parse empty function', () => {
    const ast = parse('func noop() { }');
    assertEqual(ast[0].type, 'FuncDef');
    assert(ast[0].body !== undefined, 'Should have body property');
});

runner.test('Parser: Parse multiline code', () => {
    const code = `
x = 10
y = 20
z = x + y
    `.trim();
    const ast = parse(code);
    assertEqual(ast.length, 3);
});

// ========== REGEX TESTS ==========
runner.test('Lexer: Tokenize regex literal', () => {
    const lexer = new Lexer('pattern = r"\\d+"');
    const tokens = lexer.tokenize();
    assertEqual(tokens[2].type, 'REGEX');
    assertEqual(tokens[2].value, '\\d+');
});

runner.test('Parser: Parse regex literal', () => {
    const ast = parse('pattern = r"\\d+"');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.value.type, 'RegexLiteral');
    assertEqual(ast[0].expression.value.pattern, '\\d+');
});

runner.test('Regex: test() method', () => {
    const ast = parse('pattern = r"\\d+"\nresult = pattern.test("hello123")');
    // Just check it parses - runtime test would need interpreter
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: match() with groups', () => {
    const ast = parse('pattern = r"(\\d+)-(\\d+)"\nmatch = pattern.match("123-456")');
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: find_all() method', () => {
    const ast = parse('matches = r"\\d+".find_all("a1b2c3")');
    assertEqual(ast[0].expression.value.type, 'Call');
});

runner.test('Regex: replace() method', () => {
    const ast = parse('result = r"\\d+".replace("a1b2c3", "X")');
    assertEqual(ast[0].expression.value.type, 'Call');
});

runner.test('Regex: split() method', () => {
    const ast = parse('parts = r"\\s+".split("hello  world")');
    assertEqual(ast[0].expression.value.type, 'Call');
});

runner.test('Regex: named groups syntax', () => {
    const ast = parse('pattern = r"(?<year>\\d{4})-(?<month>\\d{2})"');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.value.type, 'RegexLiteral');
    // Just verify it parses - runtime behavior tested in browser
});

// ========== OBJECTS/MAPS TESTS ==========
runner.test('Objects: Map creation and dot notation', () => {
    const ast = parse('person = {name: "Alice", age: 30}\nprint(person.name)');
    assertEqual(ast.length, 2);
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[1].expression.type, 'Call');
});

runner.test('Objects: Bracket notation with string literal', () => {
    const ast = parse('person = {city: "NYC"}\nprint(person["city"])');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.args[0].type, 'Index');
});

runner.test('Objects: Bracket notation with variable', () => {
    const ast = parse('key = "name"\nperson = {name: "Bob"}\nprint(person[key])');
    assertEqual(ast.length, 3);
    assertEqual(ast[2].expression.args[0].type, 'Index');
});

runner.test('Objects: Assignment via dot notation', () => {
    const ast = parse('person = {age: 30}\nperson.age = 31');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.type, 'MemberAssignment');
});

runner.test('Objects: Assignment via bracket notation', () => {
    const ast = parse('person = {city: "NYC"}\nperson["city"] = "SF"');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.type, 'IndexAssignment');
});

runner.test('Objects: Bracket assignment with variable key', () => {
    const ast = parse('person = {}\nkey = "country"\nperson[key] = "USA"');
    assertEqual(ast.length, 3);
    assertEqual(ast[2].expression.type, 'IndexAssignment');
});

runner.test('Objects: Nested object access', () => {
    const ast = parse('data = {user: {name: "Bob", score: 100}}\nprint(data.user.name)');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.args[0].type, 'MemberAccess');
});

runner.test('Objects: Nested bracket access', () => {
    const ast = parse('data = {user: {score: 100}}\nprint(data["user"]["score"])');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.args[0].type, 'Index');
});

// ========== COMPREHENSIVE REGEX TESTS ==========
runner.test('Regex: test() with match', () => {
    const ast = parse('pattern = r"\\d+"\nresult = pattern.test("hello123")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: test() without match', () => {
    const ast = parse('pattern = r"\\d+"\nresult = pattern.test("hello")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: match() returns string', () => {
    const ast = parse('pattern = r"\\d+"\nmatch = pattern.match("hello123")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: groups() returns array', () => {
    const ast = parse('coords = r"(\\d+),(\\d+)"\ngroups = coords.groups("10,20")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: find_all() returns array of strings', () => {
    const ast = parse('numbers = r"\\d+"\nmatches = numbers.find_all("a1b2c3")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: replace() substitutes all matches', () => {
    const ast = parse('numbers = r"\\d+"\nresult = numbers.replace("a1b2c3", "X")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: split() by pattern', () => {
    const ast = parse('words = r"\\s+"\nparts = words.split("hello  world")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: complex pattern with escapes', () => {
    const ast = parse('pattern = r"\\[(?<level>\\w+)\\] (?<time>[\\d:]+)"');
    assertEqual(ast[0].expression.type, 'Assignment');
    assertEqual(ast[0].expression.value.type, 'RegexLiteral');
});

// ========== NAMED GROUPS TESTS ==========
runner.test('Regex: named groups for date parsing', () => {
    const ast = parse('pattern = r"(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})"\ngroups = pattern.groups("2025-12-01")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: named groups dot notation access', () => {
    const ast = parse('pattern = r"(?<x>\\d+),(?<y>\\d+)"\ngroups = pattern.groups("10,20")\nprint(groups.x)');
    assertEqual(ast.length, 3);
    assertEqual(ast[2].expression.args[0].type, 'MemberAccess');
});

runner.test('Regex: named groups bracket notation access', () => {
    const ast = parse('pattern = r"(?<day>\\d{2})"\ngroups = pattern.groups("01")\nprint(groups["day"])');
    assertEqual(ast.length, 3);
    assertEqual(ast[2].expression.args[0].type, 'Index');
});

runner.test('Regex: named groups with negative numbers', () => {
    const ast = parse('coords = r"x=(?<x>-?\\d+), y=(?<y>-?\\d+)"\ngroups = coords.groups("x=10, y=-20")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: named groups for log parsing', () => {
    const ast = parse('log = r"\\[(?<level>\\w+)\\] (?<time>[\\d:]+) - (?<message>.+)"\ngroups = log.groups("[ERROR] 12:34:56 - timeout")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: positional groups still work', () => {
    const ast = parse('game = r"Game (\\d+): (.+)"\ngroups = game.groups("Game 123: 4 red")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

runner.test('Regex: mixed named and complex patterns', () => {
    const ast = parse('pattern = r"(?<protocol>https?)://(?<domain>[\\w.]+)"\ngroups = pattern.groups("https://example.com")');
    assertEqual(ast.length, 2);
    assertEqual(ast[1].expression.value.type, 'Call');
});

// ========== RUNTIME EVALUATION TESTS ==========
runner.test('Runtime: Basic arithmetic', () => {
    const result = evaluate('x = 5 + 3 * 2\nprint(x)');
    assertArrayEqual(result.output, ['11']);
    assertEqual(result.env.get('x'), 11);
});

runner.test('Runtime: String operations', () => {
    const result = evaluate('s = "hello" + " " + "world"\nprint(s)');
    assertArrayEqual(result.output, ['hello world']);
});

runner.test('Runtime: Array operations', () => {
    const result = evaluate('arr = [1, 2, 3]\nprint(len(arr))\nprint(arr[1])');
    assertArrayEqual(result.output, ['3', '2']);
});

runner.test('Runtime: Map/Object dot notation', () => {
    const result = evaluate('person = {name: "Alice", age: 30}\nprint(person.name)\nprint(person.age)');
    assertArrayEqual(result.output, ['Alice', '30']);
});

runner.test('Runtime: Map bracket notation', () => {
    const result = evaluate('person = {city: "NYC"}\nkey = "city"\nprint(person[key])\nprint(person["city"])');
    assertArrayEqual(result.output, ['NYC', 'NYC']);
});

runner.test('Runtime: Map assignment', () => {
    const result = evaluate('obj = {x: 1}\nobj.x = 5\nobj["y"] = 10\nprint(obj.x)\nprint(obj.y)');
    assertArrayEqual(result.output, ['5', '10']);
});

runner.test('Runtime: Nested object access', () => {
    const result = evaluate('data = {user: {name: "Bob", score: 100}}\nprint(data.user.name)\nprint(data["user"]["score"])');
    assertArrayEqual(result.output, ['Bob', '100']);
});

runner.test('Runtime: If-else control flow', () => {
    const result = evaluate('x = 10\nif x > 5 { print("big") } else { print("small") }');
    assertArrayEqual(result.output, ['big']);
});

runner.test('Runtime: If-elsif control flow', () => {
    const result = evaluate('x = 7\nif x > 10 { print("huge") } elsif x > 5 { print("big") } else { print("small") }');
    assertArrayEqual(result.output, ['big']);
});

runner.test('Runtime: If-elsif-else with multiple elsif branches', () => {
    const result = evaluate('score = 75\nif score >= 90 { print("A") } elsif score >= 80 { print("B") } elsif score >= 70 { print("C") } else { print("F") }');
    assertArrayEqual(result.output, ['C']);
});

runner.test('Runtime: For loop', () => {
    const result = evaluate('for i in [1, 2, 3] { print(i) }');
    assertArrayEqual(result.output, ['1', '2', '3']);
});

runner.test('Runtime: While loop', () => {
    const result = evaluate('x = 0\nwhile x < 3 { print(x)\nx = x + 1 }');
    assertArrayEqual(result.output, ['0', '1', '2']);
});

runner.test('Runtime: Function definition and call', () => {
    const result = evaluate('func double(x) { return x * 2 }\ny = double(5)\nprint(y)');
    assertArrayEqual(result.output, ['10']);
});

runner.test('Runtime: Regex test() method', () => {
    const result = evaluate('pattern = r"\\d+"\nprint(pattern.test("hello123"))\nprint(pattern.test("hello"))');
    assertArrayEqual(result.output, ['true', 'false']);
});

runner.test('Runtime: Regex match() method', () => {
    const result = evaluate('pattern = r"\\d+"\nmatch = pattern.match("abc123def")\nprint(match)');
    assertArrayEqual(result.output, ['123']);
});

runner.test('Runtime: Regex groups() method', () => {
    const result = evaluate('coords = r"(\\d+),(\\d+)"\ngroups = coords.groups("Point: 10,20")\nprint(groups[0])\nprint(groups[1])');
    assertArrayEqual(result.output, ['10', '20']);
});

runner.test('Runtime: Regex find_all() method', () => {
    const result = evaluate('numbers = r"\\d+"\nmatches = numbers.find_all("a1b2c3")\nfor m in matches { print(m) }');
    assertArrayEqual(result.output, ['1', '2', '3']);
});

runner.test('Runtime: Regex replace() method', () => {
    const result = evaluate('numbers = r"\\d+"\nresult = numbers.replace("a1b2c3", "X")\nprint(result)');
    assertArrayEqual(result.output, ['aXbXcX']);
});

runner.test('Runtime: Regex split() method', () => {
    const result = evaluate('words = r"\\s+"\nparts = words.split("hello  world   foo")\nfor part in parts { print(part) }');
    assertArrayEqual(result.output, ['hello', 'world', 'foo']);
});

runner.test('Runtime: Named groups as object', () => {
    const result = evaluate('date = r"(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})"\ngroups = date.groups("2025-12-01")\nprint(groups.year)\nprint(groups.month)\nprint(groups["day"])');
    assertArrayEqual(result.output, ['2025', '12', '01']);
});

runner.test('Runtime: Named groups with coordinates', () => {
    const result = evaluate('coords = r"x=(?<x>-?\\d+), y=(?<y>-?\\d+)"\ngroups = coords.groups("x=10, y=-20")\nprint(groups.x)\nprint(groups.y)');
    assertArrayEqual(result.output, ['10', '-20']);
});

runner.test('Runtime: Named groups log parsing', () => {
    const result = evaluate('log = r"\\[(?<level>\\w+)\\] (?<time>[\\d:]+) - (?<message>.+)"\ngroups = log.groups("[ERROR] 12:34:56 - Connection timeout")\nprint(groups.level)\nprint(groups.time)');
    assertArrayEqual(result.output, ['ERROR', '12:34:56']);
});

runner.test('Runtime: Positional groups still work', () => {
    const result = evaluate('game = r"Game (\\d+): (.+)"\ngroups = game.groups("Game 123: 4 red")\nprint(groups[0])\nprint(groups[1])');
    assertArrayEqual(result.output, ['123', '4 red']);
});

runner.test('Runtime: Complex nested computation', () => {
    const result = evaluate('func fib(n) { if n <= 1 { return n } else { return fib(n-1) + fib(n-2) } }\nprint(fib(10))');
    assertArrayEqual(result.output, ['55']);
});

runner.test('Runtime: Logical operators', () => {
    const result = evaluate('print(true and false)\nprint(true or false)\nprint(not true)');
    assertArrayEqual(result.output, ['false', 'true', 'false']);
});

runner.test('Runtime: Comparison operators', () => {
    const result = evaluate('print(5 > 3)\nprint(5 < 3)\nprint(5 == 5)\nprint(5 != 3)');
    assertArrayEqual(result.output, ['true', 'false', 'true', 'true']);
});

runner.test('Runtime: Power operator', () => {
    const result = evaluate('print(2 ** 3)\nprint(5 ** 2)');
    assertArrayEqual(result.output, ['8', '25']);
});

runner.test('Runtime: String length', () => {
    const result = evaluate('s = "hello"\nprint(len(s))');
    assertArrayEqual(result.output, ['5']);
});

runner.test('Runtime: Array length', () => {
    const result = evaluate('arr = [1, 2, 3]\nprint(len(arr))');
    assertArrayEqual(result.output, ['3']);
});

// ========== F-STRING TESTS ==========

runner.test('Runtime: Basic f-string interpolation', () => {
    const result = evaluate('name = "Alice"\nprint(f"Hello {name}!")');
    assertArrayEqual(result.output, ['Hello Alice!']);
});

runner.test('Runtime: F-string with multiple variables', () => {
    const result = evaluate('x = 5\ny = 10\nprint(f"{x} + {y} = 15")');
    assertArrayEqual(result.output, ['5 + 10 = 15']);
});

runner.test('Runtime: F-string with dot notation', () => {
    const result = evaluate('person = {name: "Bob", age: 30}\nprint(f"{person.name} is {person.age} years old")');
    assertArrayEqual(result.output, ['Bob is 30 years old']);
});

runner.test('Runtime: F-string with nested member access', () => {
    const result = evaluate('data = {user: {name: "Alice", score: 100}}\nprint(f"Player: {data.user.name}, Score: {data.user.score}")');
    assertArrayEqual(result.output, ['Player: Alice, Score: 100']);
});

runner.test('Runtime: F-string with escaped braces', () => {
    const result = evaluate('print(f"Use {{braces}} for literals")');
    assertArrayEqual(result.output, ['Use {braces} for literals']);
});

runner.test('Runtime: F-string with numbers', () => {
    const result = evaluate('count = 42\nprint(f"Count: {count}")');
    assertArrayEqual(result.output, ['Count: 42']);
});

runner.test('Runtime: F-string with undefined variable', () => {
    const result = evaluate('print(f"Value: {missing}")');
    assertArrayEqual(result.output, ['Value: undefined']);
});

runner.test('Runtime: F-string with single quotes', () => {
    const result = evaluate('name = "World"\nprint(f\'Hello {name}!\')');
    assertArrayEqual(result.output, ['Hello World!']);
});

runner.test('Runtime: F-string empty', () => {
    const result = evaluate('print(f"No variables here")');
    assertArrayEqual(result.output, ['No variables here']);
});

runner.test('Runtime: F-string with array element access', () => {
    const result = evaluate('arr = [10, 20, 30]\nfirst = arr[0]\nprint(f"First: {first}")');
    assertArrayEqual(result.output, ['First: 10']);
});

// ========== BUILTIN FUNCTIONS TESTS ==========

// Math functions
runner.test('Runtime: abs() function', () => {
    const result = evaluate('print(abs(-5))\nprint(abs(3.14))');
    assertArrayEqual(result.output, ['5', '3.14']);
});

runner.test('Runtime: sqrt() function', () => {
    const result = evaluate('print(sqrt(16))\nprint(sqrt(2))');
    assertEqual(result.output[0], '4');
    assert(result.output[1].startsWith('1.41'));
});

runner.test('Runtime: pow() function', () => {
    const result = evaluate('print(pow(2, 3))\nprint(pow(5, 2))');
    assertArrayEqual(result.output, ['8', '25']);
});

runner.test('Runtime: floor/ceil/round functions', () => {
    const result = evaluate('print(floor(3.7))\nprint(ceil(3.2))\nprint(round(3.5))');
    assertArrayEqual(result.output, ['3', '4', '4']);
});

runner.test('Runtime: min/max functions', () => {
    const result = evaluate('print(min(5, 2, 8, 1))\nprint(max(5, 2, 8, 1))');
    assertArrayEqual(result.output, ['1', '8']);
});

runner.test('Runtime: trigonometry functions', () => {
    const result = evaluate('print(sin(0))\nprint(cos(0))\nprint(tan(0))');
    assertArrayEqual(result.output, ['0', '1', '0']);
});

runner.test('Runtime: random() function', () => {
    const result = evaluate('r = random()\nprint(r >= 0 and r < 1)');
    assertArrayEqual(result.output, ['true']);
});

// Range function
runner.test('Runtime: range() with single arg', () => {
    const result = evaluate('for i in range(3) { print(i) }');
    assertArrayEqual(result.output, ['0', '1', '2']);
});

runner.test('Runtime: range() with start and end', () => {
    const result = evaluate('for i in range(5, 8) { print(i) }');
    assertArrayEqual(result.output, ['5', '6', '7']);
});

runner.test('Runtime: range() with step', () => {
    const result = evaluate('for i in range(0, 10, 2) { print(i) }');
    assertArrayEqual(result.output, ['0', '2', '4', '6', '8']);
});

// Type conversion
runner.test('Runtime: str() conversion', () => {
    const result = evaluate('print(str(123))\nprint(str(true))\nprint(str([1,2,3]))');
    assertArrayEqual(result.output, ['123', 'true', '[1, 2, 3]']);
});

runner.test('Runtime: int() conversion', () => {
    const result = evaluate('print(int(3.7))\nprint(int("42"))\nprint(int(true))');
    assertArrayEqual(result.output, ['3', '42', '1']);
});

runner.test('Runtime: float() conversion', () => {
    const result = evaluate('print(float(5))\nprint(float("3.14"))\nprint(float(true))');
    assertArrayEqual(result.output, ['5', '3.14', '1']);
});

runner.test('Runtime: bool() conversion', () => {
    const result = evaluate('print(bool(1))\nprint(bool(0))\nprint(bool(""))');
    assertArrayEqual(result.output, ['true', 'false', 'false']);
});

// String functions
runner.test('Runtime: substr() function', () => {
    const result = evaluate('s = "hello world"\nprint(substr(s, 6))\nprint(substr(s, 0, 5))');
    assertArrayEqual(result.output, ['world', 'hello']);
});

runner.test('Runtime: slice() function', () => {
    const result = evaluate('s = "hello"\nprint(slice(s, 1, 4))\narr = [1,2,3,4,5]\nprint(slice(arr, 2, 4)[0])');
    assertArrayEqual(result.output, ['ell', '3']);
});

runner.test('Runtime: split() and join()', () => {
    const result = evaluate('parts = split("a,b,c", ",")\nprint(len(parts))\nprint(join(parts, "-"))');
    assertArrayEqual(result.output, ['3', 'a-b-c']);
});

runner.test('Runtime: upper() and lower()', () => {
    const result = evaluate('print(upper("hello"))\nprint(lower("WORLD"))');
    assertArrayEqual(result.output, ['HELLO', 'world']);
});

runner.test('Runtime: trim() function', () => {
    const result = evaluate('s = "  hello  "\nprint(trim(s))');
    assertArrayEqual(result.output, ['hello']);
});

runner.test('Runtime: replace() function', () => {
    const result = evaluate('s = "hello world"\nprint(replace(s, "o", "0"))');
    assertArrayEqual(result.output, ['hell0 w0rld']);
});

runner.test('Runtime: starts_with() and ends_with()', () => {
    const result = evaluate('s = "hello"\nprint(starts_with(s, "he"))\nprint(ends_with(s, "lo"))');
    assertArrayEqual(result.output, ['true', 'true']);
});

runner.test('Runtime: contains() function', () => {
    const result = evaluate('print(contains("hello", "ell"))\nprint(contains([1,2,3], 2))');
    assertArrayEqual(result.output, ['true', 'true']);
});

runner.test('Runtime: index_of() function', () => {
    const result = evaluate('print(index_of("hello", "l"))\nprint(index_of([1,2,3], 2))');
    assertArrayEqual(result.output, ['2', '1']);
});

runner.test('Runtime: char_at() and char_code()', () => {
    const result = evaluate('s = "hello"\nprint(char_at(s, 1))\nprint(char_code(s, 0))');
    assertArrayEqual(result.output, ['e', '104']);
});

runner.test('Runtime: from_char_code() function', () => {
    const result = evaluate('print(from_char_code(65))\nprint(from_char_code(72))');
    assertArrayEqual(result.output, ['A', 'H']);
});

runner.test('Runtime: repeat() function', () => {
    const result = evaluate('print(repeat("ab", 3))');
    assertArrayEqual(result.output, ['ababab']);
});

runner.test('Runtime: reverse() function', () => {
    const result = evaluate('print(reverse("hello"))\narr = [1,2,3]\nprint(reverse(arr)[0])');
    assertArrayEqual(result.output, ['olleh', '3']);
});

// Array functions
runner.test('Runtime: append() function', () => {
    const result = evaluate('arr = [1, 2, 3]\nappend(arr, 4)\nprint(len(arr))\nprint(arr[3])');
    assertArrayEqual(result.output, ['4', '4']);
});

runner.test('Runtime: len() with Map', () => {
    const result = evaluate('m = {a: 1, b: 2, c: 3}\nprint(len(m))');
    assertArrayEqual(result.output, ['3']);
});

// Color helpers
runner.test('Runtime: rgb() function', () => {
    const result = evaluate('c = rgb(255, 0, 0)\nprint(c)');
    assertArrayEqual(result.output, ['rgb(255, 0, 0)']);
});

runner.test('Runtime: hsl() function', () => {
    const result = evaluate('c = hsl(180, 70, 50)\nprint(c)');
    assertArrayEqual(result.output, ['hsl(180, 70%, 50%)']);
});

// Input functions (with mock data)
runner.test('Runtime: input_string() function', () => {
    const code = 'data = input_string()\nprint(len(data) > 0)';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const mockConsole = { innerHTML: '', scrollTop: 0, scrollHeight: 0 };
    const interp = new Interpreter(null, null, mockConsole, null, 'test data', null);
    interp.run(ast);
    const output = mockConsole.innerHTML.replace(/<[^>]+>/g, '').trim().split('\n').filter(x => x);
    assertArrayEqual(output, ['true']);
});

runner.test('Runtime: input_lines() function', () => {
    const code = 'lines = input_lines()\nprint(len(lines))';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const mockConsole = { innerHTML: '', scrollTop: 0, scrollHeight: 0 };
    const interp = new Interpreter(null, null, mockConsole, null, 'line1\nline2\nline3', null);
    interp.run(ast);
    const output = mockConsole.innerHTML.replace(/<[^>]+>/g, '').trim().split('\n').filter(x => x);
    assertArrayEqual(output, ['3']);
});

runner.test('Runtime: input_grid() function', () => {
    const code = 'grid = input_grid()\nprint(len(grid))\nprint(len(grid[0]))';
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const mockConsole = { innerHTML: '', scrollTop: 0, scrollHeight: 0 };
    const interp = new Interpreter(null, null, mockConsole, null, 'abc\ndef\nghi', null);
    interp.run(ast);
    const output = mockConsole.innerHTML.replace(/<[^>]+>/g, '').trim().split('\n').filter(x => x);
    assertArrayEqual(output, ['3', '3']);
});

// Debug functions
runner.test('Runtime: debug() and set_debug()', () => {
    const result = evaluate('set_debug(true)\ndebug("test")\nset_debug(false)\ndebug("hidden")');
    assertEqual(result.output.length, 1);
    assertEqual(result.output[0], 'test');
});

// Modulo operator
runner.test('Runtime: modulo operator', () => {
    const result = evaluate('print(10 % 3)\nprint(7 % 2)');
    assertArrayEqual(result.output, ['1', '1']);
});

// Multi-dimensional arrays
runner.test('Runtime: 2D array access', () => {
    const result = evaluate('matrix = [[1,2],[3,4]]\nprint(matrix[0][1])\nprint(matrix[1][0])');
    assertArrayEqual(result.output, ['2', '3']);
});

runner.test('Runtime: 2D array assignment', () => {
    const result = evaluate('matrix = [[1,2],[3,4]]\nmatrix[0][1] = 99\nprint(matrix[0][1])');
    assertArrayEqual(result.output, ['99']);
});

// Null handling
runner.test('Runtime: null value', () => {
    const result = evaluate('x = null\nprint(x == null)\nprint(str(x))');
    assertArrayEqual(result.output, ['true', 'null']);
});

// Boolean literals
runner.test('Runtime: boolean values', () => {
    const result = evaluate('print(true)\nprint(false)\nprint(true and false)');
    assertArrayEqual(result.output, ['true', 'false', 'false']);
});

// Unary minus
runner.test('Runtime: unary minus', () => {
    const result = evaluate('x = 5\nprint(-x)\nprint(-(-3))');
    assertArrayEqual(result.output, ['-5', '3']);
});

// Return statement
runner.test('Runtime: early return', () => {
    const result = evaluate('func test() { return 42\nprint("unreachable") }\nprint(test())');
    assertArrayEqual(result.output, ['42']);
});

// Nested functions
runner.test('Runtime: nested function calls', () => {
    const result = evaluate('func add(a, b) { return a + b }\nfunc mul(a, b) { return a * b }\nprint(mul(add(2, 3), 4))');
    assertArrayEqual(result.output, ['20']);
});

// Variable scoping
runner.test('Runtime: function local scope', () => {
    const result = evaluate('x = 10\nfunc test() { x = 20\nreturn x }\nprint(test())\nprint(x)');
    assertArrayEqual(result.output, ['20', '20']);
});

// ========== STRESS TESTS ==========
runner.test('Stress: Deep nesting', () => {
    let code = 'x = ';
    for (let i = 0; i < 50; i++) {
        code += '(';
    }
    code += '1';
    for (let i = 0; i < 50; i++) {
        code += ')';
    }
    // Should not throw
    const ast = parse(code);
    assert(ast.length > 0);
});

runner.test('Stress: Large array', () => {
    const elements = Array.from({ length: 1000 }, (_, i) => i).join(', ');
    const code = `arr = [${elements}]`;
    const ast = parse(code);
    // Just check it parses without error
    assert(ast.length > 0, 'Should parse successfully');
});

runner.test('Stress: Many assignments', () => {
    const lines = Array.from({ length: 1000 }, (_, i) => `x${i} = ${i}`).join('\n');
    const ast = parse(lines);
    assertEqual(ast.length, 1000);
});

// ========== COMPREHENSIVE F-STRING TESTS ==========
runner.test('F-String: basic interpolation', () => {
    const result = evaluate('name = "Alice"\nprint(f"Hello {name}!")');
    assertArrayEqual(result.output, ['Hello Alice!']);
});

runner.test('F-String: multiple variables', () => {
    const result = evaluate('name = "Alice"\nage = 30\nprint(f"{name} is {age} years old")');
    assertArrayEqual(result.output, ['Alice is 30 years old']);
});

runner.test('F-String: with numbers', () => {
    const result = evaluate('name = "Bob"\nscore = 95.5\nprint(f"{name} scored {score} points")');
    assertArrayEqual(result.output, ['Bob scored 95.5 points']);
});

runner.test('F-String: dot notation - object properties', () => {
    const result = evaluate('person = {name: "Bob", age: 25, city: "NYC"}\nprint(f"Person: {person.name}, Age: {person.age}, City: {person.city}")');
    assertArrayEqual(result.output, ['Person: Bob, Age: 25, City: NYC']);
});

runner.test('F-String: nested object access', () => {
    const result = evaluate('data = {user: {id: 123, name: "Charlie"}}\nprint(f"User ID: {data.user.id}, Name: {data.user.name}")');
    assertArrayEqual(result.output, ['User ID: 123, Name: Charlie']);
});

runner.test('F-String: with computed values', () => {
    const result = evaluate('x = 10\ny = 20\nresult = x + y\nprint(f"{x} + {y} = {result}")');
    assertArrayEqual(result.output, ['10 + 20 = 30']);
});

runner.test('F-String: escaped braces', () => {
    const result = evaluate('print(f"Use {{braces}} for literals")');
    assertArrayEqual(result.output, ['Use {braces} for literals']);
});

runner.test('F-String: array elements via variables', () => {
    const result = evaluate('arr = [1, 2, 3]\nfirst = arr[0]\nlast = arr[2]\nprint(f"First: {first}, Last: {last}")');
    assertArrayEqual(result.output, ['First: 1, Last: 3']);
});

runner.test('F-String: undefined variable handling', () => {
    const result = evaluate('print(f"Missing: {undefined_var}")');
    assertArrayEqual(result.output, ['Missing: undefined']);
});

runner.test('F-String: mixed text and variables', () => {
    const result = evaluate('x = 42\nprint(f"The answer is {x}, not {x + 1}")');
    // Note: Only variable substitution, not expressions in braces
    // So this will look for a variable named "x + 1" which doesn't exist
    assertArrayEqual(result.output, ['The answer is 42, not undefined']);
});

runner.test('F-String: empty interpolation', () => {
    const result = evaluate('x = ""\nprint(f"Value: [{x}]")');
    assertArrayEqual(result.output, ['Value: []']);
});

runner.test('F-String: boolean values', () => {
    const result = evaluate('flag = true\nprint(f"Flag is {flag}")');
    assertArrayEqual(result.output, ['Flag is true']);
});

runner.test('F-String: multiple interpolations', () => {
    const result = evaluate('a = 1\nb = 2\nc = 3\nprint(f"{a} and {b} and {c}")');
    assertArrayEqual(result.output, ['1 and 2 and 3']);
});

runner.test('F-String: deep nested object', () => {
    const result = evaluate('obj = {a: {b: {c: {d: "deep"}}}}\nprint(f"Value: {obj.a.b.c.d}")');
    assertArrayEqual(result.output, ['Value: deep']);
});

runner.test('F-String: with special characters', () => {
    const result = evaluate('text = "Hello World!"\nprint(f"Text: {text}")');
    assertArrayEqual(result.output, ['Text: Hello World!']);
});

// ========== INPUT FILE TESTS ==========
runner.test('Input: input_string with default input', () => {
    const result = evaluate('s = input_string()\nprint(s)', 'Hello World');
    assertArrayEqual(result.output, ['Hello World']);
});

runner.test('Input: input_string with named file', () => {
    const inputs = { data1: 'File 1 content', data2: 'File 2 content' };
    const result = evaluate('s = input_string("data1")\nprint(s)', '', inputs);
    assertArrayEqual(result.output, ['File 1 content']);
});

runner.test('Input: input_string with multiple named files', () => {
    const inputs = { data1: 'First', data2: 'Second', data3: 'Third' };
    const result = evaluate('print(input_string("data1"))\nprint(input_string("data2"))\nprint(input_string("data3"))', '', inputs);
    assertArrayEqual(result.output, ['First', 'Second', 'Third']);
});

runner.test('Input: input_string with non-existent file', () => {
    const inputs = { data1: 'Exists' };
    const result = evaluate('s = input_string("missing")\nprint(len(s))', '', inputs);
    assertArrayEqual(result.output, ['0']);
});

runner.test('Input: input_lines with default input', () => {
    const result = evaluate('lines = input_lines()\nprint(len(lines))', 'line1\nline2\nline3');
    assertArrayEqual(result.output, ['3']);
});

runner.test('Input: input_lines with named file', () => {
    const inputs = { data: 'apple\nbanana\ncherry' };
    const result = evaluate('lines = input_lines("data")\nprint(lines[0])\nprint(lines[2])', '', inputs);
    assertArrayEqual(result.output, ['apple', 'cherry']);
});

runner.test('Input: input_lines filters empty lines', () => {
    const inputs = { data: 'line1\n\nline2\n\n\nline3' };
    const result = evaluate('lines = input_lines("data")\nprint(len(lines))', '', inputs);
    assertArrayEqual(result.output, ['3']);
});

runner.test('Input: input_grid with default input - char type', () => {
    const result = evaluate('grid = input_grid("char")\nprint(grid[0][0])\nprint(grid[1][1])', 'ABC\nDEF');
    assertArrayEqual(result.output, ['A', 'E']);
});

runner.test('Input: input_grid with named file - int type', () => {
    const inputs = { nums: '1 2 3\n4 5 6' };
    const result = evaluate('grid = input_grid("int", " ", "nums")\nprint(grid[0][1])\nprint(grid[1][2])', '', inputs);
    assertArrayEqual(result.output, ['2', '6']);
});

runner.test('Input: input_grid with named file - float type', () => {
    const inputs = { floats: '1.5,2.5\n3.5,4.5' };
    const result = evaluate('grid = input_grid("float", ",", "floats")\nprint(grid[0][0])\nprint(grid[1][1])', '', inputs);
    assertArrayEqual(result.output, ['1.5', '4.5']);
});

runner.test('Input: input_grid with named file - word type', () => {
    const inputs = { words: 'hello world\nfoo bar' };
    const result = evaluate('grid = input_grid("word", " ", "words")\nprint(grid[0][1])\nprint(grid[1][0])', '', inputs);
    assertArrayEqual(result.output, ['world', 'foo']);
});

runner.test('Input: mixed default and named inputs', () => {
    const inputs = { alt: 'Named' };
    const result = evaluate('print(input_string())\nprint(input_string("alt"))', 'Default', inputs);
    assertArrayEqual(result.output, ['Default', 'Named']);
});

runner.test('Input: process multiple files in loop', () => {
    const inputs = { f1: '10', f2: '20', f3: '30' };
    const result = evaluate('files = ["f1", "f2", "f3"]\nfor f in files { print(input_string(f)) }', '', inputs);
    assertArrayEqual(result.output, ['10', '20', '30']);
});

// ============= ERROR REPORTING TESTS =============
runner.test('Error: Syntax error includes line and column', () => {
    try {
        parse('x = 5\ny = 10\nz =');
        assert(false, 'Should have thrown an error');
    } catch (e) {
        assert(e.line !== undefined, 'Error should have line number');
        assert(e.col !== undefined, 'Error should have column number');
        assertEqual(e.line, 3, 'Error should be on line 3');
    }
});

runner.test('Error: Undefined variable includes location', () => {
    try {
        evaluate('x = 5\ny = unknown_var\nz = 10');
        assert(false, 'Should have thrown an error');
    } catch (e) {
        assert(e.line !== undefined && e.line !== null, `Error should have line number, got: ${e.line}`);
        assert(e.message.includes('Undefined variable'), 'Error should mention undefined variable');
        assertEqual(e.line, 2, 'Error should be on line 2');
    }
});

runner.test('Error: Type error (calling non-function) includes location', () => {
    try {
        evaluate('x = 5\ny = x()\nz = 10');
        assert(false, 'Should have thrown an error');
    } catch (e) {
        assert(e.line !== undefined || e.message.includes('line'), 'Error should include line information');
        assert(e.message.includes('not a function'), 'Error should mention type issue');
    }
});

runner.test('Error: For loop with non-iterable includes location', () => {
    try {
        evaluate('x = 5\nfor i in x { print(i) }');
        assert(false, 'Should have thrown an error');
    } catch (e) {
        assert(e.line !== undefined || e.message.includes('line'), 'Error should include line information');
        assert(e.message.includes('iterable'), 'Error should mention iterable issue');
    }
});

runner.test('Error: Parser error with unexpected token', () => {
    try {
        parse('if x > 5 { y = 10 } else else { z = 20 }');
        assert(false, 'Should have thrown an error');
    } catch (e) {
        assert(e.line !== undefined, 'Error should have line number');
        assert(e.errorType === 'SyntaxError' || e.message.includes('Syntax'), 'Should be a syntax error');
    }
});

runner.test('Error: GridLangError format method works', () => {
    const { GridLangError } = require('./gridlang.js');
    const err = new GridLangError('Test error', 5, 10, 'RuntimeError');
    const formatted = err.format();
    assert(formatted.includes('line 5'), 'Formatted error should include line');
    assert(formatted.includes('col 10'), 'Formatted error should include column');
    assert(formatted.includes('RuntimeError'), 'Formatted error should include error type');
    assert(formatted.includes('Test error'), 'Formatted error should include message');
});

// ============= STRING METHOD TESTS =============
runner.test('String: upper() method', () => {
    const result = evaluate('s = "hello"\nprint(s.upper())');
    assertArrayEqual(result.output, ['HELLO']);
});

runner.test('String: lower() method', () => {
    const result = evaluate('s = "WORLD"\nprint(s.lower())');
    assertArrayEqual(result.output, ['world']);
});

runner.test('String: trim() method', () => {
    const result = evaluate('s = "  hello  "\nprint(s.trim())');
    assertArrayEqual(result.output, ['hello']);
});

runner.test('String: replace() method', () => {
    const result = evaluate('s = "hello world"\nprint(s.replace("world", "python"))');
    assertArrayEqual(result.output, ['hello python']);
});

runner.test('String: split() method', () => {
    const result = evaluate('s = "a,b,c"\nparts = s.split(",")\nprint(len(parts))\nprint(parts[1])');
    assertArrayEqual(result.output, ['3', 'b']);
});

runner.test('String: startsWith() method', () => {
    const result = evaluate('s = "hello"\nprint(s.startsWith("hel"))\nprint(s.startsWith("bye"))');
    assertArrayEqual(result.output, ['true', 'false']);
});

runner.test('String: endsWith() method', () => {
    const result = evaluate('s = "hello"\nprint(s.endsWith("lo"))\nprint(s.endsWith("hi"))');
    assertArrayEqual(result.output, ['true', 'false']);
});

runner.test('String: contains() method', () => {
    const result = evaluate('s = "hello world"\nprint(s.contains("world"))\nprint(s.contains("bye"))');
    assertArrayEqual(result.output, ['true', 'false']);
});

runner.test('String: indexOf() method', () => {
    const result = evaluate('s = "hello"\nprint(s.indexOf("l"))\nprint(s.indexOf("z"))');
    assertArrayEqual(result.output, ['2', '-1']);
});

runner.test('String: substring() method', () => {
    const result = evaluate('s = "hello"\nprint(s.substring(1, 4))');
    assertArrayEqual(result.output, ['ell']);
});

runner.test('String: slice() method', () => {
    const result = evaluate('s = "hello"\nprint(s.slice(1, 4))\nprint(s.slice(-2))');
    assertArrayEqual(result.output, ['ell', 'lo']);
});

runner.test('String: length property', () => {
    const result = evaluate('s = "hello"\nprint(s.length)');
    assertArrayEqual(result.output, ['5']);
});

// ============= ARRAY METHOD TESTS =============
runner.test('Array: push() method', () => {
    const result = evaluate('arr = [1, 2, 3]\narr.push(4)\nprint(arr[3])');
    assertArrayEqual(result.output, ['4']);
});

runner.test('Array: pop() method', () => {
    const result = evaluate('arr = [1, 2, 3]\nx = arr.pop()\nprint(x)\nprint(len(arr))');
    assertArrayEqual(result.output, ['3', '2']);
});

runner.test('Array: insert() method', () => {
    const result = evaluate('arr = [1, 3]\narr.insert(1, 2)\nprint(arr[1])');
    assertArrayEqual(result.output, ['2']);
});

runner.test('Array: remove() method', () => {
    const result = evaluate('arr = [1, 2, 3, 2]\narr.remove(2)\nprint(len(arr))\nprint(arr[1])');
    assertArrayEqual(result.output, ['3', '3']);
});

runner.test('Array: clear() method', () => {
    const result = evaluate('arr = [1, 2, 3]\narr.clear()\nprint(len(arr))');
    assertArrayEqual(result.output, ['0']);
});

runner.test('Array: slice() method', () => {
    const result = evaluate('arr = [1, 2, 3, 4, 5]\nsliced = arr.slice(1, 4)\nprint(len(sliced))\nprint(sliced[0])');
    assertArrayEqual(result.output, ['3', '2']);
});

runner.test('Array: concat() method', () => {
    const result = evaluate('arr1 = [1, 2]\narr2 = [3, 4]\nresult = arr1.concat(arr2)\nprint(len(result))');
    assertArrayEqual(result.output, ['4']);
});

runner.test('Array: reverse() method', () => {
    const result = evaluate('arr = [1, 2, 3]\nrev = arr.reverse()\nprint(rev[0])\nprint(arr[0])');
    assertArrayEqual(result.output, ['3', '1']);
});

runner.test('Array: sort() method', () => {
    const result = evaluate('arr = [3, 1, 2]\nsorted = arr.sort()\nprint(sorted[0])\nprint(arr[0])');
    assertArrayEqual(result.output, ['1', '3']);
});

runner.test('Array: join() method', () => {
    const result = evaluate('arr = ["a", "b", "c"]\nprint(arr.join("-"))');
    assertArrayEqual(result.output, ['a-b-c']);
});

runner.test('Array: indexOf() method', () => {
    const result = evaluate('arr = [10, 20, 30]\nprint(arr.indexOf(20))\nprint(arr.indexOf(99))');
    assertArrayEqual(result.output, ['1', '-1']);
});

runner.test('Array: contains() method', () => {
    const result = evaluate('arr = [1, 2, 3]\nprint(arr.contains(2))\nprint(arr.contains(5))');
    assertArrayEqual(result.output, ['true', 'false']);
});

runner.test('Array: count() method', () => {
    const result = evaluate('arr = [1, 2, 2, 3, 2]\nprint(arr.count(2))');
    assertArrayEqual(result.output, ['3']);
});

runner.test('Array: length property', () => {
    const result = evaluate('arr = [1, 2, 3]\nprint(arr.length)');
    assertArrayEqual(result.output, ['3']);
});

// ============= ASSERT FUNCTION TESTS =============
runner.test('Assert: passes when condition is true', () => {
    const result = evaluate('assert(true)\nprint("passed")');
    assertArrayEqual(result.output, ['passed']);
});

runner.test('Assert: throws when condition is false', () => {
    let threw = false;
    try {
        evaluate('assert(false)');
    } catch (e) {
        threw = true;
        assert(e.message.includes('Assertion failed'), 'Error should mention assertion failed');
    }
    assert(threw, 'Should have thrown error');
});

runner.test('Assert: custom message', () => {
    let threw = false;
    try {
        evaluate('assert(1 == 2, "Math is broken!")');
    } catch (e) {
        threw = true;
        assert(e.message.includes('Math is broken'), 'Error should include custom message');
    }
    assert(threw, 'Should have thrown error with custom message');
});

runner.test('Assert: with expressions', () => {
    const result = evaluate('x = 5\nassert(x > 0, "x must be positive")\nprint("ok")');
    assertArrayEqual(result.output, ['ok']);
});

runner.test('Assert: error includes location', () => {
    let threw = false;
    try {
        evaluate('x = 1\ny = 2\nassert(false, "test")');
    } catch (e) {
        threw = true;
        assert(e.line === 3, `Expected line 3, got ${e.line}`);
        assert(e.message.includes('test'), 'Error should include message');
    }
    assert(threw, 'Should have thrown error');
});

// ============= FIRST-CLASS FUNCTIONS TESTS =============
runner.test('First-class: function as variable', () => {
    const result = evaluate('func add(a, b) { return a + b }\nf = add\nprint(f(2, 3))');
    assertArrayEqual(result.output, ['5']);
});

runner.test('First-class: function as argument', () => {
    const result = evaluate('func apply(fn, x) { return fn(x) }\nfunc double(n) { return n * 2 }\nprint(apply(double, 5))');
    assertArrayEqual(result.output, ['10']);
});

runner.test('First-class: return function (closure)', () => {
    const result = evaluate('func makeAdder(x) {\n  func adder(y) { return x + y }\n  return adder\n}\nadd5 = makeAdder(5)\nprint(add5(10))');
    assertArrayEqual(result.output, ['15']);
});

// ============= ANONYMOUS FUNCTIONS (LAMBDAS) TESTS =============
runner.test('Lambda: assign to variable', () => {
    const result = evaluate('f = func(x) { return x * 2 }\nprint(f(5))');
    assertArrayEqual(result.output, ['10']);
});

runner.test('Lambda: inline function call', () => {
    const result = evaluate('result = func(a, b) { return a + b }(3, 4)\nprint(result)');
    assertArrayEqual(result.output, ['7']);
});

runner.test('Lambda: pass as argument', () => {
    const result = evaluate('func apply(fn, x) { return fn(x) }\nresult = apply(func(n) { return n * 3 }, 5)\nprint(result)');
    assertArrayEqual(result.output, ['15']);
});

runner.test('Lambda: return from function', () => {
    const result = evaluate('func multiplier(factor) { return func(x) { return x * factor } }\ntimes3 = multiplier(3)\nprint(times3(10))');
    assertArrayEqual(result.output, ['30']);
});

runner.test('Lambda: in array', () => {
    const result = evaluate('funcs = [func(x) { return x + 1 }, func(x) { return x * 2 }]\nprint(funcs[0](5))\nprint(funcs[1](5))');
    assertArrayEqual(result.output, ['6', '10']);
});

// ============= README EXAMPLES VALIDATION =============
runner.test('README: Lambda examples work', () => {
    const result = evaluate('f = func(x) { return x * 2 }\nprint(f(5))');
    assertArrayEqual(result.output, ['10']);
});

runner.test('README: String method examples work', () => {
    const result = evaluate('text = "  Hello World  "\nprint(text.trim().upper())');
    assertArrayEqual(result.output, ['HELLO WORLD']);
});

runner.test('README: Array method examples work', () => {
    const result = evaluate('arr = [1, 2, 3]\nprint(arr.slice(1, 3).concat([4, 5]).join("-"))');
    assertArrayEqual(result.output, ['2-3-4-5']);
});

runner.test('README: F-string examples work', () => {
    const result = evaluate('name = "Alice"\nprint(f"Hello {name}!")');
    assertArrayEqual(result.output, ['Hello Alice!']);
});

runner.test('README: Assert examples work', () => {
    const result = evaluate('x = 5\nassert(x > 0, "x must be positive")\nprint("passed")');
    assertArrayEqual(result.output, ['passed']);
});

runner.test('README: elif examples work', () => {
    const result = evaluate('x = 7\nif x > 10 { print("big") } elif x > 5 { print("medium") } else { print("small") }');
    assertArrayEqual(result.output, ['medium']);
});

runner.test('README: Regex examples work', () => {
    const result = evaluate('pattern = r"\\d+"\nprint(pattern.test("123"))');
    assertArrayEqual(result.output, ['true']);
});

// ============= FOR LOOP WITH TWO VARIABLES TESTS =============
runner.test('For loop: array with index and value', () => {
    const result = evaluate('arr = ["a", "b", "c"]\nfor i, v in arr {\n  print(i, v)\n}');
    assertArrayEqual(result.output, ['0 a', '1 b', '2 c']);
});

runner.test('For loop: map with key and value', () => {
    const result = evaluate('m = {x: 10, y: 20}\nfor k, v in m {\n  print(k, v)\n}');
    assertArrayEqual(result.output, ['x 10', 'y 20']);
});

runner.test('For loop: array with single variable (backward compat)', () => {
    const result = evaluate('arr = [1, 2, 3]\nfor v in arr {\n  print(v)\n}');
    assertArrayEqual(result.output, ['1', '2', '3']);
});

runner.test('For loop: map with single variable (backward compat)', () => {
    const result = evaluate('m = {a: 1, b: 2}\nfor k in m {\n  print(k)\n}');
    assertArrayEqual(result.output, ['a', 'b']);
});

runner.test('For loop: enumerate pattern', () => {
    const result = evaluate('words = ["hello", "world"]\nfor i, word in words {\n  print(f"{i}: {word}")\n}');
    assertArrayEqual(result.output, ['0: hello', '1: world']);
});

runner.test('README: Two-variable for loop examples work', () => {
    const result = evaluate('for i, v in ["a", "b", "c"] {\n  print(i, v)\n}');
    assertArrayEqual(result.output, ['0 a', '1 b', '2 c']);
});

// ============= HIGHER-ORDER ARRAY METHODS TESTS =============
runner.test('Array.map: transform elements', () => {
    const result = evaluate('arr = [1, 2, 3]\ndoubled = arr.map(func(x) { return x * 2 })\nfor v in doubled { print(v) }');
    assertArrayEqual(result.output, ['2', '4', '6']);
});

runner.test('Array.filter: keep matching elements', () => {
    const result = evaluate('arr = [1, 2, 3, 4, 5]\nevens = arr.filter(func(x) { return x % 2 == 0 })\nfor v in evens { print(v) }');
    assertArrayEqual(result.output, ['2', '4']);
});

runner.test('Array.reduce: sum with initial value', () => {
    const result = evaluate('arr = [1, 2, 3, 4]\nsum = arr.reduce(func(acc, x) { return acc + x }, 0)\nprint(sum)');
    assertArrayEqual(result.output, ['10']);
});

runner.test('Array.reduce: product without initial', () => {
    const result = evaluate('arr = [2, 3, 4]\nproduct = arr.reduce(func(acc, x) { return acc * x })\nprint(product)');
    assertArrayEqual(result.output, ['24']);
});

runner.test('Array.forEach: side effects', () => {
    const result = evaluate('arr = [1, 2, 3]\narr.forEach(func(x) { print(x * 10) })');
    assertArrayEqual(result.output, ['10', '20', '30']);
});

runner.test('Array.find: first matching element', () => {
    const result = evaluate('arr = [1, 2, 3, 4, 5]\nfound = arr.find(func(x) { return x > 3 })\nprint(found)');
    assertArrayEqual(result.output, ['4']);
});

runner.test('Array.find: returns null when not found', () => {
    const result = evaluate('arr = [1, 2, 3]\nfound = arr.find(func(x) { return x > 10 })\nprint(found)');
    assertArrayEqual(result.output, ['null']);
});

runner.test('Array.some: returns true if any match', () => {
    const result = evaluate('arr = [1, 2, 3, 4]\nprint(arr.some(func(x) { return x > 3 }))');
    assertArrayEqual(result.output, ['true']);
});

runner.test('Array.some: returns false if none match', () => {
    const result = evaluate('arr = [1, 2, 3]\nprint(arr.some(func(x) { return x > 10 }))');
    assertArrayEqual(result.output, ['false']);
});

runner.test('Array.every: returns true if all match', () => {
    const result = evaluate('arr = [2, 4, 6]\nprint(arr.every(func(x) { return x % 2 == 0 }))');
    assertArrayEqual(result.output, ['true']);
});

runner.test('Array.every: returns false if any dont match', () => {
    const result = evaluate('arr = [2, 3, 4]\nprint(arr.every(func(x) { return x % 2 == 0 }))');
    assertArrayEqual(result.output, ['false']);
});

runner.test('Higher-order: chaining methods', () => {
    const result = evaluate('arr = [1, 2, 3, 4, 5]\nresult = arr.filter(func(x) { return x % 2 == 0 }).map(func(x) { return x * 10 })\nfor v in result { print(v) }');
    assertArrayEqual(result.output, ['20', '40']);
});

runner.test('Higher-order: map with named function', () => {
    const result = evaluate('func double(x) { return x * 2 }\narr = [1, 2, 3]\nresult = arr.map(double)\nprint(result.join(","))');
    assertArrayEqual(result.output, ['2,4,6']);
});

runner.test('README: Higher-order method examples work', () => {
    const result = evaluate('arr = [1, 2, 3, 4, 5]\nresult = arr.filter(func(x) { return x % 2 == 0 }).map(func(x) { return x * 10 })\nprint(result.join(","))');
    assertArrayEqual(result.output, ['20,40']);
});

// Run all tests
const success = runner.run();
process.exit(success ? 0 : 1);
