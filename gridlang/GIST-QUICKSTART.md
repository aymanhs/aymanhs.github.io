# GridLang GitHub Gist Storage - Quick Reference

## 🚀 Quick Start

```
1. Click ⚙️  → Enter GitHub token → Save
2. Write code
3. Click ☁️ Save → Code saved to GitHub!
4. Click ☁️ Load → Browse and load your gists
```

## 🔑 Get GitHub Token

1. Go to: https://github.com/settings/tokens/new
2. Select scope: `gist` ✓
3. Generate token → Copy it!
4. Paste in GridLang → Save

## 🎯 Toolbar Buttons

| Button | Action |
|--------|--------|
| `☁️ Save` | Save current file to GitHub Gist |
| `☁️ Load` | Browse and load your gists |
| `⚙️` | Configure GitHub token |

## 📊 Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| `☁️ Synced` | Current file is linked to a gist |
| `☁️ filename` | File in dropdown is synced |
| `filename` | File is local-only |

## ✨ Features

- ✅ **Private by default** - Your gists are private
- ✅ **Smart sync** - Updates same gist on re-save
- ✅ **Version history** - GitHub tracks all changes
- ✅ **Cross-device** - Access from anywhere
- ✅ **Local + Cloud** - Works offline, syncs when ready

## 📝 Common Tasks

### Save New File
```
Write code → ☁️ Save → New gist created
```

### Update Existing
```
Load synced file → Edit → ☁️ Save → Gist updated
```

### Load from Cloud
```
☁️ Load → Click gist → Code loads in editor
```

### Check Sync Status
```
Look for:
- "☁️ Synced" in toolbar
- ☁️ icon in file dropdown
```

## 🔐 Security

- Token stored **only in your browser**
- Gists are **private by default**
- Direct connection: **Browser ↔ GitHub**
- No middleman or server

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Token not configured" | Click ⚙️ and enter token |
| "Connection failed" | Check token has `gist` scope |
| Can't see gists | Verify token is correct |
| Rate limit error | Wait 1 hour or use fewer saves |

## 💡 Tips

- **Organize**: Use descriptive file names
- **Test**: Click "Test Connection" after entering token
- **Backup**: Both local + cloud for safety
- **Share**: Get gist URL from gist.github.com
- **History**: View revisions on GitHub

## 🌐 Where to Find Your Gists

Visit: https://gist.github.com

You can:
- View all your gists
- See revision history
- Make gists public (if desired)
- Share gist URLs
- Delete old gists

## 🔄 Workflow

```
┌──────────────┐
│  Write Code  │
└──────┬───────┘
       │
       ▼
┌──────────────┐      ┌─────────────┐
│ ☁️ Save      │ ───► │ GitHub Gist │
└──────────────┘      └──────┬──────┘
                             │
                             │
┌──────────────┐             │
│ ☁️ Load      │ ◄───────────┘
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Editor    │
└──────────────┘
```

## 📱 Access Anywhere

1. Save on **Desktop** → 
2. Open GridLang on **Laptop** →
3. ☁️ Load → 
4. Same code! ✅

## 🎨 Best Practices

1. **Name files clearly**: "mandelbrot-anim" not "untitled"
2. **Save regularly**: Don't lose work
3. **Test token first**: Use "Test Connection"
4. **Keep token secret**: Never share your token
5. **Use local + cloud**: Best of both worlds

---

**Need more help?** See:
- `GIST-STORAGE.md` - Full documentation
- `GIST-TESTING.md` - Testing guide
- `GIST-IMPLEMENTATION.md` - Technical details

**Happy coding!** 🎨☁️
