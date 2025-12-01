# GridLang Testing & Benchmarking

This directory contains automated tests and benchmarks for GridLang.

## Running Tests

```bash
node test.js
```

Tests cover:
- ✅ Lexer (tokenization, keywords, operators, comments)
- ✅ Parser (expressions, statements, control flow, functions)
- ✅ Edge cases (deep nesting, large arrays, multiline code)

Example output:
```
🧪 GridLang Test Suite

============================================================
✓ Lexer: Tokenize numbers
✓ Lexer: Tokenize strings
✓ Parser: Parse variable assignment
✓ Parser: Parse arithmetic expression
...
============================================================

Results: 35 passed, 0 failed
Total: 35 tests
```

## Running Benchmarks

```bash
node benchmark.js
```

### Performance Baselines

Based on Node.js v22 benchmarks:

**Lexer Performance:**
- Small programs (10 lines): ~0.02ms (55k ops/sec)
- Medium programs (100 lines): ~0.1ms (10k ops/sec)
- Large programs (1000 lines): ~1ms (1k ops/sec)
- String-heavy code: ~0.18ms (5.5k ops/sec)
- Expression-heavy code: ~0.23ms (4.3k ops/sec)

**Parser Performance:**
- Simple assignments: ~0.16ms (6.2k ops/sec)
- Arithmetic expressions: ~0.14ms (7.1k ops/sec)
- Array literals: ~0.23ms (4.3k ops/sec)
- Function definitions: ~0.08ms (12.5k ops/sec)
- Control flow: ~0.16ms (6.2k ops/sec)
- Nested structures: ~0.005ms (200k ops/sec)
- Deep nesting (20 levels): ~0.014ms (71k ops/sec)

**Real-world Scenarios:**
- Input parsing: ~0.02ms (50k ops/sec)
- Grid iteration: ~0.04ms (25k ops/sec)
- 3D voxel setup: ~0.04ms (25k ops/sec)

These benchmarks show that GridLang can handle typical programs efficiently, with sub-millisecond parsing for most code.

Benchmarks measure:
- ⚡ Lexer performance (small/medium/large programs)
- ⚡ Parser performance (expressions, control flow, nesting)
- ⚡ Real-world patterns (input parsing, grid iteration, 3D)

Example output:
```
⚡ GridLang Benchmark Suite

================================================================================
Benchmark                                                Time      Ops/sec
================================================================================
Lexer: Small program (10 lines)                        0.234ms       4,274
Lexer: Medium program (100 lines)                      1.876ms         533
Parser: Simple assignments                             2.145ms         466
...
================================================================================
```

## Test Structure

### `test.js`
- Custom test runner (no external dependencies)
- Assertion helpers: `assert()`, `assertEqual()`, `assertArrayEqual()`
- Tests organized by component (Lexer, Parser, Stress)
- Returns exit code 0 on success, 1 on failure (CI-friendly)

### `benchmark.js`
- Custom benchmark framework
- Warmup iterations to stabilize performance
- Reports average time and operations per second
- Covers common use cases and edge cases

## Adding New Tests

```javascript
runner.test('Test description', () => {
    const ast = parse('your code here');
    assertEqual(ast[0].type, 'ExpectedType');
});
```

## Adding New Benchmarks

```javascript
suite.add('Benchmark name', () => {
    // Code to benchmark
    const ast = parse(code);
}, warmupIterations, totalIterations);
```

## CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: cd gridlang && node test.js

- name: Run benchmarks
  run: cd gridlang && node benchmark.js
```

## Performance Targets

Current targets (based on typical use):
- Lexer: > 1,000 ops/sec for 100-line programs
- Parser: > 500 ops/sec for 100-line programs
- End-to-end: < 10ms for typical user scripts

## Troubleshooting

**Tests fail with "Cannot find module"**
- Make sure `lexer.js` and `parser.js` exist in the same directory

**Benchmarks show inconsistent results**
- Close other applications
- Run multiple times and average
- Increase warmup iterations for better stability
