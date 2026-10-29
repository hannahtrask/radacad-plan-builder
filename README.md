# Radical Minds Academy — Your Family, Your Plan

A plan builder for radicalmindsacademy.org/education-plans. Families build their plan on the left while their student's weekly schedule and price update live on the right. Garrett gets an email, the family gets a copy plus the booking link, and every plan is logged to a Google Sheet.

No build step, no frameworks, no monthly fees.

```
public/            → what Cloudflare serves (wrangler.json points here)
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
Squarespace's GA4 integration loads `gtag`, so these events fire automatically: `plan_builder_start` (first choice made), `plan_builder_school` (which school option), `plan_builder_submit` (`value` = monthly total).

## How it's laid out
Follows Garrett's mockup ("Build your RadAcad week"), styled to the Squarespace site.
- **Left, five sections:** 1) Where does school happen? (own/hybrid, ICL live, ICL self-paced, Aeon when it's turned on) 2) How many days? 3) Add what your student needs (check-in, close support, 1:1 coaching, single-subject classes, small group classes, ICL à la carte with a searchable catalog) 4) Start date, Wyoming ESA, need-based discount 5) Send the plan.
- **Right:** the student's Mon–Fri week and the price, updating live, plus a "Send this plan and book a call" button. On phones a black bar shows the total, and "See the week" opens the full summary.

## Pricing rules
From Garrett's pricing doc and mockup:
- Membership by days: 2 days $350, 3 days $650, 4 days $950, full week $1,200. Small group classes set the minimum: picking classes on four different days moves the plan to four days, and smaller day counts are disabled.
- ICL packages ($2,875 live, $2,425 self-paced) include the full week. Days lock to 5, and à la carte ICL is hidden.
- Need-based discount (10% or 20%) applies to the membership portion only, including the $1,200 inside an ICL package.
- Small group classes: $1,250 fall or $1,800 spring per class, shown per semester. The year total for a fall start counts fall + spring.
- ESA only applies to fall starts. A January start uses ESA the next fall.
- Year total = monthly × payments (9 fall, 5 January) + semester fees. After ESA = year total − $7,000 (never below $0).
- **Aeon** is built in, but `"hidden": true` in `plans.json` → `schools`, per Garrett's pricing doc (waiting on Aeon's partner rate). Delete that line to show it.
- Kept off the site: ICL payouts, per-hour math, margins, referral arrangements.

All of Garrett's example plans and his ESA table were checked against the builder in testing.

## Updating prices, classes, and courses (billed hourly)
Edit `public/plans.json`, then `git add . && git commit -m "Update" && git push`.
- Membership: `membership.prices`
- Online school options: `schools` (monthly price, deposit, hidden)
- Add-ons: `addOns`
- **Small group classes:** `smallGroup.classes` (name, short name for the week grid, teacher, time, days). Swap in the spring schedule when it's posted in December, and update `smallGroup.scheduleNote`.
- ICL à la carte prices and the course catalog: `iclAlaCarte`, `iclCourses`
- Discounts and ESA text: `aid`, `esaLabel`, `esaJanNote`, `settings.esaAnnual`
- Booking link, follow-up promise, Foundation link: `settings`

## Copy rules
- RadAcad is **not a school**. "School" is only ever a verb ("School differently.").
- "How does RadAcad work?" positions RadAcad as what students do *instead of* school.
