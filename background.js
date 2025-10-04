// Handle browser startup and close events
chrome.runtime.onStartup.addListener(async () => {
  await handleBrowserStartup();
});

// When window closes, check if we need to do anything
chrome.windows.onRemoved.addListener(async (windowId) => {
  await handleWindowClose(windowId);
});

async function handleBrowserStartup() {
  try {
    // Check user's preference for what to do on browser close
    const result = await chrome.storage.local.get(['tabForgeSettings', 'hasActiveGroups']);
    
    if (result.tabForgeSettings && result.hasActiveGroups) {
      const behavior = result.tabForgeSettings.closeBehavior;
      
      if (behavior === 'ungroup') {
        // Ungroup all tabs on browser start
        const tabs = await chrome.tabs.query({});
        if (tabs.length > 0) {
          await chrome.tabs.ungroup(tabs.map(tab => tab.id));
        }
        await chrome.storage.local.remove(['hasActiveGroups']);
        console.log('Ungrouped tabs on browser startup');
      }
      // For 'keep' and 'ask', we don't do anything - groups remain
    }
  } catch (error) {
    console.error('Error in browser startup handler:', error);
  }
}

async function handleWindowClose(closedWindowId) {
  try {
    const result = await chrome.storage.local.get(['tabForgeSettings']);
    
    if (result.tabForgeSettings) {
      const behavior = result.tabForgeSettings.closeBehavior;
      
      if (behavior === 'ask') {
        // Create notification to ask user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'TabForge',
          message: 'You have grouped tabs. Keep them for next time?',
          priority: 1
        });
      }
      // Note: We can't actually ask in real-time due to extension limitations
      // This is a compromise using notifications
    }
  } catch (error) {
    console.error('Error in window close handler:', error);
  }
}