// Enhanced background script with auto-close feature
console.log('TabForge background script loaded');

// Handle browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser started - checking auto ungroup and close...');
  await handleBrowserStartup();
});

// Handle installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('TabForge installed');
  // Set default settings
  const defaultSettings = {
    keepGroups: false // Default: Auto ungroup and close
  };
  await chrome.storage.local.set({ tabForgeSettings: defaultSettings });
});

// Main browser startup handler
async function handleBrowserStartup() {
  try {
    const result = await chrome.storage.local.get(['tabForgeSettings', 'hasActiveGroups', 'groupedTabUrls']);
    
    if (!result.tabForgeSettings) return;

    const keepGroups = result.tabForgeSettings.keepGroups;
    console.log('Startup - Keep Groups:', keepGroups);

    // If auto ungroup is enabled (keepGroups is false)
    if (!keepGroups && result.hasActiveGroups) {
      console.log('Auto ungroup and close process started...');
      
      // Small delay to ensure all tabs are loaded
      setTimeout(async () => {
        await processAutoUngroupAndClose(result.groupedTabUrls || []);
      }, 1000);
    } else {
      console.log('Auto ungroup is disabled or no active groups');
    }
    
  } catch (error) {
    console.error('Error in browser startup handler:', error);
  }
}

// Process auto ungroup and close old tabs
async function processAutoUngroupAndClose(oldGroupedUrls) {
  try {
    // Get all current tabs
    const allTabs = await chrome.tabs.query({});
    console.log(`Found ${allTabs.length} tabs on startup`);
    
    // Find tabs that are in groups (to ungroup)
    const tabsInGroups = allTabs.filter(tab => tab.groupId !== -1);
    
    if (tabsInGroups.length > 0) {
      console.log(`Ungrouping ${tabsInGroups.length} tabs from groups`);
      
      // Ungroup all tabs that are in groups
      const tabIds = tabsInGroups.map(tab => tab.id);
      await chrome.tabs.ungroup(tabIds);
    }
    
    // Now identify which tabs to close (old grouped tabs)
    if (oldGroupedUrls && oldGroupedUrls.length > 0) {
      await closeOldGroupedTabs(allTabs, oldGroupedUrls);
    }
    
    // Clear the stored data
    await chrome.storage.local.remove(['hasActiveGroups', 'groupedTabUrls', 'originalTabCount']);
    
    console.log('Auto ungroup and close process completed!');
    
  } catch (error) {
    console.error('Error in auto ungroup and close:', error);
  }
}

// Close old grouped tabs while keeping new ones
async function closeOldGroupedTabs(currentTabs, oldGroupedUrls) {
  try {
    // Identify tabs that match the old grouped URLs
    const tabsToClose = [];
    const tabsToKeep = [];
    
    for (const tab of currentTabs) {
      // Check if this tab's URL was in the old grouped tabs
      const wasGrouped = oldGroupedUrls.includes(tab.url);
      
      if (wasGrouped) {
        tabsToClose.push(tab.id);
      } else {
        tabsToKeep.push(tab);
      }
    }
    
    console.log(`Found ${tabsToClose.length} old tabs to close, keeping ${tabsToKeep.length} new tabs`);
    
    // Close the old tabs
    if (tabsToClose.length > 0) {
      await chrome.tabs.remove(tabsToClose);
      console.log(`Closed ${tabsToClose.length} old grouped tabs`);
    }
    
    // If we closed all tabs and there are no tabs left, create a new tab
    if (currentTabs.length === tabsToClose.length) {
      await chrome.tabs.create({ url: 'chrome://newtab' });
      console.log('Created new tab after closing all old tabs');
    }
    
  } catch (error) {
    console.error('Error closing old tabs:', error);
  }
}

// Additional safety: Also handle when extension wakes up
chrome.runtime.onStartup.addListener(async () => {
  // Extra safety check after a longer delay
  setTimeout(async () => {
    const result = await chrome.storage.local.get(['tabForgeSettings', 'hasActiveGroups']);
    if (result.tabForgeSettings && !result.tabForgeSettings.keepGroups && result.hasActiveGroups) {
      console.log('Safety check: Cleaning up any remaining groups');
      const allTabs = await chrome.tabs.query({});
      const tabsInGroups = allTabs.filter(tab => tab.groupId !== -1);
      
      if (tabsInGroups.length > 0) {
        await chrome.tabs.ungroup(tabsInGroups.map(tab => tab.id));
      }
      
      await chrome.storage.local.remove(['hasActiveGroups']);
    }
  }, 3000);
});