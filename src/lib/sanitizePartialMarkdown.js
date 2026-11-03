export function sanitizePartialMarkdown(text) {
  if (!text) return "";

  let result = text;

  // 1. Unclosed code fences (```)
  const codeBlockMatches = result.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    result += "\n```";
  } else {
    // 2. Inline backticks (excluding triple backticks)
    const withoutCodeBlocks = result.replace(/```[\s\S]*?```/g, "");
    const singleBackticks = withoutCodeBlocks.match(/`/g);
    if (singleBackticks && singleBackticks.length % 2 !== 0) {
      result += "`";
    }
  }

  // 3. Unclosed LaTeX $$ blocks
  const doubleDollars = result.match(/\$\$/g);
  if (doubleDollars && doubleDollars.length % 2 !== 0) {
    result += "\n$$";
  } else {
    // 4. Unclosed LaTeX $ inline math (excluding $$)
    const withoutDoubleDollars = result.replace(/\$\$[\s\S]*?\$\$/g, "");
    const singleDollars = withoutDoubleDollars.match(/(?<!\\)\$/g);
    if (singleDollars && singleDollars.length % 2 !== 0) {
      result += "$";
    }
  }

  return result;
}
