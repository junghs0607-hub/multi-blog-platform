"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  content: string;
  isDark?: boolean;
}

// Simple syntax highlighter for common languages
function highlightCode(code: string, lang: string): string {
  // Escape HTML first
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const l = lang.toLowerCase();

  // Language-specific keywords
  const keywordSets: Record<string, string[]> = {
    javascript: ["const","let","var","function","return","if","else","for","while","class","extends","new","this","import","export","from","default","async","await","try","catch","finally","throw","typeof","instanceof","null","undefined","true","false","switch","case","break","continue","do","in","of","delete","void","yield","static","get","set"],
    typescript: ["const","let","var","function","return","if","else","for","while","class","extends","new","this","import","export","from","default","async","await","try","catch","finally","throw","typeof","instanceof","null","undefined","true","false","interface","type","enum","implements","private","public","protected","readonly","namespace","declare","as","is","keyof","switch","case","break","continue","static","abstract"],
    python: ["def","class","return","if","elif","else","for","while","import","from","as","try","except","finally","raise","with","lambda","None","True","False","and","or","not","in","is","pass","break","continue","global","nonlocal","yield","assert","del","async","await","self"],
    java: ["public","private","protected","class","interface","extends","implements","static","final","void","int","String","boolean","double","float","long","char","return","if","else","for","while","new","this","super","try","catch","finally","throw","throws","import","package","null","true","false","abstract","synchronized","volatile","enum"],
    php: ["function","class","return","if","else","elseif","foreach","for","while","echo","print","new","this","public","private","protected","static","try","catch","finally","throw","use","namespace","require","include","null","true","false","array","extends","implements","interface","abstract","const"],
    sql: ["SELECT","FROM","WHERE","INSERT","UPDATE","DELETE","CREATE","TABLE","ALTER","DROP","JOIN","LEFT","RIGHT","INNER","OUTER","ON","GROUP","BY","ORDER","HAVING","LIMIT","OFFSET","AS","AND","OR","NOT","NULL","IN","LIKE","BETWEEN","DISTINCT","COUNT","SUM","AVG","MAX","MIN","INTO","VALUES","SET","INDEX","PRIMARY","KEY","FOREIGN","REFERENCES","UNION","CASE","WHEN","THEN","END"],
    css: ["color","background","margin","padding","border","display","position","width","height","font","flex","grid","top","left","right","bottom","z-index","opacity","transform","transition","animation"],
    bash: ["echo","cd","ls","mkdir","rm","cp","mv","cat","grep","sed","awk","if","then","else","fi","for","do","done","while","function","export","source","sudo","chmod","chown","curl","wget","git","npm","node","python"],
  };

  const keywords = keywordSets[l] || keywordSets.javascript;

  // Comments (must be first)
  if (l === "python" || l === "bash" || l === "shell" || l === "yaml") {
    html = html.replace(/(#.*$)/gm, '<span style="color:#6a9955">$1</span>');
  } else if (l === "sql") {
    html = html.replace(/(--.*$)/gm, '<span style="color:#6a9955">$1</span>');
  } else if (l === "html" || l === "xml") {
    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#6a9955">$1</span>');
  } else {
    html = html.replace(/(\/\/.*$)/gm, '<span style="color:#6a9955">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6a9955">$1</span>');
  }

  // Strings
  html = html.replace(/(&quot;[^&]*?&quot;|'[^']*?'|`[^`]*?`)/g, '<span style="color:#ce9178">$1</span>');

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');

  // Keywords
  const kwPattern = new RegExp(`\\b(${keywords.join("|")})\\b`, l === "sql" ? "gi" : "g");
  html = html.replace(kwPattern, '<span style="color:#569cd6;font-weight:500">$1</span>');

  // Function calls
  html = html.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span style="color:#dcdcaa">$1</span>(');

  // HTML tags
  if (l === "html" || l === "xml" || l === "jsx" || l === "tsx") {
    html = html.replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span style="color:#4ec9b0">$2</span>');
  }

  return html;
}

function detectLanguage(className: string, code: string): string {
  // From class name (e.g. "language-javascript")
  const match = className?.match(/language-(\w+)/);
  if (match) return match[1];

  // Auto-detect
  if (/^\s*(?:import|export|const|let|var|function|=>)/m.test(code)) {
    if (/:\s*(?:string|number|boolean|any|void)\b|interface\s+\w+|type\s+\w+\s*=/.test(code)) return "typescript";
    return "javascript";
  }
  if (/^\s*(?:def|class|import|from)\s+\w+|print\(/m.test(code)) return "python";
  if (/^\s*(?:SELECT|INSERT|UPDATE|DELETE|CREATE)\s+/im.test(code)) return "sql";
  if (/^\s*&lt;\?php|\$\w+\s*=/m.test(code)) return "php";
  if (/^\s*(?:public|private|protected)\s+(?:class|static)/m.test(code)) return "java";
  if (/^\s*[.#]?[\w-]+\s*\{[^}]*:[^}]*\}/m.test(code)) return "css";
  if (/^\s*(?:#!|echo|cd|ls|npm|git|sudo)/m.test(code)) return "bash";
  if (/^\s*&lt;[a-zA-Z]/m.test(code)) return "html";
  if (/^\s*\{[\s\S]*"[\w]+"\s*:/m.test(code)) return "json";

  return "text";
}

export function ArticleContent({ content, isDark = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find all pre > code blocks (and standalone pre)
    const preBlocks = Array.from(container.querySelectorAll("pre"));

    preBlocks.forEach((pre, index) => {
      // Skip if already processed
      if (pre.dataset.processed === "true") return;
      pre.dataset.processed = "true";

      const codeEl = pre.querySelector("code");
      const rawCode = (codeEl || pre).textContent || "";
      const className = codeEl?.className || pre.className || "";
      const lang = detectLanguage(className, rawCode);

      // Create wrapper
      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      wrapper.style.cssText = `
        position: relative;
        margin: 1.5em 0;
        border-radius: 12px;
        overflow: hidden;
        background: #1e1e1e;
        border: 1px solid #333;
      `;

      // Header bar
      const header = document.createElement("div");
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        background: #252526;
        border-bottom: 1px solid #333;
      `;

      // Language label
      const langLabel = document.createElement("span");
      langLabel.textContent = lang === "text" ? "code" : lang;
      langLabel.style.cssText = `
        font-size: 12px;
        color: #858585;
        font-family: ui-monospace, monospace;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;

      // Copy button
      const copyBtn = document.createElement("button");
      copyBtn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        복사
      </span>`;
      copyBtn.style.cssText = `
        font-size: 12px;
        color: #858585;
        background: transparent;
        border: 1px solid #3e3e42;
        border-radius: 6px;
        padding: 4px 10px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      `;
      copyBtn.onmouseenter = () => {
        copyBtn.style.color = "#fff";
        copyBtn.style.borderColor = "#5a5a5a";
        copyBtn.style.background = "#2d2d30";
      };
      copyBtn.onmouseleave = () => {
        copyBtn.style.color = "#858585";
        copyBtn.style.borderColor = "#3e3e42";
        copyBtn.style.background = "transparent";
      };
      copyBtn.onclick = async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(rawCode);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = rawCode;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        copyBtn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px;color:#4ec9b0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          복사됨!
        </span>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:4px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            복사
          </span>`;
        }, 2000);
      };

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      // Code content with line numbers
      const codeContainer = document.createElement("div");
      codeContainer.style.cssText = `
        display: flex;
        overflow-x: auto;
        background: #1e1e1e;
      `;

      const lines = rawCode.replace(/\n$/, "").split("\n");

      // Line numbers
      if (lines.length > 1) {
        const lineNumbers = document.createElement("div");
        lineNumbers.style.cssText = `
          flex-shrink: 0;
          padding: 14px 0;
          background: #1e1e1e;
          border-right: 1px solid #2d2d30;
          user-select: none;
          text-align: right;
          min-width: 44px;
        `;
        lines.forEach((_, i) => {
          const ln = document.createElement("div");
          ln.textContent = String(i + 1);
          ln.style.cssText = `
            color: #5a5a5a;
            font-size: 13px;
            line-height: 1.6;
            padding: 0 12px 0 8px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          `;
          lineNumbers.appendChild(ln);
        });
        codeContainer.appendChild(lineNumbers);
      }

      // Highlighted code
      const codeContent = document.createElement("pre");
      codeContent.style.cssText = `
        flex: 1;
        margin: 0;
        padding: 14px 16px;
        overflow-x: auto;
        background: transparent;
        color: #d4d4d4;
        font-size: 13px;
        line-height: 1.6;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        white-space: pre;
        tab-size: 2;
      `;
      codeContent.innerHTML = highlightCode(rawCode.replace(/\n$/, ""), lang);
      codeContainer.appendChild(codeContent);

      wrapper.appendChild(header);
      wrapper.appendChild(codeContainer);

      pre.replaceWith(wrapper);
    });

    // Style inline code
    const inlineCodes = Array.from(container.querySelectorAll("code")).filter(
      (c) => !c.closest(".code-block-wrapper")
    );
    inlineCodes.forEach((code) => {
      if (code.dataset.styled === "true") return;
      code.dataset.styled = "true";
      code.style.cssText = `
        background: ${isDark ? "#2d2d30" : "#f1f5f9"};
        color: ${isDark ? "#ce9178" : "#dc2626"};
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.9em;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        border: 1px solid ${isDark ? "#3e3e42" : "#e2e8f0"};
      `;
    });

    // Make tables responsive
    const tables = Array.from(container.querySelectorAll("table"));
    tables.forEach((table) => {
      if (table.parentElement?.classList.contains("table-wrapper")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "table-wrapper";
      wrapper.style.cssText = "overflow-x:auto;margin:1.5em 0;border-radius:10px;border:1px solid #e2e8f0;";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
      table.style.cssText = "width:100%;border-collapse:collapse;margin:0;";
    });

    // Lazy load images
    const images = Array.from(container.querySelectorAll("img"));
    images.forEach((img) => {
      img.loading = "lazy";
      if (!img.style.borderRadius) img.style.borderRadius = "12px";
      if (!img.style.maxWidth) img.style.maxWidth = "100%";
      img.style.height = "auto";
    });

    // External links open in new tab
    const links = Array.from(container.querySelectorAll("a"));
    links.forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("http") && !href.includes(window.location.hostname)) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
    });
  }, [content, isDark]);

  return (
    <div
      ref={containerRef}
      className="article-content"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
