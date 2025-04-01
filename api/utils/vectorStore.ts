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
 * Get simple embeddings for text with improved topical differentiation
 * In a production environment, you would use a proper embedding service like OpenAI
 * @param text - Text to generate embeddings for
 * @returns Vector embedding (simplified)
 */
export async function getEmbeddings(text: string): Promise<number[]> {
  // This is an improved embedding function that creates a better vector representation
  // Still simple but designed to create more topical differentiation
  
  // Create a vector with 1024 dimensions to match Upstash Vector requirements
  const view = new Float32Array(1024);
  
  // Extract key terms and topics from the text
  const keywordExtraction = extractKeywords(text);
  
  // Use a more sophisticated hash function that weights important terms
  const termWeights = keywordExtraction.reduce((acc, item) => {
    acc[item.term] = item.score;
    return acc;
  }, {} as {[key: string]: number});
  
  // Fill the vector with values based on term importance and positions
  const terms = Object.keys(termWeights);
  
  // Fill base vector with simple hash
  for (let i = 0; i < view.length; i++) {
    // Simple hash function for demo purposes
    let hash = 0;
    for (let j = 0; j < text.length; j += 10) { // Sample text at intervals
      hash = ((hash << 5) - hash) + text.charCodeAt(j) + i;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Normalize between -0.5 and 0.5 (base values)
    view[i] = (hash % 100) / 200;
  }
  
  // Enhance with keyword features
  for (const term of terms) {
    // Use term to seed a portion of the vector
    const weight = termWeights[term];
    const termHash = simpleHash(term);
    const startPos = termHash % 900; // Avoid last section
    
    // Enhance specific positions based on term
    for (let i = 0; i < Math.min(term.length * 4, 50); i++) {
      const pos = (startPos + i * 3) % 900;
      // Add weighted value based on term importance
      view[pos] += weight * 0.5 * (Math.sin(termHash + i) * 0.5 + 0.5);
    }
  }
  
  // Add query-specific features in the last section of the vector
  addTopicFeatures(view, text);
  
  // Normalize vector to unit length (important for cosine similarity)
  normalizeVector(view);
  
  return Array.from(view);
}

/**
 * Extract keywords and their importance from text
 */
function extractKeywords(text: string): Array<{term: string, score: number}> {
  const results: Array<{term: string, score: number}> = [];
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  // Count word frequencies
  const wordCounts: {[key: string]: number} = {};
  for (const word of words) {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  
  // Find interesting terms (high frequency or within heading patterns)
  const headings = text.match(/#{1,6}\s+([^\n]+)/g) || [];
  const headingTerms = new Set<string>();
  
  // Extract terms from headings with higher weight
  for (const heading of headings) {
    const cleanHeading = heading.replace(/^#+\s+/, '').toLowerCase();
    const terms = cleanHeading.split(/\W+/).filter(w => w.length > 3);
    terms.forEach(t => headingTerms.add(t));
  }
  
  // Calculate term scores based on frequency and position
  const totalWords = words.length;
  
  for (const word in wordCounts) {
    // Skip common words or very rare words
    if (commonWords.has(word) || wordCounts[word] < 2) continue;
    
    // Calculate score based on frequency
    let score = wordCounts[word] / totalWords;
    
    // Boost score for terms in headings
    if (headingTerms.has(word)) {
      score *= 3;
    }
    
    // Boost for terms in the first paragraph (likely important)
    const firstPara = text.split('\n\n')[0].toLowerCase();
    if (firstPara.includes(word)) {
      score *= 1.5;
    }
    
    results.push({ term: word, score });
  }
  
  // Sort by score and take top 20
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 20);
}

/**
 * Add topic features to the vector to improve matching on specific domains
 */
function addTopicFeatures(vector: Float32Array, text: string): void {
  const topics = [
    { pattern: /\binstall|setup|deploy|configuration|configure\b/i, position: 950, weight: 0.8 },
    { pattern: /\bdocker|container|kubernetes|k8s\b/i, position: 960, weight: 0.8 },
    { pattern: /\bjava|spring|hibernate|jpa\b/i, position: 970, weight: 0.8 },
    { pattern: /\bquery|sql|database|mongodb|repository\b/i, position: 980, weight: 0.8 },
    { pattern: /\btutorial|guide|example|how to\b/i, position: 990, weight: 0.8 },
    { pattern: /\berror|problem|issue|debug\b/i, position: 1000, weight: 0.8 },
    { pattern: /\bapi|rest|endpoint|url\b/i, position: 1010, weight: 0.8 }
  ];
  
  // Enhance specific positions based on detected topics
  for (const topic of topics) {
    const matches = text.match(topic.pattern);
    if (matches) {
      // Set several positions around the base position
      for (let i = 0; i < 5; i++) {
        const pos = (topic.position + i) % 1024;
        vector[pos] += topic.weight;
      }
    }
  }
}

/**
 * Normalize a vector to unit length
 */
function normalizeVector(vector: Float32Array): void {
  // Calculate magnitude
  let magnitude = 0;
  for (let i = 0; i < vector.length; i++) {
    magnitude += vector[i] * vector[i];
  }
  magnitude = Math.sqrt(magnitude);
  
  // Normalize if magnitude isn't zero
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitude;
    }
  }
}

/**
 * Simple string hash function
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Common English words to filter out
 */
const commonWords = new Set([
  'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
  'from', 'they', 'would', 'there', 'their', 'what', 'about', 'which', 'when',
  'will', 'there', 'their', 'your', 'some', 'them', 'other', 'than', 'then',
  'into', 'could', 'because', 'been', 'more', 'these', 'those', 'only'
]);

/**
 * Process documentation text into chunks for vector storage with improved boundaries
 * Ensures chunks respect document structure like paragraphs and headings
 * @param text - Documentation text
 * @param maxChunkSize - Maximum size of each chunk (in characters)
 * @param minChunkSize - Minimum size to consider a chunk complete (in characters)
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 1500,
  minChunkSize: number = 500
): string[] {
  const chunks: string[] = [];
  
  // Split by markdown headings (## Heading)
  const headingPattern = /\n(#{1,6}\s+[^\n]+)\n/g;
  const sections = text.split(headingPattern);
  
  let currentChunk = "";
  let headingText = "";
  
  // Process each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Check if this is a heading
    if (i > 0 && i % 2 === 1) {
      headingText = section.trim();
      continue;
    }
    
    // This is content - process it with the preceding heading
    const contentWithHeading = headingText ? `${headingText}\n\n${section}` : section;
    
    // If content is short enough, add as single chunk
    if (contentWithHeading.length <= maxChunkSize) {
      if (contentWithHeading.trim().length > 0) {
        chunks.push(contentWithHeading.trim());
      }
      headingText = "";
      continue;
    }
    
    // If content is long, split by paragraphs
    const paragraphs = contentWithHeading.split(/\n\n+/);
    
    currentChunk = "";
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      
      // Skip empty paragraphs
      if (!trimmedParagraph) continue;
      
      // If adding this paragraph would exceed max size and we already have content
      if (currentChunk && currentChunk.length + trimmedParagraph.length + 2 > maxChunkSize) {
        // Only add the chunk if it meets minimum size
        if (currentChunk.length >= minChunkSize) {
          chunks.push(currentChunk.trim());
          currentChunk = trimmedParagraph;
        } else {
          // If current chunk is too small, continue adding content
          currentChunk += `\n\n${trimmedParagraph}`;
        }
      } else {
        // Add paragraph with double newline if not the first paragraph
        if (currentChunk) {
          currentChunk += `\n\n${trimmedParagraph}`;
        } else {
          currentChunk = trimmedParagraph;
        }
      }
    }
    
    // Add final chunk from section if it has content
    if (currentChunk.trim().length >= minChunkSize) {
      chunks.push(currentChunk.trim());
    }
    
    headingText = "";
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
    
    // Query vectors without using filter prefix because it's causing errors
    // Instead, we'll filter the results after querying
    const results = await vector.query({
      vector: queryEmbedding,
      topK: limit * 3, // Query more results than needed to ensure we have enough after filtering
      includeMetadata: true,
    });
    
    if (!results || !Array.isArray(results)) {
      return [];
    }
    
    // Filter results by owner and repo manually
    const filteredResults = results.filter(result => {
      const metadata = result.metadata as Dict;
      return metadata?.owner === owner && metadata?.repo === repo;
    });
    
    // Take only the requested number of results
    return filteredResults.slice(0, limit).map(result => {
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