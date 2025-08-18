import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysAhead = parseInt(searchParams.get('days') || '30', 10);
    
    const renewals = await DataService.getUpcomingRenewals(daysAhead);
    return NextResponse.json(renewals);
  } catch (error) {
    console.error('Error fetching renewals:', error);
    return NextResponse.json({ error: 'Failed to fetch renewals' }, { status: 500 });
  }
}