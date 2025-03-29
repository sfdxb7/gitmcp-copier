import { McpClient } from "@modelcontextprotocol/sdk/client/mcp.js";
import { HttpPollingTransport } from "../lib/http-polling-transport.js";
// Parse command line arguments
const args = process.argv.slice(2);
const url = args[0] || "http://localhost:3001";
async function main() {
    console.log(`Connecting to MCP server at ${url}...`);
    // Create a transport using HTTP polling instead of SSE
    const transport = new HttpPollingTransport(url);
    // Create the MCP client
    const client = new McpClient(transport, {
        name: "http-polling-client",
        version: "1.0.0",
    });
    // Set up logging
    transport.onMessage((msg) => {
        console.log("Received message:", msg);
    });
    transport.onError((err) => {
        console.error("Transport error:", err);
    });
    try {
        // Start the transport and connect the client
        await transport.start();
        await client.connect();
        console.log("✅ Client connected successfully!");
        // Send a simple ping message to test the connection
        console.log("Sending ping request...");
        const response = await client.ping();
        console.log("Ping response:", response);
        // Keep the connection alive for a while to test polling
        console.log("Keeping connection alive for 30 seconds...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        // Clean shutdown
        console.log("Shutting down...");
        await client.disconnect();
        await transport.stop();
        console.log("Done!");
    }
    catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}
main().catch(console.error);
//# sourceMappingURL=http-client.js.map