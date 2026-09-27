// Books Mode: NCERT Grade 5 Curriculum Explorer (Mathematics & Science)
(function () {
  "use strict";

  const BOOKS_DATA = {
    mathematics: {
      id: "mathematics",
      title: "Mathematics",
      grade: "Grade 5",
      totalChapters: 14,
      totalLessons: 48,
      theme: "math",
      themeColor: "#6366f1",
      themeBg: "#eef2ff",
      themeBorder: "#c7d2fe",
      themeBadgeBg: "#e0e7ff",
      themeBadgeText: "#4338ca",
      description: "Explore shapes, angles, large numbers, fractions, patterns, and practical problem solving.",
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      chapters: [
        {
          id: 1,
          title: "The Fish Tale",
          lessonsCount: 4,
          status: "active",
          lessons: [
            { id: 1, title: "Introduction", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Core Concepts", duration: "14 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Apply & Explore", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Practice & Mastery", duration: "15 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 2,
          title: "Shapes and Angles",
          lessonsCount: 3,
          status: "available",
          lessons: [
            { id: 1, title: "Right, Acute, and Obtuse Angles", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Angles in Names & Yoga Poses", duration: "12 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Angle Tester & Degree Clock", duration: "15 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        },
        {
          id: 3,
          title: "How Many Squares?",
          lessonsCount: 4,
          status: "available",
          lessons: [
            { id: 1, title: "Measuring Area with Grid Squares", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Triangle Half-Squares & Shapes", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Stamp & Handprint Challenges", duration: "14 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Tangrams & Puzzle Tiles", duration: "12 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 4,
          title: "Parts and Wholes",
          lessonsCount: 5,
          status: "locked",
          lessons: [
            { id: 1, title: "Fractions of a Whole & Strip Folding", duration: "10 min", status: "unlocked", dots: 5, activeDot: 1 },
            { id: 2, title: "Equivalent Fractions & Colors", duration: "12 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 3, title: "Chocolate Sharing & Rupee Parts", duration: "14 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 4, title: "Fraction Patterns & Puzzles", duration: "12 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 5, title: "Mixed Number Problem Solving", duration: "15 min", status: "locked", dots: 5, activeDot: 0 }
          ]
        },
        {
          id: 5,
          title: "Does it Look the Same?",
          lessonsCount: 3,
          status: "locked",
          lessons: [
            { id: 1, title: "Mirror Halves & Symmetry Lines", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Half-Turns and Quarter-Turns", duration: "12 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Windmill Patterns & Rotations", duration: "14 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        },
        {
          id: 6,
          title: "Be My Multiple, I'll Be Your Factor",
          lessonsCount: 4,
          status: "locked",
          lessons: [
            { id: 1, title: "Cat and Mouse Step Game", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Common Multiples & Bangles Problem", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Factor Trees & Dice Games", duration: "14 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Grid Factor Challenges", duration: "15 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 7,
          title: "Can You See the Pattern?",
          lessonsCount: 3,
          status: "locked",
          lessons: [
            { id: 1, title: "Repeating & Rotating Rules", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Magic Squares & Number Hexagons", duration: "14 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Secret Codes & Palindromes", duration: "12 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        },
        {
          id: 8,
          title: "Mapping Your Way",
          lessonsCount: 4,
          status: "locked",
          lessons: [
            { id: 1, title: "Reading India Gate & Rajpath Map", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Scale & Distances on a Grid", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "State Maps & Coastal Borders", duration: "14 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Directions & School Walkways", duration: "12 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 9,
          title: "Boxes and Sketches",
          lessonsCount: 3,
          status: "locked",
          lessons: [
            { id: 1, title: "Making Nets for Cubes and Boxes", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Deep Drawings vs Floor Maps", duration: "12 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Perspective & Isometric Sketches", duration: "14 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        },
        {
          id: 10,
          title: "Tenths and Hundredths",
          lessonsCount: 5,
          status: "locked",
          lessons: [
            { id: 1, title: "Millimeters, Centimeters & Tenths", duration: "10 min", status: "unlocked", dots: 5, activeDot: 1 },
            { id: 2, title: "Hundredths & Currency Peda", duration: "12 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 3, title: "Temperature Records & Weather Data", duration: "12 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 4, title: "Decimal Comparisons & Money", duration: "14 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 5, title: "Measuring Tape Challenge", duration: "15 min", status: "locked", dots: 5, activeDot: 0 }
          ]
        },
        {
          id: 11,
          title: "Area and Its Boundary",
          lessonsCount: 4,
          status: "locked",
          lessons: [
            { id: 1, title: "Perimeter vs Area with String", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Postcard Belts & Square Centimeters", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Chequered Rugs & Land Sharing", duration: "14 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Fencing Calculations & Farms", duration: "12 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 12,
          title: "Smart Charts",
          lessonsCount: 3,
          status: "locked",
          lessons: [
            { id: 1, title: "Tally Marks & Traffic Survey", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Bar Charts & Family Trees", duration: "12 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Chapati Charts (Pie Charts)", duration: "14 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        },
        {
          id: 13,
          title: "Ways to Multiply and Divide",
          lessonsCount: 4,
          status: "locked",
          lessons: [
            { id: 1, title: "Maniratnam's Cashier Method", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Grid Multiplication vs Column", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Division as Repeated Subtraction", duration: "14 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Farm Harvest & Wage Calculations", duration: "15 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 14,
          title: "How Big? How Heavy?",
          lessonsCount: 3,
          status: "locked",
          lessons: [
            { id: 1, title: "Volume with Marbles & Matchboxes", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Cubic Centimeters & Box Capacity", duration: "12 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Weight & Grams vs Kilograms", duration: "14 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        }
      ]
    },
    science: {
      id: "science",
      title: "Science",
      grade: "Grade 5",
      totalChapters: 12,
      totalLessons: 42,
      theme: "science",
      themeColor: "#10b981",
      themeBg: "#ecfdf5",
      themeBorder: "#a7f3d0",
      themeBadgeBg: "#d1fae5",
      themeBadgeText: "#065f46",
      description: "Discover super senses, plant life, water experiments, astronomy, and ecosystems.",
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2v7.31L4.67 19.2A2 2 0 0 0 6.4 22h11.2a2 2 0 0 0 1.73-2.8L14 9.31V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>',
      chapters: [
        {
          id: 1,
          title: "Super Senses",
          lessonsCount: 4,
          status: "active",
          lessons: [
            { id: 1, title: "Introduction", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Core Concepts", duration: "14 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Apply & Explore", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Practice & Mastery", duration: "15 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 2,
          title: "A Snake Charmer's Story",
          lessonsCount: 3,
          status: "available",
          lessons: [
            { id: 1, title: "Kalbeliyas & Musical Instruments", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Poisonous Snakes & Fangs", duration: "12 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Farmers' Friends & Wildlife Laws", duration: "14 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        },
        {
          id: 3,
          title: "From Tasting to Digesting",
          lessonsCount: 4,
          status: "available",
          lessons: [
            { id: 1, title: "The Tongue and Different Tastes", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Glucose Drip & Stomach Window Story", duration: "14 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Proper Digestion & Balanced Diet", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Food Preservation & Summer Treats", duration: "12 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 4,
          title: "Mangoes Round the Year",
          lessonsCount: 3,
          status: "locked",
          lessons: [
            { id: 1, title: "Fresh Food vs Spoiled Food", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Making Mamidi Tandra (Aam Papad)", duration: "12 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Preservation Methods & Pickles", duration: "14 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        },
        {
          id: 5,
          title: "Seeds and Seeds",
          lessonsCount: 4,
          status: "locked",
          lessons: [
            { id: 1, title: "Seed Germination & Sprouting", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Plant Travelers (Seed Dispersal)", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Pitcher Plants & Insect Hunters", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Seeds from Far Away", duration: "14 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 6,
          title: "Every Drop Counts",
          lessonsCount: 5,
          status: "locked",
          lessons: [
            { id: 1, title: "The Story of Ghadsisar Lake", duration: "10 min", status: "unlocked", dots: 5, activeDot: 1 },
            { id: 2, title: "Stepwells (Bawris) & Caravans", duration: "12 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 3, title: "Rainwater Harvesting & Rooftops", duration: "12 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 4, title: "Water Troubles & Modern Supply", duration: "14 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 5, title: "Jal Shakti & Conservation", duration: "15 min", status: "locked", dots: 5, activeDot: 0 }
          ]
        },
        {
          id: 7,
          title: "Experiments with Water",
          lessonsCount: 5,
          status: "locked",
          lessons: [
            { id: 1, title: "What Floats and What Sinks?", duration: "10 min", status: "unlocked", dots: 5, activeDot: 1 },
            { id: 2, title: "The Magic Egg in Salt Water", duration: "12 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 3, title: "The Dead Sea Mystery", duration: "10 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 4, title: "Dissolving & Evaporation", duration: "12 min", status: "locked", dots: 5, activeDot: 0 },
            { id: 5, title: "Dandi March & Making Salt", duration: "14 min", status: "locked", dots: 5, activeDot: 0 }
          ]
        },
        {
          id: 8,
          title: "A Treat for Mosquitoes",
          lessonsCount: 3,
          status: "locked",
          lessons: [
            { id: 1, title: "Blood Tests, Malaria, and Anemia", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Ronald Ross & Mosquito Discovery", duration: "12 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Stopping Mosquito Breeding at Home", duration: "14 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        },
        {
          id: 9,
          title: "Up You Go!",
          lessonsCount: 4,
          status: "locked",
          lessons: [
            { id: 1, title: "Mountaineering Camp & Rucksacks", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Crossing the River & Rappelling", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Teamwork in High Altitude", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Bachendri Pal on Mount Everest", duration: "14 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 10,
          title: "Walls Tell Stories",
          lessonsCount: 3,
          status: "locked",
          lessons: [
            { id: 1, title: "Golconda Fort & Ancient Bastions", duration: "10 min", status: "unlocked", dots: 3, activeDot: 1 },
            { id: 2, title: "Cannons, Wells, and Secret Tunnels", duration: "12 min", status: "locked", dots: 3, activeDot: 0 },
            { id: 3, title: "Museums & Caring for Heritage", duration: "14 min", status: "locked", dots: 3, activeDot: 0 }
          ]
        },
        {
          id: 11,
          title: "Sunita in Space",
          lessonsCount: 4,
          status: "locked",
          lessons: [
            { id: 1, title: "Living in Zero Gravity", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Looking Down on Earth from Space", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Sunita Williams' Space Odyssey", duration: "14 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Moon, Stars, and Satellites", duration: "12 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        },
        {
          id: 12,
          title: "What if it Finishes?",
          lessonsCount: 4,
          status: "locked",
          lessons: [
            { id: 1, title: "Highway Traffic & Fuel Stations", duration: "10 min", status: "unlocked", dots: 4, activeDot: 1 },
            { id: 2, title: "Crude Oil Extraction & Refining", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 3, title: "Smoke, Pollution, and Cooking Fuel", duration: "12 min", status: "locked", dots: 4, activeDot: 0 },
            { id: 4, title: "Renewable Energy: Solar & Wind", duration: "14 min", status: "locked", dots: 4, activeDot: 0 }
          ]
        }
      ]
    }
  };

  const ICONS = {
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>'
  };

  const state = {
    view: "subjects", // "subjects" | "chapters" | "lessons"
    selectedSubjectId: null,
    selectedChapterId: null
  };

  function getContainer() {
    return document.getElementById("booksContainer");
  }

  function getTitle() {
    if (state.view === "chapters" && state.selectedSubjectId) {
      return BOOKS_DATA[state.selectedSubjectId]?.title || "Books";
    }
    if (state.view === "lessons" && state.selectedSubjectId && state.selectedChapterId) {
      const subject = BOOKS_DATA[state.selectedSubjectId];
      const chapter = subject?.chapters.find(c => c.id === state.selectedChapterId);
      return chapter ? chapter.title : (subject?.title || "Books");
    }
    return "Books";
  }

  function syncDocTitle() {
    const heading = document.getElementById("docTitleHeading");
    if (heading && document.body.classList.contains("mode-books-active")) {
      heading.textContent = getTitle();
    }
  }

  function render() {
    const container = getContainer();
    if (!container) return;

    syncDocTitle();

    if (state.view === "subjects") {
      renderSubjectsView(container);
    } else if (state.view === "chapters") {
      renderChaptersView(container);
    } else if (state.view === "lessons") {
      renderLessonsView(container);
    }
  }

  /* ═══ 1. SUBJECTS OVERVIEW ═══ */
  function renderSubjectsView(container) {
    const math = BOOKS_DATA.mathematics;
    const science = BOOKS_DATA.science;

    container.innerHTML = `
      <div class="books-view-header">
        <div class="books-view-kicker">Grade 5 Textbooks</div>
        <h1 class="books-view-title">Books</h1>
        <p class="books-view-subtitle">Select a textbook to explore NCERT curriculum chapters, stories, and guided lessons.</p>
      </div>

      <div class="books-subjects-grid">
        <!-- Mathematics Card -->
        <article class="books-subject-card" data-subject="mathematics" tabindex="0" role="button" aria-label="Open Mathematics textbook">
          <div class="books-card-header">
            <div class="books-subject-icon-box math">
              ${math.iconSvg}
            </div>
            <span class="books-badge-pill math">${math.grade}</span>
          </div>
          <div class="books-subject-body">
            <h2 class="books-subject-title">${math.title}</h2>
            <div class="books-subject-meta">${math.totalChapters} chapters · ${math.totalLessons} lessons</div>
            <p class="books-subject-desc">${math.description}</p>
          </div>
          <div class="books-card-footer">
            <span class="books-card-action-text">
              Browse Chapters
              ${ICONS.arrowRight}
            </span>
          </div>
        </article>

        <!-- Science Card -->
        <article class="books-subject-card" data-subject="science" tabindex="0" role="button" aria-label="Open Science textbook">
          <div class="books-card-header">
            <div class="books-subject-icon-box science">
              ${science.iconSvg}
            </div>
            <span class="books-badge-pill science">${science.grade}</span>
          </div>
          <div class="books-subject-body">
            <h2 class="books-subject-title">${science.title}</h2>
            <div class="books-subject-meta">${science.totalChapters} chapters · ${science.totalLessons} lessons</div>
            <p class="books-subject-desc">${science.description}</p>
          </div>
          <div class="books-card-footer">
            <span class="books-card-action-text">
              Browse Chapters
              ${ICONS.arrowRight}
            </span>
          </div>
        </article>
      </div>
    `;

    container.querySelectorAll(".books-subject-card").forEach(card => {
      const subjectId = card.getAttribute("data-subject");
      const activate = () => {
        state.selectedSubjectId = subjectId;
        state.selectedChapterId = null;
        state.view = "chapters";
        render();
        scrollToTop();
      };
      card.addEventListener("click", activate);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });
  }

  /* ═══ 2. CHAPTERS LIST VIEW ═══ */
  function renderChaptersView(container) {
    const subject = BOOKS_DATA[state.selectedSubjectId] || BOOKS_DATA.mathematics;
    const isMath = subject.id === "mathematics";

    let chaptersHtml = "";
    subject.chapters.forEach(chapter => {
      let badgeClass = "locked-badge";
      let badgeContent = ICONS.lock;
      const isLocked = chapter.status === "locked";

      if (chapter.id === 1) {
        badgeClass = isMath ? "active-math" : "active-science";
        badgeContent = String(chapter.id);
      } else if (chapter.id === 2 || chapter.id === 3) {
        badgeClass = isMath ? "tint-math" : "tint-science";
        badgeContent = String(chapter.id);
      } else {
        badgeClass = "locked-badge";
        badgeContent = ICONS.lock;
      }

      chaptersHtml += `
        <div class="books-chapter-card ${isLocked ? "locked" : "unlocked"}" data-chapter-id="${chapter.id}" data-theme="${isMath ? "math" : "science"}" tabindex="0" role="button" aria-label="Open Chapter ${chapter.id}: ${chapter.title}">
          <div class="books-chapter-card-left">
            <div class="books-chapter-index-badge ${badgeClass}">
              ${badgeContent}
            </div>
            <div class="books-chapter-card-info">
              <h3 class="books-chapter-card-title">${chapter.title}</h3>
              <p class="books-chapter-card-lessons">${chapter.lessonsCount} lessons</p>
            </div>
          </div>
          <div class="books-chapter-card-right">
            ${isLocked ? ICONS.lock : ICONS.chevronRight}
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="books-breadcrumb-row">
        <button class="books-breadcrumb-btn" id="booksBackToSubjects" type="button" aria-label="Back to Books">
          ${ICONS.chevronLeft}
          <span>Books</span>
        </button>
      </div>

      <div class="books-chapter-view-header">
        <div class="books-subject-icon-box ${isMath ? "math" : "science"}">
          ${subject.iconSvg}
        </div>
        <div class="books-chapter-header-text">
          <h2>${subject.title}</h2>
          <div class="books-chapter-header-meta">
            <span class="books-badge-pill ${isMath ? "math" : "science"}">${subject.grade}</span>
            <span>${subject.totalChapters} chapters</span>
          </div>
        </div>
      </div>

      <div class="books-chapters-grid">
        ${chaptersHtml}
      </div>
    `;

    document.getElementById("booksBackToSubjects")?.addEventListener("click", () => {
      state.view = "subjects";
      state.selectedSubjectId = null;
      state.selectedChapterId = null;
      render();
      scrollToTop();
    });

    container.querySelectorAll(".books-chapter-card").forEach(card => {
      const chapterId = parseInt(card.getAttribute("data-chapter-id"), 10);
      const activate = () => {
        state.selectedChapterId = chapterId;
        state.view = "lessons";
        render();
        scrollToTop();
      };
      card.addEventListener("click", activate);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });
  }

  /* ═══ 3. LESSONS VIEW ═══ */
  function renderLessonsView(container) {
    const subject = BOOKS_DATA[state.selectedSubjectId] || BOOKS_DATA.mathematics;
    const isMath = subject.id === "mathematics";
    const chapter = subject.chapters.find(c => c.id === state.selectedChapterId) || subject.chapters[0];

    let lessonsHtml = "";
    chapter.lessons.forEach(lesson => {
      const isFirst = lesson.id === 1;
      const isLocked = lesson.status === "locked";

      let badgeClass = "soft-badge";
      let badgeContent = String(lesson.id);

      if (isFirst) {
        badgeClass = isMath ? "active-math" : "active-science";
        badgeContent = String(lesson.id);
      } else if (isLocked) {
        badgeClass = "locked-badge";
        badgeContent = ICONS.lock;
      }

      // Progress dots
      const totalDots = lesson.dots || 4;
      const activeDot = lesson.activeDot || (isFirst ? 1 : 0);
      let dotsHtml = "";
      for (let i = 1; i <= totalDots; i++) {
        const isFilled = i <= activeDot;
        const fillClass = isFilled ? (isMath ? "filled-math" : "filled-science") : "";
        dotsHtml += `<span class="books-dot ${fillClass}"></span>`;
      }

      const buttonClass = isFirst
        ? (isMath ? "math" : "science")
        : "secondary";

      lessonsHtml += `
        <article class="books-lesson-card ${isLocked ? "locked" : "unlocked"}" data-lesson-id="${lesson.id}">
          <div class="books-lesson-card-left">
            <div class="books-lesson-index-badge ${badgeClass}">
              ${badgeContent}
            </div>
            <div class="books-lesson-info">
              <h3 class="books-lesson-title">${lesson.title}</h3>
              <div class="books-lesson-meta">
                <span>${lesson.duration}</span>
                <span class="books-meta-dot">·</span>
                <span class="books-progress-dots" aria-label="Progress: ${activeDot} of ${totalDots} steps">
                  ${dotsHtml}
                </span>
              </div>
            </div>
          </div>
          <div class="books-lesson-card-right">
            <button class="books-start-btn ${buttonClass}" type="button" data-lesson-id="${lesson.id}" aria-label="Start lesson: ${lesson.title}">
              ${ICONS.play}
              <span>Start</span>
            </button>
          </div>
        </article>
      `;
    });

    container.innerHTML = `
      <div class="books-breadcrumb-row">
        <button class="books-breadcrumb-btn" id="booksBackToChapters" type="button" aria-label="Back to ${subject.title}">
          ${ICONS.chevronLeft}
          <span>${subject.title}</span>
        </button>
      </div>

      <div class="books-lesson-view-header">
        <div class="books-lesson-header-top">
          <div class="books-chapter-number-pill ${isMath ? "math" : "science"}">${chapter.id}</div>
          <h2>${chapter.title}</h2>
        </div>
        <div class="books-lesson-header-meta">
          ${chapter.lessonsCount} lessons · ${subject.grade} ${subject.title}
        </div>
      </div>

      <div class="books-lessons-list">
        ${lessonsHtml}
      </div>
    `;

    document.getElementById("booksBackToChapters")?.addEventListener("click", () => {
      state.view = "chapters";
      state.selectedChapterId = null;
      render();
      scrollToTop();
    });

    container.querySelectorAll(".books-start-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const lessonId = parseInt(btn.getAttribute("data-lesson-id"), 10);
        const lesson = chapter.lessons.find(l => l.id === lessonId) || chapter.lessons[0];
        startLesson(subject, chapter, lesson);
      });
    });
  }

  function scrollToTop() {
    const scrollArea = document.getElementById("booksScrollArea");
    if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ═══ 4. START LESSON ACTION ═══ */
  function startLesson(subject, chapter, lesson) {
    const lessonTitle = `${chapter.title} - ${lesson.title}`;
    const fullTopic = `Grade 5 ${subject.title}: ${chapter.title} - ${lesson.title}`;

    // 1. Update Board / Session title if function exists
    if (typeof window.applyBoardTitle === "function") {
      window.applyBoardTitle(lessonTitle, { force: true, placeholder: false });
    }

    // 2. Switch app mode to Talk/Chat mode so the student and AI tutor can interact
    if (typeof window.setAppViewMode === "function") {
      window.setAppViewMode("talk");
    }

    // 3. Clear wait state and trigger message to Lumi
    if (typeof window.hideTalkWait === "function") window.hideTalkWait();

    // 4. Send starter prompt to Lumi AI Tutor
    const starterPrompt = `Hi Lumi! I'm starting the lesson "${lesson.title}" from Chapter ${chapter.id}: "${chapter.title}" in Grade 5 ${subject.title}. Can you introduce what we will learn today with a fun question or story?`;

    setTimeout(() => {
      if (window.primerChat && typeof window.primerChat.sendMessage === "function") {
        window.primerChat.sendMessage(starterPrompt);
      }
    }, 150);
  }

  function onActivate() {
    render();
  }

  window.primerBooks = {
    state,
    getTitle,
    onActivate,
    render,
    openSubjects() {
      state.view = "subjects";
      state.selectedSubjectId = null;
      state.selectedChapterId = null;
      render();
    },
    openSubject(subjectId) {
      if (BOOKS_DATA[subjectId]) {
        state.selectedSubjectId = subjectId;
        state.selectedChapterId = null;
        state.view = "chapters";
        render();
      }
    }
  };

  // Pre-render once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      render();
    });
  } else {
    render();
  }
})();
