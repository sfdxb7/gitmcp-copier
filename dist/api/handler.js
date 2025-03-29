import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import * as z from 'zod';
// Helper function to fetch a file from a URL.
async function fetchFile(url) {
    try {
        const response = await fetch(url);
        return response.ok ? await response.text() : null;
    }
    catch {
        return null;
    }
}
export default async function handler(req, res) {
    // This endpoint supports only GET for establishing the SSE stream.
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }
    try {
        // Set SSE headers.
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        // Instantiate the MCP server.
        const mcp = new McpServer({ name: 'MCP SSE Server', version: '1.0.0' });
        // Register a tool using mcp.tool().
        // This tool (fetch_documentation) takes an argument "repoPath" (e.g., "langchain-js").
        mcp.tool('fetch_documentation', {
            repoPath: z.string().describe('Repository path (e.g., "langchain-js")'),
        }, async (args) => {
            const { repoPath } = args;
            // Read the incoming host header (e.g., "langchain.gitmcp.io").
            const hostHeader = req.headers.host;
            if (!hostHeader) {
                throw new Error('Missing host header');
            }
            // Map the custom domain to the real one (e.g. replace "gitmcp.io" with "github.io").
            const mappedHost = hostHeader.replace('gitmcp.io', 'github.io');
            // Build the target URL using the provided repoPath.
            let baseURL = `https://${mappedHost}/${repoPath}`;
            if (!baseURL.endsWith('/')) {
                baseURL += '/';
            }
            // Try fetching "llms.txt"; fallback to "readme.md"; else, use fallback content.
            let content = await fetchFile(baseURL + 'llms.txt');
            let fileUsed = 'llms.txt';
            if (!content) {
                content = await fetchFile(baseURL + 'readme.md');
                fileUsed = 'readme.md';
            }
            if (!content) {
                content = 'No documentation found. Generated fallback content.';
                fileUsed = 'generated';
            }
            return {
                fileUsed,
                content: [
                    {
                        type: 'text',
                        text: content,
                    },
                ],
            };
        });
        // Create an SSE transport.
        // According to the SDK, SSEServerTransport takes an endpoint (the URL to which the client should POST messages)
        // and a ServerResponse. Here, we designate "/api/mcp/post" as the endpoint.
        const endpoint = '/api/mcp/post';
        const transport = new SSEServerTransport(endpoint, res);
        // Start the SSE connection.
        await transport.start();
        // Connect the MCP server using the SSE transport.
        await mcp.connect(transport);
        // The connection remains open; MCP messages will be streamed over SSE.
    }
    catch (error) {
        console.error('MCP SSE Server error:', error);
        res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n\n`);
        res.end();
    }
}
//# sourceMappingURL=handler.js.map