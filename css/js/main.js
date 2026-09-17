/* ==========================================================================
   KIBERSAVOD — umumiy JavaScript
   Vanilla JS. Hech qanday tashqi kutubxona ishlatilmaydi.
   localStorage mavjud bo'lmasa (yoki bloklangan bo'lsa), sayt xotiradagi
   oddiy obyektga yozib, ishlashda davom etadi.
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "kibersavod_progress_v1";
  var TOTAL_LESSONS = 12;

  /* ------------------------------------------------------------------
     1. Xotira qatlami (localStorage + zaxira xotira obyekti)
     ------------------------------------------------------------------ */
  var memoryFallback = {};
  var useMemoryOnly = false;

  function storageAvailable() {
    try {
      var testKey = "__kibersavod_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  useMemoryOnly = !storageAvailable();

  function rawGet(key) {
    if (useMemoryOnly) {
      return Object.prototype.hasOwnProperty.call(memoryFallback, key)
        ? memoryFallback[key]
        : null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      useMemoryOnly = true;
      return Object.prototype.hasOwnProperty.call(memoryFallback, key)
        ? memoryFallback[key]
        : null;
    }
  }

  function rawSet(key, value) {
    if (useMemoryOnly) {
      memoryFallback[key] = value;
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      useMemoryOnly = true;
      memoryFallback[key] = value;
    }
  }

  function defaultState() {
    return {
      theme: null,
      lessons: {}, // { "1": { completed: false, tasks: {}, quiz: null } }
      finalTest: null, // { score, level, byCategory, date }
    };
  }

  function loadState() {
    var raw = rawGet(STORAGE_KEY);
    if (!raw) return defaultState();
    try {
      var parsed = JSON.parse(raw);
      var state = defaultState();
      return Object.assign(state, parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      rawSet(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* jim: saqlash imkonsiz bo'lsa ham sayt ishlayveradi */
    }
  }

  var state = loadState();

  var Storage = {
    getState: function () {
      return state;
    },
    getLesson: function (id) {
      id = String(id);
      if (!state.lessons[id]) {
        state.lessons[id] = { completed: false, tasks: {}, quiz: null };
      }
      return state.lessons[id];
    },
    setTaskDone: function (lessonId, taskId, done) {
      var lesson = Storage.getLesson(lessonId);
      lesson.tasks[taskId] = !!done;
      saveState(state);
      Progress.render();
    },
    setLessonCompleted: function (lessonId, completed) {
      var lesson = Storage.getLesson(lessonId);
      lesson.completed = !!completed;
      saveState(state);
      Progress.render();
    },
    setQuizResult: function (lessonId, correctCount, totalCount) {
      var lesson = Storage.getLesson(lessonId);
      lesson.quiz = { correct: correctCount, total: totalCount, date: Date.now() };
      saveState(state);
      Progress.render();
    },
    setFinalTest: function (result) {
      state.finalTest = result;
      saveState(state);
    },
    getFinalTest: function () {
      return state.finalTest;
    },
    setTheme: function (theme) {
      state.theme = theme;
      saveState(state);
    },
    getTheme: function () {
      return state.theme;
    },
    isUsingMemoryOnly: function () {
      return useMemoryOnly;
    },
    resetAll: function () {
      state = defaultState();
      saveState(state);
      Progress.render();
    },
  };

  /* ------------------------------------------------------------------
     2. Progress hisoblash
     ------------------------------------------------------------------ */
  var Progress = {
    computeLessonsCompleted: function () {
      var count = 0;
      for (var i = 1; i <= TOTAL_LESSONS; i++) {
        var lesson = state.lessons[String(i)];
        if (lesson && lesson.completed) count++;
      }
      return count;
    },
    computeTasksDone: function () {
      var done = 0;
      var total = 0;
      Object.keys(state.lessons).forEach(function (id) {
        var lesson = state.lessons[id];
        Object.keys(lesson.tasks || {}).forEach(function (taskId) {
          total++;
          if (lesson.tasks[taskId]) done++;
        });
      });
      return { done: done, total: total };
    },
    computePercent: function () {
      var completed = Progress.computeLessonsCompleted();
      return Math.round((completed / TOTAL_LESSONS) * 100);
    },
    render: function () {
      var percent = Progress.computePercent();
      var fills = document.querySelectorAll("[data-global-progress-fill]");
      fills.forEach(function (el) {
        el.style.width = percent + "%";
      });
      var labels = document.querySelectorAll("[data-global-progress-label]");
      labels.forEach(function (el) {
        el.textContent =
          Progress.computeLessonsCompleted() + " / " + TOTAL_LESSONS + " dars (" + percent + "%)";
      });
      var bar = document.querySelector(".progress-track");
      if (bar) {
        bar.setAttribute("role", "progressbar");
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", "100");
        bar.setAttribute("aria-valuenow", String(percent));
        bar.setAttribute(
          "aria-label",
          "Umumiy o'quv progressi: " + percent + " foiz tugallangan"
        );
      }
      // Dars kartalarini yangilash (darslar.html sahifasida)
      document.querySelectorAll("[data-lesson-status]").forEach(function (el) {
        var id = el.getAttribute("data-lesson-status");
        var lesson = state.lessons[id];
        var completed = !!(lesson && lesson.completed);
        el.textContent = completed ? "Tugallandi" : "Boshlanmagan";
        el.classList.toggle("is-completed", completed);
      });
      document.querySelectorAll("[data-task-checkbox]").forEach(function (el) {
        var lessonId = el.getAttribute("data-lesson-id");
        var taskId = el.getAttribute("data-task-checkbox");
        var lesson = state.lessons[String(lessonId)];
        el.checked = !!(lesson && lesson.tasks && lesson.tasks[taskId]);
      });
    },
  };

  /* ------------------------------------------------------------------
     3. Mavzu (yorug'/qorong'i)
     ------------------------------------------------------------------ */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var toggle = document.getElementById("themeToggle");
    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"
      );
      toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
  }

  function initTheme() {
    var saved = Storage.getTheme();
    var theme = saved;
    if (!theme) {
      theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    applyTheme(theme);

    var toggle = document.getElementById("themeToggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        var next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        Storage.setTheme(next);
      });
    }
  }

  /* ------------------------------------------------------------------
     4. Mobil navigatsiya
     ------------------------------------------------------------------ */
  function initMobileNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------
     5. Joriy sahifani navigatsiyada belgilash
     ------------------------------------------------------------------ */
  function markCurrentNav() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".site-nav a").forEach(function (link) {
      var href = link.getAttribute("href").replace("./", "");
      if (href === path) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /* ------------------------------------------------------------------
     6. Vazifa checkbox'larini ulash (dars sahifalarida ishlatiladi)
     ------------------------------------------------------------------ */
  function initTaskCheckboxes() {
    document.querySelectorAll("[data-task-checkbox]").forEach(function (el) {
      var lessonId = el.getAttribute("data-lesson-id");
      var taskId = el.getAttribute("data-task-checkbox");
      var lesson = Storage.getLesson(lessonId);
      el.checked = !!lesson.tasks[taskId];
      el.addEventListener("change", function () {
        Storage.setTaskDone(lessonId, taskId, el.checked);
      });
    });
  }

  /* ------------------------------------------------------------------
     7. Ishga tushirish
     ------------------------------------------------------------------ */
  function init() {
    initTheme();
    initMobileNav();
    markCurrentNav();
    initTaskCheckboxes();
    Progress.render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Boshqa sahifa skriptlari (dars-N.html, test.html) foydalanishi uchun ochiq API
  window.KiberApp = {
    Storage: Storage,
    Progress: Progress,
    TOTAL_LESSONS: TOTAL_LESSONS,
  };
})();
