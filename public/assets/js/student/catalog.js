/* Event name suggestions and the starter schedule. */

/* Suggestions shown while adding an event. Format: "Name|Tag". Most common first. */
export var CATALOG = {
  sports: [
    "Cricket|Team · outdoor", "Football|Team · outdoor", "Volleyball|Team · outdoor", "Kabaddi|Team · outdoor", "Basketball|Team · outdoor", "Kho-Kho|Team · outdoor",
    "Badminton Singles|Indoor", "Badminton Doubles|Indoor", "Table Tennis|Indoor", "Chess|Indoor · mind sport", "Carrom|Indoor", "Tug of War|Team · outdoor",
    "Relay 4x100m|Athletics", "100m Sprint|Athletics", "200m Sprint|Athletics", "400m Run|Athletics", "800m Run|Athletics", "1500m Run|Athletics", "Long Jump|Athletics", "High Jump|Athletics", "Triple Jump|Athletics", "Shot Put|Athletics", "Discus Throw|Athletics", "Javelin Throw|Athletics", "Cross Country|Athletics",
    "Hockey|Team · outdoor", "Handball|Team · outdoor", "Throwball|Team · outdoor", "Netball|Team · outdoor", "Dodgeball|Team · outdoor", "Box Cricket|Team · indoor", "Gully Cricket|Team · outdoor", "Futsal|Team · indoor", "Penalty Shootout|Outdoor",
    "Lawn Tennis|Outdoor", "Squash|Indoor", "Pickleball|Outdoor", "Swimming|Aquatics", "Water Polo|Aquatics", "Archery|Precision", "Shooting|Precision", "Darts|Precision",
    "Boxing|Combat", "Wrestling|Combat", "Judo|Combat", "Karate|Combat", "Taekwondo|Combat", "Arm Wrestling|Strength", "Weightlifting|Strength", "Powerlifting|Strength",
    "Rugby|Team · outdoor", "Softball|Team · outdoor", "Baseball|Team · outdoor", "Ultimate Frisbee|Team · outdoor", "Beach Volleyball|Team · outdoor",
    "Cycling|Endurance", "Skating|Endurance", "Mallakhamb|Traditional", "Gilli Danda|Traditional", "Lagori (Seven Stones)|Traditional",
    "Sack Race|Fun race", "Three-Legged Race|Fun race", "Lemon and Spoon Race|Fun race", "Musical Chairs|Fun game", "Skipping Rope|Fun game",
    "Snooker|Cue sport", "Pool|Cue sport", "Yoga|Fitness", "Aerobics|Fitness",
    "BGMI|Esports", "Valorant|Esports", "Free Fire|Esports", "FIFA|Esports", "Call of Duty Mobile|Esports", "Clash Royale|Esports"
  ],
  edufun: [
    "Quiz Battle|Quiz", "General Quiz|Quiz", "Tech Quiz|Quiz", "Business Quiz|Quiz", "Sports Quiz|Quiz", "Science Quiz|Quiz", "Movie and Music Quiz|Quiz",
    "Treasure Hunt|Game", "Scavenger Hunt|Game", "Escape Room|Game", "Pictionary|Game", "Dumb Charades|Game", "Tech Charades|Game", "Memory Game|Game", "Stock Market Game|Strategy",
    "Debate|Speaking", "Extempore|Speaking", "Just a Minute (JAM)|Speaking", "Group Discussion|Speaking", "Elocution|Speaking", "Mock Parliament|Speaking", "Model United Nations|Speaking",
    "Essay Writing|Writing", "Slogan Writing|Writing", "Spelling Bee|Language", "Crossword|Puzzle", "Sudoku|Puzzle", "Puzzle Relay|Puzzle", "Rubik's Cube Solve|Puzzle", "Lateral Thinking|Puzzle", "Brain Teaser Finale|Puzzle", "Math Olympiad|Puzzle", "Aptitude Test|Puzzle",
    "Case Study Contest|Business", "Business Plan Pitch|Business", "Ad Mad Show|Business",
    "Code Debugging|Tech", "Debug Sprint|Tech", "Coding Contest|Tech", "Hackathon|Tech", "Web Design|Tech", "Technical Paper Presentation|Tech", "Project Expo|Tech", "Circuit Design|Tech", "Robo Race|Tech",
    "Poster Making|Creative", "Photography Contest|Creative", "Meme Making|Creative", "Reel Making|Creative", "Short Film|Creative", "Typing Contest|Skill"
  ],
  cultural: [
    "Solo Singing|Music", "Group Singing|Music", "Classical Vocal|Music", "Folk Song|Music", "Antakshari|Music", "Battle of Bands|Music", "Rap Battle|Music", "Beatbox|Music", "Instrumental Solo|Music", "Lip Sync Battle|Music",
    "Solo Dance|Dance", "Duet Dance|Dance", "Group Dance|Dance", "Classical Dance|Dance", "Folk Dance|Dance", "Street Dance|Dance", "Western Dance|Dance", "Dance Battle|Dance", "Flash Mob|Dance",
    "Nukkad Natak (Street Play)|Drama", "Skit|Drama", "Mime|Drama", "Monologue|Drama", "One-Act Play|Drama", "Stand-up Comedy|Drama", "Mimicry|Drama",
    "Poetry Recitation|Literary", "Shayari|Literary", "Storytelling|Literary", "Kavi Sammelan|Literary",
    "Fashion Walk|Fashion", "Ramp Walk|Fashion", "Theme Walk|Fashion", "Mr and Ms TEJAS|Fashion", "Talent Show|Showcase", "DJ Night|Showcase",
    "Rangoli|Art", "Mehendi|Art", "Face Painting|Art", "Sketching|Art", "Painting|Art", "Clay Modelling|Art", "Collage|Art", "Calligraphy|Art", "Pot Painting|Art", "Cartooning|Art", "Best Out of Waste|Craft", "Handicraft|Craft", "Cooking Without Fire|Craft"
  ]
};

export function catalogFor(sec) {
  return (CATALOG[sec] || []).map(function (s) { var p = s.split("|"); return { name: p[0], tag: p[1] || "" }; });
}

/* Starter schedule: six events per section across the first days. Used by "Load starter events". */
export var STARTER = {
  sports:   [[1, "Cricket League"], [1, "Football"], [2, "Volleyball"], [2, "Kabaddi"], [3, "Relay Race"], [3, "Tug of War"]],
  edufun:   [[1, "Quiz Battle"], [1, "Treasure Hunt"], [2, "Debug Sprint"], [2, "Pictionary"], [3, "Tech Charades"], [3, "Brain Teaser Finale"]],
  cultural: [[1, "Solo Singing"], [1, "Group Dance"], [2, "Nukkad Natak"], [2, "Rangoli"], [3, "Fashion Walk"], [3, "Battle of Bands"]]
};
