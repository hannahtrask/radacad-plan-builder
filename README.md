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

## Copy rules
- RadAcad is **not a school**. "School" is only ever a verb ("School differently.").
- "How does RadAcad work?" positions RadAcad as what students do *instead of* school.
