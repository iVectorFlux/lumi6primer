"use strict";

/**
 * Lumi6 semantic emoji enrichment
 *
 * Optional full Unicode/CLDR emoji dataset:
 *   npm i emojibase-data
 *
 * The package gives you a much larger vocabulary of emoji labels/tags.
 * The curated rules below are intentionally learning-oriented and take
 * priority over generic emoji matches.
 */

const HAS_EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}]/u;

const MAX_EMOJIS = 3;

/* -------------------------------------------------------------------------- */
/* CURATED LEARNING VOCABULARY                                                */
/* -------------------------------------------------------------------------- */

/**
 * High-confidence educational concepts.
 *
 * Format:
 *   [regular expression, emoji]
 *
 * Curated rules are intentionally ordered. Earlier rules have priority.
 */
const CURATED_RULES = [
  // -------------------------------------------------------------------------
  // PHYSICS
  // -------------------------------------------------------------------------

  [/\belectromagnets?\b/i, "🧲"],
  [/\bmagnets?\b/i, "🧲"],
  [/\bmagnetism\b/i, "🧲"],
  [/\belectric(?:ity|al)?\b/i, "⚡"],
  [/\belectrons?\b/i, "⚡"],
  [/\bprotons?\b/i, "➕"],
  [/\bneutrons?\b/i, "⚪"],
  [/\bwires?\b/i, "🔌"],
  [/\bcircuits?\b/i, "🔌"],
  [/\bvoltage\b/i, "🔋"],
  [/\bcurrent\b/i, "〰️"],
  [/\bcoils?\b/i, "🌀"],
  [/\bresistors?\b/i, "🧱"],
  [/\bcapacitors?\b/i, "🔋"],
  [/\bbatter(?:y|ies)\b/i, "🔋"],
  [/\blight ?bulbs?\b/i, "💡"],
  [/\blasers?\b/i, "🔴"],
  [/\bradiation\b/i, "☢️"],
  [/\bmicroscopes?\b/i, "🔬"],
  [/\btelescopes?\b/i, "🔭"],
  [/\baccelerat(?:e|ion|ing)\b/i, "📈"],
  [/\bvelocity\b/i, "🏎️"],
  [/\bspeed\b/i, "💨"],
  [/\bmotion\b/i, "🏃"],
  [/\bforce\b/i, "💥"],
  [/\bfriction\b/i, "🧱"],
  [/\bcollision(?:s)?\b/i, "💥"],
  [/\bvibration(?:s)?\b/i, "📳"],
  [/\bsound\b/i, "🔊"],
  [/\baudio\b/i, "🎧"],
  [/\bfrequency\b/i, "〰️"],
  [/\bwaves?\b/i, "〰️"],
  [/\bpressure\b/i, "🫧"],
  [/\bgravity\b/i, "⬇️"],
  [/\bmass\b/i, "⚖️"],
  [/\bweight\b/i, "🏋️"],
  [/\benergy\b/i, "⚡"],
  [/\bheat\b/i, "🔥"],
  [/\btemperature\b/i, "🌡️"],
  [/\bthermometer(?:s)?\b/i, "🌡️"],
  [/\bwork\b/i, "🔧"],
  [/\bpower\b/i, "⚡"],
  [/\blight\b/i, "💡"],
  [/\breflection\b/i, "🪞"],
  [/\brefraction\b/i, "🔍"],
  [/\boptics?\b/i, "👁️"],
  [/\bgravity field\b/i, "🌌"],
  [/\bmagnetic field\b/i, "🧲"],

  // -------------------------------------------------------------------------
  // CHEMISTRY
  // -------------------------------------------------------------------------

  [/\batoms?\b/i, "⚛️"],
  [/\bmolecules?\b/i, "🧬"],
  [/\belements?\b/i, "🧪"],
  [/\bperiodic table\b/i, "🧪"],
  [/\bchemicals?\b/i, "⚗️"],
  [/\bchemistry\b/i, "🧪"],
  [/\bexperiment(?:s)?\b/i, "🧪"],
  [/\blaborator(?:y|ies)\b/i, "🧪"],
  [/\breaction(?:s)?\b/i, "🧪"],
  [/\bcatalyst(?:s)?\b/i, "⚗️"],
  [/\bacids?\b/i, "🧪"],
  [/\bbases?\b/i, "🧪"],
  [/\bsolutions?\b/i, "🧴"],
  [/\bmixtures?\b/i, "🥣"],
  [/\bcrystals?\b/i, "💎"],
  [/\bmetals?\b/i, "🔩"],
  [/\bmelting\b/i, "🫠"],
  [/\bfreezing\b/i, "🥶"],
  [/\bevaporation\b/i, "💨"],
  [/\bcondensation\b/i, "💧"],
  [/\bprecipitation\b/i, "🌧️"],
  [/\bsolids?\b/i, "🧊"],
  [/\bliquids?\b/i, "💧"],
  [/\bgases?\b/i, "💨"],

  // -------------------------------------------------------------------------
  // BIOLOGY
  // -------------------------------------------------------------------------

  [/\bdna\b/i, "🧬"],
  [/\bgenes?\b/i, "🧬"],
  [/\bgenetics?\b/i, "🧬"],
  [/\bcells?\b/i, "🧫"],
  [/\bcell membrane\b/i, "🧫"],
  [/\bnucleus\b/i, "🔵"],
  [/\bmitochondria\b/i, "⚡"],
  [/\bbacteria\b/i, "🦠"],
  [/\bviruses?\b/i, "🦠"],
  [/\bneurons?\b/i, "🧠"],
  [/\bbrains?\b/i, "🧠"],
  [/\bheart(?:s)?\b/i, "❤️"],
  [/\bheartbeat\b/i, "💓"],
  [/\bheart rate\b/i, "💓"],
  [/\blungs?\b/i, "🫁"],
  [/\bbones?\b/i, "🦴"],
  [/\bblood\b/i, "🩸"],
  [/\bblood vessels?\b/i, "🩸"],
  [/\bstomach\b/i, "🫃"],
  [/\bintestines?\b/i, "🫃"],
  [/\bmuscles?\b/i, "💪"],
  [/\beyes?\b/i, "👁️"],
  [/\bears?\b/i, "👂"],
  [/\bskin\b/i, "🖐️"],
  [/\bbreath(?:e|ing)?\b/i, "🌬️"],
  [/\brespiration\b/i, "🫁"],
  [/\bdigestion\b/i, "🍽️"],
  [/\bcirculation\b/i, "🩸"],
  [/\bimmune system\b/i, "🛡️"],
  [/\bimmune response\b/i, "🛡️"],
  [/\bhormones?\b/i, "🧪"],
  [/\bevolution\b/i, "🧬"],
  [/\bnatural selection\b/i, "🦋"],
  [/\becosystem(?:s)?\b/i, "🌎"],
  [/\bfood chain\b/i, "🐾"],

  // -------------------------------------------------------------------------
  // ASTRONOMY
  // -------------------------------------------------------------------------

  [/\borbit(?:s|al)?\b/i, "🛰️"],
  [/\bmoons?\b/i, "🌙"],
  [/\bplanets?\b/i, "🪐"],
  [/\bstars?\b/i, "⭐"],
  [/\bsun(?:light|s)?\b/i, "☀️"],
  [/\bsolar system\b/i, "🪐"],
  [/\bsolar\b/i, "☀️"],
  [/\bgalax(?:y|ies)\b/i, "🌌"],
  [/\bgalaxy\b/i, "🌌"],
  [/\buniverse\b/i, "🌌"],
  [/\bspace\b/i, "🚀"],
  [/\brockets?\b/i, "🚀"],
  [/\bmeteor(?:s|ite)?\b/i, "☄️"],
  [/\bcomets?\b/i, "☄️"],
  [/\bblack holes?\b/i, "🕳️"],
  [/\bastronauts?\b/i, "👨‍🚀"],
  [/\bspace station\b/i, "🛰️"],
  [/\basteroids?\b/i, "☄️"],
  [/\bmilky way\b/i, "🌌"],
  [/\bconstellations?\b/i, "✨"],
  [/\beclipse\b/i, "🌑"],

  // -------------------------------------------------------------------------
  // EARTH SCIENCE
  // -------------------------------------------------------------------------

  [/\bclouds?\b/i, "☁️"],
  [/\brain(?:fall|y)?\b/i, "🌧️"],
  [/\bstorms?\b/i, "⛈️"],
  [/\bhurricanes?\b/i, "🌀"],
  [/\btornado(?:es)?\b/i, "🌪️"],
  [/\bearthquakes?\b/i, "🌍"],
  [/\bearthquake\b/i, "🌍"],
  [/\bvolcano(?:es)?\b/i, "🌋"],
  [/\boceans?\b/i, "🌊"],
  [/\bsea\b/i, "🌊"],
  [/\brivers?\b/i, "🏞️"],
  [/\blakes?\b/i, "🏞️"],
  [/\bmountains?\b/i, "⛰️"],
  [/\bforests?\b/i, "🌲"],
  [/\btrees?\b/i, "🌳"],
  [/\bplants?\b/i, "🌱"],
  [/\bphotosynthesis\b/i, "🌿"],
  [/\bflowers?\b/i, "🌸"],
  [/\bseeds?\b/i, "🌰"],
  [/\benvironment\b/i, "🌎"],
  [/\bclimate\b/i, "🌦️"],
  [/\bweather\b/i, "🌤️"],
  [/\bglacier(?:s)?\b/i, "🧊"],
  [/\bdeserts?\b/i, "🏜️"],
  [/\bislands?\b/i, "🏝️"],
  [/\bsoil\b/i, "🪴"],
  [/\berosion\b/i, "🌊"],
  [/\brocks?\b/i, "🪨"],
  [/\bearth\b/i, "🌍"],

  // -------------------------------------------------------------------------
  // MATH
  // -------------------------------------------------------------------------

  [/\bmath(?:s|ematics)?\b/i, "➗"],
  [/\baddition\b/i, "➕"],
  [/\badd(?:s|ed|ing)?\b/i, "➕"],
  [/\bsubtraction\b/i, "➖"],
  [/\bsubtract(?:s|ed|ing)?\b/i, "➖"],
  [/\bmultiplication\b/i, "✖️"],
  [/\bmultiply(?:s|ing|ied)?\b/i, "✖️"],
  [/\bdivision\b/i, "➗"],
  [/\bdivide(?:s|d|ing)?\b/i, "➗"],
  [/\bequals?\b/i, "🟰"],
  [/\bequation(?:s)?\b/i, "🟰"],
  [/\bfraction(?:s)?\b/i, "🍕"],
  [/\bpercent(?:age)?\b/i, "%"],
  [/\bdecimal(?:s)?\b/i, "🔢"],
  [/\baverage\b/i, "📊"],
  [/\bmean\b/i, "📊"],
  [/\bmedian\b/i, "📊"],
  [/\bmode\b/i, "📊"],
  [/\bdata\b/i, "📊"],
  [/\bstatistics?\b/i, "📊"],
  [/\bprobabilit(?:y|ies)\b/i, "🎲"],
  [/\bgeometry\b/i, "📐"],
  [/\balgebra\b/i, "🔢"],
  [/\bangles?\b/i, "📐"],
  [/\bshapes?\b/i, "🔷"],
  [/\btriangle(?:s)?\b/i, "🔺"],
  [/\bsquares?\b/i, "⬜"],
  [/\bcircles?\b/i, "⭕"],
  [/\brectangles?\b/i, "▭"],
  [/\bgraphs?\b/i, "📈"],
  [/\bcoordinates?\b/i, "📍"],
  [/\bvariables?\b/i, "❓"],
  [/\bfunctions?\b/i, "ƒ"],
  [/\binfinity\b/i, "∞"],
  [/\bpi\b/i, "π"],
  [/\bprime numbers?\b/i, "🔢"],
  [/\bpatterns?\b/i, "🧩"],
  [/\bsequence(?:s)?\b/i, "🔢"],
  [/\bseries\b/i, "🔢"],
  [/\blogarithm(?:s)?\b/i, "📈"],
  [/\bexponents?\b/i, "⬆️"],
  [/\bsquare roots?\b/i, "√"],
  [/\broot\b/i, "√"],
  [/\bprobability\b/i, "🎲"],
  [/\bpermutation(?:s)?\b/i, "🔀"],
  [/\bcombination(?:s)?\b/i, "🧩"],
  [/\bproof(?:s)?\b/i, "✅"],
  [/\btheorem(?:s)?\b/i, "📜"],

  // -------------------------------------------------------------------------
  // SCIENTIFIC THINKING
  // -------------------------------------------------------------------------

  [/\bhypothes(?:is|es)\b/i, "🔎"],
  [/\bevidence\b/i, "🔍"],
  [/\bobservation(?:s)?\b/i, "👀"],
  [/\bexperiment(?:al|s)?\b/i, "🧪"],
  [/\bresearch\b/i, "🔬"],
  [/\bdiscovery\b/i, "🧭"],
  [/\binvestigation\b/i, "🔍"],
  [/\bquestion(?:s)?\b/i, "❓"],
  [/\banswer(?:s)?\b/i, "💡"],
  [/\bidea(?:s)?\b/i, "💡"],
  [/\btheory\b/i, "🧠"],
  [/\btheories\b/i, "🧠"],
  [/\bfact(?:s)?\b/i, "✅"],
  [/\bclaim(?:s)?\b/i, "💬"],
  [/\bargument(?:s)?\b/i, "💬"],
  [/\breason(?:ing)?\b/i, "🧠"],
  [/\blogic\b/i, "🧠"],
  [/\bcaus(?:e|al|ality)\b/i, "➡️"],
  [/\beffect(?:s)?\b/i, "💥"],
  [/\bimpact\b/i, "💥"],
  [/\bpattern(?:s)?\b/i, "🧩"],

  // -------------------------------------------------------------------------
  // LEARNING
  // -------------------------------------------------------------------------

  [/\blearning\b/i, "📚"],
  [/\blearn(?:s|ed|ing)?\b/i, "📚"],
  [/\breading\b/i, "📖"],
  [/\bread(?:s|ing)?\b/i, "📖"],
  [/\bwriting\b/i, "✍️"],
  [/\bwrite(?:s|ing)?\b/i, "✍️"],
  [/\bnotebook(?:s)?\b/i, "📓"],
  [/\bbook(?:s)?\b/i, "📚"],
  [/\bschool\b/i, "🏫"],
  [/\bclass(?:room)?\b/i, "🏫"],
  [/\bteacher(?:s)?\b/i, "👩‍🏫"],
  [/\bstudent(?:s)?\b/i, "🧑‍🎓"],
  [/\bexam(?:s)?\b/i, "📝"],
  [/\btest(?:s)?\b/i, "📝"],
  [/\bpractice\b/i, "🏋️"],
  [/\brevision\b/i, "🔄"],
  [/\bmemory\b/i, "🧠"],
  [/\bfocus\b/i, "🎯"],
  [/\bcuriosity\b/i, "🔎"],
  [/\bexplore\b/i, "🧭"],
  [/\bexploration\b/i, "🧭"],
  [/\bjourney\b/i, "🗺️"],
  [/\bgoal(?:s)?\b/i, "🎯"],
  [/\bprogress\b/i, "📈"],
  [/\bgrowth\b/i, "🌱"],
  [/\bfeedback\b/i, "💬"],
  [/\breflection\b/i, "🪞"],
  [/\bthinking\b/i, "🧠"],
  [/\bunderstand(?:s|ing)?\b/i, "💡"],
  [/\bremember(?:s|ing)?\b/i, "🧠"],
  [/\bmistake(?:s)?\b/i, "🔧"],
  [/\bskill(?:s)?\b/i, "🛠️"],
  [/\bchallenge(?:s)?\b/i, "🧗"],
  [/\bsolve(?:s|d|ing)?\b/i, "✅"],

  // -------------------------------------------------------------------------
  // CREATIVE THINKING
  // -------------------------------------------------------------------------

  [/\bcreativ(?:e|ity)\b/i, "🎨"],
  [/\bbrainstorm(?:ing)?\b/i, "💭"],
  [/\bimagination\b/i, "✨"],
  [/\bstory(?:telling)?\b/i, "📖"],
  [/\bdesign(?:s|ing)?\b/i, "🎨"],
  [/\bart\b/i, "🎨"],
  [/\bpaint(?:ing)?\b/i, "🖌️"],
  [/\bdrawing\b/i, "✏️"],
  [/\bsketch(?:es|ing)?\b/i, "✏️"],
  [/\bcreate(?:s|d|ing)?\b/i, "✨"],
  [/\binvent(?:s|ed|ing)?\b/i, "💡"],
  [/\binvention(?:s)?\b/i, "💡"],
  [/\bbuild(?:ing|s)?\b/i, "🧱"],

  // -------------------------------------------------------------------------
  // PROBLEM SOLVING / SYSTEMS
  // -------------------------------------------------------------------------

  [/\bproblem(?:s)?\b/i, "🧩"],
  [/\bsolution(?:s)?\b/i, "✅"],
  [/\bdecision(?:s)?\b/i, "🧭"],
  [/\bchoice(?:s)?\b/i, "🔀"],
  [/\broot cause\b/i, "🌱"],
  [/\bconnect(?:ion|ions)?\b/i, "🔗"],
  [/\bnetwork(?:s)?\b/i, "🕸️"],
  [/\bsystem(?:s)?\b/i, "⚙️"],
  [/\bfeedback loops?\b/i, "🔄"],
  [/\bdependencies?\b/i, "🔗"],
  [/\bsecond[- ]order effects?\b/i, "🔁"],
  [/\btrade[- ]offs?\b/i, "⚖️"],
  [/\bframework(?:s)?\b/i, "🧩"],
  [/\bprocess(?:es)?\b/i, "⚙️"],
  [/\bworkflow(?:s)?\b/i, "🔄"],
  [/\bsequence(?:s)?\b/i, "➡️"],

  // -------------------------------------------------------------------------
  // COMMUNICATION / SOCIAL
  // -------------------------------------------------------------------------

  [/\bcommunication\b/i, "💬"],
  [/\blisten(?:ing)?\b/i, "👂"],
  [/\bspeak(?:ing)?\b/i, "🗣️"],
  [/\btalk(?:ing)?\b/i, "💬"],
  [/\bteam(?:s|work)?\b/i, "👥"],
  [/\bcollaborat(?:e|ion|ing)\b/i, "🤝"],
  [/\bhelp\b/i, "🫶"],
  [/\bkind(?:ness)?\b/i, "💛"],
  [/\bempathy\b/i, "💗"],
  [/\bfriend(?:s|ship)?\b/i, "🫂"],
  [/\btrust\b/i, "🤝"],
  [/\bconversation(?:s)?\b/i, "💬"],
  [/\bexplain(?:s|ing)?\b/i, "🗣️"],
  [/\bstory\b/i, "📖"],
  [/\bpersuasion\b/i, "🗣️"],

  // -------------------------------------------------------------------------
  // EMOTIONS
  // -------------------------------------------------------------------------

  [/\bemotion(?:s)?\b/i, "😊"],
  [/\bhappy\b/i, "😊"],
  [/\bsad\b/i, "😔"],
  [/\bangry\b/i, "😠"],
  [/\bsurpris(?:e|ed)\b/i, "😮"],
  [/\bfear(?:ful)?\b/i, "😨"],
  [/\bexcited\b/i, "🤩"],
  [/\blove\b/i, "❤️"],
  [/\bjoy\b/i, "😊"],
  [/\bconfus(?:ed|ion)\b/i, "😵‍💫"],
  [/\bcurious\b/i, "🧐"],
  [/\bproud\b/i, "😌"],
  [/\bnervous\b/i, "😬"],
  [/\bcalm\b/i, "😌"],

  // -------------------------------------------------------------------------
  // MOTION / ACTION
  // -------------------------------------------------------------------------

  [/\bincrease\b/i, "⬆️"],
  [/\bdecrease\b/i, "⬇️"],
  [/\bgrow(?:s|ing)?\b/i, "📈"],
  [/\bexpand(?:s|ing)?\b/i, "↔️"],
  [/\bshrink(?:s|ing)?\b/i, "↕️"],
  [/\bmove(?:s|ment)?\b/i, "🏃"],
  [/\brun(?:s|ning)?\b/i, "🏃"],
  [/\bwalk(?:s|ing)?\b/i, "🚶"],
  [/\bjump(?:s|ing)?\b/i, "🦘"],
  [/\bpush(?:es|ed|ing)?\b/i, "👉"],
  [/\bpull(?:s|ed|ing)?\b/i, "👈"],
  [/\bturn(?:s|ing)?\b/i, "↩️"],
  [/\brotate(?:s|d|ing)?\b/i, "🔄"],
  [/\bshake(?:s|n|ing)?\b/i, "📳"],
  [/\bvibrate(?:s|d|ing)?\b/i, "📳"],
  [/\bbounce(?:s|d|ing)?\b/i, "🏀"],
  [/\bfall(?:s|ing)?\b/i, "⬇️"],
  [/\brise(?:s|ing)?\b/i, "⬆️"],
  [/\bdrop(?:s|ped|ping)?\b/i, "⬇️"],
  [/\bflow(?:s|ing)?\b/i, "🌊"],
  [/\bspin(?:s|ning)?\b/i, "🌀"],

  // -------------------------------------------------------------------------
  // TIME
  // -------------------------------------------------------------------------

  [/\btime\b/i, "⏰"],
  [/\bdays?\b/i, "📅"],
  [/\bweeks?\b/i, "📆"],
  [/\bmonths?\b/i, "📅"],
  [/\byears?\b/i, "📅"],
  [/\bfuture\b/i, "🔮"],
  [/\bpast\b/i, "⏮️"],
  [/\bpresent\b/i, "⏱️"],
  [/\bbefore\b/i, "⬅️"],
  [/\bafter\b/i, "➡️"],
  [/\bfirst\b/i, "1️⃣"],
  [/\bnext\b/i, "➡️"],
  [/\blast\b/i, "⏭️"],

  // -------------------------------------------------------------------------
  // EARTH / GEOGRAPHY
  // -------------------------------------------------------------------------

  [/\bmap(?:s|ping)?\b/i, "🗺️"],
  [/\bpath(?:s|way)?\b/i, "🛤️"],
  [/\bdirection(?:s)?\b/i, "🧭"],
  [/\btravel\b/i, "✈️"],
  [/\bcountry\b/i, "🌍"],
  [/\bcontinent(?:s)?\b/i, "🌎"],
  [/\bearth\b/i, "🌍"],
  [/\bworld\b/i, "🌎"],
  [/\benvironment\b/i, "🌱"],
  [/\bnature\b/i, "🌿"],

  // -------------------------------------------------------------------------
  // FOOD / EVERYDAY PHYSICAL OBJECTS
  // -------------------------------------------------------------------------

  [/\bfood\b/i, "🍎"],
  [/\bapple(?:s)?\b/i, "🍎"],
  [/\bbanana(?:s)?\b/i, "🍌"],
  [/\borange(?:s)?\b/i, "🍊"],
  [/\bfruit\b/i, "🍎"],
  [/\bvegetable(?:s)?\b/i, "🥕"],
  [/\bcarrot(?:s)?\b/i, "🥕"],
  [/\bplant-based\b/i, "🌱"],
  [/\bcooking\b/i, "🍳"],
  [/\bkitchen\b/i, "🍳"],
  [/\bfarm(?:ing)?\b/i, "🚜"],

  // -------------------------------------------------------------------------
  // ANIMALS
  // -------------------------------------------------------------------------

  [/\banimals?\b/i, "🐾"],
  [/\bdogs?\b/i, "🐶"],
  [/\bcats?\b/i, "🐱"],
  [/\bbirds?\b/i, "🐦"],
  [/\bfish\b/i, "🐟"],
  [/\bwhales?\b/i, "🐋"],
  [/\binsects?\b/i, "🐞"],
  [/\bbees?\b/i, "🐝"],
  [/\bbutterflies?\b/i, "🦋"],
  [/\bspiders?\b/i, "🕷️"],
  [/\bants?\b/i, "🐜"],
  [/\bsnakes?\b/i, "🐍"],
  [/\bfrogs?\b/i, "🐸"],
  [/\bturtles?\b/i, "🐢"],
  [/\btrees?\b/i, "🌳"],

  // -------------------------------------------------------------------------
  // TECHNOLOGY
  // -------------------------------------------------------------------------

  [/\bcomputers?\b/i, "💻"],
  [/\bcoding\b/i, "💻"],
  [/\bprogramming\b/i, "👨‍💻"],
  [/\bsoftware\b/i, "⚙️"],
  [/\bwebsite\b/i, "🌐"],
  [/\binternet\b/i, "🌐"],
  [/\bsearch\b/i, "🔍"],
  [/\bsecurity\b/i, "🔒"],
  [/\bprivacy\b/i, "🔐"],
  [/\bpassword(?:s)?\b/i, "🔑"],
  [/\bfiles?\b/i, "📁"],
  [/\bdownload\b/i, "⬇️"],
  [/\bupload\b/i, "⬆️"],
  [/\bemail\b/i, "✉️"],
  [/\bmessage(?:s)?\b/i, "💬"],
  [/\bphone(?:s)?\b/i, "📱"],
  [/\bcamera(?:s)?\b/i, "📷"],
  [/\bmusic\b/i, "🎵"],
  [/\bmovie(?:s)?\b/i, "🎬"],
  [/\brobot(?:s|ics)?\b/i, "🤖"],
  [/\bartificial intelligence\b/i, "🤖"],
  [/\bai\b/i, "🤖"],
  [/\bdatabase(?:s)?\b/i, "🗄️"],
  [/\bdata base\b/i, "🗃️"],
  [/\bserver(?:s)?\b/i, "🖥️"],
  [/\bcloud computing\b/i, "☁️"],
  [/\bcode\b/i, "💻"],
  [/\balgorithm(?:s)?\b/i, "⚙️"],

  // -------------------------------------------------------------------------
  // BUILDING / TOOLS
  // -------------------------------------------------------------------------

  [/\bbuild(?:ing|s)?\b/i, "🧱"],
  [/\bconstruct(?:ion)?\b/i, "🏗️"],
  [/\btool(?:s)?\b/i, "🛠️"],
  [/\bmachine(?:s)?\b/i, "⚙️"],
  [/\bengine(?:s)?\b/i, "⚙️"],
  [/\bmechanism(?:s)?\b/i, "⚙️"],
  [/\bgear(?:s)?\b/i, "⚙️"],

  // -------------------------------------------------------------------------
  // ORGANIZATION / META
  // -------------------------------------------------------------------------

  [/\bchart(?:s)?\b/i, "📊"],
  [/\btable(?:s)?\b/i, "📋"],
  [/\blist(?:s)?\b/i, "📝"],
  [/\bcheck(?:ed|list)?\b/i, "✅"],
  [/\berror(?:s)?\b/i, "❌"],
  [/\bwarning(?:s)?\b/i, "⚠️"],
  [/\binformation\b/i, "ℹ️"],
  [/\binfo\b/i, "ℹ️"],
  [/\bimportant\b/i, "📌"],
  [/\btip(?:s)?\b/i, "💡"],
  [/\bnote(?:s)?\b/i, "📝"],
  [/\bremember\b/i, "🧠"],

  // -------------------------------------------------------------------------
  // ETHICS / VALUES
  // -------------------------------------------------------------------------

  [/\brisk\b/i, "⚠️"],
  [/\bdanger\b/i, "⚠️"],
  [/\bsafe(?:ty)?\b/i, "🛡️"],
  [/\brule(?:s)?\b/i, "📏"],
  [/\bethics?\b/i, "⚖️"],
  [/\bfair(?:ness)?\b/i, "⚖️"],
  [/\bjustice\b/i, "⚖️"],
  [/\btrust\b/i, "🤝"],
  [/\bresponsibilit(?:y|ies)\b/i, "🛡️"],
];

/* -------------------------------------------------------------------------- */
/* OPTIONAL FULL EMOJI DATASET                                                */
/* -------------------------------------------------------------------------- */

/**
 * Words that are technically valid emoji labels/tags but are too generic
 * to safely inject into educational prose.
 */
const GENERIC_TAGS_TO_IGNORE = new Set([
  "face",
  "person",
  "people",
  "hand",
  "body",
  "thing",
  "object",
  "symbol",
  "good",
  "bad",
  "new",
  "old",
  "red",
  "blue",
  "green",
  "yellow",
  "white",
  "black",
  "small",
  "large",
  "up",
  "down",
  "left",
  "right",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "type",
  "emoji",
  "icon",
  "number",
  "sign",
  "square",
  "circle",
  "shape",
]);

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "than",
  "for",
  "from",
  "with",
  "without",
  "into",
  "onto",
  "over",
  "under",
  "between",
  "about",
  "around",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "this",
  "that",
  "these",
  "those",
  "what",
  "when",
  "where",
  "which",
  "who",
  "how",
  "why",
  "can",
  "could",
  "would",
  "should",
  "will",
  "may",
  "might",
  "must",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "as",
  "it",
  "its",
  "their",
  "there",
  "here",
  "you",
  "we",
  "they",
  "he",
  "she",
  "i",
  "me",
  "my",
  "our",
  "your",
  "very",
  "more",
  "most",
  "some",
  "many",
  "much",
  "also",
  "just",
  "only",
  "not",
  "no",
  "yes",
]);

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeTerm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeTerm(term) {
  const normalized = normalizeTerm(term);

  if (!normalized) return false;
  if (STOPWORDS.has(normalized)) return false;
  if (GENERIC_TAGS_TO_IGNORE.has(normalized)) return false;
  if (normalized.length < 4) return false;
  if (!/[a-z]/.test(normalized)) return false;

  return true;
}

/**
 * Load emojibase lazily.
 *
 * This means Lumi6 still works perfectly with only the curated rules if
 * emojibase-data is not installed.
 */
function loadEmojiDataset() {
  try {
    return require("emojibase-data/en/data.json");
  } catch (_error) {
    return [];
  }
}

/**
 * Turn the large emoji catalog into regex rules.
 */
function buildDataRules() {
  const data = loadEmojiDataset();

  if (!Array.isArray(data)) {
    return [];
  }

  const candidates = new Map();

  for (const item of data) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const emoji = item.emoji || item.unicode;

    if (!emoji || typeof emoji !== "string") {
      continue;
    }

    const label = item.label || item.annotation || "";

    const tags = Array.isArray(item.tags)
      ? item.tags
      : [];

    const shortcodes = Array.isArray(item.shortcodes)
      ? item.shortcodes
      : [];

    const terms = [
      label,
      ...tags,
      ...shortcodes,
    ];

    for (const rawTerm of terms) {
      const term = normalizeTerm(rawTerm);

      if (!safeTerm(term)) {
        continue;
      }

      if (!candidates.has(term)) {
        candidates.set(term, []);
      }

      const list = candidates.get(term);

      const score =
        term === normalizeTerm(label)
          ? 3
          : 1;

      list.push({
        emoji,
        score,
        order:
          typeof item.order === "number"
            ? item.order
            : Number.MAX_SAFE_INTEGER,
      });
    }
  }

  const rules = [];

  for (const [term, list] of candidates) {
    list.sort(
      (a, b) =>
        b.score - a.score ||
        a.order - b.order
    );

    const best = list[0];

    if (!best) {
      continue;
    }

    const words = term
      .split(" ")
      .map(escapeRegex)
      .join("\\s+");

    rules.push([
      new RegExp(`\\b${words}\\b`, "i"),
      best.emoji,
      1,
    ]);
  }

  /**
   * Phrase matches before single-word matches.
   *
   * Example:
   *   "heart rate" should be considered before "heart".
   */
  rules.sort(
    (a, b) =>
      b[0].source.length -
      a[0].source.length
  );

  return rules;
}

/* -------------------------------------------------------------------------- */
/* RULE REGISTRY                                                              */
/* -------------------------------------------------------------------------- */

const DATA_RULES = buildDataRules();

/**
 * Curated rules receive a much higher priority than generic Unicode matches.
 */
const RULES = [
  ...CURATED_RULES.map(
    ([pattern, emoji]) => [
      pattern,
      emoji,
      5,
    ]
  ),
  ...DATA_RULES,
];

/* -------------------------------------------------------------------------- */
/* MAIN ENRICHMENT                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Enrich educational prose with up to MAX_EMOJIS semantic emojis.
 *
 * Options:
 *   maxEmojis:
 *     default = 3
 *
 *   allowExistingEmoji:
 *     default = true
 *
 * Important:
 * We DO NOT return early merely because the original text contains an emoji.
 * Existing emojis should not prevent Lumi6 from adding useful semantic ones.
 */
function enrichWithEmojis(text, options = {}) {
  let out = String(text || "");

  if (!out.trim()) {
    return out;
  }

  const requestedMax =
    Number(options.maxEmojis);

  const maxEmojis =
    Number.isFinite(requestedMax)
      ? Math.max(
        0,
        Math.min(
          MAX_EMOJIS,
          requestedMax
        )
      )
      : MAX_EMOJIS;

  if (maxEmojis === 0) {
    return out;
  }

  let used = 0;

  /**
   * Track emoji characters already inserted by this function.
   */
  const seen = new Set();

  /**
   * Track existing emoji characters so we avoid duplicating them.
   *
   * Existing emojis do NOT block enrichment.
   */
  const existingEmojis =
    findEmojis(out);

  for (const emoji of existingEmojis) {
    seen.add(emoji);
  }

  for (const rule of RULES) {
    if (used >= maxEmojis) {
      break;
    }

    const pattern = rule[0];
    const emoji = rule[1];

    if (!pattern || !emoji) {
      continue;
    }

    /**
     * Don't repeatedly inject the same emoji into the same response.
     */
    if (seen.has(emoji)) {
      continue;
    }

    const flags = pattern.flags.includes("g")
      ? pattern.flags
      : `${pattern.flags}g`;

    const re = new RegExp(
      pattern.source,
      flags
    );

    let replaced = false;

    out = out.replace(
      re,
      (match) => {
        if (replaced || used >= maxEmojis) {
          return match;
        }

        replaced = true;
        used += 1;
        seen.add(emoji);

        return `${match} ${emoji}`;
      }
    );
  }

  return cleanWhitespace(
    stripMisplacedMagnets(out)
  );
}

/* -------------------------------------------------------------------------- */
/* EMOJI DETECTION                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Find existing emoji graphemes approximately.
 *
 * This intentionally keeps the implementation dependency-free.
 */
function findEmojis(text) {
  const matches =
    String(text || "").match(
      /(?:[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}])(?:\u{FE0F}|\u{200D}[\u{1F000}-\u{1FAFF}]*)?/gu
    );

  return matches || [];
}

/* -------------------------------------------------------------------------- */
/* MAGNET SAFETY                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Preserve 🧲 only when it is actually associated with "magnet".
 *
 * This protects against generic Unicode matching unexpectedly injecting
 * magnets into unrelated educational text.
 */
function stripMisplacedMagnets(text) {
  return String(text || "")
    .replace(
      /🧲/g,
      (emoji, offset, full) => {
        const nearby = full.slice(
          Math.max(0, offset - 50),
          offset + 15
        );

        return /magnet/i.test(
          nearby
        )
          ? emoji
          : "";
      }
    );
}

/* -------------------------------------------------------------------------- */
/* CLEANUP                                                                    */
/* -------------------------------------------------------------------------- */

function cleanWhitespace(text) {
  return String(text || "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

/**
 * Remove emoji/symbol decoration from generated text.
 */
function stripEmojis(text) {
  return String(text || "")
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* EXPORTS                                                                    */
/* -------------------------------------------------------------------------- */

module.exports = {
  enrichWithEmojis,
  stripEmojis,
  stripMisplacedMagnets,
  findEmojis,
  emojiRuleCount: RULES.length,
};