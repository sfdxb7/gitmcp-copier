import { createClient } from "redis";

// Initialize Redis client
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL environment variable is not set");
}

let redis: ReturnType<typeof createClient>;
let publisher: ReturnType<typeof createClient>;

// Initialize redis clients lazily
const getRedisClients = async () => {
  if (!redis || !publisher) {
    redis = createClient({ url: redisUrl });
    publisher = createClient({ url: redisUrl });
    
    redis.on("error", (err) => {
      console.error("Redis subscriber error:", err);
    });
    
    publisher.on("error", (err) => {
      console.error("Redis publisher error:", err);
    });
    
    await Promise.all([redis.connect(), publisher.connect()]);
  }
  
  return { redis, publisher };
};

// Session TTL in seconds (30 minutes)
const SESSION_TTL = 60 * 30;

// Key prefix for session storage
const SESSION_PREFIX = "mcp:session:";

// Channel prefix for requests and responses
const REQUEST_CHANNEL_PREFIX = "requests:";
const RESPONSE_CHANNEL_PREFIX = "responses:";

export interface SessionMessage {
  timestamp: number;
  payload: any;
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  requestId?: string;
}

export interface SerializedRequest {
  requestId: string;
  url: string;
  method: string;
  body: string | any;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Store a new session in Redis
 */
export async function storeSession(
  sessionId: string,
  metadata: any
): Promise<void> {
  const { redis } = await getRedisClients();
  const key = `${SESSION_PREFIX}${sessionId}`;
  console.log(`Storing session ${sessionId} with metadata:`, metadata);
  await redis.set(
    key,
    JSON.stringify({
      created: Date.now(),
      lastActive: Date.now(),
      metadata,
    }),
    { EX: SESSION_TTL }
  );
}

export async function sessionExists(sessionId: string): Promise<boolean> {
  const { redis } = await getRedisClients();
  const key = `${SESSION_PREFIX}${sessionId}`;
  const session = await redis.get(key);
  return !!session;
}

/**
 * Publish a message to a session's request channel
 */
export async function queueMessage(
  sessionId: string,
  message: any,
  headers?: Record<string, string | string[] | undefined>,
  method?: string,
  url?: string
): Promise<string> {
  const { publisher } = await getRedisClients();
  const requestId = crypto.randomUUID();
  
  const request: SerializedRequest = {
    requestId,
    url: url || "",
    method: method || "POST",
    body: message,
    headers: headers || {},
  };
  
  console.log(`Publishing message to ${REQUEST_CHANNEL_PREFIX}${sessionId}:`, request);
  await publisher.publish(`${REQUEST_CHANNEL_PREFIX}${sessionId}`, JSON.stringify(request));
  
  return requestId;
}

/**
 * Subscribe to messages for a specific session
 */
export async function subscribeToSessionMessages(
  sessionId: string,
  callback: (message: SerializedRequest) => void
): Promise<() => Promise<void>> {
  const { redis } = await getRedisClients();
  
  await redis.subscribe(`${REQUEST_CHANNEL_PREFIX}${sessionId}`, (message) => {
    try {
      console.log(`Received message on ${REQUEST_CHANNEL_PREFIX}${sessionId}:`, message);
      const parsedMessage = JSON.parse(message) as SerializedRequest;
      callback(parsedMessage);
    } catch (error) {
      console.error("Failed to parse Redis message:", error);
    }
  });
  
  // Return unsubscribe function
  return async () => {
    await redis.unsubscribe(`${REQUEST_CHANNEL_PREFIX}${sessionId}`);
  };
}

/**
 * Subscribe to response for a specific request
 */
export async function subscribeToResponse(
  sessionId: string,
  requestId: string,
  callback: (response: { status: number; body: string }) => void
): Promise<() => Promise<void>> {
  const { redis } = await getRedisClients();
  const responseChannel = `${RESPONSE_CHANNEL_PREFIX}${sessionId}:${requestId}`;
  
  await redis.subscribe(responseChannel, (message) => {
    try {
      const response = JSON.parse(message) as { status: number; body: string };
      callback(response);
    } catch (error) {
      console.error(`Failed to parse response for ${sessionId}:${requestId}:`, error);
    }
  });
  
  // Return unsubscribe function
  return async () => {
    await redis.unsubscribe(responseChannel);
  };
}

/**
 * Publish a response for a specific request
 */
export async function publishResponse(
  sessionId: string,
  requestId: string,
  status: number,
  body: string
): Promise<void> {
  const { publisher } = await getRedisClients();
  const responseChannel = `${RESPONSE_CHANNEL_PREFIX}${sessionId}:${requestId}`;
  
  await publisher.publish(responseChannel, JSON.stringify({ 
    status, 
    body 
  }));
}

/**
 * Legacy function to get pending messages - now returns empty array since we use PubSub
 */
export async function getPendingMessages(sessionId: string): Promise<SessionMessage[]> {
  return [];
}
