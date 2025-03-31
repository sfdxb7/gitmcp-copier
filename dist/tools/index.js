import { z } from "zod";
// Helper: fetch a file from a URL.
async function fetchFile(url) {
    try {
        const response = await fetch(url);
        return response.ok ? await response.text() : null;
    }
    catch {
        return null;
    }
}
export function registerTools(mcp, requestHost, requestUrl) {
    mcp.tool("fetch_documentation", "Fetch documentation for the current repository.", {}, async () => fetchDocumentation({ requestHost, requestUrl }));
}
export function registerStdioTools(mcp) {
    mcp.tool("fetch_documentation", "Fetch documentation for the current repository.", {
        requestUrl: z.string(),
    }, async ({ requestUrl }) => {
        return fetchDocumentation({
            requestHost: new URL(requestUrl).host,
            requestUrl,
        });
    });
}
async function fetchDocumentation({ requestHost, requestUrl, }) {
    const hostHeader = requestHost;
    const url = new URL(requestUrl || "", `http://${hostHeader}`);
    const path = url.pathname.split("/").filter(Boolean).join("/");
    let fileUsed;
    let content = null;
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
            throw new Error("Invalid path format for GitHub repo. Expected: {owner}/{repo}");
        }
        // Try fetching from raw.githubusercontent.com using 'main' branch first
        content = await fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/main/docs/docs/llms.txt`);
        fileUsed = "llms.txt (main branch)";
        // If not found, try 'master' branch
        if (!content) {
            content = await fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/master/docs/docs/llms.txt`);
            fileUsed = "llms.txt (master branch)";
        }
        // Fallback to README.md if llms.txt not found in either branch
        if (!content) {
            // Try main branch first
            console.error(`fetching readme.md from main branch https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`);
            content = await fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`);
            console.error("content", content);
            fileUsed = "readme.md (main branch)";
            // If not found, try master branch
            if (!content) {
                content = await fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`);
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
                type: "text",
                text: content,
            },
        ],
    };
}
//# sourceMappingURL=index.js.map