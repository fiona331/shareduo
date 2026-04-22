export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  content: string; // HTML
}

export const posts: Post[] = [
  {
    slug: "share-claude-artifact-without-account",
    title: "How to Share a Claude Artifact With Anyone (No Account Needed)",
    description:
      "Claude's Publish button creates a link — but viewers need a Claude account to open it. Here's how to share a Claude artifact with anyone, no login required.",
    date: "2025-04-22",
    readingTime: "3 min read",
    content: `
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
    `,
  },
  {
    slug: "get-shareable-link-claude-artifact",
    title: "How to Get a Shareable Link for Any Claude Artifact",
    description:
      "Want a link to a Claude artifact that actually works for everyone? Here's the fastest way to get a public, shareable URL for any HTML artifact.",
    date: "2025-04-22",
    readingTime: "3 min read",
    content: `
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
    `,
  },
  {
    slug: "export-share-claude-html-artifact",
    title: "How to Export and Share a Claude HTML Artifact",
    description:
      "Step-by-step guide to exporting an HTML artifact from Claude and sharing it as a public link anyone can open.",
    date: "2025-04-22",
    readingTime: "3 min read",
    content: `
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
    `,
  },
  {
    slug: "claude-artifacts-not-working-for-others",
    title: "Why Claude Artifacts Don't Work for People Without Claude — and the Fix",
    description:
      "If you shared a Claude artifact link and your recipient sees a login screen instead of the artifact, here's why it happens and the fastest fix.",
    date: "2025-04-22",
    readingTime: "3 min read",
    content: `
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
    `,
  },
  {
    slug: "share-html-file-online-free",
    title: "The Fastest Way to Share an HTML File Online (Free, No Signup)",
    description:
      "Need a quick public URL for an HTML file? Here's the fastest way to share any HTML file online for free — no account, no configuration, no hosting setup.",
    date: "2025-04-22",
    readingTime: "2 min read",
    content: `
<p>You have an HTML file and you need a public URL for it. Maybe it's a Claude artifact, a prototype, a demo page, or a quick visualization. You don't want to configure a server, set up Netlify, or create another account somewhere.</p>

<p>Here's the fastest way.</p>

<h2>Use ShareDuo</h2>

<p>Go to <a href="https://www.shareduo.com">shareduo.com</a>. Drop your file. Get a link. Done.</p>

<p>No signup. No configuration. No domain needed. The link is live in under 10 seconds and works in any browser.</p>

<h2>Step by step</h2>

<ol>
  <li>Open <a href="https://www.shareduo.com">shareduo.com</a></li>
  <li>Drag your <code>.html</code> file onto the drop zone, or paste the HTML directly into the text area</li>
  <li>Choose how long the link should stay live: 1 hour, 1 day, 7 days, or 30 days</li>
  <li>Optionally add a password if you only want specific people to see it</li>
  <li>Click "Upload &amp; share"</li>
  <li>Copy the preview link and share it</li>
</ol>

<h2>What you get</h2>

<ul>
  <li>A <strong>preview link</strong> anyone can open — no account, no login</li>
  <li>A private <strong>manage link</strong> so you can check view counts and delete the file later</li>
  <li>The artifact runs exactly as written — external scripts, fonts, and libraries all work</li>
</ul>

<h2>Common use cases</h2>

<ul>
  <li><strong>Claude artifacts</strong> — share AI-generated dashboards, games, and tools with people who don't use Claude</li>
  <li><strong>HTML prototypes</strong> — share a design mockup with a client without deploying anywhere</li>
  <li><strong>Demo pages</strong> — quick one-off demos for a presentation or sales call</li>
  <li><strong>Static reports</strong> — share a data report as an interactive HTML page instead of a PDF</li>
  <li><strong>Landing page tests</strong> — A/B test a copy variation before committing to a deploy</li>
</ul>

<h2>Limits</h2>

<p>Files up to 5 MB. Links expire automatically based on the window you choose (max 30 days). Free forever, no account required.</p>
    `,
  },
  {
    slug: "can-i-share-a-claude-artifact",
    title: "Can I Share a Claude Artifact?",
    description:
      "Yes — but Claude's built-in sharing only works for people with a Claude account. Here's how to share a Claude artifact with anyone.",
    date: "2025-04-22",
    readingTime: "3 min read",
    content: `
<p><strong>Yes, you can share a Claude artifact</strong> — but there's an important catch with Claude's built-in sharing that trips up most people.</p>

<h2>Method 1: Claude's Publish button (limited)</h2>

<p>Claude has a Publish feature built in. Click the share or publish icon on any artifact and Claude generates a link. The problem: when your recipient clicks that link, they're taken to claude.ai — which requires a login. If they don't have a Claude account, they see a signup screen instead of your artifact.</p>

<p>This method works if you're sharing within a team where everyone already uses Claude.</p>

<h2>Method 2: ShareDuo (works for everyone)</h2>

<p>If you want a link anyone can open — no Claude account, no login, no subscription — you need to host the HTML somewhere other than claude.ai.</p>

<p><a href="https://www.shareduo.com">ShareDuo</a> does exactly that. You paste or upload the HTML, and get a public preview URL that works in any browser.</p>

<ol>
  <li>Download the artifact from Claude (or ask Claude to output the full HTML)</li>
  <li>Go to <a href="https://www.shareduo.com">shareduo.com</a></li>
  <li>Drop the file or paste the HTML</li>
  <li>Get a link — share it with anyone</li>
</ol>

<h2>What types of artifacts can be shared?</h2>

<p>Any HTML artifact Claude produces can be shared this way, including:</p>
<ul>
  <li>Interactive games and apps</li>
  <li>Data visualizations and charts</li>
  <li>Dashboards</li>
  <li>Landing pages and mockups</li>
  <li>Calculators and tools</li>
  <li>Data tables and reports</li>
</ul>

<h2>Can I share privately?</h2>

<p>Yes. ShareDuo lets you add a password to any artifact. Only people who know the password can view the preview. Useful for sharing work-in-progress or client deliverables.</p>

<h2>Can I control how long the link stays live?</h2>

<p>Yes. When uploading, you choose an expiry window: 1 hour, 1 day, 7 days, or 30 days. After that, the link expires automatically. Useful for keeping things tidy.</p>

<h2>Quick summary</h2>

<table>
  <thead>
    <tr><th>Method</th><th>Works for everyone?</th><th>Requires Claude account to view?</th></tr>
  </thead>
  <tbody>
    <tr><td>Claude Publish</td><td>No</td><td>Yes</td></tr>
    <tr><td>ShareDuo</td><td>Yes</td><td>No</td></tr>
  </tbody>
</table>
    `,
  },
  {
    slug: "what-does-publish-artifact-mean-claude",
    title: "What Does 'Publish Artifact' Mean in Claude?",
    description:
      "Claude's Publish Artifact feature creates a shareable link — but there's a catch most people don't notice until it's too late.",
    date: "2025-04-22",
    readingTime: "3 min read",
    content: `
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
    `,
  },
  {
    slug: "claude-artifacts-not-working",
    title: "Claude Artifacts Not Working? Here's the Fix",
    description:
      "If your Claude artifact isn't loading, isn't rendering correctly, or your shared link isn't working for others, here's how to diagnose and fix the most common issues.",
    date: "2025-04-22",
    readingTime: "4 min read",
    content: `
<p>Claude artifacts can break in a few different ways. Here are the most common problems and how to fix each one.</p>

<h2>Problem 1: Your shared artifact link shows a login screen</h2>

<p><strong>Why it happens:</strong> Claude publishes artifacts on claude.ai, which requires authentication. Recipients without a Claude account (or not logged in) see a login page instead of your artifact.</p>

<p><strong>Fix:</strong> Use <a href="https://www.shareduo.com">ShareDuo</a> to create a truly public link.</p>
<ol>
  <li>Download the artifact from Claude (or ask Claude: <em>"Output the full HTML"</em>)</li>
  <li>Upload to <a href="https://www.shareduo.com">shareduo.com</a></li>
  <li>Share the new link — works for anyone, no login required</li>
</ol>

<h2>Problem 2: The artifact preview is blank or broken</h2>

<p><strong>Why it happens:</strong> Usually one of these:</p>
<ul>
  <li>A JavaScript error in the artifact code</li>
  <li>A CDN resource blocked by Claude's preview sandbox</li>
  <li>Claude generated invalid HTML (rare but possible)</li>
</ul>

<p><strong>Fix:</strong> Ask Claude to debug it — <em>"The artifact preview is blank. Can you check for errors and fix it?"</em> Claude can usually self-correct. If external resources are being blocked, try opening the artifact via ShareDuo — its preview server is configured to allow CDN scripts and external fonts.</p>

<h2>Problem 3: Interactive elements don't work</h2>

<p><strong>Why it happens:</strong> Claude's built-in preview sandbox blocks some JavaScript for security reasons. Certain APIs (localStorage, clipboard, fetch to external URLs) may be restricted.</p>

<p><strong>Fix:</strong> Download the artifact and open it locally, or upload to ShareDuo. ShareDuo's preview domain has a less restrictive policy specifically so Claude-generated artifacts work properly.</p>

<h2>Problem 4: The artifact looks different than expected</h2>

<p><strong>Why it happens:</strong> Claude's preview uses an iframe with specific dimensions. Your artifact may be designed for a different viewport size.</p>

<p><strong>Fix:</strong> Ask Claude to make the layout responsive, or download the artifact and open it full-screen in a browser tab to see how it actually renders.</p>

<h2>Problem 5: Artifacts feature isn't showing up</h2>

<p>Claude artifacts are available on Claude.ai on paid plans. If you're on the free tier or using Claude via API, the artifact panel may not appear. The underlying HTML is still in Claude's response — ask Claude to output the full code and it will paste it as text.</p>

<h2>Still stuck?</h2>

<p>If none of these fix your issue, try: reloading the page, starting a new conversation and re-generating the artifact, or contacting Anthropic support at <a href="https://support.anthropic.com">support.anthropic.com</a>.</p>
    `,
  },
  {
    slug: "download-export-claude-artifact",
    title: "How to Download and Export a Claude Artifact",
    description:
      "Three ways to download or export any Claude artifact as an HTML file — and what to do with it once you have it.",
    date: "2025-04-22",
    readingTime: "3 min read",
    content: `
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
    `,
  },
  {
    slug: "claude-artifact-examples",
    title: "Claude Artifact Examples and Use Cases",
    description:
      "What can Claude actually build as an artifact? A rundown of the most useful types with examples — and how to share them with anyone.",
    date: "2025-04-22",
    readingTime: "4 min read",
    content: `
<p>Claude artifacts are fully functional HTML applications that run directly in the browser. Here's a tour of the most useful types — and for each one, how to share it with people who don't have Claude.</p>

<h2>Data visualizations and charts</h2>

<p>Claude can generate interactive charts using libraries like Chart.js, D3.js, or Plotly — loaded from CDN, no installation needed. Give Claude a dataset (pasted as text or described) and ask for a bar chart, line graph, pie chart, scatter plot, or anything else. The result is a fully interactive chart you can hover over, click, and filter.</p>

<p><strong>Good prompts:</strong> <em>"Create a Chart.js bar chart showing these monthly revenue figures"</em> or <em>"Build an interactive D3 scatter plot from this CSV data."</em></p>

<h2>Calculators and tools</h2>

<p>Claude builds surprisingly capable calculators: mortgage calculators, ROI estimators, unit converters, BMI calculators, compound interest tools. These are clean single-page apps with real input validation and responsive layouts.</p>

<p><strong>Good prompts:</strong> <em>"Build a loan amortization calculator with a repayment schedule table"</em> or <em>"Create a freelance rate calculator that factors in taxes and overhead."</em></p>

<h2>Games</h2>

<p>Simple browser games work well: Wordle clones, Snake, Tetris, memory card games, trivia quizzes, math drills. These are especially popular to share — and they're exactly the use case where Claude's native sharing breaks down (because the recipient needs a Claude account to play).</p>

<p><strong>Good prompts:</strong> <em>"Build a Wordle-style game with a custom word list"</em> or <em>"Create a quiz game with 10 questions about the Roman Empire."</em></p>

<h2>Dashboards and reports</h2>

<p>Claude can turn raw data into a polished dashboard with summary stats, charts, and tables — in a single HTML file. Useful for one-off reports where you don't want to set up a full BI tool.</p>

<p><strong>Good prompts:</strong> <em>"Turn this sales data into a dashboard with KPI cards and a trend line"</em> or <em>"Build an HTML report summarizing this survey data."</em></p>

<h2>Landing pages and mockups</h2>

<p>Claude builds pixel-reasonable landing pages, feature pages, and UI mockups. Not production-ready, but useful for validating ideas, creating presentations, or showing a client what you have in mind.</p>

<p><strong>Good prompts:</strong> <em>"Create a landing page for a project management tool targeting freelancers"</em> or <em>"Build a pricing page with three tiers."</em></p>

<h2>Interactive forms and surveys</h2>

<p>Client intake forms, survey pages, feedback forms — Claude builds them with validation and a clean layout. Note that form submissions won't go anywhere (there's no backend), but for static display or embedding a Typeform they work well.</p>

<h2>How to share any of these</h2>

<p>Claude's built-in Publish creates a link — but it only works for people with a Claude account. To share any artifact with anyone:</p>

<ol>
  <li>Download the artifact HTML from Claude</li>
  <li>Upload it to <a href="https://www.shareduo.com">shareduo.com</a></li>
  <li>Get a public link that works in any browser</li>
</ol>

<p>No account needed to view. The preview server is specifically configured to allow CDN libraries, Google Fonts, and the other external resources Claude typically uses.</p>
    `,
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
