# PVE compact UI and damage EXP

Base: 26f2e530179806e830ae87f8c55037896d231e2b. Direct main update requested by user.

- Removed the standalone pattern region between encounter and party. Pattern name, condition, target, progress and outcomes reuse the existing monster-right intent area. Extra class controls and relic detail sit below party.
- Skill badges contain their complete label/result from initial insertion; animation changes emphasis only. Reduced presentation retains outcomes.
- Shop lists insufficient funds before any confirmation and guards all confirmation entry points. Server reservation checks the actual discounted price without consuming the discount.
- Visible flame labels are 불씨; machine identifiers remain unchanged.
- Every valid monster attack awards EXP equal to final nonnegative integer damage packets, including Full Burst components. Invalid attacks and zero damage award zero. DOT does not grant attack EXP. Displayed damage, including overkill, is the basis. Existing class/augment EXP bonuses remain additive. Persisted turn guard prevents repeated awards.
- Thresholds remain 50/150/350/750. Choices remain at existing combat-end windows. No balance tuning or midcombat choice popup introduced.
- Earlier EXP can exhaust unique reward candidates. Human/AI pickers with no unowned candidate skip without duplicate grants; automatic assignments use only unowned candidates.

Validation: npm test 2353 passed, 0 failed. All 13 class and 3 mixed-party expedition routes pass, with additional no-duplicate-relic assertions. npm run check parses 241 JS/TS files and checks module/HTML references. Eight new regressions cover damage EXP, collision, armor, Full Burst, retry/reconnect projection, choice timing, compact pattern, shop and flame labels.

Actual browser testing intentionally not performed, per user request. No migration or production database data changes.
