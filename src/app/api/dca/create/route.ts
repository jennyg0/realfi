import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dcaSchedules, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDepositableYields } from '@/lib/yields';

// Calculate next execution time based on frequency
function calculateNextExecution(startDate: Date, frequency: string): Date {
  const next = new Date(startDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      throw new Error('Invalid frequency');
  }

  return next;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, protocolKey, amount, frequency, startDate, endDate } = body;

    if (!privyId || !protocolKey || !amount || !frequency) {
      return NextResponse.json(
        { error: 'Missing required fields: privyId, protocolKey, amount, frequency' },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Frequency must be one of: daily, weekly, biweekly, monthly' },
        { status: 400 }
      );
    }

    // Validate amount (minimum $10 per execution)
    if (amount < 1000) {
      return NextResponse.json(
        { error: 'Minimum DCA amount is $10 per execution' },
        { status: 400 }
      );
    }

    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.privyId, privyId));

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify protocol is supported
    const yields = await getDepositableYields();
    const targetYield = yields.find(y => y.key === protocolKey);

    if (!targetYield) {
      return NextResponse.json(
        { error: 'Protocol not supported or unavailable' },
        { status: 400 }
      );
    }

    // Parse dates
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : null;

    // Validate date range
    if (end && end <= start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Calculate next execution
    const nextExecution = calculateNextExecution(start, frequency);

    // Create DCA schedule
    const [schedule] = await db
      .insert(dcaSchedules)
      .values({
        profileId: profile.id,
        protocolKey,
        amount,
        frequency,
        startDate: start,
        endDate: end,
        isActive: true,
        lastExecutedAt: null,
        nextExecutionAt: nextExecution,
      })
      .returning();

    return NextResponse.json({
      success: true,
      schedule: {
        ...schedule,
        protocol: {
          name: targetYield.protocol,
          asset: targetYield.asset,
          apy: targetYield.estApr,
          risk: targetYield.risk,
        },
      },
    });
  } catch (error) {
    console.error('Error creating DCA schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
