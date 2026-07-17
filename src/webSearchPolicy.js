const FRESHNESS_PATTERN =
  /\b(?:latest|current(?:ly)?|today|tonight|tomorrow|yesterday|recent|news|weather|forecast|score|standings|schedule|price|stock|exchange rate|release date|version|updated?|this (?:week|month|year))\b/iu;
const LOOKUP_PATTERN =
  /\b(?:search(?: the web)?|browse|look (?:it |this )?up|find (?:a )?(?:source|link|website)|cite|citation|source|url)\b/iu;

export function shouldUseWebSearch(content) {
  const text = String(content ?? '').trim();
  return text.length > 0 && (FRESHNESS_PATTERN.test(text) || LOOKUP_PATTERN.test(text));
}
