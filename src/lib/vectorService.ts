import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Text splitter for chunking documents
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    companyId: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    totalChunks: number;
    type: string;
  };
  createdAt: Date;
}

export class VectorService {
  private static embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });

  /**
   * Generate embeddings for text using Google's embedding model
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Process and store a document with embeddings
   */
  static async processDocument(
    companyId: string,
    documentId: string,
    documentName: string,
    content: string,
    type: string = 'document'
  ): Promise<void> {
    try {
      console.log(`Processing document: ${documentName} for company: ${companyId}`);
      
      // Split the document into chunks
      const chunks = await textSplitter.createDocuments([content]);
      console.log(`Document split into ${chunks.length} chunks`);

      // Process chunks in batches to avoid overwhelming the API
      const batchSize = 5;
      const vectorsCollection = collection(db, `companies/${companyId}/vectors`);
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunkBatch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
        
        const embeddings = await Promise.all(
          chunkBatch.map(async (chunk, index) => {
            const chunkIndex = i + index;
            const embedding = await this.generateEmbedding(chunk.pageContent);
            
            const vectorDoc: Omit<DocumentChunk, 'id'> = {
              content: chunk.pageContent,
              embedding,
              metadata: {
                source: 'document',
                companyId,
                documentId,
                documentName,
                chunkIndex,
                totalChunks: chunks.length,
                type
              },
              createdAt: new Date()
            };
            
            const docRef = doc(vectorsCollection, `${documentId}_chunk_${chunkIndex}`);
            batch.set(docRef, vectorDoc);
            
            return { chunkIndex, success: true };
          })
        );
        
        await batch.commit();
        console.log(`Processed chunks ${i} to ${Math.min(i + batchSize, chunks.length) - 1}`);
      }

      console.log(`✅ Successfully processed ${documentName} with ${chunks.length} chunks`);
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * Search for similar content using vector similarity
   */
  static async searchSimilar(
    companyId: string,
    query: string,
    limit: number = 10
  ): Promise<DocumentChunk[]> {
    try {
      console.log(`Searching for: "${query}" in company ${companyId}`);
      
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Get all vectors for the company
      const vectorsCollection = collection(db, `companies/${companyId}/vectors`);
      const snapshot = await getDocs(vectorsCollection);
      
      if (snapshot.empty) {
        console.log('No vectors found for this company');
        return [];
      }

      // Calculate cosine similarity for each document chunk
      const similarities: Array<{ chunk: DocumentChunk; score: number }> = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Omit<DocumentChunk, 'id'>;
        const chunk: DocumentChunk = {
          id: doc.id,
          ...data
        };
        
        // Calculate cosine similarity
        const score = this.cosineSimilarity(queryEmbedding, data.embedding);
        similarities.push({ chunk, score });
      });

      // Sort by similarity score and return top results
      similarities.sort((a, b) => b.score - a.score);
      const topResults = similarities.slice(0, limit);
      
      console.log(`Found ${topResults.length} relevant chunks`);
      return topResults.map(r => r.chunk);
    } catch (error) {
      console.error('Error searching vectors:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  /**
   * Delete all vectors for a document
   */
  static async deleteDocumentVectors(
    companyId: string,
    documentId: string
  ): Promise<void> {
    try {
      const vectorsCollection = collection(db, `companies/${companyId}/vectors`);
      const q = query(vectorsCollection, where('metadata.documentId', '==', documentId));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted ${snapshot.size} vectors for document ${documentId}`);
    } catch (error) {
      console.error('Error deleting document vectors:', error);
      throw error;
    }
  }

  /**
   * Get enhanced AI context using vector search
   */
  static async getEnhancedAIContext(
    companyId: string,
    taskDescription: string,
    limit: number = 20
  ): Promise<string> {
    try {
      // Search for relevant document chunks
      const relevantChunks = await this.searchSimilar(companyId, taskDescription, limit);
      
      if (relevantChunks.length === 0) {
        return 'No relevant documents found in vector database.';
      }

      // Group chunks by document
      const documentGroups = new Map<string, DocumentChunk[]>();
      relevantChunks.forEach(chunk => {
        const docId = chunk.metadata.documentId;
        if (!documentGroups.has(docId)) {
          documentGroups.set(docId, []);
        }
        documentGroups.get(docId)!.push(chunk);
      });

      // Build context string
      let context = `RELEVANT DOCUMENTS FROM VECTOR SEARCH (${relevantChunks.length} chunks from ${documentGroups.size} documents):\n\n`;
      
      documentGroups.forEach((chunks, docId) => {
        const firstChunk = chunks[0];
        context += `📄 DOCUMENT: ${firstChunk.metadata.documentName}\n`;
        context += `Type: ${firstChunk.metadata.type}\n`;
        context += `Relevant Sections (${chunks.length}):\n`;
        context += '='.repeat(60) + '\n';
        
        // Sort chunks by their original order
        chunks.sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex);
        
        chunks.forEach((chunk, index) => {
          context += `\n[Section ${chunk.metadata.chunkIndex + 1} of ${chunk.metadata.totalChunks}]\n`;
          context += chunk.content;
          context += '\n';
        });
        
        context += '\n' + '='.repeat(60) + '\n\n';
      });

      return context;
    } catch (error) {
      console.error('Error getting enhanced AI context:', error);
      return 'Error retrieving vector search results.';
    }
  }

  /**
   * Process all existing documents for a company
   */
  static async processExistingDocuments(companyId: string): Promise<void> {
    try {
      console.log(`Processing existing documents for company ${companyId}`);
      
      // Get all documents from the regular documents collection
      const docsCollection = collection(db, `companies/${companyId}/documents`);
      const docsSnapshot = await getDocs(docsCollection);
      
      console.log(`Found ${docsSnapshot.size} documents to process`);
      
      for (const docSnapshot of docsSnapshot.docs) {
        const docData = docSnapshot.data();
        
        // Skip if no content or URL
        if (!docData.content && !docData.url) {
          console.log(`Skipping ${docData.name} - no content available`);
          continue;
        }
        
        let content = '';
        
        // If document has direct content, use it
        if (docData.content) {
          content = docData.content;
        } else if (docData.url && docData.type === 'application/pdf') {
          // For PDFs with URLs, extract content using our PDF extractor
          console.log(`📄 Processing PDF document for vector storage: ${docData.name}`);
          try {
            // Fetch the PDF file from Firebase Storage
            const pdfResponse = await fetch(docData.url);
            if (pdfResponse.ok) {
              const pdfArrayBuffer = await pdfResponse.arrayBuffer();
              const pdfBuffer = Buffer.from(pdfArrayBuffer);
              
              // Use our PDF extractor
              const { extractPdfText } = await import('./pdfExtractor');
              content = await extractPdfText(pdfBuffer, docData.name);
              
              console.log(`✅ PDF extraction successful for vector storage: ${docData.name} (${content.length} characters)`);
            } else {
              console.error(`Failed to fetch PDF from URL: ${docData.url}`);
              continue;
            }
          } catch (error) {
            console.error(`Error processing PDF ${docData.name} for vector storage:`, error);
            continue;
          }
        }
        
        if (content && content.length > 50) { // Only process meaningful content
          await this.processDocument(
            companyId,
            docSnapshot.id,
            docData.name || 'Unknown Document',
            content,
            docData.type || 'document'
          );
        }
      }
      
      // Also process artifacts collection if it exists
      const artifactsCollection = collection(db, `companies/${companyId}/artifacts`);
      const artifactsSnapshot = await getDocs(artifactsCollection);
      
      console.log(`Found ${artifactsSnapshot.size} artifacts to process`);
      
      for (const artifactSnapshot of artifactsSnapshot.docs) {
        const artifactData = artifactSnapshot.data();
        
        if (artifactData.data && String(artifactData.data).length > 50) {
          await this.processDocument(
            companyId,
            artifactSnapshot.id,
            artifactData.name || 'Artifact',
            String(artifactData.data),
            'artifact'
          );
        }
      }
      
      console.log('✅ Finished processing existing documents');
    } catch (error) {
      console.error('Error processing existing documents:', error);
      throw error;
    }
  }
}