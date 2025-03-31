import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
const redis = Redis.fromEnv();

// Session TTL in seconds (30 minutes)
const SESSION_TTL = 60;

// Key prefix for session storage
const SESSION_PREFIX = "mcp:session:";

// Pending messages prefix
const PENDING_MSG_PREFIX = "mcp:pending:";

export interface SessionMessage {
  timestamp: number;
  payload: any;
}

/**
 * Store a new session in Redis
 */
export async function storeSession(
  sessionId: string,
  metadata: any
): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  console.log(`Storing session ${sessionId} with metadata:`, metadata);
  await redis.set(
    key,
    {
      created: Date.now(),
      lastActive: Date.now(),
      metadata,
    },
    { ex: SESSION_TTL }
  );
}

export async function sessionExists(sessionId: string): Promise<boolean> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const session = await redis.get(key);

  return !!session;
}

/**
 * Add a message to the pending queue for a session
 */
export async function queueMessage(
  sessionId: string,
  message: any
): Promise<void> {
  const key = `${PENDING_MSG_PREFIX}${sessionId}`;
  await redis.lpush(
    key,
    JSON.stringify({
      timestamp: Date.now(),
      payload: message,
    })
  );

  console.log(`Message queued for session ${sessionId}:`, message, JSON.stringify({
    timestamp: Date.now(),
    payload: message,
  }));
  await redis.expire(key, SESSION_TTL);
}

/**
 * Get and remove all pending messages for a session
 */
export async function getPendingMessages(sessionId: string): Promise<SessionMessage[]> {
    const key = `${PENDING_MSG_PREFIX}${sessionId}`;
    
    // Get all messages
    const messages = await redis.lrange(key, 0, -1);
    
    if (messages && messages.length > 0) {
      // Delete all messages after retrieving them
      await redis.del(key);
      
      // Parse messages with error handling
      return messages.map(msg => {
        try {
          // Log the raw message from Redis for debugging
          console.log("Redis message type:", typeof msg, msg);
        //   console.log(`Raw message from Redis: ${msg.substring(0, 100)}...`);
          // Handle different types of data
          if (typeof msg === 'string') {
            return JSON.parse(msg);
          } else if (typeof msg === 'object') {
            // Already an object, maybe auto-parsed by the Redis client
            return msg;
          } else {
            console.error(`Unexpected message format: ${typeof msg}`);
            return null;
          }
          // This should already be a JSON string that needs to be parsed
        //   return JSON.parse(msg);
        } catch (parseError) {
          console.error(`Failed to parse message from Redis: ${parseError}`);
          if (typeof msg === 'string' && msg.includes('initialize')) {
            return { 
                timestamp: Date.now(), 
                payload: { 
                  jsonrpc: "2.0", 
                  method: "initialize"
                }
              };
          }          
        }
      }).filter(msg => !!msg);
    }
    
    return [];
  }

/**
 * Remove a session
 */
// export async function removeSession(sessionId: string): Promise<void> {
//   const sessionKey = `${SESSION_PREFIX}${sessionId}`;
//   const pendingKey = `${PENDING_MSG_PREFIX}${sessionId}`;

//   await Promise.all([
//     redis.del(sessionKey),
//     redis.del(pendingKey)
//   ]);
// }
