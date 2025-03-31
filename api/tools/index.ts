import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Helper: fetch a file from a URL.
async function fetchFile(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

// Helper: search for a file in a GitHub repository using the GitHub Search API
async function searchGitHubRepo(owner: string, repo: string, filename: string): Promise<string | null> {
  try {
    // Use GitHub Search API to find the file
    const searchUrl = `https://api.github.com/search/code?q=filename:${filename}+repo:${owner}/${repo}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // Add GitHub token as environment variable if rate limits become an issue
        ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {})
      }
    });
    
    if (!response.ok) {
      console.warn(`GitHub API search failed: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Check if we found any matches
    if (data.total_count === 0 || !data.items || data.items.length === 0) {
      return null;
    }
    
    // Get the first matching file's path
    const filePath = data.items[0].path;
    
    // Try fetching from both main and master branches in parallel
    const [mainContent, masterContent] = await Promise.all([
      fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`),
      fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/master/${filePath}`)
    ]);
    
    // Return the first non-null content
    return mainContent || masterContent || null;
  } catch (error) {
    console.error(`Error searching GitHub repo ${owner}/${repo} for ${filename}:`, error);
    return null;
  }
}

export function registerTools(
  mcp: McpServer,
  requestHost: string,
  requestUrl?: string
) {
  mcp.tool(
    "fetch_documentation",
    "Fetch documentation for the current repository.",
    {},
    async () => fetchDocumentation({ requestHost, requestUrl })
  );
}

export function registerStdioTools(mcp: McpServer) {
  mcp.tool(
    "fetch_documentation",
    "Fetch documentation for the current repository.",
    {
      requestUrl: z.string(),
    },
    async ({ requestUrl }) => {
      return fetchDocumentation({
        requestHost: new URL(requestUrl).host,
        requestUrl,
      });
    }
  );
}
async function fetchDocumentation({
  requestHost,
  requestUrl,
}: {
  requestHost: string;
  requestUrl?: string;
}) {
  const hostHeader = requestHost;

  const url = new URL(requestUrl || "", `http://${hostHeader}`);
  const path = url.pathname.split("/").filter(Boolean).join("/");

  // Initialize fileUsed to prevent "used before assigned" error
  let fileUsed = "unknown";
  let content: string | null = null;

  // Check for subdomain pattern: {subdomain}.gitmcp.io/{path}
  if (hostHeader.includes(".gitmcp.io")) {
    const subdomain = hostHeader.split(".")[0];
    // Map to github.io
    const baseURL = `https://${subdomain}.github.io/${path}/`;
    content = await fetchFile(baseURL + "llms.txt");
    fileUsed = "llms.txt";
  }
  // Check for github repo pattern: gitmcp.io/{owner}/{repo} or git-mcp.vercel.app/{owner}/{repo}
  else if (hostHeader === "gitmcp.io" || hostHeader === "git-mcp.vercel.app") {
    // Extract owner/repo from path
    const [owner, repo] = path.split("/");
    if (!owner || !repo) {
      throw new Error(
        "Invalid path format for GitHub repo. Expected: {owner}/{repo}"
      );
    }

    // First attempt: Try static paths for llms.txt
    const possibleLocations = [
      "docs/docs/llms.txt",     // Current default
      "llms.txt",               // Root directory
      "docs/llms.txt",          // Common docs folder
      "documentation/llms.txt", // Alternative docs folder
    ];

    // Try each location on 'main' branch first, then 'master' branch
    for (const location of possibleLocations) {
      // Try main branch
      content = await fetchFile(
        `https://raw.githubusercontent.com/${owner}/${repo}/main/${location}`
      );
      
      if (content) {
        fileUsed = `${location} (main branch)`;
        break;
      }
      
      // Try master branch
      content = await fetchFile(
        `https://raw.githubusercontent.com/${owner}/${repo}/master/${location}`
      );
      
      if (content) {
        fileUsed = `${location} (master branch)`;
        break;
      }
    }

    // Fallback to GitHub Search API if static paths don't work for llms.txt
    if (!content) {
      content = await searchGitHubRepo(owner, repo, "llms.txt");
      if (content) {
        fileUsed = "llms.txt (found via GitHub Search API)";
      }
    }

    // Fallback to README.md if llms.txt not found in any location
    if (!content) {
      // Only use static approach for README, no search API
      // Try main branch first
      content = await fetchFile(
        `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`
      );
      fileUsed = "readme.md (main branch)";

      // If not found, try master branch
      if (!content) {
        content = await fetchFile(
          `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`
        );
        fileUsed = "readme.md (master branch)";
      }
    }
  }
  // Default/fallback case
  else {
    // Map "gitmcp.io" to "github.io"
    const mappedHost = hostHeader.replace("gitmcp.io", "github.io");
    let baseURL = `https://${mappedHost}/${path}`;
    if (!baseURL.endsWith("/")) {
      baseURL += "/";
    }
    content = await fetchFile(baseURL + "llms.txt");
    fileUsed = "llms.txt";

    if (!content) {
      content = await fetchFile(baseURL + "readme.md");
      fileUsed = "readme.md";
    }
  }

  if (!content) {
    content = "No documentation found. Generated fallback content.";
    fileUsed = "generated";
  }

  return {
    fileUsed,
    content: [
      {
        type: "text" as const,
        text: content,
      },
    ],
  };
}
