import type { RefObject } from "react";

interface ListFooterProperties {
  sentinelRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

export function ListFooter({ sentinelRef, loading, error, retry }: ListFooterProperties) {
  return (
    <div ref={sentinelRef} className="list-footer" aria-live="polite">
      {error ? (
        <>
          Couldn't load more messages.{" "}
          <button type="button" className="link-button" onClick={retry}>
            Try again
          </button>
        </>
      ) : loading ? (
        "Loading more..."
      ) : null}
    </div>
  );
}
