import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import type { Task, CompanyTask } from './types';
import { tasks as defaultTasks } from './data';

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
      let q = query(tasksRef, orderBy('renewalDate', 'asc'));
      
      if (companyId) {
        q = query(tasksRef, where('companyId', '==', companyId), orderBy('renewalDate', 'asc'));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CompanyTask));
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
      
      completedTasks.forEach(task => {
        if (task.documents) allDocuments.push(...task.documents);
        if (task.artifacts) allArtifacts.push(...task.artifacts);
      });
      
      // Create a summary of relevant content
      const relevantContent = `
COMPANY INFORMATION:
- Name: ${company?.name || 'Unknown'}
- Description: ${company?.description || 'No description available'}
- Website: ${company?.website || 'No website provided'}

COMPLETED TASKS SUMMARY:
${completedTasks.map(task => `- ${task.taskName} (${task.phase}): ${task.documents.length} documents, ${task.artifacts.length} artifacts`).join('\n')}

AVAILABLE DOCUMENTS:
${allDocuments.map((doc, i) => `${i + 1}. ${doc.filename || `Document ${i + 1}`}: ${doc.content?.substring(0, 200)}...`).join('\n')}

AVAILABLE ARTIFACTS:
${allArtifacts.map((artifact, i) => `${i + 1}. From ${artifact.taskName}: ${artifact.content.substring(0, 300)}...`).join('\n')}
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
}