import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, PublicClient, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { EngagementRewardsSDK, REWARDS_CONTRACT } from '@goodsdks/engagement-sdk';

// App configuration - MUST be set in environment variables
const APP_PRIVATE_KEY = process.env.GOODDOLLAR_APP_PRIVATE_KEY as `0x${string}`;
const APP_ADDRESS = process.env.GOODDOLLAR_APP_ADDRESS as `0x${string}`;

// Validate environment variables
if (!APP_PRIVATE_KEY) {
  console.error('GOODDOLLAR_APP_PRIVATE_KEY is not set in environment variables');
}

if (!APP_ADDRESS) {
  console.error('GOODDOLLAR_APP_ADDRESS is not set in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!APP_PRIVATE_KEY || !APP_ADDRESS) {
      return NextResponse.json(
        {
          error: 'Server configuration error: Missing GoodDollar app credentials',
          details: 'Please set GOODDOLLAR_APP_PRIVATE_KEY and GOODDOLLAR_APP_ADDRESS in environment variables'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { user, validUntilBlock, inviter } = body;

    // Validate required fields
    if (!user || !validUntilBlock) {
      return NextResponse.json(
        { error: 'Missing required fields: user and validUntilBlock are required' },
        { status: 400 }
      );
    }

    // Validate user address format
    if (!user.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid user address format' },
        { status: 400 }
      );
    }

    console.log('Signing engagement claim for:', {
      app: APP_ADDRESS,
      user,
      inviter,
      validUntilBlock,
    });

    // Initialize viem clients
    const account = privateKeyToAccount(APP_PRIVATE_KEY);
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(),
    });
    const walletClient = createWalletClient({
      chain: celo,
      transport: http(),
      account,
    });

    // Initialize engagement rewards SDK
    const engagementRewards = new EngagementRewardsSDK(
      publicClient as unknown as PublicClient,
      walletClient as unknown as WalletClient,
      REWARDS_CONTRACT
    );

    // Prepare signature data
    const { domain, types, message } = await engagementRewards.prepareAppSignature(
      APP_ADDRESS,
      user as `0x${string}`,
      BigInt(validUntilBlock)
    );

    // Sign the data
    const signature = await walletClient.signTypedData({
      domain,
      types,
      primaryType: 'AppClaim',
      message,
    });

    console.log('Signature generated successfully');

    // TODO: Log signature request for auditing
    // await logSignatureRequest({ app: APP_ADDRESS, user, inviter, validUntilBlock, signature });

    return NextResponse.json({
      success: true,
      signature,
    });
  } catch (error) {
    console.error('Error signing engagement claim:', error);
    return NextResponse.json(
      {
        error: 'Failed to sign claim',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
