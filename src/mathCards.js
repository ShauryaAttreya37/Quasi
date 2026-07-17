import { renderLatexToPng } from './latexRender.js';

const EQUATION_CARD_COLOR = 0x5865f2;
const CODE_FENCE_PATTERN = /(```[\s\S]*?```)/gu;
const FENCED_BLOCK_PATTERN = /```([^\n`]*)\n([\s\S]*?)```/gu;

function isDisplayMath(expression) {
  return String(expression ?? '').trim().length > 0;
}

function isCardWorthyInlineMath(expression) {
  const value = String(expression ?? '').trim();
  if (!value) return false;
  return /(?:=|\\frac|\\sqrt|\\sum|\\int|\\lim|\\approx|\\leq|\\geq|\\neq|\\cdot|\\times|\\nabla)/u.test(value);
}

function looksLikeLatex(expression) {
  return /\\(?:begin|end|frac|dfrac|tfrac|partial|vec|mathbf|mathrm|text|nabla|rho|mu|sigma|tau|lambda|sum|int|sqrt|cdot|times)\b/u.test(
    String(expression ?? '')
  );
}

function normalizeMathSyntax(source) {
  return source
    .replace(FENCED_BLOCK_PATTERN, (match, language, expression) => {
      const label = language.trim().toLowerCase();
      const supportedLabel = ['tex', 'latex', 'math'].includes(label);
      if (!supportedLabel && (label || !looksLikeLatex(expression))) return match;
      return `$$\n${expression.trim()}\n$$`;
    })
    .replace(/\\\[([\s\S]+?)\\\]/gu, (match, expression) => `$$\n${expression.trim()}\n$$`)
    .replace(/\\\(([^\n]+?)\\\)/gu, (match, expression) => `$${expression.trim()}$`);
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

function appendEmbed(embeds, files, expression) {
  if (embeds.length >= 10) return undefined;
  const index = embeds.length + 1;
  embeds.push(makeEmbed(expression, index));
  try {
    const { buffer } = renderLatexToPng(expression, { display: true });
    files.push({ attachment: buffer, name: `quasi-equation-${index}.png` });
  } catch {
    // Keep the readable text fallback when a provider emits malformed TeX.
  }
  return `Equation ${index}`;
}

function extractFromTextSegment(segment, embeds, files) {
  let output = segment.replace(/\$\$([\s\S]+?)\$\$/gu, (match, expression) => {
    if (!isDisplayMath(expression)) return match;
    return appendEmbed(embeds, files, expression) || fallbackCard(expression, embeds.length + 1);
  });

  output = output.replace(/(^|[^\\$])\$([^\n$]+?)\$/gu, (match, prefix, expression) => {
    if (!isCardWorthyInlineMath(expression)) return match;
    const label = appendEmbed(embeds, files, expression);
    return label ? `${prefix}${label}` : `${prefix}${fallbackCard(expression, embeds.length + 1)}`;
  });

  return output;
}

export function extractMathCards(markdown) {
  const source = String(markdown ?? '');
  const normalized = normalizeMathSyntax(source);
  if (!normalized.includes('$')) return { content: normalized, embeds: [], files: [] };

  const embeds = [];
  const files = [];
  const content = normalized
    .split(CODE_FENCE_PATTERN)
    .map((segment) =>
      segment.startsWith('```') ? segment : extractFromTextSegment(segment, embeds, files)
    )
    .join('')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();

  return { content, embeds, files };
}

export function formatMathCards(markdown) {
  const { content, embeds } = extractMathCards(markdown);
  if (embeds.length === 0) return content;

  const cards = embeds.map((embed) => `**${embed.title}**\n${embed.description}`).join('\n\n');
  return [content, cards].filter(Boolean).join('\n\n');
}
