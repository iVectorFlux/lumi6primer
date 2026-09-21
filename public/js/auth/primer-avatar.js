(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PrimerAvatar = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const AVATARS = [
    { id: "avatar-01", name: "monkey", label: "Monkey", color: "#185787", file: "/avatars/avatar-01-monkey.svg", row: 0, col: 0 },
    { id: "avatar-02", name: "bear", label: "Bear", color: "#F0592B", file: "/avatars/avatar-02-bear.svg", row: 0, col: 1 },
    { id: "avatar-03", name: "raccoon", label: "Raccoon", color: "#D8D423", file: "/avatars/avatar-03-raccoon.svg", row: 0, col: 2 },
    { id: "avatar-04", name: "lion", label: "Lion", color: "#62A5A2", file: "/avatars/avatar-04-lion.svg", row: 0, col: 3 },
    { id: "avatar-05", name: "fox", label: "Fox", color: "#62A5A2", file: "/avatars/avatar-05-fox.svg", row: 1, col: 0 },
    { id: "avatar-06", name: "puppy", label: "Puppy", color: "#D8D423", file: "/avatars/avatar-06-puppy.svg", row: 1, col: 1 },
    { id: "avatar-07", name: "dog", label: "Dog", color: "#F0592B", file: "/avatars/avatar-07-dog.svg", row: 1, col: 2 },
    { id: "avatar-08", name: "pig", label: "Pig", color: "#185787", file: "/avatars/avatar-08-pig.svg", row: 1, col: 3 },
    { id: "avatar-09", name: "deer", label: "Deer", color: "#F0592B", file: "/avatars/avatar-09-deer.svg", row: 2, col: 0 },
    { id: "avatar-10", name: "cat", label: "Cat", color: "#185787", file: "/avatars/avatar-10-cat.svg", row: 2, col: 1 },
    { id: "avatar-11", name: "tiger", label: "Tiger", color: "#62A5A2", file: "/avatars/avatar-11-tiger.svg", row: 2, col: 2 },
    { id: "avatar-12", name: "panda", label: "Panda", color: "#D8D423", file: "/avatars/avatar-12-panda.svg", row: 2, col: 3 },
    { id: "avatar-13", name: "zebra", label: "Zebra", color: "#D8D423", file: "/avatars/avatar-13-zebra.svg", row: 3, col: 0 },
    { id: "avatar-14", name: "koala", label: "Koala", color: "#62A5A2", file: "/avatars/avatar-14-koala.svg", row: 3, col: 1 },
    { id: "avatar-15", name: "rabbit", label: "Rabbit", color: "#185787", file: "/avatars/avatar-15-rabbit.svg", row: 3, col: 2 },
    { id: "avatar-16", name: "hamster", label: "Hamster", color: "#F0592B", file: "/avatars/avatar-16-hamster.svg", row: 3, col: 3 }
  ];

  const STORAGE_KEY = "primerUserAvatar";

  function getAll() {
    return AVATARS.map(function (a) { return Object.assign({}, a); });
  }

  function getById(id) {
    if (!id) return null;
    const clean = String(id).toLowerCase().trim();
    for (let i = 0; i < AVATARS.length; i++) {
      if (AVATARS[i].id.toLowerCase() === clean || AVATARS[i].name.toLowerCase() === clean) {
        return Object.assign({}, AVATARS[i]);
      }
    }
    return null;
  }

  function getByFile(file) {
    if (!file) return null;
    const clean = String(file).trim();
    for (let i = 0; i < AVATARS.length; i++) {
      if (AVATARS[i].file === clean || clean.endsWith(AVATARS[i].file)) {
        return Object.assign({}, AVATARS[i]);
      }
    }
    return null;
  }

  function getRandom() {
    const idx = Math.floor(Math.random() * AVATARS.length);
    return Object.assign({}, AVATARS[idx]);
  }

  function getOrAssign() {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          if (stored.startsWith("{")) {
            const parsed = JSON.parse(stored);
            const match = getById(parsed.id) || getByFile(parsed.file) || getById(parsed.name);
            if (match) return match;
          } else {
            const match = getById(stored) || getByFile(stored);
            if (match) return match;
          }
        }
      }
    } catch (e) {
      // Storage access may throw in sandboxed environments
    }

    const randomAvatar = getRandom();
    set(randomAvatar);
    return randomAvatar;
  }

  function set(avatarOrId) {
    if (!avatarOrId) return null;
    let resolved = null;
    if (typeof avatarOrId === "string") {
      resolved = getById(avatarOrId) || getByFile(avatarOrId);
      if (!resolved) {
        resolved = { id: "custom", name: "custom", label: "Avatar", file: avatarOrId, color: "#6366f1" };
      }
    } else if (typeof avatarOrId === "object") {
      resolved = getById(avatarOrId.id) || getByFile(avatarOrId.file) || avatarOrId;
    }
    if (!resolved) return null;

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
      }
    } catch (e) {}

    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      try {
        window.dispatchEvent(new CustomEvent("primer-avatar-changed", { detail: resolved }));
      } catch (e) {}
    }

    return resolved;
  }

  function reroll() {
    const current = getOrAssign();
    let next = getRandom();
    if (AVATARS.length > 1 && current) {
      let attempts = 0;
      while (next.id === current.id && attempts < 10) {
        next = getRandom();
        attempts++;
      }
    }
    return set(next);
  }

  return {
    AVATARS: AVATARS,
    getAll: getAll,
    getById: getById,
    getByFile: getByFile,
    getRandom: getRandom,
    getOrAssign: getOrAssign,
    set: set,
    reroll: reroll
  };
});
