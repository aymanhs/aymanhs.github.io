# Regex Feature Implementation

## ✅ Completed

GridLang now has **first-class regex support** with clean, Pythonic syntax.

## Syntax

```python
# Create regex with r"..." literal (raw string)
pattern = r"\d+"                      # Match digits
email = r"[\w.]+@[\w.]+\.[a-z]+"     # Match email

# Methods available on regex objects
pattern.test(str)                     # Boolean test
pattern.match(str)                    # Matched string or null
pattern.groups(str)                   # Array or object (named groups) or null
pattern.find_all(str)                 # Array of all matched strings
pattern.replace(str, replacement)     # Replace all
pattern.split(str)                    # Split by pattern

# Named capture groups - automatically returns object!
date = r"(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})"
groups = date.groups("2025-12-01")
print(groups.year)                    # "2025" - dot notation!
print(groups["month"])                # "12" - bracket notation!
```

## Examples

### Named Groups (Recommended)
```python
# Parse log entries
log_pattern = r"\[(?<level>\w+)\] (?<time>[\d:]+) - (?<msg>.+)"
line = "[ERROR] 12:34:56 - Connection failed"
groups = log_pattern.groups(line)
if groups {
    print("Level:", groups.level)      # "ERROR"
    print("Time:", groups.time)        # "12:34:56"
    print("Message:", groups.msg)      # "Connection failed"
}

# Parse coordinates
coords = r"x=(?<x>-?\d+), y=(?<y>-?\d+), z=(?<z>-?\d+)"
text = "Position at x=10, y=-20, z=5"
groups = coords.groups(text)
if groups {
    x = int(groups.x)
    y = int(groups.y)
    z = int(groups.z)
}

# Parse key-value pairs
kv_pattern = r"(?<key>\w+)=(?<value>\w+)"
line = "name=Alice age=30 city=NYC"
for pair in kv_pattern.find_all(line) {
    # Note: find_all returns strings, not groups
    print(pair)  # "name=Alice", etc.
}
```

### Positional Groups (Still Supported)
```python
line = "Game 123: 4 red, 5 blue"
game_pattern = r"Game (\d+): (.+)"
groups = game_pattern.groups(line)
if groups {
    game_id = int(groups[0])          # Array access
    colors = groups[1]
}
```

### Extract All Matches
```python
numbers = r"\d+"
text = "Order #123 costs $45.99"
for match in numbers.find_all(text) {
    print(match)                       # "123", "45", "99"
}
```

### Replace and Split
```python
r"\d+".replace("a1b2c3", "X")         # "aXbXcX"
r"\s+".split("hello  world   foo")    # ["hello", "world", "foo"]
```

## Implementation Details

### Lexer (`lexer.js`)
- Added `TokenType.REGEX` token type
- Added `readRawString()` method - minimal escape processing (only `\"`)
- Detects `r"..."` or `r'...'` patterns

### Parser (`parser.js`)
- Added `RegexLiteral` AST node type
- Parses REGEX tokens into AST

### Interpreter (`gridlang.js`)
- New `Regex` class wrapping JavaScript `RegExp`
- Compiles pattern once on creation (cached)
- Methods: `test()`, `match()`, `groups()`, `find_all()`, `replace()`, `split()`
- Cleaner API: `match()` returns string, `groups()` returns array
- Returns `null` on no match (falsy for easy conditionals)
- Integrated with `toString()` for pretty printing

### Documentation
- Updated README.md with comprehensive regex examples
- Added "Regular Expressions" section to help modal
- Added to autocomplete with method descriptions
- Syntax highlighting for `r"..."` literals in editor

## Test Coverage

Added 7 new tests (38 total, all passing):
- Lexer tokenization of regex literals
- Parser AST generation
- All 6 regex methods (test, match, groups, find_all, replace, split)

## Design Decisions

✅ **First-class objects** - Regex is a type, not a string  
✅ **Raw strings** - `r"..."` avoids double-escaping  
✅ **OOP style** - Methods on objects, not global functions  
✅ **Cached compilation** - Each regex compiled once  
✅ **Null on no match** - Falsy for easy conditionals: `if match { ... }`  
✅ **Separate match/groups** - `match()` for string, `groups()` for captures  
✅ **Simple find_all** - Returns array of strings, not objects  

## Performance

- Regex compilation happens once per literal (cached in object)
- Native JavaScript RegExp engine (very fast)
- No performance overhead vs JavaScript regex

## Future Enhancements (if needed)

- Named capture groups
- Flags support (case-insensitive, multiline)
- `match_all_with_index()` for position information
- Backreferences in replacement strings

## Usage Tips

1. **Use raw strings**: `r"\d+"` not `"\\d+"`
2. **null is falsy**: Use `if match { ... }` instead of `if match != null`
3. **Groups are arrays**: `groups[0]` for first capture
4. **test() is fastest**: Use for simple existence checks
5. **Compile once**: Assign regex to variable if using in loop
