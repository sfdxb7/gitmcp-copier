import { ClientTransport } from "@modelcontextprotocol/sdk/client/transport.js";
import { Request } from "@modelcontextprotocol/sdk/common/types.js";
/**
 * A ClientTransport implementation that uses HTTP polling instead of SSE
 * to work around issues with SSE connections.
 */
export declare class HttpPollingTransport implements ClientTransport {
    private baseUrl;
    private sessionId;
    private isRunning;
    private messageListeners;
    private errorListeners;
    private pollInterval;
    private pollIntervalMs;
    constructor(baseUrl: string, sessionId?: string);
    /**
     * Start the transport by initiating the polling loop
     */
    start(): Promise<void>;
    /**
     * Stop the transport by clearing the polling interval
     */
    stop(): Promise<void>;
    /**
     * Send a request to the server
     */
    send(request: Request): Promise<void>;
    /**
     * Poll for new messages from the server
     */
    private poll;
    /**
     * Register a message listener
     */
    onMessage(listener: (message: any) => void): void;
    /**
     * Register an error listener
     */
    onError(listener: (error: Error) => void): void;
    /**
     * Notify all message listeners
     */
    private notifyMessage;
    /**
     * Notify all error listeners
     */
    private notifyError;
}
