# Multi-Input File Example

This example demonstrates reading from multiple named input files in GridLang.

## Setup

Create three input files in the GridLang IDE:

**Input 1: "numbers"**
```
10
20
30
40
50
```

**Input 2: "words"**
```
apple
banana
cherry
date
```

**Input 3: "grid"**
```
1 2 3
4 5 6
7 8 9
```

## Example Code

```gridlang
# Read from different input files
print("=== Numbers ===")
nums = input_lines("numbers")
for n in nums {
    print(n)
}

print("\n=== Words ===")
words = input_lines("words")
for w in words {
    print(w)
}

print("\n=== Grid ===")
grid = input_grid("int", " ", "grid")
print("Grid dimensions:", len(grid), "x", len(grid[0]))
for row in grid {
    print(row)
}

# Compare data from multiple sources
print("\n=== Processing ===")
print("Total numbers:", len(nums))
print("Total words:", len(words))
print("Grid sum:", sum_grid(grid))

func sum_grid(g) {
    total = 0
    for row in g {
        for val in row {
            total = total + val
        }
    }
    return total
}
```

## Use Cases

1. **Advent of Code**: Test against multiple test inputs and real input
2. **Data Comparison**: Compare multiple datasets side-by-side
3. **Batch Processing**: Process multiple files in a loop
4. **Testing**: Separate test cases into different input files

## Loop Through Files

```gridlang
# Process multiple files dynamically
files = ["test1", "test2", "test3"]
for f in files {
    data = input_string(f)
    lines = len(input_lines(f))
    print(f"File {f}: {lines} lines")
}
```
