import React from "react";

/**
 * Standardized PageContainer component providing responsive padding,
 * max-width constraints, and bottom-padding for mobile bottom navigation clearance.
 */
export function PageContainer({ children, className = "", maxWidth = "max-w-7xl" }) {
  return (
    <main className={`mx-auto w-full ${maxWidth} px-4 py-4 sm:px-6 md:py-6 lg:px-8 pb-28 md:pb-8 transition-colors ${className}`}>
      {children}
    </main>
  );
}

export default PageContainer;
