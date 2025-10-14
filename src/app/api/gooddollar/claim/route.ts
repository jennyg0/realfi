import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { goodDollarClaims, profiles, xpEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, amount, txHash, network } = body;

    if (!privyId || !amount || !network) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.privyId, privyId))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Record the claim
    const [claim] = await db
      .insert(goodDollarClaims)
      .values({
        profileId: profile.id,
        amount,
        txHash,
        network,
      })
      .returning();

    // Award XP for claiming UBI (10 XP per claim)
    await db.insert(xpEvents).values({
      profileId: profile.id,
      type: 'gooddollar_claim',
      amount: 10,
      metadata: JSON.stringify({ claimId: claim.id, network }),
    });

    return NextResponse.json({
      success: true,
      claim,
      xpAwarded: 10,
    });
  } catch (error) {
    console.error('Error recording GoodDollar claim:', error);
    return NextResponse.json(
      { error: 'Failed to record claim' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const privyId = searchParams.get('privyId');

    if (!privyId) {
      return NextResponse.json(
        { error: 'Missing privyId' },
        { status: 400 }
      );
    }

    // Get profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.privyId, privyId))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get all claims for this profile
    const claims = await db
      .select()
      .from(goodDollarClaims)
      .where(eq(goodDollarClaims.profileId, profile.id))
      .orderBy(goodDollarClaims.claimedAt);

    // Calculate total claimed
    const totalClaimed = claims.reduce((sum, claim) => {
      return sum + BigInt(claim.amount);
    }, 0n);

    return NextResponse.json({
      claims,
      totalClaimed: totalClaimed.toString(),
      claimCount: claims.length,
    });
  } catch (error) {
    console.error('Error fetching GoodDollar claims:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}
