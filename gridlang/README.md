# GridLang 🎨

A fast scripting language with built-in 2D grid and 3D voxel rendering capabilities. Features Go-like syntax, real-time animations, and a modern IDE experience.

## Features

✅ **Go-like syntax** - Clean with `func` and braces  
✅ **Arithmetic operations** - `+`, `-`, `*`, `/`, `%`, `**`  
✅ **Compound assignments** - `+=`, `-=`, `*=`, `/=`, `%=`  
✅ **Multiple assignment** - Destructuring: `a, b, c = [1, 2, 3]`  
✅ **Arrays** - Including multi-dimensional: `[[1,2], [3,4]]`  
✅ **Maps/Objects** - JS-style: `{x: 10, y: 20}` with dot notation  
✅ **Grid object** - For 2D grids with visualization and pathfinding helpers  
✅ **Template strings** - Python f-strings: `f"Hello {name}!"`  
✅ **Functions** - With recursion support  
✅ **Control flow** - `if/elsif/else`, `for`, `while`  
✅ **2D Grid drawing** - Built-in canvas API  
✅ **3D Voxel rendering** - Three.js powered with batching  
✅ **Animation system** - 60 FPS animations with automatic optimization  
✅ **IDE features** - Syntax highlighting, autocomplete (Ctrl+Space), help (F1), line numbers  
✅ **Input system** - Multi-input support for Advent of Code problems  

## Quick Start

```bash
# Serve locally
python3 -m http.server 8000
# Open http://localhost:8000/gridlang.html
```

## Language Reference

### Variables & Types
```go
x = 10
name = "GridLang"
flag = true
```

### Arrays
```go
arr = [1, 2, 3, 4, 5]
matrix = [[1, 2], [3, 4]]
print(arr[0])
matrix[1][0] = 99
```

### Maps (Objects)
```go
# JS-style object syntax
person = {name: "John", age: 30}

# Access with dot notation or brackets
print(person.name)
print(person["age"])

# Assignment works both ways
person.age = 31
person["city"] = "NYC"
```

### Template Strings (F-Strings)
```go
# Python-style f-strings with variable interpolation
# IMPORTANT: No space between f and quote, use {var} not ${var}
name = "Alice"
age = 30
print(f"Hello {name}, you are {age} years old!")
# Output: "Hello Alice, you are 30 years old!"

# Supports dot notation for nested access
person = {name: "Bob", score: 100}
print(f"Player: {person.name}, Score: {person.score}")

# Escaped braces for literals
print(f"Use {{braces}} for literal braces")
# Output: "Use {braces} for literal braces"

# Works with single or double quotes
msg = f'Hello {name}!'

# COMMON MISTAKES:
# ❌ f "text"     - Space between f and quote
# ❌ f"${var}"    - Dollar sign (that's JavaScript, not Python)
# ✅ f"text"      - Correct
# ✅ f"{var}"     - Correct
```

### Functions
```go
func add(a, b) {
    return a + b
}

func factorial(n) {
    if n <= 1 {
        return 1
    }
    return n * factorial(n - 1)
}

# Anonymous functions (lambdas)
f = func(x) { return x * 2 }
print(f(5))  # 10

# Inline lambda
result = func(a, b) { return a + b }(3, 4)  # 7

# Pass lambda as argument
func apply(fn, x) { return fn(x) }
result = apply(func(n) { return n * 3 }, 5)  # 15

# Return lambda (closure)
func multiplier(factor) {
    return func(x) { return x * factor }
}
times3 = multiplier(3)
print(times3(10))  # 30
```

### Compound Assignment Operators
```go
# All standard compound assignment operators are supported
x = 10
x += 5   # x = x + 5  → x is now 15
x -= 3   # x = x - 3  → x is now 12
x *= 2   # x = x * 2  → x is now 24
x /= 4   # x = x / 4  → x is now 6
x %= 4   # x = x % 4  → x is now 2

# Works with array elements
arr = [10, 20, 30]
arr[0] += 5   # arr[0] is now 15
arr[1] *= 2   # arr[1] is now 40

# Works with object properties
obj = {x: 10, y: 20}
obj.x += 5    # obj.x is now 15
obj.y /= 2    # obj.y is now 10

# Can be used in complex expressions
count = 0
for i = 0; i < 10; i += 1 {
    count += i   # Accumulate sum
}
```

### Multiple Assignment (Destructuring)
```go
# Assign multiple variables at once from an array
a, b, c = [1, 2, 3]
print(a)  # 1
print(b)  # 2
print(c)  # 3

# From function return values
func getCoords() {
    return [10, 20]
}
x, y = getCoords()

# Swap values
a = 1
b = 2
temp = [b, a]
a, b = temp  # Now a=2, b=1

# Works with Grid.find()
grid = Grid([[".", "S"], [".", "."]])
x, y = grid.find(func(v) { return v == "S" })
print(f"Found at ({x}, {y})")  # Found at (1, 0)

# Fewer values assigns null to remaining variables
a, b, c = [1, 2]  # c becomes null
```

### Grid Object
```go
# Create a Grid from 2D array (useful for Advent of Code)
grid = Grid([
    [".", "#", "."],
    ["#", ".", "#"],
    [".", ".", "."]
])

# Grid properties
print(grid.width)   # 3
print(grid.height)  # 3
print(grid.diags)   # false (default: 4-directional)

# Get and set values
val = grid.get(1, 1)  # Get value at (1, 1)
grid.set(0, 0, "X")   # Set value at (0, 0)

# Check bounds
if grid.inBounds(x, y) {
    print(grid.get(x, y))
}

# Find specific value
pos = grid.find(func(v) { return v == "S" })
if pos != null {
    x, y = pos
    print(f"Start at ({x}, {y})")
}

# Count occurrences
wallCount = grid.count("#")

# Visit all cells
grid.visit(func(x, y, value) {
    print(f"Cell ({x}, {y}) = {value}")
})

# Visit neighbors with callback (4-directional by default)
grid.neighbors(1, 1, func(x, y, value) {
    print(f"Neighbor at ({x}, {y}) = {value}")
})

# Include diagonals (8-directional)
grid.diags = true
grid.neighbors(1, 1, func(x, y, value) {
    print(f"Neighbor at ({x}, {y}) = {value}")  # Now includes diagonals
})

# Visualize the grid (has sensible defaults)
grid.colorMap = {
    ".": "white",
    "#": "black",
    "S": "green",
    "E": "red"
}
grid.cellSize = 20  # Pixel size (default: 10)
grid.draw()  # Renders to canvas
```

### Control Flow
```go
# If statements
if x > 10 {
    print("Big")
} elsif x > 5 {
    print("Medium")
} else {
    print("Small")
}

# Multiple elsif branches
score = 75
if score >= 90 {
    print("A")
} elsif score >= 80 {
    print("B")
} elsif score >= 70 {
    print("C")
} else {
    print("F")
}

# For loops
for i in range(10) {
    print(i)
}

for item in [1, 2, 3] {
    print(item)
}

# For loop with index and value (enumerate)
for i, v in ["a", "b", "c"] {
    print(i, v)  # 0 a, 1 b, 2 c
}

# For loop over map keys and values
for k, v in {x: 10, y: 20} {
    print(k, v)  # x 10, y 20
}

# While loops
while x < 100 {
    x = x * 2
}
```

## Built-in Functions

### 2D Graphics
```go
init_2d(gridSize, cellSize)           # Initialize 2D grid mode
init_2d([rows, cols], cellSize)       # Non-square grid
set_cell(row, col, color)             # Color a grid cell
clear_canvas()                         # Clear the canvas

# Pixel-level drawing
set_pixel(x, y, color)                
draw_line(x1, y1, x2, y2, color, width)
draw_circle(x, y, radius, color, fill)
draw_rect(x, y, width, height, color, fill)
```

### 3D Graphics
```go
init_3d(voxelSize, spacing)           # Initialize 3D mode
set_voxel(x, y, z, color)            # Place a voxel
remove_voxel(x, y, z)                 # Remove a voxel
get_voxel(x, y, z)                    # Check if voxel exists
clear_3d()                            # Clear all voxels

# Manual batching (optional - animate() does this automatically)
begin_3d_batch()
end_3d_batch()
```

### Animation
```go
animate(callback, options)            # Start animation loop (60fps)
                                      # Callback receives elapsed time
                                      # Return false to stop
animate(callback, {                   # With options
    clear3d: true,                    # Auto-clear 3D scene
    batch3d: true                     # Auto-batch 3D updates
})
stop_animation()                      # Stop current animation

# Animation Recording
record_animation()                    # Start recording frames
save_animation_gif('file.gif', 33)    # Save as animated GIF (delay in ms)
stop_recording()                      # Stop recording
clear_recording()                     # Clear recorded frames
get_animation_frames()                # Get frame count & metadata
```

### Color Helpers
```go
rgb(r, g, b)                          # rgb(255, 0, 0) → "#ff0000"
hsl(h, s, l)                          # hsl(180, 70, 50) → "#26b8b8"
```

### Math
```go
abs(x)                                # Absolute value
sqrt(x)                               # Square root
pow(x, y)                             # x raised to y
floor(x)                              # Round down
ceil(x)                               # Round up
round(x)                              # Round to nearest
sin(x), cos(x), tan(x)               # Trigonometry (radians)
min(a, b, ...)                       # Minimum value
min(a, b, ...)                       # Minimum value
max(a, b, ...)                       # Maximum value
clamp(val, min, max)                  # Constrain val between min and max
lerp(start, end, t)                   # Linear interpolate between start and end
sign(x)                               # Returns 1, -1, or 0
random()                              # Random float [0, 1)
```

### Timing & Benchmarking
```go
time()                                # Current Unix timestamp (ms)
clock()                               # High-precision timer (ms)
benchmark(func, iterations)           # Measure execution time
assert(condition, message)            # Throw error if condition is false
```

**Example - Runtime checks:**
```go
# Validate assumptions
x = 5
assert(x > 0, "x must be positive")
assert(len(arr) == 10, "Expected 10 elements")

# Test your code
func add(a, b) { return a + b }
assert(add(2, 3) == 5, "add() broken")
print("All tests passed!")
```

### Input Data (for AoC)
```go
input_string()                        # Get raw input as string (from active input)
input_string("filename")              # Get raw input from named input file
input_lines()                         # Split input into line array (from active input)
input_lines("filename")               # Split named input into line array
input_grid()                          # Parse as 2D character grid (from active input)
input_grid("int")                     # Parse as 2D integer grid (auto-detect separator)
input_grid("float", ",")              # Parse as 2D float grid with comma separator
input_grid("char", "", "filename")    # Parse named input as character grid
```

**Example - Read multiple input files:**
```go
# Read from active input
data = input_string()

# Read from named inputs
test1 = input_string("test1")
test2 = input_string("test2")

# Process grid from specific file
grid = input_grid("int", " ", "puzzle_input")
```

### Utilities
```go
print(...)                            # Print to console (blue)
debug(...)                            # Print only when debug enabled (grey)
set_debug(enabled)                    # Enable/disable debug output
range(n)                              # [0, 1, ..., n-1]
range(start, end)                     # [start, ..., end-1]
len(arr)                              # Length of array/map/string
add(arr, val)                         # Add element to array (push)
insert(index, value)                # Insert element at index (mutates)
remove(value)                         # Remove first occurrence of value (mutates)
removeAt(index)                       # Remove element at index (mutates). Returns removed value.
clear()                               # Remove all elements
slice(start, end)                     # Extract subarray from start to end (returns new array)
concat(other)                         # Combine two arrays (returns new array)
merge(other)                          # Alias for concat (returns new array)
diff(other)                           # Set difference (this - other). Returns new array
intersect(other)                      # Set intersection. Returns new unique array
union(other)                          # Set union. Returns new unique array
reverse()                             # Reverse array order (returns new array)
sort(comparator=null)                 # Sort array (returns new array)
join(separator)                       # Join elements into string
indexOf(value)                        # Find first index of value
contains(value)                       # Check if array contains value
count(value)                          # Count occurrences of value
```

### Type Conversion
```go
str(val)                              # Convert to string
int(val)                              # Convert to integer (floors floats, parses strings)
float(val)                            # Convert to float
bool(val)                             # Convert to boolean (truthy check)
```

### String Functions
```go
substr(str, start)                    # Extract from start to end
substr(str, start, length)            # Extract substring of given length
slice(str, start)                     # Slice from start to end
slice(str, start, end)                # Slice from start to end (exclusive)
split(str, separator)                 # Split string into array
join(arr, separator)                  # Join array into string
upper(str)                            # Convert to uppercase
lower(str)                            # Convert to lowercase
trim(str)                             # Remove leading/trailing whitespace
replace(str, search, replacement)     # Replace all occurrences
starts_with(str, prefix)              # Check if string starts with prefix
ends_with(str, suffix)                # Check if string ends with suffix
contains(str, item)                   # Check if string/array contains item
index_of(str, item)                   # Find index of item (-1 if not found)
char_at(str, index)                   # Get character at index
char_code(str, index)                 # Get ASCII/Unicode code at index
from_char_code(code)                  # Create character from code
repeat(str, count)                    # Repeat string n times
reverse(str)                          # Reverse string or array
```

### String Methods (OOP style)
```go
# Strings support method-call syntax with camelCase names
text = "  Hello World  "
text.upper()                          # "  HELLO WORLD  "
text.lower()                          # "  hello world  "
text.trim()                           # "Hello World"
text.trim().upper()                   # "HELLO WORLD" - methods chain!

# String searching and testing
"hello".startsWith("hel")             # true
"hello".endsWith("lo")                # true
"hello world".contains("world")       # true
"hello".indexOf("l")                  # 2 (first occurrence)

# String manipulation (returns new strings)
"hi".replace("i", "ey")               # "hey"
"a,b,c".split(",")                    # ["a", "b", "c"]
"hello".substring(1, 4)               # "ell"
"hello".slice(-2)                     # "lo" - negative indices supported!

# String properties
"hello".length                        # 5 (property, not method call)
```

### Array Methods (OOP style)
```go
# Arrays support method-call syntax
arr = [1, 2, 3]

# Mutating methods (modify in place)
arr.push(4)                           # arr is now [1, 2, 3, 4]
arr.pop()                             # returns 4, arr is now [1, 2, 3]
arr.insert(1, 99)                     # arr is now [1, 99, 2, 3] (uses add())
arr.remove(99)                        # arr is now [1, 2, 3] (remove by value)
arr.removeAt(1)                       # removes at index (uses remove())
arr.clear()                           # arr is now []

# Non-mutating methods (return new arrays)
arr = [1, 2, 3]
arr.slice(1, 3)                       # [2, 3] - arr unchanged
arr.concat([4, 5])                    # [1, 2, 3, 4, 5] - arr unchanged
arr.reverse()                         # [3, 2, 1] - arr unchanged
[3, 1, 2].sort()                      # [1, 2, 3] - sorts numbers correctly!

# Custom sort with comparator function
[3, 1, 2, 5, 4].sort(func(a, b) { return b - a })  # [5, 4, 3, 2, 1] - descending

# Sort objects by property
people = [{name: "Bob", age: 30}, {name: "Alice", age: 25}]
people.sort(func(a, b) { return a.age - b.age })  # Sort by age ascending

# Multi-field sort
data.sort(func(a, b) {
    if a.priority != b.priority { return b.priority - a.priority }
    if a.name < b.name { return -1 }
    return 1
})

# Array searching
arr.indexOf(2)                        # 1
arr.contains(2)                       # true
[1, 2, 2, 3].count(2)                 # 2 (occurrences)

# Other array methods
["a", "b", "c"].join("-")             # "a-b-c"
[1, 2, 3].length                      # 3 (property, not method call)
```

### Higher-Order Array Methods
```go
# map - transform each element
arr = [1, 2, 3, 4]
doubled = arr.map(func(x) { return x * 2 })  # [2, 4, 6, 8]

# filter - keep elements matching predicate
evens = arr.filter(func(x) { return x % 2 == 0 })  # [2, 4]

# reduce - accumulate to single value
sum = arr.reduce(func(acc, x) { return acc + x }, 0)  # 10
product = [2, 3, 4].reduce(func(acc, x) { return acc * x })  # 24 (no initial)

# forEach - iterate with side effects
arr.forEach(func(x) { print(x) })

# find - first element matching predicate
found = arr.find(func(x) { return x > 2 })  # 3 (returns null if not found)

# some - true if any element matches
hasEven = arr.some(func(x) { return x % 2 == 0 })  # true

# every - true if all elements match
allPositive = arr.every(func(x) { return x > 0 })  # true

# Method chaining
result = [1, 2, 3, 4, 5]
    .filter(func(x) { return x % 2 == 0 })
    .map(func(x) { return x * 10 })  # [20, 40]

# With named functions
func double(x) { return x * 2 }
arr.map(double)  # [2, 4, 6, 8]
```

### Regular Expressions
```go
# Create regex with r"..." literal (raw string - no escape processing)
pattern = r"\d+"                      # Match one or more digits
email = r"[\w.]+@[\w.]+\.[a-z]+"     # Match email pattern

# Regex methods
pattern.test(str)                     # Returns true/false if pattern matches
pattern.match(str)                    # Returns matched string or null
pattern.groups(str)                   # Returns array of capture groups or null
pattern.find_all(str)                 # Returns array of all matched strings
pattern.replace(str, replacement)     # Replace all matches with string
pattern.split(str)                    # Split string by pattern

# Named capture groups - groups() returns object instead of array
date_pattern = r"(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})"
groups = date_pattern.groups("2025-12-01")
if groups {
    print(groups.year)                 # "2025" - access by name!
    print(groups.month)                # "12"
    print(groups["day"])               # "01" - bracket notation works too
}

# Example: Parse Advent of Code input
line = "Game 123: 4 red, 5 blue"
game_pattern = r"Game (\d+): (.+)"
groups = game_pattern.groups(line)
if groups {
    game_id = int(groups[0])           # Positional groups are arrays
    colors = groups[1]
}

# Example: Parse coordinates with named groups
coords = r"x=(?<x>-?\d+), y=(?<y>-?\d+)"
text = "Point at x=10, y=-20"
groups = coords.groups(text)
if groups {
    x = int(groups.x)                  # Named access
    y = int(groups.y)
    print("Position:", x, y)
}

# Example: Extract all numbers
numbers = r"\d+"
text = "Order #123 costs $45.99"
for match in numbers.find_all(text) {
    print(match)                       # "123", "45", "99"
}

# Example: Replace and split
r"\d+".replace("a1b2c3", "X")         # "aXbXcX"
r"\s+".split("hello  world")          # ["hello", "world"]

# Note: null is falsy, so you can use if match { ... }
if coords.match("Point: 10,20") {
    groups = coords.groups("Point: 10,20")
    # ...
}
```

## Examples

### 2D Checkerboard
```go
init_2d(20, 20)

for i in range(20) {
    for j in range(20) {
        if (i + j) % 2 == 0 {
            set_cell(i, j, "#4ec9b0")
        } else {
            set_cell(i, j, "#ce9178")
        }
    }
}
```

### 2D Wave Animation
```go
init_2d(30, 20)

func draw_wave(t) {
    clear_canvas()
    
    for x in range(30) {
        wave_height = sin(x * 0.3 + t * 2) * 5 + 15
        y = floor(wave_height)
        
        for dy in range(y, 30) {
            brightness = 40 + dy * 2
            set_cell(dy, x, hsl(200, 80, brightness))
        }
    }
}

animate(draw_wave, 30)
```

### Bouncing Ball with State
```go
init_2d(20, 15)

state = {x: 10.0, y: 5.0, vx: 0.3, vy: 0.2, gravity: 0.02}

func draw_frame(t) {
    clear_canvas()
    
    # Update physics with dot notation
    state.vy = state.vy + state.gravity
    state.x = state.x + state.vx
    state.y = state.y + state.vy
    
    # Bounce off walls
    if state.x < 0 or state.x >= 20 {
        state.vx = -state.vx
        state.x = max(0, min(19, state.x))
    }
    if state.y >= 20 {
        state.vy = -state.vy * 0.8
        state.y = 20
    }
    
    # Draw ball
    ball_x = floor(state.x)
    ball_y = floor(state.y)
    set_cell(ball_y, ball_x, "#ff6b6b")
}

animate(draw_frame, 60)
```

### 3D Cube
```go
init_3d(1, 0.1)

size = 5
for x in range(size) {
    for y in range(size) {
        for z in range(size) {
            # Color based on position
            h = (x + y + z) * 360 / (size * 3)
            set_voxel(x, y, z, hsl(h, 70, 50))
        }
    }
}
```

### 3D Wave Animation
```go
init_3d(0.5, 0.05)

func draw_wave(t) {
    size = 20
    
    for x in range(size) {
        for z in range(size) {
            # Calculate wave height
            dist = sqrt((x - size/2) ** 2 + (z - size/2) ** 2)
            height = sin(dist * 0.5 - t * 3) * 3 + 5
            y = floor(height)
            
            # Color based on height
            h = (y * 30 + t * 50) % 360
            set_voxel(x, y, z, hsl(h, 70, 60))
        }
    }
}

animate(draw_wave, 30, {clear3d: true, batch3d: true})
```

## IDE Features

- **F1** or **Ctrl+/** - Open help with searchable builtin functions
- **Ctrl+Space** - Autocomplete with function hints
- **Syntax highlighting** - Color-coded with line numbers
- **Error navigation** - Click errors to jump to line
- **Example dropdown** - Pre-built examples to learn from
- **Mode selector** - Switch between 2D, 3D, and Console-only modes
- **Input panels** - Multiple named inputs for AoC problems
- **Auto-save** - Code and inputs persist in localStorage
- **Share button (🔗)** - Generate compressed URL to share your code (60-80% compression)

## Sharing Code

Click the **🔗 Share** button in the toolbar to generate a shareable URL:

```
https://example.com/gridlang/gridlang.html?code=H4sIAAAAAAAA...
```

- **Compressed**: Uses gzip + base64 encoding (typically 60-80% smaller)
- **No backend**: All compression happens client-side
- **One-click copy**: URL is automatically copied to clipboard
- **Auto-load**: Opening a shared URL automatically loads the code
- **Privacy**: No data is stored on any server

Example workflow:
1. Write your GridLang code
2. Click 🔗 Share button
3. Copy the URL
4. Share with others via email, chat, GitHub issues, etc.
5. Recipients can run your code instantly by opening the link

## Architecture

- **Lexer** (`lexer.js`) - Full tokenization with 50+ token types
- **Parser** (`parser.js`) - Recursive descent parser generating AST
- **Interpreter** (`gridlang.js`) - Tree-walk interpreter with environment scoping
- **3D Renderer** (`renderer3d.js`) - Three.js with InstancedMesh batching
- **UI** (`ui.js`) - Editor, autocomplete, help system, examples
- **Runtime** - Pure JavaScript, runs in browser
- **Graphics** - HTML5 Canvas (2D) + Three.js r128 (3D)

## Performance

- **2D animations** - 60 FPS on large grids
- **3D animations** - 30+ FPS with 400+ voxels using batching
- **Startup** - Instant, no build step required

## License

Public domain - do whatever you want with it!
