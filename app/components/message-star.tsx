import { useState } from "react";
import { sendStar } from "~/lib/star-client";
import { StarButton } from "./star-button";

export function MessageStar({ id, starred: initial }: { id: string; starred: boolean }) {
  const [starred, setStarred] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !starred;
    setStarred(next);
    setError(null);

    const failure = await sendStar(id, next);
    if (failure) {
      setStarred(!next);
      setError(failure);
    }
  }

  return (
    <>
      <StarButton starred={starred} onToggle={toggle} />
      {error ? <span className="error">{error}</span> : null}
    </>
  )
}
