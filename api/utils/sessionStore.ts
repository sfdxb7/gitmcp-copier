import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
const redis = Redis.fromEnv();

// Session TTL in seconds (30 minutes)
const SESSION_TTL = 60;

// Key prefix for session storage
const SESSION_PREFIX = 'mcp:session:';

// Pending messages prefix
const PENDING_MSG_PREFIX = 'mcp:pending:';

export interface SessionMessage {
  timestamp: number;
  payload: any;
}

/**
 * Store a new session in Redis
 */
export async function storeSession(sessionId: string, metadata: any): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  await redis.set(key, {
    created: Date.now(),
    lastActive: Date.now(),
    metadata
  }, { ex: SESSION_TTL });
}

/**
 * Check if a session exists and update its last activity time
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const session = await redis.get(key);
  
  if (session) {
    // Update last activity time and reset TTL
    await redis.set(key, {
      ...session,
      lastActive: Date.now()
    }, { ex: SESSION_TTL });
    return true;
  }
  
  return false;
}

/**
 * Add a message to the pending queue for a session
 */
export async function queueMessage(sessionId: string, message: any): Promise<void> {
  const key = `${PENDING_MSG_PREFIX}${sessionId}`;
  await redis.lpush(key, JSON.stringify({
    timestamp: Date.now(),
    payload: message
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
    // Delete all messages
    await redis.del(key);
    
    // Parse messages
    return messages.map(msg => JSON.parse(msg));
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