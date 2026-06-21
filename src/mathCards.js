const EQUATION_CARD_COLOR = 0x5865f2;
const CODE_FENCE_PATTERN = /(```[\s\S]*?```)/gu;

function isDisplayMath(expression) {
  return String(expression ?? '').trim().length > 0;
}

function isCardWorthyInlineMath(expression) {
  const value = String(expression ?? '').trim();
  if (!value) return false;
  return /(?:=|\\frac|\\sqrt|\\sum|\\int|\\lim|\\approx|\\leq|\\geq|\\neq|\\cdot|\\times|\\nabla)/u.test(value);
}

function makeEmbed(expression, index) {
  return {
    title: `Equation card: Equation ${index}`,
    description: ['```tex', expression.trim(), '```'].join('\n'),
    color: EQUATION_CARD_COLOR
  };
}

function fallbackCard(expression, index) {
  return [`**Equation card: Equation ${index}**`, '```tex', expression.trim(), '```'].join('\n');
}

function appendEmbed(embeds, expression) {
  if (embeds.length >= 10) return undefined;
  const index = embeds.length + 1;
  embeds.push(makeEmbed(expression, index));
  return `Equation ${index}`;
}

function extractFromTextSegment(segment, embeds) {
  let output = segment.replace(/\$\$([\s\S]+?)\$\$/gu, (match, expression) => {
    if (!isDisplayMath(expression)) return match;
    return appendEmbed(embeds, expression) || fallbackCard(expression, embeds.length + 1);
  });

  output = output.replace(/(^|[^\\$])\$([^\n$]+?)\$/gu, (match, prefix, expression) => {
    if (!isCardWorthyInlineMath(expression)) return match;
    const label = appendEmbed(embeds, expression);
    return label ? `${prefix}${label}` : `${prefix}${fallbackCard(expression, embeds.length + 1)}`;
  });

  return output;
}

export function extractMathCards(markdown) {
  const source = String(markdown ?? '');
  if (!source.includes('$')) return { content: source, embeds: [] };

  const embeds = [];
  const content = source
    .split(CODE_FENCE_PATTERN)
    .map((segment) => (segment.startsWith('```') ? segment : extractFromTextSegment(segment, embeds)))
    .join('')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();

  return { content, embeds };
}

export function formatMathCards(markdown) {
  const { content, embeds } = extractMathCards(markdown);
  if (embeds.length === 0) return content;

  const cards = embeds.map((embed) => `**${embed.title}**\n${embed.description}`).join('\n\n');
  return [content, cards].filter(Boolean).join('\n\n');
}
