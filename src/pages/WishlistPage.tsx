import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function WishlistPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ padding: "48px 48px", minHeight: "100%" }}
    >
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginBottom: 8 }}>
        Wishlist
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
        Coming soon — Phase implementation pending.
      </p>
    </motion.div>
  );
}
