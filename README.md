# GitMCP

<p align="center">
  <picture>
  <source srcset="https://github.com/user-attachments/assets/3afe89b9-a06c-4a39-9362-197cbd16edc1" media="(prefers-color-scheme: light)">
  <source srcset="https://github.com/user-attachments/assets/49f70125-89a9-4508-86f6-11da0cb2b124" media="(prefers-color-scheme: dark)">
  <img src="logo-light.png" alt="Logo" width=30% height=30%">
</picture>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#usage">Usage</a> •
  <a href="#examples">Examples</a> •
  <a href="#faq">FAQ</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

## What is GitMCP?

GitMCP is a free, open-source service that seamlessly transforms any GitHub project into a [Model Context Protocol (MCP)](https://modelcontextprotocol.github.io/) endpoint, enabling AI assistants to access and understand the project's documentation effortlessly.

## Features

- **Empower AI with GitHub Project Access**: Direct your AI assistant to GitMCP for instant access to any GitHub project's documentation, complete with semantic search capabilities to optimize token usage.
- **Zero Setup Required**: No configurations or modifications needed — GitMCP works out of the box.
- **Completely Free**

## How It Works

GitMCP serves as a bridge between your GitHub repository's documentation and AI assistants by implementing the Model Context Protocol (MCP). When an AI assistant requires information from your repository, it sends a request to GitMCP. GitMCP retrieves the relevant content and provides semantic search capabilities, ensuring efficient and accurate information delivery.

## Usage

To make your GitHub repository accessible to AI assistants via GitMCP, use the following URL formats:

- For GitHub repositories: `gitmcp.io/{owner}/{repo}` 
- For GitHub Pages sites: `{owner}.gitmcp.io/{repo}`

Congratulations! The chosen GitHub project is now fully accessible to your AI.

Replace `{owner}` with your GitHub username or organization name and `{repo}` with your repository name. Once configured, your AI assistant can access the project's documentation seamlessly.

## Examples

Here are some examples of how to use GitMCP with different repositories:

- **Example 1**: For the repository `https://github.com/octocat/Hello-World`, use: `https://gitmcp.io/octocat/Hello-World`
- **Example 2**: For the GitHub Pages site `langchain-ai.gitmcp.io/langgraph`, use: `https://langchain-ai.gitmcp.io/langgraph`

These URLs enable AI assistants to access and interact with the project's documentation through GitMCP.

## FAQ

### What is the Model Context Protocol?

The [Model Context Protocol](https://modelcontextprotocol.github.io/) is a standard that allows AI assistants to request and receive additional context from external sources in a structured manner, enhancing their understanding and performance.

### Does GitMCP work with any AI assistant?

Yes, GitMCP is compatible with any AI assistant supporting the Model Context Protocol, including tools like Cursor, VSCode, Claude, etc.

### Is GitMCP compatible with all GitHub projects?

Absolutely! GitMCP works with any public GitHub repository without requiring any modifications. It prioritizes the `llms.txt` file and falls back to `README.md` if the former is unavailable. Future updates aim to support additional documentation methods and even generate content dynamically.

### Does GitMCP cost money?

No, GitMCP is a free service to the community with no associated costs.

## Privacy

GitMCP doesn't store any personally identifiable information or queries.

## Contributing

We welcome contributions! If you have ideas, suggestions, or improvements, please feel free to open issues or submit pull requests to enhance GitMCP.

## License

This project is licensed under the [MIT License](LICENSE).
