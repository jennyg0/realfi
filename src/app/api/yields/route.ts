import { NextResponse } from 'next/server';
import { fetchBaseYields, getYieldsByRisk, getTopYields } from '@/lib/yields';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const risk = searchParams.get('risk') as 'Conservative' | 'Balanced' | 'Aggressive' | null;
    const limit = searchParams.get('limit');
    const all = searchParams.get('all'); // New param to get all yields

    let yields;

    if (all === 'true') {
      yields = await fetchBaseYields(); // Get all filtered yields
    } else if (risk) {
      yields = await getYieldsByRisk(risk);
    } else if (limit) {
      yields = await getTopYields(parseInt(limit));
    } else {
      yields = await getTopYields(10); // Default to top 10
    }

    return NextResponse.json(yields);
  } catch (error) {
    console.error('Error in yields API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch yields' },
      { status: 500 }
    );
  }
}
