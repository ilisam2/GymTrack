# GymTrack

Minimal offline workout tracker. One `index.html`, no build step, no backend, no accounts. All data stays in the browser's localStorage.

## Files

- `index.html` – the whole app (vanilla JS + CSS)
- `manifest.webmanifest`, `sw.js`, `icon-*.png` – make it installable and usable offline
- `test.js` – checks the progression rule with fake sessions (`node test.js`)

## Put it on your phone

The service worker needs HTTPS (or localhost), so host the files somewhere static. GitHub Pages is the easiest:

1. In this repo go to Settings → Pages, pick the branch and the root folder, save.
2. Open the Pages URL on your phone.
3. iPhone (Safari): tap Share → "Add to Home Screen".
   Android (Chrome): tap the ⋮ menu → "Install app" or "Add to Home screen".
4. Open it from the home screen once while online. After that it works offline.

Data is per browser and per site. Use Settings → Export JSON as your backup and Import JSON to restore.

## Importing past sessions

Settings → Import history accepts a CSV or JSON file, or pasted text, and adds the sessions to your history without replacing anything. Minimal CSV:

```
date,exercise,sets,reps,kg,day
2026-08-24,Romanian deadlift,4,10,10,Day 1
2026-08-24,Dumbbell bench press,4,10,10,Day 1
```

A blank template of the default program is in `history-template.csv`: fill in date, reps and kg, leave rows you did not do without a date, and import it. Use `set` (one row per set) instead of `sets` when sets differ. Optional columns: note, time (m:ss) for timed work, duration (minutes), tag. Dates may be `2026-08-24` or `24-08-2026` (day first). Comma, semicolon or tab separated. JSON is an array of objects with the same field names. Unknown exercise names are created in the library. Export history as CSV produces the same format.

## Restoring a backup stored in the repo

Backups contain your training data, so do not commit them to a public repo (`backups/` is git-ignored). To restore one from a link, upload it next to the app on private hosting and open `restore.html?file=<name>.json`. Otherwise use Settings → Import JSON.

## Updating

`index.html` is fetched network first, so a reload while online picks up a new version. Bump `CACHE` in `sw.js` when icons or the manifest change.

## Rep ranges and progression rule

Defaults in the seeded program:

| Exercise type | Reps | Examples |
|---|---|---|
| Deadlift variants | 6-8 | Romanian, sumo |
| Other compound lifts | 6-10 | squats, hip thrust, presses, rows, pulldown, pull-up, lunge |
| Isolation | 10-15 | curls, extensions, flyes, raises, hamstring curl, kickbacks |
| Core and bodyweight | 12-20 | crunches, leg raise, Pallof press |

Suggestion, based on the done sets of the last session for that exercise:

- Every set reached the top of the range: add a percentage of the current load (upper 5%, lower 10%), never less than the minimum step (1 kg) and never more than the cap (upper 2.5 kg, lower 5 kg). At 0 kg the suggestion is to add reps or load.
- Any set fell below the bottom: keep the load, or drop 5%.
- Otherwise keep the load.
- Assisted exercises (flag in the exercise editor): the logged weight is assistance, so the direction flips. Top of range means less assistance, below range means keep or add assistance.

All numbers are editable in Settings. The suggestion is shown, never applied automatically.

### Why these defaults

- Muscle growth is similar across loading ranges when sets are taken close to failure, while 1RM strength gains are larger with heavier loads (Schoenfeld et al., 2017; Lopez et al., 2021; Currier et al., 2023). Compound lifts therefore use a heavier range than isolation work.
- Hypertrophy improves as sets end closer to failure; strength gains do not depend on it (Robinson et al., 2024). Momentary failure is not required (Refalo et al., 2023). Stop 1 to 3 reps short of failure.
- Progress by load or by reps both work (Plotkin et al., 2022). The ACSM position stand recommends a 2 to 10% load increase once the target reps are met (American College of Sports Medicine, 2009). The percentage rule with a floor and cap follows that band.
- Weekly volume of about 10 or more sets per muscle produces more growth than lower volumes (Schoenfeld et al., 2016). Three to four sets per exercise across three days meets that.

### References

American College of Sports Medicine. (2009). Progression models in resistance training for healthy adults. *Medicine & Science in Sports & Exercise, 41*(3), 687-708. https://doi.org/10.1249/MSS.0b013e3181915670

Currier, B. S., Mcleod, J. C., Banfield, L., Beyene, J., Welton, N. J., D'Souza, A. C., Keogh, J. A. J., Lin, L., Coletta, G., Yang, A., Colenso-Semple, L., Lau, K. J., Verboom, A., & Phillips, S. M. (2023). Resistance training prescription for muscle strength and hypertrophy in healthy adults: A systematic review and Bayesian network meta-analysis. *British Journal of Sports Medicine, 57*(18), 1211-1220. https://doi.org/10.1136/bjsports-2023-106807

Lopez, P., Radaelli, R., Taaffe, D. R., Newton, R. U., Galvao, D. A., Trajano, G. S., Teodoro, J. L., Kraemer, W. J., Hakkinen, K., & Pinto, R. S. (2021). Resistance training load effects on muscle hypertrophy and strength gain: Systematic review and network meta-analysis. *Medicine & Science in Sports & Exercise, 53*(6), 1206-1216. https://doi.org/10.1249/MSS.0000000000002585

Plotkin, D., Coleman, M., Van Every, D., Maldonado, J., Oberlin, D., Israetel, M., Feather, J., Alto, A., Vigotsky, A. D., & Schoenfeld, B. J. (2022). Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations. *PeerJ, 10*, e14142. https://doi.org/10.7717/peerj.14142

Refalo, M. C., Helms, E. R., Trexler, E. T., Hamilton, D. L., & Fyfe, J. J. (2023). Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy: A systematic review with meta-analysis. *Sports Medicine, 53*(3), 649-665. https://doi.org/10.1007/s40279-022-01784-y

Robinson, Z. P., Pelland, J. C., Remmert, J. F., Refalo, M. C., Jukic, I., Steele, J., & Zourdos, M. C. (2024). Exploring the dose-response relationship between estimated resistance training proximity to failure, strength gain, and muscle hypertrophy: A series of meta-regressions. *Sports Medicine, 54*(9), 2209-2231. https://doi.org/10.1007/s40279-024-02069-2

Schoenfeld, B. J., Grgic, J., Ogborn, D., & Krieger, J. W. (2017). Strength and hypertrophy adaptations between low- vs. high-load resistance training: A systematic review and meta-analysis. *Journal of Strength and Conditioning Research, 31*(12), 3508-3523. https://doi.org/10.1519/JSC.0000000000002200

Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2016). Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. *Journal of Sports Sciences, 35*(11), 1073-1082. https://doi.org/10.1080/02640414.2016.1210197
