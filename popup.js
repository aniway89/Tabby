// Tabby - Smart Tab Organizer with Themes
document.addEventListener('DOMContentLoaded', function() {
  console.log('Tabby loaded!');
  
  const organizeBtn = document.getElementById('organizeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const keepGroupsToggle = document.getElementById('keepGroupsToggle');
  const status = document.getElementById('status');
  const settingBtn = document.getElementById('Setting');
  const settingPanel = document.getElementById('setting_pannel');
  const themeArea = document.getElementById('Theme_area');
  const section1 = document.querySelector('.section-1');
  const changeThemeBtn = document.getElementById('changeThemeBtn');

  // Back buttons
  const backFromSettings = document.getElementById('backFromSettings');
  const backFromTheme = document.getElementById('backFromTheme');

  // Theme buttons
  const themeButtons = document.querySelectorAll('.button_selection');

  // Current settings
  let currentSettings = {
    keepGroups: false,
    theme: 'Light_Purple' // Default theme
  };

  // Enhanced theme color definitions with proper tab group colors
// Enhanced theme color definitions with proper tab group colors
const themes = {
  'Natural_Green': {
    baseColor: '#2E8B57',
    name: 'Natural Green',
    // Tab group colors from dark to light for categories
    tabGroupColors: ['green', 'green', 'blue', 'cyan', 'yellow', 'orange', 'grey', 'grey']
  },
  'Deep_Blue': {
    baseColor: '#0E0427',
    name: 'Deep Blue', 
    tabGroupColors: ['blue', 'blue', 'blue', 'purple', 'cyan', 'grey', 'grey', 'grey']
  },
  'Dark_Purple': {
    baseColor: '#220033',
    name: 'Dark Purple',
    tabGroupColors: ['purple', 'purple', 'purple', 'pink', 'red', 'orange', 'yellow', 'grey']
  },
  'Light_Purple': {
    baseColor: '#8E57E0',
    name: 'Tabby Theme',
    tabGroupColors: ['purple', 'purple', 'pink', 'red', 'orange', 'yellow', 'cyan', 'blue']
  },
  'white_theme': {
    baseColor: '#FFFFFF',
    name: 'Black & White',
    // All groups get grey/white colors for black & white theme
    tabGroupColors: ['grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'grey']
  }
};
  // Category order for gradient (darkest to lightest)
  const categoryOrder = [
    '📁 Other',
    '📰 News & Info', 
    '📊 Productivity',
    '🎮 Entertainment',
    '📧 Communication',
    '🛒 Shopping',
    '💻 Development',
    '📱 Social Media'
  ];

  // Initialize
  loadSettings();
  setupNavigation();
  setupThemeButtons();
  updateActiveThemeButton();

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
      const groupedTabUrls = [];
      
      for (const tab of tabs) {
        const category = getTabCategory(tab.title, tab.url);
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(tab.id);
        groupedTabUrls.push(tab.url);
      }
      
      // Create groups with current theme colors
      let groupsCreated = 0;
      for (const [categoryName, tabIds] of Object.entries(categories)) {
        if (tabIds.length > 0) {
          const groupId = await chrome.tabs.group({ tabIds: tabIds });
          const color = getThemeColorForCategory(categoryName);
          
          await chrome.tabGroups.update(groupId, {
            title: categoryName,
            color: color
          });
          groupsCreated++;
        }
      }
      
      // Save that we have active groups
      await chrome.storage.local.set({ 
        hasActiveGroups: true,
        groupsCreated: new Date().toISOString(),
        groupedTabUrls: groupedTabUrls,
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

  // Keep groups toggle
  keepGroupsToggle.addEventListener('change', async function() {
    currentSettings.keepGroups = this.checked;
    await saveSettings();
    
    if (this.checked) {
      showStatus('✅ Groups will be kept after browser closes', 'success');
    } else {
      showStatus('✅ Groups will be removed after browser closes', 'success');
    }
  });

  // Navigation setup
  function setupNavigation() {
    // Setting button click
    settingBtn.addEventListener('click', () => {
      showMainSection();
      section1.style.display = 'none';
      settingPanel.style.display = 'flex';
    });

    // Change theme button click
    changeThemeBtn.addEventListener('click', () => {
      settingPanel.style.display = 'none';
      themeArea.style.display = 'flex';
    });

    // Back button from settings
    backFromSettings.addEventListener('click', () => {
      settingPanel.style.display = 'none';
      section1.style.display = 'flex';
    });

    // Back button from theme
    backFromTheme.addEventListener('click', () => {
      themeArea.style.display = 'none';
      settingPanel.style.display = 'flex';
    });
  }

  // Show main section function
  function showMainSection() {
    section1.style.display = 'flex';
    settingPanel.style.display = 'none';
    themeArea.style.display = 'none';
  }

  // Theme buttons setup
  function setupThemeButtons() {
    themeButtons.forEach(button => {
      button.addEventListener('click', async function() {
        const themeName = this.getAttribute('data-theme');
        
        if (themeName && themes[themeName]) {
          currentSettings.theme = themeName;
          await saveSettings();
          
          // Update active button styling
          updateActiveThemeButton();
          
          // Apply theme to existing groups
          const success = await applyThemeToGroups(themeName);
          if (success) {
            showStatus(`✅ Applied ${themes[themeName].name} theme!`, 'success');
          } else {
            showStatus(`✅ ${themes[themeName].name} theme set for future groups!`, 'success');
          }
          
          // REMOVED: Automatic navigation back to settings
          // User stays in theme selection area to potentially choose another theme
        }
      });
    });
  }

  // Update active theme button styling - now with border only
  function updateActiveThemeButton() {
    themeButtons.forEach(button => {
      const themeName = button.getAttribute('data-theme');
      if (themeName === currentSettings.theme) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  // Apply theme to existing groups
  async function applyThemeToGroups(themeName) {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (tabs.length === 0) return false;
      
      const groups = await chrome.tabGroups.query({ windowId: tabs[0].windowId });
      if (groups.length === 0) return false;
      
      let groupsUpdated = 0;
      
      for (const group of groups) {
        try {
          const bestCategory = await findBestCategoryForGroup(group.id);
          if (bestCategory) {
            const color = getThemeColorForCategory(bestCategory, themeName);
            await chrome.tabGroups.update(group.id, {
              title: group.title, // Keep original title
              color: color
            });
            groupsUpdated++;
          }
        } catch (error) {
          console.error(`Error updating group ${group.id}:`, error);
        }
      }
      
      return groupsUpdated > 0;
    } catch (error) {
      console.error('Error applying theme to groups:', error);
      return false;
    }
  }

  // Get theme color for category using predefined tab group colors
  function getThemeColorForCategory(category, themeName = currentSettings.theme) {
    const theme = themes[themeName];
    if (!theme) return 'grey';
    
    const categoryIndex = categoryOrder.indexOf(category);
    if (categoryIndex === -1) return 'grey';
    
    // Use predefined tab group colors for this theme
    if (theme.tabGroupColors && theme.tabGroupColors[categoryIndex]) {
      return theme.tabGroupColors[categoryIndex];
    }
    
    // Fallback
    return 'grey';
  }

  // Find best category for group
  async function findBestCategoryForGroup(groupId) {
    try {
      const tabs = await chrome.tabs.query({});
      const groupTabs = tabs.filter(tab => tab.groupId === groupId);
      
      if (groupTabs.length === 0) return null;
      
      const categoryCounts = {};
      for (const tab of groupTabs) {
        const category = getTabCategory(tab.title, tab.url);
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
      
      let bestCategory = null;
      let highestScore = 0;
      for (const [category, score] of Object.entries(categoryCounts)) {
        if (score > highestScore) {
          highestScore = score;
          bestCategory = category;
        }
      }
      
      return bestCategory;
    } catch (error) {
      console.error('Error finding category for group:', error);
      return null;
    }
  }

  // Load settings
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['tabForgeSettings']);
      if (result.tabForgeSettings) {
        currentSettings = result.tabForgeSettings;
        keepGroupsToggle.checked = currentSettings.keepGroups || false;
        console.log('Settings loaded:', currentSettings);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  }

  // Save settings
  async function saveSettings() {
    await chrome.storage.local.set({ tabForgeSettings: currentSettings });
    console.log('Settings saved:', currentSettings);
  }

  // Category detection
  function getTabCategory(title, url) {
    if (!title) title = '';
    if (!url) url = '';
    
    const lowerTitle = title.toLowerCase();
    const lowerUrl = url.toLowerCase();
    
    if (lowerTitle.includes('twitter') || lowerUrl.includes('twitter') ||
        lowerTitle.includes('facebook') || lowerUrl.includes('facebook') ||
        lowerTitle.includes('instagram') || lowerUrl.includes('instagram') ||
        lowerTitle.includes('linkedin') || lowerUrl.includes('linkedin') ||
        lowerTitle.includes('reddit') || lowerUrl.includes('reddit')) 
      return '📱 Social Media';
    
    if (lowerTitle.includes('github') || lowerUrl.includes('github') ||
        lowerTitle.includes('stackoverflow') || lowerUrl.includes('stackoverflow') ||
        lowerTitle.includes('gitlab') || lowerUrl.includes('gitlab') ||
        lowerTitle.includes('codepen') || lowerUrl.includes('codepen') ||
        lowerTitle.includes('vs code') || lowerTitle.includes('visual studio') ||
        lowerTitle.includes('developer') || lowerTitle.includes('programming') ||
        lowerTitle.includes('copilot') || lowerTitle.includes('openai')) 
      return '💻 Development';
    
    if (lowerTitle.includes('amazon') || lowerUrl.includes('amazon') ||
        lowerTitle.includes('ebay') || lowerUrl.includes('ebay') ||
        lowerTitle.includes('flipkart') || lowerUrl.includes('flipkart') ||
        lowerTitle.includes('myntra') || lowerUrl.includes('myntra') ||
        lowerTitle.includes('aliexpress') || lowerUrl.includes('aliexpress') ||
        lowerTitle.includes('shop') || lowerTitle.includes('cart')) 
      return '🛒 Shopping';
    
    if (lowerTitle.includes('gmail') || lowerUrl.includes('gmail') ||
        lowerTitle.includes('outlook') || lowerUrl.includes('outlook') ||
        lowerTitle.includes('yahoo mail') || lowerUrl.includes('yahoo') ||
        lowerTitle.includes('hotmail') || lowerUrl.includes('hotmail') ||
        lowerTitle.includes('slack') || lowerUrl.includes('slack') ||
        lowerTitle.includes('discord') || lowerUrl.includes('discord')) 
      return '📧 Communication';
    
    if (lowerTitle.includes('youtube') || lowerUrl.includes('youtube') ||
        lowerTitle.includes('netflix') || lowerUrl.includes('netflix') ||
        lowerTitle.includes('spotify') || lowerUrl.includes('spotify') ||
        lowerTitle.includes('twitch') || lowerUrl.includes('twitch') ||
        lowerTitle.includes('prime video') || lowerUrl.includes('prime') ||
        lowerTitle.includes('music') || lowerTitle.includes('movie')) 
      return '🎮 Entertainment';
    
    if (lowerTitle.includes('docs') || lowerTitle.includes('notion') ||
        lowerTitle.includes('trello') || lowerTitle.includes('asana') ||
        lowerTitle.includes('calendar') || lowerTitle.includes('drive') ||
        lowerTitle.includes('microsoft') || lowerUrl.includes('microsoft') ||
        lowerTitle.includes('office') || lowerUrl.includes('office')) 
      return '📊 Productivity';
    
    if (lowerTitle.includes('news') || lowerTitle.includes('cnn') ||
        lowerTitle.includes('bbc') || lowerTitle.includes('reuters') ||
        lowerTitle.includes('article') || lowerTitle.includes('blog') ||
        lowerTitle.includes('boeing') || lowerTitle.includes('opensea')) 
      return '📰 News & Info';
    
    return '📁 Other';
  }

  // Status display
  function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = type;
    
    if (type === 'success') {
      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
    }
  }
});