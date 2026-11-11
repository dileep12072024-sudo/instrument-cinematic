// Portfolio layer content. Every fact comes from docs/portfolio-layer.md (sources listed there): the department's own
// boards, plaques and door signs photographed in the building, its page on the university site, NAAC and NIRF
// announcements. Edit the words here; portfolio.js only lays them out.

export const department = {
  name: 'Department of Instrument Technology',
  short: 'Instrument Technology',
  college: 'AU College of Engineering (A)',
  university: 'Andhra University',
  city: 'Visakhapatnam',
};

const EYE = 1.62, HALL = .164 + EYE, CORRIDOR = -.376 + EYE, WING = -.916 + EYE, LANDING = 4.044 + EYE, CLASS = 3.504 + EYE, LOWER = 2.964 + EYE, EAST = 4.704 + EYE, GROUND_E = .704 + EYE;

// The walk: every stop is a real room in the building. sign: the blade sign over a professor's door (their photo pours
// out of it). Each holds at `eye`, framing `anchor` (the door, its sign, or the
// board); `route` is the walk from the previous stop's eye along corridors, steps and stairs (every point on a floor or a
// flight). group: which header link the stop belongs to. Coordinates are the main site's model (metres).
export const chapters = [
  // the arrival ends on the 3D model's own opening view, high on the front right (owner, 2026-10-25)
  { id: 'arrival', group: 'arrival', nav: 'Arrival', where: 'Outside, under today\u2019s sky', outdoors: true,
    eye: [42, 18, 80], anchor: [0, 13, 0], fov: 43, frame: 'centre' },
  { id: 'heritage', group: 'heritage', nav: 'Heritage', where: 'Entrance hall, ground floor',
    // through the doorway on the centre line and a step into the hall before turning to the boards: the open right
    // leaf reaches z 5.5 (architecture.js), and turning beside it filled the view with the door
    // (11, 6.5, 46): clear of the jacaranda's crown, which the flight grazed at (14, 7, 46) (E2E 2026-11-01; leaves 1.5 m off, not 0.2)
    route: [[30, 13, 64], [11, 6.5, 46], [3, 3.8, 36], [0, 3.1, 33], [0, 2.15, 21], [0, HALL, 12.6], [0, HALL, 8.6], [0, HALL, 6.4], [0, HALL, 5.1]],
    eye: [.3, HALL, 4.35], anchor: [3.72, 2.55, 5.12], fov: 56 },
  { id: 'admissions', group: 'admissions', nav: 'Admissions', where: 'Department office, west corridor',
    route: [[.1, HALL, 3.4], [-2.6, HALL, 2.2], [-4.7, CORRIDOR, 2.17], [-10, CORRIDOR, 2.2], [-16.2, CORRIDOR, 2.3]],
    eye: [-18.6, CORRIDOR, 2.7], anchor: [-20.45, 1.15, 1.09], fov: 54 },
  // the west wing: a passage running north-south below the corridor, the labs on its west wall. In order from the gate
  // corner (owner, 2026-10-19): DCS, Process Control, Industrial Instruments (ahead of the corridor), Sensors and
  // Transducers, Control Systems, Machines. The walk takes the one ahead, then the gate end, then the far end.
  { id: 'lab-instruments', group: 'labs', nav: 'Industrial Instruments Lab', where: 'West wing, ground floor',
    route: [[-20.0, CORRIDOR, 2.35], [-20.9, CORRIDOR, 2.2]],
    eye: [-21.3, CORRIDOR - .2, 2.17], anchor: [-24.42, .45, 2.2], fov: 56 },
  { id: 'lab-process', group: 'labs', nav: 'Process Control Lab', where: 'West wing, front passage',
    route: [[-21.9, CORRIDOR - .4, 2.17], [-22.5, WING, 2.0]],
    eye: [-22.75, WING, 1.55], anchor: [-24.4, 1.0, 4.15], fov: 56 },
  { id: 'lab-dcs', group: 'labs', nav: 'DCS Lab', where: 'West wing, by the gate',
    route: [[-23.0, WING, 3.4], [-23.15, WING, 6.5], [-23.15, WING, 10.2]],
    eye: [-23.1, WING, 12.0], anchor: [-24.3, .85, 14.3], fov: 56 },
  { id: 'lab-sensors', group: 'labs', nav: 'Sensors and Transducers Lab', where: 'West wing, ground floor',
    route: [[-23.15, WING, 9.5], [-23.15, WING, 5.5], [-23.05, WING, 2.6], [-23.0, WING, 1.4]],
    eye: [-23.0, WING, .7], anchor: [-24.3, .85, -.95], fov: 56 },
  { id: 'lab-control', group: 'labs', nav: 'Control Systems Laboratory', where: 'West wing, ground floor',
    route: [[-23.0, WING, -1.6], [-23.0, WING, -3.3]],
    eye: [-23.0, WING, -4.55], anchor: [-24.3, .85, -6.2], fov: 56 }, // its door past the windows (owner, 2026-10-26)
  { id: 'lab-machines', group: 'labs', nav: 'Machines Lab', where: 'West wing, ground floor',
    route: [[-23.0, WING, -5.2]],
    eye: [-23.0, WING, -5.9], anchor: [-24.3, .85, -7.7], fov: 56 },
  { id: 'lab-simulation', group: 'labs', nav: 'Simulation Lab', where: 'East corridor, ground floor',
    route: [[-23.0, WING, -3.6], [-23.15, WING, 1.1], [-22.55, WING, 2.3], [-21.3, CORRIDOR, 2.17], [-16, CORRIDOR, 2.2], [-10, CORRIDOR, 2.2], [-4.7, CORRIDOR, 2.17],
      [-2.6, HALL, 2.2], [0, HALL, 2.8], [2.6, HALL, 2.3], [3.65, HALL, 2.167], [4.7, GROUND_E, 2.167]],
    eye: [7.4, GROUND_E, 2.55], anchor: [5.45, 1.75, 1.1], fov: 56 },
  // the Seminar Hall passage runs both ways from the corridor: Electronics Lab II at its north end, by the folding gate
  // (spine-interior.js), seen first; then the walk turns about for the Measurements Lab at the rear (owner, 2026-11-01)
  { id: 'lab-electronics', group: 'labs', nav: 'Electronics Lab II', where: 'North end of the Seminar Hall passage',
    route: [[10, GROUND_E, 2.2], [16, GROUND_E, 2.2], [21.6, GROUND_E, 2.2], [23.25, GROUND_E, 2.7]],
    eye: [23.25, GROUND_E, 3.6], anchor: [23.25, 2.0, 7.85], fov: 56 },
  // at the rear end of the Seminar Hall passage (the door the model's sign called the Strong Room; owner, 2026-10-25)
  { id: 'lab-measurements', group: 'labs', nav: 'Measurements Lab', where: 'Rear of the Seminar Hall passage',
    route: [[23.25, GROUND_E, 2.6], [23.25, GROUND_E, 1.4], [23.25, GROUND_E, -2.6]],
    eye: [23.25, GROUND_E, -6.4], anchor: [23.37, 1.8, -11.2], fov: 56 },
  { id: 'guide', group: 'guide', nav: 'Finding your way', where: 'Library, first-floor landing',
    route: [[23.25, GROUND_E, -2.6], [23.2, GROUND_E, 1.6], [21, GROUND_E, 2.2], [12, GROUND_E, 2.2], [4.7, GROUND_E, 2.167], [3.65, HALL, 2.167], [2.67, HALL, 2.1],
      [2.67, HALL, .2], [2.67, 2.484 + EYE, -4.1], [2.3, 2.484 + EYE, -5.0], [.6, 2.484 + EYE, -5.15], [0, 2.484 + EYE, -4.1], [0, LANDING, -.7], [0, LANDING, .3]],
    eye: [-.45, LANDING, 1.25], anchor: [-2.55, 5.2, 3.4], fov: 56 },
  // the classroom wing: faculty rooms on the left, the classrooms at its far end down three steps
  { id: 'fac-daisy', group: 'faculty', nav: 'Dr. A. Daisy Rani', where: 'Classroom wing, first floor', person: 'daisy', sign: [-7.02, 6.12, 1.41],
    route: [[-1.4, LANDING, 1.9], [-2.4, LANDING, 1.85], [-3.98, LANDING, 1.82], [-4.62, CLASS, 1.9]],
    eye: [-4.6, CLASS, 2.5], anchor: [-6.55, 5.35, 1.2], fov: 54 },
  { id: 'fac-kamala', group: 'faculty', nav: 'Dr. A. Kamala Kumari', where: 'Classroom wing, first floor', person: 'kamala', sign: [-10.52, 6.12, 1.41],
    route: [[-6.2, CLASS, 2.3]],
    eye: [-8.0, CLASS, 2.5], anchor: [-10.05, 5.35, 1.2], fov: 54 },
  { id: 'hod', group: 'faculty', nav: 'Head of Department', where: 'Classroom wing, first floor', person: 'swapna', sign: [-13.92, 6.12, 1.41],
    route: [[-9.6, CLASS, 2.3]],
    eye: [-11.4, CLASS, 2.5], anchor: [-13.45, 5.35, 1.2], fov: 54 },
  // the classrooms, down three steps at the end of the wing: each seen from its own doorway
  { id: 'classroom-ii', group: 'classrooms', nav: 'Classroom II', where: 'End of the classroom wing',
    route: [[-14.5, CLASS, 2.2], [-18, CLASS, 2.17], [-20.7, CLASS, 2.17], [-21.64, LOWER, 2.17], [-22.6, LOWER, 2.2], [-23.1, LOWER, 2.9]],
    eye: [-23.15, LOWER, 4.4], anchor: [-29.5, 3.7, 9.6], fov: 60 },
  { id: 'classroom-iii', group: 'classrooms', nav: 'Classroom III', where: 'End of the classroom wing',
    route: [[-23.15, LOWER, 3.2], [-23.2, LOWER, 2.5], [-24.0, LOWER, 2.5]],
    eye: [-25.2, LOWER, 2.5], anchor: [-31.5, 3.6, -1.2], fov: 60 },
  // inside, like the other classrooms (owner, 2026-10-26): through its door off the side passage (world x -24.4,
  // z -6.73; the room spans x -24.5..-33.8, z -5.2..-14.8, its teaching wall at z -5.2) to the side aisle, looking
  // across the benches to the teaching wall
  { id: 'classroom-iv', group: 'classrooms', nav: 'Classroom IV', where: 'Classroom wing, side passage',
    route: [[-24.0, LOWER, 2.5], [-23.3, LOWER, 2.25], [-23.15, LOWER, 1.1], [-23.15, LOWER, -3.2], [-23.3, LOWER, -6.0], [-24.4, LOWER, -6.73], [-25.3, LOWER, -7.6]],
    eye: [-25.6, LOWER, -10.4], anchor: [-30.5, 4.2, -6.2], fov: 62 },
  // the east corridor on the first floor: professors' rooms on the left, the labs at its end
  { id: 'fac-patnaik', group: 'faculty', nav: 'Prof. M. Ramesh Patnaik', where: 'East corridor, first floor', person: 'patnaik', sign: [9.92, 7.12, 1.35],
    route: [[-25.3, LOWER, -7.6], [-24.4, LOWER, -6.73], [-23.3, LOWER, -6.0], [-23.15, LOWER, -1], [-23.2, LOWER, 1.4], [-22.7, LOWER, 2.25], [-21.64, LOWER, 2.17], [-20.7, CLASS, 2.17], [-12, CLASS, 2.2], [-4.62, CLASS, 1.9], [-3.98, LANDING, 1.82],
      [-2.4, LANDING, 1.85], [0, LANDING, 2.0], [2.6, LANDING, 2.1], [4.1, LANDING, 2.1], [4.9, EAST, 2.1]],
    eye: [6.9, EAST, 2.5], anchor: [9.55, 6.35, 1.25], fov: 54 },
  { id: 'fac-ysrao', group: 'faculty', nav: 'Prof. Y. Srinivasa Rao', where: 'East corridor, first floor', person: 'ysrao', sign: [12.52, 7.12, 1.35],
    route: [[8.4, EAST, 2.3]],
    eye: [9.7, EAST, 2.5], anchor: [12.15, 6.35, 1.25], fov: 54 },
  // the plain door between them (owner, 2026-10-26: his room)
  { id: 'fac-kotireddy', group: 'faculty', nav: 'Prof. D. V. Rama Koti Reddy', where: 'East corridor, first floor', person: 'kotireddy', sign: [14.62, 7.12, 1.35],
    route: [[10.75, EAST, 2.3]],
    eye: [11.8, EAST, 2.5], anchor: [14.25, 6.35, 1.25], fov: 54 },
  { id: 'fac-bhujanga', group: 'faculty', nav: 'Prof. A. Bhujanga Rao', where: 'East corridor, first floor', person: 'bhujanga', sign: [17.02, 7.12, 1.35],
    route: [[13.0, EAST, 2.3]],
    eye: [14.2, EAST, 2.5], anchor: [16.65, 6.35, 1.25], fov: 54 },
  { id: 'lab-devicefab', group: 'labs', nav: 'Device Fab Lab', where: 'East wing, first floor',
    route: [[17.6, EAST, 2.3]],
    eye: [20.3, EAST, 2.1], anchor: [24.37, 5.75, 2.09], fov: 54 },
  { id: 'lab-biomedical', group: 'labs', nav: 'Biomedical Instrumentation Lab', where: 'East wing, first floor',
    route: [[21.6, EAST, 2.1], [22.85, EAST, 2.0], [23.27, EAST, .5], [23.27, EAST, -3.5]],
    eye: [23.27, EAST, -7.4], anchor: [23.27, 5.75, -11.2], fov: 54 },
  { id: 'enter', group: 'enter', nav: 'Overview', where: 'Over the north campus', outdoors: true,
    route: [[23.27, EAST, -3.5], [23.0, EAST, 1.2], [21.4, EAST, 2.4], [20.4, EAST, 4.4], [19.8, 12.8, 6.2], [12, 15.6, 15], [4, 16.5, 34]],
    eye: [0, 15, 62], anchor: [0, 6.5, 0], fov: 40, frame: 'centre', through: [2.95, 6.4] }, // the front wall and the tree crowns before it, z from..to: crossed under a veil
  { id: 'foot', group: 'enter', nav: '', where: '', outdoors: true,
    route: [[-4, 19, 72]],
    eye: [-9, 24, 82], anchor: [0, 5, 0], fov: 38, frame: 'centre' },
];

// The people. Rooms, degrees and posts are from the door signs in the building; areas from the department's page; the
// Ph.D. years from the hall board of Ph.D. awardees; the years as head from the board of successive heads.
export const people = {
  swapna: { name: 'Dr. P. Swapna', role: 'Professor and Head of the Department', degrees: 'M.Tech, Ph.D. (Andhra University, 2015)', area: 'Industrial process instrumentation', photo: '/media/faculty/swapna.webp',
    note: 'Dr. Swapna heads the department and oversees its undergraduate, postgraduate and doctoral programmes. Academic matters are addressed to her office; admissions, certificates and fees are handled by the department office.' },
  daisy: { name: 'Dr. A. Daisy Rani', role: 'Associate Professor', degrees: 'Ph.D. (Andhra University, 2015)', area: 'MEMS and NEMS', photo: '/media/faculty/daisy-rani.webp',
    note: 'Her teaching and research are in micro- and nano-electromechanical systems, one of the department’s principal research areas.' },
  kamala: { name: 'Dr. A. Kamala Kumari', role: 'Associate Professor', degrees: 'M.Tech, Ph.D. (Andhra University, 2015)', area: 'Digital systems and computer electronics', photo: '/media/faculty/kamala-kumari.webp',
    note: 'Her teaching and research are in digital systems and computer electronics. She served as Head of the Department from 2022.' },
  patnaik: { name: 'Prof. M. Ramesh Patnaik', role: 'Professor', degrees: 'M.Tech, Ph.D. (Andhra University, 2011), F.I.E', area: 'Industrial process instrumentation', photo: '/media/faculty/ramesh-patnaik.webp',
    note: 'A Fellow of the Institution of Engineers (India), he served as Head of the Department from 2021.' },
  kotireddy: { name: 'Prof. D. V. Rama Koti Reddy', role: 'Professor', degrees: 'Ph.D. (Andhra University, 1996)', area: 'Sensors and sensor networks, MEMS and nanotechnology', photo: '/media/faculty/rama-koti-reddy.webp',
    note: 'His teaching and research are in sensors and sensor networks, MEMS and nanotechnology. He served as Head of the Department from 2017.' },
  ysrao: { name: 'Prof. Y. Srinivasa Rao', role: 'Professor', degrees: 'Ph.D.', area: 'Microelectronics', photo: '/media/faculty/y-srinivasa-rao.webp', note: '' },
  bhujanga: { name: 'Prof. A. Bhujanga Rao', role: 'Professor', degrees: 'Ph.D. (Andhra University, 2001)', area: 'Instrumentation', photo: '/media/faculty/bhujanga-rao.webp',
    note: 'He served as Head of the Department from 2012. The first floor of the east wing was inaugurated during his tenure, on 30 August 2015.' },
};

// Each lab's description, from the lab courses of the university's B.Tech (Instrumentation Engineering) scheme and the
// department's research areas. Descriptions only: where each room is belongs to the stop's own `where`.
export const labRooms = {
  'lab-instruments': { title: 'Industrial Instruments Lab', lead: 'Practical training in the instruments of the process industry. Transmitters and transducers for pressure, flow, level and temperature are studied, tested and calibrated against reference standards.' },
  'lab-process': { title: 'Process Control Lab', lead: 'Closed-loop control of level, flow, pressure and temperature. Students tune industrial controllers and evaluate their performance by the quarter-decay ratio and the IAE, ISE and ITAE criteria.' },
  'lab-dcs': { title: 'DCS Lab', lead: 'The final-year laboratory for distributed control systems and programmable logic controllers, the automation architecture of refineries, power stations and process plants.' },
  'lab-sensors': { title: 'Sensors and Transducers Lab', lead: 'The characterisation and calibration of transducers for strain, displacement, temperature, pressure and light, from the physical quantity to a measurable electrical signal.' },
  'lab-control': { title: 'Control Systems Laboratory', lead: 'Experiments in the time and frequency response of physical systems, stability analysis, and the design of compensators and controllers.' },
  'lab-machines': { title: 'Machines Lab', lead: 'Testing and performance analysis of DC machines, transformers and induction motors, the electrical machines that drive industrial plant.' },
  'lab-simulation': { title: 'Simulation Lab', lead: 'Modelling and simulation of instruments, processes and control loops, so that designs can be analysed and validated before they are built.' },
  'lab-electronics': { title: 'Electronics Lab II', lead: 'Analogue and digital electronic circuits, from amplifiers and oscillators to logic, the building blocks inside every instrument.' },
  'lab-measurements': { title: 'Measurements Lab', lead: 'Electrical and electronic measurement with bridges, meters and oscilloscopes, with emphasis on accuracy, calibration and the analysis of measurement error.' },
  'lab-devicefab': { title: 'Device Fab Lab', lead: 'Fabrication and testing of sensors and microdevices, supporting the department’s research in sensors, MEMS and nanotechnology.' },
  'lab-biomedical': { title: 'Biomedical Instrumentation Lab', lead: 'Instrumentation for physiological measurement: the acquisition of cardiac, muscular and neural signals (ECG, EMG and EEG) and the principles of patient safety.' },
};

export const classroomRooms = {
  'classroom-ii': { title: 'Classroom II', lead: 'A smart classroom for lectures, equipped with a projector and teaching boards, with seating facing a raised teaching platform.' },
  'classroom-iii': { title: 'Classroom III', lead: 'A smart classroom commissioned together with Classroom II. The plaque beside its entrance records the inauguration.' },
  'classroom-iv': { title: 'Classroom IV', lead: 'The third teaching room of the classroom wing, on the side passage beyond the Strong Room.' },
};

export const hero = {
  lines: ['Measuring', 'the world', 'since 1937.'],
  lead: 'Department of Instrument Technology, AU College of Engineering (A), Andhra University. A guided walk through the building: its heritage, laboratories, faculty and classrooms.',
  cue: 'Scroll to begin',
  // the four floating tabs: each walks to the first stop of its group
  chips: [
    { n: '01', title: 'Heritage', text: 'Established in 1937.', group: 'heritage' },
    { n: '02', title: 'Laboratories', text: 'Eleven teaching and research labs.', group: 'labs' },
    { n: '03', title: 'Faculty', text: 'Professors and their offices.', group: 'faculty' },
    { n: '04', title: 'Classrooms', text: 'Smart Classrooms II to IV.', group: 'classrooms' },
  ],
};

export const heritage = {
  title: 'Established in 1937.',
  lead: 'The department began as an instrument manufacturing section serving the university, and has grown into a centre for teaching and research in instrumentation and control engineering. The boards in this hall record those who have led it.',
  events: [
    { year: 1926, text: 'Andhra University is founded in Visakhapatnam.' },
    { year: 1937, text: 'An Instrument Manufacturing Section is established.' },
    { year: 1946, text: 'The section joins the Department of Applied Physics, covering instrumentation, optics and electronics.' },
    { year: 1966, text: 'Research begins in thin-film technology, photo-elasticity and ultrasonics.' },
    { year: 1990, text: 'It moves to the College of Engineering as the Department of Instrument Technology.' },
    { year: 2001, text: 'The M.Tech programme in Instrumentation and Control is introduced.' },
    { year: 2008, text: 'The west wing is inaugurated on 25 June by Prof. Y. C. Simhadri, Vice-Chancellor.' },
    { year: 2011, text: 'The renovated department is inaugurated on 8 May by Prof. Beela Satyanarayana, Vice-Chancellor.' },
    { year: 2015, text: 'The first floor of the east wing is inaugurated on 30 August.' },
  ],
  stats: [['1937', 'Established'], ['21', 'Heads of department'], ['10', 'Laboratories'], ['NBA', 'Accredited programmes']],
  now: 'Andhra University is accredited A++ by NAAC (CGPA 3.74, valid to 2030) and ranked 23rd among Indian universities in NIRF 2025.',
};

export const admissions = {
  title: 'Programmes and admissions.',
  lead: 'The department offers undergraduate, postgraduate and doctoral programmes. Admission enquiries are handled by the department office on the west corridor.',
  list: [
    { name: 'B.Tech, Instrumentation Engineering', length: '4 years', entry: 'Admission through AP EAPCET, with 45% in physics, chemistry and mathematics (40% for reserved categories).' },
    { name: 'M.Tech, Instrumentation and Control', length: '2 years', entry: 'GATE-qualified candidates are admitted first; remaining seats are filled through AP PGECET.' },
    { name: 'Ph.D.', length: 'Research', entry: 'Through the university’s research admissions, in sensors, MEMS, nanotechnology, and instrumentation and automation.' },
  ],
  objectivesTitle: 'Programme educational objectives (B.Tech)',
  objectives: [
    'To provide a strong foundation in mathematics, engineering sciences, electronics and instrumentation for careers in industry, research and academia.',
    'To develop the engineering breadth to analyse problems, innovate, and design products that serve society.',
    'To foster academic excellence, leadership in multidisciplinary teams and a commitment to lifelong learning.',
    'To instil professional ethics, effective communication and teamwork in investigation and research.',
    'To encourage entrepreneurship and innovation in meeting social, technical and business challenges.',
  ],
};

export const labs = {
  title: 'Laboratories and research.',
  lead: 'The department maintains eleven laboratories: six in the west wing, the Simulation, Electronics II and Measurements labs on the east side of the ground floor, and the Device Fab and Biomedical Instrumentation labs on the first floor of the east wing.',
  list: [
    { name: 'Industrial Instruments Lab', where: 'West wing, ground floor' },
    { name: 'Process Control Lab', where: 'West wing, front passage' },
    { name: 'Sensors and Transducers Lab', where: 'West wing, ground floor' },
    { name: 'Control Systems Laboratory', where: 'West wing, ground floor' },
    { name: 'Machines Lab', where: 'West wing, ground floor' },
    { name: 'DCS Lab', where: 'West wing, by the gate' },
    { name: 'Device Fab Lab', where: 'East wing, first floor' },
    { name: 'Biomedical Instrumentation Lab', where: 'East wing, first floor' },
    { name: 'Simulation Lab', where: 'East corridor, ground floor' },
    { name: 'Electronics Lab II', where: 'North end of the Seminar Hall passage' },
    { name: 'Measurements Lab', where: 'Rear of the Seminar Hall passage' },
  ],
  research: ['Sensors and sensor networks', 'MEMS', 'Nanotechnology', 'Instrumentation and automation', 'Thin films, photo-elasticity and ultrasonics'],
  facts: [
    'Research projects funded by UGC, DST, AICTE and DRDO, with support under the UGC Special Assistance Programme and DST-FIST.',
    'Approximately fifty research publications each year in IEEE, Springer and Elsevier journals.',
    'Testing and calibration of industrial instruments for VSP, L&T, Reliance and Ramky.',
  ],
};

export const guide = {
  title: 'Student information.',
  lead: 'The department library is on this first-floor landing. Facilities in the building, student support and campus services are listed below.',
  groups: [
    { title: 'Within the department', items: [
      'Timetables are displayed in the glass notice case in the entrance hall.',
      'Smart Classrooms II, III and IV are at the far end of the classroom wing, first floor.',
      'Laboratories occupy the west wing and the east corridor of the ground floor, and the east wing of the first floor.',
      'The department office is at the end of the west corridor, ground floor.',
    ] },
    { title: 'Student support', contacts: [
      ['Anti-ragging squad', '9703831117'], ['Women’s grievance and redressal cell', '9948810852'], ['Minority cell', '9985369669'],
      ['Cell for differently abled persons', '7995106419'], ['SC/ST cell', '9908036203'],
    ] },
    { title: 'Campus services', items: [
      'Dr. V. S. Krishna Library, the university’s central library, is open daily, including Sundays, except on national holidays.',
      'Training and Placement, AU College of Engineering: 0891 2844744, placement.aucea@andhrauniversity.edu.in.',
      'College of Engineering office: 0891 2844999 or 2754586, auceaprincipal@gmail.com.',
    ] },
  ],
};

// Faculty board in the entrance hall (newest source), with the door signs where the building shows the room.
export const faculty = {
  staffTitle: 'Administrative and technical staff',
  staff: [
    ['S. Phani', 'Typist'], ['N. V. D. Ganesh', 'Junior Assistant'], ['P. T. Reddy', 'Junior Assistant'],
    ['B. Pydi Raju', 'Record Assistant'], ['Md. Khadar Baba', 'Record Assistant'], ['K. Ramanamma', 'Record Assistant'],
    ['S. Ramesh', 'Machine Minder Grade-I'], ['K. Appala Raju', 'Mechanic'], ['P. Srinuvasa Rao', 'Consolidated pay'],
  ],
  headsTitle: 'Heads of the department',
  // the board's own spelling and dates; blank lines on the board are left out
  heads: [
    ['Prof. S. T. Krishna Swamy Chetty', 'to 1964'], ['Prof. T. V. Rame', ''], ['Prof. V. Rama Krishna Rao', '1966–78'], ['Prof. P. Sitarama Swamy', '1978–81'],
    ['Prof. K. Nagamuneswara Rao', '1981–84'], ['Prof. M. Bhaskara Rama Rao', ''], ['Prof. J. Ashok', ''], ['Prof. S. Gopala Krishna', '1990–93'],
    ['Dr. R. Ramanujam', '1993–96'], ['Prof. P. L. H. Vara Prasad', '2010–12'], ['Prof. A. Bhujanga Rao', '2012–'], ['Prof. D. V. Rama Koti Reddy', '2017'],
    ['Dr. M. Ramesh Patnaik', '2021'], ['Dr. A. Kamala Kumari', '2022'], ['Dr. P. Swapna', 'present'],
  ],
  headsNote: 'The board records twenty-one heads of the department; some entries are no longer legible.',
};

export const enter = {
  title: 'The whole department.',
  lead: 'Every corridor, laboratory and classroom you have walked through, under the live sky over Visakhapatnam. Contacts and directions are below.',
};

export const credits = {
  maker: { name: 'Dileep', link: 'https://github.com/dileep12072024-sudo', linkText: 'GitHub', instagram: 'Twelfth._string12' },
  guide: { name: 'Shivakaran', org: 'Sted.Space', link: 'https://sted.space/' },
};

export const footer = {
  address: ['Department of Instrument Technology', 'AU College of Engineering (A), Andhra University', 'Waltair Junction, Visakhapatnam 530003'],
  phones: [['University', '0891 2844000'], ['College of Engineering', '0891 2844999'], ['Training and Placement', '0891 2844744']],
  note: 'An independent portrait of the department, reconstructed from photographs and video of the building. This is not an official university website.',
};
