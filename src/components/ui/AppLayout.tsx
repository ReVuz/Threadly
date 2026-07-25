import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWardrobe } from "../../context/WardrobeContext";

const NAV_ITEMS = [
  { path: "/home", label: "Home", icon: HomeIcon },
  { path: "/wardrobe", label: "Wardrobe", icon: WardrobeIcon },
  { path: "/outfits", label: "Outfits", icon: OutfitsIcon },
  { path: "/discover", label: "Discover", icon: DiscoverIcon },
  { path: "/wishlist", label: "Wishlist", icon: WishlistIcon },
  { path: "/search", label: "Search", icon: SearchIcon },
];

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function Sidebar() {
  const location = useLocation();
  const { activeWardrobeId, activeWardrobeName, wardrobesList, setActiveWardrobeId, createWardrobe } = useWardrobe();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = async () => {
    const name = prompt("Enter a name for your new wardrobe collection:");
    if (name && name.trim()) {
      await createWardrobe(name.trim());
      setIsOpen(false);
    }
  };

  return (
    <nav className="sidebar">
      {/* Logo & Switcher */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
        ref={dropdownRef}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.625rem",
            fontWeight: 500,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Threadly
        </h1>
        
        {/* Switcher Dropdown */}
        <div style={{ position: "relative", marginTop: 8 }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              marginLeft: -8,
              borderRadius: 6,
              outline: "none",
              width: "100%",
              textAlign: "left",
              transition: "background var(--duration-fast) var(--ease-out)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface-raised)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.725rem",
                color: "var(--text-secondary)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: 500,
              }}
            >
              {activeWardrobeName}
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-tertiary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform var(--duration-base) var(--ease-out)",
                flexShrink: 0,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: -8,
                  zIndex: 50,
                  width: "calc(100% + 16px)",
                  background: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  boxShadow: "var(--shadow-md)",
                  marginTop: 4,
                  overflow: "hidden",
                  padding: "4px 0",
                }}
              >
                <div style={{ maxHeight: 180, overflowY: "auto" }}>
                  {wardrobesList.map((w) => {
                    const isSelected = w.id === activeWardrobeId;
                    return (
                      <button
                        key={w.id}
                        onClick={() => {
                          setActiveWardrobeId(w.id);
                          setIsOpen(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: isSelected ? "var(--surface-raised)" : "transparent",
                          border: "none",
                          padding: "8px 12px",
                          fontFamily: "var(--font-body)",
                          fontSize: "0.8125rem",
                          color: isSelected ? "var(--primary)" : "var(--text-secondary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 100ms ease-out",
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "var(--surface-raised)";
                            e.currentTarget.style.color = "var(--text)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--text-secondary)";
                          }
                        }}
                      >
                        <span style={{ fontWeight: isSelected ? 500 : 400 }}>{w.name}</span>
                        {isSelected && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div
                  style={{
                    borderTop: "1px solid var(--border-subtle)",
                    marginTop: 4,
                    paddingTop: 4,
                  }}
                >
                  <button
                    onClick={handleCreate}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      padding: "8px 12px",
                      fontFamily: "var(--font-body)",
                      fontSize: "0.8125rem",
                      color: "var(--accent)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-raised)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>New Collection</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <NavLink key={path} to={path} style={{ textDecoration: "none", display: "block" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  marginBottom: 2,
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? "var(--primary)" : "var(--text-secondary)",
                  background: isActive ? "rgba(17, 34, 80, 0.06)" : "transparent",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 120ms ease-out",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 20,
                      borderRadius: "0 2px 2px 0",
                      background: "var(--accent)",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon size={17} active={isActive} />
                <span>{label}</span>
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* Settings at bottom */}
      <div style={{ padding: "10px 10px 16px", borderTop: "1px solid var(--border-subtle)" }}>
        <NavLink to="/settings" style={{ textDecoration: "none", display: "block" }}>
          {({ isActive }) => (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                fontFamily: "var(--font-body)",
                fontSize: "0.875rem",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                background: isActive ? "rgba(17, 34, 80, 0.06)" : "transparent",
                cursor: "pointer",
                transition: "all 120ms ease-out",
              }}
            >
              <SettingsIcon size={17} active={isActive} />
              <span>Settings</span>
            </div>
          )}
        </NavLink>
      </div>
    </nav>
  );
}

// ─── Icon Components (inline SVG, no deps) ───────────────

interface IconProps {
  size?: number;
  active?: boolean;
}

function HomeIcon({ size = 18, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--primary)" : "currentColor"}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function WardrobeIcon({ size = 18, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--primary)" : "currentColor"}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8a2 2 0 0 0-2 2v1h4v-1a2 2 0 0 0-2-2z" />
      <line x1="12" y1="11" x2="12" y2="16" />
    </svg>
  );
}

function OutfitsIcon({ size = 18, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--primary)" : "currentColor"}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  );
}

function DiscoverIcon({ size = 18, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--primary)" : "currentColor"}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function WishlistIcon({ size = 18, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={active ? "var(--accent-light)" : "none"}
      stroke={active ? "var(--accent)" : "currentColor"}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function SearchIcon({ size = 18, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--primary)" : "currentColor"}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SettingsIcon({ size = 18, active }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "var(--primary)" : "currentColor"}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
