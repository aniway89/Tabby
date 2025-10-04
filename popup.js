// Simple and reliable tab organizer
document.addEventListener('DOMContentLoaded', function() {
  console.log('TabForge loaded!');
  
  const organizeBtn = document.getElementById('organizeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const keepGroupsToggle = document.getElementById('keepGroupsToggle');
  const status = document.getElementById('status');

  // Load settings immediately when popup opens
  loadSettings();

  // Organize tabs button
  organizeBtn.addEventListener('click', async () => {
    try {
      showStatus('Analyzing tabs...', 'info');
      
      const tabs = await chrome.tabs.query({ currentWindow: true });
      showStatus(`Found ${tabs.length} tabs. Organizing...`, 'info');
      
      // Store current tab URLs before grouping (for tracking)
      const currentTabUrls = tabs.map(tab => tab.url);
      
      // Simple categorization
      const categories = {};
      const groupedTabUrls = []; // Track which tabs we're grouping
      
      for (const tab of tabs) {
        const category = getTabCategory(tab.title, tab.url);
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(tab.id);
        groupedTabUrls.push(tab.url); // Track this tab as grouped
      }
      
      // Create groups
      let groupsCreated = 0;
      for (const [categoryName, tabIds] of Object.entries(categories)) {
        if (tabIds.length > 0) {
          const groupId = await chrome.tabs.group({ tabIds: tabIds });
          await chrome.tabGroups.update(groupId, {
            title: categoryName,
            color: getColorForCategory(categoryName)
          });
          groupsCreated++;
        }
      }
      
      // Save that we have active groups and store the grouped tab URLs
      await chrome.storage.local.set({ 
        hasActiveGroups: true,
        groupsCreated: new Date().toISOString(),
        groupedTabUrls: groupedTabUrls, // Store which tabs were grouped
        originalTabCount: tabs.length
      });
      
      showStatus(`✅ Created ${groupsCreated} groups!`, 'success');
      
    } catch (error) {
      console.error('Error:', error);
      showStatus('❌ Error: ' + error.message, 'error');
    }
  });

  // Reset groups button
  resetBtn.addEventListener('click', async () => {
    try {
      showStatus('Resetting groups...', 'info');
      
      const tabs = await chrome.tabs.query({ currentWindow: true });
      await chrome.tabs.ungroup(tabs.map(tab => tab.id));
      
      // Clear active groups flag
      await chrome.storage.local.remove(['hasActiveGroups', 'groupedTabUrls']);
      
      showStatus('✅ All groups removed!', 'success');
    } catch (error) {
      showStatus('❌ Error resetting groups', 'error');
    }
  });

  // Checkbox change event - save immediately
  keepGroupsToggle.addEventListener('change', async function() {
    try {
      await saveSettings();
      if (this.checked) {
        showStatus('✅ Groups will be kept after browser closes', 'success');
      } else {
        showStatus('✅ Groups will be removed after browser closes', 'success');
      }
    } catch (error) {
      showStatus('❌ Error saving settings', 'error');
    }
  });

  // Load settings
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['tabForgeSettings']);
      if (result.tabForgeSettings) {
        keepGroupsToggle.checked = result.tabForgeSettings.keepGroups || false;
        console.log('Settings loaded:', result.tabForgeSettings);
      } else {
        // Set default settings if none exist
        const defaultSettings = { keepGroups: false };
        await chrome.storage.local.set({ tabForgeSettings: defaultSettings });
        keepGroupsToggle.checked = false;
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  }

  // Save settings
  async function saveSettings() {
    const settings = {
      keepGroups: keepGroupsToggle.checked
    };
    await chrome.storage.local.set({ tabForgeSettings: settings });
    console.log('Settings saved:', settings);
  }
});

// Simple and reliable category detection
function getTabCategory(title, url) {
  if (!title) title = '';
  if (!url) url = '';
  
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  // Social Media
  if (lowerTitle.includes('twitter') || lowerUrl.includes('twitter') ||
      lowerTitle.includes('facebook') || lowerUrl.includes('facebook') ||
      lowerTitle.includes('instagram') || lowerUrl.includes('instagram') ||
      lowerTitle.includes('linkedin') || lowerUrl.includes('linkedin') ||
      lowerTitle.includes('reddit') || lowerUrl.includes('reddit')) 
    return '📱 Social Media';
  
  // Development
  if (lowerTitle.includes('github') || lowerUrl.includes('github') ||
      lowerTitle.includes('stackoverflow') || lowerUrl.includes('stackoverflow') ||
      lowerTitle.includes('gitlab') || lowerUrl.includes('gitlab') ||
      lowerTitle.includes('codepen') || lowerUrl.includes('codepen') ||
      lowerTitle.includes('vs code') || lowerTitle.includes('visual studio') ||
      lowerTitle.includes('developer') || lowerTitle.includes('programming') ||
      lowerTitle.includes('copilot') || lowerTitle.includes('openai')) 
    return '💻 Development';
  
  // Shopping
  if (lowerTitle.includes('amazon') || lowerUrl.includes('amazon') ||
      lowerTitle.includes('ebay') || lowerUrl.includes('ebay') ||
      lowerTitle.includes('flipkart') || lowerUrl.includes('flipkart') ||
      lowerTitle.includes('myntra') || lowerUrl.includes('myntra') ||
      lowerTitle.includes('aliexpress') || lowerUrl.includes('aliexpress') ||
      lowerTitle.includes('shop') || lowerTitle.includes('cart')) 
    return '🛒 Shopping';
  
  // Email & Communication
  if (lowerTitle.includes('gmail') || lowerUrl.includes('gmail') ||
      lowerTitle.includes('outlook') || lowerUrl.includes('outlook') ||
      lowerTitle.includes('yahoo mail') || lowerUrl.includes('yahoo') ||
      lowerTitle.includes('hotmail') || lowerUrl.includes('hotmail') ||
      lowerTitle.includes('slack') || lowerUrl.includes('slack') ||
      lowerTitle.includes('discord') || lowerUrl.includes('discord')) 
    return '📧 Communication';
  
  // Entertainment
  if (lowerTitle.includes('youtube') || lowerUrl.includes('youtube') ||
      lowerTitle.includes('netflix') || lowerUrl.includes('netflix') ||
      lowerTitle.includes('spotify') || lowerUrl.includes('spotify') ||
      lowerTitle.includes('twitch') || lowerUrl.includes('twitch') ||
      lowerTitle.includes('prime video') || lowerUrl.includes('prime') ||
      lowerTitle.includes('music') || lowerTitle.includes('movie')) 
    return '🎮 Entertainment';
  
  // Productivity & Work
  if (lowerTitle.includes('docs') || lowerTitle.includes('notion') ||
      lowerTitle.includes('trello') || lowerTitle.includes('asana') ||
      lowerTitle.includes('calendar') || lowerTitle.includes('drive') ||
      lowerTitle.includes('microsoft') || lowerUrl.includes('microsoft') ||
      lowerTitle.includes('office') || lowerUrl.includes('office')) 
    return '📊 Productivity';
  
  // News & Information
  if (lowerTitle.includes('news') || lowerTitle.includes('cnn') ||
      lowerTitle.includes('bbc') || lowerTitle.includes('reuters') ||
      lowerTitle.includes('article') || lowerTitle.includes('blog') ||
      lowerTitle.includes('boeing') || lowerTitle.includes('opensea')) 
    return '📰 News & Info';
  
  return '📁 Other';
}

// Simple color mapping
function getColorForCategory(category) {
  const colorMap = {
    '📱 Social Media': 'blue',
    '💻 Development': 'green',
    '🛒 Shopping': 'yellow',
    '📧 Communication': 'red',
    '🎮 Entertainment': 'purple',
    '📊 Productivity': 'cyan',
    '📰 News & Info': 'orange',
    '📁 Other': 'grey'
  };
  return colorMap[category] || 'grey';
}

// Status display
function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
}