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
}