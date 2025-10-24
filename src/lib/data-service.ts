import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import type { Task, CompanyTask } from './types';
import { tasks as defaultTasks } from './data';
import { VectorService } from './vectorService';
import { getCompanyContact } from './companyContactData';

export class DataService {
  // Get all task templates
  static async getTaskTemplates(): Promise<Task[]> {
    try {
      const tasksRef = collection(db, 'taskTemplates');
      const snapshot = await getDocs(tasksRef);
      
      if (snapshot.empty) {
        return defaultTasks;
      }
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
    } catch (error) {
      console.log('Using default tasks due to error:', error);
      return defaultTasks;
    }
  }

  // Get company tasks
  static async getCompanyTasks(companyId?: string): Promise<CompanyTask[]> {
    try {
      const tasksRef = collection(db, 'companyTasks');
      let q;
      
      if (companyId) {
        // Use simple where filter without orderBy to avoid index issues
        q = query(tasksRef, where('companyId', '==', companyId));
      } else {
        // For all tasks, just get all without ordering to avoid index issues
        q = query(tasksRef);
      }
      
      const snapshot = await getDocs(q);
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CompanyTask));
      
      // Sort in memory by renewalDate if needed
      return tasks.sort((a, b) => {
        if (!a.renewalDate || !b.renewalDate) return 0;
        return a.renewalDate.toDate().getTime() - b.renewalDate.toDate().getTime();
      });
    } catch (error) {
      console.error('Error fetching company tasks:', error);
      return [];
    }
  }

  // Get company information
  static async getCompany(companyId: string): Promise<any> {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const snapshot = await getDoc(companyRef);
      
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...snapshot.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching company:', error);
      return null;
    }
  }

  // Get all companies
  static async getCompanies(): Promise<any[]> {
    try {
      const companiesRef = collection(db, 'companies');
      const snapshot = await getDocs(companiesRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }

  // Get tasks by phase
  static async getTasksByPhase(phase: string, companyId?: string): Promise<CompanyTask[]> {
    const tasks = await this.getCompanyTasks(companyId);
    return tasks.filter(task => task.phase === phase);
  }

  // Get tasks by status
  static async getTasksByStatus(status: string, companyId?: string): Promise<CompanyTask[]> {
    const tasks = await this.getCompanyTasks(companyId);
    return tasks.filter(task => task.status === status);
  }

  // Get AI-enabled tasks
  static async getAITasks(companyId?: string): Promise<CompanyTask[]> {
    const tasks = await this.getCompanyTasks(companyId);
    return tasks.filter(task => task.tag === 'ai');
  }

  // Get upcoming renewals
  static async getUpcomingRenewals(daysAhead: number = 30): Promise<CompanyTask[]> {
    try {
      const tasks = await this.getCompanyTasks();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
      
      return tasks.filter(task => {
        if (!task.renewalDate) return false;
        const renewalDate = task.renewalDate.toDate();
        return renewalDate <= cutoffDate && renewalDate >= new Date();
      });
    } catch (error) {
      console.error('Error fetching upcoming renewals:', error);
      return [];
    }
  }

  // Search functionality
  static async searchTasks(searchTerm: string, companyId?: string): Promise<CompanyTask[]> {
    const tasks = await this.getCompanyTasks(companyId);
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return tasks.filter(task => 
      task.taskName.toLowerCase().includes(lowercaseSearch) ||
      task.description.toLowerCase().includes(lowercaseSearch) ||
      task.phase.toLowerCase().includes(lowercaseSearch) ||
      task.status.toLowerCase().includes(lowercaseSearch)
    );
  }

  // Get completed tasks for a company with their documents and artifacts
  static async getCompletedTasksWithArtifacts(companyId: string): Promise<any[]> {
    try {
      const tasks = await this.getCompanyTasks(companyId);
      const completedTasks = tasks.filter(task => task.status === 'completed');
      
      // For each completed task, get its chat history which may contain documents and artifacts
      const tasksWithArtifacts = await Promise.all(
        completedTasks.map(async (task) => {
          try {
            const chatRef = collection(db, 'taskChats', task.id, 'messages');
            const chatQuery = query(chatRef, orderBy('timestamp', 'asc'));
            const chatSnapshot = await getDocs(chatQuery);
            
            const messages = chatSnapshot.docs.map(doc => doc.data());
            const documents: any[] = [];
            const artifacts: any[] = [];
            
            // Extract documents and artifacts from chat messages
            messages.forEach((message: any) => {
              if (message.documents && Array.isArray(message.documents)) {
                documents.push(...message.documents);
              }
              if (message.content && message.content.includes('<artifact>')) {
                const artifactMatch = message.content.match(/<artifact>([\s\S]*?)<\/artifact>/);
                if (artifactMatch) {
                  artifacts.push({
                    taskId: task.id,
                    taskName: task.taskName,
                    content: artifactMatch[1],
                    timestamp: message.timestamp
                  });
                }
              }
            });
            
            return {
              ...task,
              documents,
              artifacts,
              messages: messages.length
            };
          } catch (error) {
            console.error(`Error fetching artifacts for task ${task.id}:`, error);
            return {
              ...task,
              documents: [],
              artifacts: [],
              messages: 0
            };
          }
        })
      );
      
      return tasksWithArtifacts;
    } catch (error) {
      console.error('Error fetching completed tasks with artifacts:', error);
      return [];
    }
  }

  // Get all relevant context for AI task completion
  static async getAITaskContext(companyId: string, taskId?: string): Promise<{
    company: any;
    completedTasks: any[];
    allDocuments: any[];
    allArtifacts: any[];
    relevantContent: string;
  }> {
    try {
      const [company, completedTasks] = await Promise.all([
        this.getCompany(companyId),
        this.getCompletedTasksWithArtifacts(companyId)
      ]);
      
      const allDocuments: any[] = [];
      const allArtifacts: any[] = [];
      
      // Get documents from task messages
      completedTasks.forEach(task => {
        if (task.documents) allDocuments.push(...task.documents);
        if (task.artifacts) allArtifacts.push(...task.artifacts);
      });
      
      // ALSO get documents from the separate documents/artifacts collection
      try {
        console.log('=== CHECKING SEPARATE DOCUMENTS COLLECTION ===');
        const documentsRef = collection(db, `companies/${companyId}/artifacts`);
        const documentsSnapshot = await getDocs(documentsRef);
        
        console.log(`Found ${documentsSnapshot.docs.length} documents in separate collection`);
        
        // Special search for the missing PDF
        let foundTargetPDF = false;
        
        documentsSnapshot.docs.forEach((docSnapshot, index) => {
          const docData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // Check if this is the missing PDF document
          const filename = docData.name || '';
          const isTargetPDF = filename.includes('24-25') || filename.includes('WC Acord') || filename.includes('TWR');
          if (isTargetPDF) {
            foundTargetPDF = true;
            console.log('🎯 FOUND TARGET PDF:', {
              id: docData.id,
              name: docData.name,
              filename: filename,
              type: docData.type,
              hasData: !!docData.data,
              dataLength: docData.data?.length || 0,
              contentPreview: docData.data ? String(docData.data).substring(0, 500) : 'No content'
            });
          }
          
          console.log(`Document ${index}:`, {
            name: docData.name,
            type: docData.type,
            hasData: !!docData.data,
            dataLength: docData.data?.length || 0,
            tags: docData.tags,
            isTargetPDF
          });
          
          // Add to allArtifacts (treating documents as artifacts for AI consumption)
          if (docData.data) {
            allArtifacts.push({
              taskId: 'document-' + docData.id,
              taskName: docData.name || 'Document',
              content: String(docData.data), // Ensure content is always a string
              timestamp: docData.createdAt || docData.updatedAt,
              filename: docData.name,
              type: docData.type
            });
          }
        });
        
        if (!foundTargetPDF) {
          console.log('⚠️ TARGET PDF "24-25 WC Acord-TWR.pdf" NOT FOUND in artifacts collection');
        }
        
      } catch (docError) {
        console.error('Error fetching separate documents:', docError);
      }
      
      // ALSO check the regular documents collection  
      try {
        console.log('=== CHECKING REGULAR DOCUMENTS COLLECTION ===');
        const regularDocsRef = collection(db, `companies/${companyId}/documents`);
        const regularDocsSnapshot = await getDocs(regularDocsRef);
        
        console.log(`Found ${regularDocsSnapshot.docs.length} documents in regular documents collection`);
        
        let foundTargetPDFInRegular = false;
        
        for (const docSnapshot of regularDocsSnapshot.docs) {
          const docData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // Check if this is the missing PDF document
          const filename = docData.name || '';
          const isTargetPDF = filename.includes('24-25') || filename.includes('WC Acord') || filename.includes('TWR');
          const isPDF = filename.toLowerCase().endsWith('.pdf') || docData.type === 'application/pdf';
          const isExcel = filename.toLowerCase().endsWith('.xlsx') ||
                         filename.toLowerCase().endsWith('.xls') ||
                         docData.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                         docData.type === 'application/vnd.ms-excel';
          const isWord = filename.toLowerCase().endsWith('.docx') ||
                        filename.toLowerCase().endsWith('.doc') ||
                        docData.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                        docData.type === 'application/msword';

          if (isTargetPDF) {
            foundTargetPDFInRegular = true;
            console.log('🎯 FOUND TARGET PDF IN REGULAR DOCS:', {
              id: docData.id,
              name: docData.name,
              filename: filename,
              type: docData.type,
              url: docData.url,
              size: docData.size
            });
          }

          console.log(`Regular Document ${regularDocsSnapshot.docs.indexOf(docSnapshot)}:`, {
            name: docData.name,
            type: docData.type,
            size: docData.size,
            url: docData.url ? 'Has URL' : 'No URL',
            isTargetPDF,
            isPDF,
            isExcel,
            isWord
          });

          // If this is an Excel document, use pre-processed text or extract on-the-fly as fallback
          if (isExcel) {
            console.log(`📊 Processing Excel document: ${filename}`);

            // Check if we have pre-processed text
            if (docData.extractedText && docData.processingStatus === 'success') {
              console.log(`✅ Using pre-processed text for Excel: ${filename} (${docData.extractedText.length} characters)`);

              allArtifacts.push({
                taskId: 'excel-document-' + docData.id,
                taskName: docData.name || 'Excel Document',
                content: docData.extractedText,
                timestamp: docData.uploadedAt || new Date(),
                filename: docData.name,
                type: docData.type,
                extractedFromRegularDocs: true,
                size: docData.size,
                url: docData.url,
                preProcessed: true
              });
            } else if (docData.url) {
              console.log(`⚠️ No pre-processed text for Excel: ${filename}, extracting on-the-fly (slower)`);

              try {
                // Fetch the Excel file from Firebase Storage
                const excelResponse = await fetch(docData.url);
                if (excelResponse.ok) {
                  const excelArrayBuffer = await excelResponse.arrayBuffer();
                  const excelBuffer = Buffer.from(excelArrayBuffer);

                  // Use our new Excel extractor
                  const { extractExcelText } = await import('./excelExtractor');
                  const extractedContent = await extractExcelText(excelBuffer, filename);

                  console.log(`✅ Excel processing complete for: ${filename} (${extractedContent.length} characters)`);

                  // Add the extracted content as an artifact
                  allArtifacts.push({
                    taskId: 'excel-document-' + docData.id,
                    taskName: docData.name || 'Excel Document',
                    content: extractedContent,
                    timestamp: docData.uploadedAt || new Date(),
                    filename: docData.name,
                    type: docData.type,
                    extractedFromRegularDocs: true,
                    size: docData.size,
                    url: docData.url
                  });
                } else {
                  console.error(`Failed to fetch Excel from URL: ${docData.url}`);
                  // Add placeholder if fetch fails
                  allArtifacts.push({
                    taskId: 'excel-document-' + docData.id,
                    taskName: docData.name || 'Excel Document',
                    content: `EXCEL DOCUMENT: ${filename}\n\nFile Size: ${docData.size} bytes\nType: ${docData.type}\n\n[Excel content could not be fetched - file may be inaccessible or URL expired]`,
                    timestamp: docData.uploadedAt || new Date(),
                    filename: docData.name,
                    type: docData.type,
                    extractedFromRegularDocs: true,
                    size: docData.size,
                    url: docData.url
                  });
                }
              } catch (error) {
                console.error(`Error processing Excel ${filename}:`, error);
                // Add error placeholder
                allArtifacts.push({
                  taskId: 'excel-document-' + docData.id,
                  taskName: docData.name || 'Excel Document',
                  content: `EXCEL DOCUMENT: ${filename}\n\nFile Size: ${docData.size} bytes\nType: ${docData.type}\n\n[Excel content extraction error: ${error instanceof Error ? error.message : 'Unknown error'}]`,
                  timestamp: docData.uploadedAt || new Date(),
                  filename: docData.name,
                  type: docData.type,
                  extractedFromRegularDocs: true,
                  size: docData.size,
                  url: docData.url
                });
              }
            }
          }
          // If this is a PDF document, use pre-processed text or extract on-the-fly as fallback
          else if (isPDF) {
            console.log(`📄 Processing PDF document: ${filename}`);

            // Check if we have pre-processed text
            if (docData.extractedText && docData.processingStatus === 'success') {
              console.log(`✅ Using pre-processed text for PDF: ${filename} (${docData.extractedText.length} characters)`);

              allArtifacts.push({
                taskId: 'pdf-document-' + docData.id,
                taskName: docData.name || 'PDF Document',
                content: docData.extractedText,
                timestamp: docData.uploadedAt || new Date(),
                filename: docData.name,
                type: docData.type,
                extractedFromRegularDocs: true,
                size: docData.size,
                url: docData.url,
                preProcessed: true
              });
            } else if (docData.url) {
              console.log(`⚠️ No pre-processed text for PDF: ${filename}, extracting on-the-fly (slower)`);

              try {
                // Fetch the PDF file from Firebase Storage
                const pdfResponse = await fetch(docData.url);
                if (pdfResponse.ok) {
                  const pdfArrayBuffer = await pdfResponse.arrayBuffer();
                  const pdfBuffer = Buffer.from(pdfArrayBuffer);

                  // Use our new PDF extractor
                  const { extractPdfText } = await import('./pdfExtractor');
                  const extractedContent = await extractPdfText(pdfBuffer, filename);

                  console.log(`✅ PDF processing complete for: ${filename} (${extractedContent.length} characters)`);

                  // Add the extracted content as an artifact
                  allArtifacts.push({
                    taskId: 'pdf-document-' + docData.id,
                    taskName: docData.name || 'PDF Document',
                    content: extractedContent,
                    timestamp: docData.uploadedAt || new Date(),
                    filename: docData.name,
                    type: docData.type,
                    extractedFromRegularDocs: true,
                    size: docData.size,
                    url: docData.url
                  });
                } else {
                  console.error(`Failed to fetch PDF from URL: ${docData.url}`);
                  // Add placeholder if fetch fails
                  allArtifacts.push({
                    taskId: 'pdf-document-' + docData.id,
                    taskName: docData.name || 'PDF Document',
                    content: `PDF DOCUMENT: ${filename}\n\nFile Size: ${docData.size} bytes\nType: ${docData.type}\n\n[PDF content could not be fetched - file may be inaccessible or URL expired]`,
                    timestamp: docData.uploadedAt || new Date(),
                    filename: docData.name,
                    type: docData.type,
                    extractedFromRegularDocs: true,
                    size: docData.size,
                    url: docData.url
                  });
                }
              } catch (error) {
                console.error(`Error processing PDF ${filename}:`, error);
                // Add error placeholder
                allArtifacts.push({
                  taskId: 'pdf-document-' + docData.id,
                  taskName: docData.name || 'PDF Document',
                  content: `PDF DOCUMENT: ${filename}\n\nFile Size: ${docData.size} bytes\nType: ${docData.type}\n\n[PDF content extraction error: ${error instanceof Error ? error.message : 'Unknown error'}]`,
                  timestamp: docData.uploadedAt || new Date(),
                  filename: docData.name,
                  type: docData.type,
                  extractedFromRegularDocs: true,
                  size: docData.size,
                  url: docData.url
                });
              }
            }
          }
          // If this is a Word document, use pre-processed text or extract on-the-fly as fallback
          else if (isWord) {
            console.log(`📝 Processing Word document: ${filename}`);

            // Check if we have pre-processed text
            if (docData.extractedText && docData.processingStatus === 'success') {
              console.log(`✅ Using pre-processed text for Word: ${filename} (${docData.extractedText.length} characters)`);

              allArtifacts.push({
                taskId: 'word-document-' + docData.id,
                taskName: docData.name || 'Word Document',
                content: docData.extractedText,
                timestamp: docData.uploadedAt || new Date(),
                filename: docData.name,
                type: docData.type,
                extractedFromRegularDocs: true,
                size: docData.size,
                url: docData.url,
                preProcessed: true
              });
            } else if (docData.url) {
              console.log(`⚠️ No pre-processed text for Word: ${filename}, extracting on-the-fly (slower)`);

              try {
                // Fetch the Word file from Firebase Storage
                const wordResponse = await fetch(docData.url);
                if (wordResponse.ok) {
                  const wordArrayBuffer = await wordResponse.arrayBuffer();
                  const wordBuffer = Buffer.from(wordArrayBuffer);

                  // Use mammoth to extract text from Word documents
                  const mammoth = await import('mammoth');
                  const result = await mammoth.extractRawText({ buffer: wordBuffer });

                  let extractedContent = '';
                  if (result.value && result.value.trim()) {
                    extractedContent = `WORD DOCUMENT: ${filename}\n\n` +
                                     `File Size: ${docData.size} bytes\n` +
                                     `=`.repeat(60) + '\n\n' +
                                     result.value.trim();
                    console.log(`✅ Word processing complete for: ${filename} (${result.value.length} characters)`);
                  } else {
                    extractedContent = `WORD DOCUMENT: ${filename}\n\nFile Size: ${docData.size} bytes\n${'='.repeat(60)}\n\n[No readable text content found in document]`;
                  }

                  // Add the extracted content as an artifact
                  allArtifacts.push({
                    taskId: 'word-document-' + docData.id,
                    taskName: docData.name || 'Word Document',
                    content: extractedContent,
                    timestamp: docData.uploadedAt || new Date(),
                    filename: docData.name,
                    type: docData.type,
                    extractedFromRegularDocs: true,
                    size: docData.size,
                    url: docData.url
                  });
                } else {
                  console.error(`Failed to fetch Word doc from URL: ${docData.url}`);
                  // Add placeholder if fetch fails
                  allArtifacts.push({
                    taskId: 'word-document-' + docData.id,
                    taskName: docData.name || 'Word Document',
                    content: `WORD DOCUMENT: ${filename}\n\nFile Size: ${docData.size} bytes\nType: ${docData.type}\n\n[Word document content could not be fetched - file may be inaccessible or URL expired]`,
                    timestamp: docData.uploadedAt || new Date(),
                    filename: docData.name,
                    type: docData.type,
                    extractedFromRegularDocs: true,
                    size: docData.size,
                    url: docData.url
                  });
                }
              } catch (error) {
                console.error(`Error processing Word doc ${filename}:`, error);
                // Add error placeholder
                allArtifacts.push({
                  taskId: 'word-document-' + docData.id,
                  taskName: docData.name || 'Word Document',
                  content: `WORD DOCUMENT: ${filename}\n\nFile Size: ${docData.size} bytes\nType: ${docData.type}\n\n[Word document content extraction error: ${error instanceof Error ? error.message : 'Unknown error'}]`,
                  timestamp: docData.uploadedAt || new Date(),
                  filename: docData.name,
                  type: docData.type,
                  extractedFromRegularDocs: true,
                  size: docData.size,
                  url: docData.url
                });
              }
            }
          }
        }

        if (!foundTargetPDFInRegular) {
          console.log('⚠️ TARGET PDF "24-25 WC Acord-TWR.pdf" NOT FOUND in regular documents collection');
        }
        
      } catch (regularDocError) {
        console.error('Error fetching regular documents:', regularDocError);
      }
      
      // Create a comprehensive summary of relevant content with full artifact data
      const relevantContent = `
COMPANY INFORMATION:
- Name: ${company?.name || 'Unknown'}
- Description: ${company?.description || 'No description available'}
- Website: ${company?.website || 'No website provided'}
- Additional Data: ${JSON.stringify(company || {}, null, 2)}

COMPLETED TASKS SUMMARY (${completedTasks.length} tasks):
${completedTasks.map(task => `
• ${task.taskName} (Phase: ${task.phase}, Status: ${task.status})
  - Task ID: ${task.id}
  - Documents: ${task.documents.length}
  - Artifacts: ${task.artifacts.length}
  - Messages: ${task.messages}
  - Description: ${task.description || 'No description'}
`).join('')}

AVAILABLE DOCUMENTS (${allDocuments.length} total):
${allDocuments.map((doc, i) => `
${i + 1}. DOCUMENT: ${doc.filename || `Document ${i + 1}`}
   Content: ${doc.content?.substring(0, 500) || 'No content available'}
   Type: ${doc.type || 'unknown'}
   ${doc.content?.length > 500 ? '...(truncated)' : ''}
`).join('')}

AVAILABLE ARTIFACTS (${allArtifacts.length} total):
${allArtifacts.map((artifact, i) => `
${i + 1}. ARTIFACT FROM TASK: "${artifact.taskName}"
   Task ID: ${artifact.taskId}
   Full Content:
   ${artifact.content}
   
   ---END OF ARTIFACT ${i + 1}---
`).join('')}

DETAILED DATA FOR SEARCH:
- Total data points available: ${allDocuments.length + allArtifacts.length + completedTasks.length}
- Company data keys: ${Object.keys(company || {}).join(', ')}
- Task phases represented: ${[...new Set(completedTasks.map(t => t.phase))].join(', ')}
- Task types/tags: ${[...new Set(completedTasks.map(t => t.tag).filter(Boolean))].join(', ')}
      `;
      
      return {
        company,
        completedTasks,
        allDocuments,
        allArtifacts,
        relevantContent
      };
    } catch (error) {
      console.error('Error getting AI task context:', error);
      return {
        company: null,
        completedTasks: [],
        allDocuments: [],
        allArtifacts: [],
        relevantContent: 'Error loading context'
      };
    }
  }

  // Get marketing files for a specific insurance type
  static async getMarketingFiles(insuranceType?: string): Promise<any[]> {
    try {
      const marketingFilesRef = collection(db, 'marketingFiles');
      let q;

      if (insuranceType) {
        q = query(marketingFilesRef, where('insuranceType', '==', insuranceType));
      } else {
        q = query(marketingFilesRef);
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching marketing files:', error);
      return [];
    }
  }

  // Get agency information
  static async getAgencyInfo(): Promise<any> {
    try {
      const agencyInfoRef = doc(db, 'settings', 'agencyInfo');
      const agencyInfoSnap = await getDoc(agencyInfoRef);

      if (agencyInfoSnap.exists()) {
        return agencyInfoSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching agency info:', error);
      return null;
    }
  }

  static async getEnhancedAITaskContext(companyId: string, taskId?: string): Promise<{
    company: any;
    completedTasks: any[];
    allDocuments: any[];
    allArtifacts: any[];
    marketingFiles: any[];
    relevantContent: string;
    vectorSearchContent: string;
  }> {
    try {
      console.log('=== ENHANCED AI TASK CONTEXT WITH VECTOR SEARCH ===');
      console.log('Company ID:', companyId, 'Task ID:', taskId);

      // Get basic context first (existing functionality)
      const basicContext = await this.getAITaskContext(companyId, taskId);

      // Get company contact data override if available
      const contactData = getCompanyContact(companyId);

      // Get agency information
      const agencyInfo = await this.getAgencyInfo();

      // Get task-specific marketing files
      let marketingFiles: any[] = [];
      let taskInsuranceType = '';
      if (taskId) {
        try {
          const taskDocRef = doc(db, 'companyTasks', taskId);
          const taskDoc = await getDoc(taskDocRef);
          if (taskDoc.exists()) {
            const task = taskDoc.data();
            taskInsuranceType = task.renewalType || task.policyType || '';
            if (taskInsuranceType) {
              marketingFiles = await this.getMarketingFiles(taskInsuranceType);
              console.log(`📁 Found ${marketingFiles.length} marketing files for ${taskInsuranceType}`);
            }
          }
        } catch (error) {
          console.log('Could not fetch task-specific marketing files');
        }
      }
      
      // Get the current task details for better vector search AND load dependency artifacts
      let taskDescription = 'insurance document analysis';
      let dependencyArtifacts: any[] = [];
      if (taskId) {
        try {
          const taskDocRef = doc(db, 'companyTasks', taskId);
          const taskDoc = await getDoc(taskDocRef);
          if (taskDoc.exists()) {
            const task = taskDoc.data();
            taskDescription = `${task.taskName || ''} ${task.description || ''}`.trim();
            console.log('Using task description for vector search:', taskDescription);

            // Load artifacts from dependency tasks
            if (task.dependencies && Array.isArray(task.dependencies) && task.dependencies.length > 0) {
              console.log(`📦 Loading artifacts from ${task.dependencies.length} dependency task(s)`);

              for (const depTaskId of task.dependencies) {
                try {
                  // Check if this is a completed task
                  const depTaskRef = doc(db, 'companyTasks', depTaskId);
                  const depTaskDoc = await getDoc(depTaskRef);

                  if (depTaskDoc.exists()) {
                    const depTask = depTaskDoc.data();
                    console.log(`  ↳ Dependency task: ${depTask.taskName} (${depTask.status})`);

                    // Only load artifacts from completed tasks
                    if (depTask.status === 'completed') {
                      // Get artifacts from the artifacts collection for this task
                      const artifactsRef = collection(db, `companies/${companyId}/artifacts`);
                      const artifactsQuery = query(artifactsRef, where('taskId', '==', depTaskId));
                      const artifactsSnapshot = await getDocs(artifactsQuery);

                      artifactsSnapshot.docs.forEach(artifactDoc => {
                        const artifactData = { id: artifactDoc.id, ...artifactDoc.data() };
                        console.log(`    ✓ Found artifact: ${artifactData.title || 'Untitled'}`);

                        dependencyArtifacts.push({
                          taskId: depTaskId,
                          taskName: depTask.taskName,
                          artifactId: artifactData.id,
                          title: artifactData.title,
                          content: artifactData.content,
                          timestamp: artifactData.createdAt || artifactData.timestamp,
                          isDependency: true
                        });
                      });
                    }
                  }
                } catch (depError) {
                  console.error(`Error loading artifacts for dependency ${depTaskId}:`, depError);
                }
              }

              console.log(`✅ Loaded ${dependencyArtifacts.length} artifact(s) from dependency tasks`);
            }
          }
        } catch (taskError) {
          console.log('Could not fetch task details for vector search, using default');
        }
      }

      // Use vector search to find relevant document chunks
      let vectorSearchContent = '';
      try {
        console.log('🔍 Performing vector search for:', taskDescription);
        vectorSearchContent = await VectorService.getEnhancedAIContext(companyId, taskDescription);
        console.log(`✅ Vector search completed, content length: ${vectorSearchContent.length}`);
      } catch (vectorError) {
        console.log('Vector search failed, falling back to basic context:', vectorError);
        vectorSearchContent = 'Vector search not available - using traditional document retrieval.';
      }

      // Combine traditional context with vector search results, contact data, agency info, and marketing files
      const agencyInfoText = agencyInfo ? `
=== YOUR AGENCY INFORMATION ===
Agency Name: ${agencyInfo.agencyName || 'Not provided'}
Contact Name: ${agencyInfo.contactName || 'Not provided'}
Email: ${agencyInfo.email || 'Not provided'}
Phone: ${agencyInfo.phone || 'Not provided'}
Address: ${agencyInfo.address || 'Not provided'}${agencyInfo.city ? ', ' + agencyInfo.city : ''}${agencyInfo.state ? ', ' + agencyInfo.state : ''}${agencyInfo.zip ? ' ' + agencyInfo.zip : ''}
Website: ${agencyInfo.website || 'Not provided'}
License Number: ${agencyInfo.licenseNumber || 'Not provided'}

Use this information when signing emails, creating proposals, or any client-facing communications.
` : '';

      const contactInfo = contactData ? `
=== COMPANY CONTACT INFORMATION ===
Primary Contact: ${contactData.primaryContact}
Phone: ${contactData.phone}
Email: ${contactData.email}
Address: ${contactData.address?.street}, ${contactData.address?.city}, ${contactData.address?.state} ${contactData.address?.zip}
FEIN: ${contactData.fein}
Website: ${contactData.website}
` : '';

      const marketingInfo = marketingFiles.length > 0 ? `
=== MARKETING MATERIALS (${taskInsuranceType.toUpperCase()}) ===
You have access to ${marketingFiles.length} marketing file(s) for ${taskInsuranceType}:
${marketingFiles.map(f => `- ${f.name}${f.description ? ': ' + f.description : ''}`).join('\n')}

These files contain carrier-specific information, guidelines, underwriting requirements, and marketing materials for ${taskInsuranceType} insurance. Reference these when needed for carrier-specific questions or submission requirements.
` : '';

      const dependencyInfo = dependencyArtifacts.length > 0 ? `
=== DEPENDENCY TASK ARTIFACTS ===
The following artifacts were generated by completed dependency tasks. USE THIS DATA to fill in the current task:

${dependencyArtifacts.map(art => `
--- ${art.taskName} (Task ID: ${art.taskId}) ---
Title: ${art.title || 'Untitled'}
Content:
${art.content}
---
`).join('\n')}

IMPORTANT: The data above comes from prerequisite tasks and contains critical information you MUST use for the current task.
` : '';

      const enhancedContent = `
ENHANCED AI CONTEXT WITH VECTOR SEARCH:

${agencyInfoText}
${contactInfo}
${marketingInfo}
${dependencyInfo}

=== VECTOR SEARCH RESULTS ===
${vectorSearchContent}

=== TRADITIONAL DOCUMENT CONTEXT ===
${basicContext.relevantContent}

=== CONTEXT SUMMARY ===
- Company: ${basicContext.company?.name || 'Unknown'}
- Primary Contact: ${contactData?.primaryContact || 'Not available'}
- Phone: ${contactData?.phone || 'Not available'}
- Email: ${contactData?.email || 'Not available'}
- Traditional documents found: ${basicContext.allDocuments.length}
- Traditional artifacts found: ${basicContext.allArtifacts.length}
- Dependency artifacts: ${dependencyArtifacts.length}
- Completed tasks: ${basicContext.completedTasks.length}
- Marketing files: ${marketingFiles.length} ${taskInsuranceType ? `for ${taskInsuranceType}` : ''}
- Vector search: ${vectorSearchContent.length > 100 ? 'Available with semantic matching' : 'Limited or unavailable'}

This enhanced context combines traditional document retrieval with semantic vector search, dependency task artifacts, and insurance-type-specific marketing materials for better AI understanding of relevant company information.
      `;

      return {
        ...basicContext,
        allArtifacts: [...basicContext.allArtifacts, ...dependencyArtifacts],
        marketingFiles,
        relevantContent: enhancedContent,
        vectorSearchContent
      };
    } catch (error) {
      console.error('Error getting enhanced AI task context:', error);
      // Fallback to basic context if enhanced fails
      const basicContext = await this.getAITaskContext(companyId, taskId);
      return {
        ...basicContext,
        marketingFiles: [],
        vectorSearchContent: 'Error accessing vector search'
      };
    }
  }
}