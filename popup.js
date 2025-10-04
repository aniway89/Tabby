// Global variables
let currentSettings = {
  closeBehavior: 'keep',
  theme: 'default'
};

// Theme definitions
const themes = {
  default: {
    '📱 Social Media': { title: '📱 Social Media', color: 'blue' },
    '💻 Development': { title: '💻 Development', color: 'green' },
    '🛒 Shopping': { title: '🛒 Shopping', color: 'yellow' },
    '📧 Email': { title: '📧 Email', color: 'red' },
    '🎮 Entertainment': { title: '🎮 Entertainment', color: 'purple' },
    '📊 Productivity': { title: '📊 Productivity', color: 'cyan' },
    '📁 Other': { title: '📁 Other', color: 'grey' }
  },
  dark: {
    '📱 Social Media': { title: '● Social', color: 'grey' },
    '💻 Development': { title: '● Code', color: 'grey' },
    '🛒 Shopping': { title: '● Shopping', color: 'grey' },
    '📧 Email': { title: '● Mail', color: 'grey' },
    '🎮 Entertainment': { title: '● Media', color: 'grey' },
    '📊 Productivity': { title: '● Work', color: 'grey' },
    '📁 Other': { title: '● Other', color: 'grey' }
  },
  colorful: {
    '📱 Social Media': { title: '🎉 Social Fun', color: 'pink' },
    '💻 Development': { title: '🚀 Dev Time', color: 'orange' },
    '🛒 Shopping': { title: '🛍️ Buy Stuff', color: 'green' },
    '📧 Email': { title: '💌 Messages', color: 'blue' },
    '🎮 Entertainment': { title: '🎯 Fun Time', color: 'red' },
    '📊 Productivity': { title: '📈 Get Work Done', color: 'purple' },
    '📁 Other': { title: '📦 Miscellaneous', color: 'yellow' }
  }
};

document.addEventListener('DOMContentLoaded', function() {
  console.log('Extension loaded!');
  
  // Load saved settings
  loadSettings();
  
  // Tab switching
  setupTabs();
  
  // Organize Tabs Button
  document.getElementById('organizeBtn').addEventListener('click', organizeTabs);
  
  // Reset Groups Button
  document.getElementById('resetBtn').addEventListener('click', resetGroups);
  
  // Save Settings Button
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  
  // Apply Theme Button
  document.getElementById('applyTheme').addEventListener('click', applyTheme);
  
  // Theme selection
  setupThemeSelection();
});

// Tab switching function
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Theme selection setup
function setupThemeSelection() {
  const themeOptions = document.querySelectorAll('.theme-option');
  
  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all
      themeOptions.forEach(opt => opt.classList.remove('selected'));
      // Add to clicked one
      option.classList.add('selected');
    });
  });
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['tabForgeSettings']);
    if (result.tabForgeSettings) {
      currentSettings = result.tabForgeSettings;
      
      // Update UI to match settings
      const radio = document.querySelector(`input[name="closeBehavior"][value="${currentSettings.closeBehavior}"]`);
      if (radio) radio.checked = true;
      
      // Select current theme
      const themeOption = document.querySelector(`.theme-option[data-theme="${currentSettings.theme}"]`);
      if (themeOption) themeOption.classList.add('selected');
    }
  } catch (error) {
    console.log('No settings found, using defaults');
  }
}

// Save settings
async function saveSettings() {
  try {
    const closeBehavior = document.querySelector('input[name="closeBehavior"]:checked').value;
    currentSettings.closeBehavior = closeBehavior;
    
    await chrome.storage.local.set({ tabForgeSettings: currentSettings });
    showStatus('Settings saved!', 'success');
  } catch (error) {
    showStatus('Error saving settings', 'error');
  }
}

// Apply selected theme
async function applyTheme() {
  try {
    const selectedTheme = document.querySelector('.theme-option.selected');
    if (!selectedTheme) {
      showStatus('Please select a theme first', 'error');
      return;
    }
    
    const themeName = selectedTheme.getAttribute('data-theme');
    currentSettings.theme = themeName;
    
    // Save theme preference
    await chrome.storage.local.set({ tabForgeSettings: currentSettings });
    
    // Apply theme to existing groups
    await applyThemeToGroups(themeName);
    showStatus(`Applied ${themeName} theme!`, 'success');
  } catch (error) {
    showStatus('Error applying theme', 'error');
  }
}

// Apply theme to existing groups
async function applyThemeToGroups(themeName) {
  const theme = themes[themeName];
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groups = await chrome.tabGroups.query({ windowId: tabs[0]?.windowId });
  
  for (const group of groups) {
    // Try to match group title with theme categories
    for (const [category, style] of Object.entries(theme)) {
      if (group.title.includes(category.replace(/[^\w\s]/g, '')) || 
          category.includes(group.title.replace(/[^\w\s]/g, ''))) {
        await chrome.tabGroups.update(group.id, {
          title: style.title,
          color: style.color
        });
        break;
      }
    }
  }
}

// Organize tabs function
async function organizeTabs() {
  try {
    showStatus('Getting tabs...', 'info');
    
    const tabs = await chrome.tabs.query({ currentWindow: true });
    showStatus(`Found ${tabs.length} tabs. Organizing...`, 'info');
    
    const categories = {};
    const currentTheme = themes[currentSettings.theme];
    
    for (const tab of tabs) {
      const category = getTabCategory(tab.title, tab.url);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(tab.id);
    }
    
    let groupsCreated = 0;
    for (const [categoryName, tabIds] of Object.entries(categories)) {
      if (tabIds.length > 0) {
        const groupId = await chrome.tabs.group({ tabIds: tabIds });
        const themeStyle = currentTheme[categoryName] || themes.default[categoryName];
        
        await chrome.tabGroups.update(groupId, {
          title: themeStyle.title,
          color: themeStyle.color
        });
        groupsCreated++;
      }
    }
    
    // Save that we have active groups
    await chrome.storage.local.set({ 
      hasActiveGroups: true,
      groupsCreated: new Date().toISOString()
    });
    
    showStatus(`✅ Created ${groupsCreated} groups with ${currentSettings.theme} theme!`, 'success');
    
  } catch (error) {
    console.error('Error:', error);
    showStatus('❌ Error: ' + error.message, 'error');
  }
}

// Reset groups function
async function resetGroups() {
  try {
    showStatus('Resetting groups...', 'info');
    
    const tabs = await chrome.tabs.query({ currentWindow: true });
    await chrome.tabs.ungroup(tabs.map(tab => tab.id));
    
    // Clear active groups flag
    await chrome.storage.local.remove(['hasActiveGroups']);
    
    showStatus('✅ All groups reset!', 'success');
  } catch (error) {
    showStatus('❌ Error resetting groups', 'error');
  }
}

// Simple category detection
function getTabCategory(title, url) {
  if (!title) title = '';
  if (!url) url = '';
  
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  if (lowerTitle.includes('twitter') || lowerUrl.includes('twitter') ||
      lowerTitle.includes('facebook') || lowerUrl.includes('facebook') ||
      lowerTitle.includes('instagram') || lowerUrl.includes('instagram') ||
      lowerTitle.includes('linkedin') || lowerUrl.includes('linkedin')) 
    return '📱 Social Media';
  
  if (lowerTitle.includes('github') || lowerUrl.includes('github') ||
      lowerTitle.includes('stackoverflow') || lowerUrl.includes('stackoverflow') ||
      lowerTitle.includes('gitlab') || lowerUrl.includes('gitlab') ||
      lowerTitle.includes('codepen') || lowerTitle.includes('code') ||
      lowerTitle.includes('programming')) 
    return '💻 Development';
  
  if (lowerTitle.includes('amazon') || lowerUrl.includes('amazon') ||
      lowerTitle.includes('shopping') || lowerTitle.includes('ebay') ||
      lowerTitle.includes('aliexpress') || lowerTitle.includes('store')) 
    return '🛒 Shopping';
  
  if (lowerTitle.includes('gmail') || lowerUrl.includes('gmail') ||
      lowerTitle.includes('outlook') || lowerUrl.includes('outlook') ||
      lowerTitle.includes('email') || lowerTitle.includes('yahoo mail')) 
    return '📧 Email';
  
  if (lowerTitle.includes('youtube') || lowerUrl.includes('youtube') ||
      lowerTitle.includes('netflix') || lowerUrl.includes('netflix') ||
      lowerTitle.includes('spotify') || lowerUrl.includes('spotify') ||
      lowerTitle.includes('twitch') || lowerTitle.includes('music')) 
    return '🎮 Entertainment';
  
  if (lowerTitle.includes('docs') || lowerTitle.includes('notion') ||
      lowerTitle.includes('trello') || lowerTitle.includes('asana') ||
      lowerTitle.includes('calendar') || lowerTitle.includes('drive')) 
    return '📊 Productivity';
  
  return '📁 Other';
}

// Status display function
function showStatus(message, type = 'info') {
  const status = document.getElementById('status');
  status.style.display = 'block';
  status.textContent = message;
  
  if (type === 'success') {
    status.style.background = '#e8f5e8';
    status.style.color = '#2e7d32';
  } else if (type === 'error') {
    status.style.background = '#ffebee';
    status.style.color = '#c62828';
  } else {
    status.style.background = '#f5f5f5';
    status.style.color = '#333';
  }
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
}