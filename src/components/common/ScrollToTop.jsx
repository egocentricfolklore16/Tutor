import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component ensures every page navigation starts at the top
 * of the page when navigating between routes, while preserving anchor hash navigation.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Skip scroll resetting when navigating with an anchor hash
    if (hash) return;

    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
  }, [pathname, hash]);

  return null;
}
