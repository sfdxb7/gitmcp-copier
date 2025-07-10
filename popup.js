// Copy text to clipboard with better error handling
async function copyToClipboard(text) {
  // Try modern clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed:', err);
    }
  }
  
  // Fallback to execCommand
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.cssText = `
    position: fixed;
    left: -999999px;
    top: -999999px;
  `;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('execCommand copy failed:', err);
  }
  
  document.body.removeChild(textArea);
  return success;
}

// Escape HTML for safe display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
  const closeBtn = document.getElementById('close-btn');
  const repoTitle = document.getElementById('repo-title');
  const loading = document.getElementById('loading');
  const configList = document.getElementById('config-list');
  
  // Close button handler
  closeBtn.addEventListener('click', () => {
    window.parent.postMessage({ action: 'close' }, '*');
  });
  
  // Load configurations
  try {
    const data = await chrome.storage.local.get(['currentRepo', 'configurations']);
    
    if (data.currentRepo) {
      repoTitle.textContent = `MCP Config for ${data.currentRepo}`;
    }
    
    if (data.configurations && Object.keys(data.configurations).length > 0) {
      loading.style.display = 'none';
      displayConfigurations(data.configurations);
    } else {
      loading.textContent = 'No configurations found';
    }
  } catch (error) {
    console.error('Error loading configurations:', error);
    loading.textContent = 'Error loading configurations';
  }
});

function displayConfigurations(configs) {
  const configList = document.getElementById('config-list');
  configList.innerHTML = '';
  
  // Add scraped configurations
  Object.entries(configs).forEach(([toolName, config]) => {
    const configItem = createConfigItem(toolName, config);
    configList.appendChild(configItem);
  });
  
  // Add special Msty Studio configuration
  if (configs['Claude Desktop']) {
    const mstyConfig = createMstyStudioConfig(configs['Claude Desktop']);
    configList.appendChild(mstyConfig);
  }
}

function createConfigItem(toolName, config) {
  const item = document.createElement('div');
  item.className = 'config-item';
  
  item.innerHTML = `
    <div class="config-item-header">
      <h3>${toolName}</h3>
      <button class="copy-btn" data-config="${encodeURIComponent(config)}">Copy</button>
    </div>
    <div class="config-preview">${escapeHtml(config)}</div>
  `;
  
  const copyBtn = item.querySelector('.copy-btn');
  copyBtn.addEventListener('click', handleCopy);
  
  return item;
}

function createMstyStudioConfig(claudeConfig) {
  const item = document.createElement('div');
  item.className = 'config-item';
  
  // Transform Claude Desktop config for Msty Studio
  let mstyConfig = '';
  let mstyError = '';
  try {
    const parsed = JSON.parse(claudeConfig);
    if (parsed.mcpServers && parsed.mcpServers.gitmcp) {
      mstyConfig = JSON.stringify(parsed.mcpServers.gitmcp, null, 2);
    } else {
      mstyError = 'No GitMCP server configuration found in Claude Desktop config.';
    }
  } catch (e) {
    console.error('Error transforming config for Msty Studio:', e);
    mstyError = 'Invalid Claude Desktop configuration format.';
  }
  
  item.innerHTML = `
    <div class="config-item-header">
      <h3>Msty Studio</h3>
      <button class="copy-btn" data-config="${encodeURIComponent(mstyConfig)}" ${mstyConfig ? '' : 'disabled'}>Copy</button>
    </div>
    <div class="config-preview">${mstyError ? `<span style="color: red;">${escapeHtml(mstyError)}</span>` : escapeHtml(mstyConfig)}</div>
  `;
  
  const copyBtn = item.querySelector('.copy-btn');
  copyBtn.addEventListener('click', handleCopy);
  
  return item;
}

async function handleCopy(e) {
  const btn = e.target;
  const config = decodeURIComponent(btn.dataset.config);
  
  try {
    await copyToClipboard(config);
    
    // Show success feedback
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error('Copy failed:', error);
    alert('Failed to copy to clipboard');
  }
}
