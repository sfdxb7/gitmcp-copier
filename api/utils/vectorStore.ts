import { Index } from "@upstash/vector";

// Define a generic Dict type since we can't import it directly
type Dict = { [key: string]: any };

// Initialize Upstash Vector client - single index
const vector = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL || "",
  token: process.env.UPSTASH_VECTOR_REST_TOKEN || "",
});

// TTL for vector entries in seconds (1 day)
const VECTOR_TTL = 60 * 60 * 24 * 1;

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
 * With enhanced recognition of installation-related content
 */
function addTopicFeatures(vector: Float32Array, text: string): void {
  // Installation-specific patterns with strong weights to ensure installation content is prioritized
  const installationPatterns = [
    /how to install|installation guide|setup instructions|getting started/i,
    /\binstall\b.*\b(it|this|package|library|framework)\b/i,
    /\bsetup\b.*\b(guide|tutorial|instructions)\b/i,
    /\bdocker\b.*\b(install|run|setup|compose)\b/i,
    /\b(maven|gradle)\b.*\b(dependency|install|import)\b/i,
    /\bnpm install\b|\byarn add\b|\bpip install\b/i,
    /\brequirements\b|\bprerequisites\b/i
  ];
  
  // Check for installation-specific content
  let installationScore = 0;
  for (const pattern of installationPatterns) {
    if (pattern.test(text)) {
      installationScore += 0.3; // Higher than regular topics
    }
  }
  
  // If this is clearly installation content, significantly boost specific vector dimensions
  if (installationScore > 0) {
    for (let i = 950; i < 960; i++) {
      vector[i] += installationScore;
    }
  }
  
  // Regular topic patterns with normal weights
  const topics = [
    { pattern: /\binstall|setup|deploy|configuration|configure\b/i, position: 950, weight: 0.7 },
    { pattern: /\bdocker|container|kubernetes|k8s\b/i, position: 960, weight: 0.7 },
    { pattern: /\bjava|spring|hibernate|jpa\b/i, position: 970, weight: 0.6 },
    { pattern: /\bquery|sql|database|mongodb|repository\b/i, position: 980, weight: 0.6 },
    { pattern: /\btutorial|guide|example|how to\b/i, position: 990, weight: 0.7 },
    { pattern: /\berror|problem|issue|debug\b/i, position: 1000, weight: 0.5 },
    { pattern: /\bapi|rest|endpoint|url\b/i, position: 1010, weight: 0.5 }
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
  
  // Detect code blocks which often contain installation commands
  const codeBlockPattern = /```[a-z]*\n[\s\S]+?\n```/gi;
  const codeBlocks = text.match(codeBlockPattern) || [];
  
  if (codeBlocks.length > 0) {
    // Check if any code blocks contain installation/setup commands
    const installCommands = codeBlocks.some(block => 
      /\b(npm|yarn|pip|mvn|gradle|docker|apt|yum|brew)\b/i.test(block) ||
      /\binstall\b|\bsetup\b|\bbuild\b|\bcompile\b/i.test(block)
    );
    
    if (installCommands) {
      // Significantly boost installation-related dimensions
      for (let i = 950; i < 960; i++) {
        vector[i] += 0.8;
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
 * Specialized chunker for README files that preserves heading context with content
 * Ensures logical paragraph groups and sections remain coherent
 * @param text - README text in markdown format
 * @returns Array of text chunks with preserved structure
 */
export function chunkReadme(text: string): string[] {
  // Check if this appears to be a README format
  const hasMultipleHeadings = (text.match(/^#+\s+.+/gm) || []).length > 1;
  const hasCodeBlocks = text.includes("```");
  const isReadmeLike = hasMultipleHeadings && (hasCodeBlocks || text.includes("* "));
  
  // If not README-like, use the regular chunking
  if (!isReadmeLike) {
    return chunkText(text);
  }
  
  const chunks: string[] = [];
  
  // Track headers at different levels for context preservation
  let headerStack: string[] = [];
  let currentChunk = "";
  
  // Split content by headings, lists, and code blocks while preserving structure
  const lines = text.split("\n");
  let i = 0;
  
  // Helper function to detect badge lines (markdown image links with badge URLs)
  function isBadgeLine(line: string): boolean {
    // Detect badge-specific patterns (shield.io, badge URLs, image links in a row)
    return /!\[.*\]\(.*badge.*\)/.test(line) || 
           /!\[.*\]\(.*shield\.io.*\)/.test(line) ||
           /\[!\[.*\]\(.*\)\]\(.*\)/.test(line) && (line.includes('badge') || line.includes('shield'));
  }
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Skip badge lines completely - don't include them in any chunk
    if (isBadgeLine(line)) {
      i++;
      continue;
    }
    
    // Check if this is a heading line
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
    
    if (headerMatch) {
      // This is a heading, which means it's a section boundary
      const headerLevel = headerMatch[1].length;
      const headerText = headerMatch[2];
      
      // Before processing the new header, add any existing content as a chunk
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }
      
      // Update header context based on level
      headerStack = headerStack.slice(0, headerLevel - 1);
      headerStack.push(`${"#".repeat(headerLevel)} ${headerText}`);
      
      // Start a new chunk with header context
      currentChunk = headerStack.join("\n\n") + "\n\n";
      
      i++;
    } else {
      // This is regular content or a special element (list, code block, etc.)
      
      // Handle HTML image/link tags that might be badges
      if (line.includes('<img') && (line.includes('badge') || line.includes('shield'))) {
        i++;
        continue;
      }
      
      // Skip consecutive badge or shield lines that might be in a group
      if (line.includes('](') && i + 1 < lines.length && isBadgeLine(lines[i + 1])) {
        let allBadges = true;
        // Look ahead to see if this is part of a badge group
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          if (!isBadgeLine(lines[j]) && lines[j].trim().length > 0) {
            allBadges = false;
            break;
          }
        }
        
        if (allBadges) {
          i++;
          continue;
        }
      }
      
      // Group together consecutive paragraphs that belong together
      if (line.trim() === "") {
        // Empty line - add a paragraph break
        currentChunk += "\n\n";
        i++;
        continue;
      }
      
      // Check for the start of a code block
      if (line.trim().startsWith("```")) {
        // Include the entire code block in the current chunk
        currentChunk += line + "\n";
        i++;
        
        // Keep adding lines until we find the end of the code block
        while (i < lines.length) {
          currentChunk += lines[i] + "\n";
          if (lines[i].trim() === "```") {
            break;
          }
          i++;
        }
        i++;
        continue;
      }
      
      // Check for list items - keep lists together
      if (line.trim().match(/^[*\-+] |^\d+\. /)) {
        // This is a list item, add it
        currentChunk += line + "\n";
        i++;
        
        // Keep adding lines until we find something that's not a list item or empty line
        while (i < lines.length) {
          const nextLine = lines[i];
          
          // Skip badge lines in lists
          if (isBadgeLine(nextLine)) {
            i++;
            continue;
          }
          
          // If it's a continuation of the list or empty line between list items
          if (nextLine.trim() === "" || nextLine.trim().match(/^[*\-+] |^\d+\. /) || 
              nextLine.trim().startsWith("  ")) {
            currentChunk += nextLine + "\n";
            i++;
          } else {
            break;
          }
        }
        continue;
      }
      
      // Regular paragraph content
      currentChunk += line + "\n";
      i++;
      
      // Detect chunks that are getting too large (over 2000 chars)
      if (currentChunk.length > 2000 && currentChunk.trim().endsWith(".")) {
        chunks.push(currentChunk.trim());
        
        // Start a new chunk with the current header context
        currentChunk = headerStack.join("\n\n") + "\n\n";
      }
    }
  }
  
  // Add any remaining content
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Process documentation text into chunks for vector storage
 * Uses specialized chunking based on content type
 * @param text - Documentation text
 * @returns Array of text chunks
 */
export function chunkDocumentation(text: string): string[] {
  // First try README-specific chunking
  try {
    const readmeChunks = chunkReadme(text);
    if (readmeChunks.length > 0) {
      return readmeChunks;
    }
  } catch (error) {
    console.warn("README chunking failed, trying next chunker");
  }
  
  // Then try structured documentation chunking
  try {
    const structuredChunks = chunkStructuredDocs(text);
    if (structuredChunks.length > 0) {
      return structuredChunks;
    }
  } catch (error) {
    console.warn("Structured documentation chunking failed, falling back to default chunker");
  }
  
  // Fall back to the regular chunking algorithm
  return chunkText(text);
}

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
    
    // Use specialized documentation chunking for better results
    const chunks = chunkDocumentation(content);
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
 * Generate combined keyword&pattern score for text matching a specific query intent
 * Used in post-processing to re-rank results beyond vector similarity
 */
function calculateKeywordMatchScore(text: string, query: string): number {
  // Lower-case for case-insensitive matching
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Detect query intent
  const isInstallationQuery = /\bhow\b.*\binstall\b|\bsetup\b|\binstallation\b/i.test(lowerQuery);
  const isUsageQuery = /\bhow\b.*\buse\b|\busage\b|\bexample\b/i.test(lowerQuery);
  const isErrorQuery = /\berror\b|\bissue\b|\bproblem\b|\bfail\b/i.test(lowerQuery);
  
  let score = 0;
  
  // Penalize license sections, which are rarely relevant
  if (/^#+\s+license\b/im.test(text) || text.toLowerCase().includes('mit license')) {
    score -= 0.3;
  }
  
  // Penalize badge sections which are usually not informative for queries
  if (/\]\(https?:\/\/[^)]*badge[^)]*\)/i.test(text) && text.split('\n').length < 8) {
    score -= 0.2;
  }
  
  // Boost sections that likely contain actual information
  if (/^#+\s+(what is|getting started|introduction|usage|examples|installation)/im.test(text)) {
    score += 0.3;
  }
  
  // Extract terms from query (removing stop words)
  const queryTerms = lowerQuery.split(/\W+/).filter(
    term => term.length > 2 && !commonWords.has(term)
  );
  
  // Count term occurrences in text
  for (const term of queryTerms) {
    // Use regex to find whole word matches
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = lowerText.match(regex) || [];
    
    // Add score based on frequency
    score += matches.length * 0.05;
  }
  
  // Boost for heading matches (much higher boost than before)
  const headings = text.match(/#{1,6}\s+([^\n]+)/g) || [];
  for (const heading of headings) {
    const lowerHeading = heading.toLowerCase();
    for (const term of queryTerms) {
      if (lowerHeading.includes(term)) {
        score += 0.25; // Higher boost for term in heading
      }
    }
  }
  
  // Intent-specific pattern matching
  if (isInstallationQuery) {
    // Check for installation instructions
    if (/\binstall\b.*\b(steps|guide|instructions)\b/i.test(lowerText)) {
      score += 0.3;
    }
    
    // Check for package manager commands
    if (/\bnpm install\b|\byarn add\b|\bpip install\b|\bapt-get\b/i.test(lowerText)) {
      score += 0.4;
    }
    
    // Check for docker setup
    if (/\bdocker\b.*\b(install|run|compose)\b/i.test(lowerText)) {
      score += 0.3;
    }
    
    // Check for build tool commands
    if (/\bmvn\b|\bgradle\b|\bmaven\b/i.test(lowerText)) {
      score += 0.25;
    }
  }
  
  // Check for query term proximity (terms appearing close together)
  if (queryTerms.length > 1) {
    // Find all occurrences of first query term
    for (let i = 0; i < lowerText.length; i++) {
      const termIndex = lowerText.indexOf(queryTerms[0], i);
      if (termIndex === -1) break;
      
      // Look for other query terms within 50 chars
      const proximityWindow = lowerText.substring(termIndex, termIndex + 100);
      let proximityMatches = 0;
      
      for (let j = 1; j < queryTerms.length; j++) {
        if (proximityWindow.includes(queryTerms[j])) {
          proximityMatches++;
        }
      }
      
      // Add score based on proximity matches
      score += (proximityMatches / (queryTerms.length - 1)) * 0.15;
      
      // Move past this occurrence
      i = termIndex;
    }
  }
  
  return score;
}

/**
 * Search for relevant documentation
 * With improved post-processing for better relevance ranking
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
    
    // Query vectors without using filter prefix
    const results = await vector.query({
      vector: queryEmbedding,
      topK: limit * 3, // Query more results than needed
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
    
    // Enhanced ranking: combine vector similarity with keyword matching
    const enhancedResults = filteredResults.map(result => {
      const metadata = result.metadata as Dict;
      const chunk = metadata?.chunk || "";
      
      // Calculate keyword match score
      const keywordScore = calculateKeywordMatchScore(chunk, query);
      
      // Combine scores (vector similarity + keyword matching)
      // Normalize vector similarity from [-1,1] to [0,1] range
      const normalizedVectorScore = (result.score + 1) / 2;
      
      // Combined score gives weight to both vector similarity and keyword matches
      const combinedScore = (normalizedVectorScore * 0.6) + (keywordScore * 0.4);
      
      return {
        chunk,
        vectorScore: result.score,
        keywordScore,
        combinedScore
      };
    });
    
    // Sort by combined score
    enhancedResults.sort((a, b) => b.combinedScore - a.combinedScore);
    
    // Return with the combined score for better differentiation
    return enhancedResults.slice(0, limit).map(result => ({
      chunk: result.chunk,
      score: result.combinedScore
    }));
  } catch (error) {
    console.error(`Error searching documentation for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Specialized chunker for documentation that maintains document structure
 * Each chunk contains one documentation entry along with its section context
 * @param text - Documentation text in markdown format
 * @returns Array of text chunks with preserved structure
 */
export function chunkStructuredDocs(text: string): string[] {
  // Quick check to see if this looks like structured documentation
  // Check for both link patterns: [title](url) and nested list items with links
  const hasLinkPatterns = /\[.+?\]\(.+?\)/.test(text);
  if (!hasLinkPatterns) {
    return chunkText(text);
  }
  
  const chunks: string[] = [];
  const lines = text.split('\n');
  
  // Step 1: Extract all headers and build a header hierarchy
  interface HeaderInfo {
    level: number;
    title: string;
    lineIndex: number;
  }
  
  const headers: HeaderInfo[] = [];
  
  lines.forEach((line, index) => {
    const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      headers.push({
        level: headerMatch[1].length,
        title: headerMatch[2].trim(),
        lineIndex: index
      });
    }
  });
  
  // Step 2: Get header context at a given position
  function getHeaderContext(lineIndex: number): string {
    const relevantHeaders = [];
    const minHeaderLevels: Record<number, number> = {};
    
    // Find all headers that appear before this line
    for (const header of headers) {
      if (header.lineIndex < lineIndex) {
        // If we haven't seen this header level yet, or if this header
        // appears after the last one we recorded for this level
        if (
          minHeaderLevels[header.level] === undefined || 
          header.lineIndex > minHeaderLevels[header.level]
        ) {
          minHeaderLevels[header.level] = header.lineIndex;
        }
      }
    }
    
    // Build the relevant header context, from most general to most specific
    const levels = Object.keys(minHeaderLevels)
      .map(Number)
      .sort((a, b) => a - b);
      
    for (const level of levels) {
      const headerIndex = headers.findIndex(
        h => h.level === level && h.lineIndex === minHeaderLevels[level]
      );
      
      if (headerIndex !== -1) {
        relevantHeaders.push(`${'#'.repeat(headers[headerIndex].level)} ${headers[headerIndex].title}`);
      }
    }
    
    return relevantHeaders.join('\n\n');
  }
  
  // Step 3: Process documentation with improved link and list item handling
  let currentEntry = '';
  let entryStartLine = 0;
  let inEntry = false;
  let inLinkList = false;
  let currentHeaderContext = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if this line is a header
    if (trimmedLine.match(/^#{1,6}\s+/)) {
      // If we were in an entry, save it
      if (inEntry && currentEntry.trim()) {
        chunks.push(currentEntry.trim());
      }
      
      // Update header context for subsequent entries
      currentHeaderContext = getHeaderContext(i);
      
      // Headers are also saved as separate chunks with their context
      const headerChunk = `${currentHeaderContext}${currentHeaderContext ? '\n\n' : ''}${trimmedLine}`;
      chunks.push(headerChunk.trim());
      
      // Reset tracking
      currentEntry = '';
      inEntry = false;
      inLinkList = false;
      continue;
    }
    
    // Detect link patterns: [Title](URL) or - [Title](URL)
    const linkMatch = trimmedLine.match(/^(?:[-*]\s*)?\[.+?\]\(.+?\)(?::.*)?$/);
    
    if (linkMatch) {
      // If we're starting a new list of links
      if (!inLinkList) {
        // If we were in another type of entry, save it first
        if (inEntry && currentEntry.trim()) {
          chunks.push(currentEntry.trim());
          currentEntry = '';
        }
        
        // Start tracking a link list
        inLinkList = true;
        inEntry = true;
        entryStartLine = i;
        currentEntry = `${currentHeaderContext}${currentHeaderContext ? '\n\n' : ''}${trimmedLine}`;
      } 
      // Continuation of link list
      else {
        // If this is a new link item but in the same list, create a new chunk with context
        const fullEntry = `${currentHeaderContext}${currentHeaderContext ? '\n\n' : ''}${currentEntry.trim()}\n\n${trimmedLine}`;
        chunks.push(fullEntry.trim());
        
        // Start a new current entry with this line
        currentEntry = `${currentHeaderContext}${currentHeaderContext ? '\n\n' : ''}${trimmedLine}`;
      }
    }
    // Handle link description text (usually after a colon)
    else if (inLinkList && trimmedLine.length > 0 && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) {
      // Append the description to the current entry
      currentEntry += '\n' + trimmedLine;
      
      // If description is substantial, save as a chunk with its link
      if (trimmedLine.length > 20) {
        const fullEntry = `${currentHeaderContext}${currentHeaderContext ? '\n\n' : ''}${currentEntry.trim()}`;
        chunks.push(fullEntry.trim());
      }
    }
    // Handle regular non-link paragraphs
    else if (trimmedLine.length > 0 && !inLinkList) {
      // Start a new regular entry if we weren't in one
      if (!inEntry) {
        inEntry = true;
        entryStartLine = i;
        currentEntry = `${currentHeaderContext}${currentHeaderContext ? '\n\n' : ''}${trimmedLine}`;
      }
      // Continue an existing paragraph
      else {
        currentEntry += '\n' + trimmedLine;
      }
      
      // If we hit a substantial paragraph, save it as its own chunk
      if (currentEntry.length > 200) {
        chunks.push(currentEntry.trim());
        currentEntry = '';
        inEntry = false;
      }
    }
    // Handle empty lines - they might separate entries
    else if (trimmedLine.length === 0) {
      // If we were in a link list, empty line might end it
      if (inLinkList && i < lines.length - 1) {
        // Check if the next non-empty line doesn't start with a link or list marker
        let nextNonEmptyIdx = i + 1;
        while (nextNonEmptyIdx < lines.length && lines[nextNonEmptyIdx].trim() === '') {
          nextNonEmptyIdx++;
        }
        
        if (nextNonEmptyIdx < lines.length) {
          const nextNonEmpty = lines[nextNonEmptyIdx].trim();
          // If next line is not a link or list item, end the link list
          if (!nextNonEmpty.match(/^(?:[-*]\s*)?\[.+?\]\(.+?\)/)) {
            inLinkList = false;
            
            // Save the current entry if it's not already saved
            if (inEntry && currentEntry.trim()) {
              chunks.push(currentEntry.trim());
              currentEntry = '';
              inEntry = false;
            }
          }
        }
      }
      // For regular paragraphs, empty line might separate them
      else if (inEntry && currentEntry.trim()) {
        chunks.push(currentEntry.trim());
        currentEntry = '';
        inEntry = false;
      }
    }
  }
  
  // Add the last entry if we were processing one
  if (inEntry && currentEntry.trim()) {
    chunks.push(currentEntry.trim());
  }
  
  // Filter out duplicate chunks and very short chunks
  const uniqueChunks = Array.from(new Set(chunks)).filter(chunk => chunk.length > 20);
  
  // If we didn't find any chunks with our approach, fall back to standard chunking
  if (uniqueChunks.length === 0) {
    return chunkText(text);
  }
  
  return uniqueChunks;
}