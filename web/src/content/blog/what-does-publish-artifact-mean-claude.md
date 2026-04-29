---
title: "What Does 'Publish Artifact' Mean in Claude?"
description: "Claude's Publish Artifact feature creates a shareable link — but there's a catch most people don't notice until it's too late."
date: "2026-04-22"
readingTime: "3 min read"
---
<p>When you create an HTML artifact in Claude, you'll see a <strong>Publish</strong> button (sometimes shown as a share icon) in the artifact panel. Here's exactly what it does — and what it doesn't do.</p>

<h2>What "Publish Artifact" does</h2>

<p>Clicking Publish generates a URL that points to your artifact hosted on claude.ai. The URL is real and permanent (until you unpublish). You can copy it and send it to anyone.</p>

<h2>The catch: viewers need a Claude account</h2>

<p>Here's what most people don't realize until they share the link: when someone clicks a published Claude artifact URL, they land on claude.ai — which requires authentication. If they're not logged in to Claude, they see a <strong>login screen</strong>, not your artifact.</p>

<p>This means:</p>
<ul>
  <li>People without a Claude account can't see it</li>
  <li>People with only a free Claude account may be blocked (depending on their plan)</li>
  <li>Anyone on a device where they're not logged in to Claude won't see it</li>
</ul>

<p>It's not a bug — it's just how Claude's product is built. Artifacts are hosted inside the Claude product boundary.</p>

<h2>What "private" vs "published" means in Claude</h2>

<p>By default, your artifacts are private — only you can see them. When you publish, you're making the artifact accessible via a URL. But "accessible" still means "accessible to Claude users" — it's not public to the entire internet the way a normal website is.</p>

<h2>How to make an artifact truly public</h2>

<p>If you want anyone to view your artifact — no Claude account, no login — you need to host the HTML outside of claude.ai.</p>

<p><a href="https://www.shareduo.com">ShareDuo</a> is designed for exactly this use case. You upload the artifact's HTML (download it from Claude or ask Claude to output the code), and ShareDuo gives you a genuinely public URL that works in any browser.</p>

<h2>When to use each</h2>

<ul>
  <li><strong>Claude Publish:</strong> sharing within a team that all uses Claude; keeping artifact linked to the conversation</li>
  <li><strong>ShareDuo:</strong> sharing with clients, friends, or anyone outside Claude; embedding in emails, Notion, Slack; making something permanently public</li>
</ul>
