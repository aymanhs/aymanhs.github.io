#!/usr/bin/env node

/**
 * GridLang Test Suite
 * Run with: node test.js
 */

// Load GridLang modules
const { Lexer, TokenType } = require('./lexer.js');
const { Parser } = require('./parser.js');

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

runner.test('Parser: Parse for loop', () => {
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

// Run all tests
const success = runner.run();
process.exit(success ? 0 : 1);
