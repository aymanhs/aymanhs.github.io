# GridLang Development Checklist
After any change, update versions.js and ensure we are doing cache-busting stuff.

## After Adding New Builtin Functions

When adding any new builtin function to `gridlang.js`, you MUST update:

### 1. Help Panel (ui.js)
- [ ] Add to `builtinFunctions` object under appropriate category
- [ ] Include function signature with parameters
- [ ] Include clear description

### 2. Autocomplete (ace-init.js)
- [ ] Add to `builtins` array in `addGridLangCompleters()`
- [ ] Set appropriate meta tag (category)

### 3. Ace Syntax Highlighting (gridlang-ace-mode.js)
- [ ] Add to support.function regex pattern

### 4. Prism Syntax Highlighting (ui.js) - OPTIONAL/LEGACY
- [ ] Add to builtin function pattern regex in `Prism.languages.insertBefore`
- [ ] Only needed for fallback textarea (rarely used)

### 5. Documentation (README.md)
- [ ] Add to appropriate section with examples
- [ ] Include parameter descriptions
- [ ] Show example usage

### 6. Version
- [ ] Bump version in `version.js` when releasing changes

## After Adding New Language Features (Operators, Syntax)

When adding new operators or syntax features, you MUST update:

### 1. Lexer (lexer.js)
- [ ] Add new token types to `TokenType` enum if needed
- [ ] Add tokenization logic in `scanToken()` method
- [ ] Handle multi-character operators with lookahead

### 2. Parser (parser.js)
- [ ] Add parsing logic for new syntax
- [ ] Handle operator precedence if applicable
- [ ] Generate appropriate AST nodes

### 3. Interpreter (gridlang.js)
- [ ] Add evaluation logic for new AST node types
- [ ] Handle new operators in `evalBinaryOp()` or equivalent

### 4. Tests (test.js)
- [ ] Add lexer tests for tokenization
- [ ] Add parser tests for AST generation
- [ ] Add runtime tests for evaluation
- [ ] Cover all edge cases and combinations

### 5. Documentation (README.md)
- [ ] Add to feature list at top
- [ ] Add dedicated section with examples
- [ ] Show usage with variables, arrays, objects if applicable

### 6. Syntax Highlighting
- [ ] Update Ace mode if needed (gridlang-ace-mode.js)
- [ ] Update Prism if needed (ui.js)

## Quick Reference Locations

```
lexer.js:             Line ~12    (TokenType enum)
lexer.js:             Line ~375+  (scanToken method)
parser.js:            Line ~243+  (assignment/expression parsing)
gridlang.js:          Line ~150+  (setupBuiltins function)
gridlang.js:          Line ~800+  (eval methods)
test.js:              Throughout  (test cases)
ui.js:                Line ~194   (builtinFunctions object)
ui.js:                Line ~1327  (Prism syntax highlighting)
ace-init.js:          Line ~240   (autocomplete builtins)
gridlang-ace-mode.js: Line ~28    (Ace syntax highlighting)
README.md:            Various sections by category
version.js:           Line ~6     (GRIDLANG_VERSION)
```

## Example: Adding a New Builtin Function

If you add `my_function()` to gridlang.js:

1. **ui.js builtinFunctions**: 
   ```js
   { name: "my_function(param)", desc: "Does something useful." }
   ```

2. **ace-init.js completers**:
   ```js
   { name: 'my_function', value: 'my_function', score: 100, meta: 'category' }
   ```

3. **ui.js Prism pattern** - Add `my_function` to the regex

4. **gridlang-ace-mode.js** - Add `my_function` to the regex

5. **README.md** - Add under appropriate section with example

6. **version.js** - Bump version when releasing

## Example: Adding Compound Assignment Operators (+=, -=, etc.)

1. **lexer.js TokenType enum**:
   ```js
   PLUS_ASSIGN: 'PLUS_ASSIGN',
   MINUS_ASSIGN: 'MINUS_ASSIGN',
   // ...
   ```

2. **lexer.js scanToken()**:
   ```js
   if (this.current() === '+' && this.peek() === '=') {
       this.advance(); this.advance();
       return new Token(TokenType.PLUS_ASSIGN, '+=', line, col);
   }
   ```

3. **parser.js assignment()**:
   ```js
   const compoundOps = {
       [TokenType.PLUS_ASSIGN]: '+',
       // ...
   };
   // Transform x += 5 to x = x + 5
   ```

4. **test.js**:
   - Lexer tests for tokenization
   - Parser tests for AST structure
   - Runtime tests for all operators × all target types

5. **README.md**:
   - Add to feature list
   - Create "Compound Assignment Operators" section
   - Show examples with variables, arrays, objects
