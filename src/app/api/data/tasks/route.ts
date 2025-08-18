import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const phase = searchParams.get('phase');
    const status = searchParams.get('status');
    const aiOnly = searchParams.get('aiOnly') === 'true';
    const search = searchParams.get('search');
    const type = searchParams.get('type'); // 'templates' or 'company' (default)
    
    if (type === 'templates') {
      const templates = await DataService.getTaskTemplates();
      return NextResponse.json(templates);
    }
    
    if (search) {
      const tasks = await DataService.searchTasks(search, companyId || undefined);
      return NextResponse.json(tasks);
    }
    
    if (phase) {
      const tasks = await DataService.getTasksByPhase(phase, companyId || undefined);
      return NextResponse.json(tasks);
    }
    
    if (status) {
      const tasks = await DataService.getTasksByStatus(status, companyId || undefined);
      return NextResponse.json(tasks);
    }
    
    if (aiOnly) {
      const tasks = await DataService.getAITasks(companyId || undefined);
      return NextResponse.json(tasks);
    }
    
    const tasks = await DataService.getCompanyTasks(companyId || undefined);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}