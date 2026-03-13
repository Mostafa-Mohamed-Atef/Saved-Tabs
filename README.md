## Saved Tabs – Browser Extension

This is a simple local browser extension for saving and organizing tabs into folders, with a quick search UI.

### Features

- **Save current tab**: Click the `Saved Tabs` extension icon and press **Save Current Tab** to store the active tab.
- **Folders for organization**: Create named folders (e.g. *Work*, *Reading*, *Videos*) and save tabs into the selected folder.
- **Search**: Search within the currently selected folder by tab title or URL.
- **Open in new tab**: Clicking any saved item opens the URL in a new browser tab.
- **Delete saved tabs**: Remove individual saved entries with the delete button.
- **Local-only storage**: All data is saved with `chrome.storage.local` on your machine.

### Data model

Tabs are stored under a single key in `chrome.storage.local`:

- **Key**: `savedTabs`
- **Shape (v2)**:
  - `version`: `2`
  - `folders`: array of folders
    - `id`: unique string
    - `name`: folder name
    - `createdAt`: timestamp
    - `tabs`: array of saved tabs
      - `id`: unique id
      - `title`: tab title
      - `url`: tab URL
      - `createdAt`: timestamp

If you had an older version of this extension that stored a flat array of tabs, it is automatically migrated into a single `Unsorted` folder on first run.

### Files

- **`manifest.json`**: Chrome Manifest V3 definition for the extension.
- **`popup.html`**: Markup for the popup UI (header, folder controls, search, list of tabs).
- **`popup.css`**: Styles for a compact, dark-themed popup.
- **`popup.js`**: Core logic for saving tabs, rendering folders, search, and deleting items.

### How to install (Chrome / Edge)

1. **Build / download the folder**
   - Make sure this project directory (containing `manifest.json`) is on your machine, e.g. `e:\Dev\JavaScript\saved-tabs`.

2. **Open the extensions page**
   - Chrome: go to `chrome://extensions/`
   - Edge: go to `edge://extensions/`

3. **Enable Developer Mode**
   - Toggle **Developer mode** on (usually at the top-right).

4. **Load the unpacked extension**
   - Click **Load unpacked**.
   - Select the `saved-tabs` project folder (the folder that has `manifest.json`).

5. **Pin and use**
   - Pin the `Saved Tabs` extension to the toolbar for quick access.
   - Click the icon to open the popup, select a folder, and hit **Save Current Tab**.

### Usage tips

- **Organizing tabs**
  - Create a folder from the popup (e.g. *Projects 2026*), select it, then click **Save Current Tab** on any pages you want grouped there.

- **Searching**
  - Use the search box to quickly filter tabs in the selected folder by either title or URL.

- **Safe experiments**
  - Because everything is local to `chrome.storage.local`, you can safely experiment, clear data, or modify the code without affecting other profiles or machines.

