import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IncomingMessage, ServerResponse } from "http";
import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
export declare function initializeMcpApiHandler(initializeServer: (server: McpServer) => void, serverOptions?: ServerOptions): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
