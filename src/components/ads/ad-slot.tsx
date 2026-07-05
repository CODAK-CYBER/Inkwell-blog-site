import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPremiumAccess } from "@/lib/monetization";

/**
 * Renders one active ad for a placement, weighted-random rotation.
 * Premium members (and staff) never see ads. Impressions are counted
 * server-side; clicks route through /api/ads/click for tracking.
 */
export async function AdSlot({ placement }: { placement: "home_banner" | "article_bottom" }) {
  const session = await getServerSession();
  if (session && (await hasPremiumAccess(session.user.id, session.user.role))) {
    return null; // ad-free for premium
  }

  const now = new Date();
  const ads = await prisma.ad.findMany({
    where: {
      placement,
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
  });
  if (ads.length === 0) return null;

  // Weighted random rotation
  const totalWeight = ads.reduce((sum, ad) => sum + ad.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = ads[0];
  for (const ad of ads) {
    roll -= ad.weight;
    if (roll <= 0) {
      chosen = ad;
      break;
    }
  }

  prisma.ad
    .update({ where: { id: chosen.id }, data: { impressions: { increment: 1 } } })
    .catch(() => {});

  const inner = chosen.html ? (
    <div dangerouslySetInnerHTML={{ __html: chosen.html }} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={chosen.imageUrl!}
      alt={chosen.name}
      className={placement === "home_banner" ? "mx-auto max-h-28 w-auto" : "mx-auto max-h-60 w-auto"}
    />
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-4">
      <p className="mb-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        Advertisement
      </p>
      <div className="overflow-hidden rounded-lg border bg-card p-2 text-center">
        {chosen.targetUrl ? (
          <a href={`/api/ads/click/${chosen.id}`} target="_blank" rel="noopener sponsored">
            {inner}
          </a>
        ) : (
          inner
        )}
      </div>
    </div>
  );
}
