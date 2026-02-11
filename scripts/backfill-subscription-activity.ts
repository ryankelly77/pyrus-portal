import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";

async function backfill() {
  console.log("Starting backfill...");

  const results = {
    subscriptionsProcessed: 0,
    activitiesCreated: 0,
    errors: [] as string[],
  };

  const subscriptions = await prisma.subscriptions.findMany({
    include: {
      client: { select: { id: true, name: true } },
      subscription_history: { orderBy: { created_at: "asc" } }
    }
  });

  console.log(`Found ${subscriptions.length} subscriptions`);

  for (const subscription of subscriptions) {
    if (!subscription.client_id || !subscription.stripe_subscription_id) continue;

    results.subscriptionsProcessed++;

    try {
      // Check for existing activity_log entries
      const existingActivities = await prisma.activity_log.findMany({
        where: {
          client_id: subscription.client_id,
          activity_type: { in: ["purchase", "payment"] },
        }
      });

      // Check if we already have a purchase activity for this subscription
      const hasPurchaseActivity = existingActivities.some(a => {
        const desc = a.description?.toLowerCase() || "";
        return desc.includes("purchased") || desc.includes("subscription");
      });

      // Create activity for subscription if not exists
      if (subscription.created_at && !hasPurchaseActivity) {
        await prisma.activity_log.create({
          data: {
            client_id: subscription.client_id,
            activity_type: "purchase",
            description: `Subscription started${subscription.client?.name ? ` for ${subscription.client.name}` : ""}`,
            metadata: {
              subscriptionId: subscription.stripe_subscription_id,
              action: "created",
              status: subscription.status,
              backfilled: true,
            },
            created_at: subscription.created_at,
          }
        });
        results.activitiesCreated++;
        console.log(`Created activity for ${subscription.client?.name || subscription.client_id}`);
      }

      // Process subscription history entries
      for (const history of subscription.subscription_history) {
        let description = history.details || "";

        switch (history.action) {
          case "created": description = description || "Subscription initiated"; break;
          case "activated": description = description || "Subscription activated"; break;
          case "canceled": description = description || "Subscription canceled"; break;
          default: description = description || `Subscription ${history.action}`;
        }

        // Check if already exists
        const exists = existingActivities.some(a => {
          const meta = a.metadata as Record<string, any> | null;
          return meta?.historyId === history.id;
        });

        if (!exists) {
          await prisma.activity_log.create({
            data: {
              client_id: subscription.client_id,
              activity_type: "purchase",
              description,
              metadata: {
                subscriptionId: subscription.stripe_subscription_id,
                historyId: history.id,
                action: history.action,
                backfilled: true,
              },
              created_at: history.created_at || new Date(),
            }
          });
          results.activitiesCreated++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`${subscription.id}: ${msg}`);
    }
  }

  console.log("\nBackfill complete!");
  console.log(`Subscriptions processed: ${results.subscriptionsProcessed}`);
  console.log(`Activities created: ${results.activitiesCreated}`);
  if (results.errors.length > 0) {
    console.log(`Errors: ${results.errors.length}`);
    results.errors.forEach(e => console.log(`  - ${e}`));
  }

  await prisma.$disconnect();
}

backfill().catch(console.error);
