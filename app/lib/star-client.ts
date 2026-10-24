export async function sendStar(id: string, starred: boolean): Promise<string | null> {
  try {
    const res = await fetch("/api/star", {
      method: "POST",
      body: new URLSearchParams({ id, starred: String(starred) }),
    });
    if (res.ok) return null;

    const body = (await res.json()) as { error?: string }
    return body.error ?? "Could not update favorite.";
  } catch {
    return "Could not update favorite.";
  }
}
