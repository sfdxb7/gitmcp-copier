# Contributing to GitMCP JSON Copier

Thank you for your interest in contributing to GitMCP JSON Copier! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/git-mcp-extension.git
   cd git-mcp-extension
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** and test thoroughly
5. **Commit your changes**:
   ```bash
   git commit -m "Add descriptive commit message"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request** on GitHub

## 🎯 Ways to Contribute

### 🐛 Bug Reports
- Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include steps to reproduce
- Provide browser version and OS information
- Include console errors if any

### ✨ Feature Requests
- Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Explain the use case and benefits
- Consider implementation complexity

### 📝 Documentation
- Fix typos or improve clarity
- Add examples or use cases
- Update outdated information

### 🔧 Code Contributions
- Bug fixes
- New features
- Performance improvements
- Code quality enhancements

## 🛠️ Development Setup

### Prerequisites
- Chrome browser
- Git
- Text editor or IDE

### Local Development
1. **Load the extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

2. **Test your changes**:
   - Right-click on GitHub repository links
   - Verify context menu appears
   - Test configuration copying
   - Check console for errors

3. **Reload after changes**:
   - Go to `chrome://extensions/`
   - Click the refresh button on the extension
   - Or use `Ctrl+R` in the extensions page

## 📋 Coding Standards

### JavaScript Style
- Use **ES6+** features where appropriate
- **Semicolons** are required
- Use **camelCase** for variables and functions
- Use **PascalCase** for constructors and classes
- **2 spaces** for indentation

### Code Organization
- Keep functions **small and focused**
- Use **descriptive variable names**
- Add **comments for complex logic**
- Group related functions together

### Example Code Style
```javascript
// Good
async function fetchConfiguration(owner, repo) {
  const url = `https://gitmcp.io/${owner}/${repo}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Failed to fetch configuration:', error);
    throw error;
  }
}

// Bad
function fetchConfig(o,r){
const u = `https://gitmcp.io/${o}/${r}`
fetch(u).then(res=>res.text())
}
```

## 🧪 Testing Guidelines

### Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] Context menu appears on GitHub links
- [ ] Configuration popup displays correctly
- [ ] Copy functionality works
- [ ] All supported tools show configurations
- [ ] Error handling works for invalid repositories
- [ ] Responsive design works on different screen sizes

### Test Scenarios
1. **Valid GitHub Repository**:
   - Right-click on `https://github.com/owner/repo`
   - Verify configurations load
   - Test copy functionality

2. **Invalid Repository**:
   - Test with non-existent repositories
   - Verify error messages display

3. **Network Issues**:
   - Test with offline mode
   - Test with slow connections

## 📝 Commit Guidelines

### Commit Message Format
```
type(scope): subject

body (optional)

footer (optional)
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code formatting changes
- **refactor**: Code refactoring
- **test**: Test-related changes
- **chore**: Build process or auxiliary tool changes

### Examples
```bash
feat(popup): add tabbed interface for configurations
fix(clipboard): handle clipboard API fallback properly
docs(readme): update installation instructions
style(background): improve code formatting
```

## 📖 Pull Request Process

### Before Submitting
1. **Test thoroughly** on multiple scenarios
2. **Update documentation** if needed
3. **Follow coding standards**
4. **Write descriptive commit messages**

### Pull Request Description
Include:
- **Summary** of changes
- **Testing** performed
- **Screenshots** if UI changes
- **Breaking changes** if any
- **Related issues** (use `Fixes #123`)

### Review Process
1. **Automated checks** will run
2. **Manual review** by maintainers
3. **Feedback incorporation** if needed
4. **Merge** after approval

## 🐛 Debugging Tips

### Chrome Extension Debugging
1. **Console Logs**:
   ```javascript
   console.log('Debug info:', data);
   ```

2. **Extension Console**:
   - Go to `chrome://extensions/`
   - Click "Inspect views: background page"
   - Check console for background script errors

3. **Content Script Debugging**:
   - Right-click on any webpage
   - Select "Inspect"
   - Check console for content script errors

### Common Issues
- **Manifest errors**: Check `chrome://extensions/` for red error text
- **Permission issues**: Verify required permissions in manifest.json
- **API failures**: Check network tab for failed requests

## 🏗️ Architecture Overview

### File Structure
```
git-mcp-extension/
├── manifest.json      # Extension configuration
├── background.js      # Service worker (context menus, API calls)
├── content.js        # Popup injection and UI
├── popup.*           # Legacy popup files
├── utils.js          # Shared utilities
└── icons/           # Extension icons
```

### Key Components

#### Background Script
- Creates context menus
- Handles API requests to gitmcp.io
- Parses HTML responses
- Manages data storage

#### Content Script
- Injects popup into web pages
- Handles user interactions
- Manages clipboard operations
- Provides responsive UI

## 📚 Resources

### Chrome Extension Development
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

### Related Technologies
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [GitMCP Service](https://gitmcp.io)

## 🤝 Community Guidelines

### Be Respectful
- Use welcoming and inclusive language
- Respect different viewpoints and experiences
- Give and receive constructive feedback gracefully

### Be Helpful
- Help newcomers get started
- Share knowledge and best practices
- Review pull requests thoughtfully

### Be Patient
- Understand that everyone has different skill levels
- Allow time for responses and reviews
- Ask questions when unclear

## 📞 Getting Help

### Where to Ask
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Pull Request Comments**: Code-specific questions

### Information to Include
- **Chrome version** and OS
- **Extension version**
- **Steps to reproduce**
- **Console errors** (if any)
- **Expected vs actual behavior**

## 🏆 Recognition

Contributors will be:
- **Listed** in the project README
- **Credited** in release notes for significant contributions
- **Thanked** in the community

Thank you for contributing to GitMCP JSON Copier! 🎉
