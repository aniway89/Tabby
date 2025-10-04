document.addEventListener('DOMContentLoaded', function() {
  const button = document.getElementById('organizeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const status = document.getElementById('status');
  
  if (!button || !resetBtn || !status) return;

  // Load saved preference
  loadSavePreference();

  // Organize tabs button
  button.addEventListener('click', async () => {
    try {
      const saveMode = document.querySelector('input[name="saveMode"]:checked').value;
      await saveUserPreference(saveMode);
      
      button.textContent = '🔄 Analyzing...';
      button.classList.add('loading');
      status.style.display = 'block';
      status.textContent = 'Scanning your tabs...';
      
      const tabs = await chrome.tabs.query({ currentWindow: true });
      status.textContent = `Found ${tabs.length} tabs to organize...`;
      
      // Analyze and group tabs
      await organizeTabs(tabs, status);
      
      // If user selected "unsave", store group info to ungroup later
      if (saveMode === 'unsave') {
        await storeGroupsForCleanup();
      }
      
      button.textContent = '✅ Done! Re-organize';
      button.classList.remove('loading');
      
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Error: ' + error.message;
      status.style.color = '#ff6b6b';
      button.textContent = '❌ Try Again';
      button.classList.remove('loading');
    }
  });

  // Reset groups button
  resetBtn.addEventListener('click', async () => {
    try {
      resetBtn.textContent = '🔄 Resetting...';
      resetBtn.classList.add('loading');
      status.style.display = 'block';
      status.textContent = 'Removing all tab groups...';
      
      await ungroupAllTabs();
      await clearStoredGroups();
      
      status.textContent = '✅ All tab groups removed!';
      resetBtn.textContent = '🗑️ Reset All Groups';
      resetBtn.classList.remove('loading');
      
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Error: ' + error.message;
      status.style.color = '#ff6b6b';
      resetBtn.textContent = '❌ Reset Failed';
      resetBtn.classList.remove('loading');
    }
  });
});

// NEW: Load user's save preference
async function loadSavePreference() {
  try {
    const result = await chrome.storage.local.get(['savePreference']);
    if (result.savePreference) {
      const radio = document.querySelector(`input[value="${result.savePreference}"]`);
      if (radio) radio.checked = true;
    }
  } catch (error) {
    console.log('No saved preference found');
  }
}

// NEW: Save user preference
async function saveUserPreference(preference) {
  await chrome.storage.local.set({ savePreference: preference });
}

// NEW: Store group info for cleanup
async function storeGroupsForCleanup() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groups = {};
  
  for (const tab of tabs) {
    if (tab.groupId !== -1) {
      groups[tab.groupId] = true;
    }
  }
  
  const groupIds = Object.keys(groups);
  await chrome.storage.local.set({ temporaryGroups: groupIds });
}

// NEW: Clear stored groups
async function clearStoredGroups() {
  await chrome.storage.local.remove(['temporaryGroups']);
}

// Main organization function
async function organizeTabs(tabs, statusElement) {
  const categories = {};
  
  // Step 1: Categorize each tab
  statusElement.textContent = 'Categorizing tabs...';
  
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const category = categorizeTab(tab.title, tab.url);
    
    if (!categories[category]) {
      categories[category] = {
        tabIds: [],
        name: category,
        color: getColorForCategory(category)
      };
    }
    categories[category].tabIds.push(tab.id);
    
    statusElement.textContent = `Categorized ${i+1}/${tabs.length} tabs...`;
  }
  
  // Step 2: Create tab groups in browser
  statusElement.textContent = 'Creating tab groups...';
  
  let groupsCreated = 0;
  const totalGroups = Object.keys(categories).length;
  
  for (const categoryName in categories) {
    const category = categories[categoryName];
    
    if (category.tabIds.length > 0) {
      // Create actual tab group in Chrome
      const groupId = await chrome.tabs.group({
        tabIds: category.tabIds,
        createProperties: { windowId: tabs[0].windowId }
      });
      
      // Set group title and color
      await chrome.tabGroups.update(groupId, {
        title: category.name,
        color: category.color
      });
      
      groupsCreated++;
      statusElement.textContent = `Created group ${groupsCreated}/${totalGroups}: ${category.name}`;
    }
  }
  
  // Final status
  statusElement.innerHTML = `
    <strong>✅ Tab Organization Complete!</strong><br>
    • Created ${groupsCreated} tab groups<br>
    • Organized ${tabs.length} tabs<br>
    <small>Your tabs are now neatly grouped in the browser!</small>
  `;
}

// Reset function: Ungroup all tabs
async function ungroupAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const tabIds = tabs.map(tab => tab.id);
  
  if (tabIds.length > 0) {
    await chrome.tabs.ungroup(tabIds);
  }
}

// Color mapping for different categories
function getColorForCategory(category) {
  const colorMap = {
    '📱 Social Media': 'blue',
    '💻 Development': 'green', 
    '🛒 Shopping': 'yellow',
    '📧 Communication': 'red',
    '🎮 Entertainment': 'purple',
    '📊 Productivity': 'cyan',
    '📰 News': 'orange',
    '📚 Learning': 'pink',
    '📁 Other': 'grey'
  };
  
  return colorMap[category] || 'grey';
}

// Enhanced categorization function
function categorizeTab(title, url) {
  if (!title) title = '';
  if (!url) url = '';
  
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url.toLowerCase();
  
  // Social Media
  if (lowerTitle.includes('twitter') || lowerUrl.includes('twitter') ||
      lowerTitle.includes('facebook') || lowerUrl.includes('facebook') ||
      lowerTitle.includes('instagram') || lowerUrl.includes('instagram') ||
      lowerTitle.includes('linkedin') || lowerUrl.includes('linkedin')) 
    return '📱 Social Media';
  
  // Development
  if (lowerTitle.includes('github') || lowerUrl.includes('github') ||
      lowerTitle.includes('stackoverflow') || lowerUrl.includes('stackoverflow') ||
      lowerTitle.includes('gitlab') || lowerUrl.includes('gitlab') ||
      lowerTitle.includes('codepen') || lowerUrl.includes('codepen') ||
      lowerTitle.includes('vs code') || lowerTitle.includes('visual studio')) 
    return '💻 Development';
  
  // Shopping
  if (lowerTitle.includes('amazon') || lowerUrl.includes('amazon') ||
      lowerTitle.includes('ebay') || lowerUrl.includes('ebay') ||
      lowerTitle.includes('shopping') || lowerUrl.includes('shop') ||
      lowerTitle.includes('aliexpress') || lowerUrl.includes('aliexpress')) 
    return '🛒 Shopping';
  
  // Communication
  if (lowerTitle.includes('gmail') || lowerUrl.includes('gmail') ||
      lowerTitle.includes('outlook') || lowerUrl.includes('outlook') ||
      lowerTitle.includes('slack') || lowerUrl.includes('slack') ||
      lowerTitle.includes('discord') || lowerUrl.includes('discord')) 
    return '📧 Communication';
  
  // Entertainment
  if (lowerTitle.includes('youtube') || lowerUrl.includes('youtube') ||
      lowerTitle.includes('netflix') || lowerUrl.includes('netflix') ||
      lowerTitle.includes('spotify') || lowerUrl.includes('spotify') ||
      lowerTitle.includes('twitch') || lowerUrl.includes('twitch')) 
    return '🎮 Entertainment';
  
  // Productivity
  if (lowerTitle.includes('docs') || lowerTitle.includes('notion') ||
      lowerTitle.includes('trello') || lowerTitle.includes('asana') ||
      lowerTitle.includes('calendar') || lowerUrl.includes('calendar')) 
    return '📊 Productivity';
  
  // News
  if (lowerTitle.includes('news') || lowerTitle.includes('cnn') ||
      lowerTitle.includes('bbc') || lowerTitle.includes('reuters') ||
      lowerTitle.includes('reddit') || lowerUrl.includes('reddit')) 
    return '📰 News';
  
  // Learning
  if (lowerTitle.includes('coursera') || lowerUrl.includes('coursera') ||
      lowerTitle.includes('udemy') || lowerUrl.includes('udemy') ||
      lowerTitle.includes('w3schools') || lowerUrl.includes('w3schools')) 
    return '📚 Learning';
  
  return '📁 Other';
}