// Utility functions shared across scripts

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

// Parse JSON safely with better error info
function safeJsonParse(text, context = '') {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`JSON parse error${context ? ` in ${context}` : ''}:`, e);
    return null;
  }
}

// Clean JSON text that might have HTML entities
function cleanJsonText(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .trim();
}
