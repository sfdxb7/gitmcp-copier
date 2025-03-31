import type { NextApiRequest, NextApiResponse } from "next";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerTools } from "./tools/index.js";
import {
  storeSession,
  sessionExists,
  queueMessage,
  getPendingMessages,
} from "./utils/sessionStore.js";
import { parseRawBody } from "./utils/bodyParser.js";
import { Socket } from "net";
import { Readable } from "stream";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";

// For local instances only - doesn't work across serverless invocations
let activeTransports: { [sessionId: string]: SSEServerTransport } = {};

function flushResponse(res: NextApiResponse) {
  const maybeFlush = (res as any).flush;
  if (typeof maybeFlush === "function") {
    maybeFlush.call(res);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
      const endpoint = "/api/mcp/message";
      const transport = new SSEServerTransport(endpoint, res);

      // Connect the MCP server using the transport.
      await mcp.connect(transport);

      const sessionId = transport.sessionId;

      // Store in local map (for same-instance handling)
      activeTransports[sessionId] = transport;
      console.log(`SSE connection established, sessionId: ${sessionId}, transport: ${transport}. Transport map size: ${activeTransports.length}`);

      // Store in Redis (for cross-instance handling)
      await storeSession(sessionId, {
        host: req.headers.host,
        userAgent: req.headers["user-agent"],
        createdAt: new Date().toISOString(),
      });

      // Send handshake message
      await transport.send({
        jsonrpc: "2.0",
        id: sessionId,
        result: { message: "SSE Connected", sessionId },
      });
      flushResponse(res);
      console.log(`SSE connection established, sessionId: ${sessionId}`);

      // Check for any pending messages that might have arrived before this connection
      const pendingMessages = await getPendingMessages(sessionId);
      console.log(`Pending messages for session ${sessionId}:`, pendingMessages);
      if (pendingMessages.length > 0) {
        console.log(
          `Processing ${pendingMessages.length} pending messages for session ${sessionId}`
        );
        for (const msgData of pendingMessages) {
          try {
            // TODO

            // Make in IncomingMessage object because that is what the SDK expects.
        const fReq = createFakeIncomingMessage({
          method: 'POST',
          url: req.url,
          // headers: msgData.headers,
          body: msgData.payload,
        });
        const syntheticRes = new ServerResponse(req);
        let status = 100;
        let body = "";
        syntheticRes.writeHead = (statusCode: number) => {
          status = statusCode;
          return syntheticRes;
        };
        syntheticRes.end = (b: unknown) => {
          body = b as string;
          return syntheticRes;
        };
        await transport.handlePostMessage(fReq, syntheticRes);
            
            // flushResponse(fReq);
          } catch (error) {
            console.error(`Error sending pending message: ${error}`);
          }
        }
      }

      // Set up polling for new messages (only needed if SSE doesn't auto-receive)
      const pollInterval = setInterval(async () => {
        try {
          const messages = await getPendingMessages(sessionId);
          for (const msgData of messages) {
            console.log(`Sending polled message to session ${sessionId}:`, msgData);
            const fReq = createFakeIncomingMessage({
              method: 'POST',
              url: req.url,
              // headers: msgData.headers,
              body: msgData.payload,
            });
            const syntheticRes = new ServerResponse(req);
            let status = 100;
            let body = "";
            syntheticRes.writeHead = (statusCode: number) => {
              status = statusCode;
              return syntheticRes;
            };
            syntheticRes.end = (b: unknown) => {
              body = b as string;
              return syntheticRes;
            };
            await transport.handlePostMessage(fReq, syntheticRes);
            // flushResponse(res);
          }
        } catch (error) {
          console.error("Error polling for messages:", error);
        }
      }, 2000); // Poll every 2 seconds

      // Clean up when the connection closes
      req.on("close", async () => {
        clearInterval(pollInterval);
        delete activeTransports[sessionId];
        // await removeSession(sessionId);
        console.log(`SSE connection closed, sessionId: ${sessionId}`);
      });
    } catch (error) {
      console.error("MCP SSE Server error:", error);
      res.write(
        `data: ${JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        })}\n\n`
      );
      res.end();
    }
    return;
  }

  // POST /api/mcp/message?sessionId=...: handle incoming messages.
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
        await activeTransports[sessionId].handlePostMessage(req, res);
        // res.status(200).json({ success: true, queued: true });
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
      console.log(`Received POST message for session ${sessionId}:`, rawBody);
      const message = JSON.parse(rawBody.toString("utf8"));
      console.log(`Parsed message:`, message);

      // Queue the message in Redis for the SSE connection to pick up
      await queueMessage(sessionId, message);

      // Respond with success
      res.status(200).json({ success: true, queued: true });
    } catch (error) {
      console.error("Error handling POST message:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  res.status(404).end("Not found");
}


// Define the options interface
interface FakeIncomingMessageOptions {
  method?: string;
  url?: string;
  headers?: IncomingHttpHeaders;
  body?: string | Buffer | Record<string, any> | null;
  socket?: Socket;
}

// Create a fake IncomingMessage
function createFakeIncomingMessage(
  options: FakeIncomingMessageOptions = {}
): IncomingMessage {
  const {
    method = "GET",
    url = "/",
    headers = {},
    body = null,
    socket = new Socket(),
  } = options;

  // Create a readable stream that will be used as the base for IncomingMessage
  const readable = new Readable();
  readable._read = (): void => {}; // Required implementation

  // Add the body content if provided
  if (body) {
    if (typeof body === "string") {
      readable.push(body);
    } else if (Buffer.isBuffer(body)) {
      readable.push(body);
    } else {
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
  (req as any).on = readable.on.bind(readable);
  req.pipe = readable.pipe.bind(readable);

  return req;
}