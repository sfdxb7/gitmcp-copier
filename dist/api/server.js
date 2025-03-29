import { z } from "zod";
import { initializeMcpApiHandler } from "../lib/mcp-api-handler.js";
import { Octokit } from "@octokit/rest";
// Initialize GitHub client without a token (unauthenticated)
const octokit = new Octokit();
/**
 * Extracts the subdomain from the host.
 * If the host ends with "vercel.app", return null to ignore subdomains.
 */
function extractSubdomain(host) {
    if (host.endsWith("vercel.app") || host.endsWith("localhost")) {
        return null;
    }
    const parts = host.split(".");
    return parts.length > 2 ? parts[0] : null;
}
/**
 * Determines the target GitHub repository and file path based on the URL path and host.
 *
 * Waterfall logic:
 * 1. If a subdomain exists (and host does not end with "vercel.app"):
 *    - The first path segment is the repo.
 *    - If extra segments exist, join them and append "/llms.txt"; otherwise, default to "llms.txt".
 * 2. Else if the path starts with "docs", decode the remainder as the original GitHub URL and use "llms.txt".
 * 3. Else if there are at least two segments, treat them as [owner, repo] and default to "readme.md".
 */
function determineTarget(pathParts, host) {
    const subdomain = extractSubdomain(host);
    // Case 1: Subdomain exists.
    if (subdomain) {
        if (pathParts.length >= 1) {
            const repo = pathParts[0];
            const filePath = pathParts.length > 1 ? `${pathParts.slice(1).join("/")}/llms.txt` : "llms.txt";
            return { owner: subdomain, repo, filePath };
        }
    }
    // Case 2: If path starts with "docs"
    if (pathParts[0] === "docs" && pathParts.length >= 2) {
        const encodedUrl = pathParts.slice(1).join("/");
        try {
            const decodedUrl = decodeURIComponent(encodedUrl);
            // Expect a decoded URL like "https://github.com/owner/repo" or "github.com/owner/repo"
            const parts = decodedUrl.split("/");
            const githubIndex = parts.findIndex((p) => p.toLowerCase().includes("github.com"));
            if (githubIndex >= 0 && parts.length >= githubIndex + 3) {
                const owner = parts[githubIndex + 1];
                const repo = parts[githubIndex + 2];
                return { owner, repo, filePath: "llms.txt" };
            }
        }
        catch (e) {
            // Fall through if decoding fails.
        }
    }
    // Case 3: Fallback for plain domains (e.g. myapp.vercel.app/A/B)
    if (pathParts.length >= 2) {
        const [owner, repo] = pathParts;
        return { owner, repo, filePath: "readme.md" };
    }
    // Default fallback.
    return { filePath: "readme.md" };
}
/**
 * Fetches file content from GitHub given owner, repo, and file path.
 */
async function fetchFileContent(owner, repo, filePath) {
    try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
        if (!data || !data.content) {
            throw new Error("Invalid response from GitHub API");
        }
        // GitHub returns content as a base64 encoded string.
        return Buffer.from(data.content, "base64").toString("utf8");
    }
    catch (error) {
        if (error.status === 403) {
            throw new Error("Rate limit exceeded. Please try again later.");
        }
        throw error;
    }
}
/**
 * Attempts to fetch the target file content.
 * If fetching target.filePath fails with a 404 and the target isn't already "readme.md",
 * falls back to fetching "readme.md".
 */
async function fetchDocsContent(owner, repo, filePath) {
    try {
        const content = await fetchFileContent(owner, repo, filePath);
        return { content, usedFallback: false };
    }
    catch (error) {
        // If error indicates not found and target isn't already readme.md, try fallback.
        if (error.status === 404 && filePath.toLowerCase() !== "readme.md") {
            const fallbackContent = await fetchFileContent(owner, repo, "readme.md");
            return { content: fallbackContent, usedFallback: true };
        }
        throw error;
    }
}
/**
 * Performs a simple smart query on the document content.
 * Splits the text into paragraphs and returns the first 3 paragraphs that include the query.
 */
function performSmartQuery(content, query) {
    const paragraphs = content.split(/\n\s*\n/);
    const lowerQuery = query.toLowerCase();
    const matches = paragraphs.filter((p) => p.toLowerCase().includes(lowerQuery));
    if (matches.length === 0) {
        return "No matching sections found.";
    }
    return matches.slice(0, 3).join("\n\n");
}
// Initialize the MCP API handler using the mcp-on-vercel template.
const handler = initializeMcpApiHandler((server) => {
    // Register tool "fetchDocs" that fetches docs with optional smart query filtering.
    server.tool("fetchDocs", { path: z.string(), query: z.string().optional() }, async ({ path, query }, context) => {
        // Get request information from server requestData
        const requestData = server.requestData;
        const sessionId = requestData?.sessionId;
        const requestInfo = requestData?.getRequestInfo?.(sessionId);
        // Fall back to environment variable if request info is not available
        const host = requestInfo?.host ||
            requestInfo?.headers?.host ||
            process.env.VERCEL_URL ||
            "git-mcp.vercel.app";
        const pathParts = path.split("/").filter(Boolean);
        const target = determineTarget(pathParts, host);
        if (!target.owner || !target.repo) {
            return {
                content: [{ type: "text", text: "Could not determine GitHub repository from the provided path." }],
            };
        }
        try {
            const { content, usedFallback } = await fetchDocsContent(target.owner, target.repo, target.filePath);
            let output = content;
            if (query) {
                output = performSmartQuery(content, query);
            }
            return {
                content: [{ type: "text", text: output }],
                metadata: {
                    file: usedFallback ? "readme.md" : target.filePath,
                    owner: target.owner,
                    repo: target.repo,
                },
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: `Error fetching file: ${error.message}` }],
            };
        }
    });
}, {
    capabilities: {
        tools: {
            fetchDocs: {
                description: "Fetch documentation from a GitHub project or library",
            },
        },
    },
});
export default handler;
//# sourceMappingURL=server.js.map