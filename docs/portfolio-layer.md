# Portfolio layer — research and design plan (2026-10-18)

The site gets three layers: **portfolio** (this document: the introduction, a scroll-driven story of the department over
the live campus), then **exploration** (the existing free camera, chapters, panorama, interior routes) and the
**avatar** walk. The portfolio layer is what loads first.

## References analysed

### Owner's video `Downloads/RUID8f346d085b3847b7887dcb9e470a644b.mp4` (24 s, 720×1280, letterboxed 720×406)
Beat by beat (4 fps contact sheets): 0–1 s bare earth from a low lens, dust; 1–3 s steel beams and rebar fly in and slam
into the ground; 3–4 s grade beams with rebar, pits; 4–6 s columns rise, slabs land storey by storey while the camera
flies through the frame; 6–9 s facade: the glazed entrance tower and coloured panels snap on, the crown lifts onto the
tower, the logo seats on top; 9–12 s the camera settles on the finished elevation, a whip pan; 12–16 s a
day → night → storm → fire grade; 16–24 s a collage of other campus buildings, then the end card.
What makes it work: everything arrives **with weight** (fast in, small overshoot, dust at the impact), **in
construction order** (ground, structure, envelope, signage), and **the camera is moving** throughout (motion blur, low
lens, push-in), so the rise reads as a single take.

### mengto.github.io/kage (single page, three.js r1xx, 244 KB inline)
- Preloader: mark, script line, hairline progress, "Raising the mountain temple · NN%"; ~2 s.
- Arrival: the live scene fades in with a long-lens dolly (camera starts 5.6 back, +0.65 up, fov +8, eases in), while a
  giant wordmark (K A G E, per-glyph planes with a baked vertical wash) rises from behind the grass mounds in-scene.
- One fixed canvas behind a normal scrolling document. Every `section[data-cam]` is a camera waypoint
  `{p, t, fov}`; each section's centre is a scroll anchor; scroll → chapter progress → CatmullRom (tension .42) through
  the waypoints, damped, plus a small pointer parallax that fades after the first chapter. On tall frames the rig
  steps back along its own axis and widens fov.
- Headings arrive word by word (masked); chapters: hero (headline + 4 chapter numbers), the gate (two-column copy +
  four stats), pathways (three framed cards rendering live viewports of the same scene), lessons (5-item grid with
  durations), finale (vertical giant word), footer (three link columns, colophon).
- Discipline: one accent, dark ground, warm light coming from inside the buildings, slow pacing, nothing decorative
  that isn't in the world.

## Department facts (verified, with source)

Sources: department page (mirror of andhrauniversity.edu.in, `andhrauni-ac.in/.../instrumenttechnology.html`, older
snapshot), Wikipedia (AU College of Engineering; Andhra University), Deccan Chronicle (NAAC), Careers360 / CollegeDekho
(admissions, NIRF), and the owner's photographs of the department's own boards and plaques (primary source).

- Andhra University: founded 1926 (Andhra University Act, 1925), Visakhapatnam. Motto *Tejasvi nāvadhītamastu*,
  "May the divine light illuminate our studies" (Upanishads). NAAC **A++**, CGPA 3.74, valid to 8 Nov 2030. NIRF 2025:
  23rd among universities, 41st overall.
- AU College of Engineering: established 1955 as the Department of Engineering; moved to the 165-acre North Campus in
  1960; College of Engineering (Autonomous) in 1966. Phones 0891-2844999, 2754586.
- Department history: Instrument Manufacturing Section **1937** → separate department **1946** (Department of Applied
  Physics: instrumentation, optics, electronics) → research in thin-film technology, photo-elasticity and ultrasonics
  from **1966** → moved to the College of Engineering and renamed **Department of Instrument Technology in 1990**
  (B.Tech Instrumentation Engineering, M.Tech, Ph.D) → M.Tech Instrumentation & Control (NAAC deck: 2001, intake 18)
  → six-year integrated M.Tech 2010–11.
- Building milestones (plaques photographed in the building): West wing block inaugurated Wed 25 June 2008 by Prof.
  Y. C. Simhadri, Vice-Chancellor; department renovated, inaugurated 08-05-2011 by Prof. Beela Satyanarayana, VC
  (HOD Prof. P. L. H. Vara Prasad); first floor east wing inaugurated 30 August 2015 by Sri Ganta Srinivasa Rao,
  Minister for HRD (HOD Prof. A. Bhujanga Rao); Smart Class Rooms II & III (Prof. G. Nageswara Rao, VC).
- Accreditation: programmes NBA-accredited (department page).
- Research: sensors, MEMS, nanotechnology, instrumentation and automation; ~50 papers a year; funded projects from UGC,
  DST, AICTE, DRDO; UGC SAP (MEMS); DST FIST (board in the hall). Ph.D: 20 numbered awardees on the hall board since
  1996 (older board from 1972).
- Consultancy: testing and calibration of industrial instrumentation for VSP, L&T, Reliance, Ramky.
- Faculty (hall board, newest source): Prof. A. Bhujanga Rao, Prof. D. V. Rama Koti Reddy, Prof. Y. Srinivasa Rao,
  Dr. M. Ramesh Patnaik, Dr. A. Kamala Kumari, Dr. A. Daisy Rani, Dr. P. Swapna. Successive heads board ends with
  Dr. A. Kamala Kumari (2022).
- Labs in the building (from the owner's video and the model): Process Control Lab, Industrial Instruments Lab, Control
  Systems Laboratory, D C S Lab, Device Fab Lab, Bio Medical Instrumentation Lab, Electronics Lab II; Smart Class Rooms
  II, III and IV; Department Library; Seminar Hall; Strong Room.
- Programme educational objectives (PEO 1–5) and specific outcomes (PSO 1–4): verbatim on the hall board (hall-boards.js).
- Student guide: admission to B.Tech through AP EAPCET (45% in PCM, 40% reserved); M.Tech through GATE (priority) or AP
  PGECET; Dr V. S. Krishna Library (central, open all days except national holidays; engineering branch library);
  Training & Placement office 0891-2844744, placement.aucea@andhrauniversity.edu.in; grievance cells, anti-ragging squad
  and their numbers on the hall boards; AU address: Waltair Junction, AU North Campus, Visakhapatnam 530003, 0891
  2844000.

**Owner's decisions (2026-10-18):** Head of Department is **Dr. P. Swapna**; the layer plays in **live Visakhapatnam
time and weather** (text must hold over noon, rain and night alike); **Telugu lines** under each chapter (owner proofreads);
**all public contacts** may be shown, faculty phones and emails included.

**Unverified / conflicting:** Ph.D count (department page says both "50 awarded, 30 in
progress" and "30 awarded, 50 in progress" in different snapshots); B.Tech intake; current fees; hostel details.

## Design plan (for review)

Concept — **the department as an instrument.** Measurement is the subject; the page behaves like one. The scroll is a
graduated scale, the loader is a meter coming to reading, the rise is a calibration: the building is "measured into
existence" from the red earth of North Campus.

- Colour, from the site itself: Ink `#13212D` (the blue frame in shade, the night sky over Waltair), Frame `#517694`
  (the building's own blue), Lime `#ECE7D6` (the whitewashed plaster), Laterite `#8C3A22` (the red earth), Marigold
  `#E3A21A` (the garlands on every door — the single accent: needle, active tick, focus ring).
- Type: **Instrument Sans** (variable width) — wide and heavy for the display and the wordmark (engraved-panel feel),
  normal width for body; **Anek Telugu** (also variable width) for the Telugu line under each chapter, so the two
  scripts share proportions. No monospace, no all-caps labels, sentence case.
- Signature: the **scale** on the right edge — a ruler of fine ticks that is the scroll position, each chapter a
  labelled major tick; the needle (marigold) rides it. It replaces Kage's 01–04 row with something only this
  department would have.
- Layout: left-aligned copy columns (max 34 rem) over the live scene, a heavy scrim only behind text; the camera frames
  the building in the right two-thirds. One giant word in-scene (INSTRUMENT, per-glyph planes rising from behind the
  earth berm in front of the porch).
- Motion: one orchestrated moment — the rise — then only scroll-driven camera travel and user-answering motion.
  Headings arrive word by word only on first reveal. Reduced motion: no rise, cross-fades only.

Chapters (true sequence: a walk through the building and through time):
0 Rise + wordmark → 1 "Measuring since 1937" (heritage timeline, camera at the porch) → 2 Programmes (B.Tech, M.Tech,
Ph.D, PEOs) → 3 People (faculty, heads, staff) → 4 Labs and research (camera through the courtyards to each lab) →
5 Student guide (first week, where things are, who to call) → 6 "Enter the campus" (two doors: explore freely / walk
in as a student) → exploration layer.

## Built (2026-10-18)

- Libraries (owner's reference video, "Day 1: finding the best front-end libraries"): **Lenis 1.3.26** (smooth scroll;
  the camera follows its already-smoothed position) and **GSAP 3.15.0** with ScrollTrigger and SplitText (the arrival
  timeline, masked word reveals with accessible labels, once-only section reveals). React Bits was not used: it is a
  React component library and this site is plain JavaScript; its text and image effects are done with GSAP instead.
  Versions pinned exactly, each at least two weeks old when added.
- Enter gate: browsers allow full screen (and sound) only from a tap, click or key, so the loader ends on one **Enter**
  button that goes full screen, starts the ambience and starts the rise. Automated runs skip it (navigator.webdriver,
  `window.__autoBegin` or `?auto`) and see the finished building in the exploration layer unless they set
  `window.__story` / `window.__playRise`. iPhone Safari has no full-screen API for pages: the web app manifest
  (`display: fullscreen`) and Apple meta tags make "Add to Home Screen" open without browser bars.
- Measured on the deployed build, laptop on battery: full story scroll median 30 fps (p90 67 ms).
