// Key used in chrome.storage.local
const STORAGE_KEY = "savedTabs";

// Data shape (v2):
// {
//   version: 2,
//   folders: [
//     {
//       id: string,
//       name: string,
//       createdAt: number,
//       tabs: [{ id, title, url, createdAt }]
//     }
//   ]
// }

document.addEventListener("DOMContentLoaded", () => {
  const saveButton = document.getElementById("save-tab");
  const tabsList = document.getElementById("tabs-list");
  const statusMessage = document.getElementById("status-message");
  const folderSelect = document.getElementById("folder-select");
  const newFolderInput = document.getElementById("new-folder-name");
  const addFolderBtn = document.getElementById("add-folder");
  const searchInput = document.getElementById("search-input");

  let currentFolderId = null;
  let currentSearchQuery = "";

  // Load existing saved tabs/folders on popup open
  loadData((data) => {
    const ensured = ensureDefaultFolder(data);
    if (ensured !== data) {
      // Save migration result, then initialize UI
      saveData(ensured, () => initUI(ensured));
    } else {
      initUI(data);
    }
  });

  function initUI(data) {
    populateFolderSelect(data);
    renderCurrentFolder(data);

    // Handle "Save Current Tab" button click
    saveButton.addEventListener("click", () => {
      setStatus("Saving current tab...", true);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.url) {
          setStatus("Could not detect active tab.", false);
          return;
        }

        loadData((existingData) => {
          const dataWithDefault = ensureDefaultFolder(existingData);
          const folderId = currentFolderId || dataWithDefault.folders[0].id;
          const folder = dataWithDefault.folders.find((f) => f.id === folderId);
          if (!folder) {
            setStatus("Selected folder not found.", false);
            return;
          }

          const tabInfo = {
            id: Date.now(), // simple unique id
            title: activeTab.title || activeTab.url,
            url: activeTab.url,
            createdAt: Date.now()
          };

          // Avoid duplicates by URL within the folder
          const alreadySaved = folder.tabs.some((item) => item.url === tabInfo.url);
          if (alreadySaved) {
            setStatus("This tab is already saved in this folder.", false);
            return;
          }

          folder.tabs.unshift(tabInfo);

          saveData(dataWithDefault, () => {
            renderCurrentFolder(dataWithDefault);
            setStatus("Tab saved.", false, 1200);
          });
        });
      });
    });

    // Folder selection change
    folderSelect.addEventListener("change", () => {
      currentFolderId = folderSelect.value || null;
      currentSearchQuery = "";
      searchInput.value = "";
      loadData((dataLatest) => {
        renderCurrentFolder(dataLatest);
      });
    });

    // Add new folder
    addFolderBtn.addEventListener("click", () => {
      const name = (newFolderInput.value || "").trim();
      if (!name) {
        setStatus("Folder name cannot be empty.", false, 1500);
        return;
      }

      loadData((dataLatest) => {
        // Prevent duplicate folder names (case-insensitive)
        const exists = dataLatest.folders.some(
          (f) => f.name.toLowerCase() === name.toLowerCase()
        );
        if (exists) {
          setStatus("Folder with this name already exists.", false, 1500);
          return;
        }

        const newFolder = {
          id: `folder-${Date.now()}`,
          name,
          createdAt: Date.now(),
          tabs: []
        };

        dataLatest.folders.push(newFolder);
        currentFolderId = newFolder.id;

        saveData(dataLatest, () => {
          newFolderInput.value = "";
          populateFolderSelect(dataLatest);
          renderCurrentFolder(dataLatest);
          setStatus("Folder created.", false, 1200);
        });
      });
    });

    // Search within current folder
    searchInput.addEventListener("input", () => {
      currentSearchQuery = (searchInput.value || "").toLowerCase();
      loadData((dataLatest) => {
        renderCurrentFolder(dataLatest);
      });
    });
  }

  // Load structured data from storage and normalize
  function loadData(callback) {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const raw = result[STORAGE_KEY];
      const normalized = normalizeData(raw);
      if (callback) callback(normalized);
    });
  }

  function saveData(data, callback) {
    chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
      if (chrome.runtime.lastError) {
        setStatus("Storage error.", false, 1500);
        return;
      }
      if (callback) callback();
    });
  }

  // Migrate old array-only storage to folder-based structure
  function normalizeData(raw) {
    // Old format: array of tabs
    if (Array.isArray(raw)) {
      return {
        version: 2,
        folders: [
          {
            id: "folder-default",
            name: "Unsorted",
            createdAt: Date.now(),
            tabs: raw.map((t) => ({
              id: t.id || Date.now(),
              title: t.title || t.url,
              url: t.url,
              createdAt: Date.now()
            }))
          }
        ]
      };
    }

    // New format already
    if (raw && typeof raw === "object" && Array.isArray(raw.folders)) {
      return raw;
    }

    // Empty default
    return {
      version: 2,
      folders: []
    };
  }

  function ensureDefaultFolder(data) {
    if (!data.folders || !data.folders.length) {
      const updated = {
        version: 2,
        folders: [
          {
            id: "folder-default",
            name: "Unsorted",
            createdAt: Date.now(),
            tabs: []
          }
        ]
      };
      return updated;
    }
    return data;
  }

  function populateFolderSelect(data) {
    folderSelect.innerHTML = "";

    data.folders.forEach((folder) => {
      const option = document.createElement("option");
      option.value = folder.id;
      option.textContent = folder.name;
      folderSelect.appendChild(option);
    });

    if (!currentFolderId && data.folders.length) {
      currentFolderId = data.folders[0].id;
    }

    if (currentFolderId) {
      folderSelect.value = currentFolderId;
    }
  }

  function renderCurrentFolder(data) {
    tabsList.innerHTML = "";

    const folderId = currentFolderId || (data.folders[0] && data.folders[0].id);
    const folder = data.folders.find((f) => f.id === folderId);

    if (!folder) {
      const li = document.createElement("li");
      li.textContent = "No folders yet.";
      li.style.fontSize = "12px";
      li.style.color = "#9ca3af";
      tabsList.appendChild(li);
      return;
    }

    if (folderSelect.value !== folder.id) {
      folderSelect.value = folder.id;
    }

    const query = currentSearchQuery;
    const tabs = query
      ? folder.tabs.filter((tab) => {
          const title = (tab.title || "").toLowerCase();
          const url = (tab.url || "").toLowerCase();
          return title.includes(query) || url.includes(query);
        })
      : folder.tabs;

    if (!tabs.length) {
      const li = document.createElement("li");
      li.textContent = query ? "No results in this folder." : "No saved tabs yet.";
      li.style.fontSize = "12px";
      li.style.color = "#9ca3af";
      tabsList.appendChild(li);
      return;
    }

    tabs.forEach((tab) => {
      const li = document.createElement("li");
      li.className = "tab-item";

      const link = document.createElement("a");
      link.className = "tab-link";
      link.href = "#";
      link.title = tab.url;

      const titleSpan = document.createElement("span");
      titleSpan.textContent = tab.title;

      const urlSpan = document.createElement("span");
      urlSpan.className = "url";
      urlSpan.textContent = tab.url;

      link.appendChild(titleSpan);
      link.appendChild(urlSpan);

      // Clicking link opens in a new tab
      link.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: tab.url });
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "✕";

      deleteBtn.addEventListener("click", () => {
        deleteTabFromFolder(folder.id, tab.id);
      });

      li.appendChild(link);
      li.appendChild(deleteBtn);

      tabsList.appendChild(li);
    });
  }

  // Delete a tab by id within a specific folder
  function deleteTabFromFolder(folderId, tabId) {
    loadData((data) => {
      const folder = data.folders.find((f) => f.id === folderId);
      if (!folder) {
        setStatus("Folder not found.", false, 1200);
        return;
      }

      folder.tabs = folder.tabs.filter((tab) => tab.id !== tabId);

      saveData(data, () => {
        renderCurrentFolder(data);
        setStatus("Deleted.", false, 1000);
      });
    });
  }

  // Show short status messages
  function setStatus(message, isLoading = false, clearAfterMs = null) {
    statusMessage.textContent = message;
    statusMessage.style.opacity = "1";
    statusMessage.style.color = isLoading ? "#a5b4fc" : "#a5b4fc";

    if (clearAfterMs) {
      setTimeout(() => {
        statusMessage.textContent = "";
        statusMessage.style.opacity = "0";
      }, clearAfterMs);
    }
  }
});