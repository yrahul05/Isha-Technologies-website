'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** Cheap heuristics to label a code block when the source HTML has no
 * `language-xxx` class (none of the current blog content does) — good
 * enough for a display label, not meant to drive real syntax highlighting. */
function detectLanguage(code: string): string {
  const trimmed = code.trim();
  if (/^(resource|provider|variable|module|terraform)\s+["{]/.test(trimmed)) return 'Terraform';
  if (/^(apiVersion|kind):/m.test(trimmed)) return 'YAML';
  if (/^(#!\/bin\/(ba)?sh|\$\s)/.test(trimmed)) return 'Shell';
  if (/^\{[\s\S]*\}$/.test(trimmed) && /".*":/.test(trimmed)) return 'JSON';
  if (/^(const|let|var|function|import|export)\s/.test(trimmed)) return 'JavaScript';
  if (/^\d+\.\d+\.\d+\.\d+/.test(trimmed)) return 'CIDR';
  return 'Code';
}

/**
 * Replaces the plain `<pre>` react-markdown would otherwise render for
 * every code block in blog content — adds a language label and a
 * copy-to-clipboard button. Used only by BlogContent (blog articles), not
 * the generic MarkdownContainerNormal used elsewhere, so this stays scoped
 * to where it's actually wanted.
 */
export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const language = detectLanguage(code);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — no crash, just no-op.
    }
  }

  return (
    <div className="group not-prose my-6 overflow-hidden rounded-xl border border-gray-800 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
