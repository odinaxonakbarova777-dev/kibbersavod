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
  var TOTAL_TASKS = 50;

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
      phishingTrainer: null, // { correct, total, date }
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
    setPhishingResult: function (correctCount, totalCount) {
      state.phishingTrainer = { correct: correctCount, total: totalCount, date: Date.now() };
      saveState(state);
    },
    getPhishingResult: function () {
      return state.phishingTrainer || null;
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
      Object.keys(state.lessons).forEach(function (id) {
        var lesson = state.lessons[id];
        Object.keys(lesson.tasks || {}).forEach(function (taskId) {
          if (lesson.tasks[taskId]) done++;
        });
      });
      return { done: done, total: TOTAL_TASKS };
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
      var taskInfo = Progress.computeTasksDone();
      var taskPercent = Math.round((taskInfo.done / taskInfo.total) * 100);
      var taskLabels = document.querySelectorAll("[data-global-tasks-label]");
      taskLabels.forEach(function (el) {
        el.textContent = taskInfo.done + " / " + taskInfo.total + " amaliy topshiriq (" + taskPercent + "%)";
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
     6b. Dars sahifasi: keng ekranda ikki ustunli tartib + mundarija
     (.lesson-body ni o'raydi va o'ng tomonga sarlavhalardan yasalgan
     "Ushbu darsda" panelini qo'shadi — faylni qo'lda o'zgartirmasdan)
     ------------------------------------------------------------------ */
  function slugify(text, index) {
    var base = text
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9\u0400-\u04FF]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return (base || "bolim") + "-" + index;
  }

  function initLessonTOC() {
    var body = document.querySelector(".lesson-body");
    var container = body ? body.parentElement : null;
    if (!body || !container) return;

    var headings = Array.prototype.slice.call(body.querySelectorAll("h2"));
    if (headings.length < 2) return; // juda qisqa darsda mundarija shart emas

    // Ustunli qobiqni yasaymiz: <article> ni <div class="lesson-layout"> ichiga olamiz
    var layout = document.createElement("div");
    layout.className = "lesson-layout";
    container.insertBefore(layout, body);
    layout.appendChild(body);

    var toc = document.createElement("aside");
    toc.className = "lesson-toc";
    toc.setAttribute("aria-label", "Ushbu darsning mundarijasi");

    var title = document.createElement("p");
    title.className = "lesson-toc__title";
    title.textContent = "Ushbu darsda";
    toc.appendChild(title);

    var list = document.createElement("nav");
    list.className = "lesson-toc__list";

    var links = [];
    headings.forEach(function (h, i) {
      if (!h.id) h.id = slugify(h.textContent || "", i + 1);
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      list.appendChild(a);
      links.push({ link: a, heading: h });
    });
    toc.appendChild(list);
    layout.appendChild(toc);

    // Skroll paytida joriy bo'limni ajratib ko'rsatish
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var match = links.find(function (item) {
              return item.heading === entry.target;
            });
            if (match && entry.isIntersecting) {
              links.forEach(function (item) {
                item.link.classList.remove("is-active");
              });
              match.link.classList.add("is-active");
            }
          });
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      headings.forEach(function (h) {
        observer.observe(h);
      });
    }
  }

  /* ------------------------------------------------------------------
     7. Dars testi (mustahkamlash) — 5 savolli qayta ishlatiluvchi modul
     ------------------------------------------------------------------ */
  var Quiz = {
    /**
     * container: quiz joylashgan DOM element
     * lessonId: dars raqami (masalan "1")
     * questions: [{ q: "...", options: ["...","...","..."], correct: 0, explain: "..." }]
     */
    init: function (container, lessonId, questions) {
      if (!container) return;
      container.innerHTML = "";
      var answers = new Array(questions.length).fill(null);

      questions.forEach(function (item, qIndex) {
        var wrap = document.createElement("fieldset");
        wrap.className = "quiz-question";
        wrap.setAttribute("data-q-index", String(qIndex));

        var legend = document.createElement("legend");
        legend.className = "quiz-question__text";
        legend.textContent = qIndex + 1 + ". " + item.q;
        wrap.appendChild(legend);

        var optionsWrap = document.createElement("div");
        optionsWrap.className = "quiz-options";

        item.options.forEach(function (optionText, oIndex) {
          var label = document.createElement("label");
          label.className = "quiz-option";

          var input = document.createElement("input");
          input.type = "radio";
          input.name = "lesson" + lessonId + "_q" + qIndex;
          input.value = String(oIndex);

          input.addEventListener("change", function () {
            answers[qIndex] = oIndex;
            var isCorrect = oIndex === item.correct;

            optionsWrap.querySelectorAll(".quiz-option").forEach(function (el) {
              el.classList.remove("is-correct", "is-incorrect");
            });
            label.classList.add(isCorrect ? "is-correct" : "is-incorrect");
            if (!isCorrect) {
              var correctLabel = optionsWrap.children[item.correct];
              if (correctLabel) correctLabel.classList.add("is-correct");
            }

            var feedback = wrap.querySelector(".quiz-feedback");
            feedback.hidden = false;
            feedback.className =
              "quiz-feedback " + (isCorrect ? "quiz-feedback--correct" : "quiz-feedback--incorrect");
            feedback.textContent = (isCorrect ? "To'g'ri. " : "Noto'g'ri. ") + item.explain;

            optionsWrap.querySelectorAll('input[type="radio"]').forEach(function (radio) {
              radio.disabled = true;
            });

            checkAllAnswered();
          });

          label.appendChild(input);
          var span = document.createElement("span");
          span.textContent = optionText;
          label.appendChild(span);
          optionsWrap.appendChild(label);
        });

        wrap.appendChild(optionsWrap);

        var feedback = document.createElement("div");
        feedback.className = "quiz-feedback";
        feedback.hidden = true;
        wrap.appendChild(feedback);

        container.appendChild(wrap);
      });

      var summary = document.createElement("div");
      summary.className = "quiz-summary";
      summary.hidden = true;
      container.appendChild(summary);

      function checkAllAnswered() {
        var answered = answers.filter(function (a) {
          return a !== null;
        }).length;
        if (answered < questions.length) return;

        var correctCount = 0;
        answers.forEach(function (a, i) {
          if (a === questions[i].correct) correctCount++;
        });

        summary.hidden = false;
        summary.textContent =
          "Natija: " + correctCount + " / " + questions.length + " to'g'ri javob.";

        Storage.setQuizResult(lessonId, correctCount, questions.length);
        Storage.setLessonCompleted(lessonId, true);

        var completeNote = document.querySelector("[data-lesson-complete-note]");
        if (completeNote) {
          completeNote.hidden = false;
        }
      }
    },
  };

  /* ------------------------------------------------------------------
     8. Parol kuchini tekshirgich (2-darsda ishlatiladi)
     Parol hech qayerga yuborilmaydi — barcha hisob-kitob shu brauzerda,
     faqat foydalanuvchi ekranida bo'ladi.
     ------------------------------------------------------------------ */
  var COMMON_PASSWORDS = [
    "12345678", "123456789", "123456", "1234567890", "qwerty123",
    "password", "password1", "11111111", "qwertyuiop", "admin123",
    "parol123", "uzbekistan", "tashkent123", "toshkent123", "12345",
    "iloveyou", "qazwsx123", "1qaz2wsx", "monkey123", "football",
    "01012000", "asdfghjk", "zxcvbnm12", "welcome1", "toshkent2024",
  ];

  function evaluatePassword(pw) {
    var tips = [];
    var score = 0;

    if (pw.length === 0) {
      return { score: 0, level: "none", tips: [] };
    }

    if (pw.length >= 12) {
      score += 2;
    } else if (pw.length >= 8) {
      score += 1;
      tips.push("Uzunroq parol yasang — 12 yoki undan ko'p belgi tavsiya etiladi.");
    } else {
      tips.push("Parol juda qisqa — kamida 12 ta belgidan foydalaning.");
    }

    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) {
      score += 1;
    } else {
      tips.push("Katta va kichik harflarni aralashtirib yozing.");
    }

    if (/[0-9]/.test(pw)) {
      score += 1;
    } else {
      tips.push("Kamida bitta raqam qo'shing.");
    }

    if (/[^a-zA-Z0-9]/.test(pw)) {
      score += 1;
    } else {
      tips.push("Maxsus belgi qo'shing: !, ?, #, % kabi.");
    }

    if (/^[0-9]+$/.test(pw)) {
      score = Math.min(score, 1);
      tips.push("Faqat raqamlardan iborat parollar juda tez taxmin qilinadi.");
    }

    if (COMMON_PASSWORDS.indexOf(pw.toLowerCase()) !== -1) {
      score = 0;
      tips.unshift("Bu eng ko'p ishlatiladigan parollardan biri — darhol almashtiring!");
    }

    var level;
    if (score <= 1) level = "weak";
    else if (score <= 3) level = "medium";
    else if (score === 4) level = "strong";
    else level = "very-strong";

    return { score: score, level: level, tips: tips };
  }

  var LEVEL_LABELS = {
    none: "Parol kiriting",
    weak: "Zaif",
    medium: "O'rtacha",
    strong: "Kuchli",
    "very-strong": "Juda kuchli",
  };

  var PasswordChecker = {
    init: function (inputEl, meterFillEl, labelEl, tipsListEl, toggleEl) {
      if (!inputEl) return;

      function render() {
        var result = evaluatePassword(inputEl.value);
        var percent = Math.min(100, Math.round((result.score / 5) * 100));

        if (meterFillEl) {
          meterFillEl.style.width = percent + "%";
          meterFillEl.setAttribute("data-level", result.level);
        }
        if (labelEl) {
          labelEl.textContent = LEVEL_LABELS[result.level];
          labelEl.setAttribute("data-level", result.level);
        }
        if (tipsListEl) {
          tipsListEl.innerHTML = "";
          if (result.tips.length === 0 && inputEl.value.length > 0) {
            var li = document.createElement("li");
            li.textContent = "Yaxshi parol! Buni faqat shu hisob uchun ishlating.";
            tipsListEl.appendChild(li);
          } else {
            result.tips.forEach(function (tip) {
              var li = document.createElement("li");
              li.textContent = tip;
              tipsListEl.appendChild(li);
            });
          }
        }
      }

      inputEl.addEventListener("input", render);
      render();

      if (toggleEl) {
        toggleEl.addEventListener("change", function () {
          inputEl.type = toggleEl.checked ? "text" : "password";
        });
      }
    },
  };

  /* ------------------------------------------------------------------
     9. Fishing-trenajyor (4-darsda ishlatiladi)
     ------------------------------------------------------------------ */
  var PhishingTrainer = {
    /**
     * container: trenajyor joylashgan DOM element
     * items: [{ type: "sms"|"telegram"|"email"|"url", sender, text, isPhishing, explain }]
     */
    init: function (container, items) {
      if (!container) return;
      container.innerHTML = "";
      var current = 0;
      var correctCount = 0;
      var answered = false;

      var progressEl = document.createElement("p");
      progressEl.className = "phish-progress";
      container.appendChild(progressEl);

      var cardEl = document.createElement("div");
      cardEl.className = "phish-card";
      container.appendChild(cardEl);

      var typeLabels = {
        sms: "SMS xabar",
        telegram: "Telegram xabari",
        email: "Elektron xat",
        url: "Sayt manzili",
      };

      function renderCard() {
        var item = items[current];
        answered = false;
        progressEl.textContent = "Vaziyat " + (current + 1) + " / " + items.length;

        cardEl.innerHTML = "";

        var badge = document.createElement("span");
        badge.className = "badge badge-amber";
        badge.textContent = typeLabels[item.type] || "Xabar";
        cardEl.appendChild(badge);

        if (item.sender) {
          var sender = document.createElement("p");
          sender.className = "sms-mock__sender";
          sender.textContent = "Kimdan: " + item.sender;
          cardEl.appendChild(sender);
        }

        var text = document.createElement("p");
        text.className = "phish-card__text";
        text.textContent = item.text;
        cardEl.appendChild(text);

        var choiceRow = document.createElement("div");
        choiceRow.className = "phish-choice-row";

        var realBtn = document.createElement("button");
        realBtn.type = "button";
        realBtn.className = "btn btn-outline";
        realBtn.textContent = "Haqiqiy deb o'ylayman";

        var fakeBtn = document.createElement("button");
        fakeBtn.type = "button";
        fakeBtn.className = "btn btn-outline";
        fakeBtn.textContent = "Soxta deb o'ylayman";

        var feedback = document.createElement("div");
        feedback.className = "quiz-feedback";
        feedback.hidden = true;

        function handleAnswer(userSaysPhishing) {
          if (answered) return;
          answered = true;
          var isCorrect = userSaysPhishing === item.isPhishing;
          if (isCorrect) correctCount++;

          realBtn.disabled = true;
          fakeBtn.disabled = true;
          (item.isPhishing ? fakeBtn : realBtn).classList.add("is-correct-btn");

          feedback.hidden = false;
          feedback.className =
            "quiz-feedback " + (isCorrect ? "quiz-feedback--correct" : "quiz-feedback--incorrect");
          feedback.textContent =
            (isCorrect ? "To'g'ri topdingiz. " : "Noto'g'ri. ") +
            (item.isPhishing ? "Bu — soxta xabar. " : "Bu — haqiqiy, oddiy xabar. ") +
            item.explain;

          var nextBtn = document.createElement("button");
          nextBtn.type = "button";
          nextBtn.className = "btn btn-primary";
          nextBtn.style.marginTop = "1rem";
          nextBtn.textContent = current === items.length - 1 ? "Natijani ko'rish" : "Keyingisi →";
          nextBtn.addEventListener("click", function () {
            current++;
            if (current < items.length) {
              renderCard();
            } else {
              renderSummary();
            }
          });
          cardEl.appendChild(nextBtn);
        }

        realBtn.addEventListener("click", function () {
          handleAnswer(false);
        });
        fakeBtn.addEventListener("click", function () {
          handleAnswer(true);
        });

        choiceRow.appendChild(realBtn);
        choiceRow.appendChild(fakeBtn);
        cardEl.appendChild(choiceRow);
        cardEl.appendChild(feedback);
      }

      function renderSummary() {
        progressEl.textContent = "Yakunlandi";
        cardEl.innerHTML = "";
        var summary = document.createElement("div");
        summary.className = "quiz-summary";
        summary.textContent = "Natija: " + correctCount + " / " + items.length + " to'g'ri aniqlandi.";
        cardEl.appendChild(summary);

        var note = document.createElement("p");
        note.className = "text-soft";
        if (correctCount === items.length) {
          note.textContent = "Ajoyib! Siz barcha vaziyatlarni to'g'ri aniqladingiz.";
        } else if (correctCount >= items.length * 0.7) {
          note.textContent = "Yaxshi natija. Ba'zi nozik belgilarga yana ham diqqat qiling.";
        } else {
          note.textContent = "Bu darsni va \"Xato qilmang\" bo'limini yana bir bor ko'rib chiqishni tavsiya qilamiz.";
        }
        cardEl.appendChild(note);

        Storage.setPhishingResult(correctCount, items.length);
      }

      renderCard();
    },
  };

  /* ------------------------------------------------------------------
     10. Yakuniy baholash (test.html)
     ------------------------------------------------------------------ */
  var TEST_CATEGORIES = [
    { id: "parol", label: "Parol gigiyenasi", lessons: [2, 3] },
    { id: "fishing", label: "Fishingni tanish", lessons: [4, 5] },
    { id: "tolov", label: "To'lov xavfsizligi", lessons: [6] },
    { id: "ijtimoiy", label: "Ijtimoiy tarmoq", lessons: [7, 8] },
    { id: "qurilma", label: "Qurilma va tarmoq himoyasi", lessons: [9, 10] },
  ];

  function levelForScore(score) {
    if (score >= 86) return "Yuqori";
    if (score >= 66) return "Yaxshi";
    if (score >= 41) return "O'rta";
    return "Boshlang'ich";
  }

  function buildRadarSvg(categoryResults) {
    var size = 280;
    var cx = size / 2;
    var cy = size / 2;
    var maxR = 92;
    var n = categoryResults.length;
    var angleStep = (Math.PI * 2) / n;

    function pointAt(index, ratio) {
      var angle = -Math.PI / 2 + index * angleStep;
      return {
        x: cx + Math.cos(angle) * maxR * ratio,
        y: cy + Math.sin(angle) * maxR * ratio,
      };
    }

    var svg = '<svg viewBox="0 0 ' + size + " " + size + '" role="img" aria-label="Yo\'nalishlar bo\'yicha natija diagrammasi">';

    // Grid rings
    [0.25, 0.5, 0.75, 1].forEach(function (ratio) {
      var pts = [];
      for (var i = 0; i < n; i++) {
        var p = pointAt(i, ratio);
        pts.push(p.x.toFixed(1) + "," + p.y.toFixed(1));
      }
      svg +=
        '<polygon points="' + pts.join(" ") + '" fill="none" stroke="var(--border)" stroke-width="1"/>';
    });

    // Axes + labels
    categoryResults.forEach(function (cat, i) {
      var edge = pointAt(i, 1);
      svg +=
        '<line x1="' + cx + '" y1="' + cy + '" x2="' + edge.x.toFixed(1) + '" y2="' + edge.y.toFixed(1) + '" stroke="var(--border)" stroke-width="1"/>';

      var labelPoint = pointAt(i, 1.22);
      var anchor = "middle";
      if (labelPoint.x < cx - 10) anchor = "end";
      else if (labelPoint.x > cx + 10) anchor = "start";
      svg +=
        '<text x="' + labelPoint.x.toFixed(1) + '" y="' + labelPoint.y.toFixed(1) +
        '" text-anchor="' + anchor + '" font-size="10.5" fill="var(--text-soft)" font-family="sans-serif">' +
        cat.shortLabel + "</text>";
    });

    // Value polygon
    var valuePts = [];
    categoryResults.forEach(function (cat, i) {
      var p = pointAt(i, cat.ratio);
      valuePts.push(p.x.toFixed(1) + "," + p.y.toFixed(1));
    });
    svg +=
      '<polygon points="' + valuePts.join(" ") + '" fill="var(--green-600)" fill-opacity="0.25" stroke="var(--green-600)" stroke-width="2"/>';

    categoryResults.forEach(function (cat, i) {
      var p = pointAt(i, cat.ratio);
      svg += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.5" fill="var(--green-600)"/>';
    });

    svg += "</svg>";
    return svg;
  }

  var FinalTest = {
    CATEGORIES: TEST_CATEGORIES,

    init: function (formEl, resultEl, questions) {
      if (!formEl) return;
      formEl.innerHTML = "";
      var answers = new Array(questions.length).fill(null);

      TEST_CATEGORIES.forEach(function (cat) {
        var catHeading = document.createElement("h3");
        catHeading.textContent = cat.label;
        formEl.appendChild(catHeading);

        var catGrid = document.createElement("div");
        catGrid.className = "quiz-category-grid";
        formEl.appendChild(catGrid);

        questions.forEach(function (item, qIndex) {
          if (item.category !== cat.id) return;

          var wrap = document.createElement("fieldset");
          wrap.className = "quiz-question";

          var legend = document.createElement("legend");
          legend.className = "quiz-question__text";
          legend.textContent = qIndex + 1 + ". " + item.q;
          wrap.appendChild(legend);

          var optionsWrap = document.createElement("div");
          optionsWrap.className = "quiz-options";

          item.options.forEach(function (optionText, oIndex) {
            var label = document.createElement("label");
            label.className = "quiz-option";

            var input = document.createElement("input");
            input.type = "radio";
            input.name = "finaltest_q" + qIndex;
            input.value = String(oIndex);
            input.addEventListener("change", function () {
              answers[qIndex] = oIndex;
            });

            label.appendChild(input);
            var span = document.createElement("span");
            span.textContent = optionText;
            label.appendChild(span);
            optionsWrap.appendChild(label);
          });

          wrap.appendChild(optionsWrap);
          catGrid.appendChild(wrap);
        });
      });

      var submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className = "btn btn-primary btn-block";
      submitBtn.textContent = "Natijani hisoblash";
      formEl.appendChild(submitBtn);

      var unansweredNote = document.createElement("p");
      unansweredNote.className = "quiz-feedback quiz-feedback--incorrect";
      unansweredNote.hidden = true;
      unansweredNote.textContent = "Iltimos, natijani ko'rishdan oldin barcha savollarga javob bering.";
      formEl.appendChild(unansweredNote);

      submitBtn.addEventListener("click", function () {
        var unanswered = answers.indexOf(null);
        if (unanswered !== -1) {
          unansweredNote.hidden = false;
          var target = formEl.querySelectorAll(".quiz-question")[unanswered];
          if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        unansweredNote.hidden = true;

        var byCategory = {};
        TEST_CATEGORIES.forEach(function (cat) {
          byCategory[cat.id] = { correct: 0, total: 0 };
        });

        var totalCorrect = 0;
        questions.forEach(function (item, i) {
          byCategory[item.category].total++;
          if (answers[i] === item.correct) {
            byCategory[item.category].correct++;
            totalCorrect++;
          }
        });

        var score = Math.round((totalCorrect / questions.length) * 100);
        var level = levelForScore(score);

        FinalTest.renderResult(resultEl, score, level, byCategory);
        Storage.setFinalTest({ score: score, level: level, byCategory: byCategory, date: Date.now() });

        formEl.hidden = true;
        resultEl.hidden = false;
        resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },

    renderResult: function (resultEl, score, level, byCategory) {
      resultEl.innerHTML = "";

      var scoreBlock = document.createElement("div");
      scoreBlock.className = "test-score-block";
      scoreBlock.innerHTML =
        '<p class="test-score-num">' + score + " / 100</p>" +
        '<p class="badge badge-green test-score-level">Daraja: ' + level + "</p>";
      resultEl.appendChild(scoreBlock);

      var radarWrap = document.createElement("div");
      radarWrap.className = "radar-wrap";
      var categoryResults = TEST_CATEGORIES.map(function (cat) {
        var data = byCategory[cat.id];
        var ratio = data.total ? data.correct / data.total : 0;
        return {
          id: cat.id,
          shortLabel: cat.label,
          ratio: ratio,
        };
      });
      radarWrap.innerHTML = buildRadarSvg(categoryResults);
      resultEl.appendChild(radarWrap);

      var breakdownList = document.createElement("div");
      breakdownList.className = "category-breakdown";
      var weakCats = [];

      TEST_CATEGORIES.forEach(function (cat) {
        var data = byCategory[cat.id];
        var percent = data.total ? Math.round((data.correct / data.total) * 100) : 0;
        if (percent < 70) weakCats.push(cat);

        var row = document.createElement("div");
        row.className = "category-row";
        row.innerHTML =
          '<span class="category-row__label">' + cat.label + "</span>" +
          '<div class="category-row__bar"><div class="category-row__fill" style="width:' + percent + '%"></div></div>' +
          '<span class="category-row__percent">' + data.correct + "/" + data.total + "</span>";
        breakdownList.appendChild(row);
      });
      resultEl.appendChild(breakdownList);

      var recBlock = document.createElement("div");
      recBlock.className = "example-box";
      if (weakCats.length === 0) {
        recBlock.innerHTML = "<p><strong>Barcha yo'nalishlar bo'yicha yaxshi natija!</strong> Bilimlaringizni mustahkamlash uchun vaqti-vaqti bilan darslarni qayta ko'rib turishingiz mumkin.</p>";
      } else {
        var html = "<p><strong>Quyidagi yo'nalishlarni takrorlashni tavsiya qilamiz:</strong></p><ul>";
        weakCats.forEach(function (cat) {
          var links = cat.lessons
            .map(function (n) {
              return '<a href="./dars-' + n + '.html">' + n + "-dars</a>";
            })
            .join(", ");
          html += "<li>" + cat.label + " — " + links + "</li>";
        });
        html += "</ul>";
        recBlock.innerHTML = html;
      }
      resultEl.appendChild(recBlock);

      var downloadBtn = document.createElement("button");
      downloadBtn.type = "button";
      downloadBtn.className = "btn btn-outline";
      downloadBtn.textContent = "Natijani yuklab olish (matn fayl)";
      downloadBtn.addEventListener("click", function () {
        var lines = [];
        lines.push("KIBERSAVOD — Yakuniy baholash natijasi");
        lines.push("Sana: " + new Date().toLocaleString());
        lines.push("Kibersavodxonlik indeksi: " + score + " / 100");
        lines.push("Daraja: " + level);
        lines.push("");
        lines.push("Yo'nalishlar bo'yicha natija:");
        TEST_CATEGORIES.forEach(function (cat) {
          var data = byCategory[cat.id];
          lines.push("- " + cat.label + ": " + data.correct + "/" + data.total);
        });
        var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "kibersavod-natija.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      resultEl.appendChild(downloadBtn);
    },
  };

  /* ------------------------------------------------------------------
     11. Ishga tushirish
     ------------------------------------------------------------------ */
  function init() {
    initTheme();
    initMobileNav();
    markCurrentNav();
    initTaskCheckboxes();
    initLessonTOC();
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
    Quiz: Quiz,
    PasswordChecker: PasswordChecker,
    PhishingTrainer: PhishingTrainer,
    FinalTest: FinalTest,
    TOTAL_LESSONS: TOTAL_LESSONS,
  };
})();
