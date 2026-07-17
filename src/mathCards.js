import { renderLatexToPng } from './latexRender.js';

const EQUATION_CARD_COLOR = 0x5865f2;
const CODE_FENCE_PATTERN = /(```[\s\S]*?```)/gu;
const FENCED_BLOCK_PATTERN = /```([^\n`]*)\n([\s\S]*?)```/gu;
const EQUATION_MARKER_PATTERN = /\u0000QUASI_EQUATION_(\d+)\u0000/gu;

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

function equationMarker(index) {
  return `\u0000QUASI_EQUATION_${index}\u0000`;
}

function appendEmbed(embeds, equations, expression) {
  if (embeds.length >= 10) return undefined;
  const index = embeds.length + 1;
  try {
    const { buffer } = renderLatexToPng(expression, { display: true });
    const file = { attachment: buffer, name: `quasi-equation-${index}.png` };
    embeds.push(makeEmbed(expression, index));
    equations.push({ index, file });
    return equationMarker(index);
  } catch {
    return fallbackCard(expression, index);
  }
}

function extractFromTextSegment(segment, embeds, equations) {
  let output = segment.replace(/\$\$([\s\S]+?)\$\$/gu, (match, expression) => {
    if (!isDisplayMath(expression)) return match;
    return appendEmbed(embeds, equations, expression) || fallbackCard(expression, embeds.length + 1);
  });

  output = output.replace(/(^|[^\\$])\$([^\n$]+?)\$/gu, (match, prefix, expression) => {
    if (!isCardWorthyInlineMath(expression)) return match;
    const label = appendEmbed(embeds, equations, expression);
    return label ? `${prefix}${label}` : `${prefix}${fallbackCard(expression, embeds.length + 1)}`;
  });

  return output;
}

function buildSegments(processed, equations) {
  const equationByIndex = new Map(equations.map((equation) => [equation.index, equation]));
  const segments = [];
  let cursor = 0;

  for (const match of processed.matchAll(EQUATION_MARKER_PATTERN)) {
    const text = processed.slice(cursor, match.index).trim();
    if (text) segments.push({ type: 'text', content: text });
    const equation = equationByIndex.get(Number.parseInt(match[1], 10));
    if (equation) {
      segments.push({
        type: 'equation',
        content: `**Equation ${equation.index}**`,
        file: equation.file
      });
    }
    cursor = match.index + match[0].length;
  }

  const tail = processed.slice(cursor).trim();
  if (tail) segments.push({ type: 'text', content: tail });
  return segments;
}

export function extractMathCards(markdown) {
  const source = String(markdown ?? '');
  const normalized = normalizeMathSyntax(source);
  if (!normalized.includes('$')) {
    const content = normalized.trim();
    return {
      content,
      embeds: [],
      files: [],
      segments: content ? [{ type: 'text', content }] : []
    };
  }

  const embeds = [];
  const equations = [];
  const processed = normalized
    .split(CODE_FENCE_PATTERN)
    .map((segment) =>
      segment.startsWith('```') ? segment : extractFromTextSegment(segment, embeds, equations)
    )
    .join('')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();

  const segments = buildSegments(processed, equations);
  const content = processed.replace(EQUATION_MARKER_PATTERN, (match, index) => `Equation ${index}`);
  return { content, embeds, files: equations.map((equation) => equation.file), segments };
}

export function formatMathCards(markdown) {
  const { content, embeds } = extractMathCards(markdown);
  if (embeds.length === 0) return content;

  const cards = embeds.map((embed) => `**${embed.title}**\n${embed.description}`).join('\n\n');
  return [content, cards].filter(Boolean).join('\n\n');
}
