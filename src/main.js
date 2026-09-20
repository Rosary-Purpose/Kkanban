const { invoke } = window.__TAURI__.core;

let appData = { boards: [], archivedBoards: [], activeBoardId: null, theme: "dark", pattern: "none", pomodoroCowMode: false, pomodoroOverlayHidden: false, pomodoroPersistSettings: false, pomodoroSavedPlan: null };
let board = null;

let editingCard = null;
let editingChecklist = [];
let editingComments = [];
let dragState = null;
let columnDragState = null;
let activeInlineAdd = null;
let searchQuery = "";
let calendarViewDate = new Date();
let selectedLabelColor = null;
let selectedLabelEmoji = null;

const LABEL_COLORS = ["#e03131", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#1864ab", "#845ef7", "#f783ac", "#adb5bd", "#000000", "#ffffff", "#8b5e34"];
const LABEL_COLOR_NAMES = ["Red", "Orange", "Yellow", "Green", "Blue", "Dark Blue", "Purple", "Pink", "Gray", "Black", "White", "Brown"];
selectedLabelColor = LABEL_COLORS[0];

// Pool of premade label sets a user can quick-add from on the Labels screen.
// More categories can join this list later - "Game Dev" is the first one.
const LABEL_TEMPLATES = [
  {
    id: "game-dev",
    name: "Game Dev",
    labels: [
      { emoji: "🎨", name: "art", color: "#845ef7" },
      { emoji: "📦", name: "assets", color: "#ffd43b" },
      { emoji: "⌨️", name: "eventing", color: "#4dabf7" },
      { emoji: "📑", name: "scripting", color: "#ffffff" },
      { emoji: "🗣️", name: "feedback", color: "#1864ab" },
      { emoji: "🛠️", name: "bug fixing", color: "#8b5e34" },
      { emoji: "🎮", name: "playtest", color: "#000000" },
      { emoji: "🚨", name: "urgent", color: "#e03131" },
      { emoji: "🐶", name: "summy", color: "#69db7c" },
      { emoji: "📬", name: "deployment", color: "#ffa94d" },
      { emoji: "🖥️", name: "UI & layouts", color: "#adb5bd" },
    ],
  },
  {
    id: "learning",
    name: "Learning",
    labels: [
      { emoji: "📓", name: "study", color: "#4dabf7" },
      { emoji: "🔍", name: "research", color: "#845ef7" },
      { emoji: "📖", name: "read", color: "#1864ab" },
      { emoji: "✍️", name: "write", color: "#f783ac" },
      { emoji: "🎯", name: "practice", color: "#ffa94d" },
      { emoji: "🗣️", name: "speech", color: "#ffd43b" },
      { emoji: "👩‍🏫", name: "tutor", color: "#69db7c" },
      { emoji: "✏️", name: "homework", color: "#8b5e34" },
      { emoji: "⁉️", name: "quiz", color: "#e03131" },
      { emoji: "🌊", name: "immerse", color: "#adb5bd" },
    ],
  },
  {
    id: "video-editing",
    name: "Video Editing",
    labels: [
      { emoji: "📑", name: "Scripting", color: "#ffffff" },
      { emoji: "🎬", name: "Record", color: "#e03131" },
      { emoji: "✂️", name: "editing", color: "#1864ab" },
      { emoji: "🎙️", name: "narration", color: "#845ef7" },
      { emoji: "🔍", name: "review", color: "#ffa94d" },
      { emoji: "🚀", name: "publish", color: "#69db7c" },
    ],
  },
  {
    id: "career",
    name: "Career",
    labels: [
      { emoji: "📑", name: "apply", color: "#ffd43b" },
      { emoji: "💼", name: "interview", color: "#1864ab" },
      { emoji: "📞", name: "followup", color: "#69db7c" },
    ],
  },
];
let expandedTemplateCategories = new Set();

const EMOJI_CATEGORIES = [
  { id: "smiley", icon: "😎", emojis: ["😊", "🥰", "😎", "🥳", "😅", "🫠", "🤔", "😒", "😴", "🤯", "😰", "😫", "🤬", "🤕", "🤮", "🥺", "🤠", "😸", "🙊", "💩"] },
  { id: "people", icon: "👥", emojis: ["👌", "🤏", "✌️", "🖕", "👍", "👎", "🙏", "🙌", "✍️", "💪", "🧠", "🦴", "🩸", "👀", "👄", "👶", "👧", "👩‍🦳", "🗣️", "👥", "💁", "🙇‍♀️", "🤷", "🧑‍🦯", "🏃‍♀️‍➡️", "👩‍⚕️", "👩‍🏫", "👨‍💻", "👩‍🚀", "👮‍♀️", "🕵️", "🎅", "🧜‍♂️", "🧟", "👩‍❤️‍💋‍👩"] },
  { id: "animals", icon: "🐻", emojis: ["🐮", "🐽", "🐁", "🦀", "🐚", "🐌", "🦉", "🐻", "🐶", "🦊", "🦥", "🐍", "🌱", "🌻", "🪻", "🌿", "🍂", "🔥", "☃️", "🌊", "☔", "🪐", "⭐", "🌠", "🌈"] },
  { id: "food", icon: "🌭", emojis: ["🍇", "🍓", "🌽", "🧇", "🧀", "🥩", "🍔", "🍟", "🌭", "🥪", "🍳", "🍿", "🍙", "🍡", "🥡", "🍩", "🍪", "🍫", "🍬", "🍭", "🍼", "🥛", "☕", "🍵", "🍹", "🍺", "🍻", "🫗", "🍽️", "🔪"] },
  { id: "activities", icon: "🏓", emojis: ["🎃", "🎄", "🎆", "✨", "🎈", "🎉", "🎋", "🎁", "🎟️", "🏆", "🏅", "🥇", "🥈", "🥉", "⚾", "🏈", "🎳", "🏓", "🎣", "🎯", "🔮", "🪄", "🎮", "🎰", "🎲", "🧩", "🎴", "🎭", "🖼️", "🎨"] },
  { id: "travel", icon: "🛫", emojis: ["🌎", "🌐", "🗺️", "🧭", "🌋", "🏕️", "🏖️", "🏛️", "🛖", "🏠", "🏰", "🗽", "⛩️", "🌆", "♨️", "🛎️", "🚂", "🚕", "🚛", "🛵", "🚲", "🚨", "🚦", "🛑", "🚧", "⚓", "🛟", "🛫", "🚀", "🛸"] },
  { id: "objects", icon: "💼", emojis: ["🎗️", "🧦", "🛍️", "👢", "🎓", "💎", "🔊", "📢", "🎶", "🎙️", "🎤", "🎧", "🎸", "🎹", "🎻", "🪉", "📱", "📞", "🔋", "🪫", "🖥️", "⌨️", "💽", "🎬", "📸", "📓", "📖", "📑", "📦", "📬", "✏️", "✒️", "📅", "💼", "📋", "📐", "✂️", "🗑️", "⌛", "💵", "🔍", "🔒", "🔓", "🗝️", "🛠️", "⛓️", "🧲", "💉", "🛏️", "🚽", "🧻", "🧼", "🛒", "🚬", "⚰️"] },
  { id: "symbols", icon: "⁉️", emojis: ["💝", "❤️‍🩹", "💭", "⚠️", "🚫", "🔞", "⏯️", "☯️", "✝️", "♋", "⁉️", "❓", "❗", "🆘", "🈳", "㊙️", "⚜️", "♻️", "🔰", "✅", "❎", "⭕", "❌", "📌", "⏰"] },
  { id: "flags", icon: "🇺🇸", emojis: ["🇺🇸", "🇬🇧", "🇨🇦", "🇲🇽", "🇯🇵", "🇰🇵", "🇰🇷", "🇵🇭", "🇨🇳", "🇩🇪", "🇷🇺", "🇫🇷", "🚩", "🏁", "🎌", "🏴", "🏳️", "🏴‍☠️", "🏳️‍🌈", "🎏"] },
  // My own pick, no strict theme - a grab-bag of things I like: a little
  // tech, a little cosmic, a little cozy chaos.
  { id: "claudes-picks", icon: "🤖", emojis: ["🤖", "👾", "🛰️", "🌙", "🪩", "💫", "🌀", "🫧", "🧊", "🧿", "🪅", "🕹️", "🧵", "🧶", "🧸", "🍄", "🌵", "🦋", "🐙", "🦔"] },
];

// All emoji across every tab, flattened - used to pick a random placeholder
// glyph for not-yet-set emoji slots instead of always showing the same one.
function randomPlaceholderEmoji() {
  const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  return all[Math.floor(Math.random() * all.length)];
}

// Windows' system emoji font (Segoe UI Emoji) has never shipped actual flag
// glyphs - it renders the raw two-letter regional-indicator text instead. So
// flag emoji are drawn from bundled Twemoji SVGs rather than as plain text.
const FLAG_EMOJI_ICONS = {
  "🇺🇸": "/assets/flags/1f1fa-1f1f8.svg",
  "🇬🇧": "/assets/flags/1f1ec-1f1e7.svg",
  "🇨🇦": "/assets/flags/1f1e8-1f1e6.svg",
  "🇲🇽": "/assets/flags/1f1f2-1f1fd.svg",
  "🇯🇵": "/assets/flags/1f1ef-1f1f5.svg",
  "🇰🇵": "/assets/flags/1f1f0-1f1f5.svg",
  "🇵🇭": "/assets/flags/1f1f5-1f1ed.svg",
  "🇰🇷": "/assets/flags/1f1f0-1f1f7.svg",
  "🇨🇳": "/assets/flags/1f1e8-1f1f3.svg",
  "🇩🇪": "/assets/flags/1f1e9-1f1ea.svg",
  "🇷🇺": "/assets/flags/1f1f7-1f1fa.svg",
  "🇫🇷": "/assets/flags/1f1eb-1f1f7.svg",
  "🚩": "/assets/flags/1f6a9.svg",
  "🏁": "/assets/flags/1f3c1.svg",
  "🎌": "/assets/flags/1f38c.svg",
  "🏴": "/assets/flags/1f3f4.svg",
  "🏳️": "/assets/flags/1f3f3.svg",
  "🏴‍☠️": "/assets/flags/1f3f4-200d-2620-fe0f.svg",
  "🏳️‍🌈": "/assets/flags/1f3f3-fe0f-200d-1f308.svg",
};

// Renders any single emoji for innerHTML use: flags become a sized <img> of
// the bundled icon, everything else stays as plain (escaped) glyph text.
function emojiHtml(emoji) {
  if (!emoji) return "";
  const iconSrc = FLAG_EMOJI_ICONS[emoji];
  if (iconSrc) return `<img src="${iconSrc}" class="emoji-flag-icon" alt="" draggable="false" />`;
  return escapeHtml(emoji);
}

const boardEl = document.getElementById("board");
const boardTitleEl = document.getElementById("board-title");
const searchInput = document.getElementById("search-input");
const searchClearBtn = document.getElementById("search-clear");
const detailOverlay = document.getElementById("detail-overlay");
const detailTitle = document.getElementById("detail-title");
const detailDescription = document.getElementById("detail-description");

// ----- Rich-text description (contenteditable + execCommand) -----

// Card descriptions are stored as HTML now (bold/italic/underline/lists),
// not plain text - these two helpers give every other consumer (search,
// the board-card preview snippet, the "has a description" checks) a clean
// plain-text view without needing to know about markup.
function htmlToPlainText(html) {
  if (!html) return "";
  // textContent alone concatenates block elements with nothing between them
  // ("First itemSecond item") - pad every block-level tag (both open and
  // close, since a nested list's closing </li> doesn't fire until after
  // its whole nested <ul>) with a space first, so words from separate
  // lines/items never run together.
  const withBreaks = html
    .replace(/<(p|div|li|ul|ol|h[1-6])(\s[^>]*)?>/gi, " $&")
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>|<br\s*\/?>/gi, "$& ");
  const div = document.createElement("div");
  div.innerHTML = withBreaks;
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}
function isDescriptionEmpty(html) {
  // textContent alone drops <img> tags entirely (empty alt, so nothing left
  // to trim) - without this check, a description that's only a flag emoji
  // (inserted as an <img>, see emojiHtml) would read as "empty" here and
  // get silently discarded by commitDetailFieldsToCard on save.
  if (html && /<img\b/i.test(html)) return false;
  return !htmlToPlainText(html);
}

const DESC_BASE_HEIGHT = 160;
const DESC_MAX_HEIGHT = DESC_BASE_HEIGHT * 2.5; // 400px
// Grows the description box to fit its content, up to 2.5x its original
// height - past that it just scrolls internally (overflow-y:auto in CSS
// handles the scrollbar, this only ever manages the height).
function autoGrowDescription() {
  detailDescription.style.height = "auto";
  const next = Math.min(detailDescription.scrollHeight, DESC_MAX_HEIGHT);
  detailDescription.style.height = Math.max(next, DESC_BASE_HEIGHT) + "px";
}
detailDescription.addEventListener("input", autoGrowDescription);

const RTE_COMMANDS = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"];
function updateRteToolbarState() {
  let blockTag = "";
  try { blockTag = document.queryCommandValue("formatBlock").toUpperCase(); } catch (e) {}
  document.querySelectorAll("#detail-description-toolbar .rte-btn").forEach((btn) => {
    if (btn.dataset.heading) {
      btn.classList.toggle("active", blockTag === btn.dataset.heading);
      return;
    }
    const cmd = btn.dataset.cmd;
    if (!RTE_COMMANDS.includes(cmd)) return;
    let active = false;
    try { active = document.queryCommandState(cmd); } catch (e) {}
    btn.classList.toggle("active", active);
  });
}
// H1/H2/H3/blockquote all toggle back to a plain paragraph on a second
// click - formatBlock itself has no concept of "off" the way bold/italic
// do, so that has to be handled explicitly here.
function applyHeading(tag) {
  let current = "";
  try { current = document.queryCommandValue("formatBlock").toUpperCase(); } catch (e) {}
  document.execCommand("formatBlock", false, current === tag ? "P" : tag);
}
document.querySelectorAll("#detail-description-toolbar .rte-btn").forEach((btn) => {
  if (btn.id === "rte-link-btn" || btn.id === "rte-emoji-btn") return; // wired separately below
  // Without this, clicking a toolbar button first steals focus (and the
  // text selection) away from the description field, so the formatting
  // command would have nothing to apply to.
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => {
    if (btn.dataset.heading) {
      applyHeading(btn.dataset.heading);
    } else {
      document.execCommand(btn.dataset.cmd, false, null);
    }
    detailDescription.focus();
    autoGrowDescription();
    updateRteToolbarState();
  });
});
detailDescription.addEventListener("keyup", updateRteToolbarState);
detailDescription.addEventListener("mouseup", updateRteToolbarState);
detailDescription.addEventListener("focus", updateRteToolbarState);

// ----- Description: link insertion -----

// Inserting a link needs the description's own text selection preserved
// across opening the URL popover (focus moving to the popover's input
// would otherwise collapse it) - saved here, restored right before
// createLink runs. With no selection, the URL itself becomes the link text
// instead, inserted at the cursor.
const rteLinkBtn = document.getElementById("rte-link-btn");
rteLinkBtn.addEventListener("mousedown", (e) => e.preventDefault());
rteLinkBtn.addEventListener("click", () => {
  const selection = window.getSelection();
  const savedRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  const hadSelection = !!(savedRange && !savedRange.collapsed && detailDescription.contains(savedRange.commonAncestorContainer));
  openInputPopover("Link URL", "https://", (url) => {
    detailDescription.focus();
    if (hadSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      document.execCommand("createLink", false, url);
      detailDescription.querySelectorAll(`a[href="${url}"]`).forEach((a) => {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      });
    } else {
      document.execCommand("insertHTML", false, `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`);
    }
    autoGrowDescription();
  });
});

// ----- Description: emoji insertion -----

// Unlike the link popover above, the emoji picker never focuses anything of
// its own (every control inside it is a button with mousedown
// preventDefault, same guard the picker already used everywhere else) - so
// the description's own selection/caret is never actually lost here, and
// no explicit save/restore is needed the way the link button needs one.
const rteEmojiBtn = document.getElementById("rte-emoji-btn");
rteEmojiBtn.addEventListener("mousedown", (e) => e.preventDefault());
rteEmojiBtn.addEventListener("click", () => {
  const btnRect = rteEmojiBtn.getBoundingClientRect();
  // Anchored off the description BOX's own right edge (not just the
  // button's) - the toolbar button itself sits well inside the box's
  // horizontal span, so a few px past the button alone still landed on top
  // of the text. Past the whole box's edge clears it reliably, opening
  // over the checklist/notes pane instead (normally clear space).
  const boxRect = detailDescription.getBoundingClientRect();
  openEmojiPicker(boxRect.right + 12, btnRect.top, null,
    (emoji) => {
      document.execCommand("insertHTML", false, emojiHtml(emoji));
      detailDescription.focus();
      autoGrowDescription();
      updateRteToolbarState();
    },
    null,
    { keepOpen: true }
  );
});

// ----- Description: font size -----

// execCommand("fontSize") only accepts legacy 1-7 values and produces a
// <font size="7"> wrapper - swap that for a real inline font-size style so
// it behaves like the rest of the markup (survives save/reload, plain-text
// stripping, etc.) instead of leaving deprecated <font> tags around.
// A -/+ stepper through 4 presets, not a dropdown - quicker to tap than
// picking from a list, per explicit request.
const RTE_FONT_SIZES = [12, 14, 18, 24];
const RTE_FONT_SIZE_NORMAL_INDEX = 1;
let rteFontSizeIndex = RTE_FONT_SIZE_NORMAL_INDEX; // also the reset point each time a card's detail view opens
const rteFontSizeDecBtn = document.getElementById("rte-font-size-dec");
const rteFontSizeIncBtn = document.getElementById("rte-font-size-inc");
const rteFontSizeResetBtn = document.getElementById("rte-font-size-reset");
function updateRteFontSizeButtons() {
  rteFontSizeDecBtn.disabled = rteFontSizeIndex === 0;
  rteFontSizeIncBtn.disabled = rteFontSizeIndex === RTE_FONT_SIZES.length - 1;
}
function applyRteFontSize() {
  const px = RTE_FONT_SIZES[rteFontSizeIndex];
  document.execCommand("fontSize", false, "7");
  // Replacing the <font> node(s) with <span>s invalidates whatever Range
  // the browser's selection was pointing at - without restoring it,
  // stepping again immediately (the whole point of a quick +/- stepper)
  // would act on a collapsed cursor instead of the same text.
  const spans = [];
  detailDescription.querySelectorAll('font[size="7"]').forEach((el) => {
    const span = document.createElement("span");
    span.style.fontSize = px + "px";
    span.innerHTML = el.innerHTML;
    el.replaceWith(span);
    spans.push(span);
  });
  if (spans.length) {
    const range = document.createRange();
    range.setStartBefore(spans[0]);
    range.setEndAfter(spans[spans.length - 1]);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  autoGrowDescription();
}
[rteFontSizeDecBtn, rteFontSizeIncBtn, rteFontSizeResetBtn].forEach((btn) => btn.addEventListener("mousedown", (e) => e.preventDefault()));
rteFontSizeDecBtn.addEventListener("click", () => {
  if (rteFontSizeIndex === 0) return;
  rteFontSizeIndex -= 1;
  updateRteFontSizeButtons();
  applyRteFontSize();
  detailDescription.focus();
});
rteFontSizeIncBtn.addEventListener("click", () => {
  if (rteFontSizeIndex === RTE_FONT_SIZES.length - 1) return;
  rteFontSizeIndex += 1;
  updateRteFontSizeButtons();
  applyRteFontSize();
  detailDescription.focus();
});
rteFontSizeResetBtn.addEventListener("click", () => {
  rteFontSizeIndex = RTE_FONT_SIZE_NORMAL_INDEX;
  updateRteFontSizeButtons();
  applyRteFontSize();
  detailDescription.focus();
});
updateRteFontSizeButtons();

// ----- Description: markdown paste -----

function inlineMarkdownToHtml(text) {
  let out = escapeHtml(text);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (m, a, b) => `<b>${a || b}</b>`);
  out = out.replace(/\*([^*]+)\*|_([^_]+)_/g, (m, a, b) => `<i>${a || b}</i>`);
  return out;
}
// A small hand-rolled markdown subset (headers, bullet/numbered lists,
// bold, italic, links) - not a full CommonMark parser, just the common
// syntax someone would plausibly paste in from notes or a chat message.
function markdownToHtml(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let listType = null;
  function closeList() { if (listType) { html += `</${listType}>`; listType = null; } }
  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,3})\s+(.*)$/);
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (headerMatch) {
      closeList();
      const level = headerMatch[1].length;
      html += `<h${level}>${inlineMarkdownToHtml(headerMatch[2])}</h${level}>`;
    } else if (ulMatch) {
      if (listType !== "ul") { closeList(); html += "<ul>"; listType = "ul"; }
      html += `<li>${inlineMarkdownToHtml(ulMatch[1])}</li>`;
    } else if (olMatch) {
      if (listType !== "ol") { closeList(); html += "<ol>"; listType = "ol"; }
      html += `<li>${inlineMarkdownToHtml(olMatch[1])}</li>`;
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      html += `<p>${inlineMarkdownToHtml(line)}</p>`;
    }
  }
  closeList();
  return html;
}
const MARKDOWN_SNIFF = /(^|\n)\s{0,3}(#{1,3}\s|[-*]\s|\d+\.\s)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/;
detailDescription.addEventListener("paste", (e) => {
  const clipboard = e.clipboardData;
  if (!clipboard) return;
  // Already-rich clipboard content (copied from a webpage, Word, etc.) has
  // its own text/html - let the browser's normal paste handle that as-is,
  // this is only for plain-text markdown syntax.
  if (Array.from(clipboard.types || []).includes("text/html")) return;
  const text = clipboard.getData("text/plain");
  if (!text || !MARKDOWN_SNIFF.test(text)) return;
  e.preventDefault();
  document.execCommand("insertHTML", false, markdownToHtml(text));
  autoGrowDescription();
});
const checklistItemsEl = document.getElementById("checklist-items");
const checklistInput = document.getElementById("checklist-input");
const detailModal = document.getElementById("detail-modal");
const detailDueDate = document.getElementById("detail-due-date");
const detailDueTimeToggle = document.getElementById("detail-due-time-toggle");
const detailDueTime = document.getElementById("detail-due-time");
const detailTimeToggleLabel = document.getElementById("detail-time-toggle-label");
const detailDueClearBtn = document.getElementById("detail-due-clear");
const detailDueTimeConfirmBtn = document.getElementById("detail-due-time-confirm");
// Setting a time only ever means anything alongside an actual due date, so
// the whole "Set Time" toggle (and the clear button) stays hidden until a
// date is picked - keeps the row from showing controls with nothing to act
// on. The time input itself only shows once "Set Time" is actually checked.
// The Confirm button is NOT driven from here except to force it shut when
// the time field itself disappears - otherwise its visibility is entirely
// focus/blur-driven (see the listeners below), so it only shows while the
// field is actively being edited, not just because the checkbox is on.
function updateDetailDueTimeVisibility() {
  const hasDate = !!detailDueDate.value;
  const showTime = hasDate && detailDueTimeToggle.checked;
  detailTimeToggleLabel.classList.toggle("hidden", !hasDate);
  detailDueClearBtn.classList.toggle("hidden", !hasDate);
  detailDueTime.classList.toggle("hidden", !showTime);
  if (!showTime) detailDueTimeConfirmBtn.classList.add("hidden");
}
const detailCompleteBtn = document.getElementById("detail-complete-btn");
const commentsListEl = document.getElementById("comments-list");
const commentInput = document.getElementById("comment-input");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function formatDueDate(dueDate, hasTime) {
  const d = hasTime ? new Date(dueDate) : new Date(dueDate + "T00:00:00");
  const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (hasTime) {
    const timeStr = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${dateStr}, ${timeStr}`;
  }
  return dateStr;
}

function formatCommentTimestamp(iso) {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timeStr = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateStr} ${timeStr}`;
}

function dueDateColorClass(dueDate, hasTime) {
  const due = hasTime ? new Date(dueDate) : new Date(dueDate + "T00:00:00");
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((dueMidnight - todayMidnight) / 86400000);
  if (diffDays < 0) return "due-overdue";
  if (diffDays === 0) return "due-red";
  if (diffDays < 3) return "due-orange";
  return "due-blue";
}

function getLabel(id) {
  return board.labels.find((l) => l.id === id);
}

// Picks black or white text for a given hex background so label chips stay
// readable no matter which color is chosen (YIQ brightness formula).
function contrastTextColor(hex) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1e1f26" : "#ffffff";
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
      case gN: h = (bN - rN) / d + 2; break;
      default: h = (rN - gN) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return rgbToHex(r * 255, g * 255, b * 255);
}

// Separate from the HSL helpers above (used for card-color muting/blending)
// - the custom color picker's saturation/value square needs HSV specifically,
// since its top edge (V=100%) sweeps through full saturation at full
// brightness; an HSL square's top edge would just fade to white regardless
// of saturation, which reads wrong for a hue-picking square.
function hsvToHex(h, s, v) {
  h = ((h % 360) + 360) % 360;
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  const d = max - min;
  let h;
  if (d === 0) h = 0;
  else if (max === rN) h = 60 * (((gN - bN) / d) % 6);
  else if (max === gN) h = 60 * ((bN - rN) / d + 2);
  else h = 60 * ((rN - gN) / d + 4);
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

// Card colors are the label swatch colors with a flat -5% value / +5%
// saturation shift (HSV) - a uniform rule across every color, no per-hue
// tuning or theme blending.
function mutedCardColor(hex) {
  const { h, s, v } = hexToHsv(hex);
  return hsvToHex(h, Math.min(100, s + 5), Math.max(0, v - 5));
}
// A darker shade of the same hue, used as a thin outline on card label
// pills so a pill's edge reads as "this color, but deeper" rather than a
// generic border.
function darkenForOutline(hex) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - 28));
}
function patchCard(columnId, cardId) {
  const card = findCard(cardId, columnId);
  if (!card) return;
  const existing = document.querySelector(`.card[data-id="${cardId}"]`);
  if (!existing) return;
  const newEl = buildCardEl(columnId, card);
  if (existing.style.display === "none") newEl.style.display = "none";
  existing.replaceWith(newEl);
  refreshChecklistPreviewOverflow(newEl);
  updateCompletionButton();
}

// ----- Theme / Pattern -----

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
function applyPattern(pattern) {
  document.documentElement.setAttribute("data-pattern", pattern);
}
function renderAppearanceControls() {
  document.querySelectorAll(".theme-option").forEach((btn) => {
    btn.classList.toggle("option-selected", btn.dataset.theme === appData.theme);
  });
  document.querySelectorAll(".pattern-option").forEach((btn) => {
    btn.classList.toggle("option-selected", btn.dataset.pattern === appData.pattern);
  });
}
document.querySelectorAll(".theme-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    appData.theme = btn.dataset.theme;
    applyTheme(appData.theme);
    renderAppearanceControls();
    saveBoard();
  });
});
document.querySelectorAll(".pattern-option").forEach((btn) => {
  btn.addEventListener("click", () => {
    appData.pattern = btn.dataset.pattern;
    applyPattern(appData.pattern);
    renderAppearanceControls();
    saveBoard();
  });
});

// ----- Board / AppData helpers -----

function newDefaultColumns() {
  return [
    { id: crypto.randomUUID(), title: "To Do", cards: [], emoji: null },
    { id: crypto.randomUUID(), title: "In Progress", cards: [], emoji: null },
    { id: crypto.randomUUID(), title: "Completed", cards: [], emoji: null },
  ];
}

function createNewBoard(name) {
  return { id: crypto.randomUUID(), name, columns: newDefaultColumns(), labels: [], archivedCards: [], backgroundImage: null, backgroundImageType: null, backgroundBlur: 0, dueDate: null, hasDueTime: false, emoji: null };
}

function defaultAppData() {
  const b = createNewBoard("My Board");
  return { boards: [b], archivedBoards: [], activeBoardId: b.id, theme: "dark", pattern: "none", pomodoroCowMode: false, pomodoroOverlayHidden: false, pomodoroPersistSettings: false, pomodoroSavedPlan: null };
}

function normalizeCardDefaults(c) {
  if (!c.labelIds) c.labelIds = [];
  if (c.color === undefined) c.color = null;
  if (c.completed === undefined) c.completed = false;
  if (!Array.isArray(c.comments)) c.comments = [];
  if (c.emoji === undefined) c.emoji = null;
}

function normalizeBoard(b) {
  if (!b.id) b.id = crypto.randomUUID();
  if (!b.name) b.name = "My Board";
  if (!Array.isArray(b.labels)) b.labels = [];
  if (!Array.isArray(b.archivedCards)) b.archivedCards = [];
  if (b.backgroundImage === undefined) b.backgroundImage = null;
  if (b.backgroundImageType === undefined) b.backgroundImageType = null;
  if (b.backgroundBlur === undefined) b.backgroundBlur = 0;
  if (b.dueDate === undefined) b.dueDate = null;
  if (b.hasDueTime === undefined) b.hasDueTime = false;
  if (b.emoji === undefined) b.emoji = null;
  b.columns.forEach((col) => {
    if (col.emoji === undefined) col.emoji = null;
    col.cards.forEach(normalizeCardDefaults);
  });
  b.archivedCards.forEach(normalizeCardDefaults);
  return b;
}

function migrateAppData(loaded) {
  if (loaded && Array.isArray(loaded.boards)) {
    loaded.boards.forEach(normalizeBoard);
    if (!Array.isArray(loaded.archivedBoards)) loaded.archivedBoards = [];
    loaded.archivedBoards.forEach(normalizeBoard);
    if (!loaded.activeBoardId || !loaded.boards.find((b) => b.id === loaded.activeBoardId)) {
      loaded.activeBoardId = loaded.boards[0] ? loaded.boards[0].id : null;
    }
    if (!loaded.theme) loaded.theme = "dark";
    if (!loaded.pattern) loaded.pattern = "none";
    if (loaded.pomodoroCowMode === undefined) loaded.pomodoroCowMode = false;
    if (loaded.pomodoroOverlayHidden === undefined) loaded.pomodoroOverlayHidden = false;
    if (loaded.pomodoroPersistSettings === undefined) loaded.pomodoroPersistSettings = false;
    if (loaded.pomodoroSavedPlan === undefined) loaded.pomodoroSavedPlan = null;
    if (!loaded.boards.length) return defaultAppData();
    return loaded;
  }
  if (loaded && Array.isArray(loaded.columns)) {
    const b = normalizeBoard(loaded);
    return { boards: [b], archivedBoards: [], activeBoardId: b.id, theme: "dark", pattern: "none", pomodoroCowMode: false, pomodoroOverlayHidden: false, pomodoroPersistSettings: false, pomodoroSavedPlan: null };
  }
  const order = [
    { key: "todo", title: "To Do" },
    { key: "doing", title: "Doing" },
    { key: "done", title: "Done" },
  ];
  const columns = order.map((o) => ({ id: o.key, title: o.title, cards: (loaded && loaded[o.key]) || [] }));
  const b = normalizeBoard({ id: crypto.randomUUID(), name: "My Board", columns, labels: [] });
  return { boards: [b], archivedBoards: [], activeBoardId: b.id, theme: "dark", pattern: "none", pomodoroCowMode: false, pomodoroOverlayHidden: false, pomodoroPersistSettings: false, pomodoroSavedPlan: null };
}

async function loadAppData() {
  try {
    const json = await invoke("load_data");
    appData = migrateAppData(JSON.parse(json));
  } catch (e) {
    appData = defaultAppData();
  }
  await migrateLegacyBackgroundImages();
  board = appData.boards.find((b) => b.id === appData.activeBoardId) || appData.boards[0];
  applyTheme(appData.theme);
  applyPattern(appData.pattern);
  pomo.cowMode = !!appData.pomodoroCowMode;
  // Plan durations/session-count/cadence otherwise always start at
  // POMO_DEFAULT_DURATIONS/4/4 on every launch (they're plain in-memory
  // fields on `pomo`, never part of what gets saved) - only pulled back in
  // here when the user explicitly opted in via the "remember these
  // settings" toggle, so a one-off custom timer doesn't silently become
  // permanent for everyone who didn't ask for that.
  if (appData.pomodoroPersistSettings && appData.pomodoroSavedPlan) {
    const saved = appData.pomodoroSavedPlan;
    pomo.durations = { ...POMO_DEFAULT_DURATIONS, ...saved.durations };
    pomo.totalSessions = saved.totalSessions || 4;
    pomo.longBreakEvery = saved.longBreakEvery ?? 4;
    pomo.remainingSeconds = pomo.durations.work;
  }
  renderBoardTitle();
  renderSidebar();
  render();
  syncBoardBackground();
  renderPomodoro(true);
}

// Older saves kept each board's background image embedded as base64 right
// inside the main JSON. That's exactly what made every routine save (adding
// a card, checking a box) slow - the whole multi-megabyte string had to be
// rewritten to disk every time. This runs once, moves any embedded image out
// to its own file on disk via the Rust side, and leaves just a small flag +
// mime type behind in the JSON.
async function migrateLegacyBackgroundImages() {
  let migrated = false;
  for (const b of appData.boards) {
    if (typeof b.backgroundImage === "string" && b.backgroundImage.startsWith("data:")) {
      const match = b.backgroundImage.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        const [, mimeType, base64Data] = match;
        try {
          await invoke("save_background_image", { boardId: b.id, dataBase64: base64Data });
          backgroundImageCache.set(b.id, b.backgroundImage);
          b.backgroundImage = true;
          b.backgroundImageType = mimeType;
          migrated = true;
        } catch (err) {
          // Leave it embedded for now if the write fails; we'll just retry next launch.
        }
      } else {
        b.backgroundImage = null;
        migrated = true;
      }
    }
  }
  if (migrated) saveBoard();
}

let saveTimer = null;
function saveBoard() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    invoke("save_data", { data: JSON.stringify(appData) });
  }, 300);
}
window.addEventListener("beforeunload", () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    invoke("save_data", { data: JSON.stringify(appData) });
  }
});
function getColumn(columnId) {
  return board.columns.find((c) => c.id === columnId);
}
function findCard(cardId, columnId) {
  const col = getColumn(columnId);
  return col ? col.cards.find((c) => c.id === cardId) : null;
}
function deleteCard(columnId, cardId) {
  const col = getColumn(columnId);
  if (!col) return;
  col.cards = col.cards.filter((c) => c.id !== cardId);
  render();
  saveBoard();
}

// ----- Card archiving -----

function archiveCard(columnId, cardId) {
  const col = getColumn(columnId);
  if (!col) return;
  const idx = col.cards.findIndex((c) => c.id === cardId);
  if (idx === -1) return;
  const [card] = col.cards.splice(idx, 1);
  board.archivedCards.push({ ...card, archivedAt: new Date().toISOString(), originalColumnId: columnId, originalColumnTitle: col.title });
  render();
  saveBoard();
}

function restoreArchivedCard(entry) {
  const idx = board.archivedCards.findIndex((c) => c.id === entry.id);
  if (idx === -1) return;
  const [removed] = board.archivedCards.splice(idx, 1);
  const { archivedAt, originalColumnId, originalColumnTitle, ...card } = removed;
  const targetCol = getColumn(originalColumnId) || board.columns[0];
  if (targetCol) targetCol.cards.push(card);
  render();
  renderArchivedCardsGrid();
  saveBoard();
}

function permanentlyDeleteArchivedCard(entry) {
  openConfirmPopover(`Permanently delete "${entry.title || "this card"}"? This can't be undone.`, () => {
    board.archivedCards = board.archivedCards.filter((c) => c.id !== entry.id);
    renderArchivedCardsGrid();
    saveBoard();
  });
}

let archivedCardsSearchQuery = "";

function openArchivedCardsWindow() {
  document.getElementById("archived-cards-search").value = "";
  archivedCardsSearchQuery = "";
  renderArchivedCardsGrid();
  document.getElementById("archived-cards-overlay").classList.remove("hidden");
}
function closeArchivedCardsWindow() {
  document.getElementById("archived-cards-overlay").classList.add("hidden");
}
function renderArchivedCardsGrid() {
  const grid = document.getElementById("archived-cards-grid");
  const all = (board.archivedCards || []).slice().sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
  const q = archivedCardsSearchQuery;
  const items = q
    ? all.filter((c) => {
        const text = [c.title, htmlToPlainText(c.description), ...(c.checklist || []).map((i) => i.text)].join(" ").toLowerCase();
        return text.includes(q);
      })
    : all;
  if (!items.length) {
    grid.innerHTML = `<div class="archived-empty">${all.length ? "No archived cards match your search." : "No archived cards on this board."}</div>`;
    return;
  }
  grid.innerHTML = items
    .map((c) => `
      <div class="archived-card-tile">
        <div class="archived-card-title">${c.emoji ? emojiHtml(c.emoji) + " " : ""}${escapeHtml(c.title || "(untitled)")}</div>
        <div class="archived-card-meta">From: ${escapeHtml(c.originalColumnTitle || "—")} · ${formatCommentTimestamp(c.archivedAt)}</div>
        <div class="archived-card-actions">
          <button class="archived-restore-btn" data-id="${c.id}">↩️ Restore</button>
          <button class="archived-delete-btn danger-action" data-id="${c.id}">🗑️ Delete</button>
        </div>
      </div>
    `)
    .join("");
  grid.querySelectorAll(".archived-restore-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = board.archivedCards.find((c) => c.id === btn.dataset.id);
      if (entry) restoreArchivedCard(entry);
    });
  });
  grid.querySelectorAll(".archived-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = board.archivedCards.find((c) => c.id === btn.dataset.id);
      if (entry) permanentlyDeleteArchivedCard(entry);
    });
  });
}
document.getElementById("btn-archive").addEventListener("click", openArchivedCardsWindow);
document.getElementById("archived-cards-close").addEventListener("click", closeArchivedCardsWindow);
document.getElementById("archived-cards-overlay").addEventListener("click", (e) => {
  if (e.target.id === "archived-cards-overlay") closeArchivedCardsWindow();
});
document.getElementById("archived-cards-search").addEventListener("input", (e) => {
  archivedCardsSearchQuery = e.target.value.trim().toLowerCase();
  renderArchivedCardsGrid();
});

// ----- Generic popovers: confirm, alert, and text-input -----

function openConfirmPopover(message, onConfirm) {
  const overlay = document.createElement("div");
  overlay.id = "confirm-overlay";
  overlay.innerHTML = `
    <div id="confirm-box">
      <p>${escapeHtml(message)}</p>
      <div class="popover-buttons">
        <button id="confirm-cancel">Cancel</button>
        <button id="confirm-delete">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector("#confirm-cancel").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#confirm-delete").addEventListener("click", () => {
    overlay.remove();
    onConfirm();
  });
}

function openAlertPopover(message) {
  const overlay = document.createElement("div");
  overlay.id = "confirm-overlay";
  overlay.innerHTML = `
    <div id="confirm-box">
      <p>${escapeHtml(message)}</p>
      <div class="popover-buttons">
        <button id="alert-ok" style="background:var(--accent);color:#fff;">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector("#alert-ok").addEventListener("click", () => overlay.remove());
}

function openInputPopover(title, initialValue, onSubmit) {
  const overlay = document.createElement("div");
  overlay.id = "confirm-overlay";
  overlay.innerHTML = `
    <div id="confirm-box">
      <p>${escapeHtml(title)}</p>
      <input type="text" id="input-popover-field" />
      <div class="popover-buttons">
        <button id="input-popover-cancel">Cancel</button>
        <button id="input-popover-ok">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const field = overlay.querySelector("#input-popover-field");
  field.value = initialValue;
  field.focus();
  field.select();
  function close() { overlay.remove(); }
  function submit() {
    const val = field.value.trim();
    if (val) onSubmit(val);
    close();
  }
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("#input-popover-cancel").addEventListener("click", close);
  overlay.querySelector("#input-popover-ok").addEventListener("click", submit);
  field.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    if (e.key === "Escape") close();
  });
}

// ----- Sidebar: boards list -----

function renderSidebar() {
  const list = document.getElementById("boards-list");
  list.innerHTML = "";
  appData.boards.forEach((b) => {
    const item = document.createElement("div");
    item.className = "board-item" + (b.id === appData.activeBoardId ? " board-item-active" : "");
    item.innerHTML = `${b.emoji ? `<span class="board-item-emoji">${emojiHtml(b.emoji)}</span>` : ""}${escapeHtml(b.name)}`;
    item.dataset.boardId = b.id;
    item.addEventListener("mousedown", (e) => onBoardItemMouseDown(e, b, item));
    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openMenu(e.clientX, e.clientY, [
        { label: "✏️ Rename", onClick: () => renameBoardPrompt(b) },
        { label: "📅 Set Due Date", onClick: () => openBoardDueDatePopover(b, e.clientX, e.clientY) },
        { label: "😎 Add Emoji", onClick: () => openEmojiPicker(e.clientX, e.clientY, b.emoji,
            (emoji) => { b.emoji = emoji; if (b.id === board.id) renderBoardTitle(); renderSidebar(); saveBoard(); },
            () => { b.emoji = null; if (b.id === board.id) renderBoardTitle(); renderSidebar(); saveBoard(); }
          ) },
        { label: "🗃️ Archive", onClick: () => archiveBoard(b) },
        { label: "🗑️ Delete", onClick: () => confirmDeleteBoard(b) },
      ]);
    });
    list.appendChild(item);
  });
}

function switchBoard(id) {
  if (id === appData.activeBoardId) return;
  appData.activeBoardId = id;
  board = appData.boards.find((b) => b.id === id);
  closeArchivedCardsWindow();
  renderBoardTitle();
  renderSidebar();
  render();
  syncBoardBackground();
  saveBoard();
}

function resetAddBoardArea() {
  const area = document.getElementById("add-board-area");
  area.innerHTML = `<button id="add-board-btn">+ New Board</button>`;
  document.getElementById("add-board-btn").addEventListener("click", openInlineAddBoard);
}

function openInlineAddBoard() {
  const area = document.getElementById("add-board-area");
  area.innerHTML = "";
  const row = document.createElement("div");
  row.className = "inline-add-row";
  let pendingEmoji = null;
  const input = document.createElement("input");
  input.type = "text";
  input.id = "new-board-input";
  input.placeholder = "Board name...";
  // Appended after the input (not before) so Tab from the input lands on
  // it in natural DOM order; CSS `order: -1` puts it back on the left visually.
  const emojiBtn = createEmojiSlotButton(() => pendingEmoji, (emoji) => { pendingEmoji = emoji; });
  row.appendChild(input);
  row.appendChild(emojiBtn);
  area.appendChild(row);
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "inline-add-confirm-btn";
  confirmBtn.textContent = "Confirm";
  area.appendChild(confirmBtn);
  input.focus();
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    const val = input.value.trim();
    if (val || pendingEmoji) {
      const nb = createNewBoard(val || "My Board");
      nb.emoji = pendingEmoji || null;
      appData.boards.push(nb);
      appData.activeBoardId = nb.id;
      board = nb;
      renderBoardTitle();
      renderSidebar();
      render();
      saveBoard();
    }
    resetAddBoardArea();
  }
  function cancel() {
    if (done) return;
    done = true;
    resetAddBoardArea();
  }
  confirmBtn.addEventListener("click", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") cancel();
  });
  // Tab moves focus from the input to the emoji button right next to it -
  // that should just move focus there, nothing else. Only commit once focus
  // actually leaves the row entirely (e.g. clicking elsewhere).
  function onRowFocusOut(e) {
    if (e.relatedTarget && row.contains(e.relatedTarget)) return;
    setTimeout(commit, 100);
  }
  input.addEventListener("focusout", onRowFocusOut);
  emojiBtn.addEventListener("focusout", onRowFocusOut);
}

function renameBoardPrompt(b) {
  openInputPopover(`Rename "${b.name}"`, b.name, (newName) => {
    b.name = newName;
    renderBoardTitle();
    renderSidebar();
    saveBoard();
  });
}

function confirmDeleteBoard(b) {
  if (appData.boards.length <= 1) {
    openAlertPopover("You need at least one board — create another before deleting this one.");
    return;
  }
  const count = b.columns.reduce((sum, c) => sum + c.cards.length, 0);
  const msg = count > 0 ? `Delete "${b.name}" and its ${count} card${count === 1 ? "" : "s"}?` : `Delete "${b.name}"?`;
  openConfirmPopover(msg, () => {
    appData.boards = appData.boards.filter((x) => x.id !== b.id);
    backgroundImageCache.delete(b.id);
    invoke("delete_background_image", { boardId: b.id }).catch(() => {});
    if (appData.activeBoardId === b.id) {
      appData.activeBoardId = appData.boards[0].id;
      board = appData.boards[0];
      syncBoardBackground();
    }
    renderBoardTitle();
    renderSidebar();
    render();
    saveBoard();
  });
}

// ----- Board archiving -----

function archiveBoard(b) {
  if (appData.boards.length <= 1) {
    openAlertPopover("You need at least one board — create another before archiving this one.");
    return;
  }
  appData.boards = appData.boards.filter((x) => x.id !== b.id);
  appData.archivedBoards.push({ ...b, archivedAt: new Date().toISOString() });
  if (appData.activeBoardId === b.id) {
    appData.activeBoardId = appData.boards[0].id;
    board = appData.boards[0];
    syncBoardBackground();
  }
  renderBoardTitle();
  renderSidebar();
  render();
  saveBoard();
}

function restoreArchivedBoard(entry) {
  appData.archivedBoards = appData.archivedBoards.filter((b) => b.id !== entry.id);
  const { archivedAt, ...b } = entry;
  appData.boards.push(b);
  renderSidebar();
  renderArchivedBoardsList();
  saveBoard();
}

function permanentlyDeleteArchivedBoard(entry) {
  openConfirmPopover(`Permanently delete "${entry.name}"? This can't be undone.`, () => {
    appData.archivedBoards = appData.archivedBoards.filter((b) => b.id !== entry.id);
    backgroundImageCache.delete(entry.id);
    invoke("delete_background_image", { boardId: entry.id }).catch(() => {});
    renderArchivedBoardsList();
    saveBoard();
  });
}

function openArchivedBoardsWindow() {
  renderArchivedBoardsList();
  document.getElementById("archived-boards-overlay").classList.remove("hidden");
}
function closeArchivedBoardsWindow() {
  document.getElementById("archived-boards-overlay").classList.add("hidden");
}
function renderArchivedBoardsList() {
  const list = document.getElementById("archived-boards-list");
  const items = (appData.archivedBoards || []).slice().sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
  if (!items.length) {
    list.innerHTML = `<div class="archived-empty">No archived boards.</div>`;
    return;
  }
  list.innerHTML = items
    .map((b) => `
      <div class="archived-boards-row">
        <span class="archived-boards-row-name">${b.emoji ? emojiHtml(b.emoji) + " " : ""}${escapeHtml(b.name)}</span>
        <span class="archived-boards-row-actions">
          <button class="archived-board-restore-btn" data-id="${b.id}" title="Restore">↩️ Restore</button>
          <button class="archived-board-delete-btn danger-action" data-id="${b.id}" title="Delete permanently">🗑️</button>
        </span>
      </div>
    `)
    .join("");
  list.querySelectorAll(".archived-board-restore-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = appData.archivedBoards.find((b) => b.id === btn.dataset.id);
      if (entry) restoreArchivedBoard(entry);
    });
  });
  list.querySelectorAll(".archived-board-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = appData.archivedBoards.find((b) => b.id === btn.dataset.id);
      if (entry) permanentlyDeleteArchivedBoard(entry);
    });
  });
}
document.getElementById("archived-boards-close").addEventListener("click", closeArchivedBoardsWindow);
document.getElementById("archived-boards-overlay").addEventListener("click", (e) => {
  if (e.target.id === "archived-boards-overlay") closeArchivedBoardsWindow();
});
document.getElementById("sidebar-menu-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = e.currentTarget.getBoundingClientRect();
  openMenu(rect.left, rect.bottom + 4, [
    { label: "🗃️ Archived Boards", onClick: () => openArchivedBoardsWindow() },
  ]);
});

document.getElementById("sidebar-toggle-btn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
});

document.getElementById("board-menu-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = e.currentTarget.getBoundingClientRect();
  openMenu(rect.left, rect.bottom + 4, [
    { label: "✏️ Rename Board", onClick: () => renameBoardPrompt(board) },
    { label: "📅 Set Due Date", onClick: () => openBoardDueDatePopover(board, rect.left, rect.bottom + 4) },
    { label: "😎 Add Emoji", onClick: () => openEmojiPicker(rect.left, rect.bottom + 4, board.emoji,
        (emoji) => { board.emoji = emoji; renderBoardTitle(); renderSidebar(); saveBoard(); },
        () => { board.emoji = null; renderBoardTitle(); renderSidebar(); saveBoard(); }
      ) },
    { label: "🖼️ Background", onClick: () => openBackgroundPanel() },
    { label: "🗃️ Archive Board", onClick: () => archiveBoard(board) },
    { label: "🗑️ Delete Board", onClick: () => confirmDeleteBoard(board) },
  ]);
});
document.getElementById("board-due-badge").addEventListener("click", (e) => {
  if (!board.dueDate) return;
  const rect = e.currentTarget.getBoundingClientRect();
  openBoardDueDatePopover(board, rect.left, rect.bottom + 6);
});

// ----- Settings panel -----

function openSettingsPanel() {
  document.getElementById("settings-overlay").classList.remove("hidden");
  renderAppearanceControls();
  const pathBox = document.getElementById("settings-data-path");
  pathBox.textContent = "Loading...";
  invoke("get_data_path")
    .then((p) => { pathBox.textContent = p; })
    .catch(() => { pathBox.textContent = "Unable to determine path."; });
}
function closeSettingsPanel() {
  document.getElementById("settings-overlay").classList.add("hidden");
}
document.getElementById("settings-btn").addEventListener("click", openSettingsPanel);
document.getElementById("settings-close").addEventListener("click", closeSettingsPanel);
document.getElementById("settings-overlay").addEventListener("click", (e) => {
  if (e.target.id === "settings-overlay") closeSettingsPanel();
});

// ----- About panel -----

function openAboutPanel() {
  document.getElementById("about-overlay").classList.remove("hidden");
}
function closeAboutPanel() {
  document.getElementById("about-overlay").classList.add("hidden");
}
document.getElementById("about-btn").addEventListener("click", openAboutPanel);
document.getElementById("about-close").addEventListener("click", closeAboutPanel);
document.getElementById("about-overlay").addEventListener("click", (e) => {
  if (e.target.id === "about-overlay") closeAboutPanel();
});

// ----- Board background panel -----

// Background image bytes live on disk (via Rust), not in the JSON. This is
// an in-memory-only cache (never saved) of the data URL for whichever
// boards we've already fetched this session, so switching back to a board
// doesn't re-read its file from disk every time.
const backgroundImageCache = new Map();

async function getBoardBackgroundDataUrl(b) {
  if (!b.backgroundImage) return null;
  if (backgroundImageCache.has(b.id)) return backgroundImageCache.get(b.id);
  try {
    const base64 = await invoke("load_background_image", { boardId: b.id });
    const url = `data:${b.backgroundImageType || "image/png"};base64,${base64}`;
    backgroundImageCache.set(b.id, url);
    return url;
  } catch (err) {
    return null;
  }
}

// Applies the current board's background image/blur to the persistent
// #board-background layer. Deliberately NOT part of render() - recreating a
// large (often blurred) background on every card/label/color change was the
// actual source of the lag, since the browser had to repaint that whole
// layer every time even though the image itself hadn't changed.
async function syncBoardBackground() {
  let bg = document.getElementById("board-background");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "board-background";
    boardEl.appendChild(bg);
  }
  const activeBoardId = board.id;
  const url = await getBoardBackgroundDataUrl(board);
  if (board.id !== activeBoardId) return; // board was switched again while this was loading
  if (url) {
    bg.style.backgroundImage = `url("${url}")`;
    bg.style.filter = `blur(${board.backgroundBlur || 0}px)`;
  } else {
    bg.style.backgroundImage = "none";
    bg.style.filter = "none";
  }
}

function openBackgroundPanel() {
  renderBackgroundPanel();
  document.getElementById("background-overlay").classList.remove("hidden");
}
function closeBackgroundPanel() {
  document.getElementById("background-overlay").classList.add("hidden");
}
function renderBackgroundPanel() {
  const preview = document.getElementById("background-preview");
  const blurRow = document.getElementById("background-blur-row");
  const blurSlider = document.getElementById("background-blur-slider");
  const blurValue = document.getElementById("background-blur-value");
  const removeBtn = document.getElementById("background-remove-btn");

  if (board.backgroundImage) {
    blurRow.classList.remove("hidden");
    removeBtn.classList.remove("hidden");
    blurSlider.value = board.backgroundBlur || 0;
    blurValue.textContent = `${board.backgroundBlur || 0}px`;
    getBoardBackgroundDataUrl(board).then((url) => {
      if (url) preview.style.backgroundImage = `url("${url}")`;
    });
  } else {
    preview.style.backgroundImage = "none";
    blurRow.classList.add("hidden");
    removeBtn.classList.add("hidden");
  }
}

document.getElementById("background-choose-btn").addEventListener("click", () => {
  document.getElementById("background-file-input").click();
});
document.getElementById("background-file-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) return;
    const [, mimeType, base64Data] = match;
    try {
      await invoke("save_background_image", { boardId: board.id, dataBase64: base64Data });
    } catch (err) {
      openAlertPopover("Couldn't save that image - please try a different file.");
      return;
    }
    board.backgroundImage = true;
    board.backgroundImageType = mimeType;
    if (!board.backgroundBlur) board.backgroundBlur = 0;
    backgroundImageCache.set(board.id, dataUrl);
    renderBackgroundPanel();
    await syncBoardBackground();
    saveBoard();
  };
  reader.readAsDataURL(file);
  e.target.value = "";
});
document.getElementById("background-blur-slider").addEventListener("input", (e) => {
  board.backgroundBlur = parseInt(e.target.value, 10);
  document.getElementById("background-blur-value").textContent = `${board.backgroundBlur}px`;
  const bg = document.getElementById("board-background");
  if (bg) bg.style.filter = `blur(${board.backgroundBlur}px)`;
});
document.getElementById("background-blur-slider").addEventListener("change", () => {
  saveBoard();
});
document.getElementById("background-remove-btn").addEventListener("click", async () => {
  board.backgroundImage = null;
  board.backgroundImageType = null;
  board.backgroundBlur = 0;
  backgroundImageCache.delete(board.id);
  try { await invoke("delete_background_image", { boardId: board.id }); } catch (err) {}
  renderBackgroundPanel();
  await syncBoardBackground();
  saveBoard();
});
document.getElementById("background-close").addEventListener("click", closeBackgroundPanel);
document.getElementById("background-close-bottom").addEventListener("click", closeBackgroundPanel);
document.getElementById("background-overlay").addEventListener("click", (e) => {
  if (e.target.id === "background-overlay") closeBackgroundPanel();
});

// ----- Board title (editable) -----

function renderBoardTitle() {
  boardTitleEl.innerHTML = `${titleEmojiHtml(board.emoji)}<span class="title-text">${escapeHtml(board.name || "My Board")}</span>`;
  wireTitleEmoji(boardTitleEl, () => board.emoji, (emoji) => { board.emoji = emoji; renderBoardTitle(); renderSidebar(); saveBoard(); });

  // Same hover-to-reveal emoji slot columns get when they have no emoji of
  // their own yet - a sibling of #board-title (not a child), so a plain
  // rename swap never touches it. renderBoardTitle runs on its own outside
  // a full board re-render, so the stale button (if any) needs removing
  // first instead of relying on a parent wipe to clear it, the way the
  // column loop can.
  const row = document.getElementById("board-title-row");
  const existingHoverBtn = row.querySelector(".board-emoji-hover-btn");
  if (existingHoverBtn) existingHoverBtn.remove();
  if (!board.emoji) {
    const hoverEmojiBtn = createEmojiSlotButton(
      () => board.emoji,
      (emoji) => { board.emoji = emoji; renderBoardTitle(); renderSidebar(); saveBoard(); }
    );
    hoverEmojiBtn.classList.add("board-emoji-hover-btn");
    hoverEmojiBtn.title = "Add emoji";
    row.prepend(hoverEmojiBtn);
  }

  updateBoardDueBadge();
}

function dueBadgeEmoji(colorClass) {
  if (colorClass === "due-overdue" || colorClass === "due-red") return "🚨";
  if (colorClass === "due-orange") return "⌛";
  return "🗓️";
}

function updateBoardDueBadge() {
  const el = document.getElementById("board-due-badge");
  if (!el) return;
  if (!board.dueDate) {
    el.className = "hidden";
    el.textContent = "";
    return;
  }
  const colorClass = dueDateColorClass(board.dueDate, board.hasDueTime);
  el.className = `board-due-badge ${colorClass}`;
  el.textContent = `${dueBadgeEmoji(colorClass)} Due ${formatDueDate(board.dueDate, board.hasDueTime)}`;
}

function openBoardDueDatePopover(targetBoard, x, y) {
  closeDueDatePopover();
  const panel = document.createElement("div");
  panel.id = "due-date-popover";
  panel.innerHTML = `
    <input type="date" id="popover-date" value="${targetBoard.dueDate ? targetBoard.dueDate.slice(0, 10) : ""}" />
    <label class="time-toggle">
      <input type="checkbox" id="popover-time-toggle" ${targetBoard.hasDueTime ? "checked" : ""} /> Set time
    </label>
    <input type="time" id="popover-time" class="${targetBoard.hasDueTime ? "" : "hidden"}" value="${targetBoard.hasDueTime && targetBoard.dueDate ? targetBoard.dueDate.slice(11, 16) : ""}" />
    <div class="popover-buttons">
      <button id="popover-clear">Clear</button>
      <button id="popover-close">Done</button>
    </div>
  `;
  document.body.appendChild(panel);
  panel.style.left = x + "px";
  panel.style.top = y + "px";
  const rect = panel.getBoundingClientRect();
  if (rect.right > window.innerWidth) panel.style.left = window.innerWidth - rect.width - 10 + "px";
  if (rect.bottom > window.innerHeight) panel.style.top = window.innerHeight - rect.height - 10 + "px";

  const dateInput = panel.querySelector("#popover-date");
  const timeToggle = panel.querySelector("#popover-time-toggle");
  const timeInput = panel.querySelector("#popover-time");

  [dateInput, timeInput].forEach((inp) => {
    inp.addEventListener("click", () => {
      if (inp.showPicker) { try { inp.showPicker(); } catch (e) {} }
    });
  });

  function commitChange() {
    const dateVal = dateInput.value;
    if (!dateVal) {
      targetBoard.dueDate = null;
      targetBoard.hasDueTime = false;
    } else if (timeToggle.checked && timeInput.value) {
      targetBoard.dueDate = `${dateVal}T${timeInput.value}`;
      targetBoard.hasDueTime = true;
    } else {
      targetBoard.dueDate = dateVal;
      targetBoard.hasDueTime = false;
    }
    if (targetBoard.id === board.id) updateBoardDueBadge();
    saveBoard();
  }

  dateInput.addEventListener("change", commitChange);
  timeInput.addEventListener("change", commitChange);
  timeToggle.addEventListener("change", () => {
    timeInput.classList.toggle("hidden", !timeToggle.checked);
    commitChange();
  });
  panel.querySelector("#popover-clear").addEventListener("click", () => {
    dateInput.value = "";
    timeToggle.checked = false;
    timeInput.classList.add("hidden");
    timeInput.value = "";
    commitChange();
    closeDueDatePopover();
  });
  panel.querySelector("#popover-close").addEventListener("click", closeDueDatePopover);

  setTimeout(() => document.addEventListener("click", onDocClickCloseDuePopover), 0);
}
boardTitleEl.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "board-title-input";
  input.value = board.name || "My Board";
  boardTitleEl.replaceWith(input);
  input.focus();
  input.select();
  function commit() {
    const val = input.value.trim();
    if (val) board.name = val;
    input.replaceWith(boardTitleEl);
    renderBoardTitle();
    renderSidebar();
    saveBoard();
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { input.replaceWith(boardTitleEl); renderBoardTitle(); }
  });
  input.addEventListener("blur", commit);
});

// ----- Search -----

function matchesSearch(card) {
  if (!searchQuery) return true;
  const text = [card.title, htmlToPlainText(card.description), ...(card.checklist || []).map((i) => i.text)]
    .join(" ")
    .toLowerCase();
  return text.includes(searchQuery);
}
function applySearchFilter() {
  document.querySelectorAll(".card:not(.inline-add-card)").forEach((el) => {
    const columnId = el.closest(".column")?.dataset.columnId;
    const card = findCard(el.dataset.id, columnId);
    if (!card) return;
    el.style.display = matchesSearch(card) ? "" : "none";
  });
}
function updateSearchClearVisibility() {
  searchClearBtn.classList.toggle("hidden", !searchInput.value);
}
function clearSearch() {
  searchInput.value = "";
  searchQuery = "";
  applySearchFilter();
  updateSearchClearVisibility();
}
searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  applySearchFilter();
  updateSearchClearVisibility();
});
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { clearSearch(); searchInput.blur(); }
});
searchClearBtn.addEventListener("click", () => { clearSearch(); searchInput.focus(); });

// ----- Task completion -----

function computeCompletionStats() {
  let totalDone = 0, totalAll = 0;
  const byColumn = board.columns.map((col) => {
    let done = 0, all = 0;
    col.cards.forEach((c) => {
      all += 1 + (c.checklist || []).length;
      if (c.completed) done += 1;
      (c.checklist || []).forEach((i) => { if (i.done) done++; });
    });
    totalDone += done; totalAll += all;
    return { title: col.title, done, all };
  });
  return { totalDone, totalAll, byColumn };
}

function toggleCardComplete(columnId, cardId) {
  const card = findCard(cardId, columnId);
  if (!card) return;
  card.completed = !card.completed;
  patchCard(columnId, cardId);
  saveBoard();
}
function updateCompletionButton() {
  const stats = computeCompletionStats();
  const btn = document.getElementById("btn-completion");
  if (btn) btn.textContent = `✔ ${stats.totalDone}/${stats.totalAll}`;
}
function openCompletionPopover(x, y) {
  closeCompletionPopover();
  const stats = computeCompletionStats();
  const panel = document.createElement("div");
  panel.id = "completion-popover";
  const rows = stats.byColumn
    .map((c) => `<div class="completion-row"><span>${escapeHtml(c.title)}</span><span>${c.done}/${c.all}</span></div>`)
    .join("");
  panel.innerHTML = `
    <div class="completion-row completion-overall"><span>Overall</span><span>${stats.totalDone}/${stats.totalAll}</span></div>
    <div class="completion-divider"></div>
    ${rows}
  `;
  document.body.appendChild(panel);
  panel.style.left = x + "px";
  panel.style.top = y + "px";
  const rect = panel.getBoundingClientRect();
  if (rect.right > window.innerWidth) panel.style.left = window.innerWidth - rect.width - 10 + "px";
  setTimeout(() => document.addEventListener("click", onDocClickCloseCompletion), 0);
}
function onDocClickCloseCompletion(e) {
  const panel = document.getElementById("completion-popover");
  if (panel && !panel.contains(e.target) && e.target.id !== "btn-completion") closeCompletionPopover();
}
function closeCompletionPopover() {
  const panel = document.getElementById("completion-popover");
  if (panel) panel.remove();
  document.removeEventListener("click", onDocClickCloseCompletion);
}
document.getElementById("btn-completion").addEventListener("click", (e) => {
  e.stopPropagation();
  const existing = document.getElementById("completion-popover");
  if (existing) { closeCompletionPopover(); return; }
  const rect = e.currentTarget.getBoundingClientRect();
  openCompletionPopover(rect.left, rect.bottom + 6);
});

// ----- Rendering -----

function render() {
  // The background layer is intentionally kept alive across renders (see
  // syncBoardBackground above) instead of being torn down and rebuilt here.
  let bg = document.getElementById("board-background");
  if (!bg) {
    bg = document.createElement("div");
    bg.id = "board-background";
    boardEl.appendChild(bg);
  }
  Array.from(boardEl.children).forEach((child) => {
    if (child !== bg) child.remove();
  });

  board.columns.forEach((col) => {
    const colEl = document.createElement("div");
    colEl.className = "column";
    colEl.dataset.columnId = col.id;

    const header = document.createElement("div");
    header.className = "column-header";
    header.innerHTML = `
      <span class="column-drag-handle" title="Drag to reorder">⠿</span>
      <div class="column-title-row">
        <div class="column-title">${titleEmojiHtml(col.emoji)}<span class="title-text">${escapeHtml(col.title)}</span></div>
      </div>
      <button class="column-menu-btn">⋯</button>
    `;
    if (!col.emoji) {
      const hoverEmojiBtn = createEmojiSlotButton(
        () => col.emoji,
        (emoji) => { col.emoji = emoji; render(); saveBoard(); }
      );
      hoverEmojiBtn.classList.add("column-emoji-hover-btn");
      hoverEmojiBtn.title = "Add emoji";
      header.querySelector(".column-title-row").prepend(hoverEmojiBtn);
    }
    colEl.appendChild(header);

    const cardsContainer = document.createElement("div");
    cardsContainer.className = "cards";
    cardsContainer.id = `cards-${col.id}`;
    colEl.appendChild(cardsContainer);

    const addBtn = document.createElement("button");
    addBtn.className = "add-card-btn";
    addBtn.dataset.status = col.id;
    addBtn.textContent = "+ Add Card";
    colEl.appendChild(addBtn);

    boardEl.appendChild(colEl);

    col.cards.forEach((card) => cardsContainer.appendChild(buildCardEl(col.id, card)));

    header.querySelector(".column-title").addEventListener("click", (e) => startEditColumnTitle(col, e.currentTarget));
    wireTitleEmoji(header, () => col.emoji, (emoji) => { col.emoji = emoji; render(); saveBoard(); });
    header.querySelector(".column-menu-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = e.target.getBoundingClientRect();
      openMenu(rect.left, rect.bottom + 4, [
        { label: "🗑️ Delete Column", onClick: () => confirmDeleteColumn(col) },
      ]);
    });
    header.querySelector(".column-drag-handle").addEventListener("mousedown", (e) => onColumnMouseDown(e, col, colEl));
    addBtn.addEventListener("click", () => openInlineAdd(col.id));
  });

  const addColBtn = document.createElement("button");
  addColBtn.id = "add-column-btn";
  addColBtn.textContent = "+ Add Column";
  addColBtn.addEventListener("click", () => openInlineAddColumn());
  boardEl.appendChild(addColBtn);

  applySearchFilter();
  updateCompletionButton();
  refreshChecklistPreviewOverflow();
  if (!document.getElementById("upcoming-sidebar").classList.contains("hidden")) {
    renderUpcomingSidebar();
  }
}

// A thin custom scroll thumb on any card's checklist preview whose items
// overflow its max-height - the real scrollbar is hidden (see .card-
// checklist-scroll in styles.css, and its comment for why), so this tracks
// scroll position itself. Independent of the board's own auto-hiding
// bottom scrollbar, which is a separate element entirely.
function refreshChecklistPreviewOverflow(root) {
  (root || document).querySelectorAll(".card-checklist-preview").forEach((wrap) => {
    const scrollEl = wrap.querySelector(".card-checklist-scroll");
    const thumb = wrap.querySelector(".card-checklist-thumb");
    if (!scrollEl || !thumb) return;
    const hasOverflow = scrollEl.scrollHeight > scrollEl.clientHeight + 1;
    wrap.classList.toggle("has-scroll", hasOverflow);
    if (!hasOverflow) return;
    const updateThumb = () => {
      const trackHeight = scrollEl.clientHeight;
      const thumbHeight = Math.max(10, (scrollEl.clientHeight / scrollEl.scrollHeight) * trackHeight);
      thumb.style.height = thumbHeight + "px";
      const maxScrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      const scrollRatio = maxScrollTop > 0 ? scrollEl.scrollTop / maxScrollTop : 0;
      thumb.style.top = scrollRatio * maxThumbTop + "px";
    };
    updateThumb();
    scrollEl.addEventListener("scroll", updateThumb);
  });
}

function buildCardEl(columnId, card) {
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.id = card.id;
  if (card.color) {
    const bgColor = mutedCardColor(card.color);
    el.style.backgroundColor = bgColor;
    el.style.color = contrastTextColor(bgColor);
  }

  const checkedCount = (card.checklist || []).filter((i) => i.done).length;
  const totalCount = (card.checklist || []).length;
  const dueBadge = card.dueDate
    ? `<span class="due-badge ${card.completed ? "due-completed" : dueDateColorClass(card.dueDate, card.hasDueTime)}">${card.completed ? "✅ " : ""}${formatDueDate(card.dueDate, card.hasDueTime)}</span>`
    : "";

  const labelIds = card.labelIds || [];
  const labelsHtml = labelIds.length
    ? `<div class="card-labels-row">${labelIds
        .map((id) => getLabel(id))
        .filter(Boolean)
        .map((l) => `<span class="card-label-pill" style="background:${l.color};color:${contrastTextColor(l.color)};border:1px solid ${darkenForOutline(l.color)}">${l.emoji ? emojiHtml(l.emoji) + " " : ""}${escapeHtml(l.name)}</span>`)
        .join("")}</div>`
    : "";

  const completeCornerBadge = card.completed && !card.dueDate
    ? `<span class="card-complete-badge" title="Completed">✅</span>`
    : "";

  // The preview snippet is deliberately plain text, not the real rich HTML -
  // list bullets/indents look cramped clipped to 2 lines in a small card,
  // so the formatting is reserved for the full detail view.
  const descPlainText = htmlToPlainText(card.description);
  const descPreviewHtml = descPlainText
    ? `<div class="card-desc-preview">${escapeHtml(descPlainText)}</div>`
    : "";

  // Real checkboxes (not a plain ☐/☑ glyph) - lets a checklist item be
  // ticked off straight from the board, without opening the card. A plain
  // <div> row, not a <label> - a label wrapping the checkbox made the
  // whole row (including the item's text) a toggle target, which fought
  // with just wanting to glance at/select the text; only the checkbox
  // itself toggles now. Safe from both the card-open-on-click and
  // card-drag handlers regardless: onCardMouseDown already bails out (no
  // dragState set) for anything inside .card-checklist-preview -
  // originally so dragging the custom scrollbar thumb wouldn't also start
  // a card drag - which as a side effect means openDetailModal's own
  // trigger (the drag mouseup path) never fires from in here either.
  const checklistPreviewHtml = totalCount
    ? `<div class="card-checklist-preview">
        <div class="card-checklist-scroll">${(card.checklist || [])
          .map((item, idx) => `
            <div class="card-checklist-preview-item${item.done ? " checklist-done" : ""}">
              <input type="checkbox" class="card-checklist-preview-check" data-idx="${idx}" ${item.done ? "checked" : ""} />
              <span class="card-checklist-preview-text">${escapeHtml(item.text)}</span>
            </div>
          `)
          .join("")}</div>
        <div class="card-checklist-thumb-track"><div class="card-checklist-thumb"></div></div>
      </div>`
    : "";

  el.innerHTML = `
    <div class="card-top-row">
      <div class="card-title">${titleEmojiHtml(card.emoji)}<span class="title-text">${escapeHtml(card.title)}</span></div>
      ${dueBadge}
    </div>
    ${labelsHtml}
    ${descPreviewHtml}
    ${checklistPreviewHtml}
    <div class="card-footer">
      ${descPlainText ? "<span>📝</span>" : ""}
      ${totalCount ? `<span>✓ ${checkedCount}/${totalCount}</span>` : ""}
    </div>
    ${completeCornerBadge}
    <button class="delete-btn">×</button>
  `;

  el.querySelectorAll(".card-checklist-preview-check").forEach((cb) => {
    cb.addEventListener("click", (e) => e.stopPropagation());
    cb.addEventListener("change", (e) => {
      const item = (card.checklist || [])[+cb.dataset.idx];
      if (!item) return;
      item.done = cb.checked;
      // patchCard rebuilds this whole card element (counts, done-styling,
      // the footer's checked/total tally) from the now-mutated `card`
      // object - same pattern every other direct-from-the-board card
      // mutation uses (emoji pick, color pick, etc.) - but that fresh
      // element's .card-checklist-scroll always starts at scrollTop 0, so
      // without restoring it, checking any item below the fold snapped the
      // list back to the top on every single click. Carry the pre-rebuild
      // scroll position over to the new element (this also re-fires its
      // "scroll" listener, which is what moves the custom thumb back into
      // place - see refreshChecklistPreviewOverflow).
      const scrollEl = cb.closest(".card-checklist-scroll");
      const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
      patchCard(columnId, card.id);
      saveBoard();
      const newScrollEl = document.querySelector(`.card[data-id="${card.id}"] .card-checklist-scroll`);
      if (newScrollEl) newScrollEl.scrollTop = scrollTop;
    });
  });
  el.querySelector(".delete-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openConfirmPopover(`Delete "${card.title}"?`, () => deleteCard(columnId, card.id));
  });
  wireTitleEmoji(el, () => card.emoji, (emoji) => { card.emoji = emoji; patchCard(columnId, card.id); saveBoard(); });
  el.addEventListener("mousedown", (e) => onCardMouseDown(e, columnId, card, el));
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY, [
      { label: card.completed ? "☑️ Mark as Uncomplete" : "✅ Mark as Complete", onClick: () => toggleCardComplete(columnId, card.id) },
      { label: "📅 Set Due Date", onClick: () => openDueDatePopover(columnId, card.id, e.clientX, e.clientY) },
      { label: "😎 Add Emoji", onClick: () => openEmojiPicker(e.clientX, e.clientY, card.emoji,
          (emoji) => { card.emoji = emoji; patchCard(columnId, card.id); saveBoard(); },
          () => { card.emoji = null; patchCard(columnId, card.id); saveBoard(); }
        ) },
      { label: "🏷️ Labels", labelPicker: { columnId, cardId: card.id, onChange: () => patchCard(columnId, card.id) } },
      { label: "🎨 Color", submenu: buildColorSubmenu(columnId, card.id) },
      { label: "🗃️ Archive", onClick: () => archiveCard(columnId, card.id) },
    ]);
  });

  return el;
}

// ----- Column rename -----

function startEditColumnTitle(col, titleEl) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "column-title-input";
  input.value = col.title;
  titleEl.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    const val = input.value.trim();
    if (val) col.title = val;
    render();
    saveBoard();
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { done = true; render(); }
  });
  input.addEventListener("blur", commit);
}

// ----- Add / delete column -----

function openInlineAddColumn() {
  const addColBtn = document.getElementById("add-column-btn");
  if (!addColBtn) return;
  const wrapper = document.createElement("div");
  wrapper.className = "inline-add-column";
  const row = document.createElement("div");
  row.className = "inline-add-row";
  let pendingEmoji = null;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "inline-add-column-input";
  input.placeholder = "Column name...";
  // Appended after the input (not before) so Tab from the input lands on
  // it in natural DOM order; CSS `order: -1` puts it back on the left visually.
  const emojiBtn = createEmojiSlotButton(() => pendingEmoji, (emoji) => { pendingEmoji = emoji; });
  row.appendChild(input);
  row.appendChild(emojiBtn);
  wrapper.appendChild(row);
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "inline-add-confirm-btn";
  confirmBtn.textContent = "Confirm";
  wrapper.appendChild(confirmBtn);
  addColBtn.replaceWith(wrapper);
  input.focus();
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    const val = input.value.trim();
    if (val || pendingEmoji) {
      board.columns.push({ id: crypto.randomUUID(), title: val, cards: [], emoji: pendingEmoji || null });
      render();
      saveBoard();
    } else {
      render();
    }
  }
  function cancel() {
    if (done) return;
    done = true;
    render();
  }
  confirmBtn.addEventListener("click", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") cancel();
  });
  // Tab moves focus from the input to the emoji button right next to it -
  // that should just move focus there, nothing else. Only commit once focus
  // actually leaves the row entirely (e.g. clicking elsewhere).
  function onRowFocusOut(e) {
    if (e.relatedTarget && row.contains(e.relatedTarget)) return;
    setTimeout(commit, 100);
  }
  input.addEventListener("focusout", onRowFocusOut);
  emojiBtn.addEventListener("focusout", onRowFocusOut);
}

function confirmDeleteColumn(col) {
  const count = col.cards.length;
  const msg = count > 0
    ? `Delete "${col.title}" and its ${count} card${count === 1 ? "" : "s"}?`
    : `Delete "${col.title}"?`;
  openConfirmPopover(msg, () => {
    board.columns = board.columns.filter((c) => c.id !== col.id);
    render();
    saveBoard();
  });
}

// ----- Generic small menu -----

function openMenu(x, y, items) {
  closeMenu();
  const menu = document.createElement("div");
  menu.id = "context-menu";
  items.forEach((item) => {
    const btn = document.createElement("button");
    if (item.submenu || item.labelPicker) {
      // Hover-triggered flyout: a lightweight second-tier panel, no extra popups/clicks needed.
      btn.className = "has-submenu";
      btn.innerHTML = `<span>${item.label}</span><span class="submenu-arrow">›</span>`;
      let submenuEl = null;
      let hideTimer = null;
      // Pinned once a "keepMenuOpen" entry (e.g. a color submenu's
      // "Custom...") is clicked - a custom-color panel can open far enough
      // away that the mouse leaves both btn and submenuEl on the way there,
      // which would otherwise auto-hide the submenu out from under it.
      let pinned = false;
      const cancelHide = () => clearTimeout(hideTimer);
      const scheduleHide = () => {
        if (pinned) return;
        hideTimer = setTimeout(() => {
          if (submenuEl) { submenuEl.remove(); submenuEl = null; }
        }, 150);
      };
      const positionSubmenu = () => {
        const btnRect = btn.getBoundingClientRect();
        submenuEl.style.left = btnRect.right + 2 + "px";
        submenuEl.style.top = btnRect.top + "px";
        const subRect = submenuEl.getBoundingClientRect();
        if (subRect.right > window.innerWidth) submenuEl.style.left = btnRect.left - subRect.width - 2 + "px";
        if (subRect.bottom > window.innerHeight) submenuEl.style.top = window.innerHeight - subRect.height - 10 + "px";
      };
      const showSubmenu = () => {
        cancelHide();
        if (submenuEl) return;
        submenuEl = document.createElement("div");
        submenuEl.id = "context-submenu";
        if (item.submenu) {
          item.submenu.forEach((sub) => {
            const sbtn = document.createElement("button");
            if (sub.swatch) {
              sbtn.innerHTML = `<span class="submenu-swatch${sub.customSwatch ? " submenu-swatch-custom" : ""}" style="background:${sub.swatch}"></span><span>${escapeHtml(sub.label)}</span>`;
            } else {
              sbtn.textContent = sub.label;
            }
            sbtn.addEventListener("click", (e) => {
              e.stopPropagation();
              const rect = sbtn.getBoundingClientRect();
              if (sub.keepMenuOpen) { pinned = true; cancelHide(); } else { closeMenu(); }
              sub.onClick(rect);
            });
            submenuEl.appendChild(sbtn);
          });
        } else {
          const { columnId, cardId, onChange } = item.labelPicker;
          const card = findCard(cardId, columnId);
          if (!card) { submenuEl = null; return; }
          if (!card.labelIds) card.labelIds = [];
          submenuEl.classList.add("context-submenu-labels");
          submenuEl.innerHTML = buildLabelPickerHtml(card);
          document.body.appendChild(submenuEl);
          wireLabelPickerPanel(submenuEl, card, onChange);
          positionSubmenu();
          submenuEl.addEventListener("mouseenter", cancelHide);
          submenuEl.addEventListener("mouseleave", scheduleHide);
          return;
        }
        document.body.appendChild(submenuEl);
        positionSubmenu();
        submenuEl.addEventListener("mouseenter", cancelHide);
        submenuEl.addEventListener("mouseleave", scheduleHide);
      };
      btn.addEventListener("mouseenter", showSubmenu);
      btn.addEventListener("mouseleave", scheduleHide);
    } else {
      btn.textContent = item.label;
      btn.addEventListener("click", () => { closeMenu(); item.onClick(); });
    }
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  menu.style.left = x + "px";
  menu.style.top = y + "px";
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = window.innerWidth - rect.width - 10 + "px";
  if (rect.bottom > window.innerHeight) menu.style.top = window.innerHeight - rect.height - 10 + "px";
  setTimeout(() => document.addEventListener("click", closeMenu), 0);
}
function closeMenu() {
  const m = document.getElementById("context-menu");
  if (m) m.remove();
  const sm = document.getElementById("context-submenu");
  if (sm) sm.remove();
  document.removeEventListener("click", closeMenu);
}

// ----- Card color (right-click > Color) -----

function buildColorSubmenu(columnId, cardId) {
  const card = findCard(cardId, columnId);
  const entries = LABEL_COLORS.map((color, i) => ({
    label: LABEL_COLOR_NAMES[i] || "",
    swatch: mutedCardColor(color),
    onClick: () => setCardColor(columnId, cardId, color),
  }));
  entries.push({
    label: "Custom...",
    swatch: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
    customSwatch: true,
    keepMenuOpen: true,
    onClick: (rect) => openCustomColorPanel({
      anchorRect: rect,
      preferSide: "right",
      initialColor: (card && card.color) || "#ffffff",
      onConfirm: (color) => setCardColor(columnId, cardId, color),
    }),
  });
  entries.push({ label: "No Color", onClick: () => setCardColor(columnId, cardId, null) });
  return entries;
}

// A self-contained saturation/value square + hue slider + hex field, used
// anywhere a "Custom..." color option is offered. Built from scratch rather
// than a native <input type="color"> popup: that popup doesn't reliably
// open inside the real Tauri/WebView2 window (confirmed by the user - only
// the blank swatch showed up, no picker), so this never depends on it.
// The color only ever gets applied when Confirm is pressed, never live
// while dragging. preferSide picks which side of the anchor the panel
// opens toward, then both axes get clamped to stay on-screen.
function openCustomColorPanel({ anchorRect, initialColor, onConfirm, preferSide = "below" }) {
  closeCustomColorPanel();
  let { h, s, v } = hexToHsv(initialColor || "#ffffff");

  const panel = document.createElement("div");
  panel.id = "custom-color-panel";
  panel.innerHTML = `
    <div id="ccp-sv-square"><div id="ccp-sv-thumb"></div></div>
    <div id="ccp-hue-slider"><div id="ccp-hue-thumb"></div></div>
    <div id="ccp-bottom-row">
      <span id="ccp-preview"></span>
      <input type="text" id="ccp-hex-input" maxlength="7" />
      <button type="button" id="custom-color-panel-confirm">Confirm</button>
    </div>
  `;
  // Panel-internal clicks must never bubble to document - the context
  // menu's own outside-click listener (still registered from when the
  // menu first opened, since keepMenuOpen kept it alive) is a blind
  // "any click closes everything" handler with no contains-check, and
  // would otherwise close the still-open Color submenu the instant the
  // SV square or hue slider was clicked.
  panel.addEventListener("click", (e) => e.stopPropagation());
  document.body.appendChild(panel);

  const svSquare = panel.querySelector("#ccp-sv-square");
  const svThumb = panel.querySelector("#ccp-sv-thumb");
  const hueSlider = panel.querySelector("#ccp-hue-slider");
  const hueThumb = panel.querySelector("#ccp-hue-thumb");
  const preview = panel.querySelector("#ccp-preview");
  const hexInput = panel.querySelector("#ccp-hex-input");

  const currentHex = () => hsvToHex(h, s, v);
  function updateUI() {
    svSquare.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
    svThumb.style.left = `${s}%`;
    svThumb.style.top = `${100 - v}%`;
    hueThumb.style.left = `${(h / 360) * 100}%`;
    preview.style.background = currentHex();
    if (document.activeElement !== hexInput) hexInput.value = currentHex();
  }
  updateUI();

  function setFromSvEvent(e) {
    const rect = svSquare.getBoundingClientRect();
    s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100;
    v = (1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))) * 100;
    updateUI();
  }
  function setFromHueEvent(e) {
    const rect = hueSlider.getBoundingClientRect();
    h = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 360;
    updateUI();
  }
  let draggingSv = false, draggingHue = false;
  svSquare.addEventListener("mousedown", (e) => { draggingSv = true; setFromSvEvent(e); });
  hueSlider.addEventListener("mousedown", (e) => { draggingHue = true; setFromHueEvent(e); });
  const onMouseMove = (e) => {
    if (draggingSv) setFromSvEvent(e);
    if (draggingHue) setFromHueEvent(e);
  };
  const onMouseUp = () => { draggingSv = false; draggingHue = false; };
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  hexInput.addEventListener("input", () => {
    const val = hexInput.value.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{6}$/.test(val)) ({ h, s, v } = hexToHsv(`#${val}`));
    updateUI();
  });

  panel.querySelector("#custom-color-panel-confirm").addEventListener("click", () => {
    onConfirm(currentHex());
    closeCustomColorPanel();
    closeMenu();
  });

  const panelRect = panel.getBoundingClientRect();
  let left, top;
  if (preferSide === "right") {
    left = anchorRect.right + 6;
    top = anchorRect.top;
    if (left + panelRect.width > window.innerWidth) left = anchorRect.left - panelRect.width - 6;
  } else {
    left = anchorRect.left;
    top = anchorRect.bottom + 6;
    if (top + panelRect.height > window.innerHeight) top = anchorRect.top - panelRect.height - 6;
  }
  left = Math.max(10, Math.min(left, window.innerWidth - panelRect.width - 10));
  top = Math.max(10, Math.min(top, window.innerHeight - panelRect.height - 10));
  panel.style.left = left + "px";
  panel.style.top = top + "px";

  panel._cleanup = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };
  const outsideClickHandler = (e) => { if (!panel.contains(e.target)) closeCustomColorPanel(); };
  panel._outsideHandler = outsideClickHandler;
  setTimeout(() => document.addEventListener("click", outsideClickHandler), 0);
}
function closeCustomColorPanel() {
  const p = document.getElementById("custom-color-panel");
  if (!p) return;
  if (p._cleanup) p._cleanup();
  if (p._outsideHandler) document.removeEventListener("click", p._outsideHandler);
  p.remove();
}

function setCardColor(columnId, cardId, color) {
  const card = findCard(cardId, columnId);
  if (!card) return;
  card.color = color;
  patchCard(columnId, cardId);
  saveBoard();
}

// ----- Inline "Add Card" -----

function createInlineAddInput(columnId) {
  const container = document.getElementById(`cards-${columnId}`);
  if (!container) return;
  const wrapper = document.createElement("div");
  wrapper.className = "card inline-add-card";
  const row = document.createElement("div");
  row.className = "inline-add-row";
  activeInlineAdd = { status: columnId, wrapperEl: wrapper, inputEl: null, emoji: null };
  const input = document.createElement("textarea");
  input.className = "inline-add-input";
  input.placeholder = "Enter a title...";
  input.rows = 1;
  // Appended after the input (not before) so Tab from the input lands on
  // it in natural DOM order; CSS `order: -1` puts it back on the left visually.
  const emojiBtn = createEmojiSlotButton(
    () => activeInlineAdd && activeInlineAdd.emoji,
    (emoji) => { if (activeInlineAdd) activeInlineAdd.emoji = emoji; }
  );
  row.appendChild(input);
  row.appendChild(emojiBtn);
  wrapper.appendChild(row);
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "inline-add-confirm-btn";
  confirmBtn.textContent = "Confirm";
  wrapper.appendChild(confirmBtn);
  container.appendChild(wrapper);
  activeInlineAdd.inputEl = input;
  input.focus();

  confirmBtn.addEventListener("click", () => commitInlineAdd(false));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitInlineAdd(true); }
    else if (e.key === "Escape") cancelInlineAdd();
  });
  // Tab moves focus from the input to the emoji button right next to it -
  // that should just move focus there, nothing else. Only commit once focus
  // actually leaves the row entirely (e.g. clicking elsewhere).
  function onRowFocusOut(e) {
    if (e.relatedTarget && row.contains(e.relatedTarget)) return;
    setTimeout(() => {
      if (activeInlineAdd && activeInlineAdd.inputEl === input) commitInlineAdd(false);
    }, 100);
  }
  input.addEventListener("focusout", onRowFocusOut);
  emojiBtn.addEventListener("focusout", onRowFocusOut);
}

function openInlineAdd(columnId) {
  if (activeInlineAdd) {
    if (activeInlineAdd.status === columnId) { activeInlineAdd.inputEl.focus(); return; }
    commitInlineAdd(false);
  }
  createInlineAddInput(columnId);
}

function commitInlineAdd(reopen) {
  if (!activeInlineAdd) return;
  const { status: columnId, inputEl, emoji } = activeInlineAdd;
  const typedTitle = inputEl.value.trim();
  activeInlineAdd = null;
  if (!typedTitle && !emoji) { render(); return; }
  const col = getColumn(columnId);
  if (col) {
    col.cards.push({ id: crypto.randomUUID(), title: typedTitle, description: "", checklist: [], dueDate: null, hasDueTime: false, labelIds: [], color: null, completed: false, comments: [], emoji: emoji || null });
  }
  render();
  saveBoard();
  if (reopen) createInlineAddInput(columnId);
}

function cancelInlineAdd() {
  if (!activeInlineAdd) return;
  activeInlineAdd = null;
  render();
}

// ----- Card detail modal -----

function renderDetailCompleteBtn(card) {
  if (card.completed) {
    detailCompleteBtn.className = "is-completed";
    detailCompleteBtn.innerHTML = `<span class="label-default">Completed${card.dueDate ? " " + formatDueDate(card.dueDate, card.hasDueTime) : ""}</span><span class="label-hover">Mark as Uncomplete</span>`;
  } else {
    detailCompleteBtn.className = "";
    detailCompleteBtn.textContent = "Mark as Complete";
  }
}

function openDetailModal(columnId, card) {
  editingCard = { status: columnId, id: card.id };
  detailTitle.value = card.title;
  detailDescription.innerHTML = card.description || "";
  rteFontSizeIndex = RTE_FONT_SIZE_NORMAL_INDEX;
  updateRteFontSizeButtons();
  editingChecklist = (card.checklist || []).map((i) => ({ ...i }));
  editingComments = (card.comments || []).map((c) => ({ ...c }));
  renderChecklist();
  renderComments();
  renderDetailLabelsPills();
  renderDetailCompleteBtn(card);
  detailEmojiBtn.refresh();

  if (card.dueDate) {
    detailDueDate.value = card.dueDate.slice(0, 10);
    if (card.hasDueTime) {
      detailDueTimeToggle.checked = true;
      detailDueTime.value = card.dueDate.slice(11, 16);
    } else {
      detailDueTimeToggle.checked = false;
      detailDueTime.value = "";
    }
  } else {
    detailDueDate.value = "";
    detailDueTimeToggle.checked = false;
    detailDueTime.value = "";
  }
  updateDetailDueTimeVisibility();

  detailOverlay.classList.remove("hidden");
  // scrollHeight only reads correctly once the overlay is actually laid
  // out (display != none) - measuring it any earlier (e.g. right after
  // setting innerHTML, while still .hidden) always yields the collapsed
  // base height, which is why long descriptions didn't expand the box
  // until something (any edit) re-triggered this after the modal was visible.
  autoGrowDescription();
}

function commitDetailFieldsToCard() {
  if (!editingCard) return null;
  const card = findCard(editingCard.id, editingCard.status);
  if (!card) return null;
  card.title = detailTitle.value.trim() || card.title;
  card.description = isDescriptionEmpty(detailDescription.innerHTML) ? "" : detailDescription.innerHTML;
  card.checklist = editingChecklist;
  card.comments = editingComments;
  if (detailDueDate.value) {
    if (detailDueTimeToggle.checked && detailDueTime.value) {
      card.dueDate = `${detailDueDate.value}T${detailDueTime.value}`;
      card.hasDueTime = true;
    } else {
      card.dueDate = detailDueDate.value;
      card.hasDueTime = false;
    }
  } else {
    card.dueDate = null;
    card.hasDueTime = false;
  }
  return card;
}

function saveAndCloseDetail() {
  const card = commitDetailFieldsToCard();
  if (card) {
    render();
    saveBoard();
  }
  detailOverlay.classList.add("hidden");
  editingCard = null;
}

detailDueTimeToggle.addEventListener("change", () => {
  updateDetailDueTimeVisibility();
  // Checking "Set Time" is the moment editing starts - jump straight into
  // the field so the native time picker (and the Confirm button) are both
  // up immediately, instead of requiring a second click just to begin.
  if (detailDueTimeToggle.checked) detailDueTime.focus();
});
detailDueDate.addEventListener("change", updateDetailDueTimeVisibility);
detailDueClearBtn.addEventListener("click", () => {
  detailDueDate.value = "";
  detailDueTimeToggle.checked = false;
  detailDueTime.value = "";
  updateDetailDueTimeVisibility();
});
// The time value itself is already live-bound (no separate "commit" step
// the way the color pickers have) - the Confirm button is only ever an
// explicit "I'm done" option while the field is actively focused (i.e.
// while its native time picker is up), so it tracks focus/blur rather than
// staying visible for the whole time "Set Time" is checked.
detailDueTime.addEventListener("focus", () => detailDueTimeConfirmBtn.classList.remove("hidden"));
detailDueTime.addEventListener("blur", () => detailDueTimeConfirmBtn.classList.add("hidden"));
detailDueTimeConfirmBtn.addEventListener("click", () => detailDueTime.blur());
[detailDueDate, detailDueTime].forEach((inp) => {
  inp.addEventListener("click", () => {
    if (inp.showPicker) { try { inp.showPicker(); } catch (e) {} }
  });
});

detailCompleteBtn.addEventListener("click", () => {
  if (!editingCard) return;
  toggleCardComplete(editingCard.status, editingCard.id);
  const card = findCard(editingCard.id, editingCard.status);
  if (card) renderDetailCompleteBtn(card);
});

// Emoji selector to the left of the card title input. getEmoji/setEmoji read
// the live `editingCard` binding (not a snapshot), so this single button
// stays correct across every card the detail modal is opened for.
const detailEmojiBtn = createEmojiSlotButton(
  () => {
    const card = editingCard && findCard(editingCard.id, editingCard.status);
    return card ? card.emoji : null;
  },
  (emoji) => {
    if (!editingCard) return;
    const card = findCard(editingCard.id, editingCard.status);
    if (!card) return;
    card.emoji = emoji;
    patchCard(editingCard.status, editingCard.id);
    saveBoard();
  }
);
detailEmojiBtn.id = "detail-emoji-btn";
document.getElementById("detail-header-row").prepend(detailEmojiBtn);

// ----- Labels on the open card detail view -----

function renderDetailLabelsPills() {
  if (!editingCard) return;
  const card = findCard(editingCard.id, editingCard.status);
  if (!card) return;
  const container = document.getElementById("detail-labels-pills");
  container.innerHTML = (card.labelIds || [])
    .map((id) => getLabel(id))
    .filter(Boolean)
    .map((l) => `<span class="label-pill" style="background:${l.color};color:${contrastTextColor(l.color)}">${l.emoji ? emojiHtml(l.emoji) + " " : ""}${escapeHtml(l.name)}<button class="label-pill-remove" data-id="${l.id}">×</button></span>`)
    .join("");
  container.querySelectorAll(".label-pill-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      card.labelIds = (card.labelIds || []).filter((id) => id !== btn.dataset.id);
      renderDetailLabelsPills();
      saveBoard();
    });
  });
}

document.getElementById("detail-labels-btn").addEventListener("click", (e) => {
  if (!editingCard) return;
  const existing = document.getElementById("label-picker-popover");
  if (existing) { closeLabelPicker(); return; }
  const rect = e.currentTarget.getBoundingClientRect();
  openLabelPicker(editingCard.status, editingCard.id, rect.left, rect.bottom + 6, () => renderDetailLabelsPills());
});

function renderChecklist() {
  checklistItemsEl.innerHTML = "";
  editingChecklist.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "checklist-item";
    row.innerHTML = `
      <span class="checklist-drag-handle" title="Drag to reorder">⠿</span>
      <input type="checkbox" ${item.done ? "checked" : ""} data-idx="${idx}" class="checklist-check" />
      <span class="${item.done ? "checklist-done" : ""}">${escapeHtml(item.text)}</span>
      <button class="checklist-remove" data-idx="${idx}">×</button>
    `;
    checklistItemsEl.appendChild(row);
    row.querySelector(".checklist-drag-handle").addEventListener("mousedown", (e) => onChecklistItemMouseDown(e, idx, row));
  });
  checklistItemsEl.querySelectorAll(".checklist-check").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      editingChecklist[+e.target.dataset.idx].done = e.target.checked;
      renderChecklist();
    });
  });
  checklistItemsEl.querySelectorAll(".checklist-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      editingChecklist.splice(+e.target.dataset.idx, 1);
      renderChecklist();
    });
  });
}

// ----- Checklist item drag-and-drop (within the open card detail view) -----

let checklistDragState = null;

function onChecklistItemMouseDown(e, idx, rowEl) {
  if (e.button !== 0) return;
  checklistDragState = { fromIdx: idx, startX: e.clientX, startY: e.clientY, dragging: false, ghostEl: null, indicatorEl: null, dropIndex: null, rowEl };
  document.addEventListener("mousemove", onChecklistItemDocMouseMove);
  document.addEventListener("mouseup", onChecklistItemDocMouseUp);
}

function onChecklistItemDocMouseMove(e) {
  if (!checklistDragState) return;
  const dx = e.clientX - checklistDragState.startX;
  const dy = e.clientY - checklistDragState.startY;
  if (!checklistDragState.dragging && Math.hypot(dx, dy) > 6) { checklistDragState.dragging = true; startChecklistItemGhost(e); }
  if (checklistDragState.dragging) { moveChecklistItemGhost(e); updateChecklistItemDropTarget(e); }
}

function startChecklistItemGhost(e) {
  const original = checklistDragState.rowEl;
  const rect = original.getBoundingClientRect();
  const ghost = original.cloneNode(true);
  ghost.classList.add("checklist-item-ghost");
  ghost.style.width = rect.width + "px";
  document.body.appendChild(ghost);
  checklistDragState.ghostEl = ghost;
  checklistDragState.offsetX = checklistDragState.startX - rect.left;
  checklistDragState.offsetY = checklistDragState.startY - rect.top;
  original.classList.add("checklist-item-dragging-source");
  moveChecklistItemGhost(e);
}
function moveChecklistItemGhost(e) {
  const ghost = checklistDragState.ghostEl;
  ghost.style.left = e.clientX - checklistDragState.offsetX + "px";
  ghost.style.top = e.clientY - checklistDragState.offsetY + "px";
}

function updateChecklistItemDropTarget(e) {
  const rowEls = Array.from(checklistItemsEl.querySelectorAll(".checklist-item:not(.checklist-item-dragging-source)"));
  let index = rowEls.length;
  for (let i = 0; i < rowEls.length; i++) {
    const rect = rowEls[i].getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) { index = i; break; }
  }
  checklistDragState.dropIndex = index;

  if (!checklistDragState.indicatorEl) {
    const ind = document.createElement("div");
    ind.className = "checklist-item-drop-indicator";
    checklistDragState.indicatorEl = ind;
  }
  if (index >= rowEls.length) checklistItemsEl.appendChild(checklistDragState.indicatorEl);
  else checklistItemsEl.insertBefore(checklistDragState.indicatorEl, rowEls[index]);
}

function onChecklistItemDocMouseUp(e) {
  if (!checklistDragState) return;
  document.removeEventListener("mousemove", onChecklistItemDocMouseMove);
  document.removeEventListener("mouseup", onChecklistItemDocMouseUp);
  if (checklistDragState.indicatorEl) checklistDragState.indicatorEl.remove();

  if (checklistDragState.dragging) {
    if (checklistDragState.ghostEl) checklistDragState.ghostEl.remove();
    const [item] = editingChecklist.splice(checklistDragState.fromIdx, 1);
    const insertIdx = Math.max(0, Math.min(checklistDragState.dropIndex, editingChecklist.length));
    editingChecklist.splice(insertIdx, 0, item);
    renderChecklist();
  }
  checklistDragState = null;
}

function addChecklistItem() {
  const text = checklistInput.value.trim();
  if (!text) return;
  editingChecklist.push({ id: crypto.randomUUID(), text, done: false });
  checklistInput.value = "";
  renderChecklist();
}
document.getElementById("checklist-add-btn").addEventListener("click", addChecklistItem);
checklistInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addChecklistItem(); });

// ----- Comments on the open card detail view -----

function renderComments() {
  commentsListEl.innerHTML = "";
  editingComments.forEach((comment, idx) => {
    const item = document.createElement("div");
    item.className = "comment-item";
    item.innerHTML = `
      <div class="comment-header">
        <div class="comment-actions">
          <button class="comment-edit" data-idx="${idx}" title="Edit comment">✎</button>
          <button class="comment-delete" data-idx="${idx}" title="Delete comment">×</button>
        </div>
        <span class="comment-timestamp">${formatCommentTimestamp(comment.createdAt)}</span>
      </div>
      <div class="comment-text">${escapeHtml(comment.text)}</div>
    `;
    commentsListEl.appendChild(item);
  });
  commentsListEl.querySelectorAll(".comment-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      editingComments.splice(+e.target.dataset.idx, 1);
      renderComments();
    });
  });
  commentsListEl.querySelectorAll(".comment-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => startEditComment(+e.target.dataset.idx));
  });
}

function startEditComment(idx) {
  const item = commentsListEl.children[idx];
  const comment = editingComments[idx];
  if (!item || !comment) return;
  const textEl = item.querySelector(".comment-text");
  const textarea = document.createElement("textarea");
  textarea.className = "comment-edit-input";
  textarea.value = comment.text;
  textEl.replaceWith(textarea);
  textarea.focus();
  textarea.select();
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    const val = textarea.value.trim();
    if (val) comment.text = val;
    renderComments();
  }
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
    if (e.key === "Escape") { done = true; renderComments(); }
  });
  textarea.addEventListener("blur", commit);
}

function addComment() {
  const text = commentInput.value.trim();
  if (!text) return;
  editingComments.push({ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() });
  commentInput.value = "";
  renderComments();
}
document.getElementById("comment-add-btn").addEventListener("click", addComment);
commentInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addComment(); });

document.getElementById("detail-close").addEventListener("click", saveAndCloseDetail);
// A plain `click` check on the overlay isn't enough - dragging a text
// selection in the description box and releasing the mouse outside the
// modal still fires a `click` targeted at the overlay (selection drags are
// exempt from the usual "click needs matching mousedown+mouseup target"
// rule), which closed the card mid-selection. Only close when the
// mousedown that started this click ALSO began on the overlay itself.
let detailOverlayMousedownOnSelf = false;
detailOverlay.addEventListener("mousedown", (e) => { detailOverlayMousedownOnSelf = e.target === detailOverlay; });
detailOverlay.addEventListener("click", (e) => {
  if (e.target === detailOverlay && detailOverlayMousedownOnSelf) saveAndCloseDetail();
});
detailModal.addEventListener("click", (e) => e.stopPropagation());

document.getElementById("detail-delete").addEventListener("click", () => {
  if (!editingCard) return;
  const card = findCard(editingCard.id, editingCard.status);
  openConfirmPopover(`Delete "${card ? card.title : "this card"}"?`, () => {
    deleteCard(editingCard.status, editingCard.id);
    detailOverlay.classList.add("hidden");
    editingCard = null;
  });
});

document.getElementById("detail-archive").addEventListener("click", () => {
  if (!editingCard) return;
  commitDetailFieldsToCard();
  archiveCard(editingCard.status, editingCard.id);
  detailOverlay.classList.add("hidden");
  editingCard = null;
});

// ----- Due date popover (right-click quick-set) -----

function openDueDatePopover(columnId, cardId, x, y) {
  closeDueDatePopover();
  const card = findCard(cardId, columnId);
  if (!card) return;

  const panel = document.createElement("div");
  panel.id = "due-date-popover";
  panel.innerHTML = `
    <input type="date" id="popover-date" value="${card.dueDate ? card.dueDate.slice(0, 10) : ""}" />
    <label class="time-toggle">
      <input type="checkbox" id="popover-time-toggle" ${card.hasDueTime ? "checked" : ""} /> Set time
    </label>
    <input type="time" id="popover-time" class="${card.hasDueTime ? "" : "hidden"}" value="${card.hasDueTime && card.dueDate ? card.dueDate.slice(11, 16) : ""}" />
    <div class="popover-buttons">
      <button id="popover-clear">Clear</button>
      <button id="popover-close">Done</button>
    </div>
  `;
  document.body.appendChild(panel);
  panel.style.left = x + "px";
  panel.style.top = y + "px";
  const rect = panel.getBoundingClientRect();
  if (rect.right > window.innerWidth) panel.style.left = window.innerWidth - rect.width - 10 + "px";
  if (rect.bottom > window.innerHeight) panel.style.top = window.innerHeight - rect.height - 10 + "px";

  const dateInput = panel.querySelector("#popover-date");
  const timeToggle = panel.querySelector("#popover-time-toggle");
  const timeInput = panel.querySelector("#popover-time");

  [dateInput, timeInput].forEach((inp) => {
    inp.addEventListener("click", () => {
      if (inp.showPicker) { try { inp.showPicker(); } catch (e) {} }
    });
  });

  function commitChange() {
    const dateVal = dateInput.value;
    if (!dateVal) {
      card.dueDate = null;
      card.hasDueTime = false;
    } else if (timeToggle.checked && timeInput.value) {
      card.dueDate = `${dateVal}T${timeInput.value}`;
      card.hasDueTime = true;
    } else {
      card.dueDate = dateVal;
      card.hasDueTime = false;
    }
    render();
    saveBoard();
  }

  dateInput.addEventListener("change", commitChange);
  timeInput.addEventListener("change", commitChange);
  timeToggle.addEventListener("change", () => {
    timeInput.classList.toggle("hidden", !timeToggle.checked);
    commitChange();
  });
  panel.querySelector("#popover-clear").addEventListener("click", () => {
    dateInput.value = "";
    timeToggle.checked = false;
    timeInput.classList.add("hidden");
    timeInput.value = "";
    commitChange();
    closeDueDatePopover();
  });
  panel.querySelector("#popover-close").addEventListener("click", closeDueDatePopover);

  setTimeout(() => document.addEventListener("click", onDocClickCloseDuePopover), 0);
}
function onDocClickCloseDuePopover(e) {
  const panel = document.getElementById("due-date-popover");
  if (panel && !panel.contains(e.target)) closeDueDatePopover();
}
function closeDueDatePopover() {
  const panel = document.getElementById("due-date-popover");
  if (panel) panel.remove();
  document.removeEventListener("click", onDocClickCloseDuePopover);
}

// ----- Emoji picker (shared by add-row slots and title-emoji edit buttons) -----

function openEmojiPicker(x, y, currentEmoji, onSelect, onClear, options = {}) {
  closeEmojiPicker();
  // Random each time the picker opens (not just on first-ever load) - purely
  // for variety, per explicit request, rather than always landing on the
  // same first category.
  let activeTabIndex = Math.floor(Math.random() * EMOJI_CATEGORIES.length);

  const panel = document.createElement("div");
  panel.id = "emoji-picker-popover";
  // Prevents any click inside the picker (a tab, an emoji, clear) from
  // shifting focus away from whatever input opened it, which would
  // otherwise fire that input's blur-to-commit/cancel handler mid-pick.
  panel.addEventListener("mousedown", (e) => e.preventDefault());

  function renderPanel() {
    const cat = EMOJI_CATEGORIES[activeTabIndex];
    // Rebuilding the tabs bar's innerHTML on every tab click would otherwise
    // reset its scroll position to 0 - carry it over across re-renders.
    const prevTabsEl = panel.querySelector(".emoji-picker-tabs");
    const prevScrollLeft = prevTabsEl ? prevTabsEl.scrollLeft : 0;
    panel.innerHTML = `
      <div class="emoji-picker-tabs">
        ${EMOJI_CATEGORIES.map((c, i) => `<button class="emoji-picker-tab ${i === activeTabIndex ? "active" : ""}" data-idx="${i}" title="${escapeHtml(c.id)}">${emojiHtml(c.icon)}</button>`).join("")}
      </div>
      <div class="emoji-picker-grid">
        ${cat.emojis.map((e) => `<button class="emoji-picker-item" data-emoji="${e}">${emojiHtml(e)}</button>`).join("")}
      </div>
      ${onClear ? `<button class="emoji-picker-clear">✕ Remove Emoji</button>` : ""}
    `;
    const tabsEl = panel.querySelector(".emoji-picker-tabs");
    tabsEl.scrollLeft = prevScrollLeft;
    // Vertical mouse-wheel scroll over the tabs bar scrolls it horizontally.
    tabsEl.addEventListener("wheel", (e) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      tabsEl.scrollLeft += e.deltaY;
    }, { passive: false });
    panel.querySelectorAll(".emoji-picker-tab").forEach((btn) => {
      btn.addEventListener("click", () => { activeTabIndex = +btn.dataset.idx; renderPanel(); });
    });
    panel.querySelectorAll(".emoji-picker-item").forEach((btn) => {
      // keepOpen: multi-insert use (the description RTE toolbar) - stays
      // open after each pick so several emoji can be dropped in a row
      // without re-opening the panel each time. Every other caller (card/
      // column/board emoji slots, title-emoji edit) is a single "this IS
      // the emoji now" pick, so those still close immediately, matching
      // their existing one-shot feel.
      btn.addEventListener("click", () => {
        onSelect(btn.dataset.emoji);
        if (!options.keepOpen) closeEmojiPicker();
      });
    });
    if (onClear) {
      panel.querySelector(".emoji-picker-clear").addEventListener("click", () => { closeEmojiPicker(); onClear(); });
    }
  }
  renderPanel();

  document.body.appendChild(panel);
  panel.style.left = x + "px";
  panel.style.top = y + "px";
  const rect = panel.getBoundingClientRect();
  if (rect.right > window.innerWidth) panel.style.left = window.innerWidth - rect.width - 10 + "px";
  if (rect.bottom > window.innerHeight) panel.style.top = window.innerHeight - rect.height - 10 + "px";

  setTimeout(() => document.addEventListener("click", onDocClickCloseEmojiPicker, true), 0);
}
function onDocClickCloseEmojiPicker(e) {
  const panel = document.getElementById("emoji-picker-popover");
  if (!panel || panel.contains(e.target)) return;
  closeEmojiPicker();
}
function closeEmojiPicker() {
  const panel = document.getElementById("emoji-picker-popover");
  if (panel) panel.remove();
  document.removeEventListener("click", onDocClickCloseEmojiPicker, true);
}

// Blank rounded-square button used in "add card"/"add column" rows, before
// any emoji has been chosen yet. Shows the faded placeholder glyph until an
// emoji is picked, then swaps to displaying that emoji at full opacity.
function createEmojiSlotButton(getEmoji, setEmoji) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "emoji-slot-btn";
  // See the picker's own mousedown guard above - same reasoning here: don't
  // let clicking this button blur the title input next to it.
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  // Picked once per button instance so it doesn't re-randomize (and flicker)
  // on every refresh() call - just varies from one empty slot to the next.
  const placeholder = randomPlaceholderEmoji();
  function refresh() {
    const emoji = getEmoji();
    btn.innerHTML = emojiHtml(emoji || placeholder);
    btn.classList.toggle("is-placeholder", !emoji);
  }
  refresh();
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = btn.getBoundingClientRect();
    openEmojiPicker(rect.left, rect.bottom + 6, getEmoji(),
      (emoji) => { setEmoji(emoji); refresh(); },
      () => { setEmoji(null); refresh(); }
    );
  });
  btn.refresh = refresh;
  return btn;
}

// Emoji shown ahead of an already-set card/column title, with a hover
// affordance (faded outline + pencil) to reopen the picker and change it.
function titleEmojiHtml(emoji) {
  if (!emoji) return "";
  return `<span class="title-emoji"><span class="title-emoji-glyph">${emojiHtml(emoji)}</span><span class="title-emoji-edit-overlay">✎</span></span>`;
}

function wireTitleEmoji(containerEl, getEmoji, setEmoji) {
  const emojiEl = containerEl.querySelector(".title-emoji");
  if (!emojiEl) return;
  emojiEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = emojiEl.getBoundingClientRect();
    openEmojiPicker(rect.left, rect.bottom + 6, getEmoji(), setEmoji, () => setEmoji(null));
  });
}

// ----- Label picker (shared between the standalone popover and the context-menu flyout) -----

function buildLabelPickerHtml(card) {
  if (!board.labels.length) {
    return `<div class="label-picker-empty">No labels yet.</div><button class="label-picker-manage-btn" data-action="manage">Manage Labels</button>`;
  }
  return (
    board.labels
      .map(
        (l) => `
      <label class="label-picker-row">
        <input type="checkbox" data-id="${l.id}" ${card.labelIds.includes(l.id) ? "checked" : ""} />
        <span class="label-swatch-static" style="background:${l.color}"></span>
        <span class="label-picker-name">${l.emoji ? emojiHtml(l.emoji) + " " : ""}${escapeHtml(l.name)}</span>
      </label>
    `
      )
      .join("") + `<button class="label-picker-manage-btn" data-action="manage">Manage Labels</button>`
  );
}

function wireLabelPickerPanel(panel, card, onChange) {
  // Prevents clicks inside the panel (a checkbox, a label row) from bubbling
  // up to the generic "any click closes this menu" listeners that
  // openMenu/openLabelPicker register on document.
  panel.addEventListener("click", (e) => e.stopPropagation());
  panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = cb.dataset.id;
      if (cb.checked) {
        if (!card.labelIds.includes(id)) card.labelIds.push(id);
      } else {
        card.labelIds = card.labelIds.filter((x) => x !== id);
      }
      saveBoard();
      if (onChange) onChange();
    });
  });
  const manageBtn = panel.querySelector('[data-action="manage"]');
  if (manageBtn) {
    manageBtn.addEventListener("click", () => {
      closeLabelPicker();
      closeMenu();
      openLabelsPanel();
    });
  }
}

// ----- Label picker popover (standalone, opened from the card detail view) -----

function openLabelPicker(columnId, cardId, x, y, onChange) {
  closeLabelPicker();
  const card = findCard(cardId, columnId);
  if (!card) return;
  if (!card.labelIds) card.labelIds = [];

  const panel = document.createElement("div");
  panel.id = "label-picker-popover";
  panel.innerHTML = buildLabelPickerHtml(card) + `<button class="label-picker-manage-btn" data-action="close">Close</button>`;

  document.body.appendChild(panel);
  panel.style.left = x + "px";
  panel.style.top = y + "px";
  const rect = panel.getBoundingClientRect();
  if (rect.right > window.innerWidth) panel.style.left = window.innerWidth - rect.width - 10 + "px";
  if (rect.bottom > window.innerHeight) panel.style.top = window.innerHeight - rect.height - 10 + "px";

  wireLabelPickerPanel(panel, card, onChange);
  panel.querySelector('[data-action="close"]').addEventListener("click", () => closeLabelPicker());

  // Capture phase: the detail modal stops click bubbling on its own content
  // (so clicks inside it don't fall through to the overlay's close-card
  // handler), which would otherwise stop this popover from ever seeing
  // clicks made elsewhere inside the modal. Capturing on the way down
  // sidesteps that entirely.
  setTimeout(() => document.addEventListener("click", onDocClickCloseLabelPicker, true), 0);
}
function onDocClickCloseLabelPicker(e) {
  const panel = document.getElementById("label-picker-popover");
  if (!panel || panel.contains(e.target)) return;
  if (e.target.closest && e.target.closest("#detail-labels-btn")) return;
  closeLabelPicker();
}
function closeLabelPicker() {
  const panel = document.getElementById("label-picker-popover");
  if (panel) panel.remove();
  document.removeEventListener("click", onDocClickCloseLabelPicker, true);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeMenu(); closeDueDatePopover(); closeLabelPicker(); }
});

// ----- Calendar view -----

function getAllCardsWithDueDates() {
  const items = [];
  board.columns.forEach((col) => {
    col.cards.forEach((card) => { if (card.dueDate) items.push({ card, columnTitle: col.title }); });
  });
  return items;
}

// Card due dates plus the board's own due date (if set) - kept separate
// from getAllCardsWithDueDates() above, which the Upcoming Tasks sidebar
// also uses and which should stay card-only there (a board due date isn't
// really a "task"). Calendar-only, so it gets its own function instead.
function getCalendarDueDateItems() {
  const items = getAllCardsWithDueDates().map(({ card, columnTitle }) => ({ type: "card", dueDate: card.dueDate, card, columnTitle }));
  if (board.dueDate) items.push({ type: "board", dueDate: board.dueDate });
  return items;
}

function openCalendarView() {
  calendarViewDate = new Date();
  renderCalendarView();
  document.getElementById("calendar-overlay").classList.remove("hidden");
}
function closeCalendarView() {
  document.getElementById("calendar-overlay").classList.add("hidden");
}

function renderCalendarView() {
  const container = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("calendar-month-label");
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  monthLabel.textContent = calendarViewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = {};
  getCalendarDueDateItems().forEach((item) => {
    const dateKey = item.dueDate.slice(0, 10);
    (byDate[dateKey] = byDate[dateKey] || []).push(item);
  });

  container.innerHTML = "";
  ["S", "M", "T", "W", "T", "F", "S"].forEach((l) => {
    const cell = document.createElement("div");
    cell.className = "calendar-dow";
    cell.textContent = l;
    container.appendChild(cell);
  });
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-cell calendar-cell-empty";
    container.appendChild(empty);
  }

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (dateKey === todayKey) cell.classList.add("calendar-today");
    const dayItems = byDate[dateKey] || [];
    cell.innerHTML = `<div class="calendar-day-num">${d}</div>` +
      (dayItems.length
        ? `<div class="calendar-dot-row">${dayItems
            .slice(0, 4)
            .map((item) => `<span class="calendar-dot${item.type === "board" ? " calendar-dot-board" : ""}"></span>`)
            .join("")}</div>`
        : "");
    if (dayItems.length) {
      cell.classList.add("calendar-has-items");
      cell.addEventListener("click", () => showCalendarDayTasks(dateKey, dayItems));
    }
    container.appendChild(cell);
  }
}

function showCalendarDayTasks(dateKey, items) {
  const list = document.getElementById("calendar-day-list");
  const label = document.getElementById("calendar-day-label");
  label.textContent = new Date(dateKey + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  list.innerHTML = items.map((item) => {
    if (item.type === "board") {
      return `
        <div class="calendar-day-item calendar-day-item-board">
          <div class="calendar-day-item-title">${board.emoji ? emojiHtml(board.emoji) + " " : ""}${escapeHtml(board.name)}</div>
          <div class="calendar-day-item-col">📅 Board due date</div>
        </div>
      `;
    }
    return `
      <div class="calendar-day-item">
        <div class="calendar-day-item-title">${escapeHtml(item.card.title)}</div>
        <div class="calendar-day-item-col">${escapeHtml(item.columnTitle)}</div>
      </div>
    `;
  }).join("") || `<div class="calendar-day-empty">No tasks</div>`;
}

document.getElementById("btn-calendar").addEventListener("click", openCalendarView);
document.getElementById("calendar-close").addEventListener("click", closeCalendarView);
document.getElementById("calendar-overlay").addEventListener("click", (e) => {
  if (e.target.id === "calendar-overlay") closeCalendarView();
});
document.getElementById("calendar-prev").addEventListener("click", () => {
  calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
  renderCalendarView();
});
document.getElementById("calendar-next").addEventListener("click", () => {
  calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
  renderCalendarView();
});

// ----- Labels management panel -----

function openLabelsPanel() {
  renderLabelsList();
  renderColorSwatches();
  renderLabelTemplates();
  document.getElementById("labels-overlay").classList.remove("hidden");
  closeLabelTemplatesPanel();
}
function closeLabelsPanel() {
  document.getElementById("labels-overlay").classList.add("hidden");
}

// ----- Label templates tab/panel positioning -----
// The tab and pull-out panel are `position: fixed` siblings of #labels-modal
// (not nested inside it - that modal has overflow-y:auto, which browsers
// treat as implying overflow-x:auto too, so anything positioned to spill
// outside it would just get clipped). Their coordinates are computed from
// the modal's own live rect so the modal itself stays exactly where the
// overlay's normal centering puts it.
function positionLabelTemplatesUI() {
  const modal = document.getElementById("labels-modal");
  const tab = document.getElementById("label-templates-tab");
  const panel = document.getElementById("label-templates-panel");
  if (!modal || !tab || !panel || document.getElementById("labels-overlay").classList.contains("hidden")) return;
  const rect = modal.getBoundingClientRect();
  // Tab sits right at the modal's top-right corner; the panel opens from
  // that same corner. Its own height is capped by CSS (not tied to the
  // modal's height - coupling the two made the panel render squished).
  tab.style.left = rect.right + "px";
  tab.style.top = rect.top + "px";
  const tabRect = tab.getBoundingClientRect();
  if (tabRect.right > window.innerWidth) tab.style.left = window.innerWidth - tabRect.width - 6 + "px";

  panel.style.left = rect.right + 10 + "px";
  panel.style.top = rect.top + "px";
  // Same overflow-safety pattern used by every other popover in this app
  // (emoji picker, due-date popover, context menu): if the ideal position
  // would run off the window, pull it back in so it stays fully visible.
  const panelRect = panel.getBoundingClientRect();
  if (panelRect.right > window.innerWidth) panel.style.left = window.innerWidth - panelRect.width - 10 + "px";
  if (panelRect.bottom > window.innerHeight) panel.style.top = window.innerHeight - panelRect.height - 10 + "px";
}
function openLabelTemplatesPanel() {
  document.getElementById("label-templates-tab").classList.add("hidden");
  document.getElementById("label-templates-panel").classList.remove("hidden");
  positionLabelTemplatesUI();
}
function closeLabelTemplatesPanel() {
  document.getElementById("label-templates-panel").classList.add("hidden");
  document.getElementById("label-templates-tab").classList.remove("hidden");
  positionLabelTemplatesUI();
}
document.getElementById("label-templates-tab").addEventListener("click", openLabelTemplatesPanel);
document.getElementById("label-templates-collapse").addEventListener("click", closeLabelTemplatesPanel);
window.addEventListener("resize", positionLabelTemplatesUI);
function renderColorSwatches() {
  const wrap = document.getElementById("label-color-swatches");
  wrap.innerHTML = "";
  LABEL_COLORS.forEach((color) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "label-swatch" + (color === selectedLabelColor ? " label-swatch-selected" : "");
    sw.style.background = color;
    sw.addEventListener("click", () => { selectedLabelColor = color; renderColorSwatches(); });
    wrap.appendChild(sw);
  });
  const isCustomSelected = !LABEL_COLORS.includes(selectedLabelColor);
  const customBtn = document.createElement("button");
  customBtn.type = "button";
  customBtn.className = "label-swatch label-swatch-custom" + (isCustomSelected ? " label-swatch-selected" : "");
  customBtn.title = "Custom color";
  // Once a custom color is actually picked, show it directly on the swatch
  // (overriding the rainbow gradient) - otherwise there's no way to see
  // what got chosen once the picker panel closes.
  if (isCustomSelected) customBtn.style.background = selectedLabelColor;
  customBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openCustomColorPanel({
      anchorRect: customBtn.getBoundingClientRect(),
      preferSide: "below",
      initialColor: isCustomSelected ? selectedLabelColor : "#ffffff",
      onConfirm: (color) => { selectedLabelColor = color; renderColorSwatches(); },
    });
  });
  wrap.appendChild(customBtn);
}
function renderLabelsList() {
  const list = document.getElementById("labels-list");
  list.innerHTML = "";
  if (!board.labels.length) {
    list.innerHTML = `<div class="labels-empty">No labels yet.</div>`;
    positionLabelTemplatesUI();
    return;
  }
  board.labels.forEach((label) => {
    const row = document.createElement("div");
    row.className = "label-row";
    row.innerHTML = `
      <span class="label-swatch-static" style="background:${label.color}"></span>
      <span class="label-name" data-id="${label.id}">${label.emoji ? emojiHtml(label.emoji) + " " : ""}${escapeHtml(label.name)}</span>
      <button class="label-delete" data-id="${label.id}">×</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll(".label-name").forEach((nameEl) => {
    nameEl.addEventListener("click", () => startEditLabelName(nameEl));
  });
  list.querySelectorAll(".label-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      board.labels = board.labels.filter((l) => l.id !== id);
      board.columns.forEach((col) => col.cards.forEach((c) => {
        if (c.labelIds) c.labelIds = c.labelIds.filter((lid) => lid !== id);
      }));
      renderLabelsList();
      saveBoard();
      render();
    });
  });
  positionLabelTemplatesUI();
}

function startEditLabelName(nameEl) {
  const label = board.labels.find((l) => l.id === nameEl.dataset.id);
  if (!label) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "label-name-edit-input";
  input.value = label.name;
  nameEl.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    const val = input.value.trim();
    if (val) label.name = val;
    renderLabelsList();
    saveBoard();
    render();
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { done = true; renderLabelsList(); }
  });
  input.addEventListener("blur", commit);
}

// ----- Label templates (quick-add pool, shown beside the Labels screen) -----

function addLabelFromTemplate(tpl) {
  board.labels.push({ id: crypto.randomUUID(), name: tpl.name, color: tpl.color, emoji: tpl.emoji });
}

function renderLabelTemplates() {
  const list = document.getElementById("label-templates-list");
  list.innerHTML = LABEL_TEMPLATES.map((cat) => {
    const expanded = expandedTemplateCategories.has(cat.id);
    const itemsHtml = cat.labels
      .map(
        (tpl, idx) => `
      <div class="template-item-row">
        <span class="template-item-swatch" style="background:${tpl.color}"></span>
        <span class="template-item-name">${emojiHtml(tpl.emoji)} ${escapeHtml(tpl.name)}</span>
        <button class="template-item-add" data-cat="${cat.id}" data-idx="${idx}">add</button>
      </div>
    `
      )
      .join("");
    return `
      <div class="template-category">
        <div class="template-category-header">
          <button class="template-category-toggle" data-cat="${cat.id}">
            <span class="template-category-arrow">${expanded ? "▾" : "▸"}</span> ${escapeHtml(cat.name)}
          </button>
          <button class="template-category-addall" data-cat="${cat.id}">+ add all</button>
        </div>
        <div class="template-category-items ${expanded ? "" : "hidden"}">${itemsHtml}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".template-category-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const catId = btn.dataset.cat;
      if (expandedTemplateCategories.has(catId)) expandedTemplateCategories.delete(catId);
      else expandedTemplateCategories.add(catId);
      renderLabelTemplates();
    });
  });
  list.querySelectorAll(".template-category-addall").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = LABEL_TEMPLATES.find((c) => c.id === btn.dataset.cat);
      if (!cat) return;
      cat.labels.forEach((tpl) => addLabelFromTemplate(tpl));
      renderLabelsList();
      saveBoard();
    });
  });
  list.querySelectorAll(".template-item-add").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = LABEL_TEMPLATES.find((c) => c.id === btn.dataset.cat);
      const tpl = cat && cat.labels[+btn.dataset.idx];
      if (!tpl) return;
      addLabelFromTemplate(tpl);
      renderLabelsList();
      saveBoard();
    });
  });
}

// Appended after the input (not before) so Tab from the input lands on it
// in natural DOM order; CSS `order: -1` puts it back on the left visually.
const labelEmojiBtn = createEmojiSlotButton(() => selectedLabelEmoji, (emoji) => { selectedLabelEmoji = emoji; });
document.getElementById("label-name-row").appendChild(labelEmojiBtn);
document.getElementById("label-add-btn").addEventListener("click", () => {
  const input = document.getElementById("label-name-input");
  const typedName = input.value.trim();
  if (!typedName && !selectedLabelEmoji) return;
  const name = typedName || selectedLabelEmoji;
  const emoji = typedName ? (selectedLabelEmoji || null) : null;
  board.labels.push({ id: crypto.randomUUID(), name, color: selectedLabelColor, emoji });
  input.value = "";
  renderLabelsList();
  saveBoard();
});
document.getElementById("label-name-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("label-add-btn").click();
});
document.getElementById("btn-labels").addEventListener("click", openLabelsPanel);
document.getElementById("labels-close").addEventListener("click", closeLabelsPanel);
document.getElementById("labels-overlay").addEventListener("click", (e) => {
  if (e.target.id === "labels-overlay") closeLabelsPanel();
});

// ----- Upcoming tasks sidebar -----

function toggleUpcomingSidebar() {
  const el = document.getElementById("upcoming-sidebar");
  const willOpen = el.classList.contains("hidden");
  if (willOpen) { renderUpcomingSidebar(); el.classList.remove("hidden"); }
  else { el.classList.add("hidden"); }
}
function renderUpcomingSidebar() {
  const list = document.getElementById("upcoming-list");
  const items = getAllCardsWithDueDates();
  items.sort((a, b) => new Date(a.card.dueDate) - new Date(b.card.dueDate));
  if (!items.length) {
    list.innerHTML = `<div class="upcoming-empty">No upcoming due dates.</div>`;
    return;
  }
  list.innerHTML = items.map(({ card, columnTitle }) => `
    <div class="upcoming-item">
      <div class="upcoming-item-title">${escapeHtml(card.title)}</div>
      <div class="upcoming-item-meta">
        <span class="due-badge ${dueDateColorClass(card.dueDate, card.hasDueTime)}">${formatDueDate(card.dueDate, card.hasDueTime)}</span>
        <span>${escapeHtml(columnTitle)}</span>
      </div>
    </div>
  `).join("");
}
document.getElementById("btn-sidebar").addEventListener("click", toggleUpcomingSidebar);
document.getElementById("upcoming-close").addEventListener("click", toggleUpcomingSidebar);

// ----- Card drag-and-drop -----

function onCardMouseDown(e, columnId, card, cardEl) {
  if (e.button !== 0) return;
  if (e.target.closest(".delete-btn")) return;
  if (e.target.closest(".title-emoji")) return;
  // Only the checkbox itself opts out of drag/open - this used to bail on
  // the whole .card-checklist-preview area (back when it was pure display
  // text, before it had real checkboxes), which had the side effect of
  // also blocking a plain click on the checklist ITEM TEXT from opening
  // the card, same as clicking any other inert part of the card does.
  if (e.target.closest(".card-checklist-preview-check")) return;
  dragState = { id: card.id, fromStatus: columnId, startX: e.clientX, startY: e.clientY, dragging: false, ghostEl: null, indicatorEl: null, dropTarget: null, cardEl };
  document.addEventListener("mousemove", onDocMouseMove);
  document.addEventListener("mouseup", onDocMouseUp);
}

function onDocMouseMove(e) {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (!dragState.dragging && Math.hypot(dx, dy) > 6) { dragState.dragging = true; startGhost(e); }
  if (dragState.dragging) { moveGhost(e); updateDropTarget(e); }
}

function startGhost(e) {
  const original = dragState.cardEl;
  const rect = original.getBoundingClientRect();
  const ghost = original.cloneNode(true);
  ghost.classList.add("card-ghost");
  ghost.style.width = rect.width + "px";
  document.body.appendChild(ghost);
  dragState.ghostEl = ghost;
  dragState.offsetX = dragState.startX - rect.left;
  dragState.offsetY = dragState.startY - rect.top;
  original.classList.add("card-dragging-source");
  moveGhost(e);
}
function moveGhost(e) {
  const ghost = dragState.ghostEl;
  ghost.style.left = e.clientX - dragState.offsetX + "px";
  ghost.style.top = e.clientY - dragState.offsetY + "px";
}

function computeDropTarget(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const col = el && el.closest(".column");
  if (!col) return null;
  const columnId = col.dataset.columnId;
  const container = document.getElementById(`cards-${columnId}`);
  if (!container) return null;
  const cardEls = Array.from(container.querySelectorAll(".card:not(.card-dragging-source):not(.inline-add-card)"));
  let index = cardEls.length;
  for (let i = 0; i < cardEls.length; i++) {
    const rect = cardEls[i].getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) { index = i; break; }
  }
  return { status: columnId, index };
}

function updateDropTarget(e) {
  document.querySelectorAll(".column").forEach((c) => c.classList.remove("drag-over"));
  const target = computeDropTarget(e);
  dragState.dropTarget = target;
  if (!target) { if (dragState.indicatorEl) dragState.indicatorEl.remove(); return; }

  const col = document.querySelector(`.column[data-column-id="${target.status}"]`);
  if (col) col.classList.add("drag-over");

  const container = document.getElementById(`cards-${target.status}`);
  const cardEls = Array.from(container.querySelectorAll(".card:not(.card-dragging-source):not(.inline-add-card)"));

  if (!dragState.indicatorEl) {
    const ind = document.createElement("div");
    ind.className = "drop-indicator";
    dragState.indicatorEl = ind;
  }
  if (target.index >= cardEls.length) container.appendChild(dragState.indicatorEl);
  else container.insertBefore(dragState.indicatorEl, cardEls[target.index]);
}

function onDocMouseUp(e) {
  if (!dragState) return;
  document.removeEventListener("mousemove", onDocMouseMove);
  document.removeEventListener("mouseup", onDocMouseUp);
  if (dragState.indicatorEl) dragState.indicatorEl.remove();
  document.querySelectorAll(".column").forEach((c) => c.classList.remove("drag-over"));

  if (dragState.dragging) {
    if (dragState.ghostEl) dragState.ghostEl.remove();
    dragState.cardEl.classList.remove("card-dragging-source");
    const target = dragState.dropTarget;
    if (target) {
      const fromCol = getColumn(dragState.fromStatus);
      const idx1 = fromCol ? fromCol.cards.findIndex((c) => c.id === dragState.id) : -1;
      if (idx1 !== -1) {
        const [card] = fromCol.cards.splice(idx1, 1);
        const toCol = getColumn(target.status);
        const insertIndex = Math.max(0, Math.min(target.index, toCol.cards.length));
        toCol.cards.splice(insertIndex, 0, card);
        const container = document.getElementById(`cards-${target.status}`);
        dragState.cardEl.remove();
        const cardEls = Array.from(container.querySelectorAll(".card:not(.inline-add-card)"));
        if (insertIndex >= cardEls.length) container.appendChild(dragState.cardEl);
        else container.insertBefore(dragState.cardEl, cardEls[insertIndex]);
        updateCompletionButton();
        saveBoard();
      }
    }
  } else {
    const card = findCard(dragState.id, dragState.fromStatus);
    if (card) openDetailModal(dragState.fromStatus, card);
  }
  dragState = null;
}

// ----- Column drag-and-drop -----

function onColumnMouseDown(e, col, colEl) {
  if (e.button !== 0) return;
  columnDragState = { id: col.id, startX: e.clientX, startY: e.clientY, dragging: false, ghostEl: null, indicatorEl: null, dropIndex: null, colEl };
  document.addEventListener("mousemove", onColumnDocMouseMove);
  document.addEventListener("mouseup", onColumnDocMouseUp);
}

function onColumnDocMouseMove(e) {
  if (!columnDragState) return;
  const dx = e.clientX - columnDragState.startX;
  const dy = e.clientY - columnDragState.startY;
  if (!columnDragState.dragging && Math.hypot(dx, dy) > 6) { columnDragState.dragging = true; startColumnGhost(e); }
  if (columnDragState.dragging) { moveColumnGhost(e); updateColumnDropTarget(e); }
}

function startColumnGhost(e) {
  const original = columnDragState.colEl;
  const rect = original.getBoundingClientRect();
  const ghost = original.cloneNode(true);
  ghost.classList.add("column-ghost");
  ghost.style.width = rect.width + "px";
  ghost.style.height = rect.height + "px";
  document.body.appendChild(ghost);
  columnDragState.ghostEl = ghost;
  columnDragState.offsetX = columnDragState.startX - rect.left;
  columnDragState.offsetY = columnDragState.startY - rect.top;
  original.classList.add("column-dragging-source");
  moveColumnGhost(e);
}
function moveColumnGhost(e) {
  const ghost = columnDragState.ghostEl;
  ghost.style.left = e.clientX - columnDragState.offsetX + "px";
  ghost.style.top = e.clientY - columnDragState.offsetY + "px";
}

function updateColumnDropTarget(e) {
  const colEls = Array.from(boardEl.querySelectorAll(".column:not(.column-dragging-source)"));
  let index = colEls.length;
  for (let i = 0; i < colEls.length; i++) {
    const rect = colEls[i].getBoundingClientRect();
    if (e.clientX < rect.left + rect.width / 2) { index = i; break; }
  }
  columnDragState.dropIndex = index;

  if (!columnDragState.indicatorEl) {
    const ind = document.createElement("div");
    ind.className = "column-drop-indicator";
    columnDragState.indicatorEl = ind;
  }
  const addColBtn = document.getElementById("add-column-btn");
  if (index >= colEls.length) boardEl.insertBefore(columnDragState.indicatorEl, addColBtn || null);
  else boardEl.insertBefore(columnDragState.indicatorEl, colEls[index]);
}

function onColumnDocMouseUp(e) {
  if (!columnDragState) return;
  document.removeEventListener("mousemove", onColumnDocMouseMove);
  document.removeEventListener("mouseup", onColumnDocMouseUp);
  if (columnDragState.indicatorEl) columnDragState.indicatorEl.remove();

  if (columnDragState.dragging) {
    if (columnDragState.ghostEl) columnDragState.ghostEl.remove();
    columnDragState.colEl.classList.remove("column-dragging-source");
    const fromIdx = board.columns.findIndex((c) => c.id === columnDragState.id);
    if (fromIdx !== -1 && columnDragState.dropIndex !== null) {
      const [col] = board.columns.splice(fromIdx, 1);
      const insertIdx = Math.max(0, Math.min(columnDragState.dropIndex, board.columns.length));
      board.columns.splice(insertIdx, 0, col);
      render();
      saveBoard();
    }
  }
  columnDragState = null;
}

// ----- Sidebar board drag-and-drop -----

let boardDragState = null;

function onBoardItemMouseDown(e, b, itemEl) {
  if (e.button !== 0) return;
  boardDragState = { id: b.id, startX: e.clientX, startY: e.clientY, dragging: false, ghostEl: null, indicatorEl: null, dropIndex: null, itemEl };
  document.addEventListener("mousemove", onBoardItemDocMouseMove);
  document.addEventListener("mouseup", onBoardItemDocMouseUp);
}

function onBoardItemDocMouseMove(e) {
  if (!boardDragState) return;
  const dx = e.clientX - boardDragState.startX;
  const dy = e.clientY - boardDragState.startY;
  if (!boardDragState.dragging && Math.hypot(dx, dy) > 6) { boardDragState.dragging = true; startBoardItemGhost(e); }
  if (boardDragState.dragging) { moveBoardItemGhost(e); updateBoardItemDropTarget(e); }
}

function startBoardItemGhost(e) {
  const original = boardDragState.itemEl;
  const rect = original.getBoundingClientRect();
  const ghost = original.cloneNode(true);
  ghost.classList.add("board-item-ghost");
  ghost.style.width = rect.width + "px";
  document.body.appendChild(ghost);
  boardDragState.ghostEl = ghost;
  boardDragState.offsetX = boardDragState.startX - rect.left;
  boardDragState.offsetY = boardDragState.startY - rect.top;
  original.classList.add("board-item-dragging-source");
  moveBoardItemGhost(e);
}
function moveBoardItemGhost(e) {
  const ghost = boardDragState.ghostEl;
  ghost.style.left = e.clientX - boardDragState.offsetX + "px";
  ghost.style.top = e.clientY - boardDragState.offsetY + "px";
}

function updateBoardItemDropTarget(e) {
  const list = document.getElementById("boards-list");
  const itemEls = Array.from(list.querySelectorAll(".board-item:not(.board-item-dragging-source)"));
  let index = itemEls.length;
  for (let i = 0; i < itemEls.length; i++) {
    const rect = itemEls[i].getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) { index = i; break; }
  }
  boardDragState.dropIndex = index;

  if (!boardDragState.indicatorEl) {
    const ind = document.createElement("div");
    ind.className = "board-item-drop-indicator";
    boardDragState.indicatorEl = ind;
  }
  if (index >= itemEls.length) list.appendChild(boardDragState.indicatorEl);
  else list.insertBefore(boardDragState.indicatorEl, itemEls[index]);
}

function onBoardItemDocMouseUp(e) {
  if (!boardDragState) return;
  document.removeEventListener("mousemove", onBoardItemDocMouseMove);
  document.removeEventListener("mouseup", onBoardItemDocMouseUp);
  if (boardDragState.indicatorEl) boardDragState.indicatorEl.remove();

  if (boardDragState.dragging) {
    if (boardDragState.ghostEl) boardDragState.ghostEl.remove();
    boardDragState.itemEl.classList.remove("board-item-dragging-source");
    const fromIdx = appData.boards.findIndex((b) => b.id === boardDragState.id);
    if (fromIdx !== -1 && boardDragState.dropIndex !== null) {
      const [b] = appData.boards.splice(fromIdx, 1);
      const insertIdx = Math.max(0, Math.min(boardDragState.dropIndex, appData.boards.length));
      appData.boards.splice(insertIdx, 0, b);
      renderSidebar();
      saveBoard();
    }
  } else {
    switchBoard(boardDragState.id);
  }
  boardDragState = null;
}

// ----- Pomodoro timer -----

const POMO_SOUNDS = {
  start: new Audio("/assets/sounds/pomodoro-start.wav"),
  pauseResume: new Audio("/assets/sounds/pomodoro-pause.wav"),
  breakEnd: new Audio("/assets/sounds/pomodoro-break.wav"),
  complete: new Audio("/assets/sounds/pomodoro-complete.wav"),
  reset: new Audio("/assets/sounds/pomodoro-reset.wav"),
  cowStart: new Audio("/assets/sounds/pomodoro-cow-start.mp3"),
  cowComplete: new Audio("/assets/sounds/pomodoro-cow-complete.mp3"),
};
function playPomoSound(key) {
  const audio = POMO_SOUNDS[key];
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (e) {}
}

const POMO_MIN_SECONDS = 5;
const POMO_MAX_SECONDS = 90 * 60;
const POMO_DEFAULT_DURATIONS = { work: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
const POMO_RING_COLORS = { work: "#e8590c", shortBreak: "#2f9e44", longBreak: "#1971c2" };

// Timer state lives only in memory - phase/remaining time/running always
// reset to the classic 25/5/15 defaults on app launch (per design), so
// none of this (besides cowMode, mirrored into appData) is persisted.
let pomo = {
  phase: "work", // "work" | "shortBreak" | "longBreak"
  running: false,
  started: false, // whether the current phase's countdown has been started at least once (vs still at its full fresh duration)
  remainingSeconds: POMO_DEFAULT_DURATIONS.work,
  durations: { ...POMO_DEFAULT_DURATIONS },
  workSessionsCompleted: 0,
  totalSessions: 4, // work sessions per full plan - adjustable before Start, like the focus/break durations
  longBreakEvery: 4, // a long break replaces the short one every Nth session; 0 disables long breaks entirely
  cowMode: false,
  intervalId: null,
};
// True during the 10s window right after the LAST session of a full plan
// finishes (not every individual work session - those auto-continue
// straight into their break, see pomoCompletePhase), during which the
// board-corner overlay shows "Great job!" (frozen at full progress)
// instead of the countdown. Independent of pomo.started/running, which
// are already reset to false by then for the next fresh plan.
let pomoCelebrating = false;
let pomoCelebrationTimer = null;

function pomoPhaseLabel(phase) {
  if (phase === "work") return "Focus Session";
  if (phase === "shortBreak") return "Short Break";
  return "Long Break";
}
// Condensed form for the tight spaces (board-corner overlay, hover popover
// info line) - "Focus"/"Break"/"Long Break" rather than the full modal
// phase label above.
function pomoPhaseShortLabel(phase) {
  if (phase === "work") return "Focus";
  if (phase === "shortBreak") return "Break";
  return "Long Break";
}
// Inline SVG (not a text/symbol glyph) for the hover popover's Skip button -
// a single triangle + bar ("skip to the next phase"), replacing an earlier
// ⏭ character whose double-triangle shape read as "skip to the end" instead.
// Same reasoning as the board-overlay tomato: a controlled vector asset
// renders identically everywhere instead of depending on a system symbol
// font.
const POMO_SKIP_ICON_SVG = '<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-1px;"><path d="M2.5 2.2 L2.5 13.8 L11 8 Z"/><rect x="12" y="2.2" width="2" height="11.6" rx="0.5"/></svg>';
function formatPomoTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// The ring's fill is driven by a registered (animatable) CSS custom
// property so it can transition smoothly between ticks instead of jumping
// once per second - see the @property --pomo-progress rule in styles.css.
// `instant` skips that transition for non-tick updates (reset, phase
// change, opening the panel, duration edits) where a second-long sweep
// from the old value would look like a glitch rather than progress.
// Toggles a `transition: none` class off/on around a style change so it
// applies instantly instead of animating - used for both the ring
// (conic-gradient angle, via the --pomo-progress custom property) and the
// cow-mode milk fill (clip-path), for the same reason in each case: reset/
// phase-change/duration-edit/panel-open should snap, only the regular
// per-second tick should animate.
function setInstant(el, apply) {
  el.classList.add("pomo-instant");
  apply();
  void el.offsetHeight; // force layout so removing the class below doesn't retroactively animate this jump
  el.classList.remove("pomo-instant");
}

function renderPomodoro(instant) {
  const timeStr = formatPomoTime(pomo.remainingSeconds);
  document.getElementById("btn-pomodoro").textContent = `${pomo.cowMode ? "🥛" : "🍅"} ${timeStr}`;
  document.getElementById("pomodoro-phase-label").textContent = pomoPhaseLabel(pomo.phase);
  const cycleIndex = Math.min(pomo.workSessionsCompleted + 1, pomo.totalSessions);
  document.getElementById("pomodoro-session-count").textContent = `Session ${cycleIndex} of ${pomo.totalSessions}`;
  document.getElementById("pomodoro-toggle-btn").textContent = pomo.running ? "Pause" : pomo.started ? "Resume" : "Start";
  document.getElementById("pomodoro-skip-btn").disabled = !pomo.started;
  // "Default" (not "Reset to Default") - the longer label wrapped to a
  // second line in the 3-button flex row, which changed the button's (and
  // so the whole modal's) height every time it switched - jarring. Single
  // word stays on one line, same as "Reset"/"Skip"/"Start".
  document.getElementById("pomodoro-reset-btn").textContent = !pomo.started && pomoPlanIsCustom() ? "Default" : "Reset";
  document.getElementById("pomo-persist-settings-toggle").checked = !!appData.pomodoroPersistSettings;

  const planInputs = [
    [document.getElementById("pomo-short-break-input"), Math.round(pomo.durations.shortBreak / 60)],
    [document.getElementById("pomo-long-break-input"), Math.round(pomo.durations.longBreak / 60)],
    [document.getElementById("pomo-sessions-input"), pomo.totalSessions],
    [document.getElementById("pomo-long-break-every-input"), pomo.longBreakEvery],
  ];
  planInputs.forEach(([inp, val]) => {
    inp.disabled = pomo.started;
    if (document.activeElement !== inp) inp.value = String(val);
  });

  document.getElementById("pomodoro-mode-tomato").classList.toggle("pomo-mode-active", !pomo.cowMode);
  document.getElementById("pomodoro-mode-cow").classList.toggle("pomo-mode-active", pomo.cowMode);
  document.getElementById("pomo-ring-wrap").classList.toggle("hidden", pomo.cowMode);
  document.getElementById("pomo-milk-wrap").classList.toggle("hidden", !pomo.cowMode);
  document.getElementById("pomodoro-modal").classList.toggle("pomo-cow-active", pomo.cowMode);

  const minutes = Math.floor(pomo.remainingSeconds / 60);
  const seconds = pomo.remainingSeconds % 60;
  const digits = [Math.floor(minutes / 10), minutes % 10, Math.floor(seconds / 10), seconds % 10];
  document.querySelectorAll("#pomodoro-digit-row .pomo-digit-input").forEach((inp) => {
    inp.disabled = pomo.running;
    if (document.activeElement !== inp) inp.value = String(digits[+inp.dataset.idx]);
  });

  const total = pomo.durations[pomo.phase];
  const progress = total > 0 ? Math.min(100, Math.max(0, ((total - pomo.remainingSeconds) / total) * 100)) : 0;
  const ring = document.getElementById("pomo-ring");
  ring.style.setProperty("--pomo-ring-color", POMO_RING_COLORS[pomo.phase]);
  const setRing = () => ring.style.setProperty("--pomo-progress", progress);
  const milkFill = document.getElementById("pomo-milk-fill");
  const setMilk = () => { milkFill.style.clipPath = `inset(${100 - progress}% 0 0 0)`; };
  if (instant) {
    setInstant(ring, setRing);
    setInstant(milkFill, setMilk);
  } else {
    setRing();
    setMilk();
  }

  renderPomoBoardOverlay(instant);
}

// Floating bottom-right overlay on the board itself, visible whenever a
// session is active (started - covers both running and paused) or during
// the post-completion celebration window, unless the user hid it via the
// header hover popover.
function renderPomoBoardOverlay(instant) {
  const overlay = document.getElementById("pomo-board-overlay");
  const show = !appData.pomodoroOverlayHidden && (pomo.started || pomoCelebrating);
  overlay.classList.toggle("hidden", !show);
  if (!show) return;

  overlay.classList.toggle("pomo-cow-active", pomo.cowMode);
  document.getElementById("pomo-board-tomato-wrap").classList.toggle("hidden", pomo.cowMode);
  document.getElementById("pomo-board-milk-wrap").classList.toggle("hidden", !pomo.cowMode);

  document.getElementById("pomo-board-time").textContent = pomoCelebrating ? "Great job!" : formatPomoTime(pomo.remainingSeconds);
  const cycleIndex = Math.min(pomo.workSessionsCompleted + 1, pomo.totalSessions);
  document.getElementById("pomo-board-session-info").textContent = pomoCelebrating ? "" : `${pomoPhaseShortLabel(pomo.phase)} ${cycleIndex} / ${pomo.totalSessions}`;
  // Hidden (not just disabled) during the celebration window - by then
  // there's no active phase left to pause/skip, and pomoReset would just
  // be resetting an already-fresh idle plan.
  document.getElementById("pomo-board-controls").classList.toggle("hidden", pomoCelebrating);
  const boardToggleBtn = document.getElementById("pomo-board-toggle-btn");
  boardToggleBtn.innerHTML = pomo.running ? "⏸" : "▶";
  boardToggleBtn.title = pomo.running ? "Pause" : "Resume";

  const total = pomo.durations[pomo.phase];
  const progress = pomoCelebrating ? 100 : total > 0 ? Math.min(100, Math.max(0, ((total - pomo.remainingSeconds) / total) * 100)) : 0;
  const ring = document.getElementById("pomo-board-ring");
  ring.style.setProperty("--pomo-board-ring-color", POMO_RING_COLORS[pomo.phase]);
  const setRing = () => ring.style.setProperty("--pomo-board-progress", progress);
  const milkFill = document.getElementById("pomo-board-milk-fill");
  const setMilk = () => { milkFill.style.clipPath = `inset(${100 - progress}% 0 0 0)`; };
  if (instant) {
    setInstant(ring, setRing);
    setInstant(milkFill, setMilk);
  } else {
    setRing();
    setMilk();
  }
}

function pomoTick() {
  pomo.remainingSeconds -= 1;
  if (pomo.remainingSeconds <= 0) {
    pomoCompletePhase();
    return;
  }
  renderPomodoro();
}

// Phases auto-continue into each other (work -> break -> work -> ...)
// without needing Start pressed again in between - only the very end of
// the whole plan (the last of pomo.totalSessions work sessions) stops and
// celebrates. Requested after the non-auto version confused the user: it
// left them stuck manually pressing Start into a break instead of a fresh
// focus session, and Reset only cleared the current phase rather than
// letting them start the plan over.
function pomoCompletePhase() {
  clearInterval(pomo.intervalId);
  pomo.intervalId = null;
  pomo.running = false;

  if (pomo.phase === "work") {
    playPomoSound(pomo.cowMode ? "cowComplete" : "complete");
    pomo.workSessionsCompleted += 1;
    if (pomo.workSessionsCompleted >= pomo.totalSessions) {
      pomoCelebrating = true;
      clearTimeout(pomoCelebrationTimer);
      pomoCelebrationTimer = setTimeout(() => {
        pomoCelebrating = false;
        renderPomoBoardOverlay(true);
      }, 10000);
      pomo.workSessionsCompleted = 0;
      pomo.phase = "work";
      pomo.remainingSeconds = pomo.durations.work;
      pomo.started = false;
      renderPomodoro(true);
      return;
    }
    pomo.phase = pomo.longBreakEvery > 0 && pomo.workSessionsCompleted % pomo.longBreakEvery === 0 ? "longBreak" : "shortBreak";
  } else {
    playPomoSound("breakEnd");
    pomo.phase = "work";
  }
  pomo.remainingSeconds = pomo.durations[pomo.phase];
  pomo.started = true;
  pomo.running = true;
  resetPomoDigitInputPaint();
  pomo.intervalId = setInterval(pomoTick, 1000);
  renderPomodoro(true);
}

function pomoStartOrResume() {
  if (pomo.running) return;
  pomoCelebrating = false;
  clearTimeout(pomoCelebrationTimer);
  pomo.running = true;
  if (!pomo.started) {
    playPomoSound(pomo.cowMode ? "cowStart" : "start");
    pomo.started = true;
  } else {
    playPomoSound("pauseResume");
  }
  resetPomoDigitInputPaint();
  pomo.intervalId = setInterval(pomoTick, 1000);
  renderPomodoro();
}
function pomoPause() {
  if (!pomo.running) return;
  pomo.running = false;
  clearInterval(pomo.intervalId);
  pomo.intervalId = null;
  playPomoSound("pauseResume");
  renderPomodoro();
}
function pomoToggle() {
  if (pomo.running) pomoPause();
  else pomoStartOrResume();
}
// Jumps straight to whatever phase would normally come next, reusing
// pomoCompletePhase() itself (work -> break/long-break, break -> work,
// including the final-session celebration) instead of duplicating that
// transition logic - skipping is just "this phase is over now", same as
// the countdown reaching zero on its own.
function pomoSkip() {
  if (!pomo.started) return;
  pomoCompletePhase();
}
// Resets the whole plan back to a fresh Session 1, not just the current
// phase's timer - with phases now auto-continuing into each other, "just
// reset this one break" left no way to actually start over. Deliberately
// leaves pomo.durations/totalSessions/longBreakEvery untouched - while a
// session is active or paused, Reset means "start this same plan over",
// not "discard my custom figures" (see pomoResetBtnClick for the separate
// "reset the figures themselves to default" action).
function pomoReset() {
  pomo.running = false;
  pomoCelebrating = false;
  clearTimeout(pomoCelebrationTimer);
  if (pomo.intervalId) clearInterval(pomo.intervalId);
  pomo.intervalId = null;
  pomo.phase = "work";
  pomo.workSessionsCompleted = 0;
  pomo.remainingSeconds = pomo.durations.work;
  pomo.started = false;
  playPomoSound("reset");
  renderPomodoro(true);
}
// True when any plan figure (focus/short break/long break length, session
// count, or long-break cadence) has been dialed away from the classic
// defaults - drives both the Reset button's dynamic label/behavior below
// and (indirectly, via pomoQuickStart no longer overwriting these fields)
// what "quick start" resumes with.
function pomoPlanIsCustom() {
  return (
    pomo.durations.work !== POMO_DEFAULT_DURATIONS.work ||
    pomo.durations.shortBreak !== POMO_DEFAULT_DURATIONS.shortBreak ||
    pomo.durations.longBreak !== POMO_DEFAULT_DURATIONS.longBreak ||
    pomo.totalSessions !== 4 ||
    pomo.longBreakEvery !== 4
  );
}
// Only writes the current plan figures to appData (and saves) when the
// user has opted in via the "remember these settings" toggle - otherwise
// they stay purely in-memory for this run/session, same as they always
// have, so a one-off custom timer doesn't silently become permanent.
function persistPomoPlanIfEnabled() {
  if (!appData.pomodoroPersistSettings) return;
  appData.pomodoroSavedPlan = {
    durations: { ...pomo.durations },
    totalSessions: pomo.totalSessions,
    longBreakEvery: pomo.longBreakEvery,
  };
  saveBoard();
}
// The actual "reset the figures themselves" action (as opposed to
// pomoReset's "reset THIS plan's progress, keep its figures") - only ever
// reachable while idle (see pomoResetBtnClick), so there's no running
// countdown or session progress to touch here, just the dialed-in numbers.
function pomoResetPlanToDefault() {
  pomo.durations = { ...POMO_DEFAULT_DURATIONS };
  pomo.totalSessions = 4;
  pomo.longBreakEvery = 4;
  pomo.remainingSeconds = pomo.durations.work;
  persistPomoPlanIfEnabled();
  playPomoSound("reset");
  renderPomodoro(true);
}
// Single Reset button/action, two meanings depending on state - kept as
// one control (no extra UI) rather than a second button: while a session
// is active/paused, it's "start this same plan over" (pomoReset, keeps
// custom figures). While idle AND the figures are currently non-default,
// it instead becomes "put the figures back to classic defaults"
// (pomoResetPlanToDefault) - the button's label switches to match, see
// the "Reset to Default" / "Default" text in renderPomodoro().
function pomoResetBtnClick() {
  if (!pomo.started && pomoPlanIsCustom()) pomoResetPlanToDefault();
  else pomoReset();
}
function pomoSetCowMode(cowMode) {
  pomo.cowMode = cowMode;
  appData.pomodoroCowMode = cowMode;
  saveBoard();
  renderPomodoro(true);
}
function pomoToggleOverlayHidden() {
  appData.pomodoroOverlayHidden = !appData.pomodoroOverlayHidden;
  saveBoard();
  renderPomoBoardOverlay(true);
}

// "Default time settings" means the classic work length, discarding
// whatever custom duration might currently be dialed in - a fresh 25:00
// work session starts immediately, no panel needed. Used to always force
// pomo.durations/totalSessions/longBreakEvery back to POMO_DEFAULT_DURATIONS
// here - but that meant finishing a custom-length plan and wanting to
// immediately run it again ("I want to do that again") instead jarringly
// snapped back to the classic 25-minute default. Now it just resets the
// plan's PROGRESS (fresh session 1, work phase) and leaves whatever
// durations/session-count/cadence are currently dialed in untouched -
// which is the classic default when the user never changed anything, and
// their own custom figures when they did, without needing to distinguish
// the two cases explicitly here.
function pomoQuickStart() {
  pomo.phase = "work";
  pomo.workSessionsCompleted = 0;
  pomo.remainingSeconds = pomo.durations.work;
  pomo.started = false;
  renderPomodoro(true);
  pomoStartOrResume();
}

// Hovering the header timer button surfaces quick actions without opening
// the full panel: "Quick Start" when nothing's active yet, or Pause/Resume
// + Reset once a session has been started (whether running or paused).
let pomoHoverHideTimer = null;
function showPomoHoverPopover() {
  clearTimeout(pomoHoverHideTimer);
  let popover = document.getElementById("pomo-hover-popover");
  if (!popover) {
    popover = document.createElement("div");
    popover.id = "pomo-hover-popover";
    document.body.appendChild(popover);
    popover.addEventListener("mouseenter", () => clearTimeout(pomoHoverHideTimer));
    popover.addEventListener("mouseleave", schedulePomoHoverHide);
  }
  // Actions re-render this same popover in place (never close it) - closing
  // on every click was the user's actual complaint: a quick pause-then-
  // resume shouldn't require re-hovering the header button in between.
  if (pomo.started) {
    const cycleIndex = Math.min(pomo.workSessionsCompleted + 1, pomo.totalSessions);
    // pomoResetBtnClick (not pomoReset directly) - same reasoning as the
    // modal's Reset button, even though this branch only ever resolves to
    // the plain "reset progress" case (pomoPlanIsCustom's "idle" half of
    // the condition can't be true here since pomo.started is true) - one
    // shared function instead of re-deriving the same branch twice.
    popover.innerHTML = `
      <button id="pomo-hover-toggle">${pomo.running ? "⏸ Pause" : "▶ Resume"}</button>
      <button id="pomo-hover-skip">${POMO_SKIP_ICON_SVG} Skip</button>
      <button id="pomo-hover-reset">↺ Reset</button>
      <button id="pomo-hover-overlay-toggle">${appData.pomodoroOverlayHidden ? "Show Overlay" : "Hide Overlay"}</button>
      <div id="pomo-hover-info">${pomoPhaseShortLabel(pomo.phase).toLowerCase()} ${cycleIndex} / ${pomo.totalSessions}</div>
    `;
    popover.querySelector("#pomo-hover-toggle").addEventListener("click", () => { pomoToggle(); showPomoHoverPopover(); });
    popover.querySelector("#pomo-hover-skip").addEventListener("click", () => { pomoSkip(); showPomoHoverPopover(); });
    popover.querySelector("#pomo-hover-reset").addEventListener("click", () => { pomoResetBtnClick(); showPomoHoverPopover(); });
    popover.querySelector("#pomo-hover-overlay-toggle").addEventListener("click", () => { pomoToggleOverlayHidden(); showPomoHoverPopover(); });
  } else {
    // Idle: no active plan to reset progress on, so the only reset-shaped
    // action that means anything here is putting custom figures back to
    // default - shown only when they're actually non-default, same
    // condition the modal's button label switches on.
    const showResetDefault = pomoPlanIsCustom();
    popover.innerHTML = `
      <button id="pomo-hover-quickstart">▶ Quick Start</button>
      ${showResetDefault ? `<button id="pomo-hover-reset-default">↺ Default</button>` : ""}
    `;
    popover.querySelector("#pomo-hover-quickstart").addEventListener("click", () => { pomoQuickStart(); showPomoHoverPopover(); });
    if (showResetDefault) {
      popover.querySelector("#pomo-hover-reset-default").addEventListener("click", () => { pomoResetPlanToDefault(); showPomoHoverPopover(); });
    }
  }
  const rect = document.getElementById("btn-pomodoro").getBoundingClientRect();
  popover.style.left = rect.left + "px";
  popover.style.top = rect.bottom + 6 + "px";
  const popRect = popover.getBoundingClientRect();
  if (popRect.right > window.innerWidth) popover.style.left = window.innerWidth - popRect.width - 10 + "px";
}
function schedulePomoHoverHide() {
  pomoHoverHideTimer = setTimeout(hidePomoHoverPopover, 200);
}
function hidePomoHoverPopover() {
  clearTimeout(pomoHoverHideTimer);
  const popover = document.getElementById("pomo-hover-popover");
  if (popover) popover.remove();
}
document.getElementById("btn-pomodoro").addEventListener("mouseenter", showPomoHoverPopover);
document.getElementById("btn-pomodoro").addEventListener("mouseleave", schedulePomoHoverHide);

function openPomodoroPanel() {
  hidePomoHoverPopover();
  renderPomodoro(true);
  document.getElementById("pomodoro-overlay").classList.remove("hidden");
}
function closePomodoroPanel() {
  document.getElementById("pomodoro-overlay").classList.add("hidden");
}

document.getElementById("btn-pomodoro").addEventListener("click", openPomodoroPanel);
document.getElementById("pomodoro-close").addEventListener("click", closePomodoroPanel);
document.getElementById("pomodoro-overlay").addEventListener("click", (e) => {
  if (e.target.id === "pomodoro-overlay") closePomodoroPanel();
});
document.getElementById("pomodoro-toggle-btn").addEventListener("click", pomoToggle);
document.getElementById("pomodoro-skip-btn").addEventListener("click", pomoSkip);
document.getElementById("pomodoro-reset-btn").addEventListener("click", pomoResetBtnClick);
document.getElementById("pomodoro-mode-tomato").addEventListener("click", () => pomoSetCowMode(false));
document.getElementById("pomodoro-mode-cow").addEventListener("click", () => pomoSetCowMode(true));

// Board-corner overlay's own quick controls - icon-only (no room for
// labels at this size), same three actions as the header hover popover.
// Reset here always means "restart this plan" (pomoReset), never the
// modal's "put the figures back to default" variant - the overlay is only
// ever visible while a session is active/paused (or celebrating, when
// this row is hidden entirely), so the idle-only "Default" case this
// button switches to elsewhere can't actually apply here.
document.getElementById("pomo-board-skip-btn").innerHTML = POMO_SKIP_ICON_SVG;
document.getElementById("pomo-board-toggle-btn").addEventListener("click", (e) => { e.stopPropagation(); pomoToggle(); });
document.getElementById("pomo-board-skip-btn").addEventListener("click", (e) => { e.stopPropagation(); pomoSkip(); });
document.getElementById("pomo-board-reset-btn").addEventListener("click", (e) => { e.stopPropagation(); pomoReset(); });

// Four single-digit inputs (M-tens, M-ones, S-tens, S-ones), auth-code/PIN
// style: typing a digit auto-advances to the next field, Backspace on an
// empty field goes back a field, and the combined value only commits (and
// clamps to [POMO_MIN_SECONDS, POMO_MAX_SECONDS]) once focus leaves the
// whole row - editing mid-row is never fought with a live clamp (typing
// "0","0","3" toward 00:30 would otherwise get shoved up to the minimum
// after the 2nd keystroke, before the 3rd ever lands).
const pomoDigitRow = document.getElementById("pomodoro-digit-row");
const pomoDigitInputs = Array.from(pomoDigitRow.querySelectorAll(".pomo-digit-input"));
const POMO_DIGIT_PLACE = [600, 60, 10, 1]; // seconds contributed by a +1 on each field: 10min, 1min, 10sec, 1sec

// Whichever digit field was focused/selected right before Start/Resume
// visibly kept its blue selection highlight in this webview even after
// being blurred and disabled - confirmed the underlying state (.disabled,
// .selectionStart/End) was already correct, so it's a stale-paint issue,
// not a logic one. Toggling styles or forcing reflow (display:none +
// offsetHeight) didn't clear it either; only fully replacing the DOM node
// did, tested live before landing on this. Only needed on the transition
// into running (that's the only moment a stuck-selected input can exist),
// so this runs once per Start/Resume rather than every render.
function resetPomoDigitInputPaint() {
  pomoDigitInputs.forEach((inp, i) => {
    const clone = inp.cloneNode(true);
    inp.replaceWith(clone);
    pomoDigitInputs[i] = clone;
  });
}

function commitPomoDigits() {
  if (pomo.running) return;
  const digits = pomoDigitInputs.map((inp) => parseInt(inp.value, 10) || 0);
  const total = (digits[0] * 10 + digits[1]) * 60 + (digits[2] * 10 + digits[3]);
  const next = Math.max(POMO_MIN_SECONDS, Math.min(POMO_MAX_SECONDS, total));
  pomo.durations[pomo.phase] = next;
  pomo.remainingSeconds = next;
  persistPomoPlanIfEnabled();
  renderPomodoro(true);
}
function pomoAdjustBySeconds(delta) {
  if (pomo.running) return;
  const next = Math.max(POMO_MIN_SECONDS, Math.min(POMO_MAX_SECONDS, pomo.durations[pomo.phase] + delta));
  pomo.durations[pomo.phase] = next;
  pomo.remainingSeconds = next;
  persistPomoPlanIfEnabled();
  renderPomodoro(true);
}
pomoDigitRow.addEventListener("input", (e) => {
  const inp = e.target;
  if (!inp.classList.contains("pomo-digit-input")) return;
  inp.value = inp.value.replace(/[^0-9]/g, "").slice(-1);
  if (inp.value) {
    const next = pomoDigitInputs[+inp.dataset.idx + 1];
    if (next) { next.focus(); next.select(); }
  }
});
pomoDigitRow.addEventListener("keydown", (e) => {
  const inp = e.target;
  if (!inp.classList.contains("pomo-digit-input")) return;
  if (e.key === "Backspace" && !inp.value) {
    const prev = pomoDigitInputs[+inp.dataset.idx - 1];
    if (prev) {
      e.preventDefault(); // otherwise this same keypress's default action also deletes the field we just focused
      prev.focus();
      prev.select();
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    inp.blur(); // commits synchronously (focusout fires within this call)
    pomoStartOrResume();
  }
});
// Scroll over a digit to bump it by its place value (10min/1min/10sec/1sec)
// without needing to click in and type - same underlying adjustment the
// old arrow buttons made, just reached a different way.
pomoDigitRow.addEventListener("wheel", (e) => {
  const inp = e.target.closest(".pomo-digit-input");
  if (!inp || pomo.running) return;
  e.preventDefault();
  pomoAdjustBySeconds(e.deltaY < 0 ? POMO_DIGIT_PLACE[+inp.dataset.idx] : -POMO_DIGIT_PLACE[+inp.dataset.idx]);
}, { passive: false });
pomoDigitRow.addEventListener("click", (e) => {
  if (e.target.classList.contains("pomo-digit-input")) e.target.select();
});
pomoDigitRow.addEventListener("focusin", (e) => {
  if (e.target.classList.contains("pomo-digit-input")) e.target.select();
});
pomoDigitRow.addEventListener("focusout", (e) => {
  if (e.relatedTarget && pomoDigitRow.contains(e.relatedTarget)) return;
  commitPomoDigits();
});

// ----- Pomodoro plan settings (break lengths, session count, cadence) -----

// Single-number fields (not multi-digit OTP style like the focus timer -
// these are naturally 1-2 digits already). Locked once the plan has been
// started (not just while running), since changing e.g. session count
// mid-plan would be ambiguous about what it means for the count already
// in progress.
function wirePlanNumberInput(inputEl, getValue, setValue, min, max) {
  inputEl.addEventListener("focusin", () => inputEl.select());
  inputEl.addEventListener("click", () => inputEl.select());
  inputEl.addEventListener("input", () => {
    inputEl.value = inputEl.value.replace(/[^0-9]/g, "").slice(0, 3);
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); inputEl.blur(); }
  });
  inputEl.addEventListener("blur", () => {
    let val = parseInt(inputEl.value, 10);
    if (isNaN(val)) val = getValue();
    val = Math.max(min, Math.min(max, val));
    setValue(val);
    persistPomoPlanIfEnabled();
    renderPomodoro(true);
  });
}

const pomoShortBreakInput = document.getElementById("pomo-short-break-input");
const pomoLongBreakInput = document.getElementById("pomo-long-break-input");
const pomoSessionsInput = document.getElementById("pomo-sessions-input");
const pomoLongBreakEveryInput = document.getElementById("pomo-long-break-every-input");

wirePlanNumberInput(
  pomoShortBreakInput,
  () => Math.round(pomo.durations.shortBreak / 60),
  (v) => {
    pomo.durations.shortBreak = v * 60;
    if (pomo.phase === "shortBreak" && !pomo.started) pomo.remainingSeconds = pomo.durations.shortBreak;
  },
  1, 90
);
wirePlanNumberInput(
  pomoLongBreakInput,
  () => Math.round(pomo.durations.longBreak / 60),
  (v) => {
    pomo.durations.longBreak = v * 60;
    if (pomo.phase === "longBreak" && !pomo.started) pomo.remainingSeconds = pomo.durations.longBreak;
  },
  1, 180
);
wirePlanNumberInput(
  pomoSessionsInput,
  () => pomo.totalSessions,
  (v) => { pomo.totalSessions = v; },
  1, 20
);
wirePlanNumberInput(
  pomoLongBreakEveryInput,
  () => pomo.longBreakEvery,
  (v) => { pomo.longBreakEvery = v; },
  0, 20
);

// Opt-in only (see persistPomoPlanIfEnabled) - most people probably don't
// want a one-off custom timer to silently outlive this session, so plan
// figures stay in-memory-only unless this is explicitly checked. Turning
// it on immediately captures whatever's currently dialed in; turning it
// off clears the saved figures too, rather than leaving a stale custom
// plan sitting in the save file no longer reachable from the UI.
const pomoPersistSettingsToggle = document.getElementById("pomo-persist-settings-toggle");
pomoPersistSettingsToggle.addEventListener("change", () => {
  appData.pomodoroPersistSettings = pomoPersistSettingsToggle.checked;
  if (appData.pomodoroPersistSettings) {
    persistPomoPlanIfEnabled();
  } else {
    appData.pomodoroSavedPlan = null;
    saveBoard();
  }
});

// ----- Auto-hiding horizontal scrollbar -----

let boardScrollbarHideTimer = null;
function revealBoardScrollbar() {
  boardEl.classList.remove("scrollbar-hidden");
  clearTimeout(boardScrollbarHideTimer);
  boardScrollbarHideTimer = setTimeout(() => {
    boardEl.classList.add("scrollbar-hidden");
  }, 4000);
}
boardEl.addEventListener("scroll", revealBoardScrollbar);
boardEl.addEventListener("mousemove", (e) => {
  const rect = boardEl.getBoundingClientRect();
  if (rect.bottom - e.clientY <= 24) revealBoardScrollbar();
});
revealBoardScrollbar();

resetAddBoardArea();
loadAppData();