export function withBasePath(assetPath, baseUrl = import.meta.env?.BASE_URL ?? "/") {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedAsset = assetPath.replace(/^\.?(?:\/)+/, "");
  const formalAsset = /^(?:portraits|stories)\//.test(normalizedAsset)
    ? `images/bible-character-map/${normalizedAsset}`
    : normalizedAsset;
  return `${normalizedBase}${formalAsset}`;
}
