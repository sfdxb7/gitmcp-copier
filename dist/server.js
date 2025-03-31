import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerTools } from "./tools/index.js";
// For testing: a simple in-memory store for active SSE transports keyed by sessionId.
let activeTransports = {};
function flushResponse(res) {
    const maybeFlush = res.flush;
    if (typeof maybeFlush === "function") {
        maybeFlush.call(res);
    }
}
export default async function handler(req, res) {
    const adjustedUrl = new URL(req.url || "", `http://${req.headers.host}`);
    if (req.method === "GET") {
        try {
            // Instantiate the MCP server.
            const mcp = new McpServer({ name: "MCP SSE Server", version: "1.0.0" });
            if (!req.headers.host) {
                throw new Error("Missing host header");
            }
            // Register the "fetch_documentation" tool.
            registerTools(mcp, req.headers.host, req.url);
            // Create an SSE transport.
            // The constructor takes an endpoint (for client POSTs) and the ServerResponse.
            // Here we designate '/api/mcp/message' as the endpoint for POST messages.
            const endpoint = "/api/mcp/message";
            const transport = new SSEServerTransport(endpoint, res);
            // Explicitly start the SSE transport.
            // await transport.start();
            // Connect the MCP server using the transport.
            await mcp.connect(transport);
            // Save the transport instance using its sessionId.
            const sessionId = transport.sessionId;
            activeTransports[sessionId] = transport;
            // Send an immediate handshake message.
            await transport.send({
                jsonrpc: "2.0",
                id: "sse-connected",
                result: { message: "SSE Connected", sessionId },
            });
            flushResponse(res);
            console.log(`SSE connection established, sessionId: ${sessionId}`);
            // Set up a heartbeat interval.
            const heartbeatInterval = setInterval(async () => {
                console.log("Sending heartbeat");
                try {
                    await transport.send({
                        jsonrpc: "2.0",
                        id: "heartbeat",
                        result: { message: "heartbeat" },
                    });
                    flushResponse(res);
                }
                catch (err) {
                    console.error("Heartbeat error:", err);
                    clearInterval(heartbeatInterval);
                }
            }, 5000);
            req.on("close", () => {
                clearInterval(heartbeatInterval);
                delete activeTransports[sessionId];
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
    // POST /api/mcp/message?sessionId=...: handle incoming messages.
    if (req.method === "POST" && adjustedUrl.pathname.endsWith("/message")) {
        console.log("POST /api/mcp/message", adjustedUrl.pathname);
        const sessionId = adjustedUrl.searchParams.get("sessionId");
        if (!sessionId || !activeTransports[sessionId]) {
            res
                .status(400)
                .json({ error: "No active SSE session for the provided sessionId" });
            return;
        }
        try {
            await activeTransports[sessionId].handlePostMessage(req, res);
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
//# sourceMappingURL=server.js.map