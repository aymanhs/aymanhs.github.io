#!/usr/bin/env node

/**
 * GridLang Benchmark Suite
 * Run with: node benchmark.js
 */

const fs = require('fs');
const vm = require('vm');

// Load GridLang modules  
const lexerModule = require('./lexer.js');
const parserModule = require('./parser.js');

const Lexer = lexerModule.Lexer;
const Parser = parserModule.Parser;

// Benchmark framework
class Benchmark {
    constructor(name, fn, warmup = 3, iterations = 100) {
        this.name = name;
        this.fn = fn;
        this.warmup = warmup;
        this.iterations = iterations;
    }

    run() {
        // Warmup
        for (let i = 0; i < this.warmup; i++) {
            this.fn();
        }

        // Measure
        const start = Date.now();
        for (let i = 0; i < this.iterations; i++) {
            this.fn();
        }
        const end = Date.now();

        const totalTime = end - start;
        const avgTime = totalTime / this.iterations;
        const opsPerSecond = Math.round(1000 / avgTime);

        return {
            name: this.name,
            totalTime,
            avgTime,
            opsPerSecond,
            iterations: this.iterations
        };
    }
}

class BenchmarkSuite {
    constructor() {
        this.benchmarks = [];
    }

    add(name, fn, warmup = 3, iterations = 100) {
        this.benchmarks.push(new Benchmark(name, fn, warmup, iterations));
    }

    run() {
        console.log('\n⚡ GridLang Benchmark Suite\n');
        console.log('='.repeat(80));
        console.log(`${'Benchmark'.padEnd(50)} ${'Time'.padStart(12)} ${'Ops/sec'.padStart(12)}`);
        console.log('='.repeat(80));

        const results = [];
        for (const bench of this.benchmarks) {
            const result = bench.run();
            results.push(result);

            console.log(
                `${result.name.padEnd(50)} ` +
                `${result.avgTime.toFixed(3).padStart(10)}ms ` +
                `${result.opsPerSecond.toLocaleString().padStart(12)}`
            );
        }

        console.log('='.repeat(80));
        console.log(`\nTotal benchmarks: ${this.benchmarks.length}\n`);

        return results;
    }
}

// Helper to parse code
function parse(code) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
}

// Create benchmark suite
const suite = new BenchmarkSuite();

// ========== LEXER BENCHMARKS ==========
suite.add('Lexer: Small program (10 lines)', () => {
    const code = `
x = 10
y = 20
z = x + y
print(z)
for i in range(5) {
    print(i)
}
    `;
    const lexer = new Lexer(code);
    lexer.tokenize();
}, 5, 1000);

suite.add('Lexer: Medium program (100 lines)', () => {
    const lines = [];
    for (let i = 0; i < 100; i++) {
        lines.push(`x${i} = ${i}`);
    }
    const code = lines.join('\n');
    const lexer = new Lexer(code);
    lexer.tokenize();
}, 3, 100);

suite.add('Lexer: Large program (1000 lines)', () => {
    const lines = [];
    for (let i = 0; i < 1000; i++) {
        lines.push(`x${i} = ${i}`);
    }
    const code = lines.join('\n');
    const lexer = new Lexer(code);
    lexer.tokenize();
}, 2, 10);

suite.add('Lexer: String-heavy code', () => {
    const code = Array.from({ length: 100 }, (_, i) => 
        `s${i} = "This is string number ${i}"`
    ).join('\n');
    const lexer = new Lexer(code);
    lexer.tokenize();
}, 3, 100);

suite.add('Lexer: Expression-heavy code', () => {
    const code = Array.from({ length: 50 }, (_, i) => 
        `x${i} = (a + b) * (c - d) / (e + f) ** 2`
    ).join('\n');
    const lexer = new Lexer(code);
    lexer.tokenize();
}, 3, 100);

// ========== PARSER BENCHMARKS ==========
suite.add('Parser: Simple assignments', () => {
    const code = Array.from({ length: 100 }, (_, i) => `x${i} = ${i}`).join('\n');
    parse(code);
}, 3, 100);

suite.add('Parser: Arithmetic expressions', () => {
    const code = Array.from({ length: 50 }, (_, i) => 
        `x${i} = ${i} + ${i+1} * ${i+2} - ${i+3}`
    ).join('\n');
    parse(code);
}, 3, 100);

suite.add('Parser: Array literals', () => {
    const code = Array.from({ length: 50 }, (_, i) => 
        `arr${i} = [${i}, ${i+1}, ${i+2}, ${i+3}, ${i+4}]`
    ).join('\n');
    parse(code);
}, 3, 100);

suite.add('Parser: Function definitions', () => {
    const code = Array.from({ length: 20 }, (_, i) => 
        `func f${i}(x) { return x * ${i} }`
    ).join('\n');
    parse(code);
}, 3, 100);

suite.add('Parser: Control flow', () => {
    const code = Array.from({ length: 20 }, (_, i) => 
        `if x > ${i} { y = ${i} } else { y = ${i+1} }`
    ).join('\n');
    parse(code);
}, 3, 100);

suite.add('Parser: Nested structures', () => {
    const code = 'matrix = [[1,2,3],[4,5,6],[7,8,9]]';
    parse(code);
}, 5, 1000);

suite.add('Parser: Deep nesting (20 levels)', () => {
    let code = 'x = ';
    for (let i = 0; i < 20; i++) code += '(';
    code += '1';
    for (let i = 0; i < 20; i++) code += ')';
    parse(code);
}, 5, 500);

// ========== ALGORITHM BENCHMARKS ==========
suite.add('Algorithm: Fibonacci (iterative)', () => {
    const code = `
func fib(n) {
    if n <= 1 {
        return n
    }
    a = 0
    b = 1
    for i in range(2, n + 1) {
        temp = a + b
        a = b
        b = temp
    }
    return b
}
result = fib(20)
    `;
    const ast = parse(code);
    // Note: Can't actually run without full interpreter setup
}, 3, 50);

suite.add('Algorithm: Factorial (recursive)', () => {
    const code = `
func factorial(n) {
    if n <= 1 {
        return 1
    }
    return n * factorial(n - 1)
}
result = factorial(10)
    `;
    const ast = parse(code);
}, 3, 50);

// ========== STRING OPERATIONS ==========
suite.add('String: Split and join', () => {
    const code = `
text = "hello,world,foo,bar,baz"
parts = split(text, ",")
result = join(parts, "-")
    `;
    parse(code);
}, 5, 500);

suite.add('String: Multiple operations', () => {
    const code = `
text = "  Hello World  "
text = trim(text)
text = lower(text)
text = replace(text, " ", "_")
parts = split(text, "_")
    `;
    parse(code);
}, 5, 500);

// ========== REAL-WORLD PATTERNS ==========
suite.add('Real-world: Input parsing', () => {
    const code = `
lines = input_lines()
total = 0
for line in lines {
    parts = split(line, " ")
    num = int(parts[0])
    total = total + num
}
    `;
    parse(code);
}, 3, 200);

suite.add('Real-world: Grid iteration', () => {
    const code = `
init_2d(20, 20)
for i in range(20) {
    for j in range(20) {
        if (i + j) % 2 == 0 {
            set_cell(i, j, "#ff0000")
        } else {
            set_cell(i, j, "#0000ff")
        }
    }
}
    `;
    parse(code);
}, 3, 100);

suite.add('Real-world: 3D voxel setup', () => {
    const code = `
init_3d(1, 1)
for x in range(10) {
    for y in range(10) {
        for z in range(10) {
            if (x + y + z) % 3 == 0 {
                set_voxel(x, y, z, rgb(x * 25, y * 25, z * 25))
            }
        }
    }
}
    `;
    parse(code);
}, 3, 50);

// Run benchmarks
suite.run();
