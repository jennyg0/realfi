import { NextResponse } from "next/server";
import { db } from "@/db";
import { dcaSchedules, deposits, profiles } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { calculateNextExecution, shouldExecuteDCA } from "@/lib/dca";

/**
 * Execute pending DCA schedules
 * This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, or external service)
 *
 * Security: Add authentication with a secret token in production
 * Example: Authorization: Bearer YOUR_CRON_SECRET
 */
export async function POST() {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Get all active DCA schedules that are due for execution
    const dueSchedules = await db
      .select()
      .from(dcaSchedules)
      .where(
        and(
          eq(dcaSchedules.isActive, true),
          lte(dcaSchedules.nextExecutionAt, now)
        )
      );

    console.log(
      `[DCA Executor] Found ${dueSchedules.length} schedules to process`
    );

    const results = {
      processed: 0,
      executed: 0,
      skipped: 0,
      completed: 0,
      errors: [] as string[],
    };

    for (const schedule of dueSchedules) {
      results.processed++;

      try {
        // Double-check if should execute (including end date)
        if (
          !shouldExecuteDCA(
            schedule.nextExecutionAt,
            schedule.endDate,
            schedule.isActive
          )
        ) {
          results.skipped++;

          // If past end date, deactivate the schedule
          if (schedule.endDate && now > schedule.endDate) {
            await db
              .update(dcaSchedules)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(dcaSchedules.id, schedule.id));
            results.completed++;
          }

          continue;
        }

        // Get profile for this schedule
        const [profile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.id, schedule.profileId));

        if (!profile) {
          results.errors.push(`Profile not found for schedule ${schedule.id}`);
          continue;
        }

        // Create a pending deposit
        // This deposit will be picked up by a separate process that executes the actual blockchain transaction
        const [deposit] = await db
          .insert(deposits)
          .values({
            profileId: schedule.profileId,
            strategyKey: schedule.protocolKey,
            amount: schedule.amount,
            txHash: null,
            status: "pending",
          })
          .returning();

        console.log(
          `[DCA Executor] Created pending deposit ${deposit.id} for schedule ${schedule.id}`
        );

        // Calculate next execution time
        const nextExecution = calculateNextExecution(now, schedule.frequency);

        // Update schedule
        await db
          .update(dcaSchedules)
          .set({
            lastExecutedAt: now,
            nextExecutionAt: nextExecution,
            updatedAt: now,
          })
          .where(eq(dcaSchedules.id, schedule.id));

        results.executed++;

        console.log(
          `[DCA Executor] Schedule ${
            schedule.id
          } executed, next run: ${nextExecution.toISOString()}`
        );
      } catch (error) {
        console.error(
          `[DCA Executor] Error processing schedule ${schedule.id}:`,
          error
        );
        results.errors.push(
          `Schedule ${schedule.id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    console.log(`[DCA Executor] Completed. Results:`, results);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("[DCA Executor] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check status (useful for monitoring)
 */
export async function GET() {
  try {
    const now = new Date();

    // Get counts of different schedule states
    const allSchedules = await db.select().from(dcaSchedules);

    const active = allSchedules.filter((s) => s.isActive).length;
    const paused = allSchedules.filter((s) => !s.isActive).length;
    const dueNow = allSchedules.filter(
      (s) => s.isActive && s.nextExecutionAt <= now
    ).length;

    return NextResponse.json({
      timestamp: now.toISOString(),
      schedules: {
        total: allSchedules.length,
        active,
        paused,
        dueNow,
      },
    });
  } catch (error) {
    console.error("[DCA Executor] Error getting status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
