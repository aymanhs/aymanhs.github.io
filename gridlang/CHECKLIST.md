# GridLang Development Checklist

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

## Quick Reference Locations

```
gridlang.js:          Line ~150+  (setupBuiltins function)
ui.js:                Line ~194   (builtinFunctions object)
ui.js:                Line ~1327  (Prism syntax highlighting)
ace-init.js:          Line ~240   (autocomplete builtins)
gridlang-ace-mode.js: Line ~28    (Ace syntax highlighting)
README.md:            Various sections by category
version.js:           Line ~6     (GRIDLANG_VERSION)
```

## Example: Adding a New Function

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
