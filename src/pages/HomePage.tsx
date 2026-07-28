import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { convertFileSrc } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { eq } from "drizzle-orm";
import { clothes } from "../../drizzle/schema";
import { db } from "../lib/db";
import { useQueue } from "../context/QueueContext";
import { useWardrobe } from "../context/WardrobeContext";
import {
  getCollectionLinks,
  getEditorialGreeting,
  getRecentItems,
  getWearAgainSuggestion,
  type WardrobeItemSummary,
} from "../lib/editorial";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function HomePage() {
  const { analysisQueue } = useQueue();
  const { activeWardrobeId, activeWardrobeName } = useWardrobe();
  const [items, setItems] = useState<WardrobeItemSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const rows = await db.select().from(clothes).where(eq(clothes.wardrobeId, activeWardrobeId));
        if (!cancelled) {
          setItems(rows as WardrobeItemSummary[]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          setError(`Home dashboard failed to load wardrobe data: ${message}`);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeWardrobeId]);

  const recentItems = useMemo(() => getRecentItems(items, 3), [items]);
  const featuredItem = recentItems[0];
  const suggestion = useMemo(() => getWearAgainSuggestion(items), [items]);
  const collectionLinks = useMemo(() => getCollectionLinks(items), [items]);
  const pendingItems = analysisQueue.filter((item) => item.aiStatus === "PENDING");

  const greeting = useMemo(() => getEditorialGreeting(new Date(), items.length), [items.length]);

  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="home-page"
    >
      <section className="home-hero">
        <div className="home-hero__eyebrow">THREADLY / {activeWardrobeName}</div>
        <div className="home-hero__heading">
          <p className="home-hero__kicker">{greeting.title}</p>
          <h1>{greeting.subtitle}</h1>
        </div>
        <p className="home-hero__lede">
          A quiet magazine cover for the wardrobe you already own. One primary action, one primary story.
        </p>
      </section>

      {error && <div className="page-error">{error}</div>}

      <section className="home-grid">
        <article className="home-feature card">
          <div className="home-section__label">Recently Added</div>
          {featuredItem ? (
            <Link to={`/wardrobe/${featuredItem.id}`} className="home-feature__body">
              <div className="home-feature__image">
                <img
                  src={convertFileSrc(featuredItem.imageProcessed || featuredItem.imageThumbnail || featuredItem.imageOriginal || "")}
                  alt={featuredItem.nickname || "Clothing item"}
                />
              </div>
              <div className="home-feature__content">
                <p className="home-feature__title">{featuredItem.nickname || "Editorial Piece"}</p>
                <p className="home-feature__meta">
                  {featuredItem.type || "Unclassified"} · {featuredItem.primaryColor || "Neutral"}
                </p>
                <p className="home-feature__note">
                  {featuredItem.material || "Unknown material"} · {featuredItem.formality || "everyday"}
                </p>
              </div>
            </Link>
          ) : (
            <div className="empty-state empty-state--compact">
              <h3>No garments yet</h3>
              <p>Add your first piece to start building the cover story.</p>
            </div>
          )}
        </article>

        <aside className="home-aside">
          <article className="home-panel card">
            <div className="home-section__label">Wear Again</div>
            {suggestion ? (
              <>
                <p className="home-panel__title">{suggestion.title}</p>
                <p className="home-panel__subtle">{suggestion.subtitle}</p>
                <p className="home-panel__note">{suggestion.reason}</p>
              </>
            ) : (
              <p className="home-panel__note">No suggestion yet. Add more items to unlock a smarter pairing.</p>
            )}
          </article>

          <article className="home-panel card">
            <div className="home-section__label">Collections</div>
            <div className="home-links">
              {collectionLinks.map((link) => (
                <Link key={link.label} to="/wardrobe" className="home-link">
                  <span>{link.label}</span>
                  <span className="home-link__meta">{link.count}</span>
                </Link>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="home-recent">
        <div className="home-section__label">Selected Pages</div>
        <div className="home-recent__row">
          {recentItems.map((item) => (
            <Link key={item.id} to={`/wardrobe/${item.id}`} className="home-recent__card card">
              <div className="home-recent__thumb">
                <img src={convertFileSrc(item.imageThumbnail || item.imageProcessed || item.imageOriginal || "")} alt={item.nickname || "Clothing item"} />
              </div>
              <div className="home-recent__meta">
                <p>{item.nickname || "Untitled piece"}</p>
                <span>{item.type || "Unclassified"}</span>
              </div>
            </Link>
          ))}
          {recentItems.length === 0 && <div className="home-recent__empty">Nothing recent to show.</div>}
        </div>
      </section>

      {pendingItems.length > 0 && (
        <section className="home-pending">
          <div className="home-section__label">Pending Analysis</div>
          <ul className="home-pending__list">
            {pendingItems.slice(0, 5).map((item) => (
              <li key={`${item.id}-${item.aiStatus}`}>{item.nickname || `Item ${item.id}`} is waiting for analysis.</li>
            ))}
          </ul>
        </section>
      )}
    </motion.main>
  );
}
