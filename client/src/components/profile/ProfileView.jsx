import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import { scrollToTop } from '../../utils/scroll';

export const DEFAULT_SKILL_CATALOG = [
  // 1. Programming Languages
  {
    name: 'Python',
    category: 'Programming Languages',
    aliases: ['Py', 'Python 3', 'Python3'],
    isLearningTopic: true,
  },
  {
    name: 'JavaScript',
    category: 'Programming Languages',
    aliases: ['JS', 'ECMAScript'],
    isLearningTopic: true,
  },
  {
    name: 'TypeScript',
    category: 'Programming Languages',
    aliases: ['TS'],
    isLearningTopic: false,
  },
  {
    name: 'C++',
    category: 'Programming Languages',
    aliases: ['CPP', 'C Plus Plus'],
    isLearningTopic: false,
  },
  {
    name: 'Java',
    category: 'Programming Languages',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'C#',
    category: 'Programming Languages',
    aliases: ['CSharp', 'C Sharp'],
    isLearningTopic: false,
  },

  // 2. Data Structures & Algorithms
  {
    name: 'DSA',
    category: 'Data Structures & Algorithms',
    aliases: ['Data Structures and Algorithms', 'Data Structures & Algorithms'],
    isLearningTopic: false,
  },
  {
    name: 'DSA in C++',
    category: 'Data Structures & Algorithms',
    aliases: [
      'Data Structures and Algorithms in C++',
      'Data Structures & Algorithms in C++',
    ],
    isLearningTopic: true,
  },
  {
    name: 'DSA in Java',
    category: 'Data Structures & Algorithms',
    aliases: [
      'Data Structures and Algorithms in Java',
      'Data Structures & Algorithms in Java',
    ],
    isLearningTopic: true,
  },

  // 3. Web & Application Development
  {
    name: 'Web Development',
    category: 'Web & Application Development',
    aliases: [],
    isLearningTopic: true,
  },
  {
    name: 'Full-Stack Web Development',
    category: 'Web & Application Development',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'React',
    category: 'Web & Application Development',
    aliases: ['ReactJS', 'React.js'],
    isLearningTopic: true,
  },
  {
    name: 'Node.js',
    category: 'Web & Application Development',
    aliases: ['NodeJS'],
    isLearningTopic: false,
  },
  {
    name: 'HTML',
    category: 'Web & Application Development',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'CSS',
    category: 'Web & Application Development',
    aliases: [],
    isLearningTopic: false,
  },

  // 4. Databases & Data
  {
    name: 'SQL & DBMS',
    category: 'Databases & Data',
    aliases: ['SQL and DBMS', 'DBMS & SQL', 'DBMS and SQL'],
    isLearningTopic: true,
  },
  {
    name: 'SQL',
    category: 'Databases & Data',
    aliases: ['Structured Query Language'],
    isLearningTopic: false,
  },
  {
    name: 'DBMS',
    category: 'Databases & Data',
    aliases: ['Database Management Systems', 'Database Management System'],
    isLearningTopic: false,
  },
  {
    name: 'MySQL',
    category: 'Databases & Data',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'MongoDB',
    category: 'Databases & Data',
    aliases: [],
    isLearningTopic: false,
  },

  // 5. AI, Cloud & Systems
  {
    name: 'Machine Learning',
    category: 'AI, Cloud & Systems',
    aliases: ['ML'],
    isLearningTopic: true,
  },
  {
    name: 'Operating Systems',
    category: 'AI, Cloud & Systems',
    aliases: ['OS', 'Operating System'],
    isLearningTopic: true,
  },
  {
    name: 'Linux',
    category: 'AI, Cloud & Systems',
    aliases: ['GNU/Linux'],
    isLearningTopic: false,
  },
  {
    name: 'Cloud',
    category: 'AI, Cloud & Systems',
    aliases: ['Cloud Computing'],
    isLearningTopic: false,
  },
  {
    name: 'AWS',
    category: 'AI, Cloud & Systems',
    aliases: ['Amazon Web Services'],
    isLearningTopic: false,
  },

  // 6. Developer Tools & DevOps
  {
    name: 'Git',
    category: 'Developer Tools & DevOps',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'GitHub',
    category: 'Developer Tools & DevOps',
    aliases: [],
    isLearningTopic: false,
  },
  {
    name: 'Docker',
    category: 'Developer Tools & DevOps',
    aliases: [],
    isLearningTopic: false,
  },
];

const STRICT_ALIAS_TO_CANONICAL = new Map([
  ['javascript', 'javascript'],
  ['js', 'javascript'],
  ['ecmascript', 'javascript'],
  ['typescript', 'typescript'],
  ['ts', 'typescript'],
  ['python', 'python'],
  ['py', 'python'],
  ['python3', 'python'],
  ['python 3', 'python'],
  ['c++', 'c++'],
  ['cpp', 'c++'],
  ['c plus plus', 'c++'],
  ['c#', 'c#'],
  ['csharp', 'c#'],
  ['c sharp', 'c#'],
  ['react', 'react'],
  ['reactjs', 'react'],
  ['react.js', 'react'],
  ['node.js', 'node.js'],
  ['nodejs', 'node.js'],
  ['dsa', 'dsa'],
  ['data structures and algorithms', 'dsa'],
  ['data structures & algorithms', 'dsa'],
  ['dsa in c++', 'dsa in c++'],
  ['data structures and algorithms in c++', 'dsa in c++'],
  ['data structures & algorithms in c++', 'dsa in c++'],
  ['dsa in java', 'dsa in java'],
  ['data structures and algorithms in java', 'dsa in java'],
  ['data structures & algorithms in java', 'dsa in java'],
  ['sql', 'sql'],
  ['structured query language', 'sql'],
  ['dbms', 'dbms'],
  ['database management systems', 'dbms'],
  ['database management system', 'dbms'],
  ['sql & dbms', 'sql & dbms'],
  ['sql and dbms', 'sql & dbms'],
  ['dbms & sql', 'sql & dbms'],
  ['dbms and sql', 'sql & dbms'],
  ['machine learning', 'machine learning'],
  ['ml', 'machine learning'],
  ['operating systems', 'operating systems'],
  ['operating system', 'operating systems'],
  ['os', 'operating systems'],
  ['aws', 'aws'],
  ['amazon web services', 'aws'],
  ['cloud', 'cloud'],
  ['cloud computing', 'cloud'],
  ['linux', 'linux'],
  ['gnu/linux', 'linux'],
]);

function normalizeSkillToken(rawSkill) {
  return String(rawSkill || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getCanonicalSkillKey(rawSkill) {
  const normalized = normalizeSkillToken(rawSkill);
  if (!normalized) return '';
  return STRICT_ALIAS_TO_CANONICAL.get(normalized) || normalized;
}

function resolveCatalogSkill(rawInput, catalog) {
  const key = getCanonicalSkillKey(rawInput);
  if (!key) return null;
  for (const item of catalog) {
    if (getCanonicalSkillKey(item.name) === key) {
      return item;
    }
  }
  return null;
}

export const DEFAULT_INTEREST_CATALOG = [
  {
    name: 'Web Development',
    category: 'Web & Mobile',
    aliases: ['Web', 'Web App Development', 'Web Applications'],
  },
  {
    name: 'Full-Stack Web Development',
    category: 'Web & Mobile',
    aliases: ['Full-Stack', 'Full Stack Development', 'Full-Stack Development'],
  },
  {
    name: 'Frontend Engineering',
    category: 'Web & Mobile',
    aliases: ['Frontend', 'Frontend Development', 'UI/UX Engineering'],
  },
  {
    name: 'Backend Engineering',
    category: 'Web & Mobile',
    aliases: ['Backend', 'Backend Development', 'APIs & Microservices'],
  },
  {
    name: 'Mobile App Development',
    category: 'Web & Mobile',
    aliases: ['Mobile Apps', 'Mobile Development', 'Android & iOS'],
  },
  {
    name: 'Data Structures & Algorithms',
    category: 'Algorithms & Programming',
    aliases: ['DSA', 'Algorithms'],
  },
  {
    name: 'Competitive Programming',
    category: 'Algorithms & Programming',
    aliases: ['CP', 'Algorithmic Programming', 'Sports Programming'],
  },
  {
    name: 'Machine Learning',
    category: 'AI & Data',
    aliases: [
      'ML',
      'AI',
      'Artificial Intelligence',
      'AI & ML',
      'Artificial Intelligence & Machine Learning',
    ],
  },
  {
    name: 'Data Science & Analytics',
    category: 'AI & Data',
    aliases: ['Data Science', 'Data Analytics', 'Big Data'],
  },
  {
    name: 'Database Systems',
    category: 'AI & Data',
    aliases: ['Databases', 'SQL & DBMS', 'DBMS'],
  },
  {
    name: 'Cloud Computing',
    category: 'Cloud, Systems & Security',
    aliases: ['Cloud', 'Cloud Infrastructure', 'AWS & Cloud'],
  },
  {
    name: 'DevOps & Automation',
    category: 'Cloud, Systems & Security',
    aliases: ['DevOps', 'CI/CD', 'Site Reliability'],
  },
  {
    name: 'Open Source',
    category: 'Cloud, Systems & Security',
    aliases: ['Open Source Contribution', 'FOSS', 'OSS'],
  },
  {
    name: 'Systems Programming',
    category: 'Cloud, Systems & Security',
    aliases: ['Systems', 'Operating Systems', 'Linux & Systems'],
  },
  {
    name: 'Distributed Systems',
    category: 'Cloud, Systems & Security',
    aliases: ['Scalable Systems', 'High Performance Computing'],
  },
  {
    name: 'Cybersecurity',
    category: 'Cloud, Systems & Security',
    aliases: ['Security', 'Information Security', 'Network Security'],
  },
  {
    name: 'Embedded Systems & IoT',
    category: 'Cloud, Systems & Security',
    aliases: ['Embedded Systems', 'IoT', 'Hardware & Robotics'],
  },
];

export const DEFAULT_CAREER_GOAL_CATALOG = [
  {
    name: 'Software Engineer',
    category: 'Engineering Roles',
    aliases: ['SDE', 'Software Developer', 'Software Engineering'],
  },
  {
    name: 'Software Engineering Internship',
    category: 'Internships & Early Career',
    aliases: [
      'SDE Intern',
      'Summer Software Engineering Internship',
      'Internship',
      'Software Engineering Internship & Full-Stack Product Roles',
    ],
  },
  {
    name: 'Full-Stack Developer',
    category: 'Engineering Roles',
    aliases: ['Full-Stack Engineer', 'Full Stack Developer'],
  },
  {
    name: 'Frontend Engineer',
    category: 'Engineering Roles',
    aliases: ['Frontend Developer', 'UI Engineer'],
  },
  {
    name: 'Backend Engineer',
    category: 'Engineering Roles',
    aliases: ['Backend Developer', 'Systems & API Engineer'],
  },
  {
    name: 'Machine Learning Engineer',
    category: 'AI, Data & Cloud Roles',
    aliases: ['ML Engineer', 'AI Engineer'],
  },
  {
    name: 'Data Scientist / Data Analyst',
    category: 'AI, Data & Cloud Roles',
    aliases: ['Data Scientist', 'Data Analyst', 'Data Engineer'],
  },
  {
    name: 'Cloud & DevOps Engineer',
    category: 'AI, Data & Cloud Roles',
    aliases: ['Cloud Engineer', 'DevOps Engineer', 'Site Reliability Engineer', 'SRE'],
  },
  {
    name: 'Systems & Infrastructure Engineer',
    category: 'Engineering Roles',
    aliases: ['Systems Engineer', 'Linux / Kernel Developer'],
  },
  {
    name: 'Cybersecurity Engineer',
    category: 'AI, Data & Cloud Roles',
    aliases: ['Security Engineer', 'Cybersecurity Analyst'],
  },
  {
    name: 'Mobile Application Developer',
    category: 'Engineering Roles',
    aliases: ['Mobile Engineer', 'Android / iOS Developer'],
  },
  {
    name: 'Open Source Contributor',
    category: 'Competitions & Community',
    aliases: [
      'Open Source Mentee',
      'GSoC / LFX Contributor',
      'Win hackathons and build open-source projects',
    ],
  },
  {
    name: 'Hackathon Finalist & Builder',
    category: 'Competitions & Community',
    aliases: ['Hackathons', 'Hackathon Winner', 'Crack Google Hackathon'],
  },
  {
    name: 'Competitive Programmer',
    category: 'Competitions & Community',
    aliases: ['ICPC Contestant', 'Algorithmic Competitor'],
  },
  {
    name: 'Product Engineering & Startups',
    category: 'Internships & Early Career',
    aliases: ['Product Engineer', 'Founding Engineer'],
  },
  {
    name: 'Higher Studies & Research',
    category: 'Internships & Early Career',
    aliases: ['Research Intern', 'MS / PhD Research', 'R&D Engineer'],
  },
];

export const DEFAULT_BRANCH_CATALOG = [
  {
    name: 'Computer Science and Engineering (CSE)',
    category: 'Core Computing',
    aliases: [
      'CSE',
      'Computer Science',
      'Computer Science & Engineering',
      'Computer Science and Engineering',
      'Computer Science & Engineering (CSE)',
      'B.Tech CSE',
      'B.E. CSE',
      'CS',
    ],
  },
  {
    name: 'CSE – Artificial Intelligence & Machine Learning',
    category: 'CSE Specialization',
    aliases: [
      'CSE - Artificial Intelligence & Machine Learning',
      'CSE (AI & ML)',
      'CSE AI & ML',
      'CSE AIML',
      'CSE - AIML',
      'CSE – AIML',
      'Computer Science and Engineering (AI & ML)',
      'CSE Artificial Intelligence and Machine Learning',
    ],
  },
  {
    name: 'CSE – Data Science',
    category: 'CSE Specialization',
    aliases: [
      'CSE - Data Science',
      'CSE (Data Science)',
      'CSE Data Science',
      'CSE DS',
      'CSE - DS',
      'CSE – DS',
      'Computer Science and Engineering (Data Science)',
    ],
  },
  {
    name: 'CSE – Cybersecurity',
    category: 'CSE Specialization',
    aliases: [
      'CSE - Cybersecurity',
      'CSE (Cybersecurity)',
      'CSE Cybersecurity',
      'CSE Cyber Security',
      'CSE - Cyber Security',
      'CSE – Cyber Security',
      'Computer Science and Engineering (Cybersecurity)',
    ],
  },
  {
    name: 'CSE – Internet of Things (IoT)',
    category: 'CSE Specialization',
    aliases: [
      'CSE - Internet of Things (IoT)',
      'CSE – IoT',
      'CSE - IoT',
      'CSE (IoT)',
      'CSE IoT',
      'CSE Internet of Things',
      'Computer Science and Engineering (IoT)',
    ],
  },
  {
    name: 'Information Technology (IT)',
    category: 'Core Computing',
    aliases: [
      'IT',
      'Information Technology',
      'B.Tech IT',
      'B.E. IT',
      'Info Tech',
    ],
  },
  {
    name: 'Artificial Intelligence & Data Science (AI & DS)',
    category: 'AI & Data Specialization',
    aliases: [
      'AI & DS',
      'AI and DS',
      'AIDS',
      'AI&DS',
      'Artificial Intelligence and Data Science',
      'Artificial Intelligence & Data Science',
      'Artificial Intelligence and Data Science (AI & DS)',
      'B.Tech AI & DS',
    ],
  },
];

function normalizeOptionToken(rawOption) {
  return String(rawOption || '')
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');
}

function resolveCatalogOption(rawInput, catalog = []) {
  const norm = normalizeOptionToken(rawInput);
  if (!norm) return null;
  for (const item of catalog) {
    if (normalizeOptionToken(item.name) === norm) {
      return item;
    }
    if (
      Array.isArray(item.aliases) &&
      item.aliases.some((a) => normalizeOptionToken(a) === norm)
    ) {
      return item;
    }
  }
  return null;
}

function parseSavedMultiSelectItems(rawList, rawString, catalog) {
  if (Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map((entry) =>
      typeof entry === 'string'
        ? { name: entry, category: '', isLegacy: false }
        : entry
    );
  }
  if (typeof rawString !== 'string' || !rawString.trim()) {
    return [];
  }
  const dedup = new Map();
  const tokens = rawString
    .split(/[,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const tok of tokens) {
    const match = resolveCatalogOption(tok, catalog);
    const canonicalName = match ? match.name : tok;
    const key = normalizeSkillToken(canonicalName);
    if (!dedup.has(key)) {
      dedup.set(key, {
        name: canonicalName,
        category: match ? match.category : 'Legacy (Saved Entry)',
        isLegacy: !match,
      });
    }
  }
  return Array.from(dedup.values());
}

/**
 * Reusable searchable multi-select dropdown & removable chip picker
 * sharing the exact Skill Picker styles, ARIA combobox semantics, and keyboard interactions.
 */
function CatalogMultiSelectPicker({
  inputId,
  listboxId,
  label,
  placeholder,
  catalog,
  selectedItems,
  onChange,
  onValidationError,
  emptyHint,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);

  const selectedMap = useMemo(() => {
    const map = new Map();
    for (const item of selectedItems) {
      map.set(normalizeSkillToken(item.name), item);
    }
    return map;
  }, [selectedItems]);

  const filteredOptions = useMemo(() => {
    const q = normalizeSkillToken(query);
    if (!q) return catalog;
    return catalog.filter((item) => {
      const nameNorm = normalizeSkillToken(item.name);
      const catNorm = normalizeSkillToken(item.category);
      const aliasMatch =
        Array.isArray(item.aliases) &&
        item.aliases.some((a) => normalizeSkillToken(a).includes(q));
      return nameNorm.includes(q) || catNorm.includes(q) || aliasMatch;
    });
  }, [query, catalog]);

  const addOption = (rawOptionName) => {
    const match = resolveCatalogOption(rawOptionName, catalog);
    if (!match) {
      if (onValidationError) {
        onValidationError(
          `Unsupported ${label.toLowerCase()} "${rawOptionName}". Please select from the predefined ${label} options.`
        );
      }
      return false;
    }

    const key = normalizeSkillToken(match.name);
    if (!selectedMap.has(key)) {
      onChange([
        ...selectedItems,
        {
          name: match.name,
          category: match.category,
          isLegacy: false,
        },
      ]);
    }
    setQuery('');
    setIsOpen(false);
    setHighlightedIdx(0);
    if (onValidationError) onValidationError(null);
    return true;
  };

  const removeOption = (nameToRemove) => {
    const keyToRemove = normalizeSkillToken(nameToRemove);
    onChange(
      selectedItems.filter((i) => normalizeSkillToken(i.name) !== keyToRemove)
    );
  };

  const handleAddClick = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setIsOpen(true);
      return;
    }

    const exactMatch = resolveCatalogOption(trimmed, catalog);
    if (exactMatch) {
      addOption(exactMatch.name);
      return;
    }

    if (filteredOptions.length > 0) {
      const chosen = filteredOptions[highlightedIdx] || filteredOptions[0];
      addOption(chosen.name);
      return;
    }

    if (onValidationError) {
      onValidationError(
        `Unsupported ${label.toLowerCase()} "${trimmed}". Please select an option from the predefined ${label} dropdown.`
      );
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIdx((prev) =>
        filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIdx((prev) =>
        filteredOptions.length > 0
          ? (prev - 1 + filteredOptions.length) % filteredOptions.length
          : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleAddClick();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="block text-[11px] font-bold uppercase tracking-wider text-[#64607D]"
        >
          {label}
        </label>
        <span className="text-[11px] font-semibold text-[#4F7DF3]">
          {selectedItems.length} selected
        </span>
      </div>

      {/* Searchable Combobox Input */}
      <div className="relative space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-autocomplete="list"
              value={query}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setHighlightedIdx(0);
                if (onValidationError) onValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-3.5 py-2.5 bg-[#F8F6FF] border border-[#E6E0F8] rounded-xl text-[#1E1B3A] placeholder-[#64607D] focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] text-sm font-medium"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setHighlightedIdx(0);
                }}
                aria-label={`Clear ${label} search`}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64607D] hover:text-[#1E1B3A] px-1.5 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddClick}
            className="px-4 py-2.5 bg-[#4F7DF3] hover:bg-[#3E6AE1] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            + Add
          </button>
        </div>

        {/* Search Dropdown Listbox */}
        {isOpen && (
          <div
            id={listboxId}
            role="listbox"
            aria-label={`${label} predefined options`}
            className="bg-white border border-[#E6E0F8] rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-[#F3F0FF] z-30"
          >
            <div className="px-3.5 py-2 bg-[#F8F6FF] flex items-center justify-between text-[11px] text-[#64607D]">
              <span>
                Showing {filteredOptions.length} of {catalog.length} predefined options
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#64607D] hover:text-[#1E1B3A] font-semibold cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#64607D]">
                No predefined options match &ldquo;{query}&rdquo;. Try another keyword from
                the catalog.
              </div>
            ) : (
              filteredOptions.map((item, idx) => {
                const isSelected = selectedMap.has(normalizeSkillToken(item.name));
                const isHighlighted = idx === highlightedIdx;

                return (
                  <div
                    key={item.name}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    className={`px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                      isHighlighted ? 'bg-[#F3F0FF]' : 'hover:bg-[#F8F6FF]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#1E1B3A]">
                          {item.name}
                        </span>
                        {item.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F0FF] text-[#64607D] border border-[#E6E0F8]">
                            {item.category}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F7DF3] border border-[#D8E2FF]">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      {Array.isArray(item.aliases) && item.aliases.length > 0 && (
                        <p className="text-[11px] text-[#64607D] mt-0.5">
                          Aliases: {item.aliases.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected ? (
                        <button
                          type="button"
                          onClick={() => removeOption(item.name)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-white hover:bg-rose-50 border-[#E6E0F8] hover:border-rose-300 text-[#64607D] hover:text-rose-700 transition-colors cursor-pointer"
                        >
                          Remove ✕
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addOption(item.name)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-white hover:bg-[#EEF2FF] border-[#E6E0F8] hover:border-[#4F7DF3] text-[#4F7DF3] transition-colors cursor-pointer"
                        >
                          + Select
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected Removable Chips */}
      {selectedItems.length === 0 ? (
        <div className="px-3.5 py-2.5 rounded-xl border border-dashed border-[#D8D0F0] bg-[#F8F6FF] text-xs text-[#64607D]">
          {emptyHint}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {selectedItems.map((item) => (
            <div
              key={item.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-[#EDE9FE] border-[#DDD6FE] text-[#4C1D95] text-xs font-semibold"
            >
              <span aria-hidden="true" className="text-[#4F7DF3] font-bold">
                ✓
              </span>
              <span>{item.name}</span>
              {item.isLegacy && (
                <span
                  title="Previously saved entry"
                  className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                >
                  Legacy
                </span>
              )}
              <button
                type="button"
                onClick={() => removeOption(item.name)}
                title={`Remove ${item.name}`}
                aria-label={`Remove ${item.name}`}
                className="text-[#64607D] hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Reusable searchable single-select dropdown sharing the exact Skill Picker styles,
 * ARIA combobox semantics, and keyboard interactions.
 */
function CatalogSingleSelectPicker({
  inputId,
  listboxId,
  label,
  placeholder,
  catalog,
  selectedValue,
  isLegacy,
  onChange,
  onValidationError,
  scopeNote,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);

  const selectedKey = normalizeOptionToken(selectedValue);

  const filteredOptions = useMemo(() => {
    const q = normalizeOptionToken(query);
    if (!q) return catalog;
    return catalog.filter((item) => {
      const nameNorm = normalizeOptionToken(item.name);
      const catNorm = normalizeOptionToken(item.category);
      const aliasMatch =
        Array.isArray(item.aliases) &&
        item.aliases.some((a) => normalizeOptionToken(a).includes(q));
      return nameNorm.includes(q) || catNorm.includes(q) || aliasMatch;
    });
  }, [query, catalog]);

  const selectOption = (rawOptionName) => {
    const match = resolveCatalogOption(rawOptionName, catalog);
    if (!match) {
      if (onValidationError) {
        onValidationError(
          `Unsupported branch / major "${rawOptionName}". SkillUP currently supports CSE, IT and related specializations.`
        );
      }
      return false;
    }

    onChange(match.name, false);
    setQuery('');
    setIsOpen(false);
    setHighlightedIdx(0);
    if (onValidationError) onValidationError(null);
    return true;
  };

  const clearSelection = () => {
    onChange('', false);
    setQuery('');
    if (onValidationError) onValidationError(null);
  };

  const handleConfirmSelection = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setIsOpen((prev) => !prev);
      return;
    }

    const exactMatch = resolveCatalogOption(trimmed, catalog);
    if (exactMatch) {
      selectOption(exactMatch.name);
      return;
    }

    if (filteredOptions.length > 0) {
      const chosen = filteredOptions[highlightedIdx] || filteredOptions[0];
      selectOption(chosen.name);
      return;
    }

    if (onValidationError) {
      onValidationError(
        `Unsupported branch / major "${trimmed}". SkillUP currently supports CSE, IT and related specializations.`
      );
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIdx((prev) =>
        filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIdx((prev) =>
        filteredOptions.length > 0
          ? (prev - 1 + filteredOptions.length) % filteredOptions.length
          : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmSelection();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="block text-[11px] font-bold uppercase tracking-wider text-[#64607D]"
        >
          {label}
        </label>
        {selectedValue && (
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Clear selected branch"
            className="text-[11px] text-[#64607D] hover:text-rose-600 font-semibold cursor-pointer"
          >
            Clear ✕
          </button>
        )}
      </div>

      {/* Selected Branch Chip (when set) */}
      {selectedValue && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border bg-[#EEF2FF] border-[#D8E2FF] text-[#1E1B3A] text-xs font-medium">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span aria-hidden="true" className="text-[#4F7DF3] font-bold">
              ✓
            </span>
            <span className="truncate font-semibold text-[#1E1B3A]">
              {selectedValue}
            </span>
            {isLegacy && (
              <span
                title="Previously saved branch entry"
                className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shrink-0"
              >
                Legacy
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-[11px] text-[#4F7DF3] hover:text-[#1E1B3A] font-semibold shrink-0 cursor-pointer"
          >
            {isOpen ? 'Close' : 'Change'}
          </button>
        </div>
      )}

      {/* Searchable Single-Select Combobox */}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIdx(0);
            if (onValidationError) onValidationError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedValue
              ? `Search to change branch (${selectedValue})...`
              : placeholder
          }
          className="w-full px-3.5 py-2.5 pr-8 bg-[#F8F6FF] border border-[#E6E0F8] rounded-xl text-[#1E1B3A] placeholder-[#64607D] focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] text-sm font-medium"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle Branch / Major options"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64607D] hover:text-[#1E1B3A] px-1 py-0.5 cursor-pointer"
        >
          {isOpen ? '▴' : '▾'}
        </button>

        {isOpen && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Branch / Major predefined options"
            className="mt-1.5 bg-white border border-[#E6E0F8] rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[#F3F0FF] z-30"
          >
            <div className="px-3.5 py-2 bg-[#F8F6FF] flex items-center justify-between text-[11px] text-[#64607D]">
              <span>
                Showing {filteredOptions.length} of {catalog.length} supported branches
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#64607D] hover:text-[#1E1B3A] font-semibold cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            {filteredOptions.length === 0 ? (
              <div className="p-3.5 text-center text-xs text-[#64607D]">
                No supported branch matches &ldquo;{query}&rdquo;. SkillUP currently
                supports CSE, IT and related specializations.
              </div>
            ) : (
              filteredOptions.map((item, idx) => {
                const isSelected = normalizeOptionToken(item.name) === selectedKey;
                const isHighlighted = idx === highlightedIdx;

                return (
                  <div
                    key={item.name}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    onClick={() => selectOption(item.name)}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isHighlighted ? 'bg-[#F3F0FF]' : 'hover:bg-[#F8F6FF]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-[#1E1B3A]">
                          {item.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F7DF3] border border-[#D8E2FF]">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      {Array.isArray(item.aliases) && item.aliases.length > 0 && (
                        <p className="text-[11px] text-[#64607D] mt-0.5 truncate">
                          Aliases: {item.aliases.slice(0, 4).join(', ')}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectOption(item.name);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#EEF2FF] border-[#D8E2FF] text-[#4F7DF3]'
                          : 'bg-white hover:bg-[#EEF2FF] border-[#E6E0F8] hover:border-[#4F7DF3] text-[#4F7DF3]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {scopeNote && (
        <p className="text-[11px] text-[#64607D] leading-relaxed pt-0.5">
          {scopeNote}
        </p>
      )}
    </div>
  );
}

export default function ProfileView({
  onSaveSuccess,
  bridgeProfileContext = null,
  onReturnToOpportunity = null,
}) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Profile fields
  const [branch, setBranch] = useState('');
  const [branchIsLegacy, setBranchIsLegacy] = useState(false);
  const [branchCatalog, setBranchCatalog] = useState(DEFAULT_BRANCH_CATALOG);
  const [collegeYear, setCollegeYear] = useState('');
  const [interestsList, setInterestsList] = useState([]);
  const [careerGoalsList, setCareerGoalsList] = useState([]);
  const [interestCatalog, setInterestCatalog] = useState(DEFAULT_INTEREST_CATALOG);
  const [careerGoalCatalog, setCareerGoalCatalog] = useState(
    DEFAULT_CAREER_GOAL_CATALOG
  );
  const [learningHoursPerDay, setLearningHoursPerDay] = useState(2);

  // Skills & Catalog state
  const [skills, setSkills] = useState([]);
  const [skillCatalog, setSkillCatalog] = useState(DEFAULT_SKILL_CATALOG);

  // Searchable Skill Picker state
  const [searchQuery, setSearchQuery] = useState('');
  const [newSkillStatus, setNewSkillStatus] = useState('Learning');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Load profile from backend
  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProfile();
      const activeBranchCat =
        res && Array.isArray(res.branchCatalog) && res.branchCatalog.length > 0
          ? res.branchCatalog
          : DEFAULT_BRANCH_CATALOG;
      const activeInterestCat =
        res && Array.isArray(res.interestCatalog) && res.interestCatalog.length > 0
          ? res.interestCatalog
          : DEFAULT_INTEREST_CATALOG;
      const activeCareerGoalCat =
        res &&
        Array.isArray(res.careerGoalCatalog) &&
        res.careerGoalCatalog.length > 0
          ? res.careerGoalCatalog
          : DEFAULT_CAREER_GOAL_CATALOG;

      setBranchCatalog(activeBranchCat);
      setInterestCatalog(activeInterestCat);
      setCareerGoalCatalog(activeCareerGoalCat);

      if (res && res.profile) {
        const rawBranch = res.profile.branch || '';
        const matchedBranch = resolveCatalogOption(rawBranch, activeBranchCat);
        setBranch(matchedBranch ? matchedBranch.name : rawBranch);
        setBranchIsLegacy(
          Boolean(
            res.profile.branchIsLegacy ?? (rawBranch && !matchedBranch)
          )
        );
        setCollegeYear(res.profile.college_year ? String(res.profile.college_year) : '');
        setInterestsList(
          parseSavedMultiSelectItems(
            res.profile.interestsList,
            res.profile.interests,
            activeInterestCat
          )
        );
        setCareerGoalsList(
          parseSavedMultiSelectItems(
            res.profile.careerGoalsList,
            res.profile.career_goals,
            activeCareerGoalCat
          )
        );
        setLearningHoursPerDay(res.profile.learning_hours_per_day ?? 2);
      }

      const activeCatalog =
        res && Array.isArray(res.skillCatalog) && res.skillCatalog.length > 0
          ? res.skillCatalog
          : DEFAULT_SKILL_CATALOG;
      setSkillCatalog(activeCatalog);

      const loadedSkills = res && Array.isArray(res.skills) ? res.skills : [];
      setSkills(loadedSkills);

      if (bridgeProfileContext?.targetSkill) {
        const target = String(bridgeProfileContext.targetSkill).trim();
        const resolved = resolveCatalogSkill(target, activeCatalog);
        const canonicalTarget = resolved ? resolved.name : target;
        const exists = loadedSkills.some(
          (s) => getCanonicalSkillKey(s.skill) === getCanonicalSkillKey(canonicalTarget)
        );
        if (!exists && canonicalTarget) {
          setSearchQuery(canonicalTarget);
          setNewSkillStatus('Learning');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeProfileContext?.targetSkill]);

  useEffect(() => {
    if (!loading) {
      scrollToTop();
    }
  }, [loading]);

  // Build quick lookup map of currently selected skills by canonical key
  const selectedSkillsMap = useMemo(() => {
    const map = new Map();
    for (const s of skills) {
      map.set(getCanonicalSkillKey(s.skill), s);
    }
    return map;
  }, [skills]);

  // Filter catalog items based on search query (matches skill name, category, or alias)
  const filteredPickerOptions = useMemo(() => {
    const q = normalizeSkillToken(searchQuery);
    if (!q) return skillCatalog;

    const qCanonical = getCanonicalSkillKey(q);
    return skillCatalog.filter((item) => {
      const nameNorm = normalizeSkillToken(item.name);
      const catNorm = normalizeSkillToken(item.category);
      const itemCanonical = getCanonicalSkillKey(item.name);
      const aliasMatch =
        Array.isArray(item.aliases) &&
        item.aliases.some((a) => normalizeSkillToken(a).includes(q));

      return (
        itemCanonical === qCanonical ||
        nameNorm.includes(q) ||
        catNorm.includes(q) ||
        aliasMatch
      );
    });
  }, [searchQuery, skillCatalog]);

  // Distinct categories for expandable full catalog browser
  const catalogCategories = useMemo(() => {
    const cats = new Set(['All']);
    for (const item of skillCatalog) {
      if (item.category) cats.add(item.category);
    }
    return Array.from(cats);
  }, [skillCatalog]);

  const browsableCatalogItems = useMemo(() => {
    if (selectedCategory === 'All') return skillCatalog;
    return skillCatalog.filter((item) => item.category === selectedCategory);
  }, [skillCatalog, selectedCategory]);

  // Add or update a canonical skill in the student's staged skills list
  const upsertSkillInState = (rawSkillName, desiredStatus = newSkillStatus) => {
    const catalogMatch = resolveCatalogSkill(rawSkillName, skillCatalog);
    if (!catalogMatch) {
      setError(
        `Please select a skill from the predefined SkillUP catalog (no match found for "${rawSkillName}").`
      );
      return false;
    }

    const canonicalName = catalogMatch.name;
    const targetKey = getCanonicalSkillKey(canonicalName);
    const existingIndex = skills.findIndex(
      (s) => getCanonicalSkillKey(s.skill) === targetKey
    );

    if (existingIndex >= 0) {
      const existing = skills[existingIndex];
      if (existing.status === desiredStatus) {
        setError(null);
        return true;
      }
      const updated = skills.map((s, idx) =>
        idx === existingIndex
          ? {
              ...s,
              skill: canonicalName,
              status: desiredStatus,
              category: catalogMatch.category,
              isLegacy: false,
            }
          : s
      );
      setSkills(updated);
    } else {
      setSkills([
        ...skills,
        {
          skill: canonicalName,
          status: desiredStatus,
          category: catalogMatch.category,
          isLegacy: false,
        },
      ]);
    }

    setSearchQuery('');
    setIsPickerOpen(false);
    setHighlightedIndex(0);
    setError(null);
    return true;
  };

  // Stage targetSkill from Bridge My Skill Gap with explicit student action (never auto-saved)
  const handleStageTargetSkill = (desiredStatus) => {
    const target = String(bridgeProfileContext?.targetSkill || '').trim();
    if (!target) return;

    const catalogMatch = resolveCatalogSkill(target, skillCatalog);
    const canonicalName = catalogMatch ? catalogMatch.name : target;
    const targetKey = getCanonicalSkillKey(canonicalName);

    const existingIndex = skills.findIndex(
      (s) => getCanonicalSkillKey(s.skill) === targetKey
    );
    if (existingIndex >= 0) {
      const updated = skills.map((s, idx) =>
        idx === existingIndex
          ? { ...s, skill: canonicalName, status: desiredStatus }
          : s
      );
      setSkills(updated);
    } else {
      setSkills([
        ...skills,
        {
          skill: canonicalName,
          status: desiredStatus,
          category: catalogMatch?.category || 'Opportunity-Specific Skills',
          isLegacy: false,
        },
      ]);
      if (getCanonicalSkillKey(searchQuery) === targetKey) {
        setSearchQuery('');
      }
    }
    setError(null);
  };

  // Handle + Add Skill button or Enter key in the searchable picker
  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setIsPickerOpen(true);
      return;
    }

    // 1. Check exact or alias match first
    const exactOrAliasMatch = resolveCatalogSkill(trimmed, skillCatalog);
    if (exactOrAliasMatch) {
      upsertSkillInState(exactOrAliasMatch.name, newSkillStatus);
      return;
    }

    // 2. Otherwise, if filtered options has a highlighted item, select it
    if (filteredPickerOptions.length > 0) {
      const chosen =
        filteredPickerOptions[highlightedIndex] || filteredPickerOptions[0];
      upsertSkillInState(chosen.name, newSkillStatus);
      return;
    }

    setError(
      `Unsupported skill "${trimmed}". Please select a skill from the predefined SkillUP catalog.`
    );
  };

  const handlePickerKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsPickerOpen(true);
      setHighlightedIndex((prev) =>
        filteredPickerOptions.length > 0
          ? (prev + 1) % filteredPickerOptions.length
          : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsPickerOpen(true);
      setHighlightedIndex((prev) =>
        filteredPickerOptions.length > 0
          ? (prev - 1 + filteredPickerOptions.length) %
            filteredPickerOptions.length
          : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    } else if (e.key === 'Escape') {
      setIsPickerOpen(false);
    }
  };

  const handleRemoveSkill = (skillNameToRemove) => {
    setSkills(skills.filter((s) => s.skill !== skillNameToRemove));
  };

  const handleToggleStatus = (skillName) => {
    setSkills(
      skills.map((s) => {
        if (s.skill === skillName) {
          return {
            ...s,
            status: s.status === 'Knows' ? 'Learning' : 'Knows',
          };
        }
        return s;
      })
    );
  };

  // Submit profile changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        branch: branch.trim(),
        college_year: collegeYear ? parseInt(collegeYear, 10) : null,
        interests: interestsList.map((i) => i.name).join(', '),
        career_goals: careerGoalsList.map((g) => g.name).join(', '),
        learning_hours_per_day: parseFloat(learningHoursPerDay) || 0,
        skills: skills.map((s) => ({
          skill: s.skill,
          status: s.status,
        })),
      };

      const res = await api.updateProfile(payload);
      setSuccessMessage('Profile and skills saved to MySQL successfully!');
      if (res && res.profile) {
        if (typeof res.profile.branch === 'string') {
          setBranch(res.profile.branch);
          setBranchIsLegacy(Boolean(res.profile.branchIsLegacy));
        }
        if (Array.isArray(res.profile.interestsList)) {
          setInterestsList(res.profile.interestsList);
        }
        if (Array.isArray(res.profile.careerGoalsList)) {
          setCareerGoalsList(res.profile.careerGoalsList);
        }
      }
      if (res && Array.isArray(res.skills)) {
        setSkills(res.skills);
      }
      if (res && Array.isArray(res.skillCatalog) && res.skillCatalog.length > 0) {
        setSkillCatalog(res.skillCatalog);
      }
      if (typeof onSaveSuccess === 'function') {
        onSaveSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="su-card flex flex-col items-center justify-center p-12 text-[#64607D]">
        <div className="w-8 h-8 border-4 border-[#4F7DF3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Loading student profile from database...</p>
      </div>
    );
  }

  const targetSkillEntry = bridgeProfileContext?.targetSkill
    ? skills.find(
        (s) =>
          getCanonicalSkillKey(s.skill) ===
          getCanonicalSkillKey(bridgeProfileContext.targetSkill)
      )
    : null;

  const knowsSkills = skills.filter((s) => s.status === 'Knows');
  const learningSkills = skills.filter((s) => s.status !== 'Knows');

  const studentInitials = String(user?.name || 'Student')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="w-full space-y-6">
      {/* Bridge My Skill Gap Context Banner */}
      {bridgeProfileContext &&
        (bridgeProfileContext.opportunityId || bridgeProfileContext.targetSkill) && (
          <div className="su-card p-5 sm:p-6 bg-[#EEF2FF] border-[#D8E2FF] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#4F7DF3] text-white">
                    Bridge My Skill Gap
                  </span>
                  {bridgeProfileContext.targetSkill && (
                    <span className="text-xs font-bold text-[#147A4E] bg-[#DDF7E8] px-2.5 py-0.5 rounded-full border border-[#B8EBD0]">
                      Target Skill: {bridgeProfileContext.targetSkill}
                    </span>
                  )}
                </div>
                {bridgeProfileContext.opportunityTitle && (
                  <p className="text-sm font-bold text-[#1E1B3A]">
                    Updating skills for:{' '}
                    <span className="text-[#4F7DF3]">
                      {bridgeProfileContext.opportunityTitle}
                    </span>
                  </p>
                )}
                <p className="text-xs text-[#64607D]">
                  Saving your profile below will update MySQL and automatically return
                  you to this opportunity with a refreshed skill gap analysis.
                </p>
              </div>

              {bridgeProfileContext.opportunityId && onReturnToOpportunity && (
                <button
                  type="button"
                  onClick={() =>
                    onReturnToOpportunity(bridgeProfileContext.opportunityId)
                  }
                  className="px-4 py-2 rounded-full bg-white hover:bg-[#F3F0FF] border border-[#E6E0F8] text-xs font-semibold text-[#1E1B3A] transition-colors cursor-pointer self-start sm:self-center shrink-0"
                >
                  ← Return to Opportunity
                </button>
              )}
            </div>

            {bridgeProfileContext.targetSkill && (
              <div className="pt-3 border-t border-[#D8E2FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[#64607D]">
                  Current staged status for{' '}
                  <strong className="text-[#1E1B3A]">
                    {bridgeProfileContext.targetSkill}
                  </strong>
                  :{' '}
                  {targetSkillEntry ? (
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full border ${
                        targetSkillEntry.status === 'Knows'
                          ? 'bg-[#DDF7E8] text-[#147A4E] border-[#B8EBD0]'
                          : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                      }`}
                    >
                      {targetSkillEntry.status}
                    </span>
                  ) : (
                    <span className="font-semibold text-[#92400E]">
                      Not yet in your skills list
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStageTargetSkill('Learning')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                      targetSkillEntry?.status === 'Learning'
                        ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]'
                        : 'bg-white hover:bg-[#FEF3C7]/60 border-[#E6E0F8] text-[#92400E]'
                    }`}
                  >
                    Mark &ldquo;{bridgeProfileContext.targetSkill}&rdquo; as Learning
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStageTargetSkill('Knows')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                      targetSkillEntry?.status === 'Knows'
                        ? 'bg-[#DDF7E8] border-[#10B981] text-[#147A4E]'
                        : 'bg-white hover:bg-[#DDF7E8]/60 border-[#E6E0F8] text-[#147A4E]'
                    }`}
                  >
                    Mark &ldquo;{bridgeProfileContext.targetSkill}&rdquo; as Knows
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Top Student Summary Hero Card (Screenshot 6) */}
      <div className="su-hero-mint p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div
            aria-hidden="true"
            className="w-16 h-16 rounded-full bg-[#FDE68A] border-2 border-white shadow-sm flex items-center justify-center text-xl font-bold text-[#92400E] shrink-0"
          >
            {studentInitials || 'SU'}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1E1B3A] tracking-tight">
                {user?.name || 'Student'}
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/80 text-[#147A4E] border border-[#B8EBD0] uppercase tracking-wider">
                Verified Student
              </span>
            </div>
            <p className="text-sm text-[#4A4665] font-medium">
              {branch || 'Branch not set yet'}
              {collegeYear ? ` · Year ${collegeYear}` : ''}
            </p>
            <p className="text-xs text-[#64607D]">{user?.email}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E6E0F8] shadow-sm flex items-center justify-between gap-6 shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64607D]">
              Daily Learning Availability
            </p>
            <p className="text-2xl font-bold text-[#1E1B3A] mt-0.5">
              {learningHoursPerDay} hrs / day
            </p>
          </div>
          <button
            type="button"
            onClick={loadProfile}
            className="text-xs font-semibold px-3.5 py-2 rounded-full bg-[#F3F0FF] hover:bg-[#E6E0F8] text-[#1E1B3A] border border-[#E6E0F8] transition-colors cursor-pointer shrink-0"
          >
            Reload from DB
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center justify-between gap-2"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-[#DDF7E8] border border-[#B8EBD0] text-[#147A4E] text-sm font-semibold flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-[#147A4E] hover:text-[#1E1B3A] font-bold ml-2 text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two-Column Profile & Skills Form (Screenshot 6) */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Academic & Career Details */}
          <div className="lg:col-span-5 su-card p-6 sm:p-7 space-y-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64607D]">
                Student Background
              </span>
              <h3 className="text-lg font-bold text-[#1E1B3A] mt-0.5">
                Academic &amp; Career Details
              </h3>
            </div>

            <CatalogSingleSelectPicker
              inputId="profile-branch-search"
              listboxId="profile-branch-listbox"
              label="Branch / Major"
              placeholder="Search branch (e.g. CSE, IT, AI & DS, Data Science, IoT)..."
              catalog={branchCatalog}
              selectedValue={branch}
              isLegacy={branchIsLegacy}
              onChange={(nextBranch, nextIsLegacy) => {
                setBranch(nextBranch);
                setBranchIsLegacy(Boolean(nextIsLegacy));
              }}
              onValidationError={(msg) => setError(msg)}
              scopeNote="SkillUP currently supports CSE, IT and related specializations. More branches are planned for future versions."
            />

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64607D] mb-1.5">
                College Year
              </label>
              <select
                value={collegeYear}
                onChange={(e) => setCollegeYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F6FF] border border-[#E6E0F8] rounded-xl text-[#1E1B3A] focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] text-sm font-medium cursor-pointer"
              >
                <option value="">Select Year</option>
                <option value="1">Year 1 (Freshman)</option>
                <option value="2">Year 2 (Sophomore)</option>
                <option value="3">Year 3 (Junior)</option>
                <option value="4">Year 4 (Senior)</option>
                <option value="5">Year 5+ / Graduate</option>
              </select>
            </div>

            {/* Learning Commitment */}
            <div className="p-4 rounded-2xl bg-[#F8F6FF] border border-[#E6E0F8]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64607D] mb-2">
                Available Learning Hours Per Day ({learningHoursPerDay} hrs)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.5"
                  value={learningHoursPerDay}
                  onChange={(e) => setLearningHoursPerDay(parseFloat(e.target.value))}
                  className="w-full accent-[#4F7DF3] cursor-pointer"
                />
                <span className="text-sm font-bold text-[#4F7DF3] w-16 text-right shrink-0">
                  {learningHoursPerDay} hrs
                </span>
              </div>
            </div>

            {/* Technical & Learning Interests — Predefined Searchable Multi-Select */}
            <CatalogMultiSelectPicker
              inputId="profile-interests-search"
              listboxId="profile-interests-listbox"
              label="Technical & Learning Interests"
              placeholder="Search engineering interests (e.g. Web Development, Machine Learning, Cloud Computing, Open Source)..."
              catalog={interestCatalog}
              selectedItems={interestsList}
              onChange={setInterestsList}
              onValidationError={setError}
              emptyHint="No technical interests selected yet. Search or open the dropdown above to select your engineering interests."
            />

            {/* Career Goals — Predefined Searchable Multi-Select */}
            <CatalogMultiSelectPicker
              inputId="profile-career-goals-search"
              listboxId="profile-career-goals-listbox"
              label="Career Goals"
              placeholder="Search career goals (e.g. Software Engineer, Software Engineering Internship, Full-Stack Developer)..."
              catalog={careerGoalCatalog}
              selectedItems={careerGoalsList}
              onChange={setCareerGoalsList}
              onValidationError={setError}
              emptyHint="No career goals selected yet. Search or open the dropdown above to select your target career paths."
            />
          </div>

          {/* Right Column: Skills & Proficiency Matrix */}
          <div className="lg:col-span-7 su-card p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F3F0FF]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64607D]">
                  Skills &amp; Proficiency
                </span>
                <h3 className="text-lg font-bold text-[#1E1B3A] mt-0.5">
                  Skills Matrix
                </h3>
                <p className="text-xs text-[#64607D] mt-0.5">
                  Select canonical skills from the SkillUP catalog and mark each as{' '}
                  <strong className="text-[#147A4E]">Knows</strong> or{' '}
                  <strong className="text-[#92400E]">Learning</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                <span className="px-3 py-1 rounded-full bg-[#DDF7E8] border border-[#B8EBD0] text-[#147A4E]">
                  ✓ {knowsSkills.length} Knows
                </span>
                <span className="px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]">
                  ◐ {learningSkills.length} Learning
                </span>
              </div>
            </div>

            {/* 1. Compact Searchable Skill Picker */}
            <div className="relative space-y-2">
              <label
                htmlFor="profile-skill-search"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#64607D]"
              >
                Add or Update a Skill from Catalog
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    id="profile-skill-search"
                    type="text"
                    role="combobox"
                    aria-expanded={isPickerOpen}
                    aria-controls="skill-picker-listbox"
                    aria-autocomplete="list"
                    value={searchQuery}
                    onFocus={() => setIsPickerOpen(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsPickerOpen(true);
                      setHighlightedIndex(0);
                      if (error) setError(null);
                    }}
                    onKeyDown={handlePickerKeyDown}
                    placeholder="Search skills or aliases (e.g. React, Python, C++, Git, AWS, SQL, JS, ML)..."
                    className="w-full px-3.5 py-2.5 bg-[#F8F6FF] border border-[#E6E0F8] rounded-xl text-[#1E1B3A] placeholder-[#64607D] focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] text-sm font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setHighlightedIndex(0);
                      }}
                      aria-label="Clear skill search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64607D] hover:text-[#1E1B3A] px-1.5 py-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  aria-label="Default skill status"
                  value={newSkillStatus}
                  onChange={(e) => setNewSkillStatus(e.target.value)}
                  className="px-3.5 py-2.5 bg-[#F8F6FF] border border-[#E6E0F8] rounded-xl text-[#1E1B3A] focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] text-sm font-medium cursor-pointer"
                >
                  <option value="Learning">Learning</option>
                  <option value="Knows">Knows</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2.5 bg-[#4F7DF3] hover:bg-[#3E6AE1] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  + Add Skill
                </button>
              </div>

              {/* Search Dropdown Listbox */}
              {isPickerOpen && (
                <div
                  id="skill-picker-listbox"
                  role="listbox"
                  aria-label="Predefined skills catalog suggestions"
                  className="bg-white border border-[#E6E0F8] rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-[#F3F0FF] z-30"
                >
                  <div className="px-3.5 py-2 bg-[#F8F6FF] flex items-center justify-between text-[11px] text-[#64607D]">
                    <span>
                      Showing {filteredPickerOptions.length} of {skillCatalog.length}{' '}
                      canonical skills
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(false)}
                      className="text-[#64607D] hover:text-[#1E1B3A] font-semibold cursor-pointer"
                    >
                      Close ✕
                    </button>
                  </div>

                  {filteredPickerOptions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#64607D]">
                      No catalog skills match &ldquo;{searchQuery}&rdquo;. Try searching
                      for a programming language, framework, database, or tool from the
                      catalog.
                    </div>
                  ) : (
                    filteredPickerOptions.map((item, idx) => {
                      const existingEntry = selectedSkillsMap.get(
                        getCanonicalSkillKey(item.name)
                      );
                      const isHighlighted = idx === highlightedIndex;

                      return (
                        <div
                          key={item.name}
                          role="option"
                          aria-selected={Boolean(existingEntry)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                            isHighlighted ? 'bg-[#F3F0FF]' : 'hover:bg-[#F8F6FF]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-[#1E1B3A]">
                                {item.name}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3F0FF] text-[#64607D] border border-[#E6E0F8]">
                                {item.category}
                              </span>
                              {existingEntry && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    existingEntry.status === 'Knows'
                                      ? 'bg-[#DDF7E8] text-[#147A4E] border-[#B8EBD0]'
                                      : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                                  }`}
                                >
                                  {existingEntry.status === 'Knows'
                                    ? '✓ In Profile (Knows)'
                                    : '◐ In Profile (Learning)'}
                                </span>
                              )}
                            </div>
                            {Array.isArray(item.aliases) && item.aliases.length > 0 && (
                              <p className="text-[11px] text-[#64607D] mt-0.5">
                                Aliases: {item.aliases.join(', ')}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => upsertSkillInState(item.name, 'Learning')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                existingEntry?.status === 'Learning'
                                  ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]'
                                  : 'bg-white hover:bg-[#FEF3C7]/60 border-[#E6E0F8] text-[#92400E]'
                              }`}
                            >
                              + Learning
                            </button>
                            <button
                              type="button"
                              onClick={() => upsertSkillInState(item.name, 'Knows')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                existingEntry?.status === 'Knows'
                                  ? 'bg-[#DDF7E8] border-[#10B981] text-[#147A4E]'
                                  : 'bg-white hover:bg-[#DDF7E8]/60 border-[#E6E0F8] text-[#147A4E]'
                              }`}
                            >
                              + Knows
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 2. Grouped Selected Skills (Known Skills vs. Currently Learning) */}
            {skills.length === 0 ? (
              <div className="p-5 rounded-2xl border border-dashed border-[#D8D0F0] bg-[#F8F6FF] text-center text-xs text-[#64607D]">
                No skills added yet. Search above or expand the catalog below to select
                skills you know or are currently learning.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Group A: Known Skills */}
                <div className="p-4 rounded-2xl bg-[#DDF7E8]/45 border border-[#B8EBD0] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="text-xs font-bold text-[#147A4E]"
                      >
                        ✓
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#147A4E]">
                        Known Skills (Knows)
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#147A4E] border border-[#B8EBD0]">
                      {knowsSkills.length}
                    </span>
                  </div>

                  {knowsSkills.length === 0 ? (
                    <p className="text-xs text-[#64607D] py-1">
                      No skills marked as Knows yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {knowsSkills.map((s) => (
                        <div
                          key={s.skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-[#DDF7E8] border-[#B8EBD0] text-[#147A4E] text-xs font-semibold"
                        >
                          <span aria-hidden="true" className="text-[#147A4E] font-bold">
                            ✓
                          </span>
                          <span>{s.skill}</span>
                          {s.isLegacy && (
                            <span
                              title="Previously saved custom skill"
                              className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                            >
                              Legacy
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s.skill)}
                            title={`Switch ${s.skill} to Learning`}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/90 hover:bg-white text-[#1E1B3A] border border-[#B8EBD0] cursor-pointer ml-0.5"
                          >
                            Knows ⇄
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(s.skill)}
                            title={`Remove ${s.skill}`}
                            aria-label={`Remove ${s.skill}`}
                            className="text-[#147A4E] hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group B: Currently Learning */}
                <div className="p-4 rounded-2xl bg-[#FEF3C7]/45 border border-[#FDE68A] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="text-xs font-bold text-[#92400E]">
                        ◐
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#92400E]">
                        Currently Learning (Learning)
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#92400E] border border-[#FDE68A]">
                      {learningSkills.length}
                    </span>
                  </div>

                  {learningSkills.length === 0 ? (
                    <p className="text-xs text-[#64607D] py-1">
                      No skills marked as Learning right now.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {learningSkills.map((s) => (
                        <div
                          key={s.skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-[#FEF3C7] border-[#FDE68A] text-[#92400E] text-xs font-semibold"
                        >
                          <span aria-hidden="true" className="text-[#92400E] font-bold">
                            ◐
                          </span>
                          <span>{s.skill}</span>
                          {s.isLegacy && (
                            <span
                              title="Previously saved custom skill"
                              className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#92400E] border border-[#FDE68A]"
                            >
                              Legacy
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s.skill)}
                            title={`Switch ${s.skill} to Knows`}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/90 hover:bg-white text-[#1E1B3A] border border-[#FDE68A] cursor-pointer ml-0.5"
                          >
                            Learning ⇄
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(s.skill)}
                            title={`Remove ${s.skill}`}
                            aria-label={`Remove ${s.skill}`}
                            className="text-[#92400E] hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Expandable Categorized Skill Catalog Browser */}
            <div className="pt-1">
              <button
                type="button"
                aria-expanded={showFullCatalog}
                onClick={() => setShowFullCatalog((prev) => !prev)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#4F7DF3] hover:text-[#3E6AE1] px-4 py-2 rounded-full bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#D8E2FF] transition-colors cursor-pointer"
              >
                <span>
                  {showFullCatalog
                    ? 'Hide Categorized Skill Catalog'
                    : `Browse Full Skill Catalog by Category (${skillCatalog.length} Skills)`}
                </span>
                <span aria-hidden="true">{showFullCatalog ? '▴' : '▾'}</span>
              </button>

              {showFullCatalog && (
                <div className="mt-3 p-4 rounded-2xl bg-[#F8F6FF] border border-[#E6E0F8] space-y-4">
                  {/* Category Filter Pills */}
                  <div
                    role="tablist"
                    aria-label="Skill catalog categories"
                    className="flex flex-wrap gap-1.5"
                  >
                    {catalogCategories.map((cat) => {
                      const isActive = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[#4F7DF3] text-white shadow-sm'
                              : 'bg-white text-[#64607D] hover:text-[#1E1B3A] border border-[#E6E0F8]'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Categorized Skill Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {browsableCatalogItems.map((item) => {
                      const existingEntry = selectedSkillsMap.get(
                        getCanonicalSkillKey(item.name)
                      );
                      return (
                        <div
                          key={item.name}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                            existingEntry
                              ? existingEntry.status === 'Knows'
                                ? 'bg-[#DDF7E8]/60 border-[#B8EBD0]'
                                : 'bg-[#FEF3C7]/60 border-[#FDE68A]'
                              : 'bg-white border-[#E6E0F8]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#1E1B3A] truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-[#64607D] truncate">
                              {item.category}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => upsertSkillInState(item.name, 'Learning')}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                existingEntry?.status === 'Learning'
                                  ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#92400E]'
                                  : 'bg-[#F8F6FF] hover:bg-[#FEF3C7]/60 border-[#E6E0F8] text-[#92400E]'
                              }`}
                            >
                              {existingEntry?.status === 'Learning'
                                ? '◐ Learning'
                                : '+ Learning'}
                            </button>
                            <button
                              type="button"
                              onClick={() => upsertSkillInState(item.name, 'Knows')}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                existingEntry?.status === 'Knows'
                                  ? 'bg-[#DDF7E8] border-[#10B981] text-[#147A4E]'
                                  : 'bg-[#F8F6FF] hover:bg-[#DDF7E8]/60 border-[#E6E0F8] text-[#147A4E]'
                              }`}
                            >
                              {existingEntry?.status === 'Knows'
                                ? '✓ Knows'
                                : '+ Knows'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-[#F3F0FF] flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#4F7DF3] hover:bg-[#3E6AE1] disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-md cursor-pointer"
              >
                {saving ? 'Saving Profile to MySQL...' : 'Save Profile & Skills'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
