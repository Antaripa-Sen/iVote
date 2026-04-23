// ============================================================
// iVote — Country Data & Configuration
// ============================================================

const COUNTRY_THEMES = {
  IN: {
    '--c-primary': '#1a4fa0',
    '--c-secondary': '#f97316',
    '--c-stripe1': '#1a4fa0',
    '--c-stripe2': '#f97316',
    '--c-stripe3': '#fff',
  },
  US: {
    '--c-primary': '#b22234',
    '--c-secondary': '#3c3b6b',
    '--c-stripe1': '#b22234',
    '--c-stripe2': '#fff',
    '--c-stripe3': '#3c3b6b',
  },
  UK: {
    '--c-primary': '#012169',
    '--c-secondary': '#c8102e',
    '--c-stripe1': '#012169',
    '--c-stripe2': '#c8102e',
    '--c-stripe3': '#fff',
  },
  CA: {
    '--c-primary': '#c1121f',
    '--c-secondary': '#e31919',
    '--c-stripe1': '#c1121f',
    '--c-stripe2': '#fff',
    '--c-stripe3': '#c1121f',
  },
  AU: {
    '--c-primary': '#0a2a7b',
    '--c-secondary': '#ffcd00',
    '--c-stripe1': '#0a2a7b',
    '--c-stripe2': '#ffcd00',
    '--c-stripe3': '#0a2a7b',
  },
  FR: {
    '--c-primary': '#002395',
    '--c-secondary': '#f31830',
    '--c-stripe1': '#002395',
    '--c-stripe2': '#fff',
    '--c-stripe3': '#f31830',
  },
  DE: {
    '--c-primary': '#000000',
    '--c-secondary': '#d00',
    '--c-stripe1': '#000000',
    '--c-stripe2': '#d00',
    '--c-stripe3': '#ffce00',
  },
  ZA: {
    '--c-primary': '#000000',
    '--c-secondary': '#ffb81c',
    '--c-stripe1': '#000000',
    '--c-stripe2': '#ffb81c',
    '--c-stripe3': '#007a5e',
  },
  DEFAULT: {
    '--c-primary': '#1a4fa0',
    '--c-secondary': '#f97316',
    '--c-stripe1': '#1a4fa0',
    '--c-stripe2': '#f97316',
    '--c-stripe3': '#fff',
  }
};

const HERO_CONTENT = {
  IN: {
    eyebrow: 'Election Commission of India · Official Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Get the complete guide to India\'s election process — from voter registration and EVM voting to results day. Powered by AI.',
    bodyName: 'Election Commission of India',
    stat1n: '970M+',
    stat1l: 'Registered Voters',
    stat2n: '7 Phases',
    stat2l: 'Voting Phases',
    stat3n: 'EVM',
    stat3l: 'Technology'
  },
  US: {
    eyebrow: 'Federal Election Commission',
    h1a: 'Your Vote.',
    h1b: 'Shapes America.',
    para: 'A complete guide to U.S. presidential elections — voter registration, state laws, polling procedures, and results.',
    bodyName: 'Federal Election Commission',
    stat1n: '230M+',
    stat1l: 'Registered Voters',
    stat2n: '50 States',
    stat2l: 'Different Rules',
    stat3n: 'Digital',
    stat3l: 'Voting Tracking'
  },
  UK: {
    eyebrow: 'Electoral Commission',
    h1a: 'Your Vote.',
    h1b: 'Matters.',
    para: 'Everything you need to know about UK elections — from voter registration to polling day procedures.',
    bodyName: 'Electoral Commission',
    stat1n: '46M+',
    stat1l: 'Registered Voters',
    stat2n: '650',
    stat2l: 'Constituencies',
    stat3n: 'First Past',
    stat3l: 'The Post System'
  },
  CA: {
    eyebrow: 'Elections Canada',
    h1a: 'Your Vote.',
    h1b: 'Counts.',
    para: 'Complete election information for Canada — registration, voting methods, and how your vote is counted.',
    bodyName: 'Elections Canada',
    stat1n: '27M+',
    stat1l: 'Registered Voters',
    stat2n: '338',
    stat2l: 'Ridings',
    stat3n: 'Mixed Member',
    stat3l: 'Proportional'
  },
  AU: {
    eyebrow: 'Australian Electoral Commission',
    h1a: 'Your Vote.',
    h1b: 'Is Your Voice.',
    para: 'Learn about Australian elections — mandatory voting, how preferences work, and state variations.',
    bodyName: 'Australian Electoral Commission',
    stat1n: '17M+',
    stat1l: 'Registered Voters',
    stat2n: '150',
    stat2l: 'House Seats',
    stat3n: 'Preferential',
    stat3l: 'Voting System'
  },
  FR: {
    eyebrow: 'Commission Nationale de l\'Informatique',
    h1a: 'Votre Vote.',
    h1b: 'Pour La France.',
    para: 'Guide complet des élections françaises — inscription, procédures de vote, et processus de comptage.',
    bodyName: 'CNIL',
    stat1n: '48M+',
    stat1l: 'Électeurs Inscrits',
    stat2n: '577',
    stat2l: 'Circonscriptions',
    stat3n: 'Scrutin',
    stat3l: 'Uninominal'
  },
  DE: {
    eyebrow: 'Bundeswahlleiter',
    h1a: 'Deine Stimme.',
    h1b: 'Zählt.',
    para: 'Vollständiger Leitfaden zu deutschen Wahlen — Anmeldung, Wahlmöglichkeiten und Auszählungsverfahren.',
    bodyName: 'Bundeswahlleiter',
    stat1n: '61M+',
    stat1l: 'Eingetragene Wähler',
    stat2n: '299',
    stat2l: 'Wahlkreise',
    stat3n: 'Personalisiert',
    stat3l: 'Verhältniswahlrecht'
  },
  ZA: {
    eyebrow: 'Independent Electoral Commission',
    h1a: 'Your Vote.',
    h1b: 'Builds Tomorrow.',
    para: 'South African election information — voter registration, voting methods, and how results are counted.',
    bodyName: 'Independent Electoral Commission',
    stat1n: '35M+',
    stat1l: 'Registered Voters',
    stat2n: '9 Provinces',
    stat2l: 'Voting Regions',
    stat3n: 'Proportional',
    stat3l: 'Representation'
  },
  DEFAULT: {
    eyebrow: 'Global Electoral Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Rights.',
    para: 'Learn about election processes around the world. Get country-specific voting guidance powered by AI.',
    bodyName: 'Election Information',
    stat1n: '195',
    stat1l: 'Countries',
    stat2n: '4B+',
    stat2l: 'Voters Worldwide',
    stat3n: 'AI',
    stat3l: 'Powered'
  }
};

const COUNTRY_DATA = {
  IN: {
    name: 'India',
    flag: '🇮🇳',
    body: 'Election Commission of India',
    timeline: [
      { phase: 'Phase 1', title: 'Nominations Filed', description: 'Election dates announced, candidates submit nominations' },
      { phase: 'Phase 2', title: 'Voting Begins', description: 'First phase of polling across selected states' },
      { phase: 'Phase 3', title: 'Voting Continues', description: 'Multiple polling phases across all constituencies' },
      { phase: 'Phase 4', title: 'Final Votes', description: 'Last phase of voting completes' },
      { phase: 'Phase 5', title: 'Counting Day', description: 'All votes counted and results declared' }
    ],
    votingInfo: {
      requirements: ['Age 18 or above', 'Indian citizen', 'Registered voter', 'Valid ID'],
      methods: ['EVM (Electronic Voting Machine)', 'Paper ballot in special cases'],
      registration: 'Register at any Electoral Registration Office or online at nvsp.in'
    },
    quizQuestions: [
      { q: 'What is the minimum voting age in India?', a: 'A. 18 years', options: ['A. 18 years', 'B. 21 years', 'C. 25 years'] },
      { q: 'EVM stands for?', a: 'A. Electronic Voting Machine', options: ['A. Electronic Voting Machine', 'B. Electoral Voting Method', 'C. Electronic Validation Mode'] },
      { q: 'How many phases are there in Indian elections?', a: 'Depends on election', options: ['A. Always 7 phases', 'B. Depends on election', 'C. Always 5 phases'] }
    ]
  },
  US: {
    name: 'United States',
    flag: '🇺🇸',
    body: 'Federal Election Commission',
    timeline: [
      { phase: 'Spring', title: 'Primaries Begin', description: 'State primaries and caucuses start' },
      { phase: 'Summer', title: 'Conventions', description: 'Political parties hold national conventions' },
      { phase: 'Fall', title: 'Campaign Trail', description: 'General election campaigning intensifies' },
      { phase: 'First Tuesday', title: 'Election Day', description: 'General election held' },
      { phase: 'December', title: 'Electoral Vote', description: 'Electoral College votes' }
    ],
    votingInfo: {
      requirements: ['Age 18 or above', 'U.S. citizen', 'State resident', 'Registered voter'],
      methods: ['In-person voting', 'Early voting', 'Mail-in ballots', 'Provisional ballots'],
      registration: 'Register at local election office or vote.org'
    },
    quizQuestions: [
      { q: 'When is the U.S. presidential election held?', a: 'A. First Tuesday in November', options: ['A. First Tuesday in November', 'B. November 1st', 'C. First Monday in November'] },
      { q: 'How many Electoral College votes are there?', a: 'C. 538', options: ['A. 435', 'B. 100', 'C. 538'] }
    ]
  },
  UK: {
    name: 'United Kingdom',
    flag: '🇬🇧',
    body: 'Electoral Commission',
    timeline: [
      { phase: 'Dissolution', title: 'Parliament Dissolved', description: 'Parliament formally dissolved' },
      { phase: 'Campaign', title: 'Campaign Period', description: '5-week campaign period begins' },
      { phase: 'Nomination', title: 'Nomination Day', description: 'Candidates must be nominated' },
      { phase: 'Election Day', title: 'Polling Day', description: 'General election held' },
      { phase: 'Result', title: 'Results Declared', description: 'Winners announced, government formed' }
    ],
    votingInfo: {
      requirements: ['Age 18 or above', 'British/Irish citizen', 'Registered voter'],
      methods: ['In-person at polling station', 'Postal vote', 'Proxy vote'],
      registration: 'Register at www.gov.uk/register-to-vote'
    },
    quizQuestions: [
      { q: 'What is a constituency in the UK?', a: 'B. Electoral district', options: ['A. Political party', 'B. Electoral district', 'C. Parliament building'] }
    ]
  },
  CA: {
    name: 'Canada',
    flag: '🇨🇦',
    body: 'Elections Canada',
    timeline: [
      { phase: 'Call to Election', title: 'Election Announced', description: 'Governor General calls election' },
      { phase: 'Campaign', title: 'Campaign Period', description: '36-day minimum campaign period' },
      { phase: 'Advance Polling', title: 'Early Voting', description: 'Advance polling days held' },
      { phase: 'Election Day', title: 'Polling Day', description: 'General election held' },
      { phase: 'Results', title: 'Results Declared', description: 'Winners elected, government formed' }
    ],
    votingInfo: {
      requirements: ['Age 18 or above', 'Canadian citizen', 'Resident 3 months', 'Registered voter'],
      methods: ['In-person at polling station', 'Advance poll', 'Mail-in ballot', 'Special ballot'],
      registration: 'Register at Elections Canada website'
    },
    quizQuestions: [
      { q: 'How many seats are in the Canadian House of Commons?', a: 'B. 338', options: ['A. 308', 'B. 338', 'C. 350'] }
    ]
  },
  AU: {
    name: 'Australia',
    flag: '🇦🇺',
    body: 'Australian Electoral Commission',
    timeline: [
      { phase: 'Announcement', title: 'Election Called', description: 'Prime Minister calls election' },
      { phase: 'Campaign', title: 'Campaign Period', description: 'Minimum 33-day campaign' },
      { phase: 'Early Voting', title: 'Advance Polls Open', description: 'Early voting begins' },
      { phase: 'Election Day', title: 'Polling Day', description: 'General election held' },
      { phase: 'Results', title: 'Results Declared', description: 'Elected government formed' }
    ],
    votingInfo: {
      requirements: ['Age 18 or above', 'Australian citizen', 'Enrolled on electoral roll'],
      methods: ['In-person voting', 'Early voting', 'Postal voting', 'Provisional voting'],
      registration: 'Voting is mandatory for all eligible citizens'
    },
    quizQuestions: [
      { q: 'Is voting mandatory in Australia?', a: 'A. Yes', options: ['A. Yes', 'B. No', 'C. Only for federal elections'] }
    ]
  },
  FR: {
    name: 'France',
    flag: '🇫🇷',
    body: 'CNIL',
    timeline: [
      { phase: 'Convocation', title: 'Election Called', description: 'Presidential election announced' },
      { phase: 'Campaign', title: 'Campaign Period', description: '2-week campaign period' },
      { phase: 'First Round', title: 'Premier Tour', description: 'First round of voting' },
      { phase: 'Second Round', title: 'Deuxième Tour', description: 'Runoff between top two candidates' },
      { phase: 'Result', title: 'Winner Declared', description: 'New President elected' }
    ],
    votingInfo: {
      requirements: ['Age 18 or above', 'French citizen', 'Registered voter'],
      methods: ['In-person at polling station', 'Postal voting', 'Proxy voting'],
      registration: 'Register at town hall (mairie)'
    },
    quizQuestions: [
      { q: 'What is the voting system in France?', a: 'A. Two-round system', options: ['A. Two-round system', 'B. Single vote', 'C. Proportional'] }
    ]
  },
  DE: {
    name: 'Germany',
    flag: '🇩🇪',
    body: 'Bundeswahlleiter',
    timeline: [
      { phase: 'Call', title: 'Election Announced', description: 'Election date announced' },
      { phase: 'Campaign', title: 'Campaign Period', description: 'Campaign period begins' },
      { phase: 'Advance', title: 'Early Voting', description: 'Advance voting available' },
      { phase: 'Election', title: 'Election Day', description: 'General election held' },
      { phase: 'Results', title: 'Results Declared', description: 'Government formation begins' }
    ],
    votingInfo: {
      requirements: ['Age 18 or above', 'German citizen', 'Resident 3 months', 'Registered voter'],
      methods: ['In-person voting', 'Early voting', 'Mail-in voting'],
      registration: 'Register automatically or at registration office'
    },
    quizQuestions: [
      { q: 'How many votes does each German voter cast?', a: 'A. Two', options: ['A. Two', 'B. One', 'C. Three'] }
    ]
  },
  ZA: {
    name: 'South Africa',
    flag: '🇿🇦',
    body: 'Independent Electoral Commission',
    timeline: [
      { phase: 'Announcement', title: 'Election Announced', description: 'Election date proclaimed' },
      { phase: 'Registration', title: 'Voter Registration', description: 'Voter registration period' },
      { phase: 'Campaign', title: 'Campaign Period', description: 'Political parties campaign' },
      { phase: 'Election', title: 'Election Day', description: 'General election held' },
      { phase: 'Results', title: 'Results Declared', description: 'Parliament elected' }
    ],
    votingInfo: {
      requirements: ['Age 18 or above', 'South African citizen', 'Registered voter'],
      methods: ['In-person voting at polling station', 'Special votes', 'Postal votes (limited)'],
      registration: 'Register with IEC'
    },
    quizQuestions: [
      { q: 'What voting system does South Africa use?', a: 'B. Proportional representation', options: ['A. First-past-the-post', 'B. Proportional representation', 'C. Two-round system'] }
    ]
  },
  DEFAULT: {
    name: 'Global',
    flag: '🌍',
    body: 'Global Electoral Information',
    timeline: [
      { phase: 'Phase 1', title: 'Preparation', description: 'Election announced' },
      { phase: 'Phase 2', title: 'Registration', description: 'Voter registration' },
      { phase: 'Phase 3', title: 'Campaign', description: 'Campaign period' },
      { phase: 'Phase 4', title: 'Voting', description: 'Election day' },
      { phase: 'Phase 5', title: 'Results', description: 'Results announced' }
    ],
    votingInfo: {
      requirements: ['Age requirements vary by country', 'Citizenship requirements', 'Registration requirements'],
      methods: ['In-person voting', 'Remote voting methods', 'Other regional methods'],
      registration: 'Requirements vary by country and region'
    },
    quizQuestions: [
      { q: 'How many countries have elections?', a: 'C. Most democracies', options: ['A. Very few', 'B. Only wealthy nations', 'C. Most democracies'] }
    ]
  }
};
