import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useWardrobe } from "../context/WardrobeContext";
import { searchClothes, type SearchResultRow } from "../lib/db";
import { extractSearchTerms } from "../lib/search";
import { splitHighlightedText } from "../lib/editorial";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function SearchPage() {
  const navigate = useNavigate();
  const { activeWardrobeId } = useWardrobe();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResultRow[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadResults() {
      try {
        setIsLoading(true);
        setLoadingError(null);
        const rows = await searchClothes(activeWardrobeId, debouncedQuery);
        if (!cancelled) {
          setResults(rows);
          setSelectedIndex(0);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          setLoadingError(`Spotlight search failed: ${message}`);
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [activeWardrobeId, debouncedQuery]);

  const highlightedTerms = useMemo(() => extractSearchTerms(debouncedQuery), [debouncedQuery]);

  const handleOpenSelected = (index = selectedIndex) => {
    const item = results[index];
    if (item) {
      navigate(`/wardrobe/${item.id}`);
    }
  };

  return (
    <motion.main className="search-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="search-page__panel card">
        <div className="search-page__eyebrow">SPOTLIGHT SEARCH</div>
        <h1>Search the wardrobe</h1>
        <p>Type a natural query. The spotlight expands it with garment synonyms and index terms.</p>

        <input
          className="input search-page__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="black top, office shirt, winter coat..."
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSelectedIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setSelectedIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              handleOpenSelected();
            }
          }}
        />

        <div className="search-page__status">
          {isLoading ? "Searching editorial archive..." : `${results.length} result${results.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {loadingError && <div className="page-error">{loadingError}</div>}

      <section className="search-results">
        <AnimatePresence mode="popLayout">
          {results.map((item, index) => {
            const imageSource = item.imageThumbnail || item.imageProcessed || item.imageOriginal || "";
            const isSelected = index === selectedIndex;
            const matchedTerms = highlightedTerms.length > 0 ? highlightedTerms : query.split(/\s+/).filter(Boolean);

            return (
              <motion.button
                key={item.id}
                layout
                type="button"
                className={isSelected ? "search-result search-result--active card" : "search-result card"}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => handleOpenSelected(index)}
              >
                <div className="search-result__thumb">
                  <img src={convertFileSrc(imageSource)} alt={item.nickname || "Wardrobe item"} />
                </div>
                <div className="search-result__body">
                  <p className="search-result__title">
                    {splitHighlightedText(item.nickname || "Untitled piece", matchedTerms).map((part, partIndex) =>
                      part.highlighted ? <mark key={partIndex}>{part.text}</mark> : <span key={partIndex}>{part.text}</span>
                    )}
                  </p>
                  <div className="search-result__meta">
                    {[item.type, item.primaryColor, item.formality].filter(Boolean).join(" · ")}
                  </div>
                  <div className="search-result__excerpt">
                    {splitHighlightedText(
                      [item.pattern, item.material, item.fit, item.weatherSuitability?.replace("-", " "), item.tagsText]
                        .filter(Boolean)
                        .join(" · "),
                      matchedTerms
                    ).map((part, partIndex) =>
                      part.highlighted ? <mark key={partIndex}>{part.text}</mark> : <span key={partIndex}>{part.text}</span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {results.length === 0 && !loadingError && (
          <div className="search-results__empty">
            {query.trim() ? "No garments matched the spotlight." : "Start typing to search by color, type, or occasion."}
          </div>
        )}
      </section>
    </motion.main>
  );
}
