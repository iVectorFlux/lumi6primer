"use strict";

/**
 * Instant kid lessons: match the student's words, speak a real explanation,
 * and pick a native canvas picture. No model call.
 */
const LESSONS = [
  {
    concept: "clouds",
    match: /\bclouds?\b/,
    title: "How Clouds Form",
    spoken: "A cloud is a bunch of tiny water drops floating in the sky. The sun warms lakes and oceans. Water turns into invisible vapor and rises. High up it gets cold, the vapor becomes tiny drops, and those drops make a cloud.",
    more: "Those drops start tiny, like dust. They bump into each other and stick, so each drop gets bigger. When a drop gets too heavy for the air to hold, it falls. That falling water is rain.",
    ask: "Want me to explain how the drops get heavy enough to fall?",
    askMore: "Why do you think a dark cloud might rain more than a white one?",
    followUps: [
      { match: /heavy|heavier|bigger|grow|fall/, spoken: "Inside the cloud, tiny drops bump and stick together. Each bump makes a bigger drop. Gravity pulls on every drop. When a drop is too heavy to float, it falls — that's rain. Why do you think a dark cloud might rain more than a white one?" },
      { match: /dark|grey|gray|black/, spoken: "A white cloud has tiny drops that still let light through. A dark cloud is packed with bigger drops, so less light gets through. Those bigger drops are ready to fall. Rain comes next — want to see where that water goes?" }
    ],
    next: "rain",
    picture: "clouds"
  },
  {
    concept: "rain",
    match: /\brains?\b|why it rains|how (does )?rain/,
    title: "Why It Rains",
    spoken: "Rain starts in a cloud. Tiny water drops bump into each other and grow. When they get too heavy to float, they fall. That falling water is rain.",
    more: "Think of the cloud like a sponge. It soaks up tiny drops until it cannot hold any more. Then the extra water drips out as rain, and later the sun can lift that water back up again.",
    ask: "If a cloud is like a sponge, what do you think happens when it gets too full?",
    followUps: [
      { match: /heavy|heavier|bigger|grow|full|sponge/, spoken: "Each tiny drop is light. When drops join, they get heavier, like snowballs getting bigger. Gravity pulls harder on a heavy drop, so it falls. After it hits the ground, that water can go back up again." }
    ],
    next: "water_cycle",
    picture: "clouds"
  },
  {
    concept: "water_cycle",
    match: /water cycle|hydrologic|water forms? (clouds|rain|ice|vapor)|water on (the )?earth|how (does|is) water (cycle|recycl|move)|evaporation|rain cycle/,
    title: "The Water Cycle",
    spoken: "Water goes around and around. The sun lifts it up, it makes clouds, then it rains back down into rivers and oceans.",
    more: "That same water can be a lake today, a cloud tomorrow, and rain the next day. It never really leaves Earth — it just changes form.",
    ask: "Which step do you want to look at more — the sun lifting water, the cloud, or the rain?",
    followUps: [
      { match: /sun|lift|evapor/, spoken: "The sun warms lakes and oceans. Some water turns into invisible vapor and floats up. That step is evaporation. What do you think happens to that vapor high in the cold sky?" },
      { match: /cloud|condens/, spoken: "High up, the vapor gets cold and turns back into tiny drops. Those drops hang together as a cloud. That step is condensation. When the drops get heavy, what falls?" },
      { match: /rain|precip|fall/, spoken: "When cloud drops get too heavy, they fall as rain or snow. Rivers and oceans catch that water, and the sun can lift it again. The same water keeps going around." }
    ],
    next: "rainbow",
    boxes: [
      "1. Evaporation\nThe sun lifts water up",
      "2. Condensation\nIt turns into clouds",
      "3. Precipitation\nRain and snow fall down",
      "4. Collection\nRivers, lakes, and oceans"
    ]
  },
  {
    concept: "human_anatomy",
    match: /human anatom|\banatomy\b|human body|body parts|organs of the body/,
    title: "Your Body",
    spoken: "This is your body. Your brain thinks, your heart pumps, your lungs breathe, and your stomach helps you eat.",
    more: "These parts work as a team. Your lungs give oxygen to your blood, your heart sends that blood around, and your brain tells everything what to do.",
    ask: "Say heart, lungs, or brain, and I will zoom in.",
    beats: [
      "Your brain is the control room. It sends messages so you can think, see, and move. The heart feeds the brain with blood. Say heart if you want to zoom in.",
      "Your lungs pull in air. Oxygen jumps into your blood, and the heart sends that blood around. Say heart or lungs and I will show that part."
    ],
    followUps: [
      { match: /brain|think/, spoken: "Your brain sits in your head and runs the whole team. It tells your lungs to breathe and your heart to pump. The heart keeps the brain fed with blood. Want to see the heart next?" }
    ],
    next: "human_heart",
    picture: "anatomy"
  },
  {
    concept: "human_heart",
    match: /human heart|heart anatom|circulatory|\bheart\b/,
    title: "Your Heart",
    spoken: "Your heart is a strong pump. It sends blood to every part of your body.",
    more: "It has two jobs at once. One side sends blood to your lungs to pick up air. The other side sends that fresh blood out to your body.",
    ask: "Can you feel your heartbeat? What do you think happens to it when you run?",
    followUps: [
      { match: /run|fast|faster|exercise|beat/, spoken: "When you run, your muscles need more oxygen. Your heart beats faster to push more blood. That is why you can feel it thump in your chest. Your lungs work harder too — want to see how you breathe?" }
    ],
    next: "respiratory_system",
    picture: "heart"
  },
  {
    concept: "respiratory_system",
    match: /respiratory|lungs|breathing|how (do )?we breathe/,
    title: "How You Breathe",
    spoken: "You breathe air in through your nose, down the windpipe, and into your lungs.",
    more: "Your lungs are like two sponges. They take oxygen out of the air and send it into your blood. Then you breathe out the leftover air.",
    ask: "What do you think your body uses that oxygen for?",
    followUps: [
      { match: /oxygen|energy|blood|muscle|run/, spoken: "Your body uses oxygen like a fire uses air. It helps turn food into energy so your muscles and brain can work. That is why you breathe faster when you run." }
    ],
    next: "human_anatomy",
    boxes: [
      "1. Nose and mouth\nAir comes in",
      "2. Windpipe\nAir goes down",
      "3. Lungs\nAir fills two bags",
      "4. Oxygen\nYour blood carries it"
    ]
  },
  {
    concept: "photosynthesis",
    match: /photosynthesis|how (do )?plants (make|eat|grow food)/,
    title: "Photosynthesis",
    spoken: "Plants use sunlight, water, and air to make food and give us oxygen.",
    more: "The green in a leaf catches sunlight like a tiny solar panel. That energy turns water and air into sugar the plant can eat, and leftover oxygen goes into the air for us.",
    ask: "If a plant had no sunlight, what do you think would happen?",
    followUps: [
      { match: /die|dark|no sun|hungry|food/, spoken: "With no sunlight, the leaf cannot catch energy. The plant cannot make sugar, so it gets weak. That is why plants lean toward windows." }
    ],
    next: "sun",
    boxes: [
      "1. Sunlight\nThe plant catches light",
      "2. Water and air\nRoots drink, leaves breathe",
      "3. Food\nThe plant makes sugar",
      "4. Oxygen\nWe get air to breathe"
    ]
  },
  {
    concept: "sun",
    match: /\bsun\b|sunshine|how (the )?sun/,
    title: "The Sun",
    spoken: "The Sun is a giant ball of hot glowing gas. It is so far away, but it still warms the Earth and gives us light so plants can grow and we can see.",
    more: "Without the Sun, Earth would be dark and frozen. Plants could not make food, and we would have no daytime.",
    ask: "Why do you think it feels hotter at noon than in the morning?",
    followUps: [
      { match: /noon|morning|high|overhead|closer/, spoken: "At noon the Sun is high, so the light hits the ground more directly and feels stronger. In the morning the light comes in at a slant, so it is gentler." }
    ],
    next: "photosynthesis",
    boxes: [
      "1. Giant star\nA huge ball of hot gas",
      "2. Light\nIt makes daytime",
      "3. Heat\nIt warms the Earth",
      "4. Life\nPlants and people need it"
    ]
  },
  {
    concept: "gravity",
    match: /\bgravity\b|why (do )?things fall|why (do )?we (not )?float/,
    title: "Gravity",
    spoken: "Gravity is a pull. Earth pulls everything toward its center. That is why a ball falls down, and why you stay on the ground instead of floating away.",
    more: "Bigger things pull harder. Earth is huge, so its pull is strong. The Moon has gravity too, but it is weaker, which is why astronauts can hop so high there.",
    ask: "If you jumped on the Moon, do you think you would come down slower or faster than on Earth?",
    followUps: [
      { match: /slower|faster|moon|hop|float/, spoken: "You would come down slower on the Moon. The Moon is smaller, so its pull is weaker. You still come down — just in bigger, slower hops." }
    ],
    next: "moon",
    boxes: [
      "1. A pull\nEarth tugs on everything",
      "2. Falling\nA ball drops to the ground",
      "3. Staying down\nGravity holds you here",
      "4. Space\nWeaker far from Earth"
    ]
  },
  {
    concept: "rainbow",
    match: /\brainbows?\b/,
    title: "A Rainbow",
    spoken: "A rainbow happens when sunlight shines through raindrops. The drops split white light into colors: red, orange, yellow, green, blue, and violet.",
    more: "White sunlight is actually all those colors mixed together. A raindrop bends the light and spreads the colors into a bow.",
    ask: "Have you seen a rainbow after rain? Where was the sun when you saw it?",
    followUps: [
      { match: /behind|sun|rain|color|seen/, spoken: "The Sun is usually behind you, and the rain is in front. Sunlight goes into the drops, splits into colors, and bounces back to your eyes as a bow." }
    ],
    next: "rain",
    boxes: [
      "1. Sunlight\nWhite light from the sun",
      "2. Raindrops\nAct like tiny glass",
      "3. Split light\nColors come apart",
      "4. The bow\nRed on top, violet below"
    ]
  },
  {
    concept: "moon",
    match: /\bmoons?\b|why (the )?moon/,
    title: "The Moon",
    spoken: "The Moon is a big rocky ball that goes around the Earth. It does not make its own light. We see it because the Sun shines on it.",
    more: "The shape we see changes because we see different amounts of the sunlit side. That's why it looks like a crescent one night and a full circle later.",
    ask: "If the Moon does not make light, why do you think it still shines at night?",
    followUps: [
      { match: /sun|reflect|bounce|shine|light/, spoken: "The Moon is like a dirty mirror. It reflects sunlight. We only see the part that is lit, which is why the shape changes night to night." }
    ],
    next: "sun",
    boxes: [
      "1. Rocky ball\nIt goes around Earth",
      "2. No air\nNobody lives there",
      "3. Sunlight\nWe see the lit part",
      "4. Night sky\nIt looks close, but it is far"
    ]
  },
  {
    concept: "states_of_matter",
    match: /states of matter|phase change|ice melt|solid liquid gas/,
    title: "States of Matter",
    spoken: "Things can be solid, liquid, or gas. Heat can change ice into water, and water into steam.",
    more: "Heat makes the tiny pieces wiggle faster. In ice they hold still. In water they slide. In steam they fly apart.",
    ask: "What happens to an ice cube if you leave it in the sun?",
    followUps: [
      { match: /melt|water|puddle|sun|heat/, spoken: "The ice melts into water. If it stays hot, some water turns into steam you cannot see. Heat makes the tiny pieces move faster, so the shape changes." }
    ],
    next: "water_cycle",
    boxes: [
      "1. Solid\nIce keeps its shape",
      "2. Liquid\nWater can pour",
      "3. Gas\nSteam spreads out",
      "4. Heat\nHeat makes them change"
    ]
  },
  {
    concept: "volcanic_eruption",
    match: /volcano|volcanic/,
    title: "A Volcano",
    spoken: "A volcano is a mountain with hot rock inside. When it erupts, lava and ash come out.",
    more: "Deep underground, rock can melt into magma. Pressure pushes it up. When it finds a weak spot, it bursts out as lava.",
    ask: "Why do you think lava is so dangerous to touch?",
    followUps: [
      { match: /hot|burn|melt|rock|touch/, spoken: "Lava is rock so hot it has melted. It can burn anything it touches, then cool into new hard rock. That is how a volcano builds a mountain." }
    ],
    next: "gravity",
    boxes: [
      "1. Magma\nHot rock under the ground",
      "2. Pressure\nIt pushes up",
      "3. Eruption\nLava comes out",
      "4. Ash and rock\nThey fall around the mountain"
    ]
  },
  {
    concept: "first_principles",
    match: /first.?principle/,
    title: "First-Principles Thinking",
    spoken: "First-principles thinking means you stop copying old guesses. You keep only facts you know are true, then you build the answer up from those facts. If a bike is heavy, don't say bikes are just like that — ask what it is made of, and whether those parts have to be heavy.",
    more: "Break the problem into pieces. Throw away anything that is only a habit. Keep the pieces you can prove. Then rebuild a simpler answer from those pieces.",
    ask: "What is one fact you already know about a problem you want to solve?",
    followUps: [
      { match: /fact|guess|habit|build|piece|why/, spoken: "A guess is something people repeat. A fact is something you can check. First you list the facts, then you build. That is why this way of thinking feels slower at first, and then suddenly clearer." }
    ],
    boxes: [
      "Problem\nWhat are we solving?",
      "Strip guesses\nDrop old habits",
      "True facts\nKeep what is true",
      "Build up\nMake a new answer"
    ]
  },
  {
    concept: "multiplication",
    match: /multipl|\btimes tables?\b|\btimes\b.+\b(work|mean|equal)|\bproduct of\b/,
    title: "Multiplication",
    spoken: "Multiplication is adding the same number again and again. 3 times 4 means three groups of four. That is 4 plus 4 plus 4, which is 12. So 3 times 4 equals 12. Look at the dots: 3 rows, 4 in each row.",
    more: "You can picture it as a rectangle. The rows are the groups. The dots in a row are how many sit in each group. Count all the dots and you have the answer.",
    ask: "If you had 3 bags with 4 apples in each bag, how many apples is that?",
    followUps: [
      { match: /add|plus|group|row|dot|apple|repeated|why/, spoken: "Each row is one group of 4. There are 3 rows, so you add 4 three times. 4 plus 4 is 8, plus 4 more is 12. Multiplication is just a fast way to write that repeated addition." }
    ],
    picture: "multiplication"
  },
  {
    concept: "arithmetic",
    match: /\barithmet|\bbasic math\b/,
    title: "Arithmetic",
    spoken: "Arithmetic is working with numbers. Addition puts numbers together: 3 plus 2 is 5. Subtraction takes away: 5 minus 2 is 3. Multiplication is repeated addition: 3 times 4 is 12. Division is splitting into groups: 12 divided by 3 is 4.",
    more: "These four operations are the building blocks of all math. Once you are fast at these, everything else gets easier.",
    ask: "Which one would you like to practice: addition, subtraction, multiplication, or division?",
    followUps: [
      { match: /add|plus|sum/, spoken: "Addition means combining. If you have 3 apples and get 4 more, that is 3 plus 4 which equals 7. The order does not matter: 4 plus 3 is also 7." },
      { match: /subtract|minus|take away/, spoken: "Subtraction means taking away. If you have 8 cookies and eat 3, you have 8 minus 3 which is 5 left." },
      { match: /multipl|times/, spoken: "Multiplication is adding the same number over and over. 3 times 4 means three groups of four, which equals 12." },
      { match: /divid|split|share/, spoken: "Division means splitting equally. If you have 12 candies and share them among 3 friends, each gets 12 divided by 3 which is 4." }
    ],
    boxes: [
      "Addition\n3 + 2 = 5",
      "Subtraction\n5 − 2 = 3",
      "Multiplication\n3 × 4 = 12",
      "Division\n12 ÷ 3 = 4"
    ]
  }
];

function normalizeText(text) {
  return String(text || "").toLowerCase()
    .replace(/\bhuman autonomy\b/g, "human anatomy")
    .replace(/\bautonomy\b/g, "anatomy");
}

function matchLesson() {
  return null;
}

function getLesson() {
  return null;
}

function isComplaint(text) {
  const t = String(text || "").toLowerCase();
  return /what the hell|this is (nothing|empty|wrong|stupid)|no picture|not a picture|that's not a picture|wtf|empty boxes|can't draw|cannot draw|not drawing|nothing on the board|just talk|only talk|blabbing/.test(t);
}

function looksLikeNewQuestion(text) {
  const t = normalizeText(text);
  if (!t) return false;
  if (/what is this|what's this|whats this|\bon the board\b/.test(t)) return false;
  if (/[0-9]|[+\-×÷/=]|\btimes\b|\bplus\b|\bminus\b|\bdivided\b|multipl|decimal|percent|fraction|\bcube\b|\bsquare\b|\bcross\b|\bsketch\b|\bdrawing\b/.test(t)) return true;
  if (/\b(i want to learn|teach me|let's learn|lets learn|learn about)\b/.test(t) && t.split(/\s+/).length > 4) return true;
  if (/\b(what is|what's|whats|who is|how (do|does|can|to|is|are)|why (do|does|is|are)|explain|teach|solve|calculate|draw|show me)\b/.test(t)) {
    if (/tell me more|explain more|explain further|go (on|deeper)|continue|what about that|and then|what happens/.test(t)
      && !/[0-9]/.test(t)
      && !/\bcube\b|\bcross\b|\bsketch\b|\bdrawing\b|\bdecimal\b|\bmultipl\b/.test(t)) {
      return false;
    }
    return true;
  }
  return false;
}

function wantsAnyLesson(text) {
  const t = normalizeText(text).trim();
  return /^(ok[, ]*)?(teach me|i want to learn|let's learn|lets learn|show me something|explain something|start (a )?lesson|learn something)[\s.!?]*$/.test(t);
}

function starterLesson() {
  return null;
}

function wantsNewTopic(text) {
  return /new topic|something else|different topic|never mind|stop this|another topic/.test(normalizeText(text));
}

function isTeacherEcho(text) {
  const t = normalizeText(text);
  return /you('re| are) getting it|what should we explore|which part should we|or a new topic|want me to explain|what are you curious|listening for your next|what else are you wondering|what do you want to understand|should we zoom|say heart|ask me about clouds|whiteboard is blank|no new sketch|no handwriting visible/.test(t);
}

function isFollowUp(text) {
  const t = normalizeText(text).trim();
  if (!t || wantsNewTopic(t) || isTeacherEcho(t) || looksLikeNewQuestion(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (/^(yes|yeah|yep|sure|ok|okay|more|why|huh|what|wait|and then|go on|continue|complete)[\s.!?]*$/.test(t)) return true;
  if (words.length <= 6) return true;
  return /tell me more|can you tell me|\btell me\b|explain more|more detail|go (on|deeper)|continue|how come|what about|and then|what happens|what if|i don't|don't get|i dont|dont go|wait|huh|please complete|keep going|say more/.test(t);
}

function findFollowUp(lesson, text) {
  if (!lesson || !Array.isArray(lesson.followUps)) return null;
  const t = normalizeText(text);
  return lesson.followUps.find((item) => item.match.test(t)) || null;
}

function lessonBeats(lesson) {
  if (!lesson) return [];
  return [
    `${lesson.spoken} ${lesson.ask || ""}`.trim(),
    `${lesson.more || lesson.spoken} ${lesson.askMore || ""}`.trim(),
    ...(lesson.beats || []),
    ...((lesson.followUps || []).map((item) => item.spoken))
  ].filter(Boolean);
}

function spokenForLesson() {
  return null;
}

function pickLesson() {
  return null;
}

module.exports = {
  LESSONS,
  matchLesson,
  getLesson,
  isComplaint,
  looksLikeNewQuestion,
  isFollowUp,
  isTeacherEcho,
  wantsNewTopic,
  findFollowUp,
  spokenForLesson,
  pickLesson,
  wantsAnyLesson,
  starterLesson
};
