import { Index } from "@upstash/vector";

// Define a generic Dict type since we can't import it directly
type Dict = { [key: string]: any };

// Initialize Upstash Vector client - single index
const vector = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL || "",
  token: process.env.UPSTASH_VECTOR_REST_TOKEN || "",
});

// TTL for vector entries in seconds (7 days)
const VECTOR_TTL = 60 * 60 * 24 * 7;

/**
 * Generate a vector ID for a specific document chunk
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param chunkIndex - Index of the chunk
 * @returns Unique ID for the vector
 */
export function getVectorId(owner: string, repo: string, chunkIndex: number): string {
  return `repo:${owner}:${repo}:chunk:${chunkIndex}`;
}

/**
 * Get simple embeddings for text (placeholder for real embedding service)
 * In a production environment, you would use a proper embedding service like OpenAI
 * @param text - Text to generate embeddings for
 * @returns Vector embedding (simplified)
 */
export async function getEmbeddings(text: string): Promise<number[]> {
  // This is a simplified embedding function that creates a basic vector representation
  // In production, replace with a call to a proper embedding service like OpenAI
  
  // Create a simple hash-based embedding (not for production use)
  const buffer = new ArrayBuffer(512); // 128 dimensions
  const view = new Float32Array(buffer);
  
  // Fill with simple hash values of the text
  for (let i = 0; i < view.length; i++) {
    // Simple hash function for demo purposes
    let hash = 0;
    for (let j = 0; j < text.length; j++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(j) + i;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Normalize between -1 and 1
    view[i] = (hash % 200) / 100 - 1;
  }
  
  return Array.from(view);
}

/**
 * Process documentation text into chunks for vector storage
 * @param text - Documentation text
 * @param chunkSize - Size of each chunk (in characters)
 * @param overlap - Overlap between chunks (in characters)
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let i = 0;
  
  while (i < text.length) {
    // Calculate chunk end position
    let end = i + chunkSize;
    
    // If not at the end of text, try to find a sensible break point
    if (end < text.length) {
      // Try to find a paragraph break
      const paragraphBreak = text.indexOf("\n\n", end - 100);
      if (paragraphBreak !== -1 && paragraphBreak < end + 100) {
        end = paragraphBreak;
      }
      // Otherwise try to find a line break
      else {
        const lineBreak = text.indexOf("\n", end - 50);
        if (lineBreak !== -1 && lineBreak < end + 50) {
          end = lineBreak;
        }
        // Otherwise try to find a sentence break
        else {
          const sentenceBreak = text.indexOf(". ", end - 30);
          if (sentenceBreak !== -1 && sentenceBreak < end + 30) {
            end = sentenceBreak + 1; // Include the period
          }
        }
      }
    }
    
    // Add chunk to array
    chunks.push(text.slice(i, end));
    
    // Move to next position with overlap
    i = end - overlap;
    
    // Ensure we make progress
    if (i <= 0) i = end;
  }
  
  return chunks;
}

// Define our metadata structure as a record with string keys and any values
interface VectorMetadata {
  chunk: string;
  owner: string;
  repo: string;
  chunkIndex: number;
  [key: string]: any;  // Add index signature to make it compatible with Dict
}

/**
 * Store documentation content in vector store
 * Using a single index and distinguishing documents via metadata and IDs
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param content - Documentation content
 * @returns Number of vectors stored
 */
export async function storeDocumentationVectors(
  owner: string,
  repo: string,
  content: string
): Promise<number> {
  try {
    console.log(`Storing vectors for ${owner}/${repo}`);
    
    // First delete any existing vectors for this repo
    try {
      // Generate pattern matching IDs for this repo
      const prefix = `repo:${owner}:${repo}`;
      
      try {
        // Delete any vectors with IDs starting with our prefix
        await vector.delete(`${prefix}*`);
        console.log(`Deleted existing vectors for ${owner}/${repo}`);
      } catch (error) {
        console.log(`No existing vectors found for ${owner}/${repo} or error deleting`);
      }
    } catch (error) {
      // Ignore errors if vectors don't exist
      console.log(`Error managing existing vectors: ${error}`);
    }
    
    // Chunk the content
    const chunks = chunkText(content);
    console.log(`Created ${chunks.length} chunks for ${owner}/${repo}`);
    
    // Generate embeddings and upsert vectors
    const vectors = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbeddings(chunk);
      const id = getVectorId(owner, repo, i);
      
      vectors.push({
        id,
        vector: embedding,
        metadata: {
          chunk,
          owner,
          repo,
          chunkIndex: i,
        } as Dict,  // Cast to Dict type to ensure compatibility
      });
    }
    
    // Upsert vectors one by one
    for (const vector_item of vectors) {
      await vector.upsert({
        id: vector_item.id,
        vector: vector_item.vector,
        metadata: vector_item.metadata as Dict
      });
    }
    console.log(`Stored ${vectors.length} vectors for ${owner}/${repo}`);
    
    return vectors.length;
  } catch (error) {
    console.error(`Error storing vectors for ${owner}/${repo}:`, error);
    throw error;
  }
}

/**
 * Search for relevant documentation
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param query - Search query
 * @param limit - Maximum number of results to return
 * @returns Array of relevant document chunks with scores
 */
export async function searchDocumentation(
  owner: string,
  repo: string,
  query: string,
  limit: number = 5
): Promise<Array<{ chunk: string; score: number }>> {
  try {
    const queryEmbedding = await getEmbeddings(query);
    
    // Query with prefix to match repo vectors
    // Upstash Vector doesn't have direct metadata filtering,
    // so we use ID prefix matching (side-step until proper metadata filtering is available)
    const idPrefix = `repo:${owner}:${repo}`;
    
    const results = await vector.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      // Include only vectors with IDs matching our prefix
      filter: idPrefix,  // This needs to be a string prefix match, not an object
    });
    
    if (!results || !Array.isArray(results)) {
      return [];
    }
    
    return results.map(result => {
      // Safely extract chunk from metadata
      const metadata = result.metadata as Dict;
      return {
        chunk: metadata?.chunk || "",
        score: result.score,
      };
    });
  } catch (error) {
    console.error(`Error searching documentation for ${owner}/${repo}:`, error);
    return [];
  }
}