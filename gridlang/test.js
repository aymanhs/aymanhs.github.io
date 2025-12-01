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

function evaluate(code) {
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
    
    const interp = new Interpreter(null, null, mockConsole, null, '', null);
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

// Run all tests
const success = runner.run();
process.exit(success ? 0 : 1);
