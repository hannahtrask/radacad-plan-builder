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
- **Left, six sections:** 1) Grade (5–12, with a "younger student" link to /getstarted) 2) Start from an example, or build your own (Build your own is the default; examples include the ICL live, ICL self-paced, and Aeon packages, with the ICL/Aeon explainers) 3) Which days? (day picker + two cards: Full week as the standard plan and Two-day; "Need a third or fourth day? Add $300 a day.") 4) Add-ons, small group classes, ICL à la carte 5) Start date 6) Send.
- **Right:** a timed week (8:00–3:45) plus the price. On phones, a black bar shows the total and "See the week" opens it full screen.
- Small group classes that meet at the same time as one already on the plan are greyed out ("Meets at the same time as Spanish"). Outside grades 6–8 the block shows a one-line explanation instead of disappearing.

## The week planner
- Every membership day: **Goals** 8:15–8:30, **Lunch** 12:00–12:30, **Final check-in** 3:15–3:30.
- Check-ins (green dots): high school gets one midday check-in; middle school gets one at every transition (the end of each block); **close support** adds hourly check-ins.
- **RadAcad small group classes** sit at their real times (`smallGroup.classes[].sessions`).
- **Estimated** (dashed, striped): 1:1 coaching (1 hr per weekly hour), single-subject classes (three 1-hr sessions each), ICL à la carte (45 min live for live courses + 3.5 hrs independent work per course), weekly check-in session (30 min), and full-time ICL/Aeon (classes mornings, coursework afternoons).
- Estimated items are spread across membership days and through the day (`PREF` in `schedule()` in `embed.js`). Anything that doesn't fit is listed under the grid.

## Pricing rules (Garrett, Nov 4)
- **Monthly plans** (no ICL or Aeon): membership by days picked (1–2 days $350, 3 $650, 4 $950, 5 $1,200; two-day plans are Mon–Thu), add-ons monthly, small group classes billed per semester ($1,250 fall, $1,800 spring). Headline = per month after ESA and need-based scholarship.
- **Up-front plans** (any ICL package, Aeon, or à la carte ICL course): one yearly total, paid before the student starts. Packages: ICL live $20,700, ICL self-paced $17,550, Aeon $27,300 (each includes the full-week membership). À la carte: $2,250 live / $1,700 self-paced per course, plus the year's membership. January: ICL is one semester at half price ($10,350 / $8,775; courses $1,125 / $850), Aeon is $22,500. Add-ons are shown as yearly totals. January deposits $900 live / $600 self-paced.
- Discounts: income-based 10%/20% and JHSC merit 25%/50% apply to the membership portion only (the $1,200/mo inside packages). Need-based slider $2,000–$15,000/yr and Wyoming ESA $7,000/yr come off the whole plan.
- Fine print switches to "Your membership runs for the full year of ICL/Aeon enrollment" plus the ICL or Aeon tuition terms whenever ICL or Aeon is on the plan.
- The word "fees" isn't used anywhere; it's "tuition."

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

## Round 5 (Garrett, Nov 6)
- **Encoding:** every non-ASCII character in `embed.js` is written as a `\uXXXX` escape, so the file decodes correctly even on a page with the wrong charset. The script tag also carries `charset="utf-8"`, and `_headers` sends a UTF-8 Content-Type. If you edit copy in `embed.js`, keep it ASCII or escape it; copy in `plans.json` can use normal characters.
- Step 1 is grade **and** start date. Steps are now: 1 grade + start, 2 example or build your own, 3 days, 4 add-ons, 5 send.
- Small group classes: grades 5–8 (`smallGroup.minGrade`). On monthly plans each class is a flat monthly line: (fall $1,250 + spring $1,800) ÷ 9, or spring ÷ 5 for January. Fine print adds "Small group classes are a semester commitment."
- **Clubs** (`clubs` in `plans.json`): Robotics Club, grades K–8, Wednesdays 2:00–3:30, $0 for members, Winter and Spring sessions as separate checkboxes. Picking it adds Wednesday to the membership if needed. Non-member pricing lives on the website club page, not here. Community Club stays a small group class but uses `"type": "club"` so it shows in the club color.
- Week colors: coach (goals, check-ins, weekly plan, 1:1 coaching) #a664ab; RadAcad classes (small group and single-subject) #1b6f69; clubs #259991; ICL/Aeon #d9fbd8. No black.
- Purple total block shows only what the family pays: "Your part: $X a month, nine payments" / "Your part: $X, paid before the student starts" / "Nothing out of pocket."
- Package cards show one number, after ESA and discounts: "$13,700, paid yearly" (January: "$3,350 for spring, paid yearly").
- ICL and Aeon explainers link to iclacademy.org and aeonschool.org (`explain.*.url`). The JHSC title and the Foundation line link to radacadfoundation.org/apply; the Foundation line is always visible.
