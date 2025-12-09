const { performance } = require('perf_hooks');

// Load implementations
const { Lexer } = require('./lexer.js');
const { Parser } = require('./parser.js');
const { Interpreter } = require('./gridlang.js');
const { Compiler } = require('./bytecode.js');
const { VM } = require('./vm.js');

// Benchmark wrapper
function benchmark(runFn, code, runs = 5) {
    const times = [];
    let result = null;
    
    for (let i = 0; i < runs; i++) {
        const start = performance.now();
        try {
            result = runFn(code);
        } catch (e) {
            return { error: e.message };
        }
        const end = performance.now();
        times.push(end - start);
    }
    
    return {
        times,
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        result
    };
}

// Create run functions (including compilation time)
function runOld(code) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const interpreter = new Interpreter();
    return interpreter.run(ast);
}

function runVM(code) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const compiler = new Compiler();
    const chunk = compiler.compile(ast);
    const vm = new VM();
    return vm.run(chunk);
}

// Benchmark execution only (compile once, run multiple times)
function benchmarkExecOnly(runFn, prepFn, code, runs = 5) {
    // Compile once
    const prepared = prepFn(code);
    
    const times = [];
    let result = null;
    
    for (let i = 0; i < runs; i++) {
        const start = performance.now();
        try {
            result = runFn(prepared);
        } catch (e) {
            return { error: e.message };
        }
        const end = performance.now();
        times.push(end - start);
    }
    
    return {
        times,
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        result
    };
}

function prepOld(code) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
}

function runOldExec(ast) {
    const interpreter = new Interpreter();
    return interpreter.run(ast);
}

function prepVM(code) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const compiler = new Compiler();
    return compiler.compile(ast);
}

function runVMExec(chunk) {
    const vm = new VM();
    return vm.run(chunk);
}

// Benchmark test cases
const benchmarks = [
    {
        name: "Simple Loop - Sum 1 to 10000",
        code: `sum = 0
for i in range(10001) {
    sum += i
}
sum`
    },
    {
        name: "Nested Loops - 200x200 iterations",
        code: `count = 0
for i in range(200) {
    for j in range(200) {
        count += 1
    }
}
count`
    },
    {
        name: "Array Operations - 5000 elements",
        code: `arr = []
for i in range(5000) {
    arr.push(i)
}
sum = 0
for x in arr {
    sum += x
}
sum`
    },
    {
        name: "Fibonacci Recursive (n=20)",
        code: `func fib(n) {
    if n <= 1 {
        return n
    }
    return fib(n - 1) + fib(n - 2)
}
fib(20)`
    },
    {
        name: "Factorial Recursive (n=1000)",
        code: `func factorial(n) {
    if n <= 1 {
        return 1
    }
    return n * factorial(n - 1)
}
factorial(1000)`
    },
    {
        name: "String Operations - 2000 concatenations",
        code: `s = ""
for i in range(2000) {
    s += str(i)
}
len(s)`
    },
    {
        name: "Map Operations - 3000 insertions/lookups",
        code: `m = {}
for i in range(3000) {
    m[str(i)] = i * 2
}
sum = 0
for i in range(3000) {
    sum += m[str(i)]
}
sum`
    },
    {
        name: "Math Heavy - 5000 iterations",
        code: `result = 0
for i in range(1, 5001) {
    result += sqrt(i) * pow(i, 0.5) + abs(sin(i))
}
result`
    },
    {
        name: "Conditional Heavy - 10000 iterations",
        code: `count = 0
for i in range(10000) {
    if i % 2 == 0 {
        if i % 3 == 0 {
            count += 3
        } else {
            count += 2
        }
    } else {
        if i % 5 == 0 {
            count += 5
        } else {
            count += 1
        }
    }
}
count`
    },
    {
        name: "Function Calls - 10000 iterations",
        code: `func add(a, b) {
    return a + b
}
func multiply(a, b) {
    return a * b
}
result = 0
for i in range(10000) {
    result = add(result, multiply(i, 2))
}
result`
    }
];

function runBenchmark(code, benchRuns = 5) {
    // Run on old interpreter (with compilation)
    const oldResult = benchmark(runOld, code, benchRuns);
    
    // Run on VM (with compilation)
    const vmResult = benchmark(runVM, code, benchRuns);
    
    // Run execution-only benchmarks
    const oldExecResult = benchmarkExecOnly(runOldExec, prepOld, code, benchRuns);
    const vmExecResult = benchmarkExecOnly(runVMExec, prepVM, code, benchRuns);
    
    return { oldResult, vmResult, oldExecResult, vmExecResult };
}

console.log('🏁 GridLang Performance Benchmark: Old Interpreter vs VM\n');
console.log('=' .repeat(80));

const results = [];

for (const benchmark of benchmarks) {
    console.log(`\n📊 ${benchmark.name}`);
    console.log('-'.repeat(80));
    
    const { oldResult, vmResult, oldExecResult, vmExecResult } = runBenchmark(benchmark.code);
    
    if (oldResult.error) {
        console.log(`❌ Old: ERROR - ${oldResult.error}`);
    } else {
        console.log(`   Old (full):     ${oldResult.avg.toFixed(2)}ms (min: ${oldResult.min.toFixed(2)}ms, max: ${oldResult.max.toFixed(2)}ms)`);
        console.log(`   Old (exec):     ${oldExecResult.avg.toFixed(2)}ms (min: ${oldExecResult.min.toFixed(2)}ms, max: ${oldExecResult.max.toFixed(2)}ms)`);
    }
    
    if (vmResult.error) {
        console.log(`❌ VM:  ERROR - ${vmResult.error}`);
    } else {
        console.log(`   VM  (full):     ${vmResult.avg.toFixed(2)}ms (min: ${vmResult.min.toFixed(2)}ms, max: ${vmResult.max.toFixed(2)}ms)`);
        console.log(`   VM  (exec):     ${vmExecResult.avg.toFixed(2)}ms (min: ${vmExecResult.min.toFixed(2)}ms, max: ${vmExecResult.max.toFixed(2)}ms)`);
    }
    
    if (!oldExecResult.error && !vmExecResult.error) {
        const speedup = oldExecResult.avg / vmExecResult.avg;
        const percentage = ((oldExecResult.avg - vmExecResult.avg) / oldExecResult.avg * 100);
        
        if (speedup > 1) {
            console.log(`   🚀 VM is ${speedup.toFixed(2)}x faster (${percentage.toFixed(1)}% improvement)`);
        } else {
            console.log(`   ⚠️  VM is ${(1/speedup).toFixed(2)}x slower (${(-percentage).toFixed(1)}% regression)`);
        }
        
        results.push({
            name: benchmark.name,
            oldAvg: oldExecResult.avg,
            vmAvg: vmExecResult.avg,
            speedup: speedup
        });
    }
}

console.log('\n' + '='.repeat(80));
console.log('📈 Summary\n');

if (results.length > 0) {
    const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
    const minSpeedup = Math.min(...results.map(r => r.speedup));
    const maxSpeedup = Math.max(...results.map(r => r.speedup));
    
    console.log(`Average Speedup: ${avgSpeedup.toFixed(2)}x`);
    console.log(`Best Case:       ${maxSpeedup.toFixed(2)}x`);
    console.log(`Worst Case:      ${minSpeedup.toFixed(2)}x`);
    
    console.log('\n🏆 Fastest Improvements:');
    const sorted = [...results].sort((a, b) => b.speedup - a.speedup).slice(0, 5);
    sorted.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.name}: ${r.speedup.toFixed(2)}x faster`);
    });
    
    console.log('\n⚡ Category Analysis:');
    const recursive = results.filter(r => r.name.includes('Recursive'));
    const loops = results.filter(r => r.name.includes('Loop') || r.name.includes('iterations'));
    const operations = results.filter(r => r.name.includes('Operations') || r.name.includes('Heavy'));
    
    if (recursive.length > 0) {
        const recAvg = recursive.reduce((sum, r) => sum + r.speedup, 0) / recursive.length;
        console.log(`   Recursion:  ${recAvg.toFixed(2)}x average speedup`);
    }
    if (loops.length > 0) {
        const loopAvg = loops.reduce((sum, r) => sum + r.speedup, 0) / loops.length;
        console.log(`   Loops:      ${loopAvg.toFixed(2)}x average speedup`);
    }
    if (operations.length > 0) {
        const opAvg = operations.reduce((sum, r) => sum + r.speedup, 0) / operations.length;
        console.log(`   Operations: ${opAvg.toFixed(2)}x average speedup`);
    }
}

console.log('\n' + '='.repeat(80));
