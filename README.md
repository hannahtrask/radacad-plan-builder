# Radical Minds Academy — Your Family, Your Plan

A step-by-step plan builder for radicalmindsacademy.org/education-plans. One screen at a time: three quick questions (skippable), a suggested membership with the other options listed below it, optional one-on-one subjects, then send. Garrett gets an email, the family gets a copy plus the booking link, and every plan is logged to a Google Sheet.

No build step, no frameworks, no monthly fees.

```
public/            → what Cloudflare Pages serves (build output directory = public)
  embed.js         the builder (renders in a shadow root on the Squarespace page)
  builder.css      styles (Mokoko headings, Poppins body, brand colors as CSS variables)
  plans.json       ALL prices, plans, subjects, booking link, and the endpoint URL
  index.html       standalone preview page
  _headers         lets the Squarespace site load these files (don't delete it)
apps-script/
  Code.gs          lead handler: logs to the Sheet + sends both emails
squarespace/
  code-block.html  the snippet for the Squarespace Code Block
```

---

# Go-live checklist

Total time: about 1 hour. Do the steps in order, since each one needs the step before it.

## Step 1 — Open it and preview locally (5 min)

1. Unzip `radacad-plan-builder.zip`.
2. In VS Code, use **File → Open Folder** and pick the **`radacad-plan-builder`** folder (the one that contains `public/` and `README.md`, not its parent).
3. Open the terminal (**Terminal → New Terminal**) and run:
   ```
   python3 -m http.server 8000 --directory public
   ```
   (or `npx serve public` if you prefer Node)
4. Go to **http://localhost:8000** and click through all six steps. The form runs in **preview mode** (nothing is sent), so you'll see "Plan sent" right away.
   - Don't double-click `index.html` to open it. A file opened straight from disk can't load `plans.json`, so the builder shows "didn't load." Always use the local server.
5. Stop the server with **Ctrl + C**.

## Step 2 — Push to GitHub (5 min)

1. On github.com, go to **New repository**:
   - Name: `radacad-plan-builder`
   - **Private**
   - Do **not** add a README, .gitignore, or license (the repo has to be empty)
   - Click **Create repository**
2. In the VS Code terminal, inside the `radacad-plan-builder` folder, run these one at a time (swap in your GitHub username):
   ```
   git init
   git add .
   git commit -m "Plan builder v1"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/radacad-plan-builder.git
   git push -u origin main
   ```
   If it asks you to sign in, VS Code shows a GitHub sign-in prompt. Accept it.
3. Refresh the repo on GitHub. You should see `public/`, `apps-script/`, `squarespace/`, and `README.md`.

## Step 3 — Cloudflare Pages (10 min)

Do this in the Cloudflare account the site will live in (Garrett's, since you're a member there).

1. **Workers & Pages → Create → Pages → Connect to Git** (Cloudflare may label it "Import an existing Git repository").
2. Connect GitHub when it asks. On the GitHub screen, choose **Only select repositories → radacad-plan-builder**.
3. Select the repo and click **Begin setup**:
   - Project name: `radacad-plan-builder` (this becomes your URL)
   - Production branch: **main**
   - Framework preset: **None**
   - Build command: **leave empty**
   - Build output directory: **`public`**
4. Click **Save and Deploy** and wait about a minute.
5. Check these:
   - `https://radacad-plan-builder.pages.dev/` shows the preview page. If Cloudflare added a suffix to the name, use the URL it shows you everywhere below.
   - `https://radacad-plan-builder.pages.dev/plans.json` shows the price data.

From now on, every `git push` redeploys automatically in about 30 seconds.

## Step 4 — Apps Script: emails + leads sheet (15 min)

Whoever deploys the script is who the emails come **from**, so do this logged into **Garrett's Google account** if you can. (Use a separate Chrome profile or an incognito window so you don't mix it up with your own account.)

1. In his Google Drive: **New → Google Sheets**, and name it **RadAcad Plan Builder Leads**.
2. In the sheet: **Extensions → Apps Script**.
3. Delete everything in `Code.gs`, then paste in the whole contents of `apps-script/Code.gs` from VS Code.
4. **While you test**, change `NOTIFY_TO` in the `CONFIG` block at the top to `hello@wearesagebrush.com`, so Garrett doesn't get your test plans. (You'll switch it back in Step 6.)
5. Click the 💾 **Save** icon.
6. In the function dropdown in the toolbar (next to **Debug**), choose **`setup`** and click **▶ Run**.
   - **Review permissions** → choose the account → if you see "Google hasn't verified this app", click **Advanced → Go to (project name) (unsafe)** → **Allow**.
   - The sheet should now have a **Leads** tab with headers.
7. **Deploy** (the blue button, top right) → **New deployment** → click the ⚙ gear next to "Select type" → **Web app**:
   - Description: `v1`
   - Execute as: **Me**
   - Who has access: **Anyone**. If "Anyone" isn't in the list, his Workspace blocks it. Fix it in admin.google.com → Apps → Google Workspace → Drive and Docs → Sharing settings, by allowing sharing outside the organization.
   - Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
8. Paste that URL into a browser tab. You should see `{"ok":true,"service":"radacad-plan-builder"}`.
9. In VS Code, open `public/plans.json` and paste the URL into `"endpoint"`:
   ```
   "endpoint": "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```
10. Push it:
    ```
    git add .
    git commit -m "Connect lead handler"
    git push
    ```
11. After about a minute, open your pages.dev URL and send a real test plan using your own email. Check that you get:
    - the **"New plan"** email (sent to you while `NOTIFY_TO` is yours)
    - the **"Your RadAcad plan for …"** family email
    - a new row at the top of the **Leads** tab

**Changing the script later:** edit and save, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same. Never use "New deployment" again, because that creates a new URL.

## Step 5 — Hidden preview page on Squarespace (15 min)

This is the link you send Garrett. It shows the builder on his real site with Mokoko.

1. **Pages** → hover **Education Plans** → **⚙ / ⋯ → Duplicate**.
2. Drag the copy into **Not Linked**. In its settings:
   - Title: `Education Plans Preview`
   - URL slug: `/education-plans-preview`
   - SEO → turn on **Hide page from search results**
3. **Edit** the copy. Right under the "Your Family Your Plan" heading: **Add Block → Code**, then paste:
   ```
   <div id="plan-builder"></div>
   <script src="https://radacad-plan-builder.pages.dev/embed.js" defer></script>
   ```
   Make sure **Display Source** is off.
4. Near the top of the page, add a **Button** block labeled **Your Family Your Plan**, linking to `#plan-builder`.
5. **Save** and exit the editor. Squarespace doesn't run scripts while you're editing, so the builder only appears on the saved page. Open `radicalmindsacademy.org/education-plans-preview` in a normal tab.
6. Click through it on desktop and on your phone, and send one more test plan.

## Step 6 — Send Garrett the preview

1. In Apps Script, change `NOTIFY_TO` back to `garrett.austen@tetontutors.org`, then **Save → Deploy → Manage deployments → ✏️ Edit → New version → Deploy**.
2. Send him **radicalmindsacademy.org/education-plans-preview**. Plans he submits will reach his own inbox, so he sees the whole experience.

## Step 7 — Launch (Nov 1)

1. Add the same Code Block and button to the real **/education-plans** page, under "Your Family Your Plan."
2. Save, check the live page, and send one final test plan.
3. Delete the preview page, or leave it unlinked.
4. In GA4 (Admin → Events), mark `plan_builder_submit` as a **key event**.

---

# Reference

## Troubleshooting
| What you see | Fix |
|---|---|
| "The plan builder didn't load" on localhost | You opened the file directly. Use the local server (Step 1). |
| "Didn't load" on Squarespace | Check the script URL in the code block, and that `public/_headers` was pushed. |
| Builder doesn't show in the Squarespace editor | Normal. Save and view the page outside the editor. |
| "Your plan didn't send" | Open the `/exec` URL in a browser. If it isn't `{"ok":true…}`, the deployment isn't set to **Anyone**. |
| Price change isn't showing | Make sure you pushed, wait a minute, and hard-refresh (Cmd + Shift + R). |
| Emails come from the wrong address | The script was deployed from the wrong Google account. Redeploy from his, and update `endpoint`. |

## Analytics
Squarespace's GA4 integration loads `gtag`, so these events fire automatically: `plan_builder_start`, `plan_builder_answer`, `plan_builder_step` (shows where families drop off), `plan_builder_skip_quiz`, `plan_builder_membership`, `plan_builder_add_subject`, `plan_builder_submit` (`value` = monthly total).

## Updating prices and classes (billed hourly)
Edit `public/plans.json`, then `git add . && git commit -m "Update prices" && git push`.
- Membership prices: `foundations[].price`, `partnerships[].price`
- Subject class: `subjectClass.price` and `subjectClass.memberPrice`
- Subject list: `subjects`
- Booking link, follow-up promise, drop-in price: `settings`

Plans with `"memberPricing": true` (Full and the partnerships) get the member price on subjects.

## How plans get suggested
The rules are in `suggest()` in `embed.js`:
- "Executive function coaching" → Full (coaching only comes with Full)
- Every weekday + structure → Full; every weekday otherwise → Independent
- 2 days (or "not sure") + structure or subject help → 2-Day RadAcad; otherwise → 2-Day Independent
- "One-on-one help in a subject" → the Subjects step opens with one subject row ready
- "Online school" → the partnership packages open under the other options
- The suggestion is pre-selected and highlighted, with a line explaining why. The other memberships are listed below it, not highlighted.
- Skipping the questions shows every membership equally, with nothing pre-selected.
- Garrett's email and the Leads sheet show what we suggested and what the family picked.

Every plan must include exactly one membership. Subjects can't be added without one (the "Torsten" fix).

## Copy rules (from Garrett)
- RadAcad is **not a school**. "School" is only ever a verb ("School differently.").
- "How does RadAcad work?" positions RadAcad as what students do *instead of* school.

## Handoff
Transfer the GitHub repo to Garrett (Settings → Transfer), then reconnect it in Cloudflare (Pages project → Settings → Builds → Git repository). Confirm the Apps Script is deployed from his Google account; if it isn't, redeploy there and update `endpoint`.
