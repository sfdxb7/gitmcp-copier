# GitMCP JSON Copier

*This extension is built with deep appreciation for the incredible work of the [GitMCP team](https://gitmcp.io) who created the amazing service that makes MCP configurations accessible to developers worldwide.*

A Chrome extension that provides one-click MCP (Model Context Protocol) configuration copying for GitHub repositories.

## 🌟 Features

- **Context Menu Integration**: Right-click on any GitHub repository link to access MCP configurations
- **Multi-Platform Support**: Get configurations for Cursor, Claude Desktop, Windsurf, VSCode, Cline, Highlight AI, Augment Code, and Msty Studio
- **One-Click Copy**: Copy JSON configurations directly to clipboard
- **Tabbed Interface**: Clean, organized interface with tabs for different development tools
- **Real-time Fetching**: Fetches the latest configurations from [gitmcp.io](https://gitmcp.io)
- **Error Handling**: Robust error handling with user-friendly messages

## 🚀 Installation

### From Chrome Web Store (Coming Soon)
The extension will be available on the Chrome Web Store.

### Manual Installation (Developer Mode)

1. **Download the Extension**
   - Download the latest release ZIP file from [Releases](../../releases)
   - Or clone this repository: `git clone https://github.com/username/git-mcp-extension.git`

2. **Install in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the extension folder (or extract the ZIP and select the folder)

3. **Verify Installation**
   - You should see "GitMCP JSON Copier" in your extensions list
   - The extension icon should appear in your Chrome toolbar

## 🎯 Usage

### Getting MCP Configurations

1. **Navigate to GitHub**: Visit any GitHub repository page
2. **Right-click on Repository Link**: Right-click on any GitHub repository link
3. **Select GitMCP Option**: Choose "GitMCP JSON Copier" → "Get GitMCP Config"
4. **View Configurations**: A popup will appear with tabbed configurations for different tools
5. **Copy Configuration**: Click the "Copy" button for your desired tool

### Supported Tools

- **Msty Studio**: AI-powered development environment
- **Cursor**: AI-first code editor
- **Claude Desktop**: Anthropic's Claude desktop application
- **Windsurf**: Modern development environment
- **VSCode**: Visual Studio Code with MCP extensions
- **Cline**: AI coding assistant
- **Highlight AI**: AI-powered code analysis
- **Augment Code**: Code enhancement tools

### Chat with Repository

Use the "Chat with this Repo" option to open an AI chat interface with the repository context on gitmcp.io.

## 🛠️ Development

### Prerequisites

- Chrome browser
- Basic knowledge of Chrome extension development

### Project Structure

```
git-mcp-extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for context menus and API calls
├── content.js            # Content script for popup injection
├── popup.html            # Popup HTML (legacy)
├── popup.js              # Popup JavaScript (legacy)
├── popup.css             # Popup styles (legacy)
├── utils.js              # Shared utility functions
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Key Components

#### Background Script (`background.js`)
- Handles context menu creation and clicks
- Fetches configurations from gitmcp.io
- Parses HTML responses to extract JSON configurations
- Stores data for popup display

#### Content Script (`content.js`)
- Injects modal popup directly into web pages
- Creates tabbed interface for different tools
- Handles clipboard operations
- Provides responsive design

#### Utility Functions (`utils.js`)
- Clipboard operations with fallbacks
- HTML escaping and JSON parsing
- Text cleaning utilities

### Building from Source

1. **Clone the Repository**
   ```bash
   git clone https://github.com/username/git-mcp-extension.git
   cd git-mcp-extension
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the project directory

3. **Make Changes**
   - Edit the source files as needed
   - Reload the extension in Chrome to test changes

### Creating a Release Package

```bash
# Create a ZIP package for distribution
powershell -Command "Compress-Archive -Path 'manifest.json','background.js','content.js','popup.html','popup.js','popup.css','utils.js','icons' -DestinationPath '.\GitMCP-JSON-Copier-v1.2.0.zip' -Force"
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

1. Check if the issue already exists in [Issues](../../issues)
2. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser version and OS

### Submitting Pull Requests

1. **Fork the Repository**
2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make Your Changes**
   - Follow existing code style
   - Add comments for complex logic
   - Test thoroughly
4. **Commit Your Changes**
   ```bash
   git commit -m "Add your feature description"
   ```
5. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

### Development Guidelines

- Use meaningful variable and function names
- Add comments for complex logic
- Test on multiple websites and scenarios
- Ensure compatibility with Manifest V3
- Follow Chrome extension best practices

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Working
- Ensure Developer mode is enabled
- Check for console errors in `chrome://extensions/`
- Verify the extension is enabled

#### Context Menu Not Appearing
- Make sure you're right-clicking on a GitHub repository link
- Check that the link matches the pattern: `https://github.com/owner/repo`

#### Configurations Not Loading
- Verify internet connection
- Check if gitmcp.io is accessible
- Look for errors in the browser console

#### Copy Function Not Working
- Ensure the page is served over HTTPS
- Try the fallback copy method if clipboard API fails
- Check browser permissions

### Debug Mode

Enable debug logging by opening Chrome DevTools:
1. Right-click on any page → "Inspect"
2. Go to "Console" tab
3. Look for "GitMCP" prefixed messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [GitMCP](https://gitmcp.io) for providing the MCP configuration service
- [Model Context Protocol](https://modelcontextprotocol.io/) for the underlying technology
- Chrome Extensions team for the development platform

## 📞 Support

- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
- **Email**: [Create an issue for support requests]

## 🔄 Changelog

### v1.2.0
- Enhanced popup interface with tabbed layout
- Added support for Msty Studio configurations
- Improved error handling and user feedback
- Better responsive design for various screen sizes

### v1.1.0
- Added support for multiple development tools
- Improved configuration parsing
- Enhanced clipboard functionality

### v1.0.0
- Initial release
- Basic MCP configuration copying
- Context menu integration

---

**Made with ❤️ for the developer community**
