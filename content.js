// Inject popup modal directly into page
async function injectPopup() {
  // Remove existing popup if any
  const existing = document.getElementById('gitmcp-popup-container');
  if (existing) existing.remove();
  
  // Get data from storage
  const data = await chrome.storage.local.get(['currentRepo', 'configurations']);
  
  // Create popup container
  const container = document.createElement('div');
  container.id = 'gitmcp-popup-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  // Create popup content - responsive sizing
  const popup = document.createElement('div');
  popup.style.cssText = `
    width: min(90vw, 700px);
    height: min(90vh, 600px);
    background: #1a1a1a;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid #333;
  `;
  
  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    background: #2d2d2d;
    color: white;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #404040;
  `;
  
  const title = document.createElement('h2');
  title.textContent = data.currentRepo ? `MCP Config for ${data.currentRepo}` : 'MCP Config';
  title.style.cssText = `
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    color: #ffffff;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: #ffffff;
    font-size: 24px;
    cursor: pointer;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  `;
  closeBtn.addEventListener('click', () => container.remove());
  closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)');
  closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'none');
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Create content area
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
    height: calc(100% - 60px);
    overflow-y: auto;
    flex: 1;
    background: #1a1a1a;
  `;
  
  // Generate tabbed content based on configurations
  if (data.configurations && Object.keys(data.configurations).length > 0) {
    generateTabbedContent(content, data.configurations);
  } else {
    content.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No configurations found</div>';
  }
  
  popup.appendChild(header);
  popup.appendChild(content);
  container.appendChild(popup);
  document.body.appendChild(container);
  
  // Close on background click
  container.addEventListener('click', (e) => {
    if (e.target === container) {
      container.remove();
    }
  });
}

// Generate tabbed content
function generateTabbedContent(container, configs) {
  // Prepare configurations with Msty Studio first
  const orderedConfigs = {};
  
  // Add Msty Studio first if Claude Desktop config exists
  if (configs['Claude Desktop']) {
    orderedConfigs['Msty Studio'] = extractMstyConfig(configs['Claude Desktop']);
  }
  
  // Add other configurations
  Object.entries(configs).forEach(([toolName, config]) => {
    orderedConfigs[toolName] = config;
  });
  
  // Create tab navigation
  const tabNav = document.createElement('div');
  tabNav.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    border-bottom: 1px solid #404040;
    margin-bottom: 20px;
    background: #2d2d2d;
    border-radius: 8px 8px 0 0;
    padding: 0 4px;
    overflow-x: auto;
  `;
  
  // Create tab content container
  const tabContentContainer = document.createElement('div');
  tabContentContainer.style.cssText = `
    background: #2d2d2d;
    border-radius: 8px;
    padding: 20px;
    min-height: 300px;
  `;
  
  const tabContents = {};
  let firstTab = true;
  
  Object.entries(orderedConfigs).forEach(([toolName, config]) => {
    // Create tab button
    const tabBtn = document.createElement('button');
    tabBtn.textContent = toolName;
    tabBtn.style.cssText = `
      padding: 12px 16px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: ${firstTab ? '#60a5fa' : '#9ca3af'};
      border-bottom: ${firstTab ? '2px solid #60a5fa' : '2px solid transparent'};
      transition: all 0.2s;
      margin: 0 2px;
      white-space: nowrap;
    `;
    
    // Create tab content
    const tabContent = createTabContent(toolName, config);
    tabContent.style.display = firstTab ? 'block' : 'none';
    tabContents[toolName] = tabContent;
    
    // Tab click handler
    tabBtn.addEventListener('click', () => {
      // Update all tab buttons
      Array.from(tabNav.children).forEach(btn => {
        btn.style.color = '#9ca3af';
        btn.style.borderBottom = '2px solid transparent';
      });
      
      // Activate clicked tab
      tabBtn.style.color = '#60a5fa';
      tabBtn.style.borderBottom = '2px solid #60a5fa';
      
      // Show corresponding content
      Object.values(tabContents).forEach(content => content.style.display = 'none');
      tabContents[toolName].style.display = 'block';
    });
    
    // Hover effects
    tabBtn.addEventListener('mouseenter', () => {
      if (tabBtn.style.color !== 'rgb(96, 165, 250)') {
        tabBtn.style.color = '#60a5fa';
      }
    });
    
    tabBtn.addEventListener('mouseleave', () => {
      if (tabBtn.style.borderBottom !== '2px solid rgb(96, 165, 250)') {
        tabBtn.style.color = '#9ca3af';
      }
    });
    
    tabNav.appendChild(tabBtn);
    tabContentContainer.appendChild(tabContent);
    
    firstTab = false;
  });
  
  container.appendChild(tabNav);
  container.appendChild(tabContentContainer);
}

// Extract Msty Studio configuration from Claude Desktop config
function extractMstyConfig(claudeConfig) {
  try {
    const parsed = JSON.parse(claudeConfig);
    if (parsed.mcpServers) {
      // Get the first MCP server configuration
      const firstServerKey = Object.keys(parsed.mcpServers)[0];
      if (firstServerKey && parsed.mcpServers[firstServerKey]) {
        const serverConfig = parsed.mcpServers[firstServerKey];
        
        // Format for Msty Studio (complete configuration)
        const mstyConfig = {
          name: firstServerKey,
          ...serverConfig
        };
        
        return JSON.stringify(mstyConfig, null, 2);
      }
    }
  } catch (e) {
    console.error('Failed to extract Msty config:', e);
  }
  return null;
}

// Create tab content
function createTabContent(toolName, config) {
  const content = document.createElement('div');
  
  if (!config) {
    content.innerHTML = `
      <div style="color: #ef4444; padding: 20px; text-align: center;">
        <p>Unable to generate ${toolName} configuration</p>
      </div>
    `;
    return content;
  }
  
  // Create copy button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.style.cssText = `
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    margin-bottom: 16px;
  `;
  copyBtn.addEventListener('click', () => handleCopy(copyBtn, config));
  copyBtn.addEventListener('mouseenter', () => copyBtn.style.background = '#2563eb');
  copyBtn.addEventListener('mouseleave', () => copyBtn.style.background = '#3b82f6');
  
  // Create code preview
  const preview = document.createElement('div');
  preview.style.cssText = `
    background: #1f2937;
    color: #f9fafb;
    border-radius: 8px;
    padding: 16px;
    font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
    max-height: 400px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
  `;
  preview.textContent = config;
  
  content.appendChild(copyBtn);
  content.appendChild(preview);
  
  return content;
}

// Handle copy functionality
async function handleCopy(button, config) {
  try {
    await navigator.clipboard.writeText(config);
    
    // Show success feedback
    const originalText = button.textContent;
    const originalBg = button.style.background;
    button.textContent = 'Copied!';
    button.style.background = '#28a745';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = originalBg;
    }, 2000);
  } catch (error) {
    console.error('Copy failed:', error);
    alert('Failed to copy to clipboard');
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showPopup') {
    injectPopup();
  } else if (request.action === 'showError') {
    alert(`GitMCP Error: ${request.message}`);
  }
});
