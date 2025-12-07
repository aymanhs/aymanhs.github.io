# Testing GitHub Gist Integration

Quick guide to test the new GitHub Gist storage feature in GridLang.

## Quick Test Steps

1. **Open GridLang**
   - Navigate to `gridlang.html` in your browser

2. **Configure GitHub Token**
   - Click the ⚙️ (gear) button in the toolbar
   - If you don't have a token, click the "Create one here" link
   - Paste your token (starts with `ghp_`)
   - Check "Show token" to verify it's correct
   - Click "🔍 Test Connection" to verify
   - Click "💾 Save"

3. **Create Some Code**
   ```gridlang
   # My first cloud-saved GridLang script!
   init_2d(10, 10)
   
   for i in range(10) {
       for j in range(10) {
           set_cell(i, j, "#4ec9b0")
       }
   }
   
   print("Hello from the cloud!")
   ```

4. **Save to Gist**
   - Click the "☁️ Save" button
   - Wait for the "Saved to GitHub Gist! ✓" message
   - Notice the "☁️ Synced" indicator appears
   - The file dropdown now shows "☁️ default" (cloud icon)

5. **Verify on GitHub**
   - Go to https://gist.github.com
   - You should see your new gist with name "GridLang: default"
   - The file will be named `default.grid`

6. **Load from Gist**
   - Click "☁️ Load" button
   - You'll see your list of gists
   - Click on any gist to load it
   - The code appears in the editor

7. **Update a Gist**
   - Modify the code
   - Click "☁️ Save" again
   - It updates the same gist (not create a new one)
   - Go to the gist URL on GitHub and check the revision history

## Expected Behavior

### File Management
- ✅ Local files saved in localStorage (instant)
- ✅ Cloud sync happens when you click "☁️ Save"
- ✅ Files with cloud icon (☁️) are linked to gists
- ✅ "☁️ Synced" indicator shows current file's status

### Creating Gists
- First save creates a new **private** gist
- Subsequent saves update the same gist
- Each local file can link to one gist

### Loading Gists
- Shows your most recent 50 gists
- Click to load into editor
- Creates local file and links to gist
- Warns if unsaved changes exist

## Troubleshooting Test

If something doesn't work:

1. **Check Browser Console** (F12)
   - Look for error messages
   - Check network requests to api.github.com

2. **Token Issues**
   - Verify token has `gist` scope
   - Try creating a new token
   - Use "Test Connection" button

3. **Network Issues**
   - Check internet connection
   - Verify no firewall blocking github.com
   - Check GitHub status

## Test Scenarios

### Scenario 1: New User Flow
1. Open GridLang (no token)
2. Try to save → gets prompt to configure token
3. Configure token
4. Save works successfully

### Scenario 2: Multiple Files
1. Create file "test1" and save to gist
2. Create file "test2" and save to gist
3. Switch between files
4. Both show cloud icon
5. Both update their respective gists

### Scenario 3: Load Existing
1. Load a gist from the browser
2. Modify the code
3. Save updates the original gist
4. Check GitHub for revision history

### Scenario 4: Token Management
1. Clear token in config
2. Try to save → prompts for token
3. Enter valid token
4. Save works

## Developer Testing

For developers wanting to test the API:

```javascript
// Open browser console (F12) and try:

// Check if loaded
console.log(window.gistStorage);

// Set token manually
gistStorage.setToken('ghp_your_token_here');

// List gists
gistStorage.listGists().then(console.log);

// Create a test gist
gistStorage.createGist('test.grid', 'print("test")', 'Test gist', false)
  .then(console.log);

// Get a specific gist (replace ID)
gistStorage.getGist('gist_id_here').then(console.log);

// Check file mapping
console.log(gistStorage.getFileGistMapping());
```

## Success Indicators

You know it's working when:
- ✅ Token test succeeds
- ✅ "Saved to GitHub Gist! ✓" toast appears
- ✅ "☁️ Synced" indicator shows
- ✅ Cloud icon appears in file dropdown
- ✅ Gists appear at gist.github.com
- ✅ Loading gists populates the editor
- ✅ Multiple saves update (not duplicate)

## Clean Up After Testing

If you want to remove test data:

1. **Delete Gists on GitHub**
   - Go to https://gist.github.com
   - Delete test gists manually

2. **Clear Local Storage**
   ```javascript
   // In browser console:
   localStorage.removeItem('gridlang_github_token');
   localStorage.removeItem('gridlang_gist_mapping');
   ```

3. **Revoke Token** (optional)
   - Go to https://github.com/settings/tokens
   - Revoke the test token

Happy testing! 🎨☁️
