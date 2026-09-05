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

## Program review (v3)

The seeded program was audited for weekly volume per muscle, movement-pattern balance and session structure. Findings on the original version: no vertical push, no direct side-delt, rear-delt or external-rotation work, no calf work, no anti-rotation core work, glutes at about 28 weekly sets with the hip thrust on two days, biceps at about 20 weekly sets from two curls on top of four pulls, and every day near 78 minutes at 90 s rest. Every change below is a swap or an enabled optional, so no day has more than nine exercises including the warm-up. Removed exercises stay in each day as disabled optionals.

| Day | Order (sets) |
|---|---|
| Day 1 | Rowing, Romanian deadlift (4), Dumbbell bench press (4), Barbell front squat (4), Underhand lat pulldown (3), Smith machine bent-over row (3), Lying single dumbbell tricep extension (3), Face pull (3), Standing calf raise (3) |
| Day 2 | Rowing, Barbell back squat (4), Dumbbell hamstring curl (3), Sumo deadlift (4), Dumbbell raised lunge (3), Barbell hip thrust (4), Standing calf raise (3), Cross crunch (3), Pallof press (3) |
| Day 3 | Rowing, Dumbbell incline close-grip hammer press (4), Assisted pull-up (4), Overhead press (3), Chest-supported low row (4), Lateral raise (3), Cable flyes (3), Dumbbell bench hammer curl (3), Hanging leg raise (3) |

Changes and reasons:

- Overhead press replaces the upright row, and lateral raise is enabled. Horizontal pressing barely activates the medial deltoid, while the shoulder press and lateral raise do (Campos et al., 2020). Lateral raises to failure grow the lateral deltoid in trained lifters (Larsen et al., 2025). Upright rows above 90 degrees are associated with impingement signs in recreational lifters, and external-rotator strengthening is inversely associated (Kolber et al., 2014). The standing dumbbell press gives the highest deltoid activation of the press variants (Saeterbakken & Fimland, 2013).
- Face pull is enabled on Day 1. Lifters with impingement show weaker external rotators and lower trapezius (Kolber et al., 2017). The program had no external-rotation or direct rear-delt work.
- Standing calf raise is enabled on Day 1 and Day 2 (6 weekly sets). The triceps surae is hard to grow and the standing variant is clearly superior to seated (Kinoshita et al., 2023). Six to twelve weekly sets all produced growth in untrained women, with a dose effect (Kassiano et al., 2024).
- Hip thrust is dropped from Day 1 and kept on Day 2. Hip thrust and back squat produce similar gluteus maximus growth at equal set volume (Plotkin et al., 2023). Glutes fall from about 28 to about 21 weekly sets, still inside the 12 to 20 plus range suggested for trained lifters (Baz-Valle et al., 2022).
- One curl and one tricep extension per week instead of two of each. Adding single-joint arm exercises to multi-joint pulling and pressing produced no extra arm growth or strength in untrained men (Gentil et al., 2013), trained men (de Franca et al., 2015) or trained women (Barbalho et al., 2018).
- Pallof press replaces the machine crunch so core work includes anti-rotation, and cable kickbacks are dropped as the fourth glute exercise on Day 2.
- Order: Day 1 alternates lower and upper lifts instead of stacking three hip-extension lifts. Day 2 opens with the back squat. On Day 3 the flyes move behind the compounds. Strength gains are largest in the exercises done first in a session (Nunes et al., 2021).

Weekly set estimate after the change, counting a set toward each muscle it trains substantially: chest 11, lats 14, upper back 12, front delts 11, side delts 6, rear delts 6, biceps 17, triceps 14, quads 13, hamstrings 12, glutes 21, calves 6, abs 6, anti-rotation 3. Sessions run roughly 70 minutes at 90 s rest.

Existing installs are migrated automatically when a day still matches the previous default. Customised days are left alone.

### Program review references

Barbalho, M., Coswig, V. S., Raiol, R., Steele, J., Fisher, J., Paoli, A., & Gentil, P. (2018). Effects of adding single joint exercises to a resistance training programme in trained women. *Sports, 6*(4), 160. https://doi.org/10.3390/sports6040160

Baz-Valle, E., Balsalobre-Fernandez, C., Alix-Fages, C., & Santos-Concejero, J. (2022). A systematic review of the effects of different resistance training volumes on muscle hypertrophy. *Journal of Human Kinetics, 81*, 199-210. https://doi.org/10.2478/hukin-2022-0017

Campos, Y. A. C., Vianna, J. M., Guimaraes, M. P., Oliveira, J. L. D., Hernandez-Mosqueira, C., da Silva, S. F., & Marchetti, P. H. (2020). Different shoulder exercises affect the activation of deltoid portions in resistance-trained individuals. *Journal of Human Kinetics, 75*, 5-14. https://doi.org/10.2478/hukin-2020-0033

de Franca, H. S., Branco, P. A. N., Guedes Junior, D. P., Gentil, P., Steele, J., & Teixeira, C. V. L. S. (2015). The effects of adding single-joint exercises to a multi-joint exercise resistance training program on upper body muscle strength and size in trained men. *Applied Physiology, Nutrition, and Metabolism, 40*(8), 822-826. https://doi.org/10.1139/apnm-2015-0109

Gentil, P., Soares, S. R. S., Pereira, M. C., da Cunha, R. R., Martorelli, S. S., Martorelli, A. S., & Bottaro, M. (2013). Effect of adding single-joint exercises to a multi-joint exercise resistance-training program on strength and hypertrophy in untrained subjects. *Applied Physiology, Nutrition, and Metabolism, 38*(3), 341-344. https://doi.org/10.1139/apnm-2012-0176

Kassiano, W., Costa, B. D. V., Kunevaliki, G., Lisboa, F., Tricoli, I., Francsuel, J., Lima, L., Stavinski, N., & Cyrino, E. S. (2024). Bigger calves from doing higher resistance training volume? *International Journal of Sports Medicine, 45*(10), 739-747. https://doi.org/10.1055/a-2316-7885

Kinoshita, M., Maeo, S., Kobayashi, Y., Eihara, Y., Ono, M., Sato, M., Sugiyama, T., Kanehisa, H., & Isaka, T. (2023). Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training. *Frontiers in Physiology, 14*, 1272106. https://doi.org/10.3389/fphys.2023.1272106

Kolber, M. J., Cheatham, S. W., Salamh, P. A., & Hanney, W. J. (2014). Characteristics of shoulder impingement in the recreational weight-training population. *Journal of Strength and Conditioning Research, 28*(4), 1081-1089. https://doi.org/10.1519/JSC.0000000000000250

Kolber, M. J., Hanney, W. J., Cheatham, S. W., Salamh, P. A., Masaracchio, M., & Liu, X. (2017). Shoulder joint and muscle characteristics among weight-training participants with and without impingement syndrome. *Journal of Strength and Conditioning Research, 31*(4), 1024-1032. https://doi.org/10.1519/JSC.0000000000001554

Larsen, S., Wolf, M., Schoenfeld, B. J., Sandberg, N. O., Fredriksen, A. B., Kristiansen, B. S., van den Tillaar, R., Swinton, P. A., & Falch, H. N. (2025). Dumbbell versus cable lateral raises for lateral deltoid hypertrophy: An experimental study. *Frontiers in Physiology, 16*, 1611468. https://doi.org/10.3389/fphys.2025.1611468

Nunes, J. P., Grgic, J., Cunha, P. M., Ribeiro, A. S., Schoenfeld, B. J., de Salles, B. F., & Cyrino, E. S. (2021). What influence does resistance exercise order have on muscular strength gains and muscle hypertrophy? A systematic review and meta-analysis. *European Journal of Sport Science, 21*(2), 149-157. https://doi.org/10.1080/17461391.2020.1733672

Plotkin, D. L., Rodas, M. A., Vigotsky, A. D., McIntosh, M. C., Breeze, E., Ubrik, R., Robitzsch, C., Agyin-Birikorang, A., Mattingly, M. L., Michel, J. M., Kontos, N. J., Lennon, S., Fruge, A. D., Wilburn, C. M., Weimar, W. H., Bashir, A., Beyers, R. J., Henselmans, M., Contreras, B. M., & Roberts, M. D. (2023). Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift. *Frontiers in Physiology, 14*, 1279170. https://doi.org/10.3389/fphys.2023.1279170

Saeterbakken, A. H., & Fimland, M. S. (2013). Effects of body position and loading modality on muscle activity and strength in shoulder presses. *Journal of Strength and Conditioning Research, 27*(7), 1824-1831. https://doi.org/10.1519/JSC.0b013e318276b873

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
