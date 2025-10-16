import { db } from "../src/db";
import { profiles, dcaSchedules } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function addTestDCA() {
  try {
    // Get first profile
    const [profile] = await db.select().from(profiles).limit(1);

    if (!profile) {
      console.log("No profiles found. Create a profile first by logging in.");
      process.exit(1);
    }

    console.log(`Found profile: ${profile.displayName || profile.privyId}`);

    // Add test DCA schedule
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [schedule] = await db.insert(dcaSchedules).values({
      profileId: profile.id,
      protocolKey: "aave-v3-usdc",
      amount: 5000, // $50.00
      frequency: "weekly",
      startDate: now,
      endDate: null, // indefinite
      isActive: true,
      lastExecutedAt: null,
      nextExecutionAt: nextWeek,
    }).returning();

    console.log("✅ Added test DCA schedule:");
    console.log(`  Protocol: aave-v3-usdc`);
    console.log(`  Amount: $50.00`);
    console.log(`  Frequency: weekly`);
    console.log(`  Next execution: ${nextWeek.toLocaleString()}`);

  } catch (error) {
    console.error("Error adding test DCA:", error);
    process.exit(1);
  }

  process.exit(0);
}

addTestDCA();
