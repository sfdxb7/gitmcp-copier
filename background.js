// Clean JSON text that might have HTML entities
function cleanJsonText(text) {
  // Replace HTML entities with their actual characters
  const ampQuot = '&' + 'quot;';
  const ampLt = '&' + 'lt;';
  const ampGt = '&' + 'gt;';
  const ampAmp = '&' + 'amp;';
  const amp39 = '&' + '#39;';
  
  return text
    .replace(new RegExp(ampQuot, 'g'), '"')
    .replace(new RegExp(ampLt, 'g'), '<')
    .replace(new RegExp(ampGt, 'g'), '>')
    .replace(new RegExp(ampAmp, 'g'), '&')
    .replace(new RegExp(amp39, 'g'), "'")
    .trim();
}

// GitHub repository URL pattern
const GITHUB_REPO_PATTERN = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;

// Create context menu items with targetUrlPatterns
chrome.runtime.onInstalled.addListener(() => {
  // Main context menu - only shows on GitHub repo links
  chrome.contextMenus.create({
    id: "gitmcp-parent",
    title: "GitMCP JSON Copier",
    contexts: ["link"],
    targetUrlPatterns: ["https://github.com/*/*"]
  });

  // Get GitMCP Config
  chrome.contextMenus.create({
    id: "get-config",
    parentId: "gitmcp-parent",
    title: "Get GitMCP Config",
    contexts: ["link"]
  });

  // Chat with this Repo
  chrome.contextMenus.create({
    id: "chat-repo",
    parentId: "gitmcp-parent",
    title: "Chat with this Repo",
    contexts: ["link"]
  });

  // Separator
  chrome.contextMenus.create({
    id: "separator",
    parentId: "gitmcp-parent",
    type: "separator",
    contexts: ["link"]
  });

  // Visit GitMCP Website
  chrome.contextMenus.create({
    id: "visit-site",
    parentId: "gitmcp-parent",
    title: "Visit GitMCP Website",
    contexts: ["link"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const linkUrl = info.linkUrl;
  const match = linkUrl.match(GITHUB_REPO_PATTERN);
  
  if (!match) return;
  
  const owner = match[1];
  let repo = match[2];
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }
  
  switch (info.menuItemId) {
    case "get-config":
      handleGetConfig(owner, repo, tab);
      break;
    case "chat-repo":
      chrome.tabs.create({ url: `https://gitmcp.io/${owner}/${repo}/chat` });
      break;
    case "visit-site":
      chrome.tabs.create({ url: "https://gitmcp.io" });
      break;
  }
});

// Fetch and parse GitMCP configurations
async function handleGetConfig(owner, repo, tab) {
  const url = `https://gitmcp.io/${owner}/${repo}`;
  console.log('Fetching configurations from:', url);
  console.log('Owner:', owner, 'Repo:', repo);
  
  try {
    const response = await fetch(url);
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('HTML response length:', html.length);
    
    // Parse configurations from HTML using DOMParser
    const configs = parseConfigurations(html);
    console.log('Parsed configurations:', configs);
    
    // Store data for popup
    await chrome.storage.local.set({
      currentRepo: `${owner}/${repo}`,
      configurations: configs
    });
    
    // Inject and show popup
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(tab.id, { action: 'showPopup' });
    });
    
  } catch (error) {
    console.error('Error fetching configurations:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    let message = `Failed to fetch configurations from ${url}. Error: ${error.message}`;
    chrome.tabs.sendMessage(tab.id, { 
      action: 'showError', 
      message: message
    });
  }
}

// Parse configurations from GitMCP HTML using string manipulation
function parseConfigurations(html) {
  const configs = {};
  console.log('Starting HTML parsing...');
  
  // Map tab IDs to tool names
  const toolNames = {
    'tab-cursor': 'Cursor',
    'tab-claude-desktop': 'Claude Desktop', 
    'tab-windsurf': 'Windsurf',
    'tab-vscode': 'VSCode',
    'tab-cline': 'Cline',
    'tab-highlight-ai': 'Highlight AI',
    'tab-augment-code': 'Augment Code'
  };
  
  // Look for each tab and extract its JSON configuration
  Object.entries(toolNames).forEach(([tabId, toolName]) => {
    console.log(`Looking for ${toolName} config in ${tabId}...`);
    
    // Find the tab content
    const tabRegex = new RegExp(`<div id="${tabId}"[^>]*>([\\s\\S]*?)</div>(?=\\s*<div id="tab-|\\s*</div>\\s*</div>\\s*</div>)`, 'g');
    const tabMatch = tabRegex.exec(html);
    
    if (tabMatch) {
      const tabContent = tabMatch[1];
      console.log(`Found ${toolName} tab content, length: ${tabContent.length}`);
      
      // Extract JSON from pre tags within this tab
      const preRegex = /<pre[^>]*>([^<]*(?:<(?!\/pre>)[^<]*)*)<\/pre>/g;
      let preMatch;
      
      while ((preMatch = preRegex.exec(tabContent)) !== null) {
        const preContent = preMatch[1];
        console.log(`Processing ${toolName} pre content:`, preContent.substring(0, 100) + '...');
        
        // Clean HTML entities and extract JSON
        const cleanContent = cleanJsonText(preContent);
        console.log(`Cleaned ${toolName} content:`, cleanContent.substring(0, 100) + '...');
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(cleanContent);
          console.log(`Successfully parsed ${toolName} JSON:`, parsed);
          
          // Check if it looks like an MCP configuration
          if (parsed.mcpServers || parsed.servers || (parsed.command && parsed.args)) {
            configs[toolName] = cleanContent;
            console.log(`Added ${toolName} config`);
            break; // Only take the first valid JSON per tool
          }
        } catch (e) {
          console.log(`JSON parse failed for ${toolName}:`, e.message);
        }
      }
    } else {
      console.log(`No tab content found for ${toolName}`);
    }
  });
  
  // Fallback: Extract all JSON from pre tags if no tab-specific configs found
  if (Object.keys(configs).length === 0) {
    console.log('No tab-specific configs found, trying fallback extraction...');
    
    const preTagRegex = /<pre[^>]*>([^<]*(?:<(?!\/pre>)[^<]*)*)<\/pre>/g;
    let match;
    let configIndex = 1;
    
    while ((match = preTagRegex.exec(html)) !== null) {
      const preContent = match[1];
      console.log(`Processing fallback pre tag ${configIndex}:`, preContent.substring(0, 100) + '...');
      
      const cleanContent = cleanJsonText(preContent);
      
      try {
        const parsed = JSON.parse(cleanContent);
        console.log(`Successfully parsed fallback JSON ${configIndex}:`, parsed);
        
        if (parsed.mcpServers || parsed.servers) {
          const configName = `Configuration ${configIndex}`;
          configs[configName] = cleanContent;
          console.log(`Added ${configName}`);
          configIndex++;
        }
      } catch (e) {
        console.log(`Fallback JSON parse failed for pre tag ${configIndex}:`, e.message);
      }
    }
  }
  
  console.log('Final configs:', Object.keys(configs));
  return configs;
}

// No need for runtime message listener for context menu updates anymore
