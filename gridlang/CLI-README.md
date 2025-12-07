# GridLang CLI

Standalone Node.js command-line interpreter for GridLang scripts.

## Installation

No installation needed! Just run with Node.js:

```bash
node gridlang-cli.js script.grid
```

## Usage

### Basic Execution
```bash
# Run a script
node gridlang-cli.js example.grid

# Run with input file
node gridlang-cli.js examples/cli/solver.grid examples/cli/numbers.txt

# Pipe input
echo "42" | node gridlang-cli.js script.grid

# Test all features
node gridlang-cli.js examples/cli/comprehensive-test.grid
```

### Examples

**hello.grid**
```go
print("Hello from GridLang!")
x = 10
y = 20
sum = x + y
print(f"Result: {sum}")
```

**solver.grid** (Advent of Code style)
```go
data = read_file("input.txt")
lines = data.split("\n")

total = 0
for line in lines {
    if len(line) > 0 {
        num = int(line)
        total = total + num
    }
}

print(f"Answer: {total}")
```

## CLI-Specific Features

### File I/O (CLI-only)
- `read_file(filename)` - Read file contents as string
- `write_file(filename, content)` - Write string to file
- `file_exists(filename)` - Check if file exists

### Input/Output
- `print(...)` - Write to stdout
- `debug(...)` - Write to stderr (when debug enabled)
- `input(prompt)` - Read from stdin or input file

### What Works
✅ All core language features
✅ Variables, functions, loops, conditionals
✅ Arrays, Maps, Sets, Regex
✅ String operations, math
✅ File I/O (read/write)
✅ `break`, `continue`, ternary, elvis operators
✅ F-strings (variable interpolation only)

### What Doesn't Work
❌ `animate()` - requires browser
❌ Grid drawing (`rect`, `circle`, `line`, etc.)
❌ Canvas functions (`clear`, `color`, etc.)
❌ Mouse/keyboard input

## Perfect For
- Advent of Code solutions
- Data processing scripts
- File manipulation
- Algorithm testing
- CI/CD automation

## Error Handling

Errors print to stderr with line/column information:
```bash
node gridlang-cli.js bad.grid
RuntimeError at line 5, col 8: Undefined variable: foo
```

Exit codes:
- `0` - Success
- `1` - Error (parse error, runtime error, file not found)
