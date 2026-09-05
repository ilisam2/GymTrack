// Run: node test.js — progression, program balance, saved-data migration and history import.
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
t('unfinished working sets block an increase', () => { const prev = sets(40, 14, 14).concat([{ setIndex: 2, weightKg: 40, reps: 3, done: false }]); assert.equal(GT.suggest(upper, prev, S).action, 'keep'); });
t('custom settings respected', () => { const s = GT.suggest(lower, sets(60, 14, 14), { lowerPct: 10, lowerIncrementKg: 2.5, minStepKg: 1, dropPct: 10 }); assert.equal(s.weightKg, 62.5); });
t('mixed loads are repeated instead of promoting every set to the top load', () => { const s = GT.suggest(upper, [{ setIndex: 0, weightKg: 42.5, reps: 14, done: true }, { setIndex: 1, weightKg: 40, reps: 14, done: true }], S); assert.equal(s.action, 'keep'); assert.equal(s.weightKg, 42.5); });

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
  assert.equal(D.days[2].items.filter(i => !i.enabled).length, 4); const rdl = D.exercises.find(e => e.name === 'Romanian deadlift'); assert.equal(rdl.repMin, 6); assert.equal(rdl.repMax, 8);
  const pu = D.exercises.find(e => e.name === 'Assisted pull-up'); assert.ok(pu.assisted); assert.equal(pu.repMax, 10); assert.equal(D.exercises.find(e => e.name === 'Cross crunch').repMax, 20); });
t('migrate v1 updates untouched ranges, keeps edited ones', () => { const old = legacyData(); old.version = 1; old.exercises.forEach(e => { e.assisted = false; e.repMin = e.name.includes('deadlift') ? 6 : 10; e.repMax = e.name.includes('deadlift') ? 8 : 14; });
  const edited = old.exercises.find(e => e.name === 'Cable flyes'); edited.repMin = 8; edited.repMax = 12; GT.migrate(old);
  assert.equal(old.version, 5); assert.equal(old.exercises.find(e => e.name === 'Dumbbell bench press').repMax, 10); assert.equal(edited.repMax, 12); assert.ok(old.exercises.find(e => e.name === 'Assisted pull-up').assisted);
  assert.ok(GT.newWorkout(old, old.days[2]).exercises.some(e => e.name === 'Dead bug (per side)')); });

// Independent record of the shipped v2 layout, including its disabled items.
function legacyData() {
  const d = Object.assign(GT.emptyData(), GT.defaultProgram(2)); d.version = 2;
  d.exercises = d.exercises.filter(e => e.name !== 'Dead bug (per side)');
  const layouts = [
    [['Rowing (warm-up)', 'Romanian deadlift', 'Barbell front squat', 'Barbell hip thrust', 'Dumbbell bench press', 'Underhand lat pulldown', 'Smith machine bent-over row', 'Dumbbell bench bicep curl', 'Lying single dumbbell tricep extension'], ['Face pull']],
    [['Rowing (warm-up)', 'Sumo deadlift', 'Dumbbell hamstring curl', 'Barbell back squat', 'Dumbbell raised lunge', 'Barbell hip thrust', 'Cable donkey kickbacks', 'Cross crunch', 'Machine abdominal crunch'], ['Standing calf raise', 'Pallof press']],
    [['Rowing (warm-up)', 'Dumbbell incline close-grip hammer press', 'Cable flyes', 'Assisted pull-up', 'Chest-supported low row', 'Dumbbell upright row', 'Dumbbell bench hammer curl', 'Incline lying single-arm tricep extension', 'Hanging leg raise'], ['Overhead press', 'Lateral raise', 'Face pull']],
  ];
  d.days.forEach((day, i) => { day.items = layouts[i].flatMap((names, group) => names.map(name => ({ exerciseId: d.exercises.find(e => e.name === name).id, enabled: group === 0 }))); });
  return d;
}
const layout = d => JSON.stringify(d.days.map(day => ({ name: day.name, items: day.items.map(i => [d.exercises.find(e => e.id === i.exerciseId).name, i.enabled]) })));

t('major regions receive work on at least two days; missing movement types are enabled', () => {
  const d = GT.emptyData(), days = d.days.map(day => GT.newWorkout(d, day).exercises);
  const regions = {
    quads: ['Barbell front squat', 'Barbell back squat', 'Dumbbell raised lunge'],
    glutes: ['Romanian deadlift', 'Barbell back squat', 'Barbell hip thrust'],
    hamstrings: ['Romanian deadlift', 'Dumbbell hamstring curl'],
    chest: ['Dumbbell bench press', 'Dumbbell incline close-grip hammer press'],
    back: ['Underhand lat pulldown', 'Assisted pull-up', 'Chest-supported low row'],
    shoulders: ['Dumbbell bench press', 'Face pull', 'Overhead press', 'Lateral raise'],
    biceps: ['Underhand lat pulldown', 'Assisted pull-up', 'Dumbbell bench hammer curl'],
    triceps: ['Dumbbell bench press', 'Overhead press', 'Incline lying single-arm tricep extension'],
    calves: ['Standing calf raise'], core: ['Pallof press', 'Machine abdominal crunch', 'Dead bug (per side)'],
  };
  for (const [region, names] of Object.entries(regions)) assert.ok(days.filter(es => es.some(e => names.includes(e.name))).length >= 2, region);
  for (const name of ['Overhead press', 'Lateral raise', 'Face pull', 'Standing calf raise', 'Pallof press', 'Dead bug (per side)', 'Dumbbell raised lunge', 'Dumbbell hamstring curl', 'Chest-supported low row']) {
    assert.ok(days.some(es => es.some(e => e.name === name)), name);
  }
  const totals = days.map(es => es.filter(e => !e.timed).reduce((s, e) => s + e.sets, 0));
  assert.deepEqual(totals, [24, 21, 24]); assert.ok(totals.reduce((s, n) => s + n, 0) < 72);
  days.forEach(es => { assert.equal(es.filter(e => e.timed).length, 1); assert.equal(new Set(es.map(e => e.id)).size, es.length); });
});
t('v2 migration preserves history, active workout, exercise IDs and custom prescriptions', () => {
  const d = legacyData(); const ex = d.exercises.find(e => e.name === 'Dumbbell bench press');
  ex.sets = 4; ex.repMin = 8; ex.repMax = 12;
  const past = GT.newWorkout(d, d.days[0]); past.endedAt = Date.now();
  past.sets.filter(s => s.exerciseId === ex.id).forEach(s => { s.done = true; s.weightKg = 20; s.reps = 11; });
  d.workouts.push(past); d.activeWorkout = GT.newWorkout(d, d.days[2]);
  d.bodyweight.push({ date: '2026-09-01', kg: 60 }); d.settings.restSec = 120;
  const snapshots = JSON.stringify([d.workouts, d.activeWorkout, d.bodyweight, d.settings]);
  const exercises = JSON.stringify(d.exercises), ids = d.days.map(day => day.id);
  GT.migrate(d);
  assert.equal(d.version, 5); assert.equal(layout(d), layout(GT.emptyData()));
  for (const before of JSON.parse(exercises)) { const after = d.exercises.find(e => e.id === before.id); for (const key of Object.keys(before)) assert.deepEqual(after[key], before[key]); }
  assert.deepEqual(d.days.map(day => day.id), ids);
  assert.equal(JSON.stringify([d.workouts, d.activeWorkout, d.bodyweight, d.settings]), snapshots);
  const next = GT.newWorkout(d, d.days[0]).sets.filter(s => s.exerciseId === ex.id);
  assert.equal(next.length, 4); assert.equal(next[0].weightKg, 20); assert.equal(next[0].reps, 11);
  const once = JSON.stringify(d); GT.migrate(d); assert.equal(JSON.stringify(d), once);
});
t('edited layouts, renamed or archived exercises, and added or removed days survive migration', () => {
  const edits = [
    d => { d.days[0].items[0].enabled = false; },
    d => { d.days[1].items.reverse(); },
    d => { d.days[2].name = 'My upper day'; },
    d => { d.days[0].items.pop(); },
    d => { d.days.push({ id: 'custom', name: 'Custom', items: [] }); },
    d => { d.days.pop(); },
    d => { d.days = []; },
    d => { d.exercises[0].name = 'Bike warm-up'; },
    d => { d.exercises[0].archived = true; },
  ];
  for (const edit of edits) {
    const d = legacyData(); edit(d); const before = JSON.stringify([d.days, d.exercises]);
    GT.migrate(d); const [days, exercises] = JSON.parse(before); assert.equal(JSON.stringify(d.days), JSON.stringify(days)); for (const ex of exercises) { const after = d.exercises.find(e => e.id === ex.id); for (const key of Object.keys(ex)) assert.deepEqual(after[key], ex[key]); } assert.equal(d.version, 5);
  }
});
t('existing dead bug library entry is reused without overwriting it', () => {
  const d = legacyData(), dead = { ...GT.emptyData().exercises.find(e => e.name === 'Dead bug (per side)'), sets: 2 };
  d.exercises.push(dead); GT.migrate(d);
  assert.equal(d.exercises.filter(e => e.name === dead.name).length, 1);
  assert.ok(d.days[2].items.some(i => i.enabled && i.exerciseId === dead.id)); assert.equal(dead.sets, 2);
});
t('history template matches the enabled program and set counts', () => {
  const d = GT.emptyData(), csv = fs.readFileSync(__dirname + '/history-template.csv', 'utf8');
  assert.equal(GT.parseHistory(csv).length, 0); // Empty dates must not import phantom sessions.
  const rows = GT.parseHistory(csv.replace(/^,/gm, '2026-09-01,'));
  const expected = d.days.flatMap((day, i) => GT.newWorkout(d, day).exercises.map(e => [e.name, `Day ${i + 1}`, e.sets, e.timed ? 300 : 0]));
  assert.equal(JSON.stringify(rows.map(r => [r.exercise, r.day, r.sets.length, r.sets[0].seconds])), JSON.stringify(expected));
});

t('v5 relayout: untouched v4 layout gains row, sumo and flyes; customised layout is kept', () => {
  const d4 = GT.defaultProgram(4); const d = { version: 4, exercises: d4.exercises.map(e => ({ ...e })), days: d4.days.map(x => ({ ...x, items: x.items.map(i => ({ ...i })) })), workouts: [], activeWorkout: null, bodyweight: [], settings: {} };
  const rdlId = d.exercises.find(e => e.name === 'Romanian deadlift').id; d.exercises.find(e => e.name === 'Romanian deadlift').sets = 4;
  GT.migrate(d); const on = (i) => d.days[i].items.filter(x => x.enabled).map(x => d.exercises.find(e => e.id === x.exerciseId).name);
  assert.equal(d.version, 5); assert.ok(on(0).includes('Smith machine bent-over row')); assert.ok(on(1).includes('Sumo deadlift')); assert.ok(on(2).includes('Cable flyes') && !on(2).includes('Incline lying single-arm tricep extension'));
  assert.equal(d.exercises.find(e => e.name === 'Romanian deadlift').id, rdlId); assert.equal(d.exercises.find(e => e.name === 'Romanian deadlift').sets, 4);
  const c = { version: 4, exercises: d4.exercises.map(e => ({ ...e })), days: d4.days.map(x => ({ ...x, items: x.items.map(i => ({ ...i })) })), workouts: [], activeWorkout: null, bodyweight: [], settings: {} };
  c.days[1].items.pop(); GT.migrate(c); assert.equal(c.version, 5); assert.ok(!c.days[0].items.some(x => x.enabled && c.exercises.find(e => e.id === x.exerciseId).name === 'Smith machine bent-over row'));
});

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

// Boot the actual application scripts against synthetic storage and a minimal DOM.
// This verifies migration and generated UI text without accessing a user's browser data.
function bootApp(saved, failSave = false) {
  const elements = new Map(), events = {};
  const element = () => ({ innerHTML: '', classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} });
  const document = { documentElement: element(), body: element(), querySelectorAll: () => [],
    querySelector: sel => { if (!elements.has(sel)) elements.set(sel, element()); return elements.get(sel); },
    addEventListener: (type, fn) => { events[type] = fn; } };
  let stored = JSON.stringify(saved), writes = 0;
  const context = vm.createContext({ document, navigator: {}, console: { error() {} },
    localStorage: { getItem: () => stored, setItem: (key, value) => { if (failSave) throw Error('Storage full'); stored = value; writes++; } },
    window: { scrollTo() {}, addEventListener() {} }, matchMedia: () => ({ matches: true, addEventListener() {} }),
    clearInterval() {}, setInterval() {}, clearTimeout() {}, setTimeout() {} });
  for (const script of html.matchAll(/<script(?: id="core")?>([\s\S]*?)<\/script>/g)) vm.runInContext(script[1], context);
  return { context, elements, events, document, stored: () => JSON.parse(stored), writes: () => writes };
}
t('saved default migrates on app boot, persists once, and renders working-set totals', () => {
  const app = bootApp(legacyData());
  assert.equal(app.stored().version, 5); assert.equal(layout(app.stored()), layout(GT.emptyData())); assert.equal(app.writes(), 1);
  vm.runInContext("go('program')", app.context);
  const content = app.elements.get('#view').innerHTML;
  for (const count of [24, 21, 24]) assert.ok(content.includes(`${count} working sets`));
  vm.runInContext("go('dayEdit', {dayEditId: D.days[2].id})", app.context);
  assert.ok(app.elements.get('#view').innerHTML.includes('Dead bug (per side)'));
  vm.runInContext("startWorkout(D.days[2].id)", app.context);
  const current = vm.runInContext('D.activeWorkout', app.context);
  assert.ok(current.exercises.some(e => e.name === 'Overhead press'));
  assert.ok(current.exercises.some(e => e.name === 'Dead bug (per side)'));
  assert.equal(bootApp(app.stored()).writes(), 0);
});
t('migration save failure retains loaded history and the reviewed program in memory', () => {
  const d = legacyData(); const past = GT.newWorkout(d, d.days[0]); past.endedAt = Date.now(); d.workouts.push(past);
  const app = bootApp(d, true);
  assert.equal(vm.runInContext('D.workouts[0].id', app.context), past.id);
  assert.equal(vm.runInContext('D.version', app.context), 5);
  assert.equal(app.stored().version, 2);
});


// ---- Compact training tools ----
const change = (app, dataset, value, extra = {}) => app.events.change({ target: { dataset, value, checked: false, hasAttribute: name => Object.hasOwn(extra, name), ...extra } });
t('one top-range set cannot satisfy a three-set prescription, even after deleting rows', () => {
  const e = { ...upper, sets: 3 };
  assert.equal(GT.suggest(e, sets(20, 14), S).action, 'keep');
  assert.equal(GT.suggest(e, sets(20, 14, 14, 14), S).action, 'up');
  assert.equal(GT.suggest(e, sets(20, 14, 14), S, 3).action, 'keep');
});
t('optional effort holds an increase at failure but does not invent missing effort', () => {
  for (const [rir, action] of [[0, 'keep'], [1, 'up'], [2, 'up'], [null, 'up']]) {
    const prev = sets(20, 14, 14, 14); prev[2].rir = rir;
    assert.equal(GT.suggest({ ...upper, sets: 3 }, prev, S).action, action);
  }
  assert.equal(GT.effortValue(''), null); assert.equal(GT.effortValue('bad'), null); assert.equal(GT.effortValue('0'), 0);
});
t('warm-up rows do not block progression or count as required working sets', () => {
  const prev = sets(20, 14, 14, 14).concat([{weightKg: 5, reps: 3, done: false, warmup: true}]);
  assert.equal(GT.suggest({ ...upper, sets: 3 }, prev, S).action, 'up');
});
t('exercise increments support fractional dumbbells and machine steps larger than the general cap', () => {
  assert.equal(GT.suggest({ ...upper, loadStepKg: 0.25 }, sets(4, 14, 14), S).weightKg, 4.25);
  assert.equal(GT.suggest({ ...upper, loadStepKg: 5 }, sets(40, 14, 14), S).weightKg, 45);
  assert.equal(GT.suggest({ ...upper, loadStepKg: 0.25 }, sets(4.25, 8), S).altKg, 4);
  assert.equal(GT.suggest({ ...upper, loadStepKg: 5, assisted: true }, sets(2.5, 14, 14), S).weightKg, 0);
  assert.equal(GT.stepFor({loadStepKg: 0.25}, S), 0.25);
});
t('dead bugs receive control guidance rather than a generic load increase', () => {
  const e = GT.emptyData().exercises.find(e => e.name === 'Dead bug (per side)');
  const result = GT.suggest(e, sets(0, 10, 10, 10), S);
  assert.equal(result.action, 'control'); assert.equal(result.weightKg, null);
});
t('a shorter previous session does not trigger a load increase for a longer next session', () => {
  const d = GT.emptyData(), w = GT.newWorkout(d, d.days[0], {sessionMinutes: 30}); w.endedAt = Date.now();
  const e = w.exercises.find(e => e.name === 'Dumbbell bench press'); assert.ok(e);
  w.sets.filter(s => s.exerciseId === e.id).forEach(s => {s.weightKg = 20; s.reps = 10; s.done = true;}); d.workouts.push(w);
  const next = GT.newWorkout(d, d.days[0]).exercises.find(x => x.id === e.id);
  assert.equal(GT.progressionFor(d, next).action, 'keep');
});
t('a weight-basis change does not carry old loads into prefill or progression', () => {
  const d = GT.emptyData(), w = GT.newWorkout(d, d.days[0]); w.endedAt = Date.now();
  const bench = d.exercises.find(e => e.name === 'Dumbbell bench press');
  w.sets.filter(s => s.exerciseId === bench.id).forEach(s => {s.weightKg = 40; s.reps = 10; s.done = true;}); d.workouts.push(w);
  bench.loadMode = 'total';
  assert.equal(GT.newWorkout(d, d.days[0]).sets.find(s => s.exerciseId === bench.id).weightKg, 0);
  assert.equal(GT.progressionFor(d, bench).action, 'none');
  assert.equal(w.exercises.find(e => e.id === bench.id).loadMode, 'each');
});
t('session options respect the time estimate, valid sets and enabled exercises without editing the template', () => {
  const d = GT.emptyData(), before = JSON.stringify(d);
  for (const goal of Object.keys(GT.GOALS)) for (const minutes of [0, 30, 45, 60]) for (const day of d.days) {
    const plan = GT.sessionPlan(d, day, {goal, sessionMinutes: minutes});
    if (minutes) assert.ok(plan.estimatedMinutes <= minutes, `${goal} ${minutes} ${day.name}`);
    assert.ok(plan.exercises.some(e => e.timed)); assert.ok(plan.exercises.some(e => !e.timed));
    plan.exercises.forEach(e => {assert.ok(e.sets >= 1); assert.equal(e.sets, e.plannedSets); assert.ok(day.items.some(i => i.enabled && i.exerciseId === e.id));});
  }
  assert.equal(JSON.stringify(d), before);
  const full = GT.sessionPlan(d, d.days[0]); assert.equal(full.exercises.filter(e=>!e.timed).reduce((sum,e)=>sum+e.sets,0),24);
  const short = GT.sessionPlan(d, d.days[0], {sessionMinutes:30});
  for (const movement of ['push', 'pull']) assert.ok(short.exercises.some(e => e.movement === movement));
  assert.ok(short.exercises.some(e => ['squat', 'hinge'].includes(e.movement)));
});
t('goal options add at most one priority set, cap it at four, and lengthen main-lift rest for strength', () => {
  const d = GT.emptyData(), day = d.days[0], bench = d.exercises.find(e => e.name === 'Dumbbell bench press');
  let plan = GT.sessionPlan(d, day, {goal:'muscle', priorityRegion:'chest'});
  assert.equal(plan.exercises.find(e => e.id === bench.id).sets, 4);
  assert.equal(plan.exercises.reduce((sum,e)=>sum+e.sets,0),26); // 24 work + 1 added + 1 warm-up.
  bench.sets=4; plan = GT.sessionPlan(d,day,{goal:'muscle',priorityRegion:'chest'}); assert.equal(plan.exercises.find(e=>e.id===bench.id).sets,4);
  assert.equal(GT.sessionPlan(d,day,{goal:'strength'}).exercises.find(e=>e.id===bench.id).restSec,150);
});
t('session swaps use a matching movement, retain slot sets and use the target exercise history', () => {
  const d = GT.emptyData(), target = d.exercises.find(e=>e.name==='Machine chest press');
  const prior = GT.newWorkout(d,{id:'test',name:'Machine',items:[{exerciseId:target.id,enabled:true}]}); prior.endedAt=Date.now();
  prior.sets.forEach(s=>{s.weightKg=35;s.reps=8;s.done=true;}); d.workouts.push(prior);
  const w = GT.newWorkout(d,d.days[0],{sessionMinutes:30}), source=w.exercises.find(e=>e.name==='Dumbbell bench press');
  assert.ok(!GT.swapCandidates(d,w,source).some(e=>e.name==='Seated leg curl'));
  const template=JSON.stringify(d.days); assert.ok(GT.swapExercise(d,w,source.id,target.id));
  const replacement=w.exercises.find(e=>e.id===target.id); assert.equal(replacement.plannedSets,source.plannedSets); assert.equal(replacement.loadMode,'stack');
  assert.equal(w.sets.find(s=>s.exerciseId===target.id).weightKg,35); assert.equal(w.sets.find(s=>s.exerciseId===target.id).reps,8);
  assert.ok(!w.sets.some(s=>s.exerciseId===source.id)); assert.equal(JSON.stringify(d.days),template);
  w.sets.find(s=>s.exerciseId===target.id).done=true; const before=JSON.stringify(w);
  assert.equal(GT.swapExercise(d,w,target.id,source.id),false); assert.equal(JSON.stringify(w),before);
});
t('weekly coverage counts direct and indirect work, ignores warm-ups and unfinished sets, and counts calendar days once', () => {
  const d=GT.emptyData(), now=+new Date(2026,8,5,12), bench=d.exercises.find(e=>e.name==='Dumbbell bench press');
  const make=(id,date)=>{const w=GT.newWorkout(d,{id:'day',name:'Test',items:[{exerciseId:bench.id,enabled:true}]}); w.id=id;w.startedAt=date;w.endedAt=date+1000;return w;};
  const one=make('one',now-3600000); one.sets[0].done=true;one.sets[1].done=true;one.sets[1].warmup=true;
  const two=make('two',now-7200000);two.sets[0].done=true;
  const old=make('old',+new Date(2026,7,29,23,59));old.sets.forEach(s=>s.done=true);
  const future=make('future',now+1000);future.sets.forEach(s=>s.done=true);
  d.workouts.push(one,two,old,future); d.activeWorkout=two; // A duplicate ID must not count twice.
  let result=GT.weekCoverage(d,now); const chest=result.regions.find(r=>r.region==='chest'), triceps=result.regions.find(r=>r.region==='triceps');
  assert.equal(result.totalSets,2); assert.equal(result.days,1); assert.equal(chest.direct,2); assert.equal(chest.indirect,0); assert.equal(chest.days,1); assert.equal(triceps.indirect,2);
  bench.primary=['quads']; assert.equal(GT.weekCoverage(d,now).regions.find(r=>r.region==='chest').direct,2); // Snapshot, not edited library.
});
t('weekly coverage reports unclassified exercises instead of guessing from upper/lower tags', () => {
  const d=GT.emptyData(), now=Date.now();
  d.activeWorkout={id:'x',startedAt:now,exercises:[{id:'unknown',name:'My exercise',tag:'upper'}],sets:[{exerciseId:'unknown',reps:10,done:true}]};
  const c=GT.weekCoverage(d,now); assert.equal(c.unclassified,1);assert.equal(c.totalSets,1);assert.ok(c.regions.every(r=>r.direct===0&&r.indirect===0));
});
t('v3 migration enriches the library without reinterpreting old loads or modifying active/history snapshots', () => {
  const d=Object.assign(GT.emptyData(), GT.defaultProgram(3)); d.version=3; d.days[1].items.pop(); // customised day: v5 relayout must not apply
  const bench=d.exercises.find(e=>e.name==='Dumbbell bench press');
  const w={id:'past',startedAt:1,endedAt:2,exercises:[{id:bench.id,name:bench.name,sets:3}],sets:[{exerciseId:bench.id,weightKg:40,reps:10,done:true}]};
  d.workouts=[w];d.activeWorkout=JSON.parse(JSON.stringify(w));d.activeWorkout.id='active';d.activeWorkout.endedAt=null;
  const before=JSON.stringify([d.days,d.workouts,d.activeWorkout]);GT.migrate(d);
  assert.equal(bench.loadMode,'unspecified');assert.equal(bench.loadStepKg,1);assert.deepEqual(bench.primary,['chest']);
  assert.equal(JSON.stringify([d.days,d.workouts,d.activeWorkout]),before);
  const once=JSON.stringify(d);GT.migrate(d);assert.equal(JSON.stringify(d),once);
});
t('CSV preserves fractional loads, zero effort, blank effort, and explicit weight basis', () => {
  const d=GT.emptyData();GT.importHistory(d,GT.parseHistory('date,exercise,set,kg,reps,rir,load_mode\n2026-09-01,Dumbbell bench press,1,4.25,10,0,each\n2026-09-01,Dumbbell bench press,2,4.25,10,,each'));
  const copy=GT.emptyData();GT.importHistory(copy,GT.parseHistory(GT.historyToCSV(d)));
  assert.equal(copy.workouts[0].sets[0].weightKg,4.25);assert.equal(copy.workouts[0].sets[0].rir,0);assert.equal(copy.workouts[0].sets[1].rir,null);assert.equal(copy.workouts[0].exercises[0].loadMode,'each');assert.equal(copy.workouts[0].exercises[0].plannedSets,2);
});
t('new controls are collapsed by default, retain disclosure state, and persist time/goal choices', () => {
  const app=bootApp(GT.emptyData()); let content=app.elements.get('#view').innerHTML;
  assert.ok(content.includes('data-panel="coverage"'));assert.ok(!content.includes('data-panel="coverage" open'));
  app.document.querySelectorAll=selector=>selector==='details[data-panel]'?[{dataset:{panel:'session-options'},open:true}]:[];
  change(app,{sf:'sessionMinutes'},'30');content=app.elements.get('#view').innerHTML;
  assert.ok(content.includes('data-panel="session-options" open'));assert.equal(app.stored().settings.sessionMinutes,30);
  vm.runInContext("go('program')",app.context);change(app,{sf:'goal'},'muscle');change(app,{sf:'priorityRegion'},'hamstrings');
  assert.equal(app.stored().settings.goal,'muscle');assert.equal(app.stored().settings.priorityRegion,'hamstrings');
});
t('workout controls record optional effort, use fractional steps and label reps per side', () => {
  const d=GT.emptyData(), e=d.exercises.find(e=>e.name==='Pallof press');e.loadStepKg=.25;
  d.activeWorkout=GT.newWorkout(d,{id:'day',name:'Test',items:[{exerciseId:e.id,enabled:true}]});const app=bootApp(d);
  assert.ok(app.elements.get('#view').innerHTML.includes('reps / side'));assert.ok(app.elements.get('#view').innerHTML.includes('kg stack'));
  change(app,{f:'rir'},'0');assert.equal(app.stored().activeWorkout.sets[0].rir,0);
  change(app,{f:'weightKg'},'4.25');assert.equal(app.stored().activeWorkout.sets[0].weightKg,4.25);
  const el={dataset:{act:'step',f:'weightKg',d:'0.25'}};app.events.click({target:{closest:sel=>sel==='nav button'?null:el}});
  assert.equal(app.stored().activeWorkout.sets[0].weightKg,4.5);
  change(app,{f:'rir'},'');assert.equal(app.stored().activeWorkout.sets[0].rir,null);
});
t('current-session weight-basis selection clears ambiguous prefills and preserves history', () => {
  const d=GT.emptyData(),e=d.exercises.find(e=>e.name==='Dumbbell bench press');e.loadMode='unspecified';
  const w=GT.newWorkout(d,d.days[0]);w.endedAt=Date.now();w.sets.filter(s=>s.exerciseId===e.id).forEach(s=>{s.done=true;s.weightKg=40;});d.workouts.push(w);
  d.activeWorkout=GT.newWorkout(d,{id:'day',name:'Test',items:[{exerciseId:e.id,enabled:true}]});const app=bootApp(d), before=JSON.stringify(d.workouts);
  change(app,{},'each',{'data-current-mode':true});
  assert.equal(app.stored().activeWorkout.exercises[0].loadMode,'each');assert.equal(app.stored().activeWorkout.sets[0].weightKg,0);assert.equal(JSON.stringify(app.stored().workouts),before);
});


t('typing numbers saves immediately without requiring blur', () => {
  const d=GT.emptyData(); d.activeWorkout=GT.newWorkout(d,d.days[0]); d.activeWorkout.cursor={ex:1,set:0}; const app=bootApp(d);
  for (const [f,value] of [['weightKg','4.25'],['reps','8']]) app.events.input({target:{dataset:{f},value,hasAttribute:()=>false}});
  const saved=app.stored().activeWorkout.sets.filter(s=>s.exerciseId===d.activeWorkout.exercises[1].id)[0];
  assert.equal(saved.weightKg,4.25);assert.equal(saved.reps,8);
});
t('mixed CSV weight bases are rejected before changing any stored data', () => {
  const d=GT.emptyData(), before=JSON.stringify(d);
  const rows=GT.parseHistory('date,exercise,sets,reps,kg,load_mode\n2026-09-01,Dumbbell bench press,1,10,10,each\n2026-09-01,Dumbbell bench press,1,10,20,total');
  assert.throws(()=>GT.importHistory(d,rows),/one weight basis/);assert.equal(JSON.stringify(d),before);
});
t('timed warm-up screen has no empty details control', () => {
  const d=GT.emptyData();d.activeWorkout=GT.newWorkout(d,d.days[0]);const app=bootApp(d);
  assert.ok(!app.elements.get('#view').innerHTML.includes('Exercise details'));
});
console.log(`\n${n} tests passed`);
