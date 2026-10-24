export function StarButton({ starred, onToggle }: { starred: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`star${starred ? " starred" : ""}`}
      aria-pressed={starred}
      aria-label={starred ? "Remove from favorites" : "Add to favorites"}
      title={starred ? "Remove from favorites" : "Add to favorites"}
      onClick={onToggle}
    >
      {starred ? "★" : "☆"}
    </button>
  )
}
