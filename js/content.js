/**
 * Single source of truth for every piece of CV content.
 * Both the 3D world (zone panels) and the classic mode read from here,
 * so editing this file is all you need to update the portfolio.
 */

export const PROFILE = {
  name: 'Vitor Della Torre dos Santos',
  shortName: 'Vitor Della',
  headline: 'Software Engineer · C++ / Python · MSc in Automation & Systems Engineering',
  location: 'Florianópolis, Brazil',
  email: 'dellatsantos@gmail.com',
  links: [
    { label: 'GitHub', url: 'https://github.com/vdella' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/vdella/' },
    { label: 'Email', url: 'mailto:dellatsantos@gmail.com' },
  ],
};

/**
 * Each section becomes a landing pad in the world.
 * `position` is [x, z] in world units; keep pads inside a radius of ~150.
 * `accent` is 'blue' or 'green' (GitHub accent colours, see world.js).
 */
export const SECTIONS = [
  {
    id: 'about',
    title: 'About',
    kicker: 'Hello, traveller',
    position: [0, -34],
    accent: 'blue',
    blocks: [
      {
        type: 'text',
        body:
          'I am a computer scientist with an MSc in Automation & Systems Engineering from UFSC. ' +
          'I work where industrial and energy systems meet software: architecture, integration, ' +
          'testing and the glue that keeps complex systems honest.',
      },
      {
        type: 'facts',
        items: [
          ['Based in', 'Florianópolis, Brazil'],
          ['Focus', 'Backend, systems architecture, C++ & Python'],
          ['Languages', 'Portuguese (native) · English (professional) · French (advanced)'],
        ],
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    kicker: 'Things I built',
    position: [78, -88],
    accent: 'green',
    blocks: [
      {
        type: 'cards',
        items: [
          {
            title: 'BVOLT',
            subtitle: 'Modular digital twin framework for low-voltage microgrids',
            body:
              'MSc dissertation. Hexagonal (ports-and-adapters) architecture in Python, ' +
              'Modbus RTU telemetry into InfluxDB and Grafana, a Temporal Fusion Transformer ' +
              'for battery state-of-charge estimation and a pluggable MPC controller that ' +
              'closes the loop through the inverter.',
            tags: ['Python', 'Hexagonal', 'Modbus', 'InfluxDB', 'Grafana', 'TFT', 'GitHub Actions'],
          },
          {
            title: 'Florence · soh-assistant',
            subtitle: 'RAG assistant for patient-safety culture at HU-UFSC',
            body:
              'Retrieval-augmented assistant grounded in vetted institutional documents. ' +
              'FastAPI + SQLite backend, React/TypeScript frontend, CI with pytest and vitest, ' +
              'deployed on Railway.',
            tags: ['FastAPI', 'React', 'TypeScript', 'RAG', 'OpenAI', 'Railway'],
            link: 'https://github.com/vdella',
          },
          {
            title: 'Petrobras APC · C++ library',
            subtitle: 'Advanced process control stack (industry, private)',
            body:
              'C++ dynamic library for a plant-side optimization stack. My part: architecture, ' +
              'wiring multiple interfaces together, refactoring classes to fit the design, ' +
              'Google Test suites on Windows CI and code review.',
            tags: ['C++', 'DLL', 'Google Test', 'Windows CI'],
          },
          {
            title: 'shades',
            subtitle: 'Interactive graphics system, in progress',
            body:
              'A graphics engine grown into a mini map service: map tiles, routing and an ' +
              'asynchronous export service. Go backend, TypeScript frontend.',
            tags: ['Go', 'TypeScript', 'Computer Graphics', 'Routing'],
          },
        ],
      },
    ],
  },
  {
    id: 'experience',
    title: 'Experience',
    kicker: 'Where I have worked',
    position: [-92, -70],
    accent: 'blue',
    blocks: [
      {
        type: 'timeline',
        items: [
          {
            when: 'Ongoing',
            title: 'C++ Software Engineer · Petrobras APC project',
            where: 'UFSC-Petro · FEESC/UFSC',
            points: [
              'Architecture design and integration of multiple interfaces in a C++ control library.',
              'Unit testing with Google Test on Windows CI; reviewing the team\'s commits.',
              'Since Oct 2026, team lead of UFSCConfig (Python interface): planning and delegating work.',
            ],
          },
          {
            when: '2019 – 2021',
            title: 'Developer · LabSEC (Computer Security Lab)',
            where: 'UFSC',
            points: [
              'Digital-signature applications in Java, Kotlin (Android) and Swift (iOS).',
              'A year and a half on PBAD (Brazilian digital-signature standard): reference signer and conformance verifier.',
              'Simplified Scrum and a GitLab CI test pipeline.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'education',
    title: 'Education',
    kicker: 'Where I learned',
    position: [-70, 66],
    accent: 'green',
    blocks: [
      {
        type: 'timeline',
        items: [
          {
            when: '2026',
            title: 'MSc in Automation & Systems Engineering',
            where: 'PPGEAS · UFSC',
            points: [
              'Dissertation: BVOLT, a modular digital twin framework for low-voltage microgrids. Defended and approved in September 2026.',
              'Paper: "A Software Framework for Microgrid Digital Twins Development", WS-AI4CCAM 2026.',
            ],
          },
          {
            when: '2023',
            title: 'BSc in Computer Science',
            where: 'UFSC',
            points: ['Thesis on formal languages and automata, built with Python Dash.'],
          },
        ],
      },
    ],
  },
  {
    id: 'stack',
    title: 'Stack',
    kicker: 'Tools on board',
    position: [64, 78],
    accent: 'blue',
    blocks: [
      {
        type: 'groups',
        items: [
          ['Languages', ['C++', 'Python', 'Java', 'Go', 'TypeScript', 'SQL']],
          ['Systems', ['Hexagonal architecture', 'Digital twins', 'Modbus', 'Process-control interfaces']],
          ['Data & ML', ['Time-series forecasting', 'TFT', 'RAG pipelines', 'InfluxDB', 'Grafana']],
          ['Platform', ['Linux', 'Docker', 'GitHub Actions', 'Google Test', 'Railway']],
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    kicker: 'Open a channel',
    position: [0, 128],
    accent: 'green',
    blocks: [
      {
        type: 'text',
        body: 'Looking for backend and systems engineering roles. The fastest way to reach me is email.',
      },
      { type: 'links' },
    ],
  },
];
