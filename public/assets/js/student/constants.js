/* Shared domain constants for the TEJAS scoreboard. */

export var TEAMS = [
  { id: "t1", name: "The Hellfire",      short: "THF", color: "#ff4d5e" },
  { id: "t2", name: "The Demogorgons",   short: "TDG", color: "#ffb347" },
  { id: "t3", name: "The Mindflayers",   short: "TMF", color: "#b07cff" },
  { id: "t4", name: "The Vecna",         short: "TV",  color: "#4db8ff" },
  { id: "t5", name: "The Upsider",       short: "TUP", color: "#ff7ac0" },
  { id: "t6", name: "The Gatekeepers",   short: "TGK", color: "#4ee0a1" },
  { id: "t7", name: "The Shadow Realms", short: "TSR", color: "#35d8e0" },
  { id: "t8", name: "The Guardians",     short: "TGU", color: "#f2e14c" }
];

export var SECTIONS = [
  { id: "sports", label: "Sports" },
  { id: "edufun", label: "Edufun" },
  { id: "cultural", label: "Cultural" }
];

export var SEC_IDS = SECTIONS.map(function (s) { return s.id; });
export var DAYS = [1, 2, 3, 4];
export var MIN_SCORE = -999, MAX_SCORE = 9999;

/* Points awarded by finishing position when organizers rank an event. */
export var PLACE_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
export var DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4"];
