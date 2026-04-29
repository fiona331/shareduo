---
title: "How to Export and Share a Claude HTML Artifact"
description: "Step-by-step guide to exporting an HTML artifact from Claude and sharing it as a public link anyone can open."
date: "2026-04-22"
readingTime: "3 min read"
---
<p>Claude can build impressive HTML artifacts — interactive charts, calculators, games, dashboards — but getting them out of Claude and sharing them publicly takes a couple of steps. Here's exactly how to do it.</p>

<h2>Step 1: Export the HTML from Claude</h2>

<p>There are three ways to get the HTML out of Claude:</p>

<h3>Download button (easiest)</h3>
<p>In the artifact panel on the right side of the Claude interface, look for the download icon (an arrow pointing down). Click it and Claude saves the artifact as an <code>.html</code> file to your downloads folder.</p>

<h3>Ask Claude to output the HTML</h3>
<p>Type: <em>"Show me the complete HTML for this artifact."</em> Claude will paste the full code into the chat. Select all, copy.</p>

<h3>Right-click → View source (in full-screen preview)</h3>
<p>If you open the artifact in full-screen mode, you can right-click and choose "View Page Source" to see the raw HTML. Select all and copy.</p>

<h2>Step 2: Host it publicly</h2>

<p>Once you have the HTML, you need somewhere to host it that gives you a public URL. <a href="https://www.shareduo.com">ShareDuo</a> is built exactly for this.</p>

<ol>
  <li>Go to <a href="https://www.shareduo.com">shareduo.com</a></li>
  <li>Drop the <code>.html</code> file onto the drop zone, or paste the HTML into the text area</li>
  <li>Choose how long the link should stay live</li>
  <li>Click "Upload &amp; share"</li>
</ol>

<p>You'll get two links: a <strong>preview URL</strong> to share with anyone, and a private <strong>manage URL</strong> to track views and delete the artifact later.</p>

<h2>Why not just use Claude's Publish button?</h2>

<p>Claude's Publish creates a link, but it only works for people who have a Claude account. If your recipient doesn't have Claude — or has a free plan that doesn't support artifact viewing — they'll see a login screen instead of your artifact.</p>

<p>ShareDuo's preview links have no such restriction. They work in any browser, for anyone.</p>

<h2>What kinds of Claude artifacts work?</h2>

<p>Any HTML artifact Claude creates will work — including ones that use:</p>
<ul>
  <li>Chart.js, D3.js, or other charting libraries loaded from CDN</li>
  <li>Google Fonts</li>
  <li>Tailwind CSS via CDN</li>
  <li>Interactive JavaScript (games, calculators, forms)</li>
  <li>Inline CSS animations</li>
</ul>

<p>ShareDuo's preview server is specifically configured to allow these — unlike some hosting services that block external scripts.</p>
