/* 知启 · AI 学习桌面
   无构建、无依赖、可直接在浏览器打开。 */
(function () {
  "use strict";

  const DATA = window.ZQ_DATA;
  const AI = window.ZQ_AI;
  const THINKING_MODULES = (window.ZQ_THINKING && window.ZQ_THINKING.modules) || [];
  const SAVE_KEY = "zhiqi.learning.pad.v1";
  const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const SUBJECT_ICONS = {
    chinese: "book",
    math: "target",
    english: "globe",
    science: "flask",
    enrich: "palette"
  };
  const SUBJECT_NAMES = {
    chinese: "语文",
    math: "数学",
    english: "英语",
    science: "科学",
    enrich: "素养"
  };
  const ROUTE_META = {
    home: { title: "学习桌面", label: "学习空间" },
    sync: { title: "同步课堂", label: "学习空间" },
    thinking: { title: "思维闯关", label: "学习空间" },
    precision: { title: "AI 精准学", label: "学习空间" },
    tutor: { title: "AI 老师", label: "学习空间" },
    homework: { title: "作业批改", label: "自主学习" },
    mistakes: { title: "错题本", label: "自主学习" },
    plan: { title: "学习计划", label: "自主学习" },
    enrich: { title: "素养中心", label: "自主学习" },
    parent: { title: "家长中心", label: "守护与管理" }
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  const view = $("#view");
  const modalRoot = $("#modal-root");
  const toastRoot = $("#toast-root");
  const focusHud = $("#focus-hud");
  const sidebar = $("#sidebar");

  let currentRoute = "home";
  let pendingPrompt = null;
  let lastModalFocus = null;
  let searchFocusPending = false;
  let activeTimerId = null;
  let deferredInstallPrompt = null;

  const ui = {
    syncSubject: "math",
    precisionMode: "standard",
    mistakeFilter: "all",
    mistakeQuery: "",
    selectedDay: 0,
    typing: false,
    homework: { stage: "idle", preview: "", fileName: "", sample: false },
    diag: null,
    redo: null,
    thinking: null,
    objectIndex: 0,
    enrich: { story: null, poem: null, poemIndex: 0, speak: null, code: null, science: [] },
    pendingPrompt: null
  };

  const focus = {
    duration: 25 * 60,
    remaining: 25 * 60,
    running: false,
    endsAt: 0,
    intervalId: null
  };

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */

  function createDefaultState() {
    return {
      version: 1,
      profile: { ...DATA.profile },
      activeChildId: "",
      children: [],
      tasks: DATA.tasks.map((task) => ({ ...task })),
      mistakes: DATA.mistakes.map((mistake) => ({ ...mistake })),
      mastery: { ...DATA.mastery },
      learned: [],
      currentLessons: {},
      todayMinutes: 42,
      weekFocus: 276,
      weekGoal: 300,
      xp: 1280,
      streak: 12,
      chat: [],
      diagnostic: { score: null, lastDate: null, completed: false },
      homeworkAdded: false,
      thinking: { completed: [], reflections: [], hintsUsed: 0 },
      settings: { eyeCare: true, sound: true, reduceMotion: false, simpleMode: true },
      parent: {
        dailyLimit: 90,
        answerLock: false,
        eyeCare: true,
        appGuard: true,
        weeklyReport: true,
        bedtime: "21:30"
      },
      lastVisit: dateKey()
    };
  }

  function loadState() {
    const defaults = createDefaultState();
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!saved || typeof saved !== "object") return defaults;
      return {
        ...defaults,
        ...saved,
        profile: { ...defaults.profile, ...(saved.profile || {}) },
        settings: { ...defaults.settings, ...(saved.settings || {}) },
        parent: { ...defaults.parent, ...(saved.parent || {}) },
        diagnostic: { ...defaults.diagnostic, ...(saved.diagnostic || {}) },
        mastery: { ...defaults.mastery, ...(saved.mastery || {}) },
        tasks: Array.isArray(saved.tasks) && saved.tasks.length ? saved.tasks : defaults.tasks,
        mistakes: Array.isArray(saved.mistakes) ? saved.mistakes : defaults.mistakes,
        learned: Array.isArray(saved.learned) ? saved.learned : [],
        currentLessons: saved.currentLessons && typeof saved.currentLessons === "object" ? saved.currentLessons : {},
        chat: Array.isArray(saved.chat) ? saved.chat : []
      };
    } catch (error) {
      return defaults;
    }
  }

  const CHILD_DATA_FIELDS = [
    "profile",
    "tasks",
    "mistakes",
    "mastery",
    "learned",
    "currentLessons",
    "todayMinutes",
    "weekFocus",
    "weekGoal",
    "xp",
    "streak",
    "chat",
    "diagnostic",
    "homeworkAdded",
    "thinking"
  ];

  let state = loadState();
  ensureChildrenState();

  function deepCopy(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function snapshotChild(source, id) {
    const child = { id };
    CHILD_DATA_FIELDS.forEach((field) => {
      child[field] = deepCopy(source[field]);
    });
    return child;
  }

  function ensureChildrenState() {
    if (!Array.isArray(state.children)) state.children = [];
    if (!state.children.length) {
      const id = `child-${Date.now()}`;
      state.activeChildId = id;
      state.children = [snapshotChild(state, id)];
      return;
    }
    state.children = state.children.map((child) => ({
      ...child,
      profile: { ...DATA.profile, ...(child.profile || {}) },
      thinking: child.thinking || { completed: [], reflections: [], hintsUsed: 0 }
    }));
    if (!state.children.some((child) => child.id === state.activeChildId)) {
      state.activeChildId = state.children[0].id;
    }
  }

  function syncActiveChild() {
    if (!Array.isArray(state.children) || !state.activeChildId) return;
    const index = state.children.findIndex((child) => child.id === state.activeChildId);
    const snapshot = snapshotChild(state, state.activeChildId);
    if (index >= 0) state.children[index] = snapshot;
    else state.children.push(snapshot);
  }

  function applyChildToState(child) {
    CHILD_DATA_FIELDS.forEach((field) => {
      if (child[field] !== undefined) state[field] = deepCopy(child[field]);
    });
    if (!state.thinking || typeof state.thinking !== "object") {
      state.thinking = { completed: [], reflections: [], hintsUsed: 0 };
    }
    state.activeChildId = child.id;
    const goal = Number(child.profile && child.profile.dailyGoal);
    if (goal) state.parent.dailyLimit = goal;
  }

  function saveState() {
    try {
      syncActiveChild();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (error) {
      // 本地文件模式下如果浏览器禁用了存储，应用仍可继续使用。
    }
  }

  /* ------------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------------ */

  function icon(name, className) {
    return `<svg${className ? ` class="${className}"` : ""} aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function md(text) {
    const safe = esc(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
    return safe
      .split(/\n{2,}/)
      .map((paragraph) => {
        const lines = paragraph.split("\n");
        const withBullets = lines.map((line) => line.replace(/^[-•]\s+/, "• ")).join("<br>");
        return `<p>${withBullets}</p>`;
      })
      .join("");
  }

  function dateKey(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function todayOffset() {
    return (new Date().getDay() + 6) % 7;
  }

  function getWeekDates() {
    const today = new Date();
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(today.getDate() - todayOffset());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 5) return "夜深了";
    if (hour < 11) return "早上好";
    if (hour < 13) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  }

  function nowTime() {
    return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function formatMinutes(minutes) {
    if (minutes < 60) return `${minutes} 分钟`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
  }

  function formatTimer(seconds) {
    const safe = Math.max(0, seconds);
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  function subjectClass(id) {
    return `subject-${id}`;
  }

  function subjectIcon(id, extra) {
    return `<span class="subject-icon ${subjectClass(id)} ${extra || ""}"><svg aria-hidden="true"><use href="#i-${SUBJECT_ICONS[id] || "book"}"></use></svg></span>`;
  }

  function subjectName(id) {
    return SUBJECT_NAMES[id] || "学习";
  }

  const SAMPLE_GRADE = "五年级";
  const GRADE_OPTIONS = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];
  const TERM_OPTIONS = ["上册", "下册"];
  const TEXTBOOK_OPTIONS = {
    chinese: ["人教版", "统编版", "苏教版", "北师大版"],
    math: ["北师大版", "人教版", "苏教版", "青岛版", "西师大版"],
    english: ["沪教版", "人教PEP", "外研版", "译林版", "冀教版", "闽教版"],
    science: ["待确定", "教科版", "苏教版", "大象版", "冀人版"]
  };

  function profileName() {
    return String(state.profile.callName || state.profile.name || "同学").trim() || "同学";
  }

  function profileInitial() {
    if (state.profile.short) return Array.from(String(state.profile.short))[0];
    const chars = Array.from(profileName());
    return chars.length ? chars[chars.length - 1] : "学";
  }

  function classLabel() {
    const grade = state.profile.grade || SAMPLE_GRADE;
    const raw = String(state.profile.className || "").trim();
    if (!raw) return grade;
    return `${grade}（${raw.replace(/班$/g, "")}）班`;
  }

  function textbookVersion(subjectId) {
    const fallback = DATA.subjects.find((item) => item.id === subjectId);
    const fallbackBook = fallback ? fallback.version.split("·")[0].trim() : "";
    const book = (state.profile.textbooks && state.profile.textbooks[subjectId]) || fallbackBook;
    return `${book} · ${state.profile.grade || SAMPLE_GRADE}${state.profile.term || "下册"}`;
  }

  function isSampleGrade() {
    return (state.profile.grade || SAMPLE_GRADE) !== SAMPLE_GRADE;
  }

  function defaultBookFor(subjectId) {
    const subject = DATA.subjects.find((item) => item.id === subjectId);
    return subject ? subject.version.split("·")[0].trim() : "";
  }

  function isSampleContent(subjectId) {
    const selected = state.profile.textbooks && state.profile.textbooks[subjectId];
    return isSampleGrade() || Boolean(selected && selected !== defaultBookFor(subjectId));
  }

  function thinkingBandForGrade(grade) {
    const value = grade || SAMPLE_GRADE;
    if (/一年级|二年级/.test(value)) return "low";
    if (/三年级|四年级/.test(value)) return "middle";
    return "high";
  }

  function thinkingModulesForGrade(grade) {
    const band = thinkingBandForGrade(grade);
    const modules = THINKING_MODULES.filter((module) => module.band === band);
    return modules.length ? modules : THINKING_MODULES;
  }

  function thinkingDoneIds() {
    return (state.thinking && Array.isArray(state.thinking.completed)) ? state.thinking.completed : [];
  }

  function nextThinkingModule(grade) {
    const modules = thinkingModulesForGrade(grade);
    return modules.find((module) => !thinkingDoneIds().includes(module.id)) || modules[0] || null;
  }

  function getTodayTasks() {
    return state.tasks.filter((task) => Number(task.dayOffset) === todayOffset());
  }

  function unmasteredCount() {
    return state.mistakes.filter((mistake) => !mistake.mastered).length;
  }

  function masteryAverage() {
    const values = Object.values(state.mastery);
    if (!values.length) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  function routeFromHash() {
    const value = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
    return VIEWS[value] ? value : "home";
  }

  /* ------------------------------------------------------------------------
     Toasts, dialog and navigation
     ------------------------------------------------------------------------ */

  function toast(title, message, type) {
    const node = document.createElement("div");
    node.className = "toast";
    const iconName = type === "warn" ? "info" : type === "award" ? "award" : "check";
    node.innerHTML = `
      <span class="toast-icon">${icon(iconName)}</span>
      <span class="toast-copy"><strong>${esc(title)}</strong>${message ? `<span>${esc(message)}</span>` : ""}</span>
    `;
    toastRoot.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("is-leaving");
      window.setTimeout(() => node.remove(), 240);
    }, 3300);
  }

  function openModal(html, size) {
    lastModalFocus = document.activeElement;
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal ${size || ""}" role="dialog" aria-modal="true" tabindex="-1">${html}</div>
      </div>
    `;
    document.body.classList.add("modal-open");
    const modal = $(".modal", modalRoot);
    const target = modal && modal.querySelector("[autofocus]");
    window.setTimeout(() => {
      if (target) target.focus();
      else if (modal) modal.focus({ preventScroll: true });
    }, 30);
  }

  function closeModal() {
    if (!modalRoot.firstElementChild) return;
    modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");
    if (lastModalFocus && typeof lastModalFocus.focus === "function") {
      lastModalFocus.focus();
    }
  }

  function modalShell(kicker, title, body, footer, size) {
    return `
      <div class="modal-head">
        <div>
          <p class="modal-kicker">${kicker}</p>
          <h2 class="modal-title">${title}</h2>
        </div>
        <button class="modal-close" type="button" data-close-modal aria-label="关闭">${icon("x")}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ""}
    `;
  }

  function go(route) {
    if (location.hash === `#/${route}`) {
      navigate();
    } else {
      location.hash = `#/${route}`;
    }
  }

  function navigate() {
    const next = routeFromHash();
    const changed = next !== currentRoute;
    currentRoute = next;
    render({ routeChanged: changed });
    if (changed) {
      window.scrollTo(0, 0);
    }
  }

  function render(options) {
    const opts = options || {};
    const meta = ROUTE_META[currentRoute] || ROUTE_META.home;
    const titleNode = $("#topbar-title");
    const eyebrowNode = $("#topbar-eyebrow");
    if (titleNode) titleNode.textContent = meta.title;
    if (eyebrowNode) {
      const now = new Date();
      eyebrowNode.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${WEEKDAYS[now.getDay()]} · ${meta.label}`;
    }
    updateSidebar();
    updateProfileUI();
    updateEyeCare();
    updateClock();

    const previousScroll = view.scrollTop;
    const renderer = VIEWS[currentRoute] || VIEWS.home;
    view.classList.toggle("is-refreshing", !opts.routeChanged);
    view.innerHTML = renderer();
    if (opts.routeChanged) {
      view.scrollTop = 0;
      view.classList.remove("page-enter");
      void view.offsetWidth;
      view.classList.add("page-enter");
    } else {
      view.scrollTop = previousScroll;
    }

    afterRender();
    updateFocusHud();
  }

  function afterRender() {
    if (currentRoute === "tutor") {
      bindTutorInput();
      const body = $("#chat-body");
      if (body) {
        requestAnimationFrame(() => {
          body.scrollTop = body.scrollHeight;
        });
      }
      if (ui.pendingPrompt) {
        const prompt = ui.pendingPrompt;
        ui.pendingPrompt = null;
        window.setTimeout(() => sendTutorMessage(prompt), 380);
      }
    }

    if (currentRoute === "homework") {
      bindHomeworkDrop();
    }

    if (currentRoute === "mistakes") {
      bindMistakeSearch();
      if (searchFocusPending) {
        searchFocusPending = false;
        const input = $("#mistake-search");
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    }

    if (currentRoute === "parent") {
      bindParentRange();
    }

    if (currentRoute === "plan") {
      updatePlanTimerDom();
    }
  }

  function updateProfileUI() {
    const pendingSetup = !state.profile.setupComplete;
    const initial = pendingSetup ? "学" : profileInitial();
    const name = pendingSetup ? "我的孩子" : state.profile.name || profileName();
    const grade = state.profile.grade || SAMPLE_GRADE;
    const className = state.profile.className ? ` · ${state.profile.className}` : "";
    const sidebarAvatar = $("#sidebar-avatar");
    const sidebarName = $("#sidebar-name");
    const sidebarMeta = $("#sidebar-meta");
    const sidebarLevel = $("#sidebar-level");
    const topbarAvatar = $("#topbar-avatar");
    const profileButton = $(".profile-button");
    if (sidebarAvatar) sidebarAvatar.textContent = initial;
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarMeta) sidebarMeta.textContent = pendingSetup ? "待完成档案设置" : `${grade}${className}`;
    if (sidebarLevel) sidebarLevel.textContent = `Lv.${state.profile.level || 7}`;
    if (topbarAvatar) topbarAvatar.textContent = initial;
    if (profileButton) profileButton.setAttribute("aria-label", pendingSetup ? "设置孩子的学习档案" : `${profileName()}的个人中心`);
  }

  function isSimpleMode() {
    return state.settings.simpleMode !== false;
  }

  function updateKidDock() {
    const dock = $("#kid-dock");
    const simple = isSimpleMode();
    document.body.classList.toggle("kid-mode", simple);
    if (!dock) return;
    dock.hidden = !simple;
    const dockRoute = currentRoute === "mistakes" ? "homework" : (currentRoute === "plan" || currentRoute === "sync") ? "home" : currentRoute;
    $$("[data-kid-route]", dock).forEach((item) => {
      item.classList.toggle("is-active", item.dataset.kidRoute === dockRoute);
      if (item.dataset.kidRoute === dockRoute) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }

  function toggleSimpleMode() {
    state.settings.simpleMode = !isSimpleMode();
    saveState();
    $$('.switch[data-action="toggle-simple-mode"]').forEach((button) => {
      button.classList.toggle("is-on", state.settings.simpleMode);
      button.setAttribute("aria-checked", String(state.settings.simpleMode));
    });
    updateKidDock();
    render({ routeChanged: false });
    toast(state.settings.simpleMode ? "已开启儿童简洁模式" : "已切换为完整学习桌面", state.settings.simpleMode ? "只保留大按钮和最重要的入口。" : "会显示侧栏和完整数据面板。");
  }

  function updateSidebar() {
    updateProfileUI();
    updateKidDock();
    $$(".nav-item[data-route]").forEach((item) => {
      const target = item.getAttribute("data-route");
      item.classList.toggle("is-active", target === currentRoute);
      if (ROUTE_META[target]) {
        item.title = ROUTE_META[target].title;
        item.setAttribute("aria-label", ROUTE_META[target].title);
      }
      if (target === currentRoute) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
    const count = unmasteredCount();
    const badge = $("#mistake-count");
    if (badge) {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    }
  }

  function updateEyeCare() {
    const on = Boolean(state.settings.eyeCare);
    document.body.classList.toggle("eye-care", on);
    const chip = $("#eye-care-chip");
    if (chip) {
      const label = chip.querySelector("span");
      if (label) label.textContent = on ? "未来纸护眼" : "护眼模式已关闭";
      chip.style.opacity = on ? "1" : ".55";
    }
  }

  function updateClock() {
    const clock = $("#clock");
    if (clock) clock.textContent = nowTime();
  }

  function updateFocusHud() {
    if (!focusHud) return;
    if (!focus.running || currentRoute === "plan") {
      focusHud.hidden = true;
      focusHud.innerHTML = "";
      return;
    }
    const percent = Math.max(0, Math.min(100, (focus.remaining / focus.duration) * 100));
    focusHud.hidden = false;
    focusHud.innerHTML = `
      <div class="focus-hud-ring" style="--p:${percent}">${icon("clock")}</div>
      <div class="focus-hud-copy">
        <strong id="focus-hud-time">${formatTimer(focus.remaining)}</strong>
        <span>专注中 · 点击回到计时器</span>
      </div>
      <button class="hud-stop" type="button" data-action="stop-focus" aria-label="结束专注">${icon("x")}</button>
    `;
    focusHud.onclick = (event) => {
      if (event.target.closest("[data-action='stop-focus']")) return;
      go("plan");
    };
  }

  function openTutor(prompt) {
    if (prompt) {
      ui.pendingPrompt = prompt;
    }
    if (currentRoute === "tutor") {
      if (ui.pendingPrompt) {
        const value = ui.pendingPrompt;
        ui.pendingPrompt = null;
        sendTutorMessage(value);
      }
      return;
    }
    go("tutor");
  }

  /* ------------------------------------------------------------------------
     Focus timer
     ------------------------------------------------------------------------ */

  function focusPercent() {
    return Math.max(0, Math.min(100, (focus.remaining / focus.duration) * 100));
  }

  function updatePlanTimerDom() {
    const ring = $("#timer-ring");
    const time = $("#timer-time");
    const stateLabel = $("#timer-state");
    const start = $("#timer-start");
    if (ring) ring.style.setProperty("--p", String(focusPercent()));
    if (time) time.textContent = formatTimer(focus.remaining);
    const duration = $("#timer-duration");
    if (duration) duration.textContent = `${Math.round(focus.duration / 60)} 分钟专注`;
    if (stateLabel) {
      stateLabel.textContent = focus.running ? "专注中，请保持" : focus.remaining === focus.duration ? "准备开始" : "已暂停";
    }
    if (start) {
      start.innerHTML = focus.running ? `${icon("pause")}暂停专注` : `${icon("play")}${focus.remaining < focus.duration ? "继续专注" : "开始专注"}`;
    }
    $$(".timer-preset").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.preset) === Math.round(focus.duration / 60));
    });
    updateFocusHud();
  }

  function startFocusTicker() {
    if (focus.intervalId) return;
    focus.intervalId = window.setInterval(() => {
      if (!focus.running) return;
      focus.remaining = Math.max(0, Math.ceil((focus.endsAt - Date.now()) / 1000));
      if (focus.remaining <= 0) {
        completeFocus();
        return;
      }
      if (currentRoute === "plan") updatePlanTimerDom();
      updateFocusHud();
    }, 1000);
  }

  function toggleFocus() {
    if (focus.remaining <= 0) {
      focus.remaining = focus.duration;
    }
    focus.running = !focus.running;
    if (focus.running) {
      focus.endsAt = Date.now() + focus.remaining * 1000;
      startFocusTicker();
      updatePlanTimerDom();
      toast("专注开始", `接下来 ${Math.round(focus.duration / 60)} 分钟，只做一件事。`);
    } else {
      updatePlanTimerDom();
      toast("已暂停", "休息一下，准备好再继续。");
    }
  }

  function resetFocus() {
    focus.running = false;
    focus.remaining = focus.duration;
    focus.endsAt = 0;
    updatePlanTimerDom();
    toast("计时器已重置", "新的专注时段准备好了。");
  }

  function stopFocus() {
    focus.running = false;
    focus.remaining = focus.duration;
    focus.endsAt = 0;
    updateFocusHud();
    if (currentRoute === "plan") updatePlanTimerDom();
    toast("专注已结束", "这次没有记录时长，下次再试。");
  }

  function setFocusPreset(minutes) {
    if (focus.running) {
      toast("先暂停一下", "专注进行中，暂停后才能切换时长。", "warn");
      return;
    }
    focus.duration = minutes * 60;
    focus.remaining = focus.duration;
    updatePlanTimerDom();
  }

  function completeFocus() {
    focus.running = false;
    focus.remaining = 0;
    const minutes = Math.round(focus.duration / 60);
    state.todayMinutes += minutes;
    state.weekFocus += minutes;
    state.xp += 20;
    saveState();
    toast("专注完成", `你完成了 ${minutes} 分钟专注，获得 20 经验值。`, "award");
    window.setTimeout(() => {
      focus.remaining = focus.duration;
      if (currentRoute === "plan") {
        render({ routeChanged: false });
      } else {
        updateFocusHud();
      }
    }, 700);
  }

  /* ------------------------------------------------------------------------
     Radar chart
     ------------------------------------------------------------------------ */

  function radarChart() {
    const entries = Object.entries(state.mastery);
    const labels = entries.map((entry) => entry[0]);
    const values = entries.map((entry) => entry[1]);
    const count = entries.length;
    const cx = 132;
    const cy = 126;
    const radius = 82;
    const angleFor = (index) => -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const pointFor = (index, value, r) => {
      const angle = angleFor(index);
      return [cx + Math.cos(angle) * r * (value / 100), cy + Math.sin(angle) * r * (value / 100)];
    };

    const rings = [0.25, 0.5, 0.75, 1].map((level) => {
      const points = Array.from({ length: count }, (_, index) => {
        const angle = angleFor(index);
        return `${cx + Math.cos(angle) * radius * level},${cy + Math.sin(angle) * radius * level}`;
      }).join(" ");
      return `<polygon class="radar-grid" points="${points}"></polygon>`;
    }).join("");

    const axes = Array.from({ length: count }, (_, index) => {
      const angle = angleFor(index);
      return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${cx + Math.cos(angle) * radius}" y2="${cy + Math.sin(angle) * radius}"></line>`;
    }).join("");

    const shapePoints = values.map((value, index) => pointFor(index, value, radius).join(",")).join(" ");
    const dots = values.map((value, index) => {
      const [x, y] = pointFor(index, value, radius);
      return `<circle class="radar-point" cx="${x}" cy="${y}" r="3.2"></circle>`;
    }).join("");

    const texts = labels.map((label, index) => {
      const angle = angleFor(index);
      const lx = cx + Math.cos(angle) * (radius + 30);
      const ly = cy + Math.sin(angle) * (radius + 31);
      let anchor = "middle";
      if (Math.cos(angle) > 0.28) anchor = "start";
      if (Math.cos(angle) < -0.28) anchor = "end";
      const dy = Math.sin(angle) > 0.55 ? 6 : Math.sin(angle) < -0.55 ? -4 : 0;
      return `<text class="radar-label" x="${lx}" y="${ly + dy}" text-anchor="${anchor}">${esc(label)}<tspan x="${lx}" dy="11" class="radar-score">${values[index]}%</tspan></text>`;
    }).join("");

    return `
      <svg viewBox="0 0 264 252" role="img" aria-label="知识点掌握雷达图">
        ${rings}
        ${axes}
        <polygon class="radar-shape" points="${shapePoints}"></polygon>
        ${dots}
        ${texts}
        <circle class="radar-center" cx="${cx}" cy="${cy}" r="17"></circle>
        <text class="radar-center-text" x="${cx}" y="${cy + 2}" text-anchor="middle">掌握度</text>
      </svg>
    `;
  }

  /* ------------------------------------------------------------------------
     Views: home
     ------------------------------------------------------------------------ */

  function renderKidHome() {
    const todayTasks = getTodayTasks();
    const doneCount = todayTasks.filter((task) => task.done).length;
    const thinkingModule = nextThinkingModule(state.profile.grade);
    const thinkingDone = thinkingModule && thinkingDoneIds().includes(thinkingModule.id);
    const taskMarkup = todayTasks.length
      ? todayTasks.map((task) => `
          <button class="kid-task ${task.done ? "done" : ""}" type="button" data-task-toggle="${task.id}" aria-checked="${task.done}" role="checkbox">
            <span class="kid-task-check">${icon("check")}</span>
            <span class="kid-task-copy"><strong>${esc(task.title)}</strong><span>${esc(task.meta)}</span></span>
            <span class="kid-task-time">${esc(task.time)}</span>
          </button>
        `).join("")
      : `<div class="kid-empty">
          <p>今天还没有任务。可以先加一件 10 分钟的小事。</p>
          <button class="btn btn-primary btn-sm" type="button" data-action="add-task">${icon("plus")}添加任务</button>
        </div>`;

    return `
      <section class="kid-welcome">
        <div class="kid-welcome-copy">
          <h2>${greeting()}，${esc(profileName())} <span class="wave">👋</span></h2>
          <p>今天想先做什么？选一个就好，不用一次全部做完。</p>
        </div>
        <button class="kid-child-button" type="button" data-action="open-children" aria-label="切换孩子">
          <span class="kid-child-avatar">${esc(profileInitial())}</span>
          <span class="kid-child-copy"><strong>${esc(state.profile.name || profileName())}</strong><span>${esc(state.profile.grade || SAMPLE_GRADE)} · 切换</span></span>
          ${icon("chevron-down")}
        </button>
      </section>

      ${thinkingModule ? `
        <section class="kid-hero">
          <div class="kid-hero-copy">
            <span class="kid-pill">${icon("lightbulb")}${thinkingDone ? "今天再想一遍" : "今日思维挑战"}</span>
            <h3>${esc(thinkingModule.title)}</h3>
            <div class="kid-hero-meta">
              <span>${esc(thinkingModule.tag)}</span><span class="dot"></span><span>${esc(thinkingModule.gradeLabel)}</span><span class="dot"></span><span>约 ${thinkingModule.minutes} 分钟</span>
            </div>
            <div class="kid-hero-actions">
              <button class="btn btn-primary" type="button" data-action="start-thinking" data-id="${thinkingModule.id}">${icon("play")}${thinkingDone ? "再想一遍" : "开始想一想"}</button>
              <button class="btn btn-soft" type="button" data-action="go-thinking">${icon("grid")}全部挑战</button>
            </div>
          </div>
          <div class="kid-hero-art" aria-hidden="true">
            <div class="kid-fraction-card kid-think-card">
              <span class="kid-fraction-label">THINK / TODAY</span>
              <span class="kid-think-mark">?</span>
              <span class="kid-fraction-note">${icon("lightbulb")}${esc(thinkingModule.bigIdea)}</span>
            </div>
          </div>
        </section>
      ` : ""}

      <section class="kid-section">
        <div class="kid-section-head">
          <h3>今天做什么？</h3>
          <span>四个入口，点一下就能开始</span>
        </div>
        <div class="kid-action-grid">
          <button class="kid-action tone-mint" type="button" data-action="go-sync">
            <span class="kid-action-icon">${icon("book")}</span>
            <span class="kid-action-text"><strong>同步课堂</strong><span>跟着课本学一课</span></span>
          </button>
          <button class="kid-action tone-blue" type="button" data-action="open-ai">
            <span class="kid-action-icon">${icon("sparkles")}</span>
            <span class="kid-action-text"><strong>问小思</strong><span>不会的，先问一句</span></span>
          </button>
          <button class="kid-action tone-coral" type="button" data-action="go-homework">
            <span class="kid-action-icon">${icon("scan")}</span>
            <span class="kid-action-text"><strong>作业批改</strong><span>拍一拍，看看哪里错</span></span>
          </button>
          <button class="kid-action tone-amber" type="button" data-action="go-mistakes">
            <span class="kid-action-icon">${icon("notebook")}</span>
            <span class="kid-action-text"><strong>错题本</strong><span>把不会的变成会</span></span>
          </button>
        </div>
      </section>

      <section class="kid-section">
        <div class="kid-section-head">
          <h3>今日任务</h3>
          <div class="kid-section-tools">
            <span>${doneCount} / ${todayTasks.length || 0} 已完成</span>
            <button class="btn btn-sm btn-soft" type="button" data-action="add-task">${icon("plus")}添加</button>
          </div>
        </div>
        <div class="kid-task-list">${taskMarkup}</div>
      </section>

      <section class="kid-section">
        <div class="kid-section-head">
          <h3>更多</h3>
          <span>需要的时候再用</span>
        </div>
        <div class="kid-more-grid">
          <button class="kid-more" type="button" data-action="go-plan">${icon("calendar")}学习计划</button>
          <button class="kid-more" type="button" data-action="open-plan-focus">${icon("clock")}专注计时</button>
          <button class="kid-more" type="button" data-action="go-enrich">${icon("palette")}素养中心</button>
          <button class="kid-more" type="button" data-action="quick-mental">${icon("zap")}口算挑战</button>
          <button class="kid-more" type="button" data-action="quick-poem">${icon("quote")}古诗背诵</button>
          <button class="kid-more" type="button" data-action="quick-dictation">${icon("headphones")}单词听写</button>
        </div>
      </section>
    `;
  }

  function renderHome() {
    if (isSimpleMode()) return renderKidHome();
    const todayTasks = getTodayTasks();
    const doneCount = todayTasks.filter((task) => task.done).length;
    const taskPercent = todayTasks.length ? Math.round((doneCount / todayTasks.length) * 100) : 0;
    const average = masteryAverage();
    const weak = Object.entries(state.mastery)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);

    const taskMarkup = todayTasks.length
      ? todayTasks.map((task) => `
          <div class="task-item ${task.done ? "done" : ""}" data-task-toggle="${task.id}" role="checkbox" aria-checked="${task.done}" tabindex="0">
            <span class="task-check">${icon("check")}</span>
            <span class="task-main">
              <strong>${esc(task.title)}</strong>
              <span>${esc(task.meta)}</span>
            </span>
            <span class="task-time">${esc(task.time)}</span>
          </div>
        `).join("")
      : `<div class="empty-state" style="min-height:140px;padding:18px"><p>今天还没有安排任务，去学习计划里添加一项吧。</p></div>`;

    return `
      <section class="welcome-row">
        <div class="welcome-copy">
          <h2>${greeting()}，${esc(profileName())} <span class="wave">👋</span></h2>
          <p>今天也一起，把“不会”变成“原来如此”。AI 已经为你整理好了一条轻量的学习路径。</p>
        </div>
        <div class="welcome-meta">
          <div class="streak-badge">
            <span>${icon("flame")}</span>
            <div><strong>连续学习 ${state.profile.streak} 天</strong><small>再坚持 1 天，解锁新徽章</small></div>
          </div>
          <div class="date-chip">${icon("calendar")}本周第 ${todayOffset() + 1} 天</div>
        </div>
      </section>

      <div class="bento-grid">
        <article class="hero-card">
          <div class="hero-copy">
            <span class="hero-eyebrow">${icon("sparkles")}AI 已为你规划 · ${isSampleContent("math") ? "示例课程" : "继续学习"}</span>
            <h3>分数的意义<br>和<em>除法</em>，其实很简单</h3>
            <div class="hero-subject">
              <span>数学 · ${esc(textbookVersion("math"))}</span><span class="dot"></span><span>第 2 课时</span>
            </div>
            <div class="hero-meta-row">
              <span class="hero-progress"><span style="width:72%"></span></span>
              <strong>72%</strong>
              <span>还剩约 8 分钟</span>
            </div>
            <div class="hero-actions">
              <button class="btn btn-accent" type="button" data-action="open-lesson" data-subject="math" data-lesson="m2">${icon("play")}继续学习</button>
              <button class="btn btn-ghost-light" type="button" data-action="jump-plan">查看今日路径${icon("arrow-right")}</button>
            </div>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div class="hero-orbit">
              <i class="orbit-dot one"></i>
              <i class="orbit-dot two"></i>
            </div>
            <div class="hero-note">
              <div class="hero-note-top"><span>Today / Math</span>${icon("sparkles")}</div>
              <div class="fraction-big">
                <span>3</span>
                <span class="fraction-stack"><i></i><span>4</span></span>
                <span style="font-size:19px;color:#477c74">=</span>
                <span style="font-size:25px">0.75</span>
              </div>
              <div class="hero-note-bottom">${icon("check")}被除数 ÷ 除数 = 被除数/除数</div>
            </div>
            <span class="float-chip one">${icon("zap")}AI 讲题</span>
            <span class="float-chip two">${icon("lightbulb")}先想再做</span>
            <span class="float-chip three">${icon("star")}已掌握 6 个知识点</span>
          </div>
        </article>

        <article class="panel today-panel" id="today-plan">
          <div class="today-head">
            <div>
              <h3>${icon("list-check")}今日计划</h3>
              <p>${WEEKDAYS[new Date().getDay()]} · 轻量 ${todayTasks.length || 4} 步，稳稳向前</p>
            </div>
            <span class="today-count">${doneCount}<small>/ ${todayTasks.length || 4}</small></span>
          </div>
          <div class="task-list">${taskMarkup}</div>
          <div class="today-foot">
            <span class="today-ring" style="--pct:${taskPercent}%"><span>${taskPercent}%</span></span>
            <div class="today-foot-copy">
              <strong>今日专注 ${state.todayMinutes} 分钟</strong>
              <span>完成 ${doneCount} 项 · 目标 ${state.parent.dailyLimit} 分钟</span>
            </div>
            <button class="btn btn-soft" type="button" data-action="open-plan-focus">${icon("clock")}专注</button>
          </div>
        </article>

        <article class="panel quick-panel">
          <div class="panel-head">
            <div>
              <h3 class="panel-title">${icon("grid")}快捷工具</h3>
              <p class="panel-sub">把今天最需要的那一个，放到手边</p>
            </div>
            <span class="chip chip-mint">${icon("sparkles")}AI 辅助</span>
          </div>
          <div class="quick-grid">
            ${DATA.quickTools.map((tool) => `
              <button class="quick-tool tone-${tool.tone}" type="button" data-action="${tool.action}">
                <span class="quick-icon">${icon(tool.icon)}</span>
                <span><strong>${esc(tool.title)}</strong><span>${esc(tool.sub)}</span></span>
              </button>
            `).join("")}
          </div>
          <div class="quick-foot">
            ${icon("lightbulb")}
            <span><strong>小思建议</strong> 先完成数学错题复习，再做语文阅读。</span>
            <button class="link-button" type="button" data-action="open-ai">问问为什么${icon("arrow-right")}</button>
          </div>
        </article>

        <article class="panel ai-panel">
          <div class="ai-title-row">
            <span class="ai-avatar">${icon("sparkles")}</span>
            <div>
              <strong>小思 · AI 老师</strong>
              <span>在线 · 只给思路，不直接喂答案</span>
            </div>
            <span class="ai-online"><i class="dot"></i>在线</span>
          </div>
          <div class="ai-bubble">
            我注意到你在 <strong>「分数应用」</strong> 上停了两次。要不要用 3 分钟，把“单位 1”彻底理清？
          </div>
          <div class="ai-suggestions">
            <button class="ai-suggestion" type="button" data-ai-prompt="分数应用题怎么找单位“1”？">讲讲单位 1</button>
            <button class="ai-suggestion" type="button" data-ai-prompt="给我出一道分数应用题的变式题">出题练一练</button>
            <button class="ai-suggestion" type="button" data-action="open-ai">打开对话</button>
          </div>
          <div class="ai-foot">${icon("lock")}本次对话只保存在本机浏览器</div>
        </article>

        <article class="panel courses-panel">
          <div class="panel-head" style="align-items:center;margin-bottom:12px">
            <div>
              <h3 class="panel-title">${icon("book")}我的同步课程</h3>
              <p class="panel-sub">跟着课本节奏，一课一课扎实走</p>
            </div>
            <button class="link-button" type="button" data-action="go-sync">全部课程${icon("arrow-right")}</button>
          </div>
          <div class="course-grid">
            ${DATA.courses.map((course) => `
              <button class="course-card ${subjectClass(course.color)}" type="button" data-action="open-course" data-subject="${course.id}">
                ${subjectIcon(course.color)}
                <span class="course-copy">
                  <span class="course-copy-top"><strong>${esc(course.title)}</strong><span>${esc(course.subject)}</span></span>
                  <span class="course-lesson">${esc(course.lesson)}</span>
                  <span class="course-progress"><span class="progress"><span style="width:${course.progress}%"></span></span><span>${course.progress}%</span></span>
                </span>
                <span class="course-arrow">${icon("chevron-right")}</span>
              </button>
            `).join("")}
          </div>
        </article>

        <article class="panel precision-panel">
          <div class="panel-head">
            <div>
              <h3 class="panel-title">${icon("target")}AI 精准学</h3>
              <p class="panel-sub">只练不会的，把时间花在刀刃上</p>
            </div>
            <span class="chip chip-amber">基础模式</span>
          </div>
          <div class="precision-body">
            <div class="mastery-donut" style="--mastery:${average}">
              <div class="mastery-donut-copy"><strong>${average}<small>%</small></strong><span>综合掌握</span></div>
            </div>
            <div class="weak-list">
              ${weak.map(([label, value]) => `
                <div class="weak-row">
                  <span>${esc(label)}</span><b>${value}%</b>
                  <span class="progress progress-coral"><span style="width:${value}%"></span></span>
                </div>
              `).join("")}
            </div>
          </div>
          <div class="precision-foot">
            <span>薄弱点：${esc(weak[0][0])}</span>
            <button class="link-button" type="button" data-action="go-precision">去提升${icon("arrow-right")}</button>
          </div>
        </article>
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     Views: sync classroom
     ------------------------------------------------------------------------ */

  function activeLessonId(subjectId) {
    const set = DATA.lessons[subjectId];
    if (!set) return "";
    return state.currentLessons[subjectId] || set.currentId;
  }

  function lessonStatus(lesson, subjectId) {
    if (state.learned.includes(lesson.id)) return "done";
    if (lesson.id === activeLessonId(subjectId)) return "current";
    return lesson.state;
  }

  function renderSync() {
    const subject = DATA.subjects.find((item) => item.id === ui.syncSubject) || DATA.subjects[1];
    const lessonSet = DATA.lessons[subject.id];
    const allLessons = lessonSet.units.flatMap((unit) => unit.lessons);
    const currentId = activeLessonId(subject.id);
    const currentLesson = allLessons.find((lesson) => lesson.id === currentId) || allLessons[0];
    const sideTips = {
      chinese: ["把故事讲给家人听", "创造性复述不是背诵。试着换一个视角，把海力布的心理活动补出来，故事会立刻活起来。"],
      math: ["先画图，再列式", "分数与除法的关系，用一条线段就能看明白。把 3 个饼平均分给 4 个人，每人到底拿到多少？"],
      english: ["开口，比完美更重要", "先用 can 说出三件你会做的事，不用害怕语法。说顺了，再回来校正 the 和动词形式。"],
      science: ["先猜，再做，再记录", "做影子的实验时，只改变一个条件。控制变量，才能知道是谁让影子发生了变化。"]
    };
    const tip = sideTips[subject.id] || sideTips.math;

    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("book")}SYNC CLASSROOM</span>
          <h2>同步课堂</h2>
          <p>紧贴课本进度，把“课前预习—课中学习—课后练习”串成一条完整的学习闭环。</p>
        </div>
        <div class="page-actions">
          ${isSampleContent(subject.id) ? `<span class="chip chip-amber">${icon("info")}课程库：示例内容</span>` : ""}
          <span class="chip">${icon("calendar")}本周进度 ${subject.progress}%</span>
          <button class="btn btn-soft" type="button" data-action="go-precision">${icon("target")}学情诊断</button>
        </div>
      </div>

      <div class="subject-tabs-row">
        <div class="subject-switcher" role="tablist" aria-label="选择学科">
          ${DATA.subjects.map((item) => `
            <button class="subject-tab ${subjectClass(item.id)} ${item.id === subject.id ? "is-active" : ""}" type="button" role="tab" aria-selected="${item.id === subject.id}" data-sync-subject="${item.id}">
              ${icon(item.icon)}${item.name}
            </button>
          `).join("")}
        </div>
        <span class="right-meta">${icon("pin")}${esc(textbookVersion(subject.id))}</span>
      </div>

      <div class="sync-layout">
        <div class="sync-main">
          <section class="sync-hero ${subjectClass(subject.id)}">
            <div class="sync-hero-copy">
              <span class="eyebrow">${icon("sparkles")}正在学习 · ${esc(subject.unit)}</span>
              <h3>${esc(currentLesson.title)}</h3>
              <p>${esc(subject.today)}。小思会在你卡住时递一个提示，而不是直接替你写完。</p>
              <div class="sync-hero-meta">
                <span>${icon("clock")}约 18 分钟</span>
                <span>${icon("play")}第 ${lessonSet.units[0].lessons.findIndex((item) => item.id === currentLesson.id) + 1} 课时</span>
                <span>${icon("target")}本节课重点</span>
              </div>
              <div class="sync-hero-actions">
                <button class="btn btn-primary" type="button" data-action="open-lesson" data-subject="${subject.id}" data-lesson="${currentLesson.id}">${icon("play")}继续学习</button>
                <button class="btn btn-soft" type="button" data-action="subject-plan" data-subject="${subject.id}">加入今日计划</button>
              </div>
            </div>
            <div class="sync-art" aria-hidden="true">
              <div class="lesson-stack">
                <div class="lesson-stack-inner">
                  <span class="tag">${esc(subject.name)} · 第 ${lessonSet.units[0].lessons.findIndex((item) => item.id === currentLesson.id) + 1} 课</span>
                  <strong>${esc(currentLesson.title.replace(/《|》/g, ""))}</strong>
                  <p>${esc(subject.today)}</p>
                  <div class="stack-lines"><i></i><i></i><i></i></div>
                </div>
              </div>
            </div>
          </section>

          <section class="panel unit-panel ${subjectClass(subject.id)}">
            <div class="panel-head" style="align-items:center;margin-bottom:13px">
              <div>
                <h3 class="panel-title">${icon("book")}课本目录</h3>
                <p class="panel-sub">内容与当前教材版本同步 · 支持课前预习与课后复习</p>
              </div>
              <span class="chip">${lessonSet.units.length} 个单元</span>
            </div>
            ${lessonSet.units.map((unit, unitIndex) => `
              <div class="unit-block">
                <div class="unit-head">
                  <strong><span class="unit-index">${String(unitIndex + 1).padStart(2, "0")}</span>${esc(unit.title)}</strong>
                  <span>${esc(unit.meta)}</span>
                </div>
                <div class="lesson-list">
                  ${unit.lessons.map((lesson, lessonIndex) => {
                    const status = lessonStatus(lesson, subject.id);
                    return `
                      <div class="lesson-row ${status === "current" ? "current" : ""} ${status === "done" ? "done" : ""}" ${status === "locked" ? 'data-action="locked-lesson"' : `data-action="open-lesson" data-subject="${subject.id}" data-lesson="${lesson.id}"`} role="button" tabindex="0">
                        <span class="lesson-index">${status === "done" ? icon("check") : String(lessonIndex + 1).padStart(2, "0")}</span>
                        <span class="lesson-copy"><strong>${esc(lesson.title)}</strong><span>${esc(lesson.meta)}</span></span>
                        <span class="lesson-state">
                          ${status === "locked" ? `${icon("lock")}待解锁` : status === "done" ? "已完成" : status === "current" ? `<span class="mini-play">${icon("play")}</span>继续` : `开始${icon("chevron-right")}`}
                        </span>
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            `).join("")}
          </section>
        </div>

        <aside class="sync-aside">
          <section class="panel sync-side-card">
            <div class="panel-head" style="margin-bottom:4px">
              <div>
                <h3 class="panel-title">${icon("chart")}本周学习</h3>
                <p class="panel-sub">${esc(subject.name)} · 近 7 天</p>
              </div>
              <span class="chip chip-mint">稳定中</span>
            </div>
            <div class="sync-stat">
              <span class="sync-stat-label">${icon("clock")}累计学习</span>
              <strong>2<small>小时</small> 18<small>分</small></strong>
            </div>
            <div class="sync-stat">
              <span class="sync-stat-label">${icon("check")}完成课时</span>
              <strong>${subject.done}<small>/ ${subject.total}</small></strong>
            </div>
            <div class="sync-stat">
              <span class="sync-stat-label">${icon("target")}练习正确率</span>
              <strong>86<small>%</small></strong>
            </div>
            <div class="textbook-card">
              <span>当前教材</span>
              <strong>${esc(textbookVersion(subject.id))}</strong>
              <p>${isSampleContent(subject.id) ? "界面已匹配所选教材 · 课程内容为示例" : "已同步至 2026 年 11 月 · 内容更新完成"}</p>
            </div>
          </section>

          <section class="tip-card">
            <span class="tip-icon">${icon("lightbulb")}</span>
            <strong>${esc(tip[0])}</strong>
            <p>${esc(tip[1])}</p>
            <button class="link-button" type="button" data-action="open-ai">请小思展开讲讲${icon("arrow-right")}</button>
          </section>
        </aside>
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     Views: thinking quests
     ------------------------------------------------------------------------ */

  function renderThinking() {
    const modules = thinkingModulesForGrade(state.profile.grade);
    const completed = thinkingDoneIds();
    const active = nextThinkingModule(state.profile.grade);
    const allDone = modules.every((module) => completed.includes(module.id));
    const bandLabel = modules[0] ? modules[0].gradeLabel : "小学";
    const completedCount = modules.filter((module) => completed.includes(module.id)).length;

    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("lightbulb")}THINKING QUEST</span>
          <h2>思维闯关</h2>
          <p>不背答案，练“怎么想”。先读懂，再拆解，再验证，最后讲出来。</p>
        </div>
        <div class="page-actions">
          <span class="chip chip-mint">${icon("award")}已完成 ${completedCount} / ${modules.length}</span>
          <span class="chip">${esc(bandLabel)} · 匹配当前年级</span>
        </div>
      </div>

      ${active ? `
        <section class="thinking-hero">
          <div class="thinking-hero-copy">
            <span class="thinking-kicker">${icon("sparkles")}${allDone ? "复习挑战" : "今日思维挑战"}</span>
            <h2>${esc(active.title)}</h2>
            <p>${esc(active.intro)}</p>
            <div class="thinking-meta">
              <span>${icon("target")}${esc(active.tag)}</span>
              <span>${icon("clock")}约 ${active.minutes} 分钟</span>
              <span>${icon("lightbulb")}${esc(active.bigIdea)}</span>
            </div>
            <button class="btn btn-primary btn-lg" type="button" data-action="start-thinking" data-id="${active.id}">
              ${icon("play")}${allDone ? "再想一遍" : "开始想一想"}
            </button>
          </div>
          <div class="thinking-hero-art" aria-hidden="true">
            <span class="thinking-art-mark">?</span>
            <span class="thinking-art-line">先想 · 再做</span>
            <span class="thinking-art-dot one"></span>
            <span class="thinking-art-dot two"></span>
          </div>
        </section>
      ` : ""}

      <section class="thinking-method">
        <div class="thinking-method-title"><span>${icon("compass")}一套固定的思考顺序</span><small>每道题都这样走</small></div>
        <div class="thinking-method-steps">
          <div class="thinking-method-step"><b>1</b><strong>读懂</strong><span>用自己的话说题意</span></div>
          <div class="thinking-method-step"><b>2</b><strong>拆解</strong><span>找条件、画图、列式</span></div>
          <div class="thinking-method-step"><b>3</b><strong>验证</strong><span>回头检查，换法验证</span></div>
          <div class="thinking-method-step"><b>4</b><strong>表达</strong><span>讲出“为什么”</span></div>
        </div>
      </section>

      <section class="thinking-list-section">
        <div class="section-head">
          <div><h3>${esc(bandLabel)}的思维题</h3><p>每道题都按“提示 → 尝试 → 讲出来”走</p></div>
          <span class="chip">${modules.length} 个挑战</span>
        </div>
        <div class="thinking-grid">
          ${modules.map((module) => {
            const done = completed.includes(module.id);
            return `
              <button class="thinking-card tone-${module.tone} ${done ? "is-done" : ""}" type="button" data-action="start-thinking" data-id="${module.id}">
                <span class="thinking-card-top">
                  <span class="thinking-card-icon">${icon(module.icon)}</span>
                  <span class="thinking-card-state">${done ? `${icon("check")}已完成` : "开始"}</span>
                </span>
                <strong>${esc(module.title)}</strong>
                <span class="thinking-card-idea">${esc(module.bigIdea)}</span>
                <span class="thinking-card-foot"><span>${esc(module.tag)}</span><span>约 ${module.minutes} 分钟</span></span>
              </button>
            `;
          }).join("")}
        </div>
      </section>

      <section class="thinking-parent-tip">
        ${icon("lightbulb")}
        <div><strong>给家长的一句话</strong><p>孩子做错时，先问“你当时是怎么想的”，再让他自己读一遍题目。不要急着讲正确答案；这道题的价值在于把思路说出来。</p></div>
      </section>
    `;
  }

  function openThinking(moduleId) {
    const module = THINKING_MODULES.find((item) => item.id === moduleId);
    if (!module) return;
    ui.thinking = {
      moduleId,
      step: 0,
      selected: null,
      checked: false,
      correct: false,
      hintShown: false,
      reflection: "",
      done: false
    };
    renderThinkingSession();
  }

  function thinkingAnswerValue(value) {
    return String(value == null ? "" : value).trim().replace(/\s/g, "").replace(/[人个只条米]/g, "");
  }

  function renderThinkingSession() {
    const session = ui.thinking;
    if (!session) return;
    const module = THINKING_MODULES.find((item) => item.id === session.moduleId);
    if (!module) return;

    if (session.done) {
      const reflection = session.reflection || "我先读懂题意，再找条件，最后检查。";
      openModal(modalShell(
        "思维闯关 · 完成",
        "这一题，你想明白了",
        `
          <div class="thinking-result">
            <span class="thinking-result-icon">${icon("award")}</span>
            <p class="thinking-result-kicker">${esc(module.tag)} · ${esc(module.gradeLabel)}</p>
            <h3>${esc(module.summary.method)}</h3>
            <p>${esc(module.summary.transfer)}</p>
            <div class="thinking-method-card">
              <span>把方法带走</span>
              ${module.summary.points.map((point, index) => `<div><b>${index + 1}</b>${esc(point)}</div>`).join("")}
            </div>
            <div class="thinking-reflection-card">
              <span>你的原话</span>
              <blockquote>${esc(reflection)}</blockquote>
              <small>能把思路讲出来，比只做对更重要。</small>
            </div>
          </div>
        `,
        `<button class="btn btn-soft" type="button" data-action="thinking-next-module">${icon("rotate")}再练一个</button><button class="btn btn-primary" type="button" data-action="thinking-close">回到思维闯关</button>`,
        "modal-lg"
      ));
      return;
    }

    const step = module.steps[session.step];
    const isLast = session.step === module.steps.length - 1;
    const isChoice = step.type === "choice";
    const isNumber = step.type === "number";
    const isReflect = step.type === "reflect";
    const progress = ((session.step + (session.checked && !isReflect ? 0.5 : 0)) / module.steps.length) * 100;
    let answerBlock = "";

    if (isChoice) {
      answerBlock = `
        <div class="think-options">
          ${step.options.map((option, index) => {
            let cls = "";
            if (session.checked) {
              if (index === step.answer) cls = "is-correct";
              else if (index === session.selected) cls = "is-wrong";
              else cls = "is-faded";
            }
            return `<button class="think-option ${cls}" type="button" data-action="thinking-answer" data-index="${index}" ${session.checked ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`;
          }).join("")}
        </div>
      `;
    } else if (isNumber) {
      answerBlock = `
        <div class="think-number">
          <input id="thinking-number" inputmode="decimal" autocomplete="off" value="${esc(session.selected || "")}" placeholder="${esc(step.placeholder || "填写答案")}" aria-label="填写答案">
          ${!session.checked ? `<button class="btn btn-primary" type="button" data-action="thinking-number-check">${icon("check")}检查一下</button>` : ""}
        </div>
      `;
    } else {
      answerBlock = `
        <div class="think-reflect">
          <textarea id="thinking-reflection" rows="4" maxlength="240" placeholder="${esc(step.placeholder || "用你自己的话说一说…")}">${esc(session.reflection || "")}</textarea>
          <div class="think-reflect-foot">
            <span>不用写标准答案，写出你的真实想法。</span>
            <button class="btn btn-primary" type="button" data-action="thinking-reflect-submit">${isLast ? `${icon("check")}完成挑战` : `${icon("arrow-right")}下一步`}</button>
          </div>
        </div>
      `;
    }

    const feedback = session.checked
      ? `
        <div class="think-feedback ${session.correct ? "" : "is-wrong"}">
          <span class="think-feedback-icon">${icon(session.correct ? "check" : "lightbulb")}</span>
          <div>
            <strong>${session.correct ? "想对了，记住这个思路" : "还差一点，再想一想"}</strong>
            <p>${esc(session.correct ? step.explain : step.hint)}</p>
          </div>
        </div>
      `
      : "";

    openModal(`
      <div class="thinking-session-head">
        <div>
          <p class="thinking-session-kicker">思维闯关 · ${esc(module.gradeLabel)}</p>
          <h2>${esc(module.title)}</h2>
        </div>
        <button class="modal-close" type="button" data-close-modal aria-label="关闭">${icon("x")}</button>
      </div>
      <div class="thinking-session-progress">
        <span style="width:${progress}%"></span>
        <b>第 ${session.step + 1} / ${module.steps.length} 步</b>
        <small>${esc(step.stage)}</small>
      </div>
      <div class="thinking-session-body">
        <span class="think-stage">${icon("compass")}${esc(step.stage)}</span>
        <h3>${esc(step.title)}</h3>
        <p class="think-prompt">${esc(step.prompt)}</p>
        ${answerBlock}
        ${feedback}
        ${session.hintShown ? `<div class="think-hint">${icon("lightbulb")}<span><strong>提示：</strong>${esc(step.hint)}</span></div>` : ""}
      </div>
      <div class="thinking-session-foot">
        <button class="btn btn-soft" type="button" data-action="thinking-hint">${icon("lightbulb")}给我一个提示</button>
        <div class="thinking-foot-actions">
          ${isReflect ? "" : session.checked && !session.correct ? `<button class="btn btn-soft" type="button" data-action="thinking-retry">${icon("rotate")}再试一次</button>` : ""}
          ${isReflect ? "" : session.checked && session.correct ? `<button class="btn btn-primary" type="button" data-action="thinking-next">${isLast ? `${icon("check")}完成挑战` : `下一步${icon("arrow-right")}`}</button>` : ""}
        </div>
      </div>
    `, "modal-lg");

    const reflectionInput = $("#thinking-reflection");
    if (reflectionInput) {
      reflectionInput.addEventListener("input", () => {
        session.reflection = reflectionInput.value;
      });
    }
    const numberInput = $("#thinking-number");
    if (numberInput) {
      numberInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          checkThinkingNumber();
        }
      });
    }
  }

  function answerThinking(index) {
    const session = ui.thinking;
    if (!session || session.checked) return;
    const module = THINKING_MODULES.find((item) => item.id === session.moduleId);
    const step = module.steps[session.step];
    session.selected = index;
    session.checked = true;
    session.correct = index === step.answer;
    renderThinkingSession();
  }

  function checkThinkingNumber() {
    const session = ui.thinking;
    if (!session || session.checked) return;
    const module = THINKING_MODULES.find((item) => item.id === session.moduleId);
    const step = module.steps[session.step];
    const input = $("#thinking-number");
    const value = input ? input.value : "";
    if (!String(value).trim()) {
      if (input) input.focus();
      toast("先写一个答案", "写下你算出来的结果，再检查。", "warn");
      return;
    }
    session.selected = value;
    session.checked = true;
    session.correct = thinkingAnswerValue(value) === thinkingAnswerValue(step.answer);
    renderThinkingSession();
  }

  function nextThinkingStep() {
    const session = ui.thinking;
    if (!session || !session.checked || !session.correct) return;
    const module = THINKING_MODULES.find((item) => item.id === session.moduleId);
    if (session.step >= module.steps.length - 1) {
      completeThinking();
      return;
    }
    session.step += 1;
    session.selected = null;
    session.checked = false;
    session.correct = false;
    session.hintShown = false;
    renderThinkingSession();
  }

  function retryThinking() {
    const session = ui.thinking;
    if (!session) return;
    session.checked = false;
    session.correct = false;
    session.selected = null;
    renderThinkingSession();
  }

  function showThinkingHint() {
    const session = ui.thinking;
    if (!session) return;
    if (!session.hintShown) {
      session.hintShown = true;
      state.thinking = state.thinking || { completed: [], reflections: [], hintsUsed: 0 };
      state.thinking.hintsUsed = Number(state.thinking.hintsUsed || 0) + 1;
      saveState();
    }
    renderThinkingSession();
  }

  function submitReflection() {
    const session = ui.thinking;
    if (!session) return;
    const input = $("#thinking-reflection");
    const text = input ? input.value.trim() : session.reflection.trim();
    if (text.length < 2) {
      if (input) input.focus();
      toast("再多说一点", "用一句话说说你是怎么想的。", "warn");
      return;
    }
    session.reflection = text;
    completeThinking();
  }

  function completeThinking() {
    const session = ui.thinking;
    if (!session) return;
    const module = THINKING_MODULES.find((item) => item.id === session.moduleId);
    state.thinking = state.thinking || { completed: [], reflections: [], hintsUsed: 0 };
    if (!Array.isArray(state.thinking.completed)) state.thinking.completed = [];
    if (!Array.isArray(state.thinking.reflections)) state.thinking.reflections = [];
    const isNew = !state.thinking.completed.includes(module.id);
    if (isNew) {
      state.thinking.completed.push(module.id);
      state.xp += 20;
    }
    if (session.reflection) {
      state.thinking.reflections.push({
        moduleId: module.id,
        text: session.reflection,
        date: new Date().toISOString()
      });
    }
    saveState();
    session.done = true;
    renderThinkingSession();
    if (isNew) toast("思维挑战完成", "你把方法讲出来了，获得 20 经验值。", "award");
  }

  function startNextThinkingModule() {
    const modules = thinkingModulesForGrade(state.profile.grade);
    const next = modules.find((module) => !thinkingDoneIds().includes(module.id)) || modules[0];
    if (next) openThinking(next.id);
  }

  function closeThinking() {
    closeModal();
    ui.thinking = null;
    go("thinking");
    if (currentRoute === "thinking") render({ routeChanged: false });
  }

  /* ------------------------------------------------------------------------
     Views: AI precision
     ------------------------------------------------------------------------ */

  function renderPrecision() {
    const modeCopy = {
      basic: {
        name: "基础巩固",
        desc: "从课本例题出发，先把概念的地基打牢。",
        chip: "基础模式",
        path: ["回到课本例题", "只练 3 道基础题", "用口述检验理解"]
      },
      standard: {
        name: "标准提升",
        desc: "在掌握概念的基础上，加入变式和易错题。",
        chip: "标准模式",
        path: ["补齐 2 个基础漏洞", "AI 专属练 · 6 题", "变式测评 · 5 题"]
      },
      exam: {
        name: "备考冲刺",
        desc: "按单元考点组卷，限时训练，查漏补缺。",
        chip: "备考模式",
        path: ["高频考点速览", "限时专项卷 · 15 题", "错题回炉 · 3 题"]
      }
    }[ui.precisionMode];
    const average = masteryAverage();
    const score = state.diagnostic.score == null ? average : state.diagnostic.score;
    const sorted = Object.entries(state.mastery).sort((a, b) => a[1] - b[1]);
    const weak = sorted.slice(0, 2);
    const strong = sorted.slice(-1)[0];
    const lastDate = state.diagnostic.lastDate || "今天";

    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("target")}AI PRECISION LEARNING</span>
          <h2>AI 精准学</h2>
          <p>用几道题摸清知识底图，只练真正不会的。基础、标准、备考三种模式，对应不同阶段的学习目标。</p>
        </div>
        <div class="page-actions">
          <span class="chip chip-mint">${icon("sparkles")}基于 ${Object.keys(state.mastery).length} 个知识点</span>
          <button class="btn btn-primary" type="button" data-action="start-diagnostic">${icon("play")}开始诊断</button>
        </div>
      </div>

      <div class="mode-bar">
        <div class="segmented" role="tablist" aria-label="精准学模式">
          ${[["basic", "基础巩固"], ["standard", "标准提升"], ["exam", "备考冲刺"]].map(([id, label]) => `
            <button class="${ui.precisionMode === id ? "is-active" : ""}" type="button" role="tab" aria-selected="${ui.precisionMode === id}" data-precision-mode="${id}">${label}</button>
          `).join("")}
        </div>
        <span class="chip">${esc(modeCopy.desc)}</span>
      </div>

      <div class="precision-layout">
        <section class="panel diagnostic-panel">
          <div class="diagnostic-head">
            <div>
              <h3>${icon("chart")}我的知识图谱</h3>
              <p>${state.diagnostic.completed ? "最近一次诊断" : "本周预估"}：${esc(lastDate)} · 5 个知识点 · 预计 5 分钟</p>
            </div>
            <span class="chip chip-${state.diagnostic.completed ? "mint" : "amber"}">${state.diagnostic.completed ? "已更新" : "本周预估"}</span>
          </div>
          <div class="diagnostic-body">
            <div class="radar-wrap">${radarChart()}</div>
            <div class="diagnostic-side">
              <div class="diagnostic-score">
                <span class="score-ring" style="--score:${score}"><strong>${score}</strong></span>
                <div class="score-copy">
                  <strong>${score >= 80 ? "基础扎实，可以挑战变式" : score >= 60 ? "基础不错，应用还需加固" : "建议先回到课本例题"}</strong>
                  <p>最容易丢分的是「${esc(weak[0][0])}」，不是计算，而是没有先找单位“1”。</p>
                </div>
              </div>
              <div class="weak-tag-list">
                ${weak.map(([label]) => `<span class="weak-tag"><i></i>${esc(label)}</span>`).join("")}
                <span class="weak-tag"><i></i>计算习惯</span>
              </div>
              <div class="diagnostic-actions">
                <button class="btn btn-primary" type="button" data-action="start-diagnostic">${icon("play")}5 题诊断</button>
                <button class="btn btn-soft" type="button" data-action="ai-practice">${icon("sparkles")}专属练</button>
              </div>
            </div>
          </div>
        </section>

        <section class="panel mastery-panel">
          <div class="mastery-head">
            <div>
              <h3>知识点掌握</h3>
              <p>数值会根据每次练习动态更新</p>
            </div>
            <span class="chip chip-amber">实时</span>
          </div>
          <div class="mastery-list">
            ${sorted.map(([label, value]) => `
              <div class="mastery-topic">
                <span>${esc(label)}</span><b>${value}%</b>
                <span class="progress ${value < 60 ? "progress-coral" : value < 75 ? "progress-amber" : ""}"><span style="width:${value}%"></span></span>
              </div>
            `).join("")}
          </div>
          <div class="mastery-foot">
            <span>优势：${esc(strong[0])} ${strong[1]}%</span>
            <button class="link-button" type="button" data-action="open-parent-report">查看学情报告${icon("arrow-right")}</button>
          </div>
        </section>
      </div>

      <section class="panel learning-path">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">${icon("sparkles")}AI 专属提升路径</h3>
            <p class="panel-sub">${esc(modeCopy.name)} · 根据你的诊断结果实时更新，完成一步再解锁下一步</p>
          </div>
          <span class="chip chip-mint">${icon("clock")}预计 24 分钟</span>
        </div>
        <div class="path-grid">
          <div class="path-step is-active">
            <span class="path-num">01</span>
            <div class="path-copy">
              <strong>${esc(modeCopy.path[0])}</strong>
              <p>用一条线段图，重新理解“平均分”和“单位 1”的关系。</p>
              <span class="path-meta">现在开始 · 约 8 分钟</span>
            </div>
            <button class="path-go" type="button" data-action="start-diagnostic" aria-label="开始第一步">${icon("arrow-right")}</button>
          </div>
          <div class="path-step">
            <span class="path-num">02</span>
            <div class="path-copy">
              <strong>${esc(modeCopy.path[1])}</strong>
              <p>只做与薄弱点相关的题，做对后立即换一个变式。</p>
              <span class="path-meta locked">完成上一步后解锁</span>
            </div>
            <button class="path-go" type="button" data-action="locked-path" aria-label="待解锁">${icon("lock")}</button>
          </div>
          <div class="path-step is-locked">
            <span class="path-num">03</span>
            <div class="path-copy">
              <strong>${esc(modeCopy.path[2])}</strong>
              <p>用一组短测评检验迁移能力，确认真的掌握。</p>
              <span class="path-meta locked">完成第二步后解锁</span>
            </div>
            <button class="path-go" type="button" data-action="locked-path" aria-label="待解锁">${icon("lock")}</button>
          </div>
        </div>
      </section>
    `;
  }

  /* ------------------------------------------------------------------------
     Views: AI tutor
     ------------------------------------------------------------------------ */

  function ensureChat() {
    if (!state.chat.length) {
      state.chat.push({
        role: "assistant",
        text: `${greeting()}，${profileName()}。我是小思。\n\n今天想先解决哪一道题？你可以直接把题目发给我，也可以告诉我“我卡在哪一步了”。我会先给提示，再陪你一步步走下去。`,
        chips: DATA.aiPrompts,
        time: nowTime()
      });
    }
  }

  function currentChatTopic() {
    const userMessages = state.chat.filter((message) => message.role === "user");
    const last = userMessages.length ? userMessages[userMessages.length - 1].text : "";
    if (/海力布|民间故事|语文/.test(last)) return "《猎人海力布》";
    if (/英语|单词|can you|what can you do/i.test(last)) return "What can you do?";
    if (/影子|科学|光/.test(last)) return "影子的秘密";
    if (/分数|单位/.test(last)) return "分数与除法";
    return "分数与除法";
  }

  function renderTutor() {
    ensureChat();
    const lastAssistant = [...state.chat].reverse().find((message) => message.role === "assistant");
    const topic = currentChatTopic();
    const topicGoal = topic === "《猎人海力布》"
      ? "用海力布的口吻创造性复述故事高潮。"
      : topic === "What can you do?"
        ? "用 can 谈论能力，并完成一段两个人的邀请对话。"
        : topic === "影子的秘密"
          ? "通过控制变量实验，解释影子方向与光源的关系。"
          : "理解分数与除法的关系，会用分数表示整数相除的商。";

    return `
      <div class="page-heading tutor-page-heading">
        <div>
          <span class="eyebrow">${icon("sparkles")}AI TEACHER · 1 ON 1</span>
          <h2>把难题，想明白</h2>
          <p>小思不会直接“喂”答案，而是用提示、追问和变式，陪你把思路走完。</p>
        </div>
        <div class="page-actions">
          <span class="chip chip-mint">${icon("shield")}启发式辅导</span>
          ${state.parent.answerLock ? `<span class="chip chip-amber">${icon("lock")}答案保护已开启</span>` : ""}
          <button class="btn btn-soft" type="button" data-action="clear-chat">${icon("rotate")}新对话</button>
        </div>
      </div>

      <div class="tutor-layout">
        <section class="panel chat-panel">
          <header class="chat-head">
            <span class="ai-avatar">${icon("sparkles")}</span>
            <div class="chat-identity">
              <strong>小思 <span class="dot" style="background:#21c99f"></span></strong>
              <span>在线 · ${esc(state.profile.grade || SAMPLE_GRADE)}全科学习伙伴</span>
            </div>
            <div class="chat-head-tags">
              <span class="chip chip-mint">${icon("lightbulb")}先想再做</span>
              <span class="chip">${icon("lock")}本地对话</span>
              <button class="chat-icon-btn" type="button" data-action="clear-chat" aria-label="清空对话">${icon("trash")}</button>
            </div>
          </header>

          <div class="chat-body" id="chat-body" aria-live="polite">
            ${state.chat.map((message, index) => {
              const isUser = message.role === "user";
              const isLast = message === lastAssistant;
              return `
                <div class="message ${isUser ? "user" : "assistant"}">
                  <span class="message-avatar">${isUser ? "宇" : icon("sparkles")}</span>
                  <div class="message-main">
                    <div class="bubble">${isUser ? esc(message.text).replace(/\n/g, "<br>") : md(message.text)}</div>
                    <div class="message-meta"><span>${isUser ? "我" : "小思"}</span><span>${esc(message.time || "")}</span>${isLast ? `<span>· 仅保存在本机</span>` : ""}</div>
                    ${!isUser && isLast && message.chips && message.chips.length ? `
                      <div class="message-actions">
                        ${message.chips.slice(0, 4).map((chip) => `<button class="message-action" type="button" data-ai-prompt="${esc(chip)}">${icon("sparkles")}${esc(chip)}</button>`).join("")}
                      </div>
                    ` : ""}
                  </div>
                </div>
              `;
            }).join("")}
            ${ui.typing ? `
              <div class="message assistant">
                <span class="message-avatar">${icon("sparkles")}</span>
                <div class="message-main">
                  <div class="bubble typing-bubble"><i></i><i></i><i></i></div>
                </div>
              </div>
            ` : ""}
            ${state.chat.length <= 1 && !ui.typing ? `
              <div class="chat-starters">
                <button class="chat-starter" type="button" data-ai-prompt="这道分数应用题怎么想？先给我一个提示">
                  <span class="chat-starter-icon">${icon("target")}</span>
                  <strong>从一道题开始</strong>
                  <span>把卡住的那道题发给我</span>
                </button>
                <button class="chat-starter" type="button" data-ai-prompt="帮我梳理《猎人海力布》的故事情节">
                  <span class="chat-starter-icon">${icon("book")}</span>
                  <strong>梳理一篇课文</strong>
                  <span>用四步把故事讲清楚</span>
                </button>
                <button class="chat-starter" type="button" data-ai-prompt="Can you help me practice 'I can play the piano'?">
                  <span class="chat-starter-icon">${icon("mic")}</span>
                  <strong>练一句口语</strong>
                  <span>从跟读到自由表达</span>
                </button>
              </div>
            ` : ""}
          </div>

          <div class="chat-quick">
            ${DATA.chatSuggestions.map((prompt) => `<button class="quick-prompt" type="button" data-ai-prompt="${esc(prompt)}">${esc(prompt)}</button>`).join("")}
          </div>

          <div class="chat-composer">
            <div class="composer-shell">
              <textarea id="tutor-input" rows="1" placeholder="把题目或卡住的地方告诉小思…" aria-label="给小思发消息"></textarea>
              <div class="composer-actions">
                <button class="composer-tool" type="button" data-action="voice-note" aria-label="语音输入">${icon("mic")}</button>
                <button class="composer-tool" type="button" data-action="attach-note" aria-label="添加图片">${icon("clip")}</button>
                <button class="composer-send" type="button" data-action="send-message" aria-label="发送">${icon("send")}</button>
              </div>
            </div>
            <p class="composer-note">Enter 发送 · Shift + Enter 换行 · AI 回复仅供学习参考</p>
          </div>
        </section>

        <aside class="tutor-side">
          <section class="panel tutor-context">
            <h3>${icon("target")}本次辅导</h3>
            <div class="context-lesson">
              <small>当前知识点</small>
              <strong>${esc(topic)}</strong>
              <p>${esc(topicGoal)}</p>
            </div>
            <div class="context-list">
              <div class="context-item"><i></i><span><strong>小思会：</strong>先问你怎么想，再给一层提示。</span></div>
              <div class="context-item"><i></i><span><strong>你可以：</strong>随时说“没听懂”，换一种讲法。</span></div>
              <div class="context-item"><i></i><span><strong>目标：</strong>不是做完，而是能讲出为什么。</span></div>
            </div>
          </section>

          <section class="tutor-tip">
            <div class="tip-orbit">
              <span class="tip-orbit-ring"></span>
              <span class="tip-orbit-core">${icon("lightbulb")}</span>
            </div>
            <strong>一个真正有用的提问</strong>
            <p>“我这一步为什么错了？”比“答案是什么？”更能让你进步。描述你的思路，小思才能接住你。</p>
            <span class="chip">${icon("lock")}对话不会上传云端</span>
          </section>
        </aside>
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     Lesson player
     ------------------------------------------------------------------------ */

  let lessonSession = null;

  function findLesson(subjectId, lessonId) {
    const set = DATA.lessons[subjectId];
    if (!set) return null;
    let found = null;
    set.units.forEach((unit) => {
      unit.lessons.forEach((lesson) => {
        if (lesson.id === lessonId) found = { ...lesson, unit: unit.title };
      });
    });
    return found;
  }

  function lessonDetailFor(subjectId, lessonId) {
    const set = DATA.lessons[subjectId];
    const base = set.detail;
    if (lessonId === set.currentId) return base;
    const lesson = findLesson(subjectId, lessonId);
    if (!lesson) return base;
    return {
      ...base,
      goal: `完成「${lesson.title}」的预习、理解与练习。`,
      concept: {
        ...base.concept,
        stage: "课前预习",
        title: lesson.title,
        lead: "这是本节课程的演示内容。先看核心概念，再跟着例题走一遍，最后用一道题检验自己。"
      },
      example: {
        ...base.example,
        title: `${lesson.title} · 例题精讲`
      }
    };
  }

  function openLesson(subjectId, lessonId) {
    const lesson = findLesson(subjectId, lessonId);
    if (!lesson) return;
    lessonSession = { subjectId, lessonId, slide: 0, selected: null, checked: false };
    renderLessonModal();
  }

  function renderLessonModal() {
    if (!lessonSession) return;
    const subject = DATA.subjects.find((item) => item.id === lessonSession.subjectId);
    const lesson = findLesson(lessonSession.subjectId, lessonSession.lessonId);
    const detail = lessonDetailFor(lessonSession.subjectId, lessonSession.lessonId);
    const slide = lessonSession.slide;
    const progress = ((slide + 1) / 3) * 100;
    let body = "";

    if (slide === 0) {
      const visual = detail.concept.visual;
      body = `
        <div class="lesson-slide">
          <span class="lesson-stage">${icon("lightbulb")}${esc(detail.concept.stage)}</span>
          <h3>${esc(detail.concept.title)}</h3>
          <p>${esc(detail.concept.lead)}</p>
          <div class="lesson-visual ${visual ? "" : "single"}">
            <div class="lesson-callout">
              <strong>${esc(detail.concept.calloutTitle)}</strong>
              <p>${esc(detail.concept.calloutText)}</p>
              <div class="lesson-formula">${esc(detail.concept.formula)}</div>
            </div>
            ${visual ? `
              <div class="fraction-bars">
                ${visual.rows.map((row) => `
                  <div class="fraction-bar-row">
                    <span>${esc(row.label)}</span>
                    <div class="fraction-pieces">
                      ${Array.from({ length: row.total }, (_, index) => `<i class="${index < row.filled ? "filled" : ""}"></i>`).join("")}
                    </div>
                    <b>${esc(row.value)}</b>
                  </div>
                `).join("")}
              </div>
            ` : `
              <div class="fraction-bars">
                <div class="lesson-callout" style="border:0;background:transparent;padding:4px">
                  <strong>本节学习目标</strong>
                  <p>${esc(detail.goal)}</p>
                  <div class="lesson-formula" style="font-size:14px">${esc(detail.concept.formula)}</div>
                </div>
              </div>
            `}
          </div>
          <div class="lesson-points">
            ${detail.concept.points.map((point, index) => `<div class="lesson-point"><b>${index + 1}</b><span>${esc(point)}</span></div>`).join("")}
          </div>
        </div>
      `;
    } else if (slide === 1) {
      body = `
        <div class="lesson-slide">
          <span class="lesson-stage">${icon("pen")}${esc(detail.example.stage)}</span>
          <h3>${esc(detail.example.title)}</h3>
          <p>${esc(detail.example.lead)}</p>
          <div class="lesson-visual single">
            <div class="lesson-callout">
              <strong>${esc(detail.example.calloutTitle)}</strong>
              <p>${esc(detail.example.calloutText)}</p>
              <div class="lesson-formula">${esc(detail.example.formula)}</div>
            </div>
          </div>
          <div class="lesson-points">
            ${detail.example.steps.map((step, index) => `<div class="lesson-point"><b>${index + 1}</b><span>${esc(step)}</span></div>`).join("")}
          </div>
        </div>
      `;
    } else {
      const quiz = detail.quiz;
      const selected = lessonSession.selected;
      const checked = lessonSession.checked;
      const isCorrect = selected === quiz.answer;
      body = `
        <div class="lesson-slide">
          <span class="lesson-stage">${icon("target")}随堂练习</span>
          <h3>试着独立完成这一题</h3>
          <p>不着急，先在草稿纸上写一写。选完后，小思会告诉你这道题的关键。</p>
          <div class="quiz-shell" style="margin-top:16px">
            <div class="quiz-question">${esc(quiz.question)}</div>
            <div class="quiz-options">
              ${quiz.options.map((option, index) => {
                let cls = "";
                if (checked) {
                  if (index === quiz.answer) cls = "is-correct";
                  else if (index === selected) cls = "is-wrong";
                  else cls = "is-faded";
                }
                return `<button class="quiz-option ${cls}" type="button" data-action="lesson-option" data-index="${index}" ${checked ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`;
              }).join("")}
            </div>
            ${checked ? `
              <div class="quiz-feedback ${isCorrect ? "" : "is-wrong"}">
                <span class="quiz-feedback-icon">${icon(isCorrect ? "check" : "x")}</span>
                <div><strong>${isCorrect ? "答对了，思路很稳" : "很接近了，再往前一步"}</strong><p>${esc(quiz.explain)}</p></div>
              </div>
            ` : ""}
          </div>
        </div>
      `;
    }

    const footer = `
      <div class="lesson-nav-dots" style="margin-right:auto">
        ${[0, 1, 2].map((index) => `<i class="${index === slide ? "is-on" : ""}"></i>`).join("")}
      </div>
      <button class="btn btn-soft" type="button" data-action="lesson-prev" ${slide === 0 ? "disabled" : ""}>${icon("arrow-left")}上一步</button>
      ${slide < 2
        ? `<button class="btn btn-primary" type="button" data-action="lesson-next">下一步${icon("arrow-right")}</button>`
        : `<button class="btn btn-accent" type="button" data-action="lesson-complete" ${lessonSession.checked ? "" : "disabled"}>${icon("check")}完成本课</button>`}
    `;

    openModal(`
      <div class="lesson-topline ${subjectClass(subject.id)}">
        <span class="subject-tag">${esc(subject.name)} · 同步课</span>
        <strong>${esc(lesson.title)}</strong>
        <span class="lesson-progress-line"><span style="width:${progress}%"></span></span>
        <span>${slide + 1} / 3</span>
        <button class="modal-close" type="button" data-close-modal aria-label="关闭">${icon("x")}</button>
      </div>
      <div class="modal-body">
        <div class="lesson-content">${body}</div>
        <div class="lesson-nav">${footer}</div>
      </div>
    `, "modal-lg");
  }

  function lessonNext() {
    if (!lessonSession) return;
    lessonSession.slide = Math.min(2, lessonSession.slide + 1);
    lessonSession.selected = null;
    lessonSession.checked = false;
    renderLessonModal();
  }

  function lessonPrev() {
    if (!lessonSession) return;
    lessonSession.slide = Math.max(0, lessonSession.slide - 1);
    lessonSession.selected = null;
    lessonSession.checked = false;
    renderLessonModal();
  }

  function answerLesson(index) {
    if (!lessonSession || lessonSession.checked) return;
    lessonSession.selected = index;
    lessonSession.checked = true;
    renderLessonModal();
  }

  function completeLesson() {
    if (!lessonSession) return;
    const detail = lessonDetailFor(lessonSession.subjectId, lessonSession.lessonId);
    const correct = lessonSession.selected === detail.quiz.answer;
    if (!state.learned.includes(lessonSession.lessonId)) {
      state.learned.push(lessonSession.lessonId);
      state.xp += correct ? 30 : 15;
      const allLessons = DATA.lessons[lessonSession.subjectId].units.flatMap((unit) => unit.lessons);
      const currentIndex = allLessons.findIndex((lesson) => lesson.id === lessonSession.lessonId);
      const nextLesson = allLessons.slice(currentIndex + 1).find((lesson) => !state.learned.includes(lesson.id));
      if (nextLesson) state.currentLessons[lessonSession.subjectId] = nextLesson.id;
      saveState();
    }
    closeModal();
    toast(correct ? "完成本课，答得漂亮" : "完成本课", correct ? "随堂练习正确，获得 30 经验值。" : "错题已留在本课，建议回到例题再看一遍。", correct ? "award" : "warn");
    lessonSession = null;
    render({ routeChanged: false });
  }

  /* ------------------------------------------------------------------------
     AI diagnostic
     ------------------------------------------------------------------------ */

  function startDiagnostic() {
    ui.diag = {
      index: 0,
      selected: null,
      checked: false,
      answers: DATA.diagnostic.map(() => null),
      finished: false,
      score: 0
    };
    renderDiagnosticModal();
  }

  function renderDiagnosticModal() {
    const diag = ui.diag;
    if (!diag) return;
    const questions = DATA.diagnostic;

    if (diag.finished) {
      const correctCount = diag.answers.filter((answer, index) => answer === questions[index].answer).length;
      const score = diag.score;
      const sorted = Object.entries(state.mastery).sort((a, b) => a[1] - b[1]);
      const stage = score >= 85 ? "基础很扎实" : score >= 65 ? "基础不错，应用要跟上" : "建议先回到课本例题";
      openModal(modalShell(
        "AI 精准学 · 诊断报告",
        "你的知识底图已更新",
        `
          <div class="quiz-result">
            <div class="score-orbit" style="--score:${score}">
              <div class="score-orbit-copy"><strong>${score}</strong><span>综合掌握度</span></div>
            </div>
            <h3>${esc(stage)}</h3>
            <p>这次诊断答对 ${correctCount}/${questions.length} 题。比分数更重要的是：我们找到了下一步最值得花时间的地方。</p>
            <div class="result-chips">
              <span class="chip chip-coral">${icon("target")}优先补强：${esc(sorted[0][0])}</span>
              <span class="chip chip-mint">${icon("check")}优势：${esc(sorted[sorted.length - 1][0])}</span>
            </div>
            <div class="result-breakdown">
              ${sorted.map(([label, value]) => `
                <div class="result-breakdown-row">
                  <span>${esc(label)}</span>
                  <span class="progress"><span style="width:${value}%"></span></span>
                  <b>${value}%</b>
                </div>
              `).join("")}
            </div>
            <div class="quiz-result-actions">
              <button class="btn btn-soft" type="button" data-action="diag-close">回到学情图谱</button>
              <button class="btn btn-primary" type="button" data-action="ai-practice">${icon("sparkles")}开始 AI 专属练</button>
            </div>
          </div>
        `,
        ""
      ), "modal-lg");
      return;
    }

    const question = questions[diag.index];
    const selected = diag.selected;
    const checked = diag.checked;
    const isCorrect = selected === question.answer;
    const progress = ((diag.index + (checked ? 1 : 0)) / questions.length) * 100;

    openModal(modalShell(
      `AI 精准学 · 第 ${diag.index + 1} 题`,
      "5 分钟学情扫描",
      `
        <div class="quiz-shell">
          <div class="quiz-progress">
            <span class="progress"><span style="width:${progress}%"></span></span>
            <span>${diag.index + 1} / ${questions.length}</span>
          </div>
          <div class="quiz-meta">
            <span class="chip chip-mint">${esc(question.kp)}</span>
            <span class="chip">${diag.index < 2 ? "基础题" : "应用题"}</span>
          </div>
          <div class="quiz-question">${esc(question.question)}</div>
          <div class="quiz-options">
            ${question.options.map((option, index) => {
              let cls = "";
              if (checked) {
                if (index === question.answer) cls = "is-correct";
                else if (index === selected) cls = "is-wrong";
                else cls = "is-faded";
              }
              return `<button class="quiz-option ${cls}" type="button" data-action="diag-answer" data-index="${index}" ${checked ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`;
            }).join("")}
          </div>
          ${checked ? `
            <div class="quiz-feedback ${isCorrect ? "" : "is-wrong"}">
              <span class="quiz-feedback-icon">${icon(isCorrect ? "check" : "x")}</span>
              <div><strong>${isCorrect ? "答对了" : "这个选项值得再想一想"}</strong><p>${esc(question.explain)}</p></div>
            </div>
          ` : ""}
          <div class="quiz-actions">
            <span class="text-muted" style="margin-right:auto;font-size:8.5px">选择后立即查看解析</span>
            <button class="btn btn-primary" type="button" data-action="diag-next" ${checked ? "" : "disabled"}>${diag.index === questions.length - 1 ? "查看报告" : "下一题"}${icon("arrow-right")}</button>
          </div>
        </div>
      `,
      ""
    ), "modal-lg");
  }

  function answerDiagnostic(index) {
    if (!ui.diag || ui.diag.checked) return;
    ui.diag.selected = index;
    ui.diag.checked = true;
    ui.diag.answers[ui.diag.index] = index;
    renderDiagnosticModal();
  }

  function nextDiagnostic() {
    if (!ui.diag || !ui.diag.checked) return;
    const questions = DATA.diagnostic;
    if (ui.diag.index >= questions.length - 1) {
      const correctCount = ui.diag.answers.filter((answer, index) => answer === questions[index].answer).length;
      ui.diag.score = Math.round((correctCount / questions.length) * 100);
      ui.diag.finished = true;
      questions.forEach((question, index) => {
        const correct = ui.diag.answers[index] === question.answer;
        const current = state.mastery[question.kp] == null ? 60 : state.mastery[question.kp];
        state.mastery[question.kp] = Math.max(35, Math.min(96, current + (correct ? 3 : -5)));
      });
      state.diagnostic = { score: ui.diag.score, lastDate: "今天", completed: true };
      state.xp += 15;
      saveState();
      renderDiagnosticModal();
      if (currentRoute === "precision") render({ routeChanged: false });
      return;
    }
    ui.diag.index += 1;
    ui.diag.selected = null;
    ui.diag.checked = false;
    renderDiagnosticModal();
  }

  function openPractice() {
    const question = DATA.diagnostic[4];
    openModal(modalShell(
      "AI 专属练 · 分数应用",
      "只练你最容易丢分的那一类",
      `
        <div class="quiz-shell">
          <div class="quiz-progress"><span class="progress"><span style="width:100%"></span></span><span>1 / 1 · 示例题</span></div>
          <div class="quiz-meta"><span class="chip chip-coral">薄弱点 · 分数应用</span><span class="chip">中等</span></div>
          <div class="quiz-question">${esc(question.question)}</div>
          <div class="quiz-options">
            ${question.options.map((option, index) => `<button class="quiz-option" type="button" data-action="practice-answer" data-index="${index}"><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`).join("")}
          </div>
          <div id="practice-feedback" aria-live="polite"></div>
          <div class="quiz-actions"><button class="btn btn-soft" type="button" data-close-modal>稍后再练</button></div>
        </div>
      `,
      "<span class=\"foot-note\">AI 会根据你的作答继续调整难度</span><button class=\"btn btn-primary\" type=\"button\" data-close-modal>完成</button>",
      "modal-lg"
    ));
  }

  function answerPractice(index) {
    const question = DATA.diagnostic[4];
    const correct = index === question.answer;
    $$(".quiz-option", modalRoot).forEach((button, buttonIndex) => {
      button.disabled = true;
      if (buttonIndex === question.answer) button.classList.add("is-correct");
      else if (buttonIndex === index) button.classList.add("is-wrong");
      else button.classList.add("is-faded");
    });
    const feedback = $("#practice-feedback");
    if (feedback) {
      feedback.innerHTML = `
        <div class="quiz-feedback ${correct ? "" : "is-wrong"}">
          <span class="quiz-feedback-icon">${icon(correct ? "check" : "x")}</span>
          <div><strong>${correct ? "答对了，单位“1”找得很准" : "注意：用去的是 5 千克的 2/5"}</strong><p>${esc(question.explain)}</p></div>
        </div>
      `;
    }
    if (correct) {
      state.mastery["分数应用"] = Math.min(96, (state.mastery["分数应用"] || 48) + 4);
      state.xp += 10;
      saveState();
    }
  }

  /* ------------------------------------------------------------------------
     Tutor interactions
     ------------------------------------------------------------------------ */

  function bindTutorInput() {
    const input = $("#tutor-input");
    if (!input) return;
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendTutorMessage(input.value);
      }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = `${Math.min(110, input.scrollHeight)}px`;
    });
    if (window.innerWidth > 900) input.focus();
  }

  function sendTutorMessage(text) {
    const cleaned = String(text || "").trim();
    if (!cleaned || ui.typing) return;
    ensureChat();
    ui.typing = true;
    state.chat.push({ role: "user", text: cleaned, time: nowTime() });
    saveState();
    if (currentRoute === "tutor") render({ routeChanged: false });
    const topic = currentChatTopic();
    const answerLock = Boolean(state.parent.answerLock);

    window.setTimeout(() => {
      const result = AI.reply(cleaned, { topic, answerLock });
      state.chat.push({
        role: "assistant",
        text: result.text,
        chips: result.chips,
        time: nowTime(),
        intent: result.intent
      });
      ui.typing = false;
      saveState();
      if (currentRoute === "tutor") {
        render({ routeChanged: false });
      }
    }, 850 + Math.round(Math.random() * 420));
  }

  function clearChat() {
    if (ui.typing) {
      toast("小思正在回复", "等这条回复结束再开启新对话吧。", "warn");
      return;
    }
    state.chat = [];
    ensureChat();
    saveState();
    render({ routeChanged: false });
    toast("已开启新对话", "刚才的对话已从本机清除。");
  }

  /* ------------------------------------------------------------------------
     Views: homework correction
     ------------------------------------------------------------------------ */

  function renderHomework() {
    const stage = ui.homework.stage;
    const isResult = stage === "result";
    const homeData = DATA.homework;
    const headingActions = isResult
      ? `<button class="btn btn-soft" type="button" data-action="reset-homework">${icon("rotate")}再批改一份</button>
         <button class="btn btn-primary" type="button" data-action="print-worksheet">${icon("download")}打印报告</button>`
      : `<span class="chip">${icon("lock")}图片仅在本机处理</span>
         <button class="btn btn-soft" type="button" data-action="filter-homework">${icon("filter")}AI 作业过滤</button>`;

    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("scan")}HOMEWORK REVIEW</span>
          <h2>作业批改</h2>
          <p>拍照或上传作业，AI 先找出错误，再解释“为什么错”。这里使用内置示例模拟识别，图片不会离开你的浏览器。</p>
        </div>
        <div class="page-actions">${headingActions}</div>
      </div>

      ${stage === "result" ? renderHomeworkResult() : `
        <div class="homework-layout">
          <section class="panel homework-upload">
            <div class="upload-head">
              <div>
                <h3>把作业放上来，先让 AI 看一遍</h3>
                <p>支持 JPG / PNG / WebP，建议光线充足、画面平整。</p>
              </div>
              <span class="chip chip-mint">${icon("sparkles")}本地模拟识别</span>
            </div>

            ${stage === "scanning" ? `
              <div class="scan-overlay">
                <div class="scan-animation"></div>
                <strong>正在识别题目与作答…</strong>
                <p>对齐题目、检查计算过程、整理错因，大约需要 3 秒</p>
                <div class="scan-progress"><span></span></div>
              </div>
            ` : `
              <div class="dropzone" id="hw-dropzone" data-action="pick-homework" role="button" tabindex="0" aria-label="上传作业图片">
                ${ui.homework.preview
                  ? `<div class="dropzone-preview"><img src="${ui.homework.preview}" alt="已选择的作业预览"><span class="preview-overlay">${esc(ui.homework.fileName)}</span></div>
                     <strong style="margin-top:10px">图片准备好了</strong>
                     <p>点击可以重新选择；识别结果使用演示题库生成。</p>`
                  : ui.homework.sample
                    ? `<div class="sample-paper" style="width:78px;height:96px;flex-basis:78px"></div>
                       <strong style="margin-top:14px">已选择示例作业 · ${esc(homeData.title)}</strong>
                       <p>这份示例包含 5 道分数题，其中 1 道故意设置了易错点。</p>`
                    : `<span class="dropzone-icon">${icon("camera")}</span>
                       <strong>拍照上传，或把图片拖到这里</strong>
                       <p>也可以先使用右侧的示例作业，完整体验一次 AI 批改流程。</p>
                       <div class="drop-formats"><span class="chip">JPG</span><span class="chip">PNG</span><span class="chip">图片不超过 10MB</span></div>`}
              </div>
              <input id="homework-file" type="file" accept="image/*" hidden>

              <div class="sample-row">
                <div class="sample-paper" aria-hidden="true"></div>
                <div class="sample-copy">
                  <strong>${esc(homeData.title)}</strong>
                  <span>${esc(textbookVersion("math"))} · 5 题 · 约 80 分</span>
                </div>
                <button class="btn btn-sm btn-soft" type="button" data-action="use-sample">${ui.homework.sample ? "已选择" : "使用示例"}</button>
              </div>

              <div class="upload-actions">
                <button class="btn btn-soft" type="button" data-action="pick-homework">${icon("upload")}选择图片</button>
                <button class="btn btn-primary" type="button" data-action="start-scan">${icon("sparkles")}开始 AI 批改</button>
              </div>
              <p class="privacy-note">${icon("shield")}演示说明：不会真正上传图片，识别结果由本地示例数据生成。</p>
            `}
          </section>

          <aside class="homework-side">
            <section class="panel filter-tip-card">
              <h3>${icon("filter")}AI 作业过滤</h3>
              <p>同类型、已掌握、重复训练的题先放一边。把时间留给真正需要动脑的题。</p>
              <div class="filter-stats">
                <div class="filter-stat"><strong>${homeData.filtered.before}</strong><span>扫描题目</span></div>
                <div class="filter-stat"><strong>${homeData.filtered.after}</strong><span>建议必做</span></div>
                <div class="filter-stat"><strong>${homeData.filtered.duplicate}</strong><span>过滤重复</span></div>
              </div>
            </section>

            <section class="panel hw-guide-card">
              <h3>一次有效的批改，应该发生什么？</h3>
              <div class="guide-step">
                <span class="guide-num">1</span>
                <div><strong>先看错在哪一步</strong><p>不只看答案对错，定位到具体计算或理解环节。</p></div>
              </div>
              <div class="guide-step">
                <span class="guide-num">2</span>
                <div><strong>再讲为什么会错</strong><p>用你能听懂的话，把隐藏的知识漏洞补上。</p></div>
              </div>
              <div class="guide-step">
                <span class="guide-num">3</span>
                <div><strong>最后留一道变式</strong><p>把错题变成一次真正的掌握，而不是抄一遍答案。</p></div>
              </div>
            </section>
          </aside>
        </div>
      `}
    `;
  }

  function renderHomeworkResult() {
    const homeData = DATA.homework;
    const wrong = homeData.questions.filter((question) => !question.correct);
    const added = Boolean(state.homeworkAdded);

    return `
      <div class="result-layout">
        <section class="panel worksheet-panel">
          <div class="worksheet-toolbar">
            <strong>${icon("file")}批改结果 · ${esc(homeData.title)}</strong>
            <span>识别 5 题 · 批改完成</span>
          </div>
          <div class="paper-sheet">
            <div class="paper-head">
              <div>
                <p class="paper-school">${esc(state.profile.school)} · ${esc(state.profile.grade || SAMPLE_GRADE)}数学</p>
                <p class="paper-title">${esc(homeData.title)}</p>
                <div class="paper-meta"><span>姓名：${esc(state.profile.name)}</span><span>班级：${esc(classLabel())}</span><span>日期：${new Date().getMonth() + 1}月${new Date().getDate()}日</span></div>
              </div>
              <div class="paper-score">${homeData.stats.score}<small>分</small></div>
            </div>
            <div class="paper-section-label">一、分数计算（每题 10 分）</div>
            ${homeData.questions.map((question, index) => `
              <div class="paper-q ${question.correct ? "" : "is-wrong"}">
                <span class="paper-q-num">${index + 1}.</span>
                <span>${esc(question.text)}</span>
                <span class="hand-answer">${esc(question.studentAnswer)}</span>
                ${question.correct ? `<span class="correct-mark">${icon("check")}</span>` : `<span class="wrong-stamp">再算一次</span>`}
                ${!question.correct ? `<div class="correction-note"><strong>批改：</strong>${esc(question.explain)}</div>` : ""}
              </div>
            `).join("")}
            <div class="paper-section-label" style="margin-top:16px">二、AI 点评</div>
            <div style="font-family:var(--font-hand);font-size:14px;color:#4d6b8c;line-height:1.6">计算整体很稳，注意异分母分数相减要先通分，结果记得约成最简分数。</div>
          </div>
        </section>

        <aside class="result-side">
          <section class="panel result-summary">
            <div class="result-summary-head">
              <div class="result-number"><strong>${homeData.stats.score}</strong><span>分</span></div>
              <div class="result-summary-copy">
                <strong>${homeData.stats.correct} 题正确，${homeData.stats.wrong} 题需要订正</strong>
                <p>基础计算已经掌握，重点巩固“通分与约分”。</p>
              </div>
            </div>
            <div class="result-metrics">
              <div class="result-metric"><strong>${homeData.stats.total}</strong><span>题目</span></div>
              <div class="result-metric"><strong style="color:var(--mint-deep)">${homeData.stats.correct}</strong><span>正确</span></div>
              <div class="result-metric"><strong style="color:var(--coral)">${homeData.stats.wrong}</strong><span>待订正</span></div>
            </div>
          </section>

          <section class="panel error-analysis">
            <h3>${icon("target")}错因分析</h3>
            ${wrong.map((question, index) => `
              <div class="error-item">
                <span class="error-item-num">${index + 1}</span>
                <div>
                  <strong>${esc(question.text)} → ${esc(question.correctAnswer)}</strong>
                  <p>${esc(question.explain)}</p>
                </div>
              </div>
            `).join("")}
            <div class="result-chips" style="justify-content:flex-start">
              <span class="chip chip-coral">${icon("target")}异分母通分</span>
              <span class="chip chip-amber">${icon("lightbulb")}结果约分</span>
            </div>
          </section>

          <div class="result-actions">
            <button class="btn btn-primary" type="button" data-action="add-homework-mistake" ${added ? "disabled" : ""}>${icon(added ? "check" : "plus")}${added ? "已加入错题本" : "把错题加入错题本"}</button>
            <button class="btn btn-soft" type="button" data-action="filter-homework">${icon("filter")}查看 AI 过滤详情</button>
            <button class="btn btn-soft" type="button" data-action="reset-homework">${icon("rotate")}再批改一份</button>
          </div>
        </aside>
      </div>
    `;
  }

  function bindHomeworkDrop() {
    const input = $("#homework-file");
    if (input) {
      input.addEventListener("change", () => {
        if (input.files && input.files[0]) handleHomeworkFile(input.files[0]);
      });
    }
    const dropzone = $("#hw-dropzone");
    if (!dropzone) return;
    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
      });
    });
    dropzone.addEventListener("drop", (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) handleHomeworkFile(file);
    });
  }

  function handleHomeworkFile(file) {
    if (!file.type || !file.type.startsWith("image/")) {
      toast("这个文件看不了", "请选择 JPG、PNG 或 WebP 图片。", "warn");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("图片有点大", "请压缩到 10MB 以内再试。", "warn");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      ui.homework.preview = String(reader.result);
      ui.homework.fileName = file.name;
      ui.homework.sample = false;
      render({ routeChanged: false });
      toast("图片已就绪", "点击“开始 AI 批改”即可查看演示结果。");
    };
    reader.readAsDataURL(file);
  }

  function useHomeworkSample() {
    ui.homework.sample = true;
    ui.homework.preview = "";
    ui.homework.fileName = "示例作业 · " + DATA.homework.title;
    render({ routeChanged: false });
    toast("示例作业已选好", "点击“开始 AI 批改”，看看 AI 会怎样指出问题。");
  }

  function startHomeworkScan() {
    if (!ui.homework.preview && !ui.homework.sample) {
      toast("还没有选择作业", "先上传一张图片，或使用示例作业。", "warn");
      return;
    }
    ui.homework.stage = "scanning";
    render({ routeChanged: false });
    window.setTimeout(() => {
      ui.homework.stage = "result";
      state.homeworkAdded = false;
      state.xp += 15;
      saveState();
      if (currentRoute === "homework") {
        render({ routeChanged: false });
      }
      toast("批改完成", "发现 1 道需要订正的题，已为你整理错因。", "award");
    }, 1950);
  }

  function resetHomework() {
    ui.homework = { stage: "idle", preview: "", fileName: "", sample: false };
    render({ routeChanged: false });
  }

  function addHomeworkMistake() {
    if (state.homeworkAdded) return;
    const source = DATA.homework.questions[1];
    state.mistakes.unshift({
      id: "hw-" + Date.now(),
      subject: "math",
      subjectName: "数学",
      tag: "异分母分数减法",
      question: source.text + " 的结果是多少？",
      options: ["1/3", "2/4", "1/2", "2/3"],
      answer: 0,
      wrong: 1,
      explain: source.explain,
      source: "AI 作业批改 · 今天",
      dateLabel: "今天",
      mastered: false,
      difficulty: "基础"
    });
    state.homeworkAdded = true;
    state.xp += 5;
    saveState();
    updateSidebar();
    render({ routeChanged: false });
    toast("已加入错题本", "小思会在明天安排一次 30 秒的回忆练习。");
  }

  function openHomeworkFilter() {
    const data = DATA.homework.filtered;
    openModal(modalShell(
      "AI 作业过滤",
      "不是所有题，都值得现在做",
      `
        <p style="font-size:9.5px;color:var(--muted);line-height:1.7">AI 会优先排除重复训练和已经稳定掌握的题，把注意力留给真正能带来提升的题目。本次扫描结果：</p>
        <div class="knowledge-facts" style="margin-top:14px">
          <div class="knowledge-fact"><strong>${data.before} 道</strong><span>原始题目</span></div>
          <div class="knowledge-fact"><strong>${data.duplicate} 道</strong><span>重复 / 同质题</span></div>
          <div class="knowledge-fact"><strong>${data.after} 道</strong><span>建议现在做</span></div>
        </div>
        <div class="result-breakdown" style="margin-top:14px">
          <div class="result-breakdown-row"><span>已熟练掌握</span><span class="progress"><span style="width:72%"></span></span><b>${data.mastered} 道</b></div>
          <div class="result-breakdown-row"><span>需要动脑</span><span class="progress progress-coral"><span style="width:35%"></span></span><b>1 道</b></div>
          <div class="result-breakdown-row"><span>变式巩固</span><span class="progress progress-amber"><span style="width:58%"></span></span><b>2 道</b></div>
        </div>
        <div class="quiz-feedback" style="margin-top:15px">
          <span class="quiz-feedback-icon">${icon("sparkles")}</span>
          <div><strong>建议先做这 5 道</strong><p>其中第 2 题是这次的易错点，做完后记得回看通分过程。</p></div>
        </div>
      `,
      `<button class="btn btn-soft" type="button" data-close-modal>知道了</button><button class="btn btn-primary" type="button" data-action="filter-start">用这 5 道开始批改</button>`,
      "modal-lg"
    ), "modal-lg");
  }

  function openHomeworkFilterStart() {
    closeModal();
    ui.homework.sample = true;
    ui.homework.preview = "";
    ui.homework.stage = "idle";
    render({ routeChanged: false });
    startHomeworkScan();
  }

  /* ------------------------------------------------------------------------
     Views: mistake notebook
     ------------------------------------------------------------------------ */

  function filteredMistakes() {
    let list = [...state.mistakes];
    if (ui.mistakeFilter === "unmastered") {
      list = list.filter((item) => !item.mastered);
    } else if (ui.mistakeFilter !== "all") {
      list = list.filter((item) => item.subject === ui.mistakeFilter);
    }
    if (ui.mistakeQuery.trim()) {
      const query = ui.mistakeQuery.trim().toLowerCase();
      list = list.filter((item) => `${item.question} ${item.tag} ${item.subjectName}`.toLowerCase().includes(query));
    }
    return list;
  }

  function renderMistakes() {
    const list = filteredMistakes();
    const mastered = state.mistakes.filter((item) => item.mastered).length;
    const unmastered = state.mistakes.length - mastered;
    const subjects = [
      ["all", "全部"],
      ["math", "数学"],
      ["chinese", "语文"],
      ["english", "英语"],
      ["science", "科学"],
      ["unmastered", "只看未掌握"]
    ];

    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("notebook")}MISTAKE NOTEBOOK</span>
          <h2>错题本</h2>
          <p>错题不是“做过就忘”的痕迹，而是下一次进步的路线图。每道题都能重新作答，直到真正掌握。</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-soft" type="button" data-action="export-mistakes">${icon("download")}导出错题</button>
          <button class="btn btn-primary" type="button" data-action="start-diagnostic">${icon("sparkles")}生成专属练习</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon" style="--sc:#5b8def;--sc-soft:#edf3ff">${icon("notebook")}</span>
          <div><strong>${state.mistakes.length}</strong><span>累计错题</span></div>
        </div>
        <div class="stat-card">
          <span class="stat-icon" style="--sc:#1ac7a3;--sc-soft:#ddf8f1">${icon("check")}</span>
          <div><strong>${mastered}</strong><span>已经掌握</span></div>
          <span class="stat-trend">+2 本周</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon" style="--sc:#ff7c5c;--sc-soft:#fff0ea">${icon("target")}</span>
          <div><strong>${unmastered}</strong><span>待复习</span></div>
        </div>
        <div class="stat-card">
          <span class="stat-icon" style="--sc:#f4b942;--sc-soft:#fff6df">${icon("flame")}</span>
          <div><strong>38<small style="font-size:11px">%</small></strong><span>本周错题减少</span></div>
          <span class="stat-trend">保持中</span>
        </div>
      </div>

      <div class="filter-bar">
        <div class="filter-chips">
          ${subjects.map(([id, label]) => `<button class="filter-chip ${ui.mistakeFilter === id ? "is-active" : ""}" type="button" data-mistake-filter="${id}">${label}</button>`).join("")}
        </div>
        <label class="filter-search">
          ${icon("search")}
          <input id="mistake-search" type="search" value="${esc(ui.mistakeQuery)}" placeholder="搜索题目或知识点…" aria-label="搜索错题">
        </label>
      </div>

      ${list.length ? `
        <div class="mistake-list">
          ${list.map((mistake) => `
            <article class="panel mistake-card ${subjectClass(mistake.subject)}">
              <div class="mistake-top">
                <span class="subject-label">${icon(SUBJECT_ICONS[mistake.subject] || "book")}${esc(mistake.subjectName)}</span>
                <time>${esc(mistake.dateLabel || mistake.source)}</time>
                <span class="mastery-state ${mistake.mastered ? "mastered" : ""}">${mistake.mastered ? "已掌握" : "待复习"}</span>
              </div>
              <p class="mistake-question">${esc(mistake.question)}</p>
              <div class="mistake-answer-row">
                <span class="answer-pill">${icon("x")}我的答案：${esc(mistake.options[mistake.wrong])}</span>
                <span class="answer-pill correct">${icon("check")}正确答案：${esc(mistake.options[mistake.answer])}</span>
              </div>
              <div class="mistake-tags">
                <span class="tag">${esc(mistake.tag)}</span>
                <span class="tag">${esc(mistake.difficulty)}</span>
                <span class="tag">AI 推题</span>
              </div>
              <div class="mistake-bottom">
                <span class="mistake-source">${icon("pin")}${esc(mistake.source)}</span>
                <div class="mistake-actions">
                  <button class="btn btn-soft" type="button" data-action="mistake-explain" data-id="${mistake.id}">${icon("lightbulb")}看解析</button>
                  <button class="btn btn-primary" type="button" data-action="mistake-redo" data-id="${mistake.id}">${icon("rotate")}重做</button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      ` : `
        <div class="panel empty-state">
          <span class="empty-state-icon">${icon("check")}</span>
          <h3>这一栏已经清空</h3>
          <p>没有找到符合条件的错题。换个筛选条件，或者去同步课堂继续练习。</p>
          <button class="btn btn-primary" style="margin-top:14px" type="button" data-action="clear-mistake-filter">查看全部错题</button>
        </div>
      `}
    `;
  }

  function bindMistakeSearch() {
    const input = $("#mistake-search");
    if (!input) return;
    let timer = null;
    input.addEventListener("input", () => {
      ui.mistakeQuery = input.value;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        searchFocusPending = true;
        render({ routeChanged: false });
      }, 220);
    });
  }

  function openMistakeExplain(id) {
    const mistake = state.mistakes.find((item) => item.id === id);
    if (!mistake) return;
    openModal(modalShell(
      `${mistake.subjectName} · ${mistake.tag}`,
      "把这道题，真正想明白",
      `
        <div class="quiz-meta"><span class="chip chip-${mistake.mastered ? "mint" : "coral"}">${mistake.mastered ? "已掌握" : "待复习"}</span><span class="chip">${esc(mistake.difficulty)}</span></div>
        <div class="quiz-question" style="margin-top:11px">${esc(mistake.question)}</div>
        <div class="mistake-answer-row" style="margin-top:12px">
          <span class="answer-pill">${icon("x")}你的答案：${esc(mistake.options[mistake.wrong])}</span>
          <span class="answer-pill correct">${icon("check")}正确答案：${esc(mistake.options[mistake.answer])}</span>
        </div>
        <div class="lesson-callout" style="margin-top:15px">
          <strong>小思的解析</strong>
          <p>${esc(mistake.explain)}</p>
        </div>
        <div class="quiz-feedback" style="margin-top:12px">
          <span class="quiz-feedback-icon">${icon("lightbulb")}</span>
          <div><strong>下一次遇到同类题</strong><p>先圈出单位“1”，再判断是求分率还是具体数量；算完后回头检查是否化成最简分数。</p></div>
        </div>
      `,
      `<button class="btn btn-soft" type="button" data-close-modal>先看到这里</button><button class="btn btn-primary" type="button" data-action="mistake-redo" data-id="${mistake.id}">${icon("rotate")}我再来一次</button>`
    ));
  }

  function openMistakeRedo(id) {
    const mistake = state.mistakes.find((item) => item.id === id);
    if (!mistake) return;
    ui.redo = { id, selected: null, checked: false };
    renderRedoModal();
  }

  function renderRedoModal() {
    if (!ui.redo) return;
    const mistake = state.mistakes.find((item) => item.id === ui.redo.id);
    if (!mistake) return;
    const selected = ui.redo.selected;
    const checked = ui.redo.checked;
    const isCorrect = selected === mistake.answer;

    openModal(modalShell(
      `${mistake.subjectName} · 重新作答`,
      "不看答案，再走一遍思路",
      `
        <div class="quiz-shell">
          <div class="quiz-meta"><span class="chip chip-coral">${esc(mistake.tag)}</span><span class="chip">${esc(mistake.difficulty)}</span></div>
          <div class="quiz-question" style="margin-top:10px">${esc(mistake.question)}</div>
          <div class="quiz-options">
            ${mistake.options.map((option, index) => {
              let cls = "";
              if (checked) {
                if (index === mistake.answer) cls = "is-correct";
                else if (index === selected) cls = "is-wrong";
                else cls = "is-faded";
              }
              return `<button class="quiz-option ${cls}" type="button" data-action="redo-answer" data-index="${index}" ${checked ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`;
            }).join("")}
          </div>
          ${checked ? `
            <div class="quiz-feedback ${isCorrect ? "" : "is-wrong"}">
              <span class="quiz-feedback-icon">${icon(isCorrect ? "check" : "x")}</span>
              <div><strong>${isCorrect ? "这次对了，已经标记为掌握" : "别急，看看卡在哪一步"}</strong><p>${esc(mistake.explain)}</p></div>
            </div>
          ` : ""}
          <div class="quiz-actions">
            ${checked && !isCorrect ? `<button class="btn btn-soft" type="button" data-action="redo-retry">${icon("rotate")}再试一次</button>` : ""}
            <button class="btn btn-primary" type="button" data-action="redo-close">${checked && isCorrect ? "完成复习" : "先离开"}</button>
          </div>
        </div>
      `,
      "",
      "modal-lg"
    ));
  }

  function answerRedo(index) {
    if (!ui.redo || ui.redo.checked) return;
    const mistake = state.mistakes.find((item) => item.id === ui.redo.id);
    if (!mistake) return;
    ui.redo.selected = index;
    ui.redo.checked = true;
    if (index === mistake.answer) {
      if (!mistake.mastered) {
        mistake.mastered = true;
        state.xp += 10;
        saveState();
        updateSidebar();
        toast("这道题，拿下了", "已从待复习移到“已掌握”，获得 10 经验值。", "award");
      }
    }
    renderRedoModal();
    if (currentRoute === "mistakes") {
      const scroll = view.scrollTop;
      render({ routeChanged: false });
      view.scrollTop = scroll;
    }
  }

  function retryRedo() {
    if (!ui.redo) return;
    ui.redo.selected = null;
    ui.redo.checked = false;
    renderRedoModal();
  }

  function closeRedo() {
    closeModal();
    ui.redo = null;
    if (currentRoute === "mistakes") render({ routeChanged: false });
  }

  /* ------------------------------------------------------------------------
     Views: study plan
     ------------------------------------------------------------------------ */

  function weekDayLabel(index) {
    if (index === todayOffset()) return "今天";
    return WEEKDAYS[(index + 1) % 7];
  }

  function renderPlan() {
    if (ui.selectedDay == null) ui.selectedDay = todayOffset();
    const dates = getWeekDates();
    const dayTasks = state.tasks
      .filter((task) => Number(task.dayOffset) === Number(ui.selectedDay))
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
    const doneDay = dayTasks.filter((task) => task.done).length;
    const totalWeek = state.tasks.length;
    const doneWeek = state.tasks.filter((task) => task.done).length;
    const focusProgress = Math.min(100, Math.round((state.weekFocus / state.weekGoal) * 100));
    const selectedDate = dates[ui.selectedDay] || new Date();

    const taskMarkup = dayTasks.length
      ? dayTasks.map((task) => `
          <div class="day-task ${task.done ? "done" : ""}" data-task-toggle="${task.id}" role="checkbox" aria-checked="${task.done}" tabindex="0">
            <span class="task-check">${icon("check")}</span>
            <div class="day-task-main">
              <strong>${esc(task.title)}</strong>
              <span><i class="subject-dot ${subjectClass(task.subject)}"></i>${esc(task.meta)}</span>
            </div>
            <span class="day-task-time">${esc(task.time)} · ${task.minutes} 分钟</span>
            <button class="day-task-more" type="button" data-action="task-more" data-id="${task.id}" aria-label="任务选项">${icon("more")}</button>
          </div>
        `).join("")
      : `<div class="empty-state" style="min-height:210px">
          <span class="empty-state-icon">${icon("calendar")}</span>
          <h3>这一天还很轻</h3>
          <p>留白也是计划的一部分。想加一项任务，或者把任务挪到更适合的时间？</p>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" type="button" data-action="add-task">${icon("plus")}添加任务</button>
        </div>`;

    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("calendar")}STUDY PLAN</span>
          <h2>学习计划</h2>
          <p>把大目标拆成今天能完成的一小步。计划可以调整，坚持比完美更重要。</p>
        </div>
        <div class="page-actions">
          <span class="chip chip-mint">${icon("target")}本周目标 ${state.weekFocus} / ${state.weekGoal} 分钟</span>
          <button class="btn btn-primary" type="button" data-action="add-task">${icon("plus")}添加任务</button>
        </div>
      </div>

      <div class="plan-layout">
        <div class="plan-main">
          <section class="panel week-panel">
            <div class="week-head">
              <div>
                <h3>本周学习节奏</h3>
                <p>${dates[0].getMonth() + 1}月${dates[0].getDate()}日 — ${dates[6].getMonth() + 1}月${dates[6].getDate()}日 · 点击日期查看当天任务</p>
              </div>
              <div class="week-nav">
                <button type="button" data-action="week-prev" aria-label="上一周">${icon("chevron-left")}</button>
                <button type="button" data-action="week-next" aria-label="下一周">${icon("chevron-right")}</button>
              </div>
            </div>
            <div class="week-grid">
              ${dates.map((date, index) => {
                const count = state.tasks.filter((task) => Number(task.dayOffset) === index).length;
                const done = state.tasks.filter((task) => Number(task.dayOffset) === index && task.done).length;
                return `
                  <button class="day-button ${index === ui.selectedDay ? "is-active" : ""} ${index === todayOffset() ? "is-today" : ""}" type="button" data-day-select="${index}" aria-pressed="${index === ui.selectedDay}">
                    <span class="day-week">${index === todayOffset() ? "今天" : WEEKDAYS[date.getDay()]}</span>
                    <span class="day-date">${date.getDate()}</span>
                    <span class="day-dots">${Array.from({ length: Math.min(3, count) }, (_, dotIndex) => `<i style="${dotIndex < done ? "background:#1ac7a3" : ""}"></i>`).join("")}</span>
                  </button>
                `;
              }).join("")}
            </div>
          </section>

          <section class="panel today-tasks-panel">
            <div class="panel-head" style="align-items:center">
              <div>
                <h3 class="panel-title">${icon("list-check")}${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日 · ${weekDayLabel(ui.selectedDay)}</h3>
                <p class="panel-sub">${doneDay} / ${dayTasks.length || 0} 项已完成 · ${dayTasks.reduce((sum, task) => sum + Number(task.minutes || 0), 0)} 分钟</p>
              </div>
              <button class="btn btn-sm btn-soft" type="button" data-action="add-task">${icon("plus")}添加</button>
            </div>
            <div class="day-task-list">${taskMarkup}</div>
          </section>

          <section class="panel week-goal">
            <div class="week-goal-head">
              <div>
                <h3>本周专注目标</h3>
                <p class="panel-sub" style="font-size:9px">完成 ${doneWeek} / ${totalWeek} 项任务 · 保持自己的节奏</p>
              </div>
              <strong>${state.weekFocus} / ${state.weekGoal} 分钟</strong>
            </div>
            <div class="goal-bar"><span style="width:${focusProgress}%"></span></div>
            <div class="goal-meta"><span>已完成 ${focusProgress}%</span><span>每天约 43 分钟即可达成</span></div>
            <div class="plan-tip">
              ${icon("lightbulb")}
              <p><strong>小思建议：</strong>你在 ${WEEKDAYS[new Date().getDay()]} 的注意力峰值通常在 16:30—17:30。可以把最需要思考的数学任务放在这个时段。</p>
            </div>
          </section>
        </div>

        <aside class="plan-side">
          <section class="focus-card">
            <div class="focus-head">
              <h3>${icon("clock")}专注自习</h3>
              <span>${focus.running ? "正在专注" : "准备就绪"}</span>
            </div>
            <div class="timer-zone">
              <div class="timer-ring" id="timer-ring" style="--p:${focusPercent()}">
                <div class="timer-copy">
                  <small id="timer-state">${focus.running ? "专注中，请保持" : "准备开始"}</small>
                  <strong id="timer-time">${formatTimer(focus.remaining)}</strong>
                  <span id="timer-duration">${Math.round(focus.duration / 60)} 分钟专注</span>
                </div>
              </div>
            </div>
            <div class="timer-presets">
              ${DATA.focusPresets.map((minutes) => `<button class="timer-preset ${Math.round(focus.duration / 60) === minutes ? "is-active" : ""}" type="button" data-action="focus-preset" data-minutes="${minutes}">${minutes} 分钟</button>`).join("")}
            </div>
            <div class="timer-actions">
              <button class="btn timer-start" id="timer-start" type="button" data-action="timer-toggle">${icon(focus.running ? "pause" : "play")}${focus.running ? "暂停专注" : focus.remaining < focus.duration ? "继续专注" : "开始专注"}</button>
              <button class="btn timer-reset" type="button" data-action="timer-reset" aria-label="重置计时器">${icon("rotate")}</button>
            </div>
            <p class="focus-tip">专注时，小思会暂时收起提醒。完成一个时段，就记一次真实的专注。</p>
          </section>

          <section class="panel week-goal">
            <div class="week-goal-head">
              <div><h3>今日学习配比</h3><p class="panel-sub" style="font-size:9px">数学多一点，语文稳住</p></div>
              <strong>${state.todayMinutes}<small style="font-size:9px;font-weight:500;color:var(--muted)"> 分钟</small></strong>
            </div>
            <div class="goal-bar" style="margin-top:12px"><span style="width:47%"></span></div>
            <div class="goal-chips">
              <span class="chip chip-mint">数学 32%</span>
              <span class="chip chip-coral">语文 26%</span>
              <span class="chip chip-blue">英语 24%</span>
              <span class="chip chip-amber">科学 18%</span>
            </div>
            <div class="plan-tip" style="margin-top:11px">
              ${icon("headphones")}
              <p><strong>用眼提醒：</strong>连续学习 25 分钟后，看看 6 米外的物体 20 秒。</p>
            </div>
          </section>
        </aside>
      </div>
    `;
  }

  function openAddTask() {
    const dates = getWeekDates();
    openModal(modalShell(
      "学习计划 · 新任务",
      "给今天加一件小事",
      `
        <form id="add-task-form">
          <div class="form-grid">
            <div class="field full">
              <label for="task-title">任务名称</label>
              <input id="task-title" name="title" placeholder="例如：数学 · 分数应用题专项" maxlength="30" autofocus required>
            </div>
            <div class="field">
              <label for="task-subject">学科</label>
              <select id="task-subject" name="subject">
                <option value="math">数学</option>
                <option value="chinese">语文</option>
                <option value="english">英语</option>
                <option value="science">科学</option>
                <option value="enrich">素养</option>
              </select>
            </div>
            <div class="field">
              <label for="task-minutes">预计时长</label>
              <select id="task-minutes" name="minutes">
                <option value="10">10 分钟</option>
                <option value="15" selected>15 分钟</option>
                <option value="20">20 分钟</option>
                <option value="25">25 分钟</option>
                <option value="30">30 分钟</option>
                <option value="45">45 分钟</option>
              </select>
            </div>
            <div class="field">
              <label for="task-day">安排到</label>
              <select id="task-day" name="dayOffset">
                ${dates.map((date, index) => `<option value="${index}" ${index === ui.selectedDay ? "selected" : ""}>${index === todayOffset() ? "今天" : WEEKDAYS[date.getDay()]} · ${date.getMonth() + 1}月${date.getDate()}日</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="task-time">开始时间</label>
              <input id="task-time" name="time" type="time" value="17:30">
            </div>
            <div class="field full">
              <label for="task-note">备注（可选）</label>
              <textarea id="task-note" name="note" rows="2" placeholder="想提醒自己的一句话"></textarea>
            </div>
          </div>
        </form>
      `,
      `<span class="foot-note">任务只保存在本机浏览器</span><button class="btn btn-soft" type="button" data-close-modal>取消</button><button class="btn btn-primary" type="submit" form="add-task-form">${icon("plus")}添加任务</button>`
    ));
    const form = $("#add-task-form");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const title = $("#task-title").value.trim();
        if (!title) {
          $("#task-title").focus();
          return;
        }
        const subjectId = $("#task-subject").value;
        const minutes = Number($("#task-minutes").value);
        const dayOffset = Number($("#task-day").value);
        const time = $("#task-time").value || "17:30";
        const note = $("#task-note").value.trim();
        state.tasks.push({
          id: "task-" + Date.now(),
          title,
          meta: note || `${subjectName(subjectId)} · 自主学习`,
          subject: subjectId,
          minutes,
          time,
          dayOffset,
          done: false
        });
        saveState();
        closeModal();
        ui.selectedDay = dayOffset;
        if (currentRoute === "plan") render({ routeChanged: false });
        toast("任务已添加", `${title} · ${minutes} 分钟，安排上了。`);
      });
    }
  }

  function openTaskMenu(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    openModal(modalShell(
      "任务选项",
      esc(task.title),
      `
        <p style="color:var(--muted);font-size:9.5px;line-height:1.7">${esc(task.meta)} · ${task.minutes} 分钟 · ${esc(task.time)}</p>
        <div class="quiz-options" style="margin-top:14px">
          <button class="quiz-option" type="button" data-action="task-complete" data-id="${task.id}"><span class="option-letter">${icon("check")}</span><span>${task.done ? "标记为未完成" : "标记为已完成"}</span></button>
          <button class="quiz-option" type="button" data-action="task-delete" data-id="${task.id}"><span class="option-letter" style="color:var(--coral)">${icon("trash")}</span><span>从计划中删除</span></button>
        </div>
      `,
      `<button class="btn btn-soft" type="button" data-close-modal>取消</button>`
    ));
  }

  /* ------------------------------------------------------------------------
     Views: enrichment center
     ------------------------------------------------------------------------ */

  function renderEnrich() {
    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("palette")}ENRICHMENT CENTER</span>
          <h2>素养中心</h2>
          <p>学习不只有标准答案。去观察、去表达、去动手，把好奇心变成真正的能力。</p>
        </div>
        <div class="page-actions">
          <span class="chip chip-violet">${icon("award")}本周素养徽章 3 / 5</span>
          <button class="btn btn-soft" type="button" data-action="open-ai">${icon("sparkles")}问小思</button>
        </div>
      </div>

      <section class="enrich-hero">
        <div class="enrich-hero-copy">
          <span class="eyebrow">${icon("compass")}本周主题 · 观察与发现</span>
          <h2>世界是一本没有目录的书，<br>好奇心就是索引。</h2>
          <p>从一片叶子的纹理，到一首诗里的月光。用 AI 工具打开一个问题，再用自己的眼睛找到答案。</p>
          <button class="btn btn-accent" type="button" data-action="enrich-open" data-enrich="ai-object">${icon("camera")}去认识一片叶子</button>
        </div>
        <div class="enrich-hero-art" aria-hidden="true">
          <span class="enrich-orb">${icon("leaf")}</span>
          <span class="enrich-orb">${icon("book")}</span>
          <span class="enrich-orb">${icon("compass")}</span>
        </div>
      </section>

      <div class="section-head">
        <div><h3>今天想探索什么？</h3><p>六个轻量入口，随时开始，随时停下</p></div>
        <span class="chip">${icon("sparkles")}AI 辅助 · 动手为主</span>
      </div>
      <div class="enrich-grid">
        ${DATA.enrichCards.map((card) => `
          <button class="enrich-card tone-${card.tone}" type="button" data-action="enrich-open" data-enrich="${card.id}">
            <span class="enrich-art">
              <span class="enrich-art-icon">${icon(card.icon)}</span>
              <span class="enrich-art-tag">${esc(card.tag)}</span>
            </span>
            <h3>${esc(card.title)}</h3>
            <p>${esc(card.desc)}</p>
            <span class="enrich-card-foot"><span>${esc(card.meta)}</span><span class="link-button">开始${icon("arrow-right")}</span></span>
          </button>
        `).join("")}
      </div>
    `;
  }

  /* ------------------------------------------------------------------------
     Views: parent center
     ------------------------------------------------------------------------ */

  function usageLabels() {
    const labels = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      labels.push(offset === 0 ? "今天" : WEEKDAYS[date.getDay()]);
    }
    return labels;
  }

  function renderParent() {
    const labels = usageLabels();
    const minutes = [...DATA.usage.minutes];
    minutes[minutes.length - 1] = state.todayMinutes;
    const max = Math.max(...minutes, 1);
    const total = minutes.reduce((sum, value) => sum + value, 0);
    const limit = state.parent.dailyLimit;
    const rangePercent = ((limit - 30) / (180 - 30)) * 100;
    const settingRows = [
      {
        key: "answerLock",
        icon: "lock",
        tone: "",
        title: "答案保护",
        desc: "开启后，小思只提供思路和提示，不直接给出答案。"
      },
      {
        key: "eyeCare",
        icon: "leaf",
        tone: "amber",
        title: "未来纸护眼",
        desc: "降低蓝光与高饱和刺激，保持纸感阅读体验。"
      },
      {
        key: "appGuard",
        icon: "shield",
        tone: "blue",
        title: "应用使用守护",
        desc: "仅允许打开学习类应用，新应用需要家长确认。"
      },
      {
        key: "weeklyReport",
        icon: "chart",
        tone: "violet",
        title: "每周学习报告",
        desc: "每周日晚自动生成，包含时长、掌握度和用眼提醒。"
      }
    ];

    return `
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("shield")}PARENT CENTER</span>
          <h2>家长中心</h2>
          <p>看见成长，也守住边界。这里的数据来自本机学习记录，不会上传云端。</p>
        </div>
        <div class="page-actions">
          <span class="chip chip-mint">${icon("lock")}家长模式</span>
          <button class="btn btn-soft" type="button" data-action="edit-profile">${icon("user")}编辑档案</button>
          <button class="btn btn-primary" type="button" data-action="open-parent-report">${icon("chart")}查看本周报告</button>
        </div>
      </div>

      <section class="parent-hero">
        <span class="parent-avatar">${esc(state.profile.short)}</span>
        <div class="parent-identity">
          <h2>${esc(state.profile.name)} <span class="tag">${esc(classLabel())}</span></h2>
          <p>${esc(state.profile.school)} · 连续学习 ${state.profile.streak} 天 · Lv.${state.profile.level}</p>
        </div>
        <div class="parent-quick-stats">
          <div class="parent-quick-stat"><strong>${state.todayMinutes}<small style="font-size:9px;font-weight:500"> 分</small></strong><span>今日学习</span></div>
          <div class="parent-quick-stat"><strong>${unmasteredCount()}</strong><span>待复习错题</span></div>
          <div class="parent-quick-stat"><strong>${masteryAverage()}<small style="font-size:9px;font-weight:500">%</small></strong><span>综合掌握</span></div>
        </div>
      </section>

      <div class="parent-layout">
        <div class="parent-col">
          <section class="panel usage-panel">
            <div class="usage-head">
              <div>
                <h3>学习时长</h3>
                <p>最近 7 天 · 日均 ${Math.round(total / 7)} 分钟</p>
              </div>
              <div class="usage-total"><strong>${Math.floor(total / 60)}<small style="font-size:10px">h</small> ${total % 60}<small style="font-size:10px">m</small></strong><span>本周累计</span></div>
            </div>
            <div class="usage-chart">
              ${minutes.map((value, index) => `
                <div class="usage-col ${index === minutes.length - 1 ? "is-today" : ""} ${value === 0 ? "is-empty" : ""}" style="--v:${Math.round((value / max) * 92)}">
                  <b>${value} 分钟</b>
                  <span class="usage-bar"></span>
                  <span>${labels[index]}</span>
                </div>
              `).join("")}
            </div>
            <div class="usage-foot">
              <span class="usage-legend"><i></i>学习时长</span>
              <span class="usage-legend"><i></i>今日</span>
              <span class="usage-legend">建议每日不超过 ${limit} 分钟</span>
            </div>
          </section>

          <section class="panel limit-panel">
            <h3>每日学习时长上限</h3>
            <p>到点后会温和提醒休息，不会突然中断正在进行的课程。</p>
            <div class="limit-value"><strong id="limit-value">${limit}</strong><span>分钟 / 天</span></div>
            <input class="range" id="limit-range" type="range" min="30" max="180" step="15" value="${limit}" style="--range:${rangePercent}%" aria-label="每日学习时长上限">
            <div class="range-ticks"><span>30 分钟</span><span>90 分钟</span><span>180 分钟</span></div>
            <div class="limit-advice">
              ${icon("lightbulb")}
              <p>${esc(state.profile.grade || SAMPLE_GRADE)}学生建议单次连续学习不超过 40 分钟。当前设置下，系统会在 ${limit} 分钟时提醒休息。</p>
            </div>
          </section>
        </div>

        <div class="parent-col">
          <section class="panel settings-panel">
            <h3>学习守护</h3>
            <div class="setting-list">
              ${settingRows.map((row) => `
                <div class="setting-row" data-setting="${row.key}">
                  <span class="setting-icon ${row.tone}">${icon(row.icon)}</span>
                  <div class="setting-copy"><strong>${row.title}</strong><span>${row.desc}</span></div>
                  <button class="switch ${state.parent[row.key] ? "is-on" : ""}" type="button" role="switch" aria-checked="${Boolean(state.parent[row.key])}" aria-label="${row.title}" data-setting="${row.key}"></button>
                </div>
              `).join("")}
            </div>
          </section>

          <section class="panel report-panel">
            <h3>${icon("sparkles")}本周学情摘要</h3>
            <div class="report-list">
              <div class="report-item"><i></i><span><strong>数学：</strong>分数计算正确率稳定在 86%，异分母减法仍是薄弱点，已安排 3 道变式题。</span></div>
              <div class="report-item"><i></i><span><strong>习惯：</strong>连续 12 天完成学习计划，平均每次专注 26 分钟，晚 8 点后使用明显减少。</span></div>
              <div class="report-item"><i></i><span><strong>思维：</strong>完成 ${state.thinking.completed.length} 个思维挑战，口述 ${state.thinking.reflections.length} 次，使用 ${state.thinking.hintsUsed} 次提示。提示用得多不一定是坏事，关键是能讲出方法。</span></div>
              <div class="report-item"><i></i><span><strong>用眼：</strong>本周有 2 次连续使用超过 40 分钟，建议把 19:40 的错题复习提前到 19:00。</span></div>
            </div>
            <div class="parent-actions" style="margin-top:13px">
              <button class="btn btn-soft" type="button" data-action="open-parent-report">查看完整报告</button>
              <button class="btn btn-soft" type="button" data-action="export-parent-report">${icon("download")}导出</button>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function bindParentRange() {
    const range = $("#limit-range");
    if (!range) return;
    range.addEventListener("input", () => {
      const value = Number(range.value);
      state.parent.dailyLimit = value;
      state.profile.dailyGoal = value;
      saveState();
      const label = $("#limit-value");
      if (label) label.textContent = String(value);
      range.style.setProperty("--range", `${((value - 30) / 150) * 100}%`);
    });
    range.addEventListener("change", () => {
      toast("时长上限已更新", `每日学习 ${state.parent.dailyLimit} 分钟，到点会提醒休息。`);
    });
  }

  /* ------------------------------------------------------------------------
     Task and plan interactions
     ------------------------------------------------------------------------ */

  function toggleTask(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.done = !task.done;
    if (task.done) state.xp += 5;
    saveState();
    updateSidebar();
    render({ routeChanged: false });
    if (task.done) {
      toast("这一项完成了", `${task.title} · 获得 5 经验值`);
    }
  }

  function completeTaskFromMenu(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.done = !task.done;
    if (task.done) state.xp += 5;
    saveState();
    closeModal();
    updateSidebar();
    if (currentRoute === "plan" || currentRoute === "home") render({ routeChanged: false });
    toast(task.done ? "任务已完成" : "已恢复为未完成", task.title);
  }

  function deleteTask(id) {
    const index = state.tasks.findIndex((item) => item.id === id);
    if (index < 0) return;
    const removed = state.tasks.splice(index, 1)[0];
    saveState();
    closeModal();
    if (currentRoute === "plan" || currentRoute === "home") render({ routeChanged: false });
    toast("任务已移除", removed.title);
  }

  function addSubjectToPlan(subjectId) {
    const subject = DATA.subjects.find((item) => item.id === subjectId);
    if (!subject) return;
    if (state.tasks.some((task) => task.subject === subjectId && task.title.includes(subject.current.replace(/《|》/g, "")))) {
      toast("已经在计划里了", `今天已经安排了${subjectName(subjectId)}的同步学习。`);
      return;
    }
    state.tasks.push({
      id: "task-" + Date.now(),
      title: `${subject.name} · ${subject.current}`,
      meta: "同步课 · 来自课程页",
      subject: subjectId,
      minutes: 20,
      time: "18:30",
      dayOffset: todayOffset(),
      done: false
    });
    saveState();
    toast("已加入今日计划", `${subject.name}同步学习 · 20 分钟，安排在 18:30。`);
  }

  function openFocusFromQuick() {
    go("plan");
    window.setTimeout(() => {
      const card = $(".focus-card");
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 260);
  }

  function changeWeek(direction) {
    toast(direction < 0 ? "已经在本周" : "先专注这一周", "课程表会随着学习进度自动更新，先把手头这一周走扎实。", "warn");
  }

  /* ------------------------------------------------------------------------
     Enrichment experiences
     ------------------------------------------------------------------------ */

  const OBJECTS = [
    {
      name: "银杏叶",
      latin: "Ginkgo biloba",
      tag: "落叶乔木 · 银杏科",
      facts: [
        ["叶形", "扇形，边缘有波浪"],
        ["叶脉", "二叉状平行脉"],
        ["别名", "公孙树、白果树"]
      ],
      text: "银杏是现存最古老的种子植物之一，被称为“活化石”。它的叶子像一把小扇子，秋天会变成明亮的金黄色。银杏叶的叶脉从叶柄出发不断分叉，这种“二叉分枝”在植物中并不常见。",
      ask: "为什么银杏叶的叶脉像分叉的河流？"
    },
    {
      name: "枫叶",
      latin: "Acer palmatum",
      tag: "落叶小乔木 · 槭树科",
      facts: [
        ["叶形", "掌状分裂，常见 5–7 裂"],
        ["变色", "秋季花青素增多"],
        ["别名", "鸡爪槭、红枫"]
      ],
      text: "枫叶的“红”并不是秋天才有。春夏时叶绿素占主导，掩盖了其他色素；入秋后叶绿素分解，花青素和类胡萝卜素显露出来，叶子就变成红色或橙色。",
      ask: "为什么同一棵树上的枫叶，颜色深浅不一样？"
    },
    {
      name: "蒲公英",
      latin: "Taraxacum mongolicum",
      tag: "多年生草本 · 菊科",
      facts: [
        ["果实", "瘦果，带冠毛"],
        ["传播", "风力传播"],
        ["用途", "蜜源植物"]
      ],
      text: "蒲公英的白色“绒球”其实是果实，每一颗瘦果上都有降落伞一样的冠毛。风一吹，种子就能飞到很远的地方。它贴地生长的叶子还能减少水分蒸发。",
      ask: "蒲公英的种子为什么能飞那么远？"
    }
  ];

  const STORY = {
    title: "影子爷爷",
    text: "傍晚，小豆子在院子里追着自己的影子跑。影子一会儿长，一会儿短，怎么也踩不到。\n\n影子爷爷笑着说：“你站到路灯下试试。”小豆子站在灯的正下方，影子缩成了一小团；往旁边挪两步，影子又拉长了。\n\n“影子不是你的朋友，”爷爷说，“它只是光被挡住以后，留给地面的一块暗处。”",
    question: "影子形成的条件是什么？",
    options: [
      "只要有黑夜，就一定有影子",
      "物体自己会发出影子",
      "光、不透明物体和能显示影子的屏（或地面）",
      "只要有风，影子就会出现"
    ],
    answer: 2,
    explain: "光沿直线传播，遇到不透明物体被挡住，在物体后面形成较暗的区域，这就是影子。"
  };

  const POEMS = [
    {
      title: "枫桥夜泊",
      author: "唐 · 张继",
      line: "月落乌啼霜满天，______。",
      options: ["江枫渔火对愁眠", "姑苏城外寒山寺", "夜半钟声到客船", "春风又绿江南岸"],
      answer: 0,
      explain: "“月落乌啼霜满天，江枫渔火对愁眠。”诗人把看到的、听到的、感受到的景物叠在一起，写出了旅途中的孤寂。"
    },
    {
      title: "山居秋暝",
      author: "唐 · 王维",
      line: "空山新雨后，______。",
      options: ["天气晚来秋", "清泉石上流", "明月松间照", "竹喧归浣女"],
      answer: 0,
      explain: "“空山新雨后，天气晚来秋。”一场新雨洗过山林，秋天的凉意就来了。先写天气，再写月光与泉水，画面一层层展开。"
    }
  ];

  const CODE_QUESTION = {
    question: "想让小猫先走 10 步，再说“你好”，正确的积木顺序是？",
    options: [
      "说“你好” → 移动 10 步",
      "移动 10 步 → 说“你好”",
      "重复 10 次 → 说“你好”",
      "等待 1 秒 → 移动 10 步"
    ],
    answer: 1,
    explain: "程序从上到下依次执行。先移动，再说话，顺序反了，小猫就会先说“你好”再出发。"
  };

  function speakText(text, lang, rate) {
    if (!("speechSynthesis" in window)) {
      toast("当前浏览器不支持语音", "可以先自己朗读一遍，效果一样好。", "warn");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang || "zh-CN";
      utterance.rate = rate || (lang === "en-US" ? 0.86 : 0.92);
      utterance.pitch = 1.02;
      window.speechSynthesis.speak(utterance);
      toast("开始朗读", "跟着声音读一遍，注意停顿和语气。");
    } catch (error) {
      toast("朗读没有启动", "请检查浏览器的语音权限。", "warn");
    }
  }

  function openEnrich(kind) {
    if (kind === "ai-object") return openObjectModal();
    if (kind === "ai-story") return openStoryModal();
    if (kind === "poem") return openPoemModal();
    if (kind === "speak") return openSpeakModal();
    if (kind === "science") return openScienceModal();
    if (kind === "code") return openCodeModal();
  }

  function openObjectModal() {
    const object = OBJECTS[ui.objectIndex % OBJECTS.length];
    openModal(modalShell(
      "AI 识万物 · 本地演示",
      "一片叶子，也有自己的故事",
      `
        <div class="knowledge-hero">
          <span class="knowledge-hero-tag">识别置信度 97%</span>
          <span class="leaf-art">${icon("leaf")}</span>
        </div>
        <div class="knowledge-title">${esc(object.name)}</div>
        <div class="knowledge-sub">${esc(object.latin)} · ${esc(object.tag)}</div>
        <div class="knowledge-facts">
          ${object.facts.map(([label, value]) => `<div class="knowledge-fact"><strong>${esc(label)}</strong><span>${esc(value)}</span></div>`).join("")}
        </div>
        <p class="knowledge-text">${esc(object.text)}</p>
        <div class="quiz-feedback" style="margin-top:12px">
          <span class="quiz-feedback-icon">${icon("lightbulb")}</span>
          <div><strong>观察任务</strong><p>${esc(object.ask)} 先自己猜一猜，再去问小思。</p></div>
        </div>
      `,
      `<button class="btn btn-soft" type="button" data-action="object-next">${icon("rotate")}再识别一种</button><button class="btn btn-primary" type="button" data-action="ask-enrich" data-prompt="${esc(object.ask)}">${icon("sparkles")}问问小思</button>`
    ));
  }

  function openStoryModal() {
    const answer = ui.enrich.story;
    const checked = answer != null;
    const correct = answer === STORY.answer;
    openModal(modalShell(
      "AI 读绘本 · 听说读",
      "影子爷爷",
      `
        <div class="knowledge-hero" style="background:linear-gradient(145deg,#f5f1ff,#fffdf4)">
          <span class="knowledge-hero-tag">推荐 · 5 分钟</span>
          <span class="leaf-art" style="color:#654bbd">${icon("book")}</span>
        </div>
        <div class="story-box">${STORY.text.split("\n\n").map((paragraph) => `<p style="margin:0 0 7px">${esc(paragraph)}</p>`).join("")}</div>
        <button class="speak-button" type="button" data-action="story-speak">${icon("volume")}听小思读一遍</button>
        <div class="quiz-meta" style="margin-top:16px"><span class="chip chip-mint">读后思考</span><span class="chip">理解情节</span></div>
        <div class="quiz-question" style="font-size:12px;margin-top:8px">${esc(STORY.question)}</div>
        <div class="quiz-options">
          ${STORY.options.map((option, index) => {
            let cls = "";
            if (checked) {
              if (index === STORY.answer) cls = "is-correct";
              else if (index === answer) cls = "is-wrong";
              else cls = "is-faded";
            }
            return `<button class="quiz-option ${cls}" type="button" data-action="story-answer" data-index="${index}" ${checked ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`;
          }).join("")}
        </div>
        ${checked ? `<div class="quiz-feedback ${correct ? "" : "is-wrong"}"><span class="quiz-feedback-icon">${icon(correct ? "check" : "x")}</span><div><strong>${correct ? "读懂了" : "回到故事里再找一找"}</strong><p>${esc(STORY.explain)}</p></div></div>` : ""}
      `,
      `<button class="btn btn-soft" type="button" data-close-modal>先读到这里</button><button class="btn btn-primary" type="button" data-action="ask-enrich" data-prompt="为什么影子的方向总与光源相反？">${icon("sparkles")}继续追问</button>`
    ));
    if (checked) scrollModalToBottom();
  }

  function openPoemModal() {
    const poem = POEMS[ui.enrich.poemIndex % POEMS.length];
    const answer = ui.enrich.poem;
    const checked = answer != null;
    const correct = answer === poem.answer;
    openModal(modalShell(
      "诗词大会 · 飞花令",
      "把这一句，接完整",
      `
        <div class="knowledge-hero" style="background:linear-gradient(145deg,#fff3ee,#fffdf5)">
          <span class="knowledge-hero-tag">唐诗 · 七言绝句</span>
          <span class="leaf-art" style="color:#c44f32;font-family:var(--font-serif);font-size:26px">诗</span>
        </div>
        <div class="knowledge-title" style="text-align:center">${esc(poem.title)}</div>
        <div class="knowledge-sub" style="text-align:center">${esc(poem.author)}</div>
        <div class="story-box" style="text-align:center;font-size:16px;letter-spacing:.05em">${esc(poem.line)}</div>
        <div class="quiz-options">
          ${poem.options.map((option, index) => {
            let cls = "";
            if (checked) {
              if (index === poem.answer) cls = "is-correct";
              else if (index === answer) cls = "is-wrong";
              else cls = "is-faded";
            }
            return `<button class="quiz-option ${cls}" type="button" data-action="poem-answer" data-index="${index}" ${checked ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`;
          }).join("")}
        </div>
        ${checked ? `<div class="quiz-feedback ${correct ? "" : "is-wrong"}"><span class="quiz-feedback-icon">${icon(correct ? "check" : "x")}</span><div><strong>${correct ? "接住了，这一句很有画面感" : "再读一遍，注意上下句的意境"}</strong><p>${esc(poem.explain)}</p></div></div>` : ""}
      `,
      `<button class="btn btn-soft" type="button" data-close-modal>收下这首诗</button><button class="btn btn-primary" type="button" data-action="poem-next">${icon("rotate")}换一首</button>`
    ));
    if (checked) scrollModalToBottom();
  }

  function scrollModalToBottom() {
    window.setTimeout(() => {
      const body = $(".modal-body", modalRoot);
      if (body) body.scrollTop = body.scrollHeight;
    }, 50);
  }

  function openSpeakModal() {
    const score = ui.enrich.speak;
    openModal(modalShell(
      "AI 口语分级练 · Level 4",
      "把这一句，说给自己听",
      `
        <div class="knowledge-hero" style="background:linear-gradient(145deg,#edf3ff,#fffdf8)">
          <span class="knowledge-hero-tag">跟读 · 约 1 分钟</span>
          <span class="leaf-art" style="color:#3f6bc0">${icon("mic")}</span>
        </div>
        <div class="story-box" style="text-align:center;font-size:16px;font-family:var(--font-sans);letter-spacing:.01em">
          I can play the piano.<br><span style="font-size:10px;color:#7c8597">我会弹钢琴。</span>
        </div>
        <div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">
          <button class="speak-button" type="button" data-action="speak-sample">${icon("volume")}听标准发音</button>
          <button class="speak-button" type="button" data-action="speak-sample-slow">${icon("headphones")}慢速跟读</button>
        </div>
        ${score != null ? `
          <div class="diagnostic-score" style="margin-top:14px">
            <span class="score-ring" style="--score:${score}"><strong>${score}</strong></span>
            <div class="score-copy">
              <strong>发音清晰，连读自然</strong>
              <p>piano 的重音在第二音节，试着把 /æ/ 的口型再打开一点。再读一遍会更稳。</p>
            </div>
          </div>
        ` : ""}
      `,
      `<button class="btn btn-soft" type="button" data-close-modal>稍后再练</button><button class="btn btn-primary" type="button" data-action="speak-score">${icon("mic")}${score != null ? "再评一次" : "开始跟读评分"}</button>`
    ));
    if (score != null) scrollModalToBottom();
  }

  function openScienceModal() {
    const steps = [
      "把手电筒固定在橡皮左侧 20 厘米处，观察影子落在哪边。",
      "保持橡皮不动，把手电筒移到正上方，比较影子长短。",
      "把手电筒贴近桌面，观察影子边缘的变化。"
    ];
    const checkedCount = ui.enrich.science.length;
    openModal(modalShell(
      "科学实验室 · 光与影",
      "只改变一个条件，再观察",
      `
        <div class="knowledge-hero" style="background:linear-gradient(145deg,#ecfaf1,#fffdf4)">
          <span class="knowledge-hero-tag">家庭实验 · 8 分钟</span>
          <span class="leaf-art" style="color:#2e8b61">${icon("flask")}</span>
        </div>
        <p class="knowledge-text" style="margin-top:0">你需要：手电筒、一块橡皮、一张白纸。先在纸上画一个“正”字，用来记录每次影子的方向。</p>
        <div class="lesson-points">
          ${steps.map((step, index) => {
            const checked = ui.enrich.science.includes(index);
            return `<button class="lesson-point" type="button" data-action="science-check" data-index="${index}" style="width:100%;text-align:left;border:1px solid ${checked ? "#b9e9df" : "transparent"};background:${checked ? "#f1fcf8" : "var(--surface-2)"}"><b>${checked ? icon("check") : index + 1}</b><span>${esc(step)}</span></button>`;
          }).join("")}
        </div>
        ${checkedCount === 3 ? `<div class="quiz-feedback"><span class="quiz-feedback-icon">${icon("check")}</span><div><strong>实验记录完整</strong><p>你发现了：光源方向改变，影子的方向和长短都会变化。把这句话讲给家人听，就算真正完成了。</p></div></div>` : `<div class="plan-tip" style="margin-top:12px">${icon("lightbulb")}<p><strong>小提示：</strong>每次只改变一个条件，这样才知道影子变化到底是谁造成的。</p></div>`}
      `,
      `<span class="foot-note">${checkedCount} / 3 步已记录</span><button class="btn btn-primary" type="button" data-close-modal>完成实验</button>`
    ));
  }

  function openCodeModal() {
    const answer = ui.enrich.code;
    const checked = answer != null;
    const correct = answer === CODE_QUESTION.answer;
    openModal(modalShell(
      "创意编程 · 顺序思维",
      "小猫应该先做什么？",
      `
        <div class="knowledge-hero" style="background:linear-gradient(145deg,#f1edfd,#fffdf8)">
          <span class="knowledge-hero-tag">Scratch · 第 4 课</span>
          <span class="leaf-art" style="color:#654bbd">${icon("code")}</span>
        </div>
        <div class="quiz-question" style="font-size:13px;margin-top:0">${esc(CODE_QUESTION.question)}</div>
        <div class="quiz-options">
          ${CODE_QUESTION.options.map((option, index) => {
            let cls = "";
            if (checked) {
              if (index === CODE_QUESTION.answer) cls = "is-correct";
              else if (index === answer) cls = "is-wrong";
              else cls = "is-faded";
            }
            return `<button class="quiz-option ${cls}" type="button" data-action="code-answer" data-index="${index}" ${checked ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span></button>`;
          }).join("")}
        </div>
        ${checked ? `<div class="quiz-feedback ${correct ? "" : "is-wrong"}"><span class="quiz-feedback-icon">${icon(correct ? "check" : "x")}</span><div><strong>${correct ? "顺序正确，小猫出发了" : "程序的顺序会改变结果"}</strong><p>${esc(CODE_QUESTION.explain)}</p></div></div>` : ""}
      `,
      `<button class="btn btn-soft" type="button" data-close-modal>先退出</button><button class="btn btn-primary" type="button" data-action="ask-enrich" data-prompt="Scratch 里的顺序和循环有什么区别？">${icon("sparkles")}问问小思</button>`
    ));
    if (checked) scrollModalToBottom();
  }

  function openPoemNext() {
    ui.enrich.poemIndex = (ui.enrich.poemIndex + 1) % POEMS.length;
    ui.enrich.poem = null;
    const poem = POEMS[ui.enrich.poemIndex];
    openPoemModal();
    toast("换一首", `下一首是《${poem.title}》，先读一遍，再接最后一句。`);
  }

  /* ------------------------------------------------------------------------
     Reports, settings and quick practice
     ------------------------------------------------------------------------ */

  function openParentReport() {
    const avg = masteryAverage();
    const reportMinutes = [...DATA.usage.minutes];
    reportMinutes[reportMinutes.length - 1] = state.todayMinutes;
    const total = reportMinutes.reduce((sum, value) => sum + value, 0);
    openModal(modalShell(
      "家长中心 · 本周报告",
      "看见进步，也看见需要休息的地方",
      `
        <div class="parent-hero" style="margin-bottom:14px;padding:14px">
          <span class="parent-avatar" style="width:44px;height:44px;flex-basis:44px;border-radius:14px;font-size:19px">${esc(state.profile.short)}</span>
          <div class="parent-identity"><h2 style="font-size:15px">${esc(state.profile.name)} · 第 11 周</h2><p>${esc(state.profile.grade)} · 本周学习 ${formatMinutes(total)}</p></div>
          <span class="chip chip-mint">${icon("flame")}连续 ${state.profile.streak} 天</span>
        </div>
        <div class="profile-stats">
          <div class="profile-stat"><strong>${Math.round(total / 7)}<small style="font-size:9px"> 分</small></strong><span>日均学习</span></div>
          <div class="profile-stat"><strong>${avg}%</strong><span>综合掌握</span></div>
          <div class="profile-stat"><strong>${unmasteredCount()}</strong><span>待复习错题</span></div>
        </div>
        <div class="result-breakdown" style="margin-top:14px">
          ${Object.entries(state.mastery).sort((a, b) => b[1] - a[1]).map(([label, value]) => `
            <div class="result-breakdown-row"><span>${esc(label)}</span><span class="progress"><span style="width:${value}%"></span></span><b>${value}%</b></div>
          `).join("")}
        </div>
        <div class="report-list" style="margin-top:15px">
          <div class="report-item"><i></i><span><strong>值得肯定：</strong>本周按计划完成了 ${state.tasks.filter((task) => task.done).length} 项任务，数学计算正确率提升明显。</span></div>
          <div class="report-item"><i></i><span><strong>下一步：</strong>把「分数应用」的 3 道变式题放在下午 4:30，避开疲劳时段。</span></div>
          <div class="report-item"><i></i><span><strong>思维习惯：</strong>完成 ${state.thinking.completed.length} 个思维挑战，口述 ${state.thinking.reflections.length} 次，使用 ${state.thinking.hintsUsed} 次提示。</span></div>
          <div class="report-item"><i></i><span><strong>用眼提醒：</strong>本周有 2 次连续使用超过 40 分钟，建议每 25 分钟起身活动。</span></div>
        </div>
      `,
      `<span class="foot-note">报告由本机学习记录生成</span><button class="btn btn-soft" type="button" data-action="export-parent-report">${icon("download")}导出</button><button class="btn btn-primary" type="button" data-close-modal>完成</button>`
    ));
  }

  function downloadText(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportMistakes() {
    const lines = ["知启 · 错题本", `导出时间：${new Date().toLocaleString("zh-CN")}`, ""];
    state.mistakes.forEach((mistake, index) => {
      lines.push(`${index + 1}. [${mistake.subjectName} · ${mistake.tag}] ${mistake.question}`);
      lines.push(`   我的答案：${mistake.options[mistake.wrong]}`);
      lines.push(`   正确答案：${mistake.options[mistake.answer]}`);
      lines.push(`   解析：${mistake.explain}`);
      lines.push(`   状态：${mistake.mastered ? "已掌握" : "待复习"}`);
      lines.push("");
    });
    downloadText("知启-错题本.txt", lines.join("\n"));
    toast("错题本已导出", "文本文件已保存到下载文件夹。");
  }

  function exportParentReport() {
    const lines = [
      "知启 · 本周学习报告",
      `学生：${state.profile.name}（${classLabel()}）`,
      `导出时间：${new Date().toLocaleString("zh-CN")}`,
      "",
      `今日学习：${state.todayMinutes} 分钟`,
      `本周专注：${state.weekFocus} / ${state.weekGoal} 分钟`,
      `连续学习：${state.profile.streak} 天`,
      `综合掌握：${masteryAverage()}%`,
      "",
      "知识点掌握：",
      ...Object.entries(state.mastery).map(([label, value]) => `- ${label}：${value}%`),
      "",
      "学习建议：",
      "- 把分数应用题放在下午注意力较好的时段。",
      "- 每 25 分钟休息一次，远眺 20 秒。",
      "- 本周优先复习待掌握错题。"
    ];
    downloadText("知启-本周学习报告.txt", lines.join("\n"));
    toast("报告已导出", "文本文件已保存到下载文件夹。");
  }

  function isStandalone() {
    return Boolean(window.navigator.standalone) ||
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches;
  }

  function isIosDevice() {
    return /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  }

  function updateInstallUI() {
    const button = $("#install-button");
    if (!button) return;
    const canInstall = /^https?:$/.test(location.protocol);
    button.hidden = isStandalone() || !canInstall;
    button.title = deferredInstallPrompt ? "立即安装知启" : "安装到主屏幕";
    button.setAttribute("aria-label", button.title);
  }

  function installApp() {
    if (isStandalone()) {
      toast("已经在主屏幕运行", "当前窗口就是安装后的知启，支持离线打开。");
      return;
    }
    if (isIosDevice()) {
      openInstallHelp();
      return;
    }
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice
        .then((choice) => {
          if (choice.outcome === "accepted") {
            toast("正在安装知启", "安装完成后，可以从主屏幕直接打开。", "award");
          }
          deferredInstallPrompt = null;
          updateInstallUI();
        })
        .catch(() => {
          deferredInstallPrompt = null;
          updateInstallUI();
        });
      return;
    }
    openInstallHelp();
  }

  function copyAppLink() {
    const link = location.href;
    const done = () => toast("链接已复制", "在 iPad 的 Safari 地址栏粘贴打开即可。");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(done).catch(() => fallbackCopy(link, done));
      return;
    }
    fallbackCopy(link, done);
  }

  function fallbackCopy(text, done) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (error) {
      toast("请长按链接复制", text, "warn");
    }
    area.remove();
  }

  function shareApp() {
    if (navigator.share) {
      navigator.share({
        title: "知启 · AI 学习桌面",
        text: "把同步课堂、AI 精准学和错题本放进一个学习桌面。",
        url: location.href
      }).catch(() => {});
      return;
    }
    copyAppLink();
  }

  function openInstallHelp() {
    const installed = isStandalone();
    const online = /^https?:$/.test(location.protocol);
    const ios = isIosDevice();
    const displayLink = location.href.length > 76 ? `${location.href.slice(0, 76)}…` : location.href;
    const steps = ios
      ? [
          ["用 Safari 打开", "请使用 Safari，微信 / 抖音等内置浏览器不支持“添加到主屏幕”。"],
          ["点“分享”", "点击 Safari 顶部工具栏的分享按钮（方框向上箭头）。"],
          ["添加到主屏幕", "在分享菜单中向下滑，选择“添加到主屏幕”，名称填“知启”。"],
          ["从主屏幕启动", "以后从主屏幕图标进入，会以全屏独立窗口运行。"]
        ]
      : [
          ["使用 Chrome / Edge 打开", "在线地址需要是 HTTPS，localhost 也可以。"],
          ["点击安装", "在地址栏右侧点击安装图标；或打开浏览器菜单选择“安装应用”。"],
          ["确认安装", "安装后从桌面 / 启动台打开，窗口更接近独立应用。"],
          ["离线使用", "首次加载完成后，课程和工具会被缓存，断网也能打开。"]
        ];

    openModal(modalShell(
      installed ? "安装状态" : "安装应用",
      installed ? "知启已经在独立窗口中运行" : "把知启放到主屏幕，用起来更像一台学习机",
      `
        <div class="install-card" style="margin-top:0">
          <span class="install-card-icon">${icon("download")}</span>
          <div class="install-card-copy">
            <strong>${installed ? "已安装 · 独立窗口" : ios ? "Safari · 添加到主屏幕" : "浏览器 · 安装应用"}</strong>
            <p>${installed ? "支持触摸操作，应用壳已缓存，可从主屏幕直接打开。" : "首次安装需要联网，安装完成后可离线打开已缓存的内容。"}</p>
          </div>
          <span class="chip ${installed ? "chip-mint" : "chip-amber"}">${installed ? "PWA" : "推荐"}</span>
        </div>
        <div class="install-steps">
          ${steps.map(([title, desc], index) => `
            <div class="install-step">
              <span class="install-step-num">${index + 1}</span>
              <div class="install-step-copy"><strong>${esc(title)}</strong><span>${esc(desc)}</span></div>
            </div>
          `).join("")}
        </div>
        <div class="install-url">
          <code>${esc(displayLink)}</code>
          <button class="btn btn-sm btn-soft" type="button" data-action="copy-app-link">复制</button>
        </div>
        ${!online ? `<div class="install-note">${icon("info")}<span>当前是本地文件预览。要安装到 iPad，需要先通过 HTTPS 静态托管，或使用电脑上的隧道地址。</span></div>` : ""}
        <div class="install-note">${icon("lock")}<span>学习记录保存在安装后的独立浏览器容器中；如果从 Safari 切换到主屏幕版本，数据不会自动同步。</span></div>
      `,
      installed
        ? `<button class="btn btn-primary" type="button" data-close-modal>完成</button>`
        : `<button class="btn btn-soft" type="button" data-close-modal>稍后</button>${ios ? `<button class="btn btn-primary" type="button" data-action="share-app">${icon("upload")}分享 / 添加</button>` : `<button class="btn btn-primary" type="button" data-action="copy-app-link">${icon("clip")}复制链接</button>`}`
    ));
  }

  function setupPwa() {
    updateInstallUI();
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      updateInstallUI();
    });
    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      updateInstallUI();
      toast("已安装到主屏幕", "下次可以直接从主屏幕打开知启。", "award");
    });
    if (window.matchMedia) {
      const media = window.matchMedia("(display-mode: standalone)");
      if (media.addEventListener) media.addEventListener("change", updateInstallUI);
    }
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((error) => {
          console.warn("Service worker registration failed:", error);
        });
      });
    }
    window.addEventListener("offline", () => {
      toast("已离线", "已缓存的课程和工具仍然可以使用。", "warn");
    });
    window.addEventListener("online", () => {
      toast("网络已恢复", "学习记录会继续保存在本机。");
    });
  }

  function openProfileEditor(options) {
    const newChild = Boolean(options && options.newChild);
    const onboarding = Boolean(options && options.onboarding) && !newChild;
    const blankForm = onboarding || newChild;
    const profile = state.profile;
    const currentTextbooks = profile.textbooks || {};
    const currentGrade = profile.grade || SAMPLE_GRADE;
    const currentTerm = profile.term || "下册";
    const currentGoal = Number(profile.dailyGoal || state.parent.dailyLimit || 90);
    const initialName = blankForm ? "" : profile.name || "";
    const initialCall = blankForm ? "" : profile.callName || "";
    const initialClass = blankForm ? "" : profile.className || "";
    const initialSchool = blankForm ? "" : profile.school || "";
    const gradeOptions = GRADE_OPTIONS.map((grade) => `<option value="${grade}" ${grade === currentGrade ? "selected" : ""}>${grade}</option>`).join("");
    const termOptions = TERM_OPTIONS.map((term) => `<option value="${term}" ${term === currentTerm ? "selected" : ""}>${term}</option>`).join("");
    const goalOptions = [30, 45, 60, 90, 120].map((goal) => `<option value="${goal}" ${goal === currentGoal ? "selected" : ""}>${goal} 分钟</option>`).join("");
    const bookRows = DATA.subjects.map((subject) => {
      const options = (TEXTBOOK_OPTIONS[subject.id] || [subject.version.split("·")[0].trim()]);
      const selected = currentTextbooks[subject.id] || options[0];
      return `
        <div class="setup-book-row">
          <span>${esc(subject.name)}</span>
          <select id="profile-book-${subject.id}" aria-label="${esc(subject.name)}教材版本">
            ${options.map((book) => `<option value="${esc(book)}" ${book === selected ? "selected" : ""}>${esc(book)}</option>`).join("")}
          </select>
        </div>
      `;
    }).join("");

    openModal(modalShell(
      newChild ? "添加孩子" : onboarding ? "开始设置" : "学习档案",
      newChild ? "再添加一个孩子" : onboarding ? "先认识一下你的孩子" : "编辑孩子的学习档案",
      `
        <div class="setup-hero">
          <span class="setup-avatar" id="setup-avatar">${esc(blankForm ? "学" : profileInitial())}</span>
          <div class="setup-hero-copy">
            <span class="eyebrow">${icon("user")}PROFILE</span>
            <h3>${newChild ? "每个孩子都有独立的学习空间" : onboarding ? "把桌面变成他自己的学习空间" : "这些信息只保存在当前设备"}</h3>
            <p>姓名、年级和教材版本会同步到首页、同步课堂、作业批改、家长中心和 AI 老师。</p>
          </div>
        </div>
        ${onboarding ? `
          <div class="setup-preset">
            <div>
              <strong>家里有两个孩子？</strong>
              <span>一键创建「五年级 + 一年级」双孩档案：语文人教版、数学北师大版、英语沪教版、科学待确定。创建后可改姓名和班级。</span>
            </div>
            <button class="btn btn-sm btn-soft" type="button" data-action="use-family-preset">${icon("user")}使用双孩预设</button>
          </div>
        ` : ""}
        <form id="profile-form">
          <div class="setup-section">
            <div class="setup-section-head"><strong>孩子信息</strong><span>随时可以在偏好设置中修改</span></div>
            <div class="form-grid">
              <div class="field">
                <label for="profile-name">姓名</label>
                <input id="profile-name" name="name" maxlength="20" value="${esc(initialName)}" placeholder="例如：林小宇" required>
              </div>
              <div class="field">
                <label for="profile-call">平时怎么称呼</label>
                <input id="profile-call" name="callName" maxlength="12" value="${esc(initialCall)}" placeholder="例如：小宇">
              </div>
              <div class="field">
                <label for="profile-grade">年级</label>
                <select id="profile-grade" name="grade">${gradeOptions}</select>
              </div>
              <div class="field">
                <label for="profile-class">班级</label>
                <input id="profile-class" name="className" maxlength="12" value="${esc(initialClass)}" placeholder="例如：3班">
              </div>
              <div class="field full">
                <label for="profile-school">学校（可选）</label>
                <input id="profile-school" name="school" maxlength="30" value="${esc(initialSchool)}" placeholder="例如：启明实验小学">
              </div>
            </div>
          </div>

          <div class="setup-section">
            <div class="setup-section-head"><strong>教材与学习目标</strong><span>用于同步课程与家长设置</span></div>
            <div class="form-grid">
              <div class="field">
                <label for="profile-term">当前学期</label>
                <select id="profile-term" name="term">${termOptions}</select>
              </div>
              <div class="field">
                <label for="profile-goal">每日学习目标</label>
                <select id="profile-goal" name="dailyGoal">${goalOptions}</select>
              </div>
            </div>
            <div class="setup-book-grid">${bookRows}</div>
          </div>
        </form>
        <div class="setup-note">
          ${icon("info")}
          <span><strong>关于课程内容：</strong>当前内置课程库是五年级示例。姓名、年级、教材版本和每日目标会立即生效；如果选择其他年级，界面会标注“示例课程”，但不会自动下载对应教材。后续接入真实内容库后可直接替换。</span>
        </div>
      `,
      newChild
        ? `<button class="btn btn-soft" type="button" data-close-modal>取消</button><button class="btn btn-primary" type="submit" form="profile-form">${icon("plus")}添加并切换</button>`
        : onboarding
          ? `<span class="foot-note">建议填写真实信息，体验会更完整</span><button class="btn btn-soft" type="button" data-action="skip-profile-setup">先按示例使用</button><button class="btn btn-primary" type="submit" form="profile-form">${icon("check")}保存并开始</button>`
          : `<button class="btn btn-soft" type="button" data-close-modal>取消</button><button class="btn btn-primary" type="submit" form="profile-form">${icon("check")}保存修改</button>`
    ), "modal-lg");

    const form = $("#profile-form");
    const avatar = $("#setup-avatar");
    const nameInput = $("#profile-name");
    const callInput = $("#profile-call");
    const localInitial = (value) => {
      const text = String(value || "").trim();
      if (!text) return "学";
      if (/^[A-Za-z]/.test(text)) return text.charAt(0).toUpperCase();
      const chars = Array.from(text);
      return chars[chars.length - 1];
    };
    const syncAvatar = () => {
      if (avatar) avatar.textContent = localInitial(callInput.value || nameInput.value);
    };
    if (nameInput) nameInput.addEventListener("input", syncAvatar);
    if (callInput) callInput.addEventListener("input", syncAvatar);

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();
        if (!name) {
          nameInput.focus();
          toast("还需要一个名字", "填写孩子的姓名或常用称呼。", "warn");
          return;
        }
        const callName = callInput.value.trim() || name;
        const grade = $("#profile-grade").value;
        const className = $("#profile-class").value.trim();
        const school = $("#profile-school").value.trim();
        const term = $("#profile-term").value;
        const dailyGoal = Number($("#profile-goal").value);
        const textbooks = {};
        DATA.subjects.forEach((subject) => {
          const select = $(`#profile-book-${subject.id}`);
          if (select) textbooks[subject.id] = select.value;
        });
        const nextProfile = {
          ...state.profile,
          name,
          callName,
          short: localInitial(callName),
          grade,
          className,
          school,
          term,
          dailyGoal,
          textbooks,
          setupComplete: true
        };
        if (newChild) {
          createChild(nextProfile);
          return;
        }
        state.profile = nextProfile;
        state.parent.dailyLimit = dailyGoal;
        if (!state.chat.some((message) => message.role === "user")) {
          state.chat = [];
          ensureChat();
        }
        saveState();
        closeModal();
        updateProfileUI();
        if (onboarding) {
          go("home");
          if (currentRoute === "home") render({ routeChanged: false });
        } else {
          render({ routeChanged: false });
        }
        toast("学习档案已保存", `${callName} · ${grade}${term} · 每日 ${dailyGoal} 分钟`);
      });
    }
  }

  function skipProfileSetup() {
    state.profile.setupComplete = true;
    saveState();
    closeModal();
    updateProfileUI();
    toast("已按示例档案开始", "以后可以在偏好设置 → 学习档案里修改姓名、年级和教材。");
  }

  function emptyMastery() {
    const mastery = {};
    Object.keys(DATA.mastery).forEach((key) => {
      mastery[key] = 0;
    });
    return mastery;
  }

  function useFamilyPreset() {
    syncActiveChild();
    const now = Date.now();
    const sharedTextbooks = {
      chinese: "人教版",
      math: "北师大版",
      english: "沪教版",
      science: "待确定"
    };
    const firstId = state.activeChildId || `child-${now}`;
    const firstProfile = {
      ...state.profile,
      name: "大宝",
      callName: "大宝",
      short: "大",
      grade: "五年级",
      className: "",
      school: "",
      term: "上册",
      dailyGoal: 90,
      textbooks: { ...sharedTextbooks },
      setupComplete: true
    };
    state.profile = firstProfile;
    state.parent.dailyLimit = 90;
    const firstChild = snapshotChild(state, firstId);
    const secondProfile = {
      ...firstProfile,
      name: "二宝",
      callName: "二宝",
      short: "二",
      grade: "一年级",
      term: "上册",
      dailyGoal: 45,
      level: 1,
      nextXp: 200,
      streak: 0,
      textbooks: { ...sharedTextbooks }
    };
    const secondChild = {
      id: `child-${now + 1}`,
      profile: secondProfile,
      tasks: [],
      mistakes: [],
      mastery: emptyMastery(),
      learned: [],
      currentLessons: {},
      todayMinutes: 0,
      weekFocus: 0,
      weekGoal: 225,
      xp: 0,
      streak: 0,
      chat: [],
      diagnostic: { score: null, lastDate: null, completed: false },
      homeworkAdded: false,
      thinking: { completed: [], reflections: [], hintsUsed: 0 }
    };
    state.children = [firstChild, secondChild];
    state.activeChildId = firstId;
    state.chat = [];
    ensureChat();
    saveState();
    closeModal();
    updateProfileUI();
    go("home");
    if (currentRoute === "home") render({ routeChanged: true });
    toast("双孩档案已创建", "默认是大宝；点头像可以切换到二宝，再分别修改姓名和班级。", "award");
  }

  function createChild(profile) {
    syncActiveChild();
    const id = `child-${Date.now()}`;
    const goal = Number(profile.dailyGoal) || 60;
    const child = {
      id,
      profile: {
        ...profile,
        setupComplete: true,
        level: 1,
        nextXp: 200,
        streak: 0
      },
      tasks: [],
      mistakes: [],
      mastery: emptyMastery(),
      learned: [],
      currentLessons: {},
      todayMinutes: 0,
      weekFocus: 0,
      weekGoal: goal * 5,
      xp: 0,
      streak: 0,
      chat: [],
      diagnostic: { score: null, lastDate: null, completed: false },
      homeworkAdded: false,
      thinking: { completed: [], reflections: [], hintsUsed: 0 }
    };
    state.children.push(child);
    applyChildToState(child);
    state.chat = [];
    ensureChat();
    ui.selectedDay = todayOffset();
    ui.mistakeFilter = "all";
    ui.mistakeQuery = "";
    ui.homework = { stage: "idle", preview: "", fileName: "", sample: false };
    ui.diag = null;
    ui.redo = null;
    ui.thinking = null;
    flushFocus();
    saveState();
    closeModal();
    updateProfileUI();
    go("home");
    if (currentRoute === "home") render({ routeChanged: true });
    toast("已添加并切换", `现在是 ${profileName()} 的独立学习空间。`, "award");
  }

  function switchChild(id) {
    if (id === state.activeChildId) {
      closeModal();
      return;
    }
    syncActiveChild();
    const target = state.children.find((child) => child.id === id);
    if (!target) {
      toast("找不到这个孩子", "请重新打开孩子列表。", "warn");
      return;
    }
    applyChildToState(target);
    if (!state.chat.length) ensureChat();
    ui.selectedDay = todayOffset();
    ui.mistakeFilter = "all";
    ui.mistakeQuery = "";
    ui.homework = { stage: "idle", preview: "", fileName: "", sample: false };
    ui.diag = null;
    ui.redo = null;
    ui.thinking = null;
    flushFocus();
    saveState();
    closeModal();
    updateProfileUI();
    go("home");
    if (currentRoute === "home") render({ routeChanged: true });
    toast("已切换孩子", `已加载 ${profileName()} 的学习记录。`);
  }

  function flushFocus() {
    focus.running = false;
    focus.remaining = focus.duration;
    focus.endsAt = 0;
    focusHud.hidden = true;
    focusHud.innerHTML = "";
  }

  function openChildren() {
    syncActiveChild();
    const children = state.children;
    openModal(modalShell(
      "孩子档案",
      "谁在学习？",
      `
        <div class="child-choice-grid">
          ${children.map((child) => {
            const profile = child.profile || {};
            const active = child.id === state.activeChildId;
            const done = (child.tasks || []).filter((task) => task.done).length;
            return `
              <button class="child-choice ${active ? "is-active" : ""}" type="button" data-action="switch-child" data-id="${child.id}">
                <span class="child-choice-avatar">${esc(profile.short || "学")}</span>
                <span class="child-choice-copy">
                  <strong>${esc(profile.name || "未命名")}</strong>
                  <span>${esc(profile.grade || SAMPLE_GRADE)} · ${esc(profile.className || "未设置班级")}</span>
                  <span class="child-choice-stats">今日 ${child.todayMinutes || 0} 分钟 · 完成 ${done} 项任务</span>
                </span>
                <span class="child-choice-state">${active ? `${icon("check")}当前` : "切换"}</span>
              </button>
            `;
          }).join("")}
        </div>
        <div class="install-note" style="margin-top:13px">${icon("lock")}<span>每个孩子的学习计划、错题本、专注时长和 AI 对话独立保存，互不覆盖。</span></div>
      `,
      `<button class="btn btn-soft" type="button" data-action="open-profile">${icon("user")}当前档案</button><button class="btn btn-soft" type="button" data-action="add-child">${icon("plus")}添加孩子</button><button class="btn btn-primary" type="button" data-action="open-settings">${icon("settings")}设置</button>`,
      "modal-lg"
    ));
  }

  let contentDbPromise = null;

  function openContentDb() {
    if (!("indexedDB" in window)) {
      return Promise.reject(new Error("当前浏览器不支持本地教材库"));
    }
    if (contentDbPromise) return contentDbPromise;
    contentDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open("zhiqi-content-v1", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("books")) {
          const store = db.createObjectStore("books", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("无法打开本地教材库"));
    });
    return contentDbPromise;
  }

  async function listLibraryBooks() {
    const db = await openContentDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction("books", "readonly").objectStore("books").getAll();
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => Number(b.createdAt) - Number(a.createdAt)));
      request.onerror = () => reject(request.error);
    });
  }

  async function saveLibraryBooks(files, meta) {
    const db = await openContentDb();
    const books = [];
    for (const file of files) {
      if (file.size > 80 * 1024 * 1024) {
        throw new Error(`${file.name} 超过 80MB`);
      }
      books.push({
        id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: file.name.replace(/\.[^.]+$/, ""),
        fileName: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        grade: meta.grade,
        subject: meta.subject,
        subjectName: subjectName(meta.subject),
        version: meta.version,
        term: meta.term,
        createdAt: Date.now(),
        blob: new Blob([await file.arrayBuffer()], { type: file.type || "application/octet-stream" })
      });
    }
    await new Promise((resolve, reject) => {
      const tx = db.transaction("books", "readwrite");
      const store = tx.objectStore("books");
      books.forEach((book) => store.put(book));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getLibraryBook(id) {
    const db = await openContentDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction("books", "readonly").objectStore("books").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteLibraryBook(id) {
    const db = await openContentDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("books", "readwrite");
      tx.objectStore("books").delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    await renderLibraryList();
    toast("教材已移除", "只删除了本机保存的副本。");
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async function renderLibraryList() {
    const container = $("#library-list");
    if (!container) return;
    try {
      const books = await listLibraryBooks();
      if (!books.length) {
        container.innerHTML = `
          <div class="library-empty">
            ${icon("book")}
            <strong>还没有本地教材</strong>
            <p>导入自己合法拥有的 PDF 或图片，教材会保存在这台设备上，不上传云端。</p>
          </div>
        `;
        return;
      }
      container.innerHTML = books.map((book) => `
        <div class="library-item">
          <span class="library-file-icon">${book.type.startsWith("image/") ? icon("camera") : icon("file")}</span>
          <div class="library-item-copy">
            <strong>${esc(book.title)}</strong>
            <span>${esc(book.grade)} · ${esc(book.subjectName)} · ${esc(book.version)} ${esc(book.term)}</span>
            <span>${formatFileSize(book.size)} · 已保存在本机</span>
          </div>
          <div class="library-item-actions">
            <button class="btn btn-sm btn-soft" type="button" data-action="library-open" data-id="${esc(book.id)}">${icon("file")}打开</button>
            <button class="icon-button" type="button" data-action="library-delete" data-id="${esc(book.id)}" aria-label="删除教材">${icon("trash")}</button>
          </div>
        </div>
      `).join("");
    } catch (error) {
      container.innerHTML = `<div class="library-empty"><strong>本地教材库暂时不可用</strong><p>${esc(error.message)}</p></div>`;
    }
  }

  function openLibrary() {
    openModal(modalShell(
      "我的教材库",
      "把合法拥有的教材，放进本机离线备用",
      `
        <div class="library-intro">
          <span class="library-intro-icon">${icon("book")}</span>
          <div><strong>为什么这里没有“一键下载全套教材”</strong><p>小学教材和配套资源通常受版权保护，不能未经授权批量下载、打包或再分发。这个教材库只用于保存你自己合法拥有的 PDF / 图片，文件不会上传。</p></div>
        </div>
        <form id="library-form">
          <div class="form-grid" style="margin-top:14px">
            <div class="field">
              <label for="library-grade">年级</label>
              <select id="library-grade">${GRADE_OPTIONS.map((grade) => `<option value="${grade}" ${grade === (state.profile.grade || SAMPLE_GRADE) ? "selected" : ""}>${grade}</option>`).join("")}</select>
            </div>
            <div class="field">
              <label for="library-subject">学科</label>
              <select id="library-subject">${DATA.subjects.map((subject) => `<option value="${subject.id}" ${subject.id === "math" ? "selected" : ""}>${subject.name}</option>`).join("")}</select>
            </div>
            <div class="field">
              <label for="library-version">教材版本</label>
              <select id="library-version">${(TEXTBOOK_OPTIONS.math || []).map((book) => `<option value="${book}" ${book === (state.profile.textbooks && state.profile.textbooks.math) ? "selected" : ""}>${book}</option>`).join("")}</select>
            </div>
            <div class="field">
              <label for="library-term">学期</label>
              <select id="library-term">${TERM_OPTIONS.map((term) => `<option value="${term}" ${term === (state.profile.term || "下册") ? "selected" : ""}>${term}</option>`).join("")}</select>
            </div>
            <div class="field full">
              <label for="library-files">选择教材文件（PDF / 图片，可多选）</label>
              <input id="library-files" type="file" accept="application/pdf,image/*" multiple>
              <small>单个文件不超过 80MB。建议按“年级-学科-版本”命名，方便以后查找。</small>
            </div>
          </div>
        </form>
        <div class="library-list" id="library-list"><div class="library-empty">正在读取本地教材…</div></div>
        <div class="install-note">${icon("lock")}<span>知启不会要求、保存或代填任何平台账号密码。请自己在官方页面登录；如果平台只提供在线阅读，就把官方页面作为在线教材使用，不要用脚本绕过限制。</span></div>
      `,
      `<button class="btn btn-soft" type="button" data-action="open-official-textbooks">${icon("globe")}官方教材平台</button><button class="btn btn-primary" type="submit" form="library-form">${icon("upload")}导入本地教材</button>`,
      "modal-lg"
    ));

    const subjectSelect = $("#library-subject");
    const versionSelect = $("#library-version");
    const updateVersions = () => {
      const options = TEXTBOOK_OPTIONS[subjectSelect.value] || [];
      const current = (state.profile.textbooks && state.profile.textbooks[subjectSelect.value]) || options[0];
      versionSelect.innerHTML = options.map((book) => `<option value="${esc(book)}" ${book === current ? "selected" : ""}>${esc(book)}</option>`).join("");
    };
    if (subjectSelect) subjectSelect.addEventListener("change", updateVersions);
    const form = $("#library-form");
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const input = $("#library-files");
        const files = input && input.files ? Array.from(input.files) : [];
        if (!files.length) {
          toast("还没有选择文件", "请选择 PDF 或图片教材。", "warn");
          return;
        }
        try {
          await saveLibraryBooks(files, {
            grade: $("#library-grade").value,
            subject: $("#library-subject").value,
            version: $("#library-version").value,
            term: $("#library-term").value
          });
          input.value = "";
          await renderLibraryList();
          toast("教材已保存到本机", `已导入 ${files.length} 个文件，离线也能打开。`, "award");
        } catch (error) {
          toast("导入失败", error.message || "请检查文件大小。", "warn");
        }
      });
    }
    renderLibraryList();
  }

  async function openLibraryBook(id) {
    try {
      const book = await getLibraryBook(id);
      if (!book || !book.blob) throw new Error("文件不存在");
      const url = URL.createObjectURL(book.blob);
      const opened = window.open(url, "_blank", "noopener");
      if (!opened) {
        toast("浏览器拦截了新窗口", "请允许弹出窗口后再试一次。", "warn");
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast("打不开这个文件", error.message || "请重新导入。", "warn");
    }
  }

  function openSettings() {
    openModal(modalShell(
      "偏好设置",
      "让学习桌面更合你的习惯",
      `
        <div class="profile-hero">
          <span class="avatar">${esc(state.profile.short)}</span>
          <div><strong>${esc(state.profile.name)}</strong><p>${esc(state.profile.grade)} · ${esc(state.profile.school)}</p></div>
          <span class="chip chip-amber" style="margin-left:auto">Lv.${state.profile.level}</span>
        </div>
        <div class="setting-list">
          <div class="setting-row" data-action="toggle-simple-mode" style="cursor:pointer">
            <span class="setting-icon blue">${icon("grid")}</span>
            <div class="setting-copy"><strong>儿童简洁模式</strong><span>只保留大按钮和核心入口；关闭后显示完整学习桌面。</span></div>
            <button class="switch ${state.settings.simpleMode !== false ? "is-on" : ""}" type="button" role="switch" aria-checked="${state.settings.simpleMode !== false}" data-action="toggle-simple-mode" aria-label="儿童简洁模式"></button>
          </div>
          <div class="setting-row" data-action="edit-profile" style="cursor:pointer">
            <span class="setting-icon violet">${icon("user")}</span>
            <div class="setting-copy"><strong>学习档案与教材</strong><span>${esc(profileName())} · ${esc(state.profile.grade || SAMPLE_GRADE)} · ${esc(textbookVersion("math"))}</span></div>
            <button class="btn btn-sm btn-soft" type="button" data-action="edit-profile">编辑</button>
          </div>
          <div class="setting-row" data-action="open-library" style="cursor:pointer">
            <span class="setting-icon blue">${icon("book")}</span>
            <div class="setting-copy"><strong>我的教材库</strong><span>导入你合法拥有的教材 PDF / 图片，保存在本机离线备用。</span></div>
            <span class="chip">管理</span>
          </div>
          <div class="setting-row" data-action="open-official-textbooks" style="cursor:pointer">
            <span class="setting-icon amber">${icon("globe")}</span>
            <div class="setting-copy"><strong>国家中小学智慧教育平台</strong><span>登录后进入“教材”应用，按学段、学科、版本和年级查看电子教材。知启不接收平台账号或密码。</span></div>
            <span class="chip">打开</span>
          </div>
          <div class="setting-row" data-action="go-parent" style="cursor:pointer">
            <span class="setting-icon amber">${icon("shield")}</span>
            <div class="setting-copy"><strong>家长中心</strong><span>查看学习时长、设置答案保护和用眼提醒。</span></div>
            <span class="chip">进入</span>
          </div>
          <div class="setting-row" data-action="toggle-eye" style="cursor:pointer">
            <span class="setting-icon">${icon("leaf")}</span>
            <div class="setting-copy"><strong>未来纸护眼</strong><span>降低蓝光与高饱和刺激，保留纸张般的阅读质感。</span></div>
            <button class="switch ${state.settings.eyeCare ? "is-on" : ""}" type="button" role="switch" aria-checked="${state.settings.eyeCare}" data-action="toggle-eye" aria-label="未来纸护眼"></button>
          </div>
          <div class="setting-row">
            <span class="setting-icon blue">${icon("download")}</span>
            <div class="setting-copy"><strong>自动保存学习记录</strong><span>学习进度、错题和对话保存在本机浏览器。</span></div>
            <span class="chip chip-mint">已开启</span>
          </div>
          <div class="setting-row">
            <span class="setting-icon violet">${icon("shield")}</span>
            <div class="setting-copy"><strong>隐私与数据</strong><span>本演示不连接服务器，不收集个人信息。清除浏览器数据会重置进度。</span></div>
          </div>
        </div>
        <div class="install-card">
          <span class="install-card-icon">${icon("download")}</span>
          <div class="install-card-copy">
            <strong>${isStandalone() ? "已从主屏幕运行" : "安装到 iPad 主屏幕"}</strong>
            <p>${isStandalone() ? "当前是独立应用窗口，支持触摸和离线打开。" : "用 Safari 的“分享 → 添加到主屏幕”，获得全屏、触摸和离线体验。"}</p>
          </div>
          <button class="btn btn-sm" type="button" data-action="install-app">${isStandalone() ? "查看" : "安装"}</button>
        </div>
        <div class="reset-card" style="margin-top:14px">
          <strong>重置演示数据</strong>
          <p>将清空本机的学习进度、错题、计划与对话，恢复为初始演示状态。</p>
          <button class="btn btn-sm btn-danger-soft" type="button" data-action="reset-demo">${icon("rotate")}重置所有数据</button>
        </div>
        <p style="margin-top:13px;color:var(--muted-2);font-size:8px">知启 1.3 Beta · 思维闯关 / 儿童简洁 / 多孩子</p>
      `,
      `<button class="btn btn-primary" type="button" data-close-modal>完成</button>`
    ));
  }

  function openResetConfirm() {
    openModal(modalShell(
      "确认重置",
      "要把学习记录清空吗？",
      `
        <p style="color:var(--muted);font-size:10px;line-height:1.75">这会清除本机保存的学习进度、错题、计划和对话记录。操作无法撤销。</p>
        <div class="quiz-feedback is-wrong" style="margin-top:14px">
          <span class="quiz-feedback-icon">${icon("info")}</span>
          <div><strong>建议先导出错题本</strong><p>如果记录里有你想保留的题目，可以先关闭窗口，从错题本导出。</p></div>
        </div>
      `,
      `<button class="btn btn-soft" type="button" data-close-modal>取消</button><button class="btn btn-danger-soft" type="button" data-action="confirm-reset">${icon("trash")}确认重置</button>`
    ));
  }

  function resetDemo() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (error) {
      // ignore
    }
    state = createDefaultState();
    ensureChildrenState();
    ui.selectedDay = todayOffset();
    ui.chat = [];
    ui.homework = { stage: "idle", preview: "", fileName: "", sample: false };
    ui.diag = null;
    ui.redo = null;
    ui.thinking = null;
    ui.objectIndex = 0;
    ui.enrich = { story: null, poem: null, poemIndex: 0, speak: null, code: null, science: [] };
    closeModal();
    themeSync();
    go("home");
    if (currentRoute === "home") render({ routeChanged: true });
    toast("已恢复初始状态", "可以从今天的学习桌面重新开始。");
    window.setTimeout(() => openProfileEditor({ onboarding: true }), 650);
  }

  function themeSync() {
    updateEyeCare();
    updateSidebar();
  }

  function openProfile() {
    const xpPercent = Math.round((state.xp / state.profile.nextXp) * 100);
    openModal(modalShell(
      "学习档案",
      `${profileName()}的学习名片`,
      `
        <div class="profile-hero">
          <span class="avatar">${esc(state.profile.short)}</span>
          <div><strong>${esc(state.profile.name)}</strong><p>${esc(state.profile.school)} · ${esc(classLabel())}</p></div>
          <span class="chip chip-amber" style="margin-left:auto">Lv.${state.profile.level}</span>
        </div>
        <div class="profile-stats">
          <div class="profile-stat"><strong>${state.xp}</strong><span>经验值</span></div>
          <div class="profile-stat"><strong>${state.profile.streak}</strong><span>连续学习天数</span></div>
          <div class="profile-stat"><strong>${state.learned.length + 6}</strong><span>完成课时</span></div>
        </div>
        <div class="week-goal" style="margin-top:13px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)">
          <div class="week-goal-head"><div><h3>距离 Lv.${state.profile.level + 1}</h3><p class="panel-sub" style="font-size:8.5px">再获得 ${Math.max(0, state.profile.nextXp - state.xp)} 经验值</p></div><strong>${xpPercent}%</strong></div>
          <div class="goal-bar"><span style="width:${Math.min(100, xpPercent)}%"></span></div>
        </div>
        <div class="profile-badges">
          <span class="chip chip-amber">${icon("flame")}连续 12 天</span>
          <span class="chip chip-mint">${icon("star")}错题克星</span>
          <span class="chip chip-blue">${icon("headphones")}口语 Lv.4</span>
          <span class="chip chip-violet">${icon("palette")}素养探索者</span>
        </div>
      `,
      `<button class="btn btn-soft" type="button" data-action="go-plan">${icon("calendar")}学习计划</button><button class="btn btn-soft" type="button" data-action="edit-profile">${icon("user")}编辑资料</button><button class="btn btn-primary" type="button" data-close-modal>关闭</button>`
    ));
  }

  function openNotifications() {
    openModal(modalShell(
      "消息中心",
      "今天有三件小事",
      `
        <div class="notice-list">
          ${DATA.notifications.map((notice) => `
            <div class="notice-item">
              <span class="notice-icon ${notice.tone}">${icon(notice.icon)}</span>
              <div class="notice-copy"><strong>${esc(notice.title)}</strong><p>${esc(notice.text)}</p><time>${esc(notice.time)}</time></div>
            </div>
          `).join("")}
        </div>
      `,
      `<button class="btn btn-primary" type="button" data-close-modal>知道了</button>`
    ));
  }

  function openDictation() {
    const words = [
      { cn: "琵琶（乐器）", answer: "pipa" },
      { cn: "画画", answer: "draw" },
      { cn: "唱歌", answer: "sing" },
      { cn: "游泳", answer: "swim" }
    ];
    openModal(modalShell(
      "单词听写 · Unit 4",
      "听完再写，不看答案",
      `
        <p style="color:var(--muted);font-size:9.5px;line-height:1.7">点击每个单词旁的播放键，听标准发音后填写英文。写完后一起批改。</p>
        <div class="form-grid" style="margin-top:14px" id="dictation-form">
          ${words.map((word, index) => `
            <div class="field">
              <label for="dictation-${index}">${esc(word.cn)}</label>
              <div style="display:flex;gap:6px">
                <input id="dictation-${index}" data-answer="${esc(word.answer)}" autocomplete="off" placeholder="输入英文">
                <button class="btn btn-soft" type="button" data-action="dictation-speak" data-word="${esc(word.answer)}" aria-label="播放 ${esc(word.answer)}">${icon("volume")}</button>
              </div>
            </div>
          `).join("")}
        </div>
        <div id="dictation-feedback"></div>
      `,
      `<span class="foot-note">4 个核心词 · 约 2 分钟</span><button class="btn btn-primary" type="button" data-action="dictation-check">${icon("check")}提交听写</button>`
    ));
  }

  function openMentalMath() {
    const questions = [
      { text: "84 ÷ 7 =", answer: "12" },
      { text: "3/4 + 1/4 =", answer: "1" },
      { text: "25 × 4 =", answer: "100" },
      { text: "1 − 2/5 =", answer: "3/5" },
      { text: "0.75 + 0.25 =", answer: "1" }
    ];
    openModal(modalShell(
      "口算挑战 · 2 分钟",
      "先求准，再求快",
      `
        <p style="color:var(--muted);font-size:9.5px;line-height:1.7">把答案写在横线上。分数用“3/5”这样的形式填写，完成后一起看看哪一步最容易错。</p>
        <div class="form-grid" style="margin-top:14px">
          ${questions.map((question, index) => `
            <div class="field">
              <label for="mental-${index}">${index + 1}. ${esc(question.text)}</label>
              <input id="mental-${index}" data-answer="${esc(question.answer)}" inputmode="decimal" autocomplete="off" placeholder="填写答案">
            </div>
          `).join("")}
        </div>
        <div id="mental-feedback"></div>
      `,
      `<span class="foot-note">5 道题 · 不追求速度</span><button class="btn btn-primary" type="button" data-action="mental-check">${icon("zap")}提交答案</button>`
    ));
  }

  /* ------------------------------------------------------------------------
     Interaction layer
     ------------------------------------------------------------------------ */

  function toggleSidebar() {
    const open = !sidebar.classList.contains("is-open");
    sidebar.classList.toggle("is-open", open);
    const scrim = $(".mobile-scrim");
    if (scrim) scrim.hidden = !open;
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    const scrim = $(".mobile-scrim");
    if (scrim) scrim.hidden = true;
  }

  function toggleEyeCare(element) {
    state.settings.eyeCare = !state.settings.eyeCare;
    state.parent.eyeCare = state.settings.eyeCare;
    saveState();
    updateEyeCare();
    $$('.switch[data-action="toggle-eye"]').forEach((button) => {
      button.classList.toggle("is-on", state.settings.eyeCare);
      button.setAttribute("aria-checked", String(state.settings.eyeCare));
    });
    if (element) element.classList.toggle("is-on", state.settings.eyeCare);
    if (currentRoute === "parent") {
      const scroll = view.scrollTop;
      render({ routeChanged: false });
      view.scrollTop = scroll;
    }
    toast(state.settings.eyeCare ? "未来纸护眼已开启" : "护眼模式已关闭", state.settings.eyeCare ? "屏幕色温更柔和，适合长时间阅读。" : "已恢复标准色彩显示。");
  }

  function toggleParentSetting(key) {
    if (key === "eyeCare") {
      toggleEyeCare(null);
      return;
    }
    state.parent[key] = !state.parent[key];
    saveState();
    const scroll = view.scrollTop;
    if (currentRoute === "parent") render({ routeChanged: false });
    view.scrollTop = scroll;
    const messages = {
      answerLock: state.parent.answerLock ? ["答案保护已开启", "小思现在只提供思路和提示，不直接给答案。"] : ["答案保护已关闭", "小思会在讲解后给出参考答案。"],
      appGuard: state.parent.appGuard ? ["应用守护已开启", "新应用需要家长确认后才能打开。"] : ["应用守护已关闭", "学习机将允许打开已安装的应用。"],
      weeklyReport: state.parent.weeklyReport ? ["每周报告已开启", "周日晚会自动整理本周学习情况。"] : ["每周报告已关闭", "你仍可以手动查看学情。"],
      eyeCare: ["护眼设置已更新", ""]
    };
    const message = messages[key] || ["设置已更新", ""];
    toast(message[0], message[1]);
  }

  function switchSubject(id) {
    if (!DATA.lessons[id]) return;
    ui.syncSubject = id;
    render({ routeChanged: true });
    const tabs = $(".subject-tabs-row");
    if (tabs) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSettingClick(button) {
    toggleParentSetting(button.dataset.setting);
  }

  function answerStory(index) {
    ui.enrich.story = index;
    openStoryModal();
  }

  function answerPoem(index) {
    ui.enrich.poem = index;
    openPoemModal();
  }

  function answerCode(index) {
    ui.enrich.code = index;
    openCodeModal();
  }

  function toggleScienceStep(index) {
    const current = ui.enrich.science;
    ui.enrich.science = current.includes(index) ? current.filter((item) => item !== index) : [...current, index];
    openScienceModal();
  }

  function checkDictation() {
    const fields = $$("#dictation-form input[data-answer]");
    let correct = 0;
    fields.forEach((field) => {
      const isCorrect = field.value.trim().toLowerCase() === field.dataset.answer;
      if (isCorrect) correct += 1;
      field.style.borderColor = isCorrect ? "#8edcc7" : "#efb5a8";
      field.style.background = isCorrect ? "#f2fcf8" : "#fff7f4";
    });
    const feedback = $("#dictation-feedback");
    if (feedback) {
      feedback.innerHTML = `
        <div class="quiz-feedback ${correct === fields.length ? "" : "is-wrong"}" style="margin-top:13px">
          <span class="quiz-feedback-icon">${icon(correct === fields.length ? "check" : "x")}</span>
          <div><strong>听写完成：${correct} / ${fields.length}</strong><p>${correct === fields.length ? "全部正确。把单词放进句子里再说一遍，记忆会更牢。" : "绿色是写对的，橙色需要再看一眼。先读三遍，再默写一次。"}</p></div>
        </div>
      `;
    }
    if (correct === fields.length) {
      state.xp += 12;
      saveState();
      toast("听写全对", "Unit 4 核心词汇已过关，获得 12 经验值。", "award");
    }
  }

  function checkMentalMath() {
    const fields = $$("#mental-feedback, .form-grid input[data-answer]");
    const inputs = $$(".form-grid input[data-answer]");
    let correct = 0;
    inputs.forEach((field) => {
      const value = field.value.trim().replace(/\s/g, "");
      const expected = String(field.dataset.answer).replace(/\s/g, "");
      const isCorrect = value === expected;
      if (isCorrect) correct += 1;
      field.style.borderColor = isCorrect ? "#8edcc7" : "#efb5a8";
      field.style.background = isCorrect ? "#f2fcf8" : "#fff7f4";
    });
    const feedback = $("#mental-feedback");
    if (feedback) {
      feedback.innerHTML = `
        <div class="quiz-feedback ${correct === inputs.length ? "" : "is-wrong"}" style="margin-top:13px">
          <span class="quiz-feedback-icon">${icon(correct === inputs.length ? "check" : "x")}</span>
          <div><strong>口算结果：${correct} / ${inputs.length}</strong><p>${correct === inputs.length ? "全部正确。下一次可以试着给自己计时，但先保证准确。" : "先不追求速度。把错的那道题完整写一遍过程，再回来告诉我。"}</p></div>
        </div>
      `;
    }
    if (correct === inputs.length) {
      state.xp += 10;
      saveState();
      toast("口算全对", "准确率优先，做得很好。获得 10 经验值。", "award");
    }
  }

  function handleAction(action, element, event) {
    switch (action) {
      case "toggle-sidebar":
        toggleSidebar();
        return true;
      case "open-ai":
        closeSidebar();
        openTutor();
        return true;
      case "open-settings":
        openSettings();
        return true;
      case "edit-profile":
        closeModal();
        openProfileEditor();
        return true;
      case "skip-profile-setup":
        skipProfileSetup();
        return true;
      case "use-family-preset":
        useFamilyPreset();
        return true;
      case "open-library":
        openLibrary();
        return true;
      case "library-open":
        openLibraryBook(element.dataset.id);
        return true;
      case "library-delete":
        deleteLibraryBook(element.dataset.id);
        return true;
      case "open-official-textbooks":
        window.open("https://basic.smartedu.cn/tchMaterial/", "_blank", "noopener");
        return true;
      case "open-profile":
        closeModal();
        openProfile();
        return true;
      case "open-children":
        openChildren();
        return true;
      case "switch-child":
        switchChild(element.dataset.id);
        return true;
      case "add-child":
        closeModal();
        openProfileEditor({ newChild: true });
        return true;
      case "open-notifications":
        openNotifications();
        return true;
      case "toggle-eye":
        toggleEyeCare(element);
        return true;
      case "toggle-simple-mode":
        toggleSimpleMode();
        return true;
      case "install-app":
        installApp();
        return true;
      case "copy-app-link":
        copyAppLink();
        return true;
      case "share-app":
        shareApp();
        return true;
      case "jump-plan":
      case "go-plan":
        closeModal();
        closeSidebar();
        go("plan");
        return true;
      case "go-sync":
        closeSidebar();
        go("sync");
        return true;
      case "go-thinking":
        closeSidebar();
        go("thinking");
        return true;
      case "start-thinking":
        openThinking(element.dataset.id);
        return true;
      case "thinking-answer":
        answerThinking(Number(element.dataset.index));
        return true;
      case "thinking-next":
        nextThinkingStep();
        return true;
      case "thinking-retry":
        retryThinking();
        return true;
      case "thinking-hint":
        showThinkingHint();
        return true;
      case "thinking-number-check":
        checkThinkingNumber();
        return true;
      case "thinking-reflect-submit":
        submitReflection();
        return true;
      case "thinking-next-module":
        startNextThinkingModule();
        return true;
      case "thinking-close":
        closeThinking();
        return true;
      case "go-homework":
        closeSidebar();
        go("homework");
        return true;
      case "go-mistakes":
        closeSidebar();
        go("mistakes");
        return true;
      case "go-enrich":
        closeSidebar();
        go("enrich");
        return true;
      case "go-parent":
        closeModal();
        closeSidebar();
        go("parent");
        return true;
      case "go-precision":
        closeSidebar();
        go("precision");
        return true;
      case "open-course":
        ui.syncSubject = element.dataset.subject || "math";
        closeSidebar();
        go("sync");
        return true;
      case "open-lesson":
        openLesson(element.dataset.subject, element.dataset.lesson);
        return true;
      case "locked-lesson":
        toast("这一课还没解锁", "先完成当前课时，小思会按顺序为你打开。", "warn");
        return true;
      case "subject-plan":
        addSubjectToPlan(element.dataset.subject);
        return true;
      case "start-diagnostic":
        startDiagnostic();
        return true;
      case "diag-answer":
        answerDiagnostic(Number(element.dataset.index));
        return true;
      case "diag-next":
        nextDiagnostic();
        return true;
      case "diag-close":
        closeModal();
        go("precision");
        if (currentRoute === "precision") render({ routeChanged: false });
        return true;
      case "ai-practice":
        openPractice();
        return true;
      case "practice-answer":
        answerPractice(Number(element.dataset.index));
        return true;
      case "lesson-next":
        lessonNext();
        return true;
      case "lesson-prev":
        lessonPrev();
        return true;
      case "lesson-option":
        answerLesson(Number(element.dataset.index));
        return true;
      case "lesson-complete":
        completeLesson();
        return true;
      case "send-message": {
        const input = $("#tutor-input");
        if (input) sendTutorMessage(input.value);
        return true;
      }
      case "clear-chat":
        clearChat();
        return true;
      case "voice-note":
        toast("语音输入是演示占位", "当前版本请用键盘输入，或使用口语分级练。", "warn");
        return true;
      case "attach-note":
        toast("图片提问是演示占位", "作业批改页支持上传图片，可先去那里试试。", "warn");
        return true;
      case "pick-homework": {
        const input = $("#homework-file");
        if (input) input.click();
        return true;
      }
      case "use-sample":
        useHomeworkSample();
        return true;
      case "start-scan":
        startHomeworkScan();
        return true;
      case "reset-homework":
        resetHomework();
        return true;
      case "add-homework-mistake":
        addHomeworkMistake();
        return true;
      case "print-worksheet":
        window.print();
        return true;
      case "filter-homework":
        openHomeworkFilter();
        return true;
      case "filter-start":
        openHomeworkFilterStart();
        return true;
      case "mistake-explain":
        openMistakeExplain(element.dataset.id);
        return true;
      case "mistake-redo":
        closeModal();
        openMistakeRedo(element.dataset.id);
        return true;
      case "redo-answer":
        answerRedo(Number(element.dataset.index));
        return true;
      case "redo-retry":
        retryRedo();
        return true;
      case "redo-close":
        closeRedo();
        return true;
      case "clear-mistake-filter":
        ui.mistakeFilter = "all";
        ui.mistakeQuery = "";
        render({ routeChanged: false });
        return true;
      case "export-mistakes":
        exportMistakes();
        return true;
      case "add-task":
        openAddTask();
        return true;
      case "task-more":
        openTaskMenu(element.dataset.id);
        return true;
      case "task-complete":
        completeTaskFromMenu(element.dataset.id);
        return true;
      case "task-delete":
        deleteTask(element.dataset.id);
        return true;
      case "week-prev":
        changeWeek(-1);
        return true;
      case "week-next":
        changeWeek(1);
        return true;
      case "focus-preset":
        setFocusPreset(Number(element.dataset.minutes));
        return true;
      case "timer-toggle":
        toggleFocus();
        return true;
      case "timer-reset":
        resetFocus();
        return true;
      case "stop-focus":
        stopFocus();
        return true;
      case "open-plan-focus":
        openFocusFromQuick();
        return true;
      case "enrich-open":
        openEnrich(element.dataset.enrich);
        return true;
      case "object-next":
        ui.objectIndex = (ui.objectIndex + 1) % OBJECTS.length;
        openObjectModal();
        return true;
      case "ask-enrich":
        closeModal();
        openTutor(element.dataset.prompt || "我想继续探索这个问题");
        return true;
      case "story-speak":
        speakText(STORY.text);
        return true;
      case "story-answer":
        answerStory(Number(element.dataset.index));
        return true;
      case "poem-answer":
        answerPoem(Number(element.dataset.index));
        return true;
      case "poem-next":
        openPoemNext();
        return true;
      case "speak-sample":
        speakText("I can play the piano.", "en-US");
        return true;
      case "speak-sample-slow":
        speakText("I can play the piano.", "en-US", 0.65);
        return true;
      case "speak-score":
        ui.enrich.speak = 92;
        openSpeakModal();
        toast("跟读评分完成", "发音清晰度 92 分，重音还可以更稳。", "award");
        return true;
      case "science-check":
        toggleScienceStep(Number(element.dataset.index));
        return true;
      case "code-answer":
        answerCode(Number(element.dataset.index));
        return true;
      case "open-parent-report":
        openParentReport();
        return true;
      case "export-parent-report":
        exportParentReport();
        return true;
      case "reset-demo":
        closeModal();
        openResetConfirm();
        return true;
      case "confirm-reset":
        resetDemo();
        return true;
      case "quick-tutor":
        openTutor();
        return true;
      case "quick-homework":
        go("homework");
        return true;
      case "quick-dictation":
        openDictation();
        return true;
      case "quick-mental":
        openMentalMath();
        return true;
      case "quick-poem":
        openEnrich("poem");
        return true;
      case "quick-focus":
        openFocusFromQuick();
        return true;
      case "dictation-speak":
        speakText(element.dataset.word, "en-US", 0.78);
        return true;
      case "dictation-check":
        checkDictation();
        return true;
      case "mental-check":
        checkMentalMath();
        return true;
      case "print-page":
        window.print();
        return true;
      default:
        return false;
    }
  }

  function handleDocumentClick(event) {
    const backdrop = event.target.closest("[data-modal-backdrop]");
    if (backdrop && event.target === backdrop) {
      closeModal();
      return;
    }
    if (event.target.closest("[data-close-modal]")) {
      closeModal();
      return;
    }

    const actionElement = event.target.closest("[data-action]");
    if (actionElement) {
      const handled = handleAction(actionElement.dataset.action, actionElement, event);
      if (handled) return;
    }

    const promptElement = event.target.closest("[data-ai-prompt]");
    if (promptElement) {
      openTutor(promptElement.dataset.aiPrompt);
      return;
    }

    const taskElement = event.target.closest("[data-task-toggle]");
    if (taskElement && !event.target.closest("[data-action]")) {
      toggleTask(taskElement.dataset.taskToggle);
      return;
    }

    const syncButton = event.target.closest("[data-sync-subject]");
    if (syncButton) {
      switchSubject(syncButton.dataset.syncSubject);
      return;
    }

    const modeButton = event.target.closest("[data-precision-mode]");
    if (modeButton) {
      ui.precisionMode = modeButton.dataset.precisionMode;
      render({ routeChanged: false });
      return;
    }

    const filterButton = event.target.closest("[data-mistake-filter]");
    if (filterButton) {
      ui.mistakeFilter = filterButton.dataset.mistakeFilter;
      render({ routeChanged: false });
      return;
    }

    const dayButton = event.target.closest("[data-day-select]");
    if (dayButton) {
      ui.selectedDay = Number(dayButton.dataset.daySelect);
      render({ routeChanged: false });
      return;
    }

    const settingButton = event.target.closest("[data-setting]");
    if (settingButton) {
      handleSettingClick(settingButton);
      return;
    }

    if (event.target.closest(".nav-item[data-route]")) {
      closeSidebar();
    }
  }

  function trapModalFocus(event) {
    if (event.key !== "Tab") return;
    const modal = $(".modal", modalRoot);
    if (!modal) return;
    const focusable = Array.from(modal.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"))
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      if (modalRoot.firstElementChild) {
        closeModal();
      } else if (sidebar.classList.contains("is-open")) {
        closeSidebar();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openTutor();
      return;
    }
    trapModalFocus(event);

    const taskElement = event.target.closest("[data-task-toggle]");
    if (taskElement && event.target === taskElement && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      toggleTask(taskElement.dataset.taskToggle);
    }
  }

  function bindGlobalEvents() {
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeydown);
    window.addEventListener("hashchange", () => {
      closeSidebar();
      navigate();
    });
    window.setInterval(updateClock, 30000);
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  const VIEWS = {
    home: renderHome,
    sync: renderSync,
    thinking: renderThinking,
    precision: renderPrecision,
    tutor: renderTutor,
    homework: renderHomework,
    mistakes: renderMistakes,
    plan: renderPlan,
    enrich: renderEnrich,
    parent: renderParent
  };

  function boot() {
    ui.selectedDay = todayOffset();
    ensureChat();
    bindGlobalEvents();
    setupPwa();
    if (!location.hash) {
      history.replaceState(null, "", "#/home");
    }
    currentRoute = routeFromHash();
    render({ routeChanged: true });
    updateFocusHud();
    if (!state.profile.setupComplete) {
      window.setTimeout(() => openProfileEditor({ onboarding: true }), 450);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
