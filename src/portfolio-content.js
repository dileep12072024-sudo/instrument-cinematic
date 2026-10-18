// Portfolio layer content. Every fact comes from docs/portfolio-layer.md (sources listed there): the department's own
// boards and plaques photographed in the building, the department's page on the university site, Wikipedia, NAAC/NIRF
// news. Telugu lines are for the owner to proofread. Edit here; portfolio.js only lays this out.

const since = 1937, years = new Date().getFullYear() - since;

export const department = {
  name: 'Department of Instrument Technology',
  short: 'Instrument Technology',
  college: 'AU College of Engineering (A)',
  university: 'Andhra University',
  city: 'Visakhapatnam',
  telugu: 'ఇన్‌స్ట్రుమెంట్ టెక్నాలజీ విభాగం, ఆంధ్ర విశ్వవిద్యాలయం',
  head: 'Dr. P. Swapna',
};

// Each chapter is a camera waypoint over the live campus: eye, target, fov (degrees). Composed for a 16:9 frame;
// portfolio.js steps back on tall screens.
export const chapters = [
  { id: 'arrival', scale: 'Arrival', cam: { eye: [0, 4.2, 47], target: [0, 7.2, 0], fov: 38 } },
  { id: 'heritage', scale: 'Since 1937', cam: { eye: [-7.5, 2.1, 24], target: [1.5, 8.4, 6], fov: 46 } },
  { id: 'programmes', scale: 'Programmes', cam: { eye: [7, 3.2, 25], target: [21, 6, 5], fov: 44 } },
  { id: 'people', scale: 'People', cam: { eye: [-6, 3.4, 21], target: [-22, 5, 7], fov: 44 } },
  { id: 'labs', scale: 'Labs', cam: { eye: [26, 27, 34], target: [-1, 3, -2], fov: 42 } },
  { id: 'guide', scale: 'For students', cam: { eye: [0, 1.75, 13.5], target: [0, 2.0, -4], fov: 58 } },
  { id: 'enter', scale: 'Step inside', cam: { eye: [-30, 44, 74], target: [0, 4, 0], fov: 38 } },
];

export const hero = {
  title: 'The department that measures.',
  telugu: 'కొలవడం ద్వారా తెలుసుకోవడం',
  lead: `${department.short} at ${department.college}, ${department.university}, ${department.city}. Teaching instrumentation and the science of measurement for ${years} years.`,
  cue: 'Scroll to walk in',
};

// A true sequence: the scale is proportional to time.
export const heritage = {
  title: `Measuring since ${since}.`,
  telugu: '1937 నుంచి',
  lead: 'It began as a workshop that built instruments for the university, and grew into a department that teaches others how to build, calibrate and trust them.',
  events: [
    { year: 1926, text: 'Andhra University is founded in Visakhapatnam.' },
    { year: 1937, text: 'An Instrument Manufacturing Section is started.' },
    { year: 1946, text: 'It becomes a full department: Applied Physics, with instrumentation, optics and electronics.' },
    { year: 1966, text: 'Research begins in thin-film technology, photo-elasticity and ultrasonics.' },
    { year: 1990, text: 'Moves to the College of Engineering and is renamed the Department of Instrument Technology.' },
    { year: 2001, text: 'The M.Tech in Instrumentation & Control begins.' },
    { year: 2008, text: 'The west wing block is inaugurated on 25 June by Prof. Y. C. Simhadri, Vice-Chancellor.' },
    { year: 2010, text: 'A six-year integrated M.Tech starts.' },
    { year: 2011, text: 'The renovated department is inaugurated on 8 May by Prof. Beela Satyanarayana, Vice-Chancellor.' },
    { year: 2015, text: 'The first floor of the east wing opens on 30 August.' },
  ],
  now: 'All programmes are accredited by the NBA. Andhra University holds NAAC A++ (CGPA 3.74, to 2030) and ranks 23rd among Indian universities in NIRF 2025.',
};

export const programmes = {
  title: 'Three ways in.',
  telugu: 'చదువు, పరిశోధన',
  lead: 'An undergraduate degree, a master’s, and research toward a doctorate, all taught in this building.',
  list: [
    { name: 'B.Tech, Instrumentation Engineering', length: '4 years', entry: 'Admission through AP EAPCET (45% in Physics, Chemistry and Mathematics; 40% for reserved categories).' },
    { name: 'M.Tech, Instrumentation & Control', length: '2 years', entry: 'GATE-qualified candidates first; remaining seats through AP PGECET.' },
    { name: 'Ph.D', length: 'Research', entry: 'Sensors, MEMS, nanotechnology, instrumentation and automation. Through Andhra University’s research admissions.' },
  ],
  // The programme educational objectives, as posted on the board in the entrance hall.
  objectivesTitle: 'What the B.Tech sets out to do',
  objectives: [
    'A solid foundation in mathematics, engineering sciences, electronics and instrumentation, for careers in industry, research and academics.',
    'Engineering breadth to analyse, innovate and design new products, and to solve real problems for society.',
    'An academic environment of excellence, leadership in multidisciplinary teams, and lifelong learning.',
    'Professional ethics, communication and teamwork for open-ended investigation and research.',
    'Entrepreneurship and innovation, leading efforts on social, technical and business challenges.',
  ],
};

export const people = {
  title: 'The people who teach here.',
  telugu: 'మా అధ్యాపకులు',
  head: { name: department.head, role: 'Head of the Department', area: 'Industrial process instrumentation' },
  faculty: [
    { name: 'Prof. A. Bhujanga Rao', area: 'Instrumentation' },
    { name: 'Prof. D. V. Rama Koti Reddy', area: 'Sensors and sensor networks, MEMS and nanotechnology' },
    { name: 'Prof. Y. Srinivasa Rao', area: 'Microelectronics' },
    { name: 'Dr. M. Ramesh Patnaik', area: 'Industrial process instrumentation' },
    { name: 'Dr. A. Kamala Kumari', area: 'Digital systems and computer electronics' },
    { name: 'Dr. A. Daisy Rani', area: 'Industrial process instrumentation' },
  ],
  staffTitle: 'Department office and labs',
  staff: [
    ['S. Phani', 'Typist'], ['N. V. D. Ganesh', 'Junior Assistant'], ['P. T. Reddy', 'Junior Assistant'],
    ['B. Pydi Raju', 'Record Assistant'], ['Md. Khadar Baba', 'Record Assistant'], ['K. Ramanamma', 'Record Assistant'],
    ['S. Ramesh', 'Machine Minder Grade-I'], ['K. Appala Raju', 'Mechanic'], ['P. Srinuvasa Rao', 'Consolidated pay'],
  ],
  headsNote: 'Twenty-one heads have led the department, from Prof. S. T. Krishna Swamy Chetty to Dr. A. Kamala Kumari; their names are on the board in the entrance hall.',
};

export const labs = {
  title: 'Where the measuring happens.',
  telugu: 'ప్రయోగశాలలు',
  lead: 'Every lab opens off the corridors you can walk in the next layer.',
  list: [
    { name: 'Process Control Lab', where: 'West wing, ground floor, facing the steps' },
    { name: 'Industrial Instruments Lab', where: 'West wing, ground floor' },
    { name: 'Control Systems Laboratory', where: 'West wing, ground floor' },
    { name: 'D C S Lab', where: 'West wing, by the gate' },
    { name: 'Device Fab Lab', where: 'East wing, first floor' },
    { name: 'Bio Medical Instrumentation Lab', where: 'East wing, first floor' },
    { name: 'Electronics Lab II', where: 'East wing, ground floor' },
  ],
  research: ['Sensors and sensor networks', 'MEMS', 'Nanotechnology', 'Instrumentation and automation', 'Thin films, photo-elasticity, ultrasonics'],
  facts: [
    'Projects funded by UGC, DST, AICTE and DRDO; UGC Special Assistance Programme and DST FIST support.',
    'About fifty research papers a year, in IEEE, Springer and Elsevier journals.',
    'Testing and calibration of industrial instruments for VSP, L&T, Reliance and Ramky.',
  ],
};

export const guide = {
  title: 'Your first week.',
  telugu: 'విద్యార్థులకు మార్గదర్శి',
  groups: [
    { title: 'Finding your way', items: [
      'Come in through the main entrance on the north campus drive. Timetables are in the glass case on the left wall of the entrance hall.',
      'Smart Class Rooms II, III and IV are upstairs: turn right at the first-floor landing into the classroom wing.',
      'The Department Library is on the first-floor landing, beside the classroom wing entrance.',
      'The labs open off the ground-floor corridors, west and east of the hall. The office is in the west corridor.',
    ] },
    { title: 'Help, whenever you need it', contacts: [
      ['Women’s grievance and redressal cell', '9948810852'], ['Minority cell', '9985369669'], ['Cell for differently abled persons', '7995106419'],
      ['Anti-ragging', '9703831117'], ['SC/ST cell', '9908036203'],
    ] },
    { title: 'Around the campus', items: [
      'Dr. V. S. Krishna Library, the university’s central library, is open every day including Sundays, except national holidays.',
      'Training & Placement, AU College of Engineering: 0891-2844744, placement.aucea@andhrauniversity.edu.in.',
      'College of Engineering office: 0891-2844999 or 2754586, auceaprincipal@gmail.com.',
    ] },
  ],
};

export const enter = {
  title: 'Step inside.',
  telugu: 'లోపలికి రండి',
  lead: 'The building is all here: every corridor, classroom and lab, in the light of this moment in Visakhapatnam.',
  explore: 'Explore the campus',
  walk: 'Walk in as a student',
};

export const footer = {
  address: ['Department of Instrument Technology', 'AU College of Engineering (A), Andhra University', 'Waltair Junction, Visakhapatnam 530003'],
  phones: ['University 0891-2844000', 'College 0891-2844999'],
  note: 'Built from the department’s own boards and plaques, the university’s public pages and the owner’s photographs and videos. Corrections are welcome.',
};
