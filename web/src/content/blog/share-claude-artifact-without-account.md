---
title: "How to Share a Claude Artifact With Anyone (No Account Needed)"
description: "Claude's Publish button creates a link — but viewers need a Claude account to open it. Here's how to share a Claude artifact with anyone, no login required."
date: "2026-04-22"
readingTime: "3 min read"
---
<p>You built something great in Claude — a dashboard, a game, a data visualization — and you want to share it. You hit <strong>Publish</strong>, copy the link, and send it. Then your friend replies: <em>"It's asking me to log in."</em></p>

<p>This is the core problem with Claude's native sharing. The published link works, but only for people who already have a Claude account. Everyone else hits a signup wall.</p>

<h2>Why Claude's Publish doesn't work for everyone</h2>

<p>When Claude publishes an artifact, it hosts the preview inside claude.ai — a domain that requires authentication. There's no way to make a Claude-hosted artifact truly public without the viewer having an account.</p>

<p>This isn't a bug. It's just how Claude is built. The artifact lives inside the Claude product, and Claude requires a login.</p>

<h2>The fix: host the HTML yourself</h2>

<p>Every Claude artifact is standard HTML. You can copy that HTML and host it anywhere — and once it's hosted outside claude.ai, anyone can view it with no login required.</p>

<p><a href="https://www.shareduo.com">ShareDuo</a> is the fastest way to do this. It takes about 30 seconds.</p>

<h2>Step-by-step: share a Claude artifact with anyone</h2>

<ol>
  <li><strong>Get the HTML from Claude.</strong> In the artifact panel, click the <em>download</em> icon to save it as an <code>.html</code> file. Or ask Claude directly: <em>"Show me the full HTML for this artifact"</em> — it will paste it into the chat.</li>
  <li><strong>Go to <a href="https://www.shareduo.com">shareduo.com</a>.</strong> Drag and drop the file, or paste the HTML into the text area.</li>
  <li><strong>Set your options.</strong> Choose how long the link should stay live (1 hour to 30 days). Optionally add a password.</li>
  <li><strong>Click "Upload &amp; share."</strong> You'll get a preview URL instantly.</li>
  <li><strong>Share the link.</strong> Anyone can open it in any browser — no Claude account, no login, no subscription required.</li>
</ol>

<h2>What you get</h2>

<p>Every ShareDuo link comes with a private <strong>manage page</strong> where you can see how many times the link was opened and delete it when you're done. The preview runs on a separate domain so interactive artifacts — those using Chart.js, Google Fonts, CDN scripts — work exactly as Claude built them.</p>

<h2>Sharing directly from Claude (advanced)</h2>

<p>If you use Claude frequently, ShareDuo has an <strong>MCP server</strong> that lets Claude push artifacts directly without leaving the conversation. You say "share this artifact" and Claude uploads it and returns the link — no copy-paste required. See the <a href="https://github.com/fiona331/shareduo">GitHub repo</a> for setup instructions.</p>

<h2>Summary</h2>

<ul>
  <li>Claude's native Publish requires viewers to have a Claude account</li>
  <li>ShareDuo hosts the HTML on a public URL anyone can open</li>
  <li>Takes ~30 seconds, free, no signup required</li>
</ul>
