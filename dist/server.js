import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerTools } from "./tools/index.js";
import { storeSession, sessionExists, queueMessage, subscribeToSessionMessages, subscribeToResponse, publishResponse } from "./utils/sessionStore.js";
import { parseRawBody } from "./utils/bodyParser.js";
import { Socket } from "net";
import { Readable } from "stream";
import { IncomingMessage, ServerResponse } from "http";
// For local instances only - doesn't work across serverless invocations
let activeTransports = {};
export default async function handler(req, res) {
    const adjustedUrl = new URL(req.url || "", `http://${req.headers.host}`);
    if (req.method === "GET") {
        try {
            // Instantiate the MCP server.
            const mcp = new McpServer({
                name: `MCP SSE Server for ${req.url}`,
                version: "1.0.0",
            });
            if (!req.headers.host) {
                throw new Error("Missing host header");
            }
            // Register the "fetch_documentation" tool.
            registerTools(mcp, req.headers.host, req.url);
            // Create an SSE transport.
            const endpoint = "/message";
            const transport = new SSEServerTransport(endpoint, res);
            // Connect the MCP server using the transport.
            await mcp.connect(transport);
            const sessionId = transport.sessionId;
            // Store in local map (for same-instance handling)
            activeTransports[sessionId] = transport;
            console.log(`SSE connection established, sessionId: ${sessionId}, url: ${req.url}. Transport map size: ${Object.keys(activeTransports).length}`);
            // Store in Redis (for cross-instance handling)
            await storeSession(sessionId, {
                host: req.headers.host,
                userAgent: req.headers["user-agent"],
                createdAt: new Date().toISOString(),
            });
            // Subscribe to session messages using Redis PubSub
            const unsubscribe = await subscribeToSessionMessages(sessionId, async (request) => {
                try {
                    console.log(`Processing PubSub message for session ${sessionId}:`, request);
                    // Create a fake IncomingMessage object with the stored data
                    const fReq = createFakeIncomingMessage({
                        method: request.method || "POST",
                        url: request.url || req.url,
                        headers: request.headers || {},
                        body: request.body,
                    });
                    const syntheticRes = new ServerResponse(fReq);
                    let status = 200;
                    let body = "";
                    // Capture the response status and body
                    syntheticRes.writeHead = (statusCode) => {
                        status = statusCode;
                        return syntheticRes;
                    };
                    syntheticRes.end = (b) => {
                        body = typeof b === 'string' ? b : JSON.stringify(b);
                        return syntheticRes;
                    };
                    // Process the message with the transport
                    await transport.handlePostMessage(fReq, syntheticRes);
                    // Publish the response back to Redis so the original requester can receive it
                    console.log(`Publishing response for ${sessionId}:${request.requestId} with status ${status}`);
                    await publishResponse(sessionId, request.requestId, status, body);
                }
                catch (error) {
                    console.error(`Error processing message: ${error}`);
                    // Publish error response
                    await publishResponse(sessionId, request.requestId, 500, JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
                }
            });
            // Clean up when the connection closes
            req.on("close", async () => {
                delete activeTransports[sessionId];
                await unsubscribe();
                console.log(`SSE connection closed, sessionId: ${sessionId}`);
            });
        }
        catch (error) {
            console.error("MCP SSE Server error:", error);
            res.write(`data: ${JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
            })}\n\n`);
            res.end();
        }
        return;
    }
    // POST /message?sessionId=...: handle incoming messages.
    if (req.method === "POST" && adjustedUrl.pathname.endsWith("/message")) {
        const sessionId = adjustedUrl.searchParams.get("sessionId");
        if (!sessionId) {
            res.status(400).json({ error: "Missing sessionId parameter" });
            return;
        }
        try {
            // Check if we have the transport in this instance
            if (activeTransports[sessionId]) {
                // We can handle it directly in this instance
                console.log(`Handling POST message for session ${sessionId} directly`);
                await activeTransports[sessionId].handlePostMessage(req, res);
                return;
            }
            const sessionValid = await sessionExists(sessionId);
            if (!sessionValid) {
                res
                    .status(400)
                    .json({ error: "No active SSE session for the provided sessionId" });
                return;
            }
            const rawBody = await parseRawBody(req);
            const message = JSON.parse(rawBody.toString("utf8"));
            console.log(`Parsed message:`, message);
            // Queue the message via Redis PubSub
            const requestId = await queueMessage(sessionId, message, req.headers, req.method, req.url);
            // Set up a subscription to listen for a response
            let responseTimeout;
            const unsubscribe = await subscribeToResponse(sessionId, requestId, (response) => {
                if (responseTimeout) {
                    clearTimeout(responseTimeout);
                }
                // Return the response to the client
                res.status(response.status).send(response.body);
                // Clean up the subscription
                unsubscribe().catch(console.error);
            });
            // Set a timeout for the response
            responseTimeout = setTimeout(async () => {
                await unsubscribe();
                res.status(408).json({ error: "Request timed out waiting for response" });
            }, 10000); // 10 seconds timeout
            // Clean up subscription when request is closed
            req.on("close", async () => {
                if (responseTimeout) {
                    clearTimeout(responseTimeout);
                }
                await unsubscribe();
            });
        }
        catch (error) {
            console.error("Error handling POST message:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return;
    }
    res.status(404).end("Not found");
}
// Create a fake IncomingMessage
function createFakeIncomingMessage(options = {}) {
    const { method = "GET", url = "/", headers = {}, body = null, socket = new Socket(), } = options;
    // Create a readable stream that will be used as the base for IncomingMessage
    const readable = new Readable();
    readable._read = () => { }; // Required implementation
    // Add the body content if provided
    if (body) {
        if (typeof body === "string") {
            readable.push(body);
        }
        else if (Buffer.isBuffer(body)) {
            readable.push(body);
        }
        else {
            readable.push(JSON.stringify(body));
        }
        readable.push(null); // Signal the end of the stream
    }
    // Create the IncomingMessage instance
    const req = new IncomingMessage(socket);
    // Set the properties
    req.method = method;
    req.url = url;
    req.headers = headers;
    // Copy over the stream methods
    req.push = readable.push.bind(readable);
    req.read = readable.read.bind(readable);
    req.on = readable.on.bind(readable);
    req.pipe = readable.pipe.bind(readable);
    return req;
}
//# sourceMappingURL=server.js.map