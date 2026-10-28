# Radical Minds Academy — Your Family, Your Plan

A plan builder for radicalmindsacademy.org/education-plans. Families build their plan step by step on the left while their student's weekly schedule and price update live on the right. Garrett gets an email, the family gets a copy plus the booking link, and every plan is logged to a Google Sheet.

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
Squarespace's GA4 integration loads `gtag`, so these events fire automatically: `plan_builder_start`, `plan_builder_answer`, `plan_builder_step` (shows where families drop off), `plan_builder_skip_quiz`, `plan_builder_plan`, `plan_builder_submit` (`value` = monthly total).

## How it's laid out
- **Left:** the step-by-step builder. About your student (grade, start date, coursework, days, needs), then a suggested plan with Garrett's example plans listed below it, then "Make it yours" (days, ICL Academy, coaching, classes), then send.
- **Right:** the student's week (Mon–Fri, built from their membership days, classes and add-ons) and the price, both updating live. On phones, the week opens as a full-screen sheet from "See the week" in the black bar.

## Pricing rules (from Garrett's "RadAcad pricing — website version")
- Membership is priced by days: up to 2 days $350, each extra day +$300, and the full week caps at $1,200 (so 3 days $650, 4 days $950).
- No member discount. Every add-on is one price for everyone.
- Small group classes (grades 6–8) are in two blocks, Mon/Wed and Tue/Thu. Adding a class in a block adds those days to the membership automatically, and removing it takes them back off. Class fees ($1,250 fall, $1,800 spring) are billed by the semester and shown separately from the monthly total.
- ICL full-time packages ($2,875 live, $2,425 self-paced) include the full-week membership. ICL single courses ($280 live, $225 self-paced, max 3) work with any membership.
- Close support ($250) only shows for grades 9–12. Middle schoolers get transition check-ins automatically.
- Wyoming ESA estimate = (monthly × 9 + a full year of class fees − $7,000) ÷ 9, shown as "about $X/mo after Wyoming ESA" or "fully covered."
- **Kept off the site, per Garrett:** ICL payouts, per-hour math, margins, referral arrangements. **Aeon is in `plans.json` with `"hidden": true`**, waiting on Aeon's partner rate, and isn't wired into the builder yet.

Every example plan in Garrett's table prices exactly as he listed it (checked in testing).

## Updating prices and classes (billed hourly)
Edit `public/plans.json`, then `git add . && git commit -m "Update prices" && git push`.
- Membership: `membership.twoDayPrice`, `extraDayPrice`, `fullWeekPrice`, `dropInPrice`
- Add-ons: `addOns.close`, `checkin`, `coaching`, `subject` (each has `price`)
- Small group classes: `smallGroup.fallFee`, `springFee`. **Class names go in `smallGroup.blocks[].classes`**, e.g. `"classes": ["Robotics", "Spanish I"]`. While a block's list is empty, families see "Class to choose together."
- ICL: `icl.packages.live/async.price`, `icl.alaCarte.live/async.price`
- Example plans: `presets` (each is a `config` the builder prices itself, so prices never need updating there)
- Booking link, ESA amount, Foundation link, start dates: `settings`

## How plans get suggested
The rules are in `suggestConfig()` in `embed.js`:
- "Interested in ICL Academy" → Full week + ICL live (the days question is skipped)
- Days answer sets the membership (2, 3, 4, or every weekday; "not sure" starts at 2)
- "Daily structure" → Close support for grades 9–12 (middle schoolers already get it)
- "Weekly planning check-in" → Weekly check-in session
- "One-on-one coaching or tutoring" → one coaching session a week
- "A full class in one subject" → one single subject class
- "Classes with other students" (grades 6–8 only) → one Mon/Wed small group class
- Already in an online school and nothing else picked → Weekly check-in session ("Online school check-in")
- If the suggestion matches one of Garrett's example plans, it uses that plan's name. Otherwise it's "Your suggested plan."
- Skipping the questions shows every example plan equally, with nothing pre-selected.

Every plan includes a membership (or an ICL package, which includes one). Nothing can be added without it.

## Copy rules
- RadAcad is **not a school**. "School" is only ever a verb ("School differently.").
- "How does RadAcad work?" positions RadAcad as what students do *instead of* school.
