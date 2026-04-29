---
title: "How to Get a Shareable Link for Any Claude Artifact"
description: "Want a link to a Claude artifact that actually works for everyone? Here's the fastest way to get a public, shareable URL for any HTML artifact."
date: "2026-04-22"
readingTime: "3 min read"
---
<p>Getting a shareable link for a Claude artifact sounds simple — and Claude does have a Publish button. But the link it creates only works for people with a Claude account. If you want a link that <em>actually</em> works for everyone, you need one more step.</p>

<h2>Claude's built-in sharing: what it does and doesn't do</h2>

<p>Claude's Publish feature generates a link to your artifact hosted on claude.ai. It works — but when someone without a Claude account clicks it, they're redirected to a login screen instead of seeing your artifact.</p>

<p>For sharing with teammates, clients, or anyone who doesn't use Claude, that's a dealbreaker.</p>

<h2>How to get a truly public shareable link</h2>

<p>The simplest solution: copy the HTML out of Claude and upload it to <a href="https://www.shareduo.com">ShareDuo</a>. You'll get a link that works in any browser, for anyone, with no login required.</p>

<h3>Option 1 — Upload the file</h3>
<ol>
  <li>In the Claude artifact panel, click the download icon to save the <code>.html</code> file</li>
  <li>Go to <a href="https://www.shareduo.com">shareduo.com</a></li>
  <li>Drop the file onto the upload area</li>
  <li>Click "Upload &amp; share" — your link is ready instantly</li>
</ol>

<h3>Option 2 — Paste the HTML</h3>
<ol>
  <li>Ask Claude: <em>"Give me the full HTML for this artifact"</em></li>
  <li>Copy the HTML it returns</li>
  <li>Paste it into the text area on <a href="https://www.shareduo.com">shareduo.com</a></li>
  <li>Upload and share</li>
</ol>

<h2>What the link looks like</h2>

<p>Your link will look like <code>https://preview.shareduo.com/abc123</code>. It opens directly to your artifact — no loading screen, no login prompt, no Anthropic branding. Just your HTML running in the browser.</p>

<h2>Extra options worth knowing</h2>

<ul>
  <li><strong>Expiry:</strong> set the link to expire in 1 hour, 1 day, 7 days, or 30 days</li>
  <li><strong>Password:</strong> lock the link so only people with the password can view it</li>
  <li><strong>View count:</strong> your private manage page shows how many times the link was opened</li>
</ul>

<h2>Getting a shareable link without leaving Claude</h2>

<p>ShareDuo also has an MCP integration that lets Claude generate the shareable link for you mid-conversation. Once set up, you just ask Claude to share the artifact and it returns a public URL automatically. Details in the <a href="https://github.com/fiona331/shareduo">GitHub repo</a>.</p>
