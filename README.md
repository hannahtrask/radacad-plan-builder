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
- **Left, seven sections:** 1) Grade (5–12; grade sets the daily routine, small group classes show for 6–8 only, close support for 9–12 only) 2) Example plans 3) Where does school happen? (with "What is ICL Academy?" / "What is Aeon School?" explainers) 4) Which days? (tap individual days; tier buttons fill a default pattern) 5) Add-ons, small group classes, ICL à la carte 6) Start date 7) Send.
- **Right:** a timed week (8:00–3:45) plus the price. On phones, a black bar shows the total and "See the week" opens it full screen.

## The week planner
- Every membership day: **Goals** 8:15–8:30, **Lunch** 12:00–12:30, **Final check-in** 3:15–3:30.
- Check-ins (green dots): high school gets one midday check-in; middle school gets one at every transition (the end of each block); **close support** adds hourly check-ins.
- **RadAcad small group classes** sit at their real times (`smallGroup.classes[].sessions`).
- **Estimated** (dashed, striped): 1:1 coaching (1 hr per weekly hour), single-subject classes (three 1-hr sessions each), ICL à la carte (45 min live for live courses + 3.5 hrs independent work per course), weekly check-in session (30 min), and full-time ICL/Aeon (classes mornings, coursework afternoons).
- Estimated items are spread across membership days and through the day (`PREF` in `schedule()` in `embed.js`). Anything that doesn't fit is listed under the grid.

## Pricing rules
- Membership by days picked: 1–2 days $350, 3 days $650, 4 days $950, 5 days $1,200. Two-day plans are Mon–Thu. Picking a class adds its days; removing a day removes classes that meet that day (with a note).
- ICL packages ($2,875 live, $2,425 self-paced) and Aeon ($1,200/mo + $10,500/semester) include the full week.
- Income-based 10%/20% and JHSC merit 25%/50% apply to the membership portion only (capped at 100% combined).
- Need-based scholarship: slider, None or $2,000–$15,000 a year, applied like ESA as a yearly credit.
- **Wyoming ESA** ($7,000/yr) is on by default for fall and January. Headline price = monthly − (ESA + need-based) ÷ payments (9 fall, 5 January), never below $0; leftover credit goes to semester fees.
- Fine print: `settings.finePrint`.

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
