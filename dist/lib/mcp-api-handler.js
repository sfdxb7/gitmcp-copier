import getRawBody from "raw-body";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Import our patched transport instead of the standard one
import { PatchedSSEServerTransport } from "./patched-sse-transport.js";
import { IncomingMessage } from "http";
import { Redis } from "@upstash/redis";
import { Socket } from "net";
import { Readable } from "stream";
// Initialize Upstash Redis clients using the environment variables.
// Upstash requires both URL and token for authentication
const redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.KV_URL,
    token: process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN,
});
const redisPublisher = new Redis({
    url: process.env.KV_REST_API_URL || process.env.KV_URL,
    token: process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN,
});
// Add global request storage to maintain request context
const requestStore = new Map();
export function initializeMcpApiHandler(initializeServer, serverOptions = {}) {
    const maxDuration = 60;
    let servers = [];
    return async function mcpApiHandler(req, res) {
        // No need for redisPromise since Upstash clients are ready to use.
        const url = new URL(req.url || "", "https://example.com");
        if (url.pathname === "/sse") {
            console.log("Got new SSE connection");
            // Set proper SSE headers immediately
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'X-Accel-Buffering': 'no' // Important for some proxies
            });
            // IMPORTANT: Send initial data immediately to establish the connection
            res.write(': SSE connection established\n\n');
            res.write('event: connected\ndata: {}\n\n');
            // Force flush to ensure headers and initial messages are sent
            if ('flush' in res && typeof res.flush === 'function') {
                res.flush();
            }
            console.log("SSE headers and initial messages sent");
            // Create our patched transport that won't try to write headers again
            const transport = new PatchedSSEServerTransport("/message", res);
            const sessionId = transport.sessionId;
            console.log(`New SSE connection with session ID: ${sessionId}`);
            // Set up heartbeat immediately - don't wait for server.connect
            let heartbeatInterval = setInterval(() => {
                try {
                    console.log("Sending SSE heartbeat...");
                    // Send a proper ping event with correct SSE formatting
                    res.write(`event: ping\n`);
                    res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
                    // Ensure the heartbeat is sent immediately
                    if ('flush' in res && typeof res.flush === 'function') {
                        res.flush();
                    }
                }
                catch (e) {
                    console.error("Error sending heartbeat:", e);
                    clearInterval(heartbeatInterval);
                }
            }, 5000);
            // Add transport debug wrapper
            const originalHandlePostMessage = transport.handlePostMessage.bind(transport);
            transport.handlePostMessage = async (req, res) => {
                console.log("SSE Transport handlePostMessage called");
                console.log("Headers:", req.headers);
                console.log("URL:", req.url);
                try {
                    const result = await originalHandlePostMessage(req, res);
                    console.log("handlePostMessage completed successfully");
                    return result;
                }
                catch (error) {
                    console.error(`Error in handlePostMessage: ${error instanceof Error ? error.stack : String(error)}`);
                    throw error;
                }
            };
            // Also patch the send method
            const originalSend = transport.send.bind(transport);
            transport.send = async (req) => {
                console.log("SSE Transport send called", req);
                try {
                    const result = await originalSend(req);
                    console.log("SSE Transport send completed successfully");
                    return result;
                }
                catch (error) {
                    console.error(`Error in SSE transport send: ${error instanceof Error ? error.stack : String(error)}`);
                    throw error;
                }
            };
            const server = new McpServer({
                name: "mcp-typescript server on vercel",
                version: "0.1.0",
            }, serverOptions);
            // Also patch server's connect method for debugging
            const originalConnect = server.connect.bind(server);
            server.connect = async (transport) => {
                console.log("Server connect called");
                try {
                    await originalConnect(transport);
                    console.log("Server connect completed successfully");
                }
                catch (e) {
                    console.error(`Error in server connect:`, e);
                    throw e;
                }
            };
            const channel = `requests:${sessionId}`;
            // Setup Redis subscription and unsubscribe function
            let subscription = null;
            const unsubscribe = async () => {
                if (subscription) {
                    console.log(`Unsubscribing from channel: ${channel}`);
                    try {
                        // Upstash Redis client doesn't have unsubscribe, 
                        // it returns a function from subscribe() to unsubscribe
                        if (typeof subscription === 'function') {
                            await subscription();
                            console.log(`Successfully unsubscribed from ${channel}`);
                        }
                        else {
                            console.warn(`Subscription is not a function, cannot unsubscribe properly`);
                        }
                        subscription = null;
                    }
                    catch (e) {
                        console.error(`Error unsubscribing from ${channel}:`, e);
                    }
                }
            };
            let cleanup = async () => {
                console.log(`Cleaning up subscription for channel: ${channel}`);
                await unsubscribe();
                console.log("Done");
            };
            // Handles messages originally received via /message.
            const handleMessage = async (message) => {
                console.log("Received message via subscription:", message);
                const parsedMessage = JSON.parse(message);
                const { requestId, url, method, body, headers } = parsedMessage;
                // Create a fake request object
                const fakeReq = createFakeIncomingMessage({
                    method,
                    url,
                    headers,
                    body,
                });
                // Store request in the requestStore
                requestStore.set(requestId, fakeReq);
                // Send response back to the client
                const responseKey = `responses:${sessionId}:${requestId}`;
                const responseBody = await redis.get(responseKey);
                if (responseBody) {
                    // Parse and send response
                    const parsedResponse = JSON.parse(responseBody);
                    // Remove the reference to res which doesn't exist on IncomingMessage
                    // fakeReq.res?.writeHead(parsedResponse.status);
                    // fakeReq.res?.end(parsedResponse.body);
                    // Clean up the response key after processing
                    await redis.del(responseKey);
                }
            };
            try {
                console.log(`Connecting server...`);
                await server.connect(transport);
                console.log("Server connect completed successfully");
            }
            catch (e) {
                console.error(`Error in server connect:`, e);
                throw e;
            }
            // Set up Redis subscription for messages after server connect succeeds
            console.log(`Setting up subscription to ${channel}`);
            try {
                // According to Upstash Redis docs: https://upstash.com/docs/redis/sdks/javascriptsdk/pubsub
                // redis.subscribe() returns a subscription object with a 'messages' iterator
                subscription = await redis.subscribe(channel);
                console.log(`Successfully subscribed to ${channel}, subscription type: ${typeof subscription}`);
                // Set up a polling mechanism to check for messages
                const messagePollingInterval = setInterval(async () => {
                    try {
                        if (subscription && subscription.messages) {
                            // Get the next message (if available) - non-blocking
                            for await (const message of subscription.messages) {
                                if (message) {
                                    console.log(`Received message via polling: ${typeof message === 'string' ? (message.length > 100 ? message.substring(0, 100) + '...' : message) : JSON.stringify(message)}`);
                                    try {
                                        await handleMessage(message);
                                        // Clean up from pending set after processing
                                        await redisPublisher.srem(`${channel}:pending`, message);
                                    }
                                    catch (e) {
                                        console.error(`Error handling message: ${e}`);
                                    }
                                    // Only process one message per interval
                                    break;
                                }
                            }
                        }
                    }
                    catch (e) {
                        console.error(`Error polling for messages: ${e}`);
                    }
                }, 100); // Poll every 100ms
                // Update the cleanup function to also clear the polling interval
                const originalCleanup = cleanup;
                cleanup = async () => {
                    clearInterval(messagePollingInterval);
                    await originalCleanup();
                };
            }
            catch (e) {
                console.error(`Error subscribing to ${channel}:`, e);
            }
            // NOW set up the heartbeat after successful connection
            heartbeatInterval = setInterval(() => {
                try {
                    console.log("Sending SSE heartbeat...");
                    // Send as comment to avoid parsing errors
                    res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
                    // Also send a proper ping event
                    res.write(`event: ping\n`);
                    res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
                }
                catch (e) {
                    console.error("Error sending heartbeat:", e);
                    clearInterval(heartbeatInterval);
                }
            }, 5000);
            // Setup waiting and cleanup
            const waitPromise = new Promise((resolve) => {
                // Handle disconnection
                req.on("close", () => {
                    console.log("SSE connection closed");
                    clearInterval(heartbeatInterval);
                    resolve("SSE connection closed");
                });
                // Set a max duration for the connection
                setTimeout(() => {
                    resolve("max duration reached");
                }, maxDuration * 1000);
            });
            const closeReason = await waitPromise;
            console.log(closeReason);
            clearInterval(heartbeatInterval); // Also clear on normal exit
            await cleanup();
        }
        else if (url.pathname === "/poll") {
            console.log(`Received poll request for ${url.toString()}`);
            // Get session ID from query params
            const sessionId = url.searchParams.get("sessionId");
            if (!sessionId) {
                console.error("No sessionId provided in poll request");
                res.statusCode = 400;
                res.end("No sessionId provided");
                return;
            }
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Content-Type', 'application/json');
            // Check for any pending messages in the pending set
            const pendingSetKey = `requests:${sessionId}:pending`;
            console.log(`Checking for pending messages in ${pendingSetKey}`);
            try {
                // Get pending messages
                const pendingMessages = await redis.smembers(pendingSetKey);
                if (pendingMessages && pendingMessages.length > 0) {
                    console.log(`Found ${pendingMessages.length} pending messages`);
                    // Return the first pending message and remove it from the set
                    const message = pendingMessages[0];
                    await redisPublisher.srem(pendingSetKey, message);
                    console.log(`Returning pending message to client`);
                    res.statusCode = 200;
                    res.end(message);
                }
                else {
                    // No pending messages, return empty array
                    res.statusCode = 200;
                    res.end("[]");
                }
            }
            catch (err) {
                console.error(`Error checking for pending messages:`, err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Error checking for pending messages" }));
            }
        }
        else if (url.pathname === "/message") {
            console.log(`Received message request for ${url.toString()}`);
            console.log(`Headers:`, req.headers);
            console.log(`Method:`, req.method);
            console.log(`Query params:`, url.searchParams.toString());
            try {
                // Fix the headers issue by ensuring we don't have conflicting transfer-encoding
                if (req.headers['transfer-encoding']) {
                    console.log("Found transfer-encoding header, removing to avoid conflicts");
                    delete req.headers['transfer-encoding'];
                }
                // Fix content-length if needed
                if (!req.headers['content-length']) {
                    console.log("No content-length header, reading entire body before proceeding");
                    // Manually collect the body data as a buffer
                    const chunks = [];
                    const body = await new Promise((resolve, reject) => {
                        req.on('data', chunk => {
                            console.log(`Received body chunk of size ${chunk.length}`);
                            chunks.push(Buffer.from(chunk));
                        });
                        req.on('end', () => {
                            const bodyBuffer = Buffer.concat(chunks);
                            const bodyString = bodyBuffer.toString('utf-8');
                            console.log(`Collected request body: ${bodyString.length} bytes`);
                            console.log(`Body content:`, bodyString.substring(0, 200) + (bodyString.length > 200 ? '...' : ''));
                            resolve(bodyString);
                        });
                        req.on('error', (err) => {
                            console.error(`Error reading body:`, err);
                            reject(err);
                        });
                        // Set a timeout
                        const timeout = setTimeout(() => {
                            console.error('Request body collection timed out');
                            reject(new Error('Request body collection timed out'));
                        }, 5000);
                        req.on('end', () => clearTimeout(timeout));
                        req.on('error', () => clearTimeout(timeout));
                    });
                    const sessionId = url.searchParams.get("sessionId") || "";
                    if (!sessionId) {
                        console.error("No sessionId provided in request");
                        res.statusCode = 400;
                        res.end("No sessionId provided");
                        return;
                    }
                    console.log(`Processing message for session ${sessionId}`);
                    // Check if this is an initialization request
                    try {
                        const parsedBody = JSON.parse(body);
                        // If this is an initialization request, handle it directly
                        if (parsedBody.type === "initialize") {
                            console.log("Detected initialize request - handling directly");
                            // Send back a proper initialize response
                            const initResponse = {
                                id: parsedBody.id,
                                type: "initialized", // Note: "initialized" is the response type
                                server: {
                                    name: "mcp-typescript server on vercel",
                                    version: "0.1.0",
                                },
                                capabilities: {
                                    prompts: {},
                                    resources: {},
                                    tools: {}
                                }
                            };
                            res.setHeader('Content-Type', 'application/json');
                            res.statusCode = 200;
                            res.end(JSON.stringify(initResponse));
                            console.log("Initialization response sent directly");
                            return;
                        }
                    }
                    catch (err) {
                        console.error("Error parsing body as JSON:", err);
                        // Continue with normal processing if not an initialization message
                    }
                    // Generate a request ID for tracking
                    const requestId = crypto.randomUUID();
                    console.log(`Generated request ID: ${requestId}`);
                    // Serialize the request
                    const serializedRequest = {
                        requestId,
                        url: req.url || "",
                        method: req.method || "",
                        body,
                        headers: req.headers,
                    };
                    // Set CORS headers to allow cross-origin requests
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                    // Add request to the pending set for polling clients AND publish for SSE clients
                    const serializedMessage = JSON.stringify(serializedRequest);
                    console.log(`Publishing message to requests:${sessionId}`);
                    // First, publish for SSE clients
                    try {
                        await redisPublisher.publish(`requests:${sessionId}`, serializedMessage);
                        console.log(`Message published successfully for SSE clients`);
                    }
                    catch (err) {
                        console.error(`Error publishing to Redis:`, err);
                        // Continue anyway - we'll try the pending set too
                    }
                    // Also add to pending set for polling clients
                    try {
                        await redisPublisher.sadd(`requests:${sessionId}:pending`, serializedMessage);
                        console.log(`Message added to pending set for polling clients`);
                    }
                    catch (err) {
                        console.error(`Error adding to pending set:`, err);
                        // If both methods failed, return an error
                        if (!await redisPublisher.exists(`requests:${sessionId}`)) {
                            res.statusCode = 500;
                            res.end("Failed to deliver message to server");
                            return;
                        }
                    }
                    console.log(`Published and stored requests:${sessionId}`);
                    // Set up timeout for response waiting
                    let timeout = setTimeout(async () => {
                        console.log(`Request timed out for ${requestId}`);
                        res.statusCode = 408;
                        res.end("Request timed out");
                    }, 10 * 1000);
                    // Wait for response with polling approach
                    const responseKey = `responses:${sessionId}:${requestId}`;
                    console.log(`Waiting for response at key: ${responseKey}`);
                    const pollInterval = setInterval(async () => {
                        try {
                            console.log(`Polling for response at ${responseKey}`);
                            const response = await redis.get(responseKey);
                            if (response) {
                                clearInterval(pollInterval);
                                clearTimeout(timeout);
                                console.log(`Received response for ${requestId}`);
                                // Parse and send response
                                try {
                                    const parsedResponse = JSON.parse(response);
                                    console.log(`Response status: ${parsedResponse.status}, body length: ${parsedResponse.body.length}`);
                                    res.statusCode = parsedResponse.status;
                                    res.end(parsedResponse.body);
                                }
                                catch (err) {
                                    console.error(`Error parsing response:`, err);
                                    res.statusCode = 500;
                                    res.end("Error processing server response");
                                }
                                // Clean up the response key after processing
                                try {
                                    await redis.del(responseKey);
                                    console.log(`Deleted response key ${responseKey}`);
                                }
                                catch (err) {
                                    console.error(`Error deleting response key:`, err);
                                }
                            }
                        }
                        catch (err) {
                            console.error("Error polling for response:", err);
                        }
                    }, 100);
                    // Clean up on connection close
                    res.on("close", () => {
                        console.log(`Connection closed for ${requestId}`);
                        clearTimeout(timeout);
                        clearInterval(pollInterval);
                    });
                }
                else {
                    // Original code path with content-length header
                    console.log("Using getRawBody with content-length:", req.headers['content-length']);
                    const body = await getRawBody(req, {
                        length: req.headers["content-length"],
                        encoding: "utf-8",
                    });
                    const sessionId = url.searchParams.get("sessionId") || "";
                    if (!sessionId) {
                        console.error("No sessionId provided in request");
                        res.statusCode = 400;
                        res.end("No sessionId provided");
                        return;
                    }
                    // Continue with the rest of the message handling
                    // ...existing code...
                }
            }
            catch (e) {
                console.error(`Error handling message request:`, e);
                res.statusCode = 500;
                res.end("A server error has occurred");
            }
        }
        else {
            res.statusCode = 404;
            res.end("Not found");
        }
    };
}
// Create a fake IncomingMessage.
function createFakeIncomingMessage(options = {}) {
    const { method = "GET", url = "/", headers = {}, body = null, socket = new Socket(), } = options;
    const readable = new Readable();
    readable._read = () => { };
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
        readable.push(null);
    }
    const req = new IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.headers = headers;
    // Use type assertion to fix the TypeScript error
    req.on = readable.on.bind(readable);
    req.pipe = readable.pipe.bind(readable);
    return req;
}
//# sourceMappingURL=mcp-api-handler.js.map