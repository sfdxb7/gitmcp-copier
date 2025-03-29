import express from 'express';
import { createClient } from 'redis';
const app = express();
const redisClient = createClient();
app.use(express.json());
// Add polling endpoint for clients that can't use SSE
app.get('/poll', async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        res.status(400).json({ error: 'Missing sessionId parameter' });
        return;
    }
    try {
        // Get pending messages for this session
        const pendingKey = `requests:${sessionId}:pending`;
        const pendingMessages = await redisClient.smembers(pendingKey);
        if (pendingMessages.length > 0) {
            // If we have messages, return them and remove from the pending set
            const messages = pendingMessages.map(msg => {
                try {
                    return JSON.parse(msg);
                }
                catch (e) {
                    console.error('Error parsing message:', e);
                    return { type: 'error', body: 'Invalid message format' };
                }
            });
            // Remove delivered messages from the set
            await redisClient.srem(pendingKey, ...pendingMessages);
            res.status(200).json({
                status: 'success',
                messages
            });
        }
        else {
            // No pending messages
            res.status(200).json({
                status: 'empty',
                messages: []
            });
        }
    }
    catch (error) {
        console.error(`Error retrieving messages for session ${sessionId}:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add message handling endpoint for posting client requests
app.post('/message', async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        res.status(400).json({ error: 'Missing sessionId parameter' });
        return;
    }
    console.log(`Message received for session ${sessionId}:`, req.body);
    try {
        // Publish the request to Redis for downstream processing
        const requestChannel = `requests:${sessionId}`;
        await redisClient.publish(requestChannel, JSON.stringify(req.body));
        // Store the message in the pending set for potential polling clients
        const pendingKey = `requests:${sessionId}:pending`;
        const serializedRequest = JSON.stringify({
            type: req.body.type,
            body: JSON.stringify(req.body) // Double serialize to preserve complex objects
        });
        await redisClient.sadd(pendingKey, serializedRequest);
        // Set an expiration on the pending messages (30 minutes)
        await redisClient.expire(pendingKey, 1800);
        res.status(200).json({ status: 'Message sent' });
    }
    catch (error) {
        console.error(`Error processing message for session ${sessionId}:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add OPTIONS handler for CORS preflight requests
app.options('/poll', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// Add Redis subscription handler for server-to-client messages
async function setupRedisSubscriptions() {
    try {
        await redisClient.connect();
        console.log('Connected to Redis');
        const subscriber = redisClient.duplicate();
        await subscriber.connect();
        subscriber.on('message', async (channel, message) => {
            const sessionId = channel.split(':')[1];
            console.log(`Received message on channel ${channel}:`, message);
            // Store the response in the pending set for polling clients
            const pendingKey = `requests:${sessionId}:pending`;
            await redisClient.sadd(pendingKey, message);
            // Set an expiration on the pending messages (30 minutes)
            await redisClient.expire(pendingKey, 1800);
        });
        console.log('Redis subscriptions set up successfully');
    }
    catch (error) {
        console.error('Error setting up Redis subscriptions:', error);
    }
}
// Initialize Redis connections and subscriptions
setupRedisSubscriptions().catch(console.error);
//# sourceMappingURL=server.js.map