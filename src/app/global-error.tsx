"use client";

/**
 * Last-resort error boundary: replaces the root layout entirely,
 * so it must render its own <html> and <body> without app styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fafaf9",
          color: "#1c1917",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
          Something went seriously wrong
        </h1>
        <p style={{ color: "#78716c", maxWidth: "28rem" }}>
          A critical error prevented the page from loading.
          {error.digest ? ` (Error ID: ${error.digest})` : ""}
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "1.5rem",
            padding: "0.6rem 1.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#ea580c",
            color: "white",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
