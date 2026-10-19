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

// The walk: every stop is a real room in the building. Each holds at `eye`, framing `anchor` (the door, its sign, or the
// board); `route` is the walk from the previous stop's eye along corridors, steps and stairs (every point on a floor or a
// flight). group: which header link the stop belongs to. Coordinates are the main site's model (metres).
export const chapters = [
  { id: 'arrival', group: 'arrival', nav: 'Arrival', where: 'Outside, under today\u2019s sky', outdoors: true,
    eye: [0, 4.2, 47], anchor: [0, 7.2, 0], fov: 38, frame: 'centre' },
  { id: 'heritage', group: 'heritage', nav: 'Heritage', where: 'Entrance hall, ground floor',
    route: [[0, 3.1, 33], [0, 2.15, 21], [0, HALL, 12.6], [0, HALL, 8.6], [.2, HALL, 6.4]],
    eye: [.45, HALL, 5.4], anchor: [3.72, 2.55, 5.12], fov: 56 },
  { id: 'admissions', group: 'admissions', nav: 'Admissions', where: 'Department office, west corridor',
    route: [[.1, HALL, 3.4], [-2.6, HALL, 2.2], [-4.7, CORRIDOR, 2.17], [-10, CORRIDOR, 2.2], [-16.2, CORRIDOR, 2.3]],
    eye: [-18.6, CORRIDOR, 2.7], anchor: [-20.45, 1.15, 1.09], fov: 54 },
  // the west wing: a passage running north-south below the corridor, the labs on its west wall
  { id: 'lab-process', group: 'labs', nav: 'Process Control Lab', where: 'West wing, ground floor',
    route: [[-20.0, CORRIDOR, 2.35], [-20.9, CORRIDOR, 2.2]],
    eye: [-21.3, CORRIDOR - .2, 2.17], anchor: [-24.42, .45, 2.2], fov: 56 },
  { id: 'lab-instruments', group: 'labs', nav: 'Industrial Instruments Lab', where: 'West wing, ground floor',
    route: [[-21.9, CORRIDOR - .4, 2.1], [-22.6, WING, 1.6], [-23.0, WING, .6]],
    eye: [-23.0, WING, -.7], anchor: [-24.3, .85, -2.45], fov: 56 },
  { id: 'lab-control', group: 'labs', nav: 'Control Systems Laboratory', where: 'West wing, ground floor',
    route: [[-23.0, WING, -2.6], [-23.0, WING, -4.6]],
    eye: [-23.0, WING, -5.9], anchor: [-24.3, .85, -7.7], fov: 56 },
  { id: 'lab-dcs', group: 'labs', nav: 'DCS Lab', where: 'West wing, by the gate',
    route: [[-23.1, WING, -3.5], [-23.2, WING, 1.5], [-23.2, WING, 6.5], [-23.15, WING, 10.4]],
    eye: [-23.1, WING, 12.0], anchor: [-24.3, .85, 14.3], fov: 56 },
  { id: 'lab-simulation', group: 'labs', nav: 'Simulation Lab', where: 'East corridor, ground floor',
    route: [[-23.1, WING, 8], [-23.0, WING, 3.4], [-22.4, WING, 2.17], [-21.3, CORRIDOR, 2.17], [-16, CORRIDOR, 2.2], [-10, CORRIDOR, 2.2], [-4.7, CORRIDOR, 2.17],
      [-2.6, HALL, 2.2], [0, HALL, 2.8], [2.6, HALL, 2.3], [3.65, HALL, 2.167], [4.7, GROUND_E, 2.167]],
    eye: [7.4, GROUND_E, 2.55], anchor: [5.45, 1.75, 1.1], fov: 56 },
  { id: 'lab-electronics', group: 'labs', nav: 'Electronics Lab II', where: 'East side, ground floor',
    route: [[10, GROUND_E, 2.2], [16, GROUND_E, 2.2], [21.6, GROUND_E, 2.2], [23.25, GROUND_E, 2.7]],
    eye: [23.25, GROUND_E, 4.8], anchor: [23.25, 1.85, 7.85], fov: 56 },
  { id: 'guide', group: 'guide', nav: 'Finding your way', where: 'Library, first-floor landing',
    route: [[23.2, GROUND_E, 2.6], [21, GROUND_E, 2.2], [12, GROUND_E, 2.2], [4.7, GROUND_E, 2.167], [3.65, HALL, 2.167], [2.67, HALL, 2.1],
      [2.67, HALL, .2], [2.67, 2.484 + EYE, -4.1], [2.3, 2.484 + EYE, -5.0], [.6, 2.484 + EYE, -5.15], [0, 2.484 + EYE, -4.1], [0, LANDING, -.7], [0, LANDING, .3]],
    eye: [-.45, LANDING, 1.25], anchor: [-2.55, 5.2, 3.4], fov: 56 },
  // the classroom wing: faculty rooms on the left, the classrooms at its far end down three steps
  { id: 'fac-daisy', group: 'faculty', nav: 'Dr. A. Daisy Rani', where: 'Classroom wing, first floor', person: 'daisy',
    route: [[-1.4, LANDING, 2.0], [-2.4, LANDING, 2.17], [-3.98, LANDING, 2.17], [-4.62, CLASS, 2.17]],
    eye: [-4.6, CLASS, 2.5], anchor: [-6.55, 5.35, 1.2], fov: 54 },
  { id: 'fac-kamala', group: 'faculty', nav: 'Dr. A. Kamala Kumari', where: 'Classroom wing, first floor', person: 'kamala',
    route: [[-6.2, CLASS, 2.3]],
    eye: [-8.0, CLASS, 2.5], anchor: [-10.05, 5.35, 1.2], fov: 54 },
  { id: 'hod', group: 'faculty', nav: 'Head of Department', where: 'Classroom wing, first floor', person: 'swapna',
    route: [[-9.6, CLASS, 2.3]],
    eye: [-11.4, CLASS, 2.5], anchor: [-13.45, 5.35, 1.2], fov: 54 },
  { id: 'classrooms', group: 'classrooms', nav: 'Classrooms II and III', where: 'End of the classroom wing',
    route: [[-14.5, CLASS, 2.2], [-18, CLASS, 2.17], [-20.7, CLASS, 2.17], [-21.64, LOWER, 2.17]],
    eye: [-22.0, LOWER, 1.95], anchor: [-23.7, 3.9, 3.2], fov: 58 },
  { id: 'classroom-iv', group: 'classrooms', nav: 'Classroom IV', where: 'Classroom wing, side passage',
    route: [[-23.15, LOWER, 1.2], [-23.15, LOWER, -1.8]],
    eye: [-23.15, LOWER, -4.3], anchor: [-24.2, 3.9, -6.73], fov: 56 },
  // the east corridor on the first floor: professors' rooms on the left, the labs at its end
  { id: 'fac-patnaik', group: 'faculty', nav: 'Prof. M. Ramesh Patnaik', where: 'East corridor, first floor', person: 'patnaik',
    route: [[-23.15, LOWER, -1], [-22.6, LOWER, 1.8], [-21.64, LOWER, 2.17], [-20.7, CLASS, 2.17], [-12, CLASS, 2.2], [-4.62, CLASS, 2.17], [-3.98, LANDING, 2.17],
      [-2.4, LANDING, 2.17], [0, LANDING, 2.0], [2.6, LANDING, 2.1], [4.1, LANDING, 2.1], [4.9, EAST, 2.1]],
    eye: [6.9, EAST, 2.5], anchor: [9.55, 6.35, 1.25], fov: 54 },
  { id: 'fac-ysrao', group: 'faculty', nav: 'Prof. Y. Srinivasa Rao', where: 'East corridor, first floor', person: 'ysrao',
    route: [[8.4, EAST, 2.3]],
    eye: [9.7, EAST, 2.5], anchor: [12.15, 6.35, 1.25], fov: 54 },
  { id: 'fac-bhujanga', group: 'faculty', nav: 'Prof. A. Bhujanga Rao', where: 'East corridor, first floor', person: 'bhujanga',
    route: [[11.6, EAST, 2.3]],
    eye: [14.2, EAST, 2.5], anchor: [16.65, 6.35, 1.25], fov: 54 },
  { id: 'lab-devicefab', group: 'labs', nav: 'Device Fab Lab', where: 'East wing, first floor',
    route: [[17.6, EAST, 2.3]],
    eye: [20.3, EAST, 2.1], anchor: [24.37, 5.75, 2.09], fov: 54 },
  { id: 'lab-biomedical', group: 'labs', nav: 'Biomedical Instrumentation Lab', where: 'East wing, first floor',
    route: [[21.6, EAST, 2.05], [23.27, EAST, .4], [23.27, EAST, -3.5]],
    eye: [23.27, EAST, -7.4], anchor: [23.27, 5.75, -11.2], fov: 54 },
  { id: 'enter', group: 'enter', nav: 'Step inside', where: 'Over the north campus', outdoors: true,
    route: [[23.27, EAST, -3.5], [23.0, EAST, 1.2], [21.4, EAST, 2.4], [20.4, EAST, 4.4], [19.8, 12.8, 6.2], [12, 15.6, 15], [4, 16.5, 34]],
    eye: [0, 15, 62], anchor: [0, 6.5, 0], fov: 40, frame: 'centre', through: [2.95, 6.4] }, // the front wall and the tree crowns before it, z from..to: crossed under a veil
  { id: 'foot', group: 'enter', nav: '', where: '', outdoors: true,
    route: [[-4, 19, 72]],
    eye: [-9, 24, 82], anchor: [0, 5, 0], fov: 38, frame: 'centre' },
];

// The people. Rooms, degrees and posts are from the door signs in the building; areas from the department's page; the
// Ph.D years from the hall board of Ph.D awardees; the years as head from the board of successive heads.
export const people = {
  swapna: { name: 'Dr. P. Swapna', role: 'Professor and Head of the Department', degrees: 'M.Tech, Ph.D (Andhra University, 2015)', area: 'Industrial process instrumentation', photo: '/media/faculty/swapna.webp',
    note: 'The department\u2019s present head. Her room is this door, under the blade sign; academic matters come here, while the department office handles admissions, certificates and fees.' },
  daisy: { name: 'Dr. A. Daisy Rani', role: '', // post not yet confirmed
    degrees: 'Ph.D (Andhra University, 2015)', area: 'Industrial process instrumentation', photo: '/media/faculty/daisy-rani.webp',
    note: 'The first room in the classroom wing corridor.' },
  kamala: { name: 'Dr. A. Kamala Kumari', role: 'Associate Professor', degrees: 'M.Tech, Ph.D (Andhra University, 2015)', area: 'Digital systems and computer electronics', photo: '/media/faculty/kamala-kumari.webp',
    note: 'Head of the department from 2022.' },
  patnaik: { name: 'Prof. M. Ramesh Patnaik', role: 'Professor', degrees: 'M.Tech, Ph.D (Andhra University, 2011), F.I.E', area: 'Industrial process instrumentation',
    note: 'Head of the department from 2021.' },
  ysrao: { name: 'Prof. Y. Srinivasa Rao', role: 'Professor', degrees: 'Ph.D', area: 'Microelectronics', photo: '/media/faculty/y-srinivasa-rao.webp', note: '' },
  bhujanga: { name: 'Prof. A. Bhujanga Rao', role: 'Professor', degrees: 'Ph.D (Andhra University, 2001)', area: 'Instrumentation', photo: '/media/faculty/bhujanga-rao.webp',
    note: 'Head of the department from 2012; the first floor of this wing was inaugurated during his term, on 30 August 2015.' },
};

// Each lab's own line: what it is for, as the B.Tech and M.Tech courses use it, and where its door is.
export const labRooms = {
  'lab-process': { title: 'Process Control Lab', lead: 'Straight ahead at the foot of the steps. Closed control loops of level, flow, pressure and temperature: tuning a controller and watching a plant answer it.' },
  'lab-instruments': { title: 'Industrial Instruments Lab', lead: 'The transmitters and transducers of a working plant, measured, compared and calibrated: pressure, flow, level and temperature.' },
  'lab-control': { title: 'Control Systems Laboratory', lead: 'Control theory at the bench: how a system responds, what keeps it stable, and how a controller shapes it.' },
  'lab-dcs': { title: 'DCS Lab', lead: 'Distributed control systems, the plant-wide architecture that runs refineries and power stations, at the far end of the wing by the gate.' },
  'lab-simulation': { title: 'Simulation Lab', lead: 'Instruments and control systems modelled and tested on the computer before they are built.' },
  'lab-electronics': { title: 'Electronics Lab II', lead: 'The electronic circuits behind every instrument: amplifiers, filters, converters and signal conditioning. At the end of the passage past the Seminar Hall.' },
  'lab-devicefab': { title: 'Device Fab Lab', lead: 'Where sensors and devices are made, the bench for the department\u2019s research in MEMS, thin films and nanotechnology.' },
  'lab-biomedical': { title: 'Biomedical Instrumentation Lab', lead: 'Instruments that read the body: the signals of heart, muscle and brain, and how they are measured safely.' },
};

export const classroomRooms = {
  classrooms: { title: 'Smart Classrooms II and III', lead: 'Down three steps at the end of the wing: Classroom II to the right, Classroom III ahead. Both were opened as smart classrooms, with projectors and boards at the teaching platform.' },
  'classroom-iv': { title: 'Classroom IV', lead: 'Along the side passage, past the Strong Room. The last teaching room in the wing.' },
};

export const hero = {
  lines: ['Measuring', 'the world', 'since 1937.'],
  lead: 'The Department of Instrument Technology, AU College of Engineering (A), Andhra University. Walk in: every chapter below stops at a real door in the building.',
  cue: 'Scroll to walk in',
  // the four floating tabs: each walks to the first stop of its group
  chips: [
    { n: '01', title: 'Heritage', text: 'The boards in the entrance hall.', group: 'heritage' },
    { n: '02', title: 'Laboratories', text: 'Eight labs, each at its own door.', group: 'labs' },
    { n: '03', title: 'Faculty', text: 'Every professor, at their own room.', group: 'faculty' },
    { n: '04', title: 'Classrooms', text: 'At the end of the classroom wing.', group: 'classrooms' },
  ],
};

export const heritage = {
  title: 'Measuring since 1937.',
  lead: 'It began as a workshop that built instruments for the university, and grew into a department that teaches how to design, calibrate and trust them. The names of everyone who has led it are on the boards in front of you.',
  events: [
    { year: 1926, text: 'Andhra University is founded in Visakhapatnam.' },
    { year: 1937, text: 'An Instrument Manufacturing Section is started.' },
    { year: 1946, text: 'It becomes part of the Department of Applied Physics: instrumentation, optics and electronics.' },
    { year: 1966, text: 'Research begins in thin-film technology, photo-elasticity and ultrasonics.' },
    { year: 1990, text: 'Moves to the College of Engineering as the Department of Instrument Technology.' },
    { year: 2001, text: 'The M.Tech in Instrumentation and Control begins.' },
    { year: 2008, text: 'The west wing is inaugurated on 25 June by Prof. Y. C. Simhadri, Vice-Chancellor.' },
    { year: 2011, text: 'The renovated department is inaugurated on 8 May by Prof. Beela Satyanarayana, Vice-Chancellor.' },
    { year: 2015, text: 'The first floor of the east wing opens on 30 August.' },
  ],
  stats: [['1937', 'Founded'], ['21', 'Heads of department'], ['8', 'Laboratories'], ['NBA', 'Accredited programmes']],
  now: 'Andhra University holds NAAC A++ (CGPA 3.74, valid to 2030) and is ranked 23rd among Indian universities in NIRF 2025.',
};

export const admissions = {
  title: 'Three ways in.',
  lead: 'The department office is the last door on the west corridor. Three programmes are taught in this building.',
  list: [
    { name: 'B.Tech, Instrumentation Engineering', length: '4 years', entry: 'Admission through AP EAPCET, with 45% in physics, chemistry and mathematics (40% for reserved categories).' },
    { name: 'M.Tech, Instrumentation and Control', length: '2 years', entry: 'GATE-qualified candidates are admitted first; the remaining seats are filled through AP PGECET.' },
    { name: 'Ph.D', length: 'Research', entry: 'Sensors, MEMS, nanotechnology, instrumentation and automation, through the university’s research admissions.' },
  ],
  objectivesTitle: 'What the B.Tech sets out to do',
  objectives: [
    'A solid foundation in mathematics, engineering sciences, electronics and instrumentation, for careers in industry, research and academics.',
    'Engineering breadth to analyse, innovate and design new products, and to solve real problems for society.',
    'An academic environment of excellence, leadership in multidisciplinary teams, and lifelong learning.',
    'Professional ethics, communication and teamwork for open-ended investigation and research.',
    'Entrepreneurship and innovation, leading efforts on social, technical and business challenges.',
  ],
};

export const labs = {
  title: 'Where the measuring happens.',
  lead: 'The walk calls at every lab in turn. The west wing holds the industrial labs, the east side the simulation and electronics labs, and the device and biomedical labs are upstairs in the east wing.',
  list: [
    { name: 'Process Control Lab', where: 'West wing, ground floor, ahead of the corridor' },
    { name: 'Industrial Instruments Lab', where: 'West wing, ground floor' },
    { name: 'Control Systems Laboratory', where: 'West wing, ground floor' },
    { name: 'DCS Lab', where: 'West wing, by the gate' },
    { name: 'Device Fab Lab', where: 'East wing, first floor, end of the corridor' },
    { name: 'Biomedical Instrumentation Lab', where: 'East wing, first floor, south passage' },
    { name: 'Simulation Lab', where: 'East corridor, ground floor' },
    { name: 'Electronics Lab II', where: 'East side, ground floor, past the Seminar Hall' },
  ],
  research: ['Sensors and sensor networks', 'MEMS', 'Nanotechnology', 'Instrumentation and automation', 'Thin films, photo-elasticity and ultrasonics'],
  facts: [
    'Projects funded by UGC, DST, AICTE and DRDO, with UGC Special Assistance Programme and DST FIST support.',
    'About fifty research papers a year in IEEE, Springer and Elsevier journals.',
    'Testing and calibration of industrial instruments for VSP, L&T, Reliance and Ramky.',
  ],
};

export const guide = {
  title: 'Finding your way.',
  lead: 'You are on the first-floor landing. The department library is the door on your left; the classroom wing is straight through the glass doors.',
  groups: [
    { title: 'In the building', items: [
      'Timetables: the glass case on the left wall of the entrance hall.',
      'Smart Classrooms II, III and IV: through the classroom-wing doors on this landing, at the far end.',
      'Laboratories: the west wing on the ground floor, and the east wing on this floor.',
      'Department office: the last door on the west corridor, ground floor.',
    ] },
    { title: 'Help, whenever you need it', contacts: [
      ['Anti-ragging squad', '9703831117'], ['Women’s grievance and redressal cell', '9948810852'], ['Minority cell', '9985369669'],
      ['Cell for differently abled persons', '7995106419'], ['SC/ST cell', '9908036203'],
    ] },
    { title: 'Around the campus', items: [
      'Dr. V. S. Krishna Library, the central library, is open every day including Sundays, except national holidays.',
      'Training and Placement, AU College of Engineering: 0891 2844744, placement.aucea@andhrauniversity.edu.in.',
      'College of Engineering office: 0891 2844999 or 2754586, auceaprincipal@gmail.com.',
    ] },
  ],
};

// Faculty board in the entrance hall (newest source), with the door signs where the building shows the room.
export const faculty = {
  alsoNote: 'Also on the faculty: Prof. D. V. Rama Koti Reddy (sensors and sensor networks, MEMS and nanotechnology), head of the department from 2017. Every other professor\u2019s room is on this walk.',
  staffTitle: 'Department office and laboratories',
  staff: [
    ['S. Phani', 'Typist'], ['N. V. D. Ganesh', 'Junior Assistant'], ['P. T. Reddy', 'Junior Assistant'],
    ['B. Pydi Raju', 'Record Assistant'], ['Md. Khadar Baba', 'Record Assistant'], ['K. Ramanamma', 'Record Assistant'],
    ['S. Ramesh', 'Machine Minder Grade-I'], ['K. Appala Raju', 'Mechanic'], ['P. Srinuvasa Rao', 'Consolidated pay'],
  ],
  headsTitle: 'Successive heads of the department',
  // the board's own spelling and dates; blank lines on the board are left out
  heads: [
    ['Prof. S. T. Krishna Swamy Chetty', 'to 1964'], ['Prof. T. V. Rame', ''], ['Prof. V. Rama Krishna Rao', '1966–78'], ['Prof. P. Sitarama Swamy', '1978–81'],
    ['Prof. K. Nagamuneswara Rao', '1981–84'], ['Prof. M. Bhaskara Rama Rao', ''], ['Prof. J. Ashok', ''], ['Prof. S. Gopala Krishna', '1990–93'],
    ['Dr. R. Ramanujam', '1993–96'], ['Prof. P. L. H. Vara Prasad', '2010–12'], ['Prof. A. Bhujanga Rao', '2012–'], ['Prof. D. V. Rama Koti Reddy', '2017'],
    ['Dr. M. Ramesh Patnaik', '2021'], ['Dr. A. Kamala Kumari', '2022'], ['Dr. P. Swapna', 'present'],
  ],
  headsNote: 'Twenty-one heads are numbered on the board; a few lines on it are no longer legible.',
};

export const enter = {
  title: 'Step inside.',
  lead: 'The whole building is here: every corridor, classroom and lab, under the real sky over Visakhapatnam right now.',
  explore: 'Explore the campus',
  walk: 'Walk in as a student',
};

export const credits = {
  maker: { name: 'Dileep', link: 'https://github.com/dileep12072024-sudo', linkText: 'GitHub' },
  guide: { name: 'Shivakaran', org: 'Sted.Space', link: 'https://sted.space/' },
};

export const footer = {
  address: ['Department of Instrument Technology', 'AU College of Engineering (A), Andhra University', 'Waltair Junction, Visakhapatnam 530003'],
  phones: [['University', '0891 2844000'], ['College of Engineering', '0891 2844999'], ['Training and Placement', '0891 2844744']],
  note: 'An independent portrait of the department, reconstructed from photographs and film of the building. Not an official university site.',
};
