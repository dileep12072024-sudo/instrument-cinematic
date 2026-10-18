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

const EYE = 1.62, HALL = .164 + EYE, CORRIDOR = -.376 + EYE, WING = -.916 + EYE, LANDING = 4.044 + EYE, CLASS = 3.504 + EYE, EAST = 4.704 + EYE;

// The places. Each chapter holds at `eye`, framing `anchor` (the door or board it is about); `route` is the walk from
// the previous chapter's eye, along the corridors, steps and stairs (every point on a floor or a flight).
export const chapters = [
  { id: 'arrival', nav: 'Arrival', where: 'Outside, under tonight’s sky', outdoors: true,
    eye: [0, 4.2, 47], anchor: [0, 7.2, 0], fov: 38, frame: 'centre' },
  { id: 'heritage', nav: 'Heritage', where: 'Entrance hall, ground floor',
    route: [[0, 3.1, 33], [0, 2.15, 21], [0, HALL, 12.6], [0, HALL, 8.6], [.2, HALL, 6.4]],
    eye: [.45, HALL, 5.4], anchor: [3.72, 2.55, 5.12], fov: 56 },
  { id: 'admissions', nav: 'Admissions', where: 'Department office, west corridor',
    route: [[.1, HALL, 3.4], [-2.6, HALL, 2.2], [-4.7, CORRIDOR, 2.17], [-10, CORRIDOR, 2.2], [-16.2, CORRIDOR, 2.3]],
    eye: [-18.6, CORRIDOR, 2.7], anchor: [-20.45, 1.15, 1.09], fov: 54 },
  { id: 'labs', nav: 'Laboratories', where: 'West wing, ground floor',
    route: [[-20.0, CORRIDOR, 2.35], [-20.9, CORRIDOR, 2.2]],
    eye: [-21.3, CORRIDOR - .2, 2.17], anchor: [-24.42, .45, 2.2], fov: 56 },
  { id: 'guide', nav: 'Finding your way', where: 'Library, first-floor landing',
    route: [[-20.4, CORRIDOR, 2.2], [-16, CORRIDOR, 2.2], [-10, CORRIDOR, 2.2], [-4.7, CORRIDOR, 2.17], [-2.67, HALL, 2.1],
      [-2.67, HALL, .3], [-2.67, 2.484 + EYE, -4.0], [-2.3, 2.484 + EYE, -5.0], [-.6, 2.484 + EYE, -5.15], [0, 2.484 + EYE, -4.1],
      [0, LANDING, -.7], [0, LANDING, .3]],
    eye: [-.45, LANDING, 1.25], anchor: [-2.55, 5.2, 3.4], fov: 56 },
  { id: 'hod', nav: 'Head of Department', where: 'Classroom wing, first floor',
    route: [[-1.4, LANDING, 2.0], [-2.4, LANDING, 2.17], [-3.98, LANDING, 2.17], [-4.62, CLASS, 2.17], [-8.4, CLASS, 2.2]],
    eye: [-10.9, CLASS, 2.55], anchor: [-13.2, 4.75, 1.13], fov: 54 },
  { id: 'faculty', nav: 'Faculty', where: 'East corridor, first floor',
    route: [[-8.4, CLASS, 2.2], [-4.62, CLASS, 2.17], [-3.98, LANDING, 2.17], [-2.4, LANDING, 2.17], [0, LANDING, 2.0], [2.6, LANDING, 2.1],
      [4.1, LANDING, 2.1], [4.9, EAST, 2.1]],
    eye: [6.6, EAST, 2.55], anchor: [11.9, 5.75, 1.09], fov: 56 },
  { id: 'enter', nav: 'Step inside', where: 'Over the north campus', outdoors: true,
    route: [[9, EAST, 2.4], [11, EAST, 2.6], [11.5, EAST, 4.4], [11.3, 12.8, 6.2], [8.5, 15.6, 15], [4, 16.5, 34]],
    eye: [0, 15, 62], anchor: [0, 6.5, 0], fov: 40, frame: 'centre', through: [2.95, 6.4] }, // the front wall and the tree crowns before it, z from..to: crossed under a veil
  { id: 'foot', nav: '', where: '', outdoors: true,
    route: [[-4, 19, 72]],
    eye: [-9, 24, 82], anchor: [0, 5, 0], fov: 38, frame: 'centre' },
];

// Live views (Kage's card viewports): a camera in another part of the building, rendered into a frame on the page.
export const views = {
  hall: { eye: [0, HALL, 10.4], look: [0, 2.0, 2.4], fov: 50, label: 'Entrance hall', note: 'Right now' },
  boards: { eye: [.45, HALL, 5.4], look: [3.72, 2.55, 5.12], fov: 50, label: 'The hall boards', note: 'Ground floor' },
  office: { eye: [-18.2, CORRIDOR, 2.75], look: [-20.45, 1.15, 1.09], fov: 50, label: 'Department office', note: 'West corridor' },
  process: { eye: [-21.1, CORRIDOR - .2, 2.17], look: [-24.42, .45, 2.2], fov: 46, label: 'Process Control Lab', note: 'West wing, ground floor' },
  devicefab: { eye: [20.6, EAST, 2.1], look: [24.37, 5.75, 2.09], fov: 46, label: 'Device Fab Lab', note: 'East wing, first floor' },
  biomedical: { eye: [23.27, EAST, -6.4], look: [23.27, 5.75, -11.2], fov: 46, label: 'Biomedical Instrumentation Lab', note: 'East wing, first floor' },
  library: { eye: [-.45, LANDING, 1.25], look: [-2.55, 5.2, 3.4], fov: 50, label: 'Department library', note: 'First-floor landing' },
  swapna: { eye: [-10.1, CLASS, 2.35], look: [-13.6, 5.6, 1.25], fov: 50, label: 'Dr. P. Swapna', note: 'Classroom wing, first floor' },
  kamala: { eye: [-6.9, CLASS, 2.35], look: [-10.2, 5.6, 1.25], fov: 50, label: 'Dr. A. Kamala Kumari', note: 'Classroom wing, first floor' },
  patnaik: { eye: [6.4, EAST, 2.3], look: [9.7, 6.35, 1.25], fov: 50, label: 'Prof. M. Ramesh Patnaik', note: 'East corridor, first floor' },
  ysrao: { eye: [9.0, EAST, 2.3], look: [12.3, 6.35, 1.25], fov: 50, label: 'Prof. Y. Srinivasa Rao', note: 'East corridor, first floor' },
  bhujanga: { eye: [13.5, EAST, 2.3], look: [16.8, 6.35, 1.25], fov: 50, label: 'Prof. A. Bhujanga Rao', note: 'East corridor, first floor' },
  classrooms: { eye: [-17.5, CLASS, 2.17], look: [-24, 4.3, 2.4], fov: 50, label: 'Classrooms II, III and IV', note: 'End of the classroom wing' },
};

export const hero = {
  lines: ['Measuring', 'the world', 'since 1937.'],
  lead: 'The Department of Instrument Technology, AU College of Engineering (A), Andhra University. Walk in: every chapter below stops at a real door in the building.',
  cue: 'Scroll to walk in',
  // the four floating tabs: each turns the window to its place
  chips: [
    { n: '01', title: 'Heritage', text: 'The boards in the entrance hall.', view: 'boards', to: 'heritage' },
    { n: '02', title: 'Admissions', text: 'The office at the end of the west corridor.', view: 'office', to: 'admissions' },
    { n: '03', title: 'Laboratories', text: 'Seven labs across both wings.', view: 'process', to: 'labs' },
    { n: '04', title: 'Faculty', text: 'Every door on the first floor.', view: 'patnaik', to: 'faculty' },
  ],
  peek: 'hall',
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
  stats: [['1937', 'Founded'], ['21', 'Heads of department'], ['7', 'Laboratories'], ['NBA', 'Accredited programmes']],
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
  lead: 'Ahead is the Process Control Lab. The west wing holds the industrial labs; the device and biomedical labs are upstairs in the east wing.',
  cards: ['process', 'devicefab', 'biomedical'],
  list: [
    { name: 'Process Control Lab', where: 'West wing, ground floor, ahead of the corridor' },
    { name: 'Industrial Instruments Lab', where: 'West wing, ground floor' },
    { name: 'Control Systems Laboratory', where: 'West wing, ground floor' },
    { name: 'DCS Lab', where: 'West wing, at the gate' },
    { name: 'Device Fab Lab', where: 'East wing, first floor, end of the corridor' },
    { name: 'Biomedical Instrumentation Lab', where: 'East wing, first floor, south passage' },
    { name: 'Electronics Lab II', where: 'East side, ground floor' },
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

export const hod = {
  title: 'Head of the Department.',
  name: 'Dr. P. Swapna',
  role: 'Professor and Head of the Department',
  degrees: 'M.Tech, Ph.D',
  area: 'Industrial process instrumentation',
  room: 'Her room is the second door on the left, under the blade sign.',
  lead: 'The department office handles admissions, certificates and fees; academic matters come here.',
  next: [
    { view: 'kamala', name: 'Dr. A. Kamala Kumari', text: 'Associate Professor, the door before it. Head of the department from 2022.' },
    { view: 'classrooms', name: 'Classrooms II, III and IV', text: 'At the end of this corridor, down three steps.' },
  ],
};

// Faculty board in the entrance hall (newest source), with the door signs where the building shows the room.
export const faculty = {
  title: 'The people who teach here.',
  lead: 'Hover a name to see the door. Every room the building shows is on this floor or in the classroom wing.',
  people: [
    { name: 'Dr. P. Swapna', role: 'Professor and Head of the Department', area: 'Industrial process instrumentation', room: 'Classroom wing, first floor', view: 'swapna' },
    { name: 'Prof. A. Bhujanga Rao', role: 'Professor', area: 'Instrumentation', room: 'East corridor, first floor', view: 'bhujanga' },
    { name: 'Prof. D. V. Rama Koti Reddy', role: 'Professor', area: 'Sensors and sensor networks, MEMS, nanotechnology', room: '' },
    { name: 'Prof. Y. Srinivasa Rao', role: 'Professor', area: 'Microelectronics', room: 'East corridor, first floor', view: 'ysrao' },
    { name: 'Prof. M. Ramesh Patnaik', role: 'Professor', area: 'Industrial process instrumentation', room: 'East corridor, first floor', view: 'patnaik' },
    { name: 'Dr. A. Kamala Kumari', role: 'Associate Professor', area: 'Digital systems and computer electronics', room: 'Classroom wing, first floor', view: 'kamala' },
    { name: 'Dr. A. Daisy Rani', role: 'Faculty', area: 'Industrial process instrumentation', room: '' },
  ],
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
