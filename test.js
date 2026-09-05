// Run: node test.js  — loads the pure-logic block from index.html and checks the progression rule.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const m = { exports: {} }; vm.runInNewContext(core, { module: m });
const GT = m.exports;
const S = { upperPct: 5, lowerPct: 10, minStepKg: 1, upperIncrementKg: 2.5, lowerIncrementKg: 5, dropPct: 5 };
const sets = (w, ...reps) => reps.map((r, i) => ({ setIndex: i, weightKg: w, reps: r, done: true }));
const upper = { tag: 'upper', repMin: 10, repMax: 14 }, lower = { tag: 'lower', repMin: 10, repMax: 14 }, dl = { tag: 'lower', repMin: 6, repMax: 8 };
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('no history → none', () => assert.equal(GT.suggest(upper, [], S).action, 'none'));
t('all sets at top (upper, 40 kg) → +2 (5%)', () => { const s = GT.suggest(upper, sets(40, 14, 14, 14), S); assert.equal(s.action, 'up'); assert.equal(s.weightKg, 42); assert.equal(s.deltaKg, 2); });
t('upper 100 kg → capped at +2.5', () => assert.equal(GT.suggest(upper, sets(100, 14, 14), S).weightKg, 102.5));
t('upper 6 kg → floor +1', () => assert.equal(GT.suggest(upper, sets(6, 14, 14), S).weightKg, 7));
t('all sets at top (lower, 80 kg) → +5 (10% capped)', () => { const s = GT.suggest(lower, sets(80, 14, 15, 14), S); assert.equal(s.action, 'up'); assert.equal(s.weightKg, 85); });
t('lower 12.5 kg → +1.5 (10% rounded to 0.5)', () => assert.equal(GT.suggest(lower, sets(12.5, 14, 14), S).weightKg, 14));
t('deadlift 6-8 range at top → +5', () => { const s = GT.suggest(dl, sets(100, 8, 8, 8), S); assert.equal(s.action, 'up'); assert.equal(s.weightKg, 105); });
t('bodyweight (0 kg) at top → reps', () => { const s = GT.suggest({ tag: 'other', repMin: 12, repMax: 20 }, sets(0, 20, 20), S); assert.equal(s.action, 'reps'); });
t('assisted at top → less assistance', () => { const s = GT.suggest({ tag: 'upper', repMin: 6, repMax: 10, assisted: true }, sets(57, 10, 10, 10), S); assert.equal(s.action, 'up'); assert.equal(s.weightKg, 54.5); assert.equal(s.deltaKg, -2.5); });
t('assisted below bottom → keep or add 5%', () => { const s = GT.suggest({ tag: 'upper', repMin: 6, repMax: 10, assisted: true }, sets(57, 8, 5), S); assert.equal(s.action, 'down'); assert.equal(s.weightKg, 57); assert.equal(s.altKg, 60); });
t('assisted reaches 0 → reps', () => { const s = GT.suggest({ tag: 'upper', repMin: 6, repMax: 10, assisted: true }, sets(0, 10, 10), S); assert.equal(s.action, 'reps'); });
t('assisted never below 0', () => assert.equal(GT.suggest({ tag: 'upper', repMin: 6, repMax: 10, assisted: true }, sets(0.5, 10, 10), S).weightKg, 0));
t('one set below bottom → keep or drop 5%', () => { const s = GT.suggest(lower, sets(80, 12, 11, 9), S); assert.equal(s.action, 'down'); assert.equal(s.weightKg, 80); assert.equal(s.altKg, 76); });
t('drop rounds to 0.5 kg', () => { const s = GT.suggest(upper, sets(22.5, 12, 8), S); assert.equal(s.altKg, 21.5); });
t('in range, not all at top → keep', () => { const s = GT.suggest(upper, sets(40, 14, 13, 12), S); assert.equal(s.action, 'keep'); assert.equal(s.weightKg, 40); });
t('undone sets are ignored', () => { const prev = sets(40, 14, 14).concat([{ setIndex: 2, weightKg: 40, reps: 3, done: false }]); assert.equal(GT.suggest(upper, prev, S).action, 'up'); });
t('custom settings respected', () => { const s = GT.suggest(lower, sets(60, 14, 14), { lowerPct: 10, lowerIncrementKg: 2.5, minStepKg: 1, dropPct: 10 }); assert.equal(s.weightKg, 62.5); });
t('top weight used when sets differ', () => { const s = GT.suggest(upper, [{ setIndex: 0, weightKg: 42.5, reps: 14, done: true }, { setIndex: 1, weightKg: 40, reps: 14, done: true }], S); assert.equal(s.weightKg, 44.5); });

// Simulate three fake sessions end to end through newWorkout/lastSetsFor.
t('three fake sessions: prefill and suggestion follow the latest session', () => {
  const D = GT.emptyData(); const day = D.days[0]; const bench = D.exercises.find(e => e.name === 'Dumbbell bench press');
  const doSession = (kg, reps, daysAgo) => { const w = GT.newWorkout(D, day); w.startedAt = Date.now() - daysAgo * 864e5; w.endedAt = w.startedAt + 3600e3;
    w.sets.filter(s => s.exerciseId === bench.id).forEach(s => { s.weightKg = kg; s.reps = reps; s.done = true; }); D.workouts.push(w); };
  doSession(20, 10, 10); doSession(20, 10, 6); doSession(22.5, 5, 2);
  const w = GT.newWorkout(D, day); const bs = w.sets.filter(s => s.exerciseId === bench.id);
  assert.equal(bs.length, 3); assert.equal(bs[0].weightKg, 22.5); assert.equal(bs[0].reps, 5);
  const last = GT.lastSetsFor(D, bench.id, w.id); const s = GT.suggest(bench, last.sets, D.settings);
  assert.equal(s.action, 'down'); assert.equal(s.altKg, 21.5);
  const rowing = w.exercises.find(e => e.timed); assert.ok(rowing); assert.equal(w.sets.find(x => x.exerciseId === rowing.id).seconds, 300);
});
t('default program shape', () => { const D = GT.emptyData(); assert.equal(D.days.length, 3); assert.equal(D.days[0].items.filter(i => i.enabled).length, 9);
  assert.equal(D.days[2].items.filter(i => !i.enabled).length, 3); const rdl = D.exercises.find(e => e.name === 'Romanian deadlift'); assert.equal(rdl.repMin, 6); assert.equal(rdl.repMax, 8);
  const pu = D.exercises.find(e => e.name === 'Assisted pull-up'); assert.ok(pu.assisted); assert.equal(pu.repMax, 10); assert.equal(D.exercises.find(e => e.name === 'Cross crunch').repMax, 20); });
t('migrate v1 → v2 updates untouched ranges, keeps edited ones', () => { const old = GT.emptyData(); old.version = 1; old.exercises.forEach(e => { e.assisted = false; e.repMin = e.name.includes('deadlift') ? 6 : 10; e.repMax = e.name.includes('deadlift') ? 8 : 14; });
  const edited = old.exercises.find(e => e.name === 'Cable flyes'); edited.repMin = 8; edited.repMax = 12; GT.migrate(old);
  assert.equal(old.version, 2); assert.equal(old.exercises.find(e => e.name === 'Dumbbell bench press').repMax, 10); assert.equal(edited.repMax, 12); assert.ok(old.exercises.find(e => e.name === 'Assisted pull-up').assisted); });
console.log(`\n${n} tests passed`);

// ---- History import (CSV / JSON) ----
t('CSV with sets count → one workout per date, identical sets', () => {
  const D = GT.emptyData();
  const rows = GT.parseHistory('date,exercise,sets,reps,kg,day\n2026-08-24,Romanian deadlift,4,10,10,Day 1\n2026-08-24,Dumbbell bench press,4,10,10,Day 1\n2026-08-26,Sumo deadlift,4,12,2.5,Day 2');
  assert.equal(rows.length, 3); const res = GT.importHistory(D, rows);
  assert.equal(res.workouts, 2); assert.equal(res.sets, 12); assert.equal(res.exercisesCreated, 0);
  const w = D.workouts[0]; assert.equal(w.dayName, D.days[0].name); assert.equal(w.dayId, D.days[0].id);
  const rdl = D.exercises.find(e => e.name === 'Romanian deadlift'); const last = GT.lastSetsFor(D, rdl.id); assert.equal(last.sets.length, 4); assert.equal(last.sets[0].weightKg, 10);
});
t('CSV per-set rows, semicolon, decimal comma, day-first date, unknown exercise created', () => {
  const D = GT.emptyData();
  const rows = GT.parseHistory('Date;Exercise;Set;Weight;Reps\n24-08-2026;Leg press;1;80,5;12\n24-08-2026;Leg press;2;80,5;11');
  const res = GT.importHistory(D, rows); assert.equal(res.exercisesCreated, 1); assert.equal(res.sets, 2);
  assert.equal(D.workouts[0].sets[0].weightKg, 80.5); assert.equal(D.workouts[0].sets[1].reps, 11); assert.equal(D.workouts[0].dayName, 'Imported');
  assert.equal(new Date(D.workouts[0].startedAt).getDate(), 24);
});
t('JSON rows and timed rows', () => {
  const D = GT.emptyData();
  const rows = GT.parseHistory(JSON.stringify([{ date: '2026-08-24', exercise: 'Rowing (warm-up)', time: '5:00' }, { date: '2026-08-24', exercise: 'Cross crunch', sets: 3, reps: 17, note: 'bodyweight' }]));
  const res = GT.importHistory(D, rows); assert.equal(res.workouts, 1); assert.equal(res.sets, 4);
  const row = D.workouts[0].sets.find(s => s.seconds); assert.equal(row.seconds, 300);
  const cc = D.exercises.find(e => e.name === 'Cross crunch'); assert.equal(D.workouts[0].exerciseNotes[cc.id], 'bodyweight');
});
t('CSV export round-trips', () => {
  const D = GT.emptyData(); GT.importHistory(D, GT.parseHistory('date,exercise,sets,reps,kg\n2026-08-24,Romanian deadlift,2,10,10'));
  const csv = GT.historyToCSV(D); assert.ok(csv.startsWith('date,day,exercise,set,weight_kg,reps,seconds,note'));
  const D2 = GT.emptyData(); const res = GT.importHistory(D2, GT.parseHistory(csv)); assert.equal(res.sets, 2); assert.equal(D2.workouts[0].sets[1].setIndex, 1);
});
t('bad input throws a readable error', () => { assert.throws(() => GT.parseHistory('just some text\nmore'), /header/); });
console.log(`\n${n} tests passed (with import)`);
