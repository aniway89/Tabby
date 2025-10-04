// Simple and Reliable Background Script
console.log('TabForge background script loaded');

// Handle browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser started - checking auto ungroup...');
  await handleAutoUngroup();
});

// Handle installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('TabForge installed - setting defaults');
  const defaultSettings = {
    keepGroups: false,
    theme: 'professional'
  };
  await chrome.storage.local.set({ tabForgeSettings: defaultSettings });
});

// Main auto ungroup function
async function handleAutoUngroup() {
  try {
    const result = await chrome.storage.local.get(['tabForgeSettings']);
    
    if (!result.tabForgeSettings) {
      console.log('No settings found');
      return;
    }

    const keepGroups = result.tabForgeSettings.keepGroups;
    console.log('Auto ungroup check - Keep Groups:', keepGroups);

    // If auto ungroup is enabled (keepGroups is false)
    if (!keepGroups) {
      console.log('Auto ungroup is ENABLED - removing all tab groups...');
      
      // Get all tabs across all windows
      const allTabs = await chrome.tabs.query({});
      
      // Find tabs that are in groups
      const tabsInGroups = allTabs.filter(tab => tab.groupId !== -1);
      
      if (tabsInGroups.length > 0) {
        console.log(`Found ${tabsInGroups.length} tabs in groups - ungrouping...`);
        
        // Ungroup all tabs that are in groups
        const tabIds = tabsInGroups.map(tab => tab.id);
        await chrome.tabs.ungroup(tabIds);
        
        console.log(`✅ Auto ungroup completed! Removed ${tabIds.length} tabs from groups`);
      } else {
        console.log('No tabs found in groups');
      }
      
      // Clear the active groups flag
      await chrome.storage.local.remove(['hasActiveGroups']);
    } else {
      console.log('Auto ungroup is DISABLED - keeping tab groups');
    }
    
  } catch (error) {
    console.error('Error in auto ungroup:', error);
  }
}