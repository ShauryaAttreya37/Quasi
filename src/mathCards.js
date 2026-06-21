function isLikelyMath(expression) {
  return /[=^_\\{}]/u.test(expression) || /\b(?:frac|sqrt|sum|int|lim|alpha|beta|gamma|theta|pi)\b/iu.test(expression);
}

function equationCard(expression, index) {
  return [
    `**Equation card: Equation ${index}**`,
    '```tex',
    expression.trim(),
    '```'
  ].join('\n');
}

function transformTextSegment(segment, startIndex) {
  let nextIndex = startIndex;
  let output = segment.replace(/\$\$([\s\S]+?)\$\$/gu, (_match, expression) => {
    const card = equationCard(expression, nextIndex);
    nextIndex += 1;
    return `\n\n${card}\n\n`;
  });

  output = output.replace(/(^|[^\\$])\$([^\n$]+?)\$/gu, (match, prefix, expression) => {
    if (!isLikelyMath(expression)) return match;
    const card = equationCard(expression, nextIndex);
    nextIndex += 1;
    return `${prefix.trimEnd()}\n\n${card}\n\n`;
  });

  return { output, nextIndex };
}

export function formatMathCards(markdown) {
  const source = String(markdown ?? '');
  if (!source.includes('$')) return source;

  const segments = source.split(/(```[\s\S]*?```)/gu);
  let nextIndex = 1;

  return segments
    .map((segment) => {
      if (segment.startsWith('```')) return segment;
      const result = transformTextSegment(segment, nextIndex);
      nextIndex = result.nextIndex;
      return result.output;
    })
    .join('')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n\n[ \t]+/gu, '\n\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}
