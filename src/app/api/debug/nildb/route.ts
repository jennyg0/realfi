import { NextResponse } from "next/server";
import { getStoredState } from "@/lib/chat/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const state = getStoredState(userId);

  return NextResponse.json({
    userId,
    consentGranted: state?.consentGranted,
    nillionRecordId: state?.nillionRecordId,
    profile: state?.profile,
    goal: state?.goal,
    lastUpdated: state?.lastUpdated,
  });
}
