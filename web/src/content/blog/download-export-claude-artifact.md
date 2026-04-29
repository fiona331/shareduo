---
title: "How to Download and Export a Claude Artifact"
description: "Three ways to download or export any Claude artifact as an HTML file — and what to do with it once you have it."
date: "2026-04-22"
readingTime: "3 min read"
---
<p>Claude artifacts are HTML files. Getting them out of Claude is straightforward once you know where to look. Here are three methods, from easiest to most manual.</p>

<h2>Method 1: Download button</h2>

<p>The simplest way. In the artifact panel on the right side of the Claude interface:</p>
<ol>
  <li>Hover over the artifact</li>
  <li>Look for the <strong>download icon</strong> (an arrow pointing down, usually in the top-right of the panel)</li>
  <li>Click it — the file saves as <code>artifact.html</code> or similar to your downloads folder</li>
</ol>

<p>The resulting file is a complete, self-contained HTML document you can open in any browser.</p>

<h2>Method 2: Ask Claude to output the HTML</h2>

<p>If you don't see a download button (sometimes it's hidden on certain plans or interfaces), just ask:</p>

<blockquote>
  <em>"Give me the complete HTML code for this artifact so I can save it as a file."</em>
</blockquote>

<p>Claude will output the full HTML in a code block. Select all, copy, paste into a text editor, and save as <code>myartifact.html</code>.</p>

<h2>Method 3: View source in full-screen mode</h2>

<p>If the artifact is open in full-screen preview:</p>
<ol>
  <li>Right-click anywhere on the preview</li>
  <li>Choose <strong>"View Page Source"</strong></li>
  <li>Select all (Ctrl+A / Cmd+A), copy, and save as an HTML file</li>
</ol>

<h2>What to do with the exported HTML</h2>

<p>Once you have the file, you have several options:</p>

<ul>
  <li><strong>Open locally:</strong> double-click the file to open it in your browser — works immediately, no internet required</li>
  <li><strong>Share publicly:</strong> upload to <a href="https://www.shareduo.com">ShareDuo</a> to get a public URL anyone can open, no Claude account needed</li>
  <li><strong>Deploy permanently:</strong> drop it into Netlify, Vercel, or GitHub Pages for a permanent URL</li>
  <li><strong>Embed:</strong> host it and use an <code>&lt;iframe&gt;</code> to embed it in another page</li>
</ul>

<h2>Can I export as PDF instead?</h2>

<p>Not directly from Claude. The easiest way to get a PDF is to:</p>
<ol>
  <li>Open the artifact (locally or via ShareDuo)</li>
  <li>Print the page (Ctrl+P / Cmd+P)</li>
  <li>Choose "Save as PDF" as the destination</li>
</ol>

<p>For complex layouts, Chrome's print-to-PDF produces the cleanest results.</p>
