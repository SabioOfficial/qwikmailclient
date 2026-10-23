import { useEffect, useState, type CSSProperties } from "react";
import { parseAddressList } from "~/lib/address";

async function sha256Hex(value: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function initialsOf(name: string, address: string): string {
  const words = name ? name.split(/\s+/).filter(Boolean) : (address.split("@")[0] ?? "").split(/[._+-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return (first + last).toUpperCase();
}

function hueOf(value: string): number {
  let hue = 0;
  for (const ch of value.toLowerCase()) {
    hue = (hue * 31 + (ch.codePointAt(0) ?? 0)) % 360;
  }
  return hue;
}

export function SenderAvatar({ value }: { value: string }) {
  const { name, address } = parseAddressList(value)[0] ?? { name: "", address: "" };
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);

    if (address) {
      sha256Hex(address.trim().toLowerCase()).then((hash) => {
        if (!cancelled && hash) {
          setSrc(`https://gravatar.com/avatar/${hash}?s=80&d=404`);
        }
      });
    }

    return () => {
      cancelled = true;
    }
  }, [address]);

  return (
    <span
      className="avatar"
      style={{ "--avatar-hue": hueOf(address || name) } as CSSProperties}
      aria-hidden="true"
    >
      {initialsOf(name, address)}
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  )
}
