import type { NextApiRequest, NextApiResponse } from 'next';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import * as z from 'zod';

// Helper: fetch a file from a URL.
async function fetchFile(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

// For testing: a simple in-memory store for active SSE transports keyed by sessionId.
let activeTransports: { [sessionId: string]: SSEServerTransport } = {};

function flushResponse(res: NextApiResponse) {
  const maybeFlush = (res as any).flush;
  if (typeof maybeFlush === 'function') {
    maybeFlush.call(res);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  
  if (req.method === 'GET') {
    try {
      // Instantiate the MCP server.
      const mcp = new McpServer({ name: 'MCP SSE Server', version: '1.0.0' });
      
      // Register the "fetch_documentation" tool.
      mcp.tool(
        'fetch_documentation',
        'Fetch documentation for the current repository.',
        {},
        async () => {
          const hostHeader = req.headers.host;
          if (!hostHeader) {
            throw new Error('Missing host header');
          }
          
          const url = new URL(req.url || "", `http://${hostHeader}`);
          const path = url.pathname.split('/').filter(Boolean).join('/');
          
          let fileUsed: string;
          let content: string | null = null;
          
          // Check for subdomain pattern: {subdomain}.gitmcp.io/{path}
          if (hostHeader.includes('.gitmcp.io')) {
            const subdomain = hostHeader.split('.')[0];
            // Map to github.io
            const baseURL = `https://${subdomain}.github.io/${path}/`;
            content = await fetchFile(baseURL + 'llms.txt');
            fileUsed = 'llms.txt';
          } 
          // Check for github repo pattern: gitmcp.io/{owner}/{repo} or git-mcp.vercel.app/{owner}/{repo}
          else if (hostHeader === 'gitmcp.io' || hostHeader === 'git-mcp.vercel.app') {
            // Extract owner/repo from path
            const [owner, repo] = path.split('/');
            if (!owner || !repo) {
              throw new Error('Invalid path format for GitHub repo. Expected: {owner}/{repo}');
            }
            
            // Try fetching from raw.githubusercontent.com using 'main' branch first
            content = await fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/main/docs/docs/llms.txt`);
            fileUsed = 'llms.txt (main branch)';
            
            // If not found, try 'master' branch
            if (!content) {
              content = await fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/master/docs/docs/llms.txt`);
              fileUsed = 'llms.txt (master branch)';
            }
            
            // Fallback to README.md if llms.txt not found in either branch
            if (!content) {
              // Try main branch first
              content = await fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`);
              fileUsed = 'readme.md (main branch)';
              
              // If not found, try master branch
              if (!content) {
                content = await fetchFile(`https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`);
                fileUsed = 'readme.md (master branch)';
              }
            }
          }
          // Default/fallback case
          else {
            // Map "gitmcp.io" to "github.io"
            const mappedHost = hostHeader.replace('gitmcp.io', 'github.io');
            let baseURL = `https://${mappedHost}/${path}`;
            if (!baseURL.endsWith('/')) {
              baseURL += '/';
            }
            content = await fetchFile(baseURL + 'llms.txt');
            fileUsed = 'llms.txt';
            
            if (!content) {
              content = await fetchFile(baseURL + 'readme.md');
              fileUsed = 'readme.md';
            }
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
        }
      );
      
      // Create an SSE transport.
      // The constructor takes an endpoint (for client POSTs) and the ServerResponse.
      // Here we designate '/api/mcp/message' as the endpoint for POST messages.
      const endpoint = '/api/mcp/message';
      const transport = new SSEServerTransport(endpoint, res);
      
      // Explicitly start the SSE transport.
      // await transport.start();
      
      // Connect the MCP server using the transport.
      await mcp.connect(transport);
      
      // Save the transport instance using its sessionId.
      const sessionId = transport.sessionId;
      activeTransports[sessionId] = transport;
      
      // Send an immediate handshake message.
      await transport.send({ jsonrpc: '2.0', id: 'sse-connected', result: { message: 'SSE Connected', sessionId } });
      flushResponse(res);
      console.log(`SSE connection established, sessionId: ${sessionId}`);
      
      // Set up a heartbeat interval.
      const heartbeatInterval = setInterval(async () => {
        try {
          await transport.send({ jsonrpc: '2.0', id: 'heartbeat', result: { message: 'heartbeat' } });
          flushResponse(res);
        } catch (err) {
          console.error('Heartbeat error:', err);
          clearInterval(heartbeatInterval);
        }
      }, 5000);
      
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        delete activeTransports[sessionId];
        console.log(`SSE connection closed, sessionId: ${sessionId}`);
      });
    } catch (error) {
      console.error('MCP SSE Server error:', error);
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n\n`);
      res.end();
    }
    return;
  }
  
  // POST /api/mcp/message?sessionId=...: handle incoming messages.
  if (req.method === 'POST' && url.pathname.endsWith('/message')) {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId || !activeTransports[sessionId]) {
      res.status(400).json({ error: 'No active SSE session for the provided sessionId' });
      return;
    }
    try {
      await activeTransports[sessionId].handlePostMessage(req, res);
    } catch (error) {
      console.error('Error handling POST message:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  
  res.status(404).end('Not found');
}