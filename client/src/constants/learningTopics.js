/**
 * Predefined learning topics, goals, and time commitments for SkillUp.
 * Organized cleanly so new topics and options can easily be appended.
 */

export const LEARNING_TOPICS = [
  {
    id: 'dsa-cpp',
    title: 'DSA in C++',
    category: 'Data Structures & Algorithms',
    description: 'Pointers, STL, trees, graphs, dynamic programming',
    icon: '⚡',
  },
  {
    id: 'dsa-java',
    title: 'DSA in Java',
    category: 'Data Structures & Algorithms',
    description: 'Collections framework, recursion, search, sorting',
    icon: '☕',
  },
  {
    id: 'python',
    title: 'Python',
    category: 'Programming & Scripting',
    description: 'Core syntax, OOP, libraries, automation, fundamentals',
    icon: '🐍',
  },
  {
    id: 'javascript',
    title: 'JavaScript',
    category: 'Web Development',
    description: 'ES6+, DOM, async/await, closures, modern JS patterns',
    icon: '🟨',
  },
  {
    id: 'react',
    title: 'React',
    category: 'Web Development',
    description: 'Components, hooks, state management, SPA architecture',
    icon: '⚛️',
  },
  {
    id: 'web-development',
    title: 'Web Development',
    category: 'Full Stack Development',
    description: 'HTML5, CSS3, REST APIs, client-server architecture',
    icon: '🌐',
  },
  {
    id: 'sql-dbms',
    title: 'SQL & DBMS',
    category: 'Databases & Systems',
    description: 'Relational design, normalization, queries, indexing, ACID',
    icon: '🗄️',
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning',
    category: 'AI & Data Science',
    description: 'Supervised & unsupervised learning, neural networks, models',
    icon: '🤖',
  },
  {
    id: 'operating-systems',
    title: 'Operating Systems',
    category: 'Core Computer Science',
    description: 'Processes, threads, CPU scheduling, memory management, IPC',
    icon: '💻',
  },
];

export const LEARNING_GOALS = [
  { value: 'Placement preparation', label: 'Placement Preparation' },
  { value: 'Learning fundamentals', label: 'Learning Fundamentals' },
  { value: 'Building practical skills', label: 'Building Practical Skills' },
  { value: 'College examinations', label: 'College Examinations' },
  { value: 'Project development', label: 'Project Development' },
];

export const LEARNING_TIMES = [
  { value: '30 minutes/day', label: '30 minutes/day' },
  { value: '1 hour/day', label: '1 hour/day' },
  { value: '2 hours/day', label: '2 hours/day' },
  { value: '3 hours/day', label: '3 hours/day' },
  { value: '4+ hours/day', label: '4+ hours/day' },
];
