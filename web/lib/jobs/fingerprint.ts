// djb2 hash — fast, no crypto needed, works in all environments including Edge Runtime
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // convert to unsigned 32-bit integer
  }
  return hash.toString(36);
}

export function fingerprint(company: string, title: string, location: string): string {
  const normalized = [company, title, location]
    .map((s) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "")
    )
    .join("|");
  return djb2(normalized);
}
