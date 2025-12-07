# GitHub Gist Storage for GridLang

GridLang now supports storing your code on GitHub Gists! This allows you to:

- 🔐 Keep your code private and secure in your GitHub account
- ☁️ Access your code from any device
- 📝 Maintain version history through GitHub
- 🔗 Share your GridLang scripts via gist links
- 💾 Backup beyond browser localStorage

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to [GitHub Token Settings](https://github.com/settings/tokens/new?scopes=gist&description=GridLang)
2. Give your token a descriptive name (e.g., "GridLang Gist Storage")
3. Select the **`gist`** scope (this is the only permission needed)
4. Click "Generate token"
5. **Important:** Copy your token immediately! You won't be able to see it again.

### 2. Configure GridLang

1. In GridLang, click the **⚙️** button in the toolbar
2. Paste your GitHub token into the input field
3. Click "💾 Save" to store the token (stored securely in your browser's localStorage)
4. Optionally click "🔍 Test Connection" to verify it works

## Using Gist Storage

### Save to GitHub Gist

1. Write or load your GridLang code
2. Click the **☁️ Save** button
3. Your code will be saved to a new or existing gist
4. A "☁️ Synced" indicator will appear when linked to a gist

### Load from GitHub Gist

1. Click the **☁️ Load** button
2. Browse your list of gists
3. Click on any gist to load it into the editor
4. The file will be created locally and linked to the gist

### Sync Changes

- When a file is linked to a gist, clicking **☁️ Save** again will update the existing gist
- Each file can be linked to one gist at a time
- The mapping is stored locally in your browser

## How It Works

### Local + Cloud Storage

- GridLang uses **localStorage** for quick local access
- GitHub Gists provide **cloud backup and sync**
- Files are stored both locally and (optionally) in gists
- You control when to sync by clicking the save button

### File Mapping

- Each local file can be linked to a specific gist
- The mapping is stored in `localStorage` as `gridlang_gist_mapping`
- When you save a linked file, it updates the same gist
- When you load from a gist, the file becomes linked

### Privacy

- Your GitHub token is stored **only in your browser's localStorage**
- It never leaves your computer except to make API calls to GitHub
- You can use **private gists** (recommended) or public ones
- Delete the token anytime by clearing the config field and saving

## Troubleshooting

### "GitHub token not configured"
Click the ⚙️ button and enter your token. Make sure it has the `gist` scope.

### "Connection failed"
- Check that your token is correct and not expired
- Ensure the token has the `gist` scope enabled
- Check your internet connection

### "Failed to save to gist"
- Verify your token is still valid
- Check GitHub's [status page](https://www.githubstatus.com/)
- Make sure you have gist quota available

### Token Security
- Never share your token with others
- If compromised, revoke it on [GitHub](https://github.com/settings/tokens) and create a new one
- The token is stored in localStorage - clear browser data to remove it

## Features

✅ **Create new gists** - Save files as new gists  
✅ **Update gists** - Sync changes to existing gists  
✅ **Browse gists** - View all your GridLang gists  
✅ **Load gists** - Import gists into the editor  
✅ **Private by default** - New gists are private  
✅ **File mapping** - Automatic linking between local files and gists  
✅ **Version history** - GitHub maintains revision history  

## API Usage

The gist storage is exposed via `window.gistStorage`:

```javascript
// Get current token
gistStorage.getToken()

// Set token
gistStorage.setToken('ghp_xxxxxxxxxxxx')

// Create new gist
await gistStorage.createGist('myfile.grid', code, 'Description', false)

// Update existing gist
await gistStorage.updateGist(gistId, 'myfile.grid', code)

// Get gist by ID
await gistStorage.getGist(gistId)

// List all gists
await gistStorage.listGists(30, 1) // 30 per page, page 1

// Delete gist
await gistStorage.deleteGist(gistId)
```

## Benefits Over localStorage

| Feature | localStorage | GitHub Gists |
|---------|-------------|--------------|
| Persistence | Browser only | Cloud backup |
| Cross-device | ❌ No | ✅ Yes |
| Version history | ❌ No | ✅ Yes |
| Sharing | Via URL compression | Via gist links |
| Storage limit | ~5-10 MB | 100 MB per gist |
| Privacy | Local only | Private or public |

## Notes

- Each gist can store multiple files, but GridLang uses one file per gist
- Gist filenames automatically get `.grid` extension
- GitHub has rate limits: 60 requests/hour (unauthenticated), 5000/hour (authenticated)
- Gists are free for all GitHub users
- You can view/edit your gists anytime at [gist.github.com](https://gist.github.com)

Enjoy cloud-powered GridLang! 🎨☁️
