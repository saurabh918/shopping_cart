import { Fragment } from "react";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline **bold**, *italic*, and `code` only (no raw HTML). */
function renderInlineMarkdown(text) {
  const parts = [];
  let remaining = text;
  let key = 0;

  const pushText = (chunk) => {
    if (chunk) parts.push(<Fragment key={`t-${key++}`}>{chunk}</Fragment>);
  };

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    const candidates = [
      boldMatch ? { index: boldMatch.index, len: boldMatch[0].length, node: <strong key={`b-${key++}`}>{boldMatch[1]}</strong> } : null,
      italicMatch ? { index: italicMatch.index, len: italicMatch[0].length, node: <em key={`i-${key++}`}>{italicMatch[1]}</em> } : null,
      codeMatch ? { index: codeMatch.index, len: codeMatch[0].length, node: <code key={`c-${key++}`}>{codeMatch[1]}</code> } : null,
    ].filter(Boolean);

    if (candidates.length === 0) {
      pushText(remaining);
      break;
    }

    candidates.sort((a, b) => a.index - b.index);
    const next = candidates[0];
    if (next.index > 0) {
      pushText(remaining.slice(0, next.index));
    }
    parts.push(next.node);
    remaining = remaining.slice(next.index + next.len);
  }

  return parts;
}

function renderBlock(block) {
  const lines = block.split("\n");
  const isBulletList = lines.every((line) => line.trim() === "" || /^[-*]\s+/.test(line.trim()));
  const isNumberedList = lines.every((line) => line.trim() === "" || /^\d+\.\s+/.test(line.trim()));

  if (isBulletList && lines.some((line) => /^[-*]\s+/.test(line.trim()))) {
    return (
      <ul className="shopping-assistant__answer-list">
        {lines
          .map((line) => line.trim())
          .filter((line) => /^[-*]\s+/.test(line))
          .map((line, idx) => (
            <li key={`li-${idx}`}>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>
          ))}
      </ul>
    );
  }

  if (isNumberedList && lines.some((line) => /^\d+\.\s+/.test(line.trim()))) {
    return (
      <ol className="shopping-assistant__answer-list">
        {lines
          .map((line) => line.trim())
          .filter((line) => /^\d+\.\s+/.test(line))
          .map((line, idx) => (
            <li key={`oli-${idx}`}>{renderInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>
          ))}
      </ol>
    );
  }

  const headingMatch = block.match(/^(#{1,3})\s+(.+)$/);
  if (headingMatch) {
    return (
      <p className="shopping-assistant__answer-heading">
        {renderInlineMarkdown(headingMatch[2])}
      </p>
    );
  }

  return (
    <p className="shopping-assistant__answer-p">
      {renderInlineMarkdown(block.replace(/\n/g, " "))}
    </p>
  );
}

/**
 * Safe subset Markdown for assistant answers (no HTML passthrough).
 */
export default function AssistantAnswerMarkdown({ content }) {
  if (!content) return null;

  const normalized = escapeHtml(String(content));
  const blocks = normalized.split(/\n\s*\n/).filter((block) => block.trim().length > 0);

  return (
    <div className="shopping-assistant__answer">
      {blocks.map((block, idx) => (
        <Fragment key={`block-${idx}`}>{renderBlock(block.trim())}</Fragment>
      ))}
    </div>
  );
}
