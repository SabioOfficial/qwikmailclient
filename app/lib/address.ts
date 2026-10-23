export interface Address {
  name: string;
  address: string;
}

function decodeWords(value: string): string {
  return value
    .replace(/(\?=)\s+(=\?)/g, "$1$2")
    .replace(/=\?([\w-]+)\?([bBqQ])\?([^?]*)\?=/g, (match: string, charset: string, encoding: string, text: string) => {
      try {
        const binary = encoding.toUpperCase() === "B" ? atob(text) : text
          .replace(/_/g, " ")
          .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      } catch {
        return match;
      }
    });
}

function stripQuotes(name: string): string {
  const quoted = name.length >= 2 && ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'")));
  return quoted ? name.slice(1, -1).replace(/\\(.)/g, "$1") : name;
}

export function parseAddress(raw: string): Address {
  const text = raw.trim();
  const match = text.match(/^(.*?)\s*<([^<>]+)>\s*$/);

  const address = match ? match[2].trim() : text;
  const name = match ? decodeWords(stripQuotes(match[1].trim())).trim() : "";

  return { name, address };
}

export function parseAddressList(raw: string): Address[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let inAngle = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (ch === "\\" && inQuotes) {
      current += ch + (raw[++i] ?? "");
      continue;
    }
    if (ch === '"') inQuotes = !inQuotes;
    else if (inQuotes && ch === "<") inAngle = true;
    else if (inQuotes && ch === ">") inAngle = false;

    if (ch === "," && !inQuotes && !inAngle) {
      parts.push(current)
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);

  return parts.map(parseAddress).filter((a) => a.name || a.address);
}

export function listLabel(raw: string): string {
  return parseAddressList(raw)
    .map((a) => a.name || a.address)
    .join(", ");
}

export function fullLabel(raw: string): string {
  return parseAddressList(raw)
    .map((a) => (a.name && a.name !== a.address ? `${a.name} <${a.address}>` : a.address))
    .join(", ");
}
