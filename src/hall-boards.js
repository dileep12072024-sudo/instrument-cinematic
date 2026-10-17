import * as T from 'three';

// Entrance hall boards, plaques and notices, drawn in three.js (owner, 2026-10-17: "do not stick" photographs; build them,
// with the exact letters). Text is transcribed from the 14 October photographs (20261014_110241/110254/110307). Where the
// festive tinsel or fading hides letters in every photograph, only the legible part is drawn; nothing is made up.
// Every board is painted into the same atlas rectangle (2048-wide units) the photographed crops used, so the boards keep
// their measured places and sizes in entrance-hall.js. Real photographs appear only where the poster itself prints a
// photograph (the anti-ragging collage and its handcuffed hands), taken from the old crop.

const F = {
  sans: 'Arial, Helvetica, sans-serif', narrow: '"Arial Narrow", "Roboto Condensed", Arial, sans-serif', serif: '"Times New Roman", Times, serif',
  slab: '"Bookman Old Style", Rockwell, Georgia, serif', heavy: 'Impact, "Arial Black", "Arial Narrow", sans-serif', copper: '"Copperplate Gothic Bold", "Copperplate Gothic", Copperplate, Georgia, serif',
};
let seed = 141014; const rnd = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);

// Text: (x, y) is the centre (align 'center'), the left or the right end; y is the middle of the capitals.
// width stretches or condenses the line to that width; max only condenses.
function text(g, s, x, y, size, { font = F.sans, weight = '', style = '', color, align = 'center', width, max, stroke, strokeWidth = 0 } = {}) {
  g.font = `${style} ${weight} ${size}px ${font}`.trim(); g.textAlign = align; g.textBaseline = 'alphabetic';
  const natural = g.measureText(s)?.width || s.length * size * .55;
  const sx = width ? width / natural : max && natural > max ? max / natural : 1;
  g.save(); g.translate(x, y + size * .36); g.scale(sx, 1);
  if (stroke) { g.lineJoin = 'round'; g.strokeStyle = stroke; g.lineWidth = strokeWidth / sx; g.strokeText(s, 0, 0); }
  if (color) g.fillStyle = color; g.fillText(s, 0, 0); g.restore();
  return natural * sx;
}
// Word-wrapped paragraph, justified except its last line; lead (e.g. "PEO 1.") drawn in its own colour. Returns next y.
function para(g, s, x, y, w, size, lead, { font = F.sans, color = '#2a2420', leadColor = color, leading = 1.3, justify = true, weight = '' } = {}) {
  g.font = `${weight} ${size}px ${font}`.trim(); const space = g.measureText(' ')?.width || size * .28, measure = t => g.measureText(t)?.width || t.length * size * .5;
  const words = s.split(' '), lines = []; let line = [], used = lead ? measure(lead) + space : 0;
  for (const word of words) { const ww = measure(word); if (line.length && used + ww > w) { lines.push([line, used - space]); line = []; used = 0; } line.push([word, ww]); used += ww + space; }
  lines.push([line, used - space]);
  lines.forEach(([ws, used], k) => {
    let cx = x; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (k === 0 && lead) { g.font = `bold ${size}px ${font}`; g.fillStyle = leadColor; g.fillText(lead, cx, y); cx += measure(lead) + space; g.font = `${weight} ${size}px ${font}`.trim(); }
    const gap = justify && k < lines.length - 1 && ws.length > 1 ? space + (w - used) / (ws.length - 1) : space;
    g.fillStyle = color; for (const [word, ww] of ws) { g.fillText(word, cx, y); cx += ww + gap; }
    y += size * leading;
  });
  return y;
}
// Letters set along an arch (centre cx, cy; radius r; from angle a0 to a1, measured from straight up, clockwise).
function arch(g, s, cx, cy, r, a0, a1, size, opts = {}) {
  const n = s.length; for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (i + .5) / n; g.save(); g.translate(cx + Math.sin(a) * r, cy - Math.cos(a) * r); g.rotate(a);
    text(g, s[i], 0, 0, size, opts); g.restore();
  }
}
// The university seal as painted line work (white on the wooden boards): crest shield, ring, spoked wheel, year scroll.
function sealLines(g, cx, cy, s, color) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.strokeStyle = color; g.lineWidth = .035;
  g.beginPath(); g.moveTo(-.36, -.42); g.bezierCurveTo(-.5, .05, -.26, .42, 0, .5); g.bezierCurveTo(.26, .42, .5, .05, .36, -.42); g.quadraticCurveTo(0, -.3, -.36, -.42); g.stroke();
  for (const r of [.27, .2]) { g.beginPath(); g.arc(0, -.04, r, 0, Math.PI * 2); g.stroke(); }
  for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; g.beginPath(); g.moveTo(Math.cos(a) * .05, -.04 + Math.sin(a) * .05); g.lineTo(Math.cos(a) * .18, -.04 + Math.sin(a) * .18); g.stroke(); }
  g.beginPath(); g.moveTo(-.2, .34); g.quadraticCurveTo(0, .42, .2, .34); g.stroke(); g.restore();
}
// The university seal in print colours: maroon crest, cream ring, golden sun and wheel.
function sealColour(g, cx, cy, r) {
  g.save(); g.translate(cx, cy);
  g.fillStyle = '#7d1d1d'; g.beginPath(); g.moveTo(-r * .95, -r * .9); g.bezierCurveTo(-r * 1.2, r * .2, -r * .55, r, 0, r * 1.1); g.bezierCurveTo(r * .55, r, r * 1.2, r * .2, r * .95, -r * .9); g.quadraticCurveTo(0, -r * .65, -r * .95, -r * .9); g.fill();
  g.fillStyle = '#f3e7c4'; g.beginPath(); g.arc(0, -r * .05, r * .68, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d99a1e'; g.beginPath(); g.arc(0, -r * .05, r * .5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7d1d1d'; g.lineWidth = r * .05; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(Math.cos(a) * r * .1, -r * .05 + Math.sin(a) * r * .1); g.lineTo(Math.cos(a) * r * .45, -r * .05 + Math.sin(a) * r * .45); g.stroke(); }
  g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(0, -r * .05, r * .12, 0, Math.PI * 2); g.fill(); g.restore();
}
function woodGrain(g, w, h, base = '#8a5a32') {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w / 2; i++) { const x0 = rnd() * w, a = 1 + rnd() * 4, f = .004 + rnd() * .01, p = rnd() * 6;
    g.strokeStyle = rnd() > .5 ? `rgba(40,22,10,${.05 + rnd() * .12})` : `rgba(230,180,120,${.04 + rnd() * .06})`; g.lineWidth = .4 + rnd() * 1.4;
    g.beginPath(); for (let y = 0; y <= h; y += 6) g.lineTo(x0 + Math.sin(y * f + p) * a, y); g.stroke(); }
  g.strokeStyle = 'rgba(30,15,5,.6)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
}
function printLines(g, x, y, w, h, size, color = 'rgba(40,40,40,.55)', gap = 1.7) { // fine print too small to read in any photograph
  g.fillStyle = color; for (let yy = y; yy < y + h - size; yy += size * gap) { let xx = x; while (xx < x + w - 4) { const ww = Math.min(x + w - xx, 4 + rnd() * size * 5); g.fillRect(xx, yy, ww, size * .55); xx += ww + size * .45; } }
}
const white = '#f3eee2', paintWhite = 'rgba(238,232,214,.93)';

// A department board of painted lettering on wood: arched department name, seal, titles, then numbered rows.
function honourBoard(g, w, h, { titles, rows, cols, rowTop, rowStep, size, faded = 1 }) {
  woodGrain(g, w, h, faded < 1 ? '#7b5232' : '#87562f');
  const c = `rgba(240,234,218,${.93 * faded})`;
  g.lineWidth = 1; arch(g, 'DEPARTMENT OF INSTRUMENT TECHNOLOGY', w / 2, h * .2, w * .4, -1.25, 1.25, w * .055, { font: F.serif, color: c, max: w * .06 });
  sealLines(g, w / 2, h * .12, w * .2, c);
  for (const [s, y, sz, opts = {}] of titles) text(g, s, w / 2, h * y, w * sz, { font: F.serif, color: c, max: w * .86, ...opts });
  for (let i = 0; i < rows.length; i++) { const y = h * (rowTop + i * rowStep), [no, name, year] = rows[i];
    if (no) text(g, no, w * cols[0], y, w * size, { font: F.serif, color: c, align: 'left' });
    if (name) text(g, name, w * cols[1], y, w * size, { font: F.serif, color: c, align: 'left', max: w * (cols[2] - cols[1] - .02) });
    if (year) text(g, year, w * cols[3], y, w * size, { font: F.serif, color: c, align: 'right' }); }
}
const painters = {
  // ---------------------------------------------------------------- west wall
  phd(g, w, h) {
    g.fillStyle = '#d8cfae'; g.fillRect(0, 0, w, h);
    const boards = [[2, 261], [266, 527], [529, 788]];
    const draw = (k, opts) => { const [a, b] = boards[k]; g.save(); g.translate(a, 4); honourBoard(g, b - a, h - 6, opts); g.restore(); };
    draw(0, { faded: .55, titles: [['ANDHRA UNIVERSITY', .22, .075], ['Ph.Ds AWARDED AFTER 1972', .29, .055, { font: F.serif }]], cols: [.06, .14, .8, .95], rowTop: .345, rowStep: .047, size: .052, rows: [
      ['1.', 'Dr. J.ASHOK', '1972'], ['2.', 'Dr. M.SATYANARAYANA', '1979'], ['3.', 'Dr. S.GOPALA KRISHNA', '1980'], ['4.', 'Dr. P.L.H.VARA PRASAD', '1982'],
      ['5.', 'Dr. R.RAMANUJAM', '1984'], ['6.', 'Dr. P.VENKATESWARA RAO', '1987'], ['7.', 'Dr.    SATYANARAYANA', '1988'], ['8.', 'Dr.        DAS', '1988'],
      ['9.', '', '1990'], ['10.', '', '1990'], ['11.', '', '1995'], ['12.', '', ''], ['13.', '', ''], ['14.', 'Dr. P.S.SRINIVAS BABU', '']] });
    const head = [['FACULTY OF ENGINEERING', .235, .078], ['ANDHRA UNIVERSITY', .275, .078], ['LIST OF Ph.D AWARDEES', .315, .062], ['NAME', .36, .05]];
    draw(1, { titles: head, cols: [.05, .14, .82, .97], rowTop: .4, rowStep: .04, size: .062, rows: [
      ['1.', 'Dr.D.V.RAMA KOTI REDDY', '1996'], ['2.', 'Dr.A.BHUJANGA RAO', '2001'], ['3.', 'Dr.G.VIJAYA SARADHI', '2008'], ['4.', 'Dr.P.S.SRINIVAS BABU', '2010'],
      ['5.', 'Dr.K.SRIKANTH', '2010'], ['6.', 'Dr.K.PARVATHI', '2010'], ['7.', 'Dr.A.V.PRATAP KUMAR', '2010'], ['8.', 'Dr.M.RAMESH PATNAIK', '2011'],
      ['9.', 'Dr.     RAMESH', '2011'], ['10.', 'Dr.P.PARAM NAIDU', '2011'], ['11.', 'Dr.       REDDY', '2013'], ['12.', 'Dr.ZIA UR RAHMAN', '2014'],
      ['13.', 'Dr.K.V.LAKSHMI', '2014'], ['14.', 'Dr.A.NAGA RAJU', ''], ['15.', 'Dr.S.SRI DEVI', '']] });
    const [a] = boards[1]; g.save(); g.translate(a, 4); text(g, 'S.No', (527 - a) * .07, (h - 6) * .375, 12, { font: F.serif, color: paintWhite }); text(g, 'YEAR', (527 - a) * .92, (h - 6) * .36, 13, { font: F.serif, color: paintWhite }); g.restore();
    draw(2, { titles: head, cols: [.04, .13, .8, .97], rowTop: .4, rowStep: .04, size: .062, rows: [
      ['16.', 'Dr.P.HARA GOPAL MANI', '2015'], ['17.', 'Dr.P.SWAPNA', '2015'], ['18.', 'Dr.A.KAMALA KUMARI', '2015'], ['19.', 'Dr.A.DAISY RANI', '2015'], ['20.', 'Dr.B.RAJESH KUMAR', '2015']] });
  },
  staff(g, w, h) {
    g.fillStyle = '#1c1c45'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8e8f0'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6);
    sealColour(g, w / 2, h * .065, w * .055);
    text(g, 'ANDHRA UNIVERSITY', w / 2, h * .155, h * .05, { font: F.sans, weight: 'bold', color: white, max: w * .9 });
    for (const [s, y] of [['ANDHRA UNIVERSITY COLLEGE OF ENGINEERING', .205], ['DEPARTMENT OF INSTRUMENT TECHNOLOGY', .237], ['NON TEACHING STAFF', .27]]) text(g, s, w / 2, h * y, h * .017, { color: '#e6e6ee', max: w * .82 });
    g.fillStyle = '#c3202c'; g.beginPath(); g.roundRect(w * .045, h * .3, w * .89, h * .062, 8); g.fill();
    g.fillStyle = '#ecebe6'; g.beginPath(); g.roundRect(w * .045, h * .355, w * .89, h * .607, 8); g.fill();
    for (const [s, x] of [['S.NO', .1], ['NAME OF THE EMPLOYEE', .37], ['DESIGNATION', .755]]) text(g, s, w * x, h * .33, h * .016, { color: white, weight: 'bold' });
    g.fillStyle = '#2a2a3a'; for (const x of [.17, .59]) g.fillRect(w * x, h * .362, 1.5, h * .595);
    [['01', 'S. PHANI', 'TYPIST'], ['02', 'N.V.D GANESH', 'JUNIOR ASSISTANT'], ['03', 'P.T. REDDY', 'JUNIOR ASSISTANT'], ['04', 'B. PYDI RAJU', 'RECORD ASSISTANT'], ['05', 'Md. KHADAR BABA', 'RECORD ASSISTANT'],
      ['06', 'K. RAMANAMMA', 'RECORD ASSISTANT'], ['07', 'S. RAMESH', 'MACHINE MINDER GRADE-1'], ['08', 'K. APPALA RAJU', 'MECHANIC'], ['09', 'P. SRINUVASA RAO', 'CONSOLIDATED PAY']].forEach(([n, name, post], k) => {
      const y = h * (.388 + k * .068);
      text(g, n, w * .105, y, h * .016, { color: '#3a3a48', weight: 'bold' }); text(g, name, w * .195, y, h * .018, { color: '#222236', weight: 'bold', align: 'left', max: w * .38 });
      text(g, post, w * .61, y, h * .015, { color: '#222236', font: F.narrow, align: 'left', max: w * .32 });
    });
  },
  ugc(g, w, h) { fundedPlate(g, w, h, ['This Department is funded by UGC -', 'Special Assistance Program(SAP)']); },
  dst(g, w, h) { fundedPlate(g, w, h, ['This Department is funded by', 'Department of Science & Technology', '- FIST Program']); },
  renovated(g, w, h) {
    g.fillStyle = '#16191a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = rnd() > .8 ? 'rgba(160,165,160,.18)' : 'rgba(0,0,0,.3)'; g.fillRect(rnd() * w, rnd() * h, 1, 1); }
    const c = 'rgba(196,200,178,.82)'; g.strokeStyle = c; g.lineWidth = 1.2; g.strokeRect(w * .06, h * .035, w * .88, h * .93);
    for (const [x, d] of [[w * .06, 1], [w * .94, -1]]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + d * (8 + k * 7), h * .035 + 8 + k * 3, 4 + k, 0, Math.PI * 1.6); g.stroke(); }
    for (const [s, y, sz] of [['RENOVATED', .12, .036], ['DEPT OF INSTRUMENT TECHNOLOGY', .195, .04], ['A U COLLEGE OF ENGINEERING (A)', .265, .04], ['INAUGURATED BY', .35, .03],
      ['PROF. BEELA SATYANARAYANA', .415, .048], ['VICE-CHANCELLOR, A U', .47, .028], ['PROF  G S N  RAJU', .55, .04], ['PRINCIPAL', .59, .026],
      ['PROF  P.V.G.D  PRASADA REDDY', .67, .04], ['REGISTRAR', .71, .026], ['PROF  P L H  VARA PRASAD', .79, .04], ['HOD', .83, .026], ['DATE  08-05-2011', .91, .036]])
      text(g, s, w / 2, h * y, w * sz * 1.5, { font: F.copper, color: c, max: w * .84 });
  },
  timetables(g, w, h) {
    woodGrain(g, w, h, '#86532f'); g.fillStyle = '#3c3a36'; g.fillRect(w * .16, h * .095, w * .7, h * .86);
    paper(g, w * .2, h * .1, w * .62, h * .78, -.012); printLines(g, w * .25, h * .16, w * .52, h * .66, 3.2, 'rgba(60,60,70,.45)');
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(w * .16, h * .095, w * .7, h * .86); // the glass
    g.fillStyle = '#f4f2ea'; g.fillRect(w * .2, h * .02, w * .6, h * .06); text(g, 'TIME TABLES', w / 2, h * .05, h * .028, { weight: 'bold', color: '#2a2a2a', max: w * .56 });
    g.fillStyle = '#c9b48a'; for (const y of [.12, .82]) g.fillRect(w * .9, h * y, w * .03, h * .07); g.fillRect(w * .05, h * .5, w * .1, h * .02); // hinges, hasp
  },
  vision(g, w, h) {
    g.fillStyle = '#2f86c6'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6efd8'; g.fillRect(w * .06, h * .07, w * .88, h * .86);
    sealColour(g, w / 2, h * .2, h * .08);
    text(g, 'ANDHRA UNIVERSITY', w / 2, h * .335, h * .065, { font: F.serif, color: '#c8343a', max: w * .62 });
    const grad = g.createLinearGradient(0, h * .4, 0, h * .52); grad.addColorStop(0, '#f2c24a'); grad.addColorStop(1, '#d4452a');
    text(g, 'VISION', w / 2, h * .465, h * .1, { font: F.heavy, color: grad, stroke: '#8c1f1f', strokeWidth: 2 });
    for (const [s, y] of [['To Create New', .58], ['Frontiers of Knowledge', .665], ['in Quest for Development of a', .75], ['Humane and Just Society', .835]])
      text(g, s, w / 2, h * y, h * .062, { font: F.slab, weight: 'bold', color: '#a8262c', max: w * .8 });
  },
  grievance(g, w, h) {
    g.fillStyle = '#20214f'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.03)'; g.fillRect(0, h * (.3 + k * .14), w, h * .14); }
    sealColour(g, w * .085, h * .075, h * .04);
    text(g, 'ANDHRA UNIVERSITY', w * .55, h * .075, h * .07, { font: F.heavy, color: white, width: w * .78 });
    g.fillStyle = '#c42a2a'; g.strokeStyle = '#e9c24a'; g.lineWidth = 2; g.beginPath(); g.roundRect(w * .14, h * .15, w * .7, h * .095, h * .045); g.fill(); g.stroke();
    text(g, 'GRIEVANCE CELLS', w / 2, h * .198, h * .05, { font: F.heavy, color: white, width: w * .54 });
    for (const [a, b, y, number] of [["WOMEN'S GRIEVANCE", 'AND REDRESSAL CELL', .375, '9948810852'], ['MINORITY CELL', '', .51, '9985369669'], ['CELL FOR DIFFERENTLY', 'ABLED PERSONS', .64, '7995106419'],
      ['ANTI - RAGGING', '', .775, '9703831117'], ['SC/ST CELL', '', .885, '9908036203'], ['OBC CELL', '', .99, '9885184522']]) {
      if (b) { text(g, a, w * .03, h * (y - .03), h * .036, { font: F.serif, weight: 'bold', color: white, align: 'left', max: w * .42 }); text(g, b, w * .03, h * (y + .03), h * .036, { font: F.serif, weight: 'bold', color: white, align: 'left', max: w * .42 }); }
      else text(g, a, w * .03, h * y, h * .036, { font: F.serif, weight: 'bold', color: white, align: 'left', max: w * .42 });
      text(g, ':', w * .545, h * y, h * .036, { color: white, weight: 'bold' });
      text(g, number, w * .625, h * y, h * .042, { font: F.serif, weight: 'bold', color: '#f0dc4a', align: 'left' });
    }
  },
  westCabinets(g, w, h) { cabinetFace(g, w, h, 4, [[1, 'STUDENTS MENTORS LIST', .27], [3, 'ATTENDANCE', .84]], [
    [0, .1, .06, .82, .86, 'list'], [1, .14, .1, .6, .55, 'list'], [1, .5, .12, .44, .5, 'list'], [1, .55, .64, .38, .34, 'letter'],
    [2, .3, .14, .42, .85, 'poster', ['AYAAN', 'INSTRUMENTATION'], '#ffffff', '#1d2650'], [3, .08, .16, .4, .75, 'poster', ['All Engineering Fraternity'], '#f2d57a', '#7a4a10'],
    [3, .5, .08, .48, .86, 'poster', ['NAAC', 'Participate in', 'Student Satisfaction', 'Survey (SSS) by NAAC', 'Have your say', 'in quality improvement'], '#ffffff', '#1f3d7a']]); },
  objectives(g, w, h) {
    g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a2a1c'; g.fillRect(w * .02, h * .025, w * .92, h * .95);
    g.fillStyle = '#f1e6c2'; g.fillRect(w * .055, h * .045, w * .855, h * .91);
    sealColour(g, w * .14, h * .093, w * .055);
    text(g, 'ANDHRA UNIVERSITY', w * .52, h * .07, w * .05, { weight: 'bold', color: '#2a2420' });
    text(g, 'DEPARTMENT OF INSTRUMENT TECHNOLOGY', w * .53, h * .1, w * .022, { weight: 'bold', color: '#2a2420' });
    text(g, 'ANDHRA UNIVERSITY COLLEGE OF ENGINEERING', w * .53, h * .118, w * .022, { weight: 'bold', color: '#2a2420' });
    const band = (s, y) => { g.fillStyle = '#1f2a6e'; g.beginPath(); g.roundRect(w * .18, h * y - w * .025, w * .62, w * .05, w * .02); g.fill(); text(g, s, w * .49, h * y, w * .03, { weight: 'bold', color: white, max: w * .58 }); };
    band('PROGRAMME EDUCATIONAL OBJECTIVES (PEOs)', .152);
    const sz = w * .0285, x = w * .075, cw = w * .815, opts = { leadColor: '#8a2a1e' }; let y = h * .19;
    for (const [lead, s] of [
      ['PEO 1.', 'To provide students with a solid foundation in Mathematics, Engineering Sciences, Electronics and Instrumentation Engineering which prepares students for wide range of career opportunities in Industries, Research field and in academics.'],
      ['PEO 2.', 'To train the students with good engineering breadth to comprehend, analyze, innovate and design new products in core and multidisciplinary domain, to provide technical solutions to real life problems and to render technical services to the needs of the society.'],
      ['PEO 3.', 'To provide students with an academic environment of excellence, proactiveness, leadership positions in multidisciplinary teams and lifelong learning for successful professional career'],
      ['PEO 4.', 'To inculcate professional and ethical attitude, creative, effective communication and presentation skills and enhanced ability to work in teams to pursue complex, open ended investigations and research'],
      ['PEO 5.', 'To motivate students towards becoming entrepreneurs, collaborators and innovators, leading or participating in efforts to address social, technical and business challenges']]) y = para(g, s, x, y, cw, sz, lead, opts) + sz * .55;
    band('PROGRAM SPECIFIC OUTCOMES (PSOs)', (y + sz * .3) / h); y += sz * 2.4;
    for (const [lead, s] of [
      ['PSO.1.', 'Specify, design, prototype and test Instrumentation systems that perform processing as per user requirements using contemporary devices and technology.'],
      ['PSO.2.', 'Develop hardware and software tools/ programs used in industrial and other automation systems.'],
      ['PSO.3.', 'Inculcate comprehensive education in Instrumentation engineering to ensure core competency in Instrumentation, Control and Automation.'],
      ['PSO.4.', 'Conduct themselves in a responsible, professional and ethical manner supporting sustainable economic development which enhances the quality of life.']]) y = para(g, s, x, y, cw, sz, lead, opts) + sz * .55;
  },
  // ---------------------------------------------------------------- east wall
  faculty(g, w, h) { honourBoard(g, w, h, { titles: [['ANDHRA UNIVERSITY', .245, .082], ['FACULTY', .29, .085]], cols: [.06, .3, .97, .97], rowTop: .35, rowStep: .047, size: .068, rows: [
    ['1. Prof .', 'A.BHUJANGA RAO'], ['2. Prof .', 'D.V.RAMA KOTI REDDY'], ['3. Prof .', 'Y.SRINIVASA RAO'], ['4. Dr.', 'M.RAMESH PATNAIK'], ['5. Dr.', 'A.KAMALA KUMARI'], ['6. Dr.', 'A.DAISY RANI'], ['7. Dr.', 'P.SWAPNA']] });
    g.fillStyle = paintWhite; g.fillRect(w * .3, h * .312, w * .4, 1.5); },
  heads1(g, w, h) { honourBoard(g, w, h, { titles: [['ANDHRA UNIVERSITY', .225, .08]], cols: [.03, .1, .74, .985], rowTop: .3, rowStep: .04, size: .05, rows: [
    ['1.', 'Prof.S.T.KRISHNA SWAMY CHETTY', 'UPTO-64'], ['2.', '', ''], ['3.', 'Prof.T.V.RAME', ''], ['4.', 'Prof.V.RAMA KRISHNA RAO', '1966-78'], ['5.', 'Prof.P.SITARAMA SWAMY', '1978-81'],
    ['6.', 'Prof.K.NAGAMUNESWARA RAO', '1981-84'], ['7.', 'Prof.M.BHASKARA RAMA RAO', ''], ['8.', 'Prof.J.ASHOK', ''], ['9.', 'Prof.S.GOPALA KRISHNA', '1990-93'], ['10.', 'Dr.R.RAMANU', '1993-96'],
    ['11.', '', ''], ['12.', 'Prof.', '1999-02'], ['13.', 'Prof.    KRISHNA RAO', '2002-05'], ['14.', '    IBRAHIM KHAN', '2005-08'], ['15.', '', '2008-10'], ['16.', 'Prof.P.L.H.VARA PRASAD', '2010-12'], ['17.', 'Prof.A.BHUJANGA RAO', '2012-']] });
    successive(g, w, h); },
  heads2(g, w, h) { honourBoard(g, w, h, { titles: [['ANDHRA UNIVERSITY', .225, .08]], cols: [.03, .1, .74, .985], rowTop: .335, rowStep: .045, size: .062, rows: [
    ['18.', 'Prof.D.V.RAMA KOTI REDDY', '2017'], ['19.', '', ''], ['20.', 'Dr.M.RAMESH PATNAIK', '2021'], ['21.', 'Dr.A.KAMALA KUMARI', '2022']] });
    successive(g, w, h); },
  charter(g, w, h) {
    g.fillStyle = '#eef0ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d2050'; g.fillRect(0, 0, w, h * .11);
    sealColour(g, w * .07, h * .055, h * .04); text(g, 'ANDHRA UNIVERSITY', w * .55, h * .058, h * .07, { weight: 'bold', color: white, max: w * .8 });
    text(g, 'Student Charter', w / 2, h * .16, h * .065, { color: '#c0392b' });
    printLines(g, w * .05, h * .215, w * .9, h * .14, 3, 'rgba(130,60,40,.5)');
    for (const [x0, x1, title] of [[.03, .6, 'Responsibilities towards Students'], [.61, .97, "Students' Responsibilities"]]) {
      g.strokeStyle = '#6a7a9a'; g.lineWidth = 1; g.strokeRect(w * x0, h * .37, w * (x1 - x0), h * .6); g.fillStyle = '#2b4f9a'; g.fillRect(w * x0, h * .37, w * (x1 - x0), h * .04);
      text(g, title, w * (x0 + x1) / 2, h * .39, h * .025, { font: F.serif, weight: 'bold', color: white, max: w * (x1 - x0) * .9 });
      printLines(g, w * (x0 + .015), h * .43, w * (x1 - x0 - .03), h * .52, 2.6, 'rgba(40,40,60,.5)');
    }
  },
  ragging(g, w, h, pictures) {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#ee6a3c'); bg.addColorStop(1, '#e2452a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    sealColour(g, w * .17, h * .09, w * .07);
    text(g, 'SAY NO TO', w * .53, h * .075, h * .034, { font: F.heavy, color: '#1a1a1a', stroke: white, strokeWidth: 4, width: w * .38 });
    text(g, 'RAGGING', w * .52, h * .125, h * .056, { font: F.heavy, color: '#c41a2a', stroke: white, strokeWidth: 5, width: w * .46 });
    g.save(); g.translate(w * .865, h * .14); g.fillStyle = white; g.beginPath(); g.arc(0, 0, w * .095, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#d0202a'; g.lineWidth = w * .016; g.beginPath(); g.arc(0, 0, w * .085, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(-w * .06, -w * .06); g.lineTo(w * .06, w * .06); g.stroke(); g.rotate(-.35); text(g, 'NO RAGGING', 0, 0, w * .03, { font: F.heavy, color: '#151515', width: w * .17 }); g.restore();
    const cx = w * .49, cy = h * .36, rx = w * .34, ry = h * .21;
    g.fillStyle = '#f5d33a'; g.beginPath(); g.ellipse(cx, cy, rx + 4, ry + 4, 0, 0, Math.PI * 2); g.fill();
    if (pictures) { g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.clip(); g.drawImage(pictures, 56, 72, 256, 240, cx - rx, cy - ry, rx * 2, ry * 2); g.restore(); }
    text(g, 'YES TO', w * .495, h * .55, h * .036, { font: F.heavy, color: '#1a1a1a', stroke: white, strokeWidth: 4, width: w * .3 });
    text(g, 'JOYFULCAMPUS', w * .49, h * .6, h * .052, { font: F.heavy, color: '#c41a2a', stroke: white, strokeWidth: 5, width: w * .62 });
    g.fillStyle = '#f3e43c'; g.fillRect(w * .03, h * .628, w * .9, h * .218);
    text(g, 'What is Ragging?', w * .06, h * .66, h * .02, { weight: 'bold', color: '#1a1a1a', align: 'left' });
    text(g, 'Any Act Resulting in:', w * .06, h * .683, h * .016, { weight: 'bold', color: '#c41a2a', align: 'left' });
    ['Mental/physical/sexual Abuse', 'Verbal Abuse', 'Indecent Behaviour', 'Criminal Intimidation/wrongful Restraint', 'Undermining Human Dignity', 'Financial Exploitation/extortion', 'Use Of Force']
      .forEach((s, k) => text(g, '• ' + s, w * .06, h * (.708 + k * .0185), h * .012, { weight: 'bold', style: 'italic', color: '#1a1a1a', align: 'left', max: w * .36 }));
    g.fillStyle = '#c41a2a'; g.fillRect(w * .42, h * .638, w * .35, h * .016); text(g, 'A STUDENT INDULGING IN RAGGING CAN BE:', w * .595, h * .646, h * .009, { weight: 'bold', color: white, max: w * .33 });
    let y = h * .668; for (const s of ['Cancellation of admission.', 'Suspension from attending classes.', 'Withholding/withdrawing Scholarship/Fellowship and other benefits.', 'Debarring from appearing in any test/ examination or other evaluation process.', 'Withholding results.',
      'Debarring from representing the institution in any regional, national or international meet, tournament or youth festival etc.', 'Collective punishment : when the persons committing or abetting the crime of ragging are not identified the institution shall resort to collective punishment as a deterrent to ensure community pressure on potential ragger.'])
      y = para(g, s, w * .425, y, w * .345, h * .0078, '•', { weight: 'bold', color: '#1a1a1a', leading: 1.25 });
    if (pictures) g.drawImage(pictures, 292, 348, 61, 108, w * .78, h * .675, w * .14, h * .15);
    g.fillStyle = white; g.fillRect(0, h * .85, w * .44, h * .076); g.fillStyle = '#1f5a46'; g.fillRect(w * .44, h * .85, w * .52, h * .076);
    text(g, 'MHRD', w * .1, h * .888, h * .022, { font: F.serif, color: '#333' });
    for (const [s, yy] of [['DEPARTMENT OF HIGHER EDUCATION', .872], ['MINISTRY OF HUMAN RESOURCE DEVELOPMENT', .888], ['GOVERNMENT OF INDIA', .904]]) text(g, s, w * .19, h * yy, h * .0085, { font: F.serif, color: '#333', align: 'left', max: w * .24 });
    sealColour(g, w * .48, h * .888, h * .02); text(g, 'ANDHRA UNIVERSITY', w * .72, h * .888, h * .026, { weight: 'bold', color: white, max: w * .42 });
    text(g, 'ANTI RAGGING SQUAD', w * .48, h * .945, h * .016, { weight: 'bold', color: '#1a1a1a' });
    text(g, 'PH : 94401 97475, 94400 42610, 98480 40655, 944132 74930', w * .48, h * .978, h * .017, { weight: 'bold', color: '#1a1a1a', max: w * .96 });
  },
  eastCabinet(g, w, h, pictures) { cabinetFace(g, w, h, 4, [[1, 'OUTSIDE EVENTS', .38], [2, 'DEPARTMENT EVENTS', .55]], [
    [0, .2, .08, .58, .62, 'ragging'],
    [1, .12, .32, .68, .58, 'poster', ["DON'T RAG,", 'JUST INTERACT', 'AUCE ANTI RAGGING SQUAD'], '#c7352c', '#ffffff'],
    [2, .3, .32, .44, .4, 'poster', [], '#e8e8e2', '#333333'], [3, .14, .3, .66, .52, 'poster', ['ANDHRA UNIVERSITY', 'COLLEGE OF ENGINEERING', "SPIKES'26"], '#1d1b2a', '#e6e2f0']], pictures); },
  complaints(g, w, h) {
    g.fillStyle = '#7a1e1e'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, h * .1); g.fillStyle = '#111'; g.fillRect(w * .15, h * .14, w * .7, h * .04);
    text(g, 'COMPLAINTS', w / 2, h * .26, h * .07, { font: F.heavy, color: white, max: w * .8 }); text(g, '&', w / 2, h * .33, h * .04, { font: F.heavy, color: white });
    text(g, 'SUGGESTIONS BOX', w / 2, h * .39, h * .07, { font: F.heavy, color: white, max: w * .9 });
    g.fillStyle = '#6a5a40'; g.fillRect(w * .08, h * .62, w * .12, h * .14); g.fillStyle = '#9a8a60'; g.fillRect(w * .2, h * .66, w * .08, h * .06);
  },
  cctv(g, w, h) {
    g.fillStyle = '#f4f4ef'; g.fillRect(0, 0, w, h); g.strokeStyle = '#999'; g.strokeRect(1, 1, w - 2, h - 2);
    g.fillStyle = '#f2d32a'; g.fillRect(w * .05, h * .42, w * .9, h * .48);
    g.beginPath(); g.moveTo(w * .5, h * .06); g.lineTo(w * .66, h * .38); g.lineTo(w * .34, h * .38); g.closePath(); g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#1a1a1a'; g.fillRect(w * .46, h * .2, w * .1, h * .08); sealColour(g, w * .13, h * .16, h * .08);
    for (const [s, y] of [['These premises', .53], ['are under', .66], ['CCTV Surveillance', .8]]) text(g, s, w / 2, h * y, h * .11, { weight: 'bold', color: '#1a1a1a', max: w * .86 });
  },
  board(g, w, h) {
    g.fillStyle = '#5a6264'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e1f1f'; g.fillRect(w * .08, h * .03, w * .84, h * .9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = w * (.13 + c * .2), y = h * (.08 + r * .3); g.fillStyle = '#d9d3c0'; g.fillRect(x, y, w * .15, h * .2); g.fillStyle = '#8a8370'; g.fillRect(x + w * .04, y + h * .03, w * .07, h * .04); g.fillRect(x + w * .04, y + h * .13, w * .07, h * .04); }
    for (let k = 0; k < 14; k++) { g.strokeStyle = rnd() > .5 ? '#a8261e' : '#2a2a2a'; g.lineWidth = 2; g.beginPath(); const x = w * (.15 + rnd() * .7); g.moveTo(x, 0); g.bezierCurveTo(x + 20 * (rnd() - .5), h * .3, x + 30 * (rnd() - .5), h * .6, x + 10 * (rnd() - .5), h); g.stroke(); }
  },
  isolator(g, w, h) {
    g.fillStyle = '#e8e3d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9c3b6'; g.fillRect(0, h * .9, w, h * .1);
    g.fillStyle = '#1c1c1c'; g.fillRect(w * .26, h * .27, w * .26, h * .22); g.fillRect(w * .33, h * .45, w * .1, h * .32); g.fillStyle = '#c86a2a'; g.fillRect(w * .34, h * .31, w * .06, h * .06);
    g.fillStyle = '#6a6458'; for (const [x, y] of [[.86, .15], [.86, .78]]) { g.beginPath(); g.arc(w * x, h * y, w * .035, 0, Math.PI * 2); g.fill(); }
  },
  switchbox(g, w, h) { g.fillStyle = '#ead9b4'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8d3c6'; g.fillRect(w * .48, h * .55, w * .14, h * .45); g.fillStyle = 'rgba(60,40,20,.3)'; g.fillRect(w * .2, h * .2, 3, 3); g.fillRect(w * .7, h * .25, 3, 3); },
};
function fundedPlate(g, w, h, lines) {
  g.fillStyle = '#2b2d8a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8e8f0'; g.lineWidth = 1.5; g.strokeRect(4, 4, w - 8, h - 8);
  for (const [x, y, sx, sy] of [[8, 8, 1, 1], [w - 8, 8, -1, 1], [8, h - 8, 1, -1], [w - 8, h - 8, -1, -1]]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + sx * (6 + k * 4), y + sy * (5 + k * 2), 2.5, 0, Math.PI * 2); g.stroke(); }
  const n = lines.length; lines.forEach((s, k) => text(g, s, w / 2, h * (.5 + (k - (n - 1) / 2) * .26), h * .17, { font: F.narrow, color: white, max: w * .86 }));
}
function successive(g, w, h) {
  const c = paintWhite; g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.roundRect(w * .15, h * .245, w * .7, h * .045, h * .02); g.stroke();
  text(g, 'SUCCESSIVE  HEADS', w / 2, h * .268, w * .068, { font: F.serif, color: c, max: w * .64 });
}
function paper(g, x, y, w, h, tilt = 0) { g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(tilt); g.fillStyle = '#f2f0e8'; g.fillRect(-w / 2, -h / 2, w, h); g.restore(); }
// Glazed timber notice cabinet seen from the front: frames, dark backboard, labels, pinned sheets and posters.
// sheets: [leaf, x, y, w, h (fractions of the leaf opening), kind, lines, background, ink].
function cabinetFace(g, w, h, leaves, labels, sheets, pictures) {
  woodGrain(g, w, h, '#7a4a28'); const lw = w / leaves, fr = Math.min(lw, h) * .07;
  for (let k = 0; k < leaves; k++) {
    const x0 = k * lw + fr, y0 = fr * 1.6, ow = lw - 2 * fr, oh = h - fr * 2.8; g.fillStyle = '#2b2622'; g.fillRect(x0, y0, ow, oh);
    for (const [leaf, x, y, sw, sh, kind, lines = [], bg = '#f2f0e8', ink = '#333'] of sheets) if (leaf === k) {
      const px = x0 + x * ow, py = y0 + y * oh, pw = sw * ow, ph = sh * oh; g.fillStyle = bg; g.fillRect(px, py, pw, ph);
      if (kind === 'ragging') { g.save(); g.translate(px, py); painters.ragging(g, pw, ph, pictures); g.restore(); }
      else if (kind === 'list') printLines(g, px + pw * .06, py + ph * .04, pw * .88, ph * .92, 2.4, 'rgba(50,50,60,.5)', 1.6);
      else if (kind === 'letter') printLines(g, px + pw * .08, py + ph * .1, pw * .84, ph * .8, 2.6, 'rgba(50,50,60,.45)', 2);
      else { lines.forEach((s, i) => text(g, s, px + pw / 2, py + ph * (.1 + i * .1), Math.min(pw * .11, ph * .06), { weight: 'bold', color: ink, max: pw * .9 })); printLines(g, px + pw * .1, py + ph * (.14 + lines.length * .1), pw * .8, ph * .3, 2.2, 'rgba(120,120,120,.5)', 2); }
    }
    const glare = g.createLinearGradient(x0, y0, x0 + ow, y0 + oh); glare.addColorStop(0, 'rgba(255,255,255,.1)'); glare.addColorStop(.5, 'rgba(255,255,255,0)'); glare.addColorStop(1, 'rgba(255,255,255,.06)');
    g.fillStyle = glare; g.fillRect(x0, y0, ow, oh);
    g.fillStyle = '#b89b5e'; g.fillRect(k % 2 ? k * lw + fr * .3 : (k + 1) * lw - fr * 1.2, h * .45, fr, h * .06); // catch
  }
  for (const [leaf, s, x] of labels) { const cx = (leaf + x) * lw; g.fillStyle = '#f2f0e8'; g.fillRect(cx - lw * .36, fr * .15, lw * .72, fr * 1.3); text(g, s, cx, fr * .8, fr * .8, { weight: 'bold', color: '#222', max: lw * .66 }); }
}

// Painted atlases, same layout as the photographed ones: [atlas x, y, w, h, painter] in 2048-wide units.
const layout = {
  [-1]: { w: 2048, h: 1102, items: [[445, 0, 789, 559, 'phd'], [1238, 0, 242, 422, 'staff'], [1751, 704, 180, 88, 'ugc'], [1570, 704, 177, 96, 'dst'], [0, 704, 231, 398, 'renovated'],
    [1843, 0, 171, 407, 'timetables'], [1260, 704, 306, 229, 'vision'], [1484, 0, 355, 413, 'grievance'], [235, 704, 1021, 289, 'westCabinets'], [0, 0, 441, 700, 'objectives']] },
  [1]: { w: 2048, h: 962, items: [[385, 0, 257, 551, 'faculty'], [646, 0, 245, 538, 'heads1'], [895, 0, 243, 538, 'heads2'], [0, 569, 431, 393, 'charter'], [0, 0, 381, 565, 'ragging'],
    [1142, 0, 714, 429, 'eastCabinet'], [607, 569, 133, 165, 'complaints'], [881, 569, 107, 80, 'cctv'], [435, 569, 168, 328, 'board'], [744, 569, 133, 150, 'isolator'], [992, 569, 120, 66, 'switchbox']] },
};
// Returns a texture with every board of one side wall painted; scale 2 for large screens. The poster photographs
// (east only) are drawn in once their image has loaded.
export function hallBoardTexture(side, scale, picturesUrl) {
  const { w, h, items } = layout[side], canvas = document.createElement('canvas'); canvas.width = w * scale; canvas.height = h * scale;
  const g = canvas.getContext('2d'), texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 16;
  const paint = pictures => {
    g.fillStyle = '#cfc6a8'; g.fillRect(0, 0, w * scale, h * scale);
    for (const [x, y, iw, ih, name] of items) { g.save(); g.scale(scale, scale); g.translate(x, y); g.beginPath(); g.rect(0, 0, iw, ih); g.clip(); painters[name](g, iw, ih, pictures); g.restore(); }
    texture.needsUpdate = true;
  };
  paint(null);
  if (side > 0 && picturesUrl && typeof Image !== 'undefined') { const img = new Image(); img.onload = () => { seed = 141014; paint(picturesScaled(img)); }; img.src = picturesUrl; }
  return texture;
}
// The old crop is 2048 units wide at 1x or 2x; painters address it in 2048 units.
function picturesScaled(img) { const c = document.createElement('canvas'); c.width = 2048; c.height = Math.round(2048 * img.height / img.width); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c; }
// The two printed notices in the stair hall: 'environment' (Stop choking The Earth, Say No to Plastic!) and
// 'department' (two dark title bars over print that no frame resolves).
export function noticeTexture(kind) {
  const env = kind === 'environment', w = env ? 256 : 160, h = 512, s = 2, canvas = document.createElement('canvas'); canvas.width = w * s; canvas.height = h * s;
  const g = canvas.getContext('2d'); g.scale(s, s);
  if (env) {
    g.fillStyle = '#e9e8e2'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7f7f4'; g.fillRect(w * .02, h * .17, w * .9, h * .8);
    sealColour(g, w * .1, h * .3, w * .08);
    for (const [t, y] of [['Stop choking', .26], ['The Earth,', .33], ['Say No', .4], ['to Plastic!', .47]]) text(g, t, w * .55, h * y, h * .045, { font: '"Comic Sans MS", "Segoe Print", Arial, sans-serif', weight: 'bold', color: '#2d3f8a', max: w * .72 });
    g.fillStyle = '#5f8fbf'; g.beginPath(); g.ellipse(w * .5, h * .74, w * .3, h * .17, 0, 0, Math.PI * 2); g.fill(); // the earth, wrapped
    g.fillStyle = '#2f6b3a'; g.beginPath(); g.ellipse(w * .62, h * .72, w * .14, h * .11, .4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9c9c2'; g.lineWidth = 6; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(w * .5, h * .74, w * (.31 - k * .02), h * (.06 + k * .03), -.3 + k * .25, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#1d2a6e'; g.fillRect(w * .02, h * .92, w * .9, h * .07); sealColour(g, w * .08, h * .955, h * .022); text(g, 'ANDHRA UNIVERSITY', w * .5, h * .955, h * .03, { weight: 'bold', color: white, max: w * .7 });
  } else {
    g.fillStyle = '#d8cfa8'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3a48'; g.fillRect(w * .5, h * .03, w * .45, h * .04); g.fillRect(w * .58, h * .7, w * .35, h * .035);
    printLines(g, w * .3, h * .1, w * .66, h * .58, 4, 'rgba(140,70,40,.55)', 2.2); printLines(g, w * .3, h * .76, w * .66, h * .22, 4, 'rgba(140,70,40,.55)', 2.2);
    g.fillStyle = '#2a2622'; g.fillRect(w * .2, 0, 3, h);
  }
  const t = new T.CanvasTexture(canvas); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
