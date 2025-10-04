// Global variables
let currentSettings = {
  keepGroups: false, // Default: Auto ungroup
  theme: 'professional'
};

let selectedTheme = 'professional';

document.addEventListener('DOMContentLoaded', function() {
  console.log('TabForge extension loaded!');
  initializeExtension();
});

async function initializeExtension() {
  await loadSettings();
  setupTabNavigation();
  loadThemes();
  setupEventListeners();
}

function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

function loadThemes() {
  const themeGrid = document.getElementById('themeGrid');
  themeGrid.innerHTML = '';

  for (const [key, theme] of Object.entries(themes)) {
    const themeCard = document.createElement('div');
    themeCard.className = `theme-card ${key === currentSettings.theme ? 'selected' : ''}`;
    themeCard.setAttribute('data-theme', key);
    
    themeCard.innerHTML = `
      <h4>${theme.name}</h4>
      <p>${theme.description}</p>
      <div class="theme-features">
        ${theme.features.map(feat => `<span class="theme-badge">${feat}</span>`).join('')}
      </div>
    `;
    
    themeCard.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('selected');
      });
      themeCard.classList.add('selected');
      
      selectedTheme = key;
      previewTheme(key);
      
      // Enable apply button
      document.getElementById('applyTheme').disabled = false;
    });
    
    themeGrid.appendChild(themeCard);
  }

  previewTheme(currentSettings.theme);
}

function previewTheme(themeKey) {
  const theme = themes[themeKey];
  const previewContent = document.getElementById('previewContent');
  
  // Add theme class to body for color preview
  document.body.className = '';
  document.body.classList.add(`theme-${themeKey.replace(' ', '-')}`);
  
  let previewHTML = '';
  for (const [category, style] of Object.entries(theme.categories)) {
    previewHTML += `
      <div class="preview-item ${style.previewClass}">
        <span class="preview-icon">${style.icon}</span>
        <span class="preview-title">${style.title}</span>
        <span class="preview-color">${style.color}</span>
      </div>
    `;
  }
  
  previewContent.innerHTML = previewHTML;
}

function setupEventListeners() {
  document.getElementById('organizeBtn').addEventListener('click', organizeTabs);
  document.getElementById('resetBtn').addEventListener('click', resetGroups);
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('applyTheme').addEventListener('click', applyTheme);
  document.getElementById('collapseBtn').addEventListener('click', collapseOtherGroups);
  document.getElementById('expandBtn').addEventListener('click', expandAllGroups);
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['tabForgeSettings']);
    if (result.tabForgeSettings) {
      currentSettings = result.tabForgeSettings;
      selectedTheme = currentSettings.theme;
      
      const toggle = document.getElementById('keepGroupsToggle');
      if (toggle) {
        toggle.checked = currentSettings.keepGroups;
      }
    }
  } catch (error) {
    console.log('No settings found, using defaults');
  }
}

async function saveSettings() {
  try {
    const keepGroupsToggle = document.getElementById('keepGroupsToggle');
    currentSettings.keepGroups = keepGroupsToggle.checked;
    
    await chrome.storage.local.set({ tabForgeSettings: currentSettings });
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Error saving settings', 'error');
  }
}

async function applyTheme() {
  try {
    const selectedThemeCard = document.querySelector('.theme-card.selected');
    if (!selectedThemeCard) {
      showStatus('Please select a theme first', 'error');
      return;
    }
    
    const themeName = selectedThemeCard.getAttribute('data-theme');
    const theme = themes[themeName];
    
    // Update current settings
    currentSettings.theme = themeName;
    selectedTheme = themeName;
    
    // Save theme preference
    await chrome.storage.local.set({ tabForgeSettings: currentSettings });
    
    // Apply theme to existing groups
    const success = await applyThemeToExistingGroups(themeName);
    
    if (success) {
      showStatus(`✅ Applied ${theme.name} theme to all groups!`, 'success');
    } else {
      showStatus(`✅ ${theme.name} theme saved! Create new groups to see it.`, 'success');
    }
  } catch (error) {
    console.error('Error applying theme:', error);
    showStatus('Error applying theme', 'error');
  }
}

async function applyThemeToExistingGroups(themeName) {
  const theme = themes[themeName];
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  if (tabs.length === 0) return false;
  
  const groups = await chrome.tabGroups.query({ windowId: tabs[0].windowId });
  
  if (groups.length === 0) return false;
  
  let groupsUpdated = 0;
  
  for (const group of groups) {
    try {
      // Analyze the tabs in this group to determine the best category
      const bestCategory = await findBestCategoryForGroup(group.id);
      
      if (bestCategory && theme.categories[bestCategory]) {
        const style = theme.categories[bestCategory];
        
        // Update the group with new theme
        await chrome.tabGroups.update(group.id, {
          title: `${style.icon} ${style.title}`,
          color: style.color
        });
        
        groupsUpdated++;
      }
    } catch (error) {
      console.error(`Error updating group ${group.id}:`, error);
    }
  }
  
  console.log(`Theme applied: Updated ${groupsUpdated} groups`);
  return groupsUpdated > 0;
}

async function findBestCategoryForGroup(groupId) {
  try {
    const tabs = await chrome.tabs.query({});
    const groupTabs = tabs.filter(tab => tab.groupId === groupId);
    
    if (groupTabs.length === 0) return null;
    
    // Count categories from all tabs in the group
    const categoryScores = {};
    
    for (const tab of groupTabs) {
      const category = getTabCategory(tab.title, tab.url);
      categoryScores[category] = (categoryScores[category] || 0) + 1;
    }
    
    // Find the most common category
    let bestCategory = null;
    let highestScore = 0;
    
    for (const [category, score] of Object.entries(categoryScores)) {
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

async function organizeTabs() {
  try {
    const btn = document.getElementById('organizeBtn');
    btn.classList.add('loading');
    showStatus('Analyzing your tabs...', 'info');
    
    const themeToUse = selectedTheme;
    const currentTheme = themes[themeToUse];
    
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    if (tabs.length === 0) {
      showStatus('No tabs found to organize', 'error');
      btn.classList.remove('loading');
      return;
    }
    
    showStatus(`Found ${tabs.length} tabs. Organizing with ${currentTheme.name} theme...`, 'info');
    
    // Ungroup all tabs first for clean start
    await chrome.tabs.ungroup(tabs.map(tab => tab.id));
    
    const categories = {};
    
    // Categorize tabs
    for (const tab of tabs) {
      const category = getTabCategory(tab.title, tab.url);
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(tab.id);
    }
    
    // Create groups with theme
    let groupsCreated = 0;
    for (const [categoryName, tabIds] of Object.entries(categories)) {
      if (tabIds.length > 0) {
        const groupId = await chrome.tabs.group({ tabIds: tabIds });
        const themeStyle = currentTheme.categories[categoryName];
        
        if (themeStyle) {
          await chrome.tabGroups.update(groupId, {
            title: `${themeStyle.icon} ${style.title}`,
            color: themeStyle.color
          });
          groupsCreated++;
        }
      }
    }
    
    // Save settings
    await chrome.storage.local.set({ 
      hasActiveGroups: true,
      tabForgeSettings: currentSettings
    });
    
    btn.classList.remove('loading');
    showStatus(`✅ Created ${groupsCreated} groups with ${currentTheme.name} theme!`, 'success');
    
  } catch (error) {
    console.error('Error organizing tabs:', error);
    document.getElementById('organizeBtn').classList.remove('loading');
    showStatus('❌ Error organizing tabs', 'error');
  }
}

async function resetGroups() {
  try {
    const btn = document.getElementById('resetBtn');
    btn.classList.add('loading');
    showStatus('Resetting groups...', 'info');
    
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    if (tabs.length > 0) {
      await chrome.tabs.ungroup(tabs.map(tab => tab.id));
    }
    
    await chrome.storage.local.remove(['hasActiveGroups']);
    btn.classList.remove('loading');
    showStatus('✅ All groups have been reset!', 'success');
    
  } catch (error) {
    console.error('Error resetting groups:', error);
    document.getElementById('resetBtn').classList.remove('loading');
    showStatus('❌ Error resetting groups', 'error');
  }
}

// NEW: Collapse Other Groups Feature
async function collapseOtherGroups() {
  try {
    const btn = document.getElementById('collapseBtn');
    btn.classList.add('loading');
    showStatus('Collapsing other groups...', 'info');
    
    const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
    if (tabs.length === 0) {
      showStatus('No active tab found', 'error');
      btn.classList.remove('loading');
      return;
    }
    
    const activeTab = tabs[0];
    const activeGroupId = activeTab.groupId;
    
    const groups = await chrome.tabGroups.query({ windowId: activeTab.windowId });
    
    let collapsedCount = 0;
    for (const group of groups) {
      if (group.id !== activeGroupId && !group.collapsed) {
        await chrome.tabGroups.update(group.id, { collapsed: true });
        collapsedCount++;
      }
    }
    
    btn.classList.remove('loading');
    showStatus(`✅ Collapsed ${collapsedCount} groups!`, 'success');
    
  } catch (error) {
    console.error('Error collapsing groups:', error);
    document.getElementById('collapseBtn').classList.remove('loading');
    showStatus('❌ Error collapsing groups', 'error');
  }
}

// NEW: Expand All Groups Feature
async function expandAllGroups() {
  try {
    const btn = document.getElementById('expandBtn');
    btn.classList.add('loading');
    showStatus('Expanding all groups...', 'info');
    
    const tabs = await chrome.tabs.query({ currentWindow: true });
    if (tabs.length === 0) {
      btn.classList.remove('loading');
      return;
    }
    
    const groups = await chrome.tabGroups.query({ windowId: tabs[0].windowId });
    
    let expandedCount = 0;
    for (const group of groups) {
      if (group.collapsed) {
        await chrome.tabGroups.update(group.id, { collapsed: false });
        expandedCount++;
      }
    }
    
    btn.classList.remove('loading');
    showStatus(`✅ Expanded ${expandedCount} groups!`, 'success');
    
  } catch (error) {
    console.error('Error expanding groups:', error);
    document.getElementById('expandBtn').classList.remove('loading');
    showStatus('❌ Error expanding groups', 'error');
  }
}

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
      lowerTitle.includes('developer') || lowerTitle.includes('programming')) 
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
      lowerTitle.includes('inbox') || lowerTitle.includes('email')) 
    return '📧 Email';
  
  if (lowerTitle.includes('youtube') || lowerUrl.includes('youtube') ||
      lowerTitle.includes('netflix') || lowerUrl.includes('netflix') ||
      lowerTitle.includes('spotify') || lowerUrl.includes('spotify') ||
      lowerTitle.includes('twitch') || lowerUrl.includes('twitch') ||
      lowerTitle.includes('prime video') || lowerUrl.includes('prime') ||
      lowerTitle.includes('music') || lowerTitle.includes('movie')) 
    return '🎮 Entertainment';
  
  if (lowerTitle.includes('docs') || lowerTitle.includes('notion') ||
      lowerTitle.includes('trello') || lowerTitle.includes('asana') ||
      lowerTitle.includes('slack') || lowerTitle.includes('discord') ||
      lowerTitle.includes('calendar') || lowerTitle.includes('drive')) 
    return '📊 Productivity';
  
  return '📁 Other';
}

function showStatus(message, type = 'info') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status-message status-${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 4000);
  } else {
    status.style.display = 'block';
  }
}