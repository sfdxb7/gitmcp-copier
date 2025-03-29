import { v4 as uuidv4 } from "uuid";
import axios from "axios";
/**
 * A ClientTransport implementation that uses HTTP polling instead of SSE
 * to work around issues with SSE connections.
 */
export class HttpPollingTransport {
    baseUrl;
    sessionId;
    isRunning = false;
    messageListeners = [];
    errorListeners = [];
    pollInterval = null;
    pollIntervalMs = 200; // Poll every 200ms by default
    constructor(baseUrl, sessionId) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        this.sessionId = sessionId || uuidv4();
        console.log(`Created HttpPollingTransport with sessionId: ${this.sessionId}`);
    }
    /**
     * Start the transport by initiating the polling loop
     */
    async start() {
        if (this.isRunning) {
            return;
        }
        console.log(`Starting HTTP polling transport with sessionId: ${this.sessionId}`);
        this.isRunning = true;
        // Start polling for messages
        this.pollInterval = setInterval(async () => {
            try {
                await this.poll();
            }
            catch (error) {
                console.error("Error during poll:", error);
                this.notifyError(error instanceof Error ? error : new Error(String(error)));
            }
        }, this.pollIntervalMs);
        console.log("HTTP polling transport started");
    }
    /**
     * Stop the transport by clearing the polling interval
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        console.log("Stopping HTTP polling transport");
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isRunning = false;
        console.log("HTTP polling transport stopped");
    }
    /**
     * Send a request to the server
     */
    async send(request) {
        if (!this.isRunning) {
            throw new Error("Transport not started");
        }
        try {
            console.log(`Sending request: ${request.type}`);
            const response = await axios.post(`${this.baseUrl}/message?sessionId=${this.sessionId}`, request, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log(`Request sent successfully, status: ${response.status}`);
            // If the response is immediate, process it
            if (response.data) {
                console.log(`Received immediate response:`, response.data);
                this.notifyMessage(response.data);
            }
        }
        catch (error) {
            console.error("Error sending request:", error);
            this.notifyError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    /**
     * Poll for new messages from the server
     */
    async poll() {
        try {
            const response = await axios.get(`${this.baseUrl}/poll?sessionId=${this.sessionId}`, {
                timeout: 2000, // 2 second timeout for polling
                headers: {
                    'Accept': 'application/json'
                }
            });
            // Check if we got a valid response with content
            if (response.status === 200 && response.data && response.data !== "[]") {
                console.log(`Received message from poll:`, typeof response.data === 'string' ? response.data.substring(0, 100) + '...' : response.data);
                try {
                    // Process the message if it's a string or already parsed JSON
                    let message;
                    if (typeof response.data === 'string') {
                        // We need to parse the message from the SerializedRequest
                        const serialized = JSON.parse(response.data);
                        // Extract the actual message from the body
                        try {
                            message = JSON.parse(serialized.body);
                        }
                        catch (e) {
                            // If the body is not valid JSON, use it as is
                            message = serialized.body;
                        }
                    }
                    else {
                        message = response.data;
                    }
                    // Notify listeners
                    this.notifyMessage(message);
                }
                catch (e) {
                    console.error("Error processing polled message:", e);
                    this.notifyError(new Error(`Error processing message: ${e}`));
                }
            }
        }
        catch (error) {
            // Only report errors if they're not timeout-related
            if (axios.isAxiosError(error) && error.code !== 'ECONNABORTED') {
                console.error("Error during polling:", error);
                this.notifyError(error);
            }
        }
    }
    /**
     * Register a message listener
     */
    onMessage(listener) {
        this.messageListeners.push(listener);
    }
    /**
     * Register an error listener
     */
    onError(listener) {
        this.errorListeners.push(listener);
    }
    /**
     * Notify all message listeners
     */
    notifyMessage(message) {
        for (const listener of this.messageListeners) {
            try {
                listener(message);
            }
            catch (e) {
                console.error("Error in message listener:", e);
            }
        }
    }
    /**
     * Notify all error listeners
     */
    notifyError(error) {
        for (const listener of this.errorListeners) {
            try {
                listener(error);
            }
            catch (e) {
                console.error("Error in error listener:", e);
            }
        }
    }
}
//# sourceMappingURL=http-polling-transport.js.map