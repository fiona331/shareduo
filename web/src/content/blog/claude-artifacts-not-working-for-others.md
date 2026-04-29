---
title: "Why Claude Artifacts Don't Work for People Without Claude — and the Fix"
description: "If you shared a Claude artifact link and your recipient sees a login screen instead of the artifact, here's why it happens and the fastest fix."
date: "2026-04-22"
readingTime: "3 min read"
---
<p>You shared a Claude artifact link. Your recipient clicked it and got a login screen. The artifact isn't broken — it's a fundamental limitation of how Claude shares content. Here's what's happening and how to fix it in under a minute.</p>

<h2>Why Claude artifact links require an account</h2>

<p>When you click Publish in Claude, the artifact is hosted on <strong>claude.ai</strong>. That domain requires authentication. Claude has no way to serve the artifact without also serving the claude.ai interface — which means viewers need to be logged in.</p>

<p>This isn't a bug and Anthropic hasn't indicated they plan to change it. It's just how the product is built today.</p>

<h2>Who gets blocked</h2>

<ul>
  <li>Anyone without a Claude account</li>
  <li>Anyone with a Claude free plan (some artifact features require Pro)</li>
  <li>Anyone clicking the link on a device where they're not logged in to Claude</li>
  <li>Anyone in a company where claude.ai is blocked by their IT policy</li>
</ul>

<h2>The fix: host the HTML outside Claude</h2>

<p>Every Claude artifact is standard HTML. If you host that HTML somewhere other than claude.ai, anyone can view it — no account, no subscription, no login.</p>

<p><a href="https://www.shareduo.com">ShareDuo</a> is the quickest way to do this.</p>

<h3>How to fix it right now</h3>

<ol>
  <li><strong>Get the HTML.</strong> In Claude, click the download icon on the artifact panel, or ask Claude: <em>"Give me the full HTML."</em></li>
  <li><strong>Go to <a href="https://www.shareduo.com">shareduo.com</a>.</strong> Drop the file or paste the HTML.</li>
  <li><strong>Upload.</strong> You get a new link instantly — this one works for everyone.</li>
  <li><strong>Resend the new link.</strong> Your recipient clicks it, the artifact loads directly in their browser. No login prompt.</li>
</ol>

<p>The whole process takes about 30 seconds.</p>

<h2>Will the artifact look the same?</h2>

<p>Yes. ShareDuo serves the HTML exactly as Claude wrote it, on a separate preview domain that allows CDN scripts, Google Fonts, and all the libraries Claude typically uses. Your chart, game, or dashboard will render identically.</p>

<h2>What about future updates?</h2>

<p>If you update the artifact in Claude and want to re-share, upload again — you'll get a new link. ShareDuo also lets you choose an expiry window, so temporary shares don't linger indefinitely.</p>
