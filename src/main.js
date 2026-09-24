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
  { id: "animals", icon: "🐻", emojis: ["🐮", "🐷", "🐽", "🐁", "🐰", "🦀", "🐚", "🐌", "🕊️", "🦉", "🐻", "🐶", "🐕", "🦊", "🦥", "🐍", "🌱", "🌻", "🪻", "🌿", "🍂", "🔥", "❄️", "☃️", "🌊", "☔", "🪐", "⭐", "🌠", "🌈"] },
  { id: "food", icon: "🌭", emojis: ["🍇", "🍓", "🌽", "🧇", "🧀", "🥩", "🍔", "🍟", "🌭", "🥪", "🍳", "🍿", "🍙", "🍡", "🥡", "🍩", "🍪", "🍫", "🍬", "🍭", "🍼", "🥛", "☕", "🍵", "🍹", "🍺", "🍻", "🫗", "🍽️", "🔪"] },
  { id: "activities", icon: "🏓", emojis: ["🎃", "🎄", "🎆", "✨", "🎈", "🎉", "🎋", "🎁", "🎟️", "🏆", "🏅", "🥇", "🥈", "🥉", "⚾", "🏈", "🎳", "🏓", "🎣", "🎯", "🔮", "🪄", "🎮", "🎰", "🎲", "🧩", "🎴", "🎭", "🖼️", "🎨"] },
  { id: "travel", icon: "🛫", emojis: ["🌎", "🌐", "🗺️", "🧭", "🌋", "🏕️", "🏖️", "🏛️", "🛖", "🏠", "🏰", "🗽", "⛩️", "🌆", "♨️", "🛎️", "🚂", "🚕", "🚛", "🛵", "🚲", "🚨", "🚦", "🛑", "🚧", "⚓", "🛟", "🛫", "🚀", "🛸"] },
  { id: "objects", icon: "💼", emojis: ["🎗️", "🧦", "🛍️", "👢", "🎓", "💎", "🔊", "📢", "🎶", "🎙️", "🎤", "🎧", "🎸", "🎹", "🎻", "🪉", "📱", "📞", "🔋", "🪫", "🖥️", "⌨️", "💽", "🎞️", "📽️", "🎬", "📺", "📸", "📓", "📖", "📚", "📑", "📦", "📬", "✏️", "✒️", "📅", "💼", "📋", "📐", "✂️", "🗑️", "⌛", "💵", "🔍", "💡", "🔒", "🔓", "🗝️", "🛠️", "⛓️", "🧲", "💉", "🛏️", "🚽", "🧻", "🧼", "🛒", "🚬", "⚰️"] },
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
    if (btn.id === "rte-normal-btn") {
      btn.classList.toggle("active", !blockTag || blockTag === "P" || blockTag === "DIV");
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
// Unlike the heading buttons above (which toggle), this is a hard reset to
// plain text regardless of current state - the discoverable, unambiguous
// way out of a heading/quote, since re-clicking the *same* heading button to
// turn it off is easy to miss (and easy to confuse with the unrelated font
// -size Reset button, which never touched block-level formatting at all).
function applyNormalBlock() {
  document.execCommand("formatBlock", false, "P");
}
// execCommand("indent") on a plain paragraph (not inside a list) doesn't
// indent at all - it wraps the paragraph in a <blockquote>, a legacy
// browser quirk. Since blockquotes here are styled italic (for the actual
// Quote button), that made Indent silently turn text italic. Indent/outdent
// only behave sanely inside a list (nesting/un-nesting list items), so
// that's the only place they're allowed to do anything.
function isCaretInList() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return false;
  let node = sel.getRangeAt(0).commonAncestorContainer;
  while (node && node !== detailDescription) {
    if (node.nodeType === 1 && node.tagName === "LI") return true;
    node = node.parentNode;
  }
  return false;
}
function applyIndent(increase) {
  if (!isCaretInList()) return;
  document.execCommand(increase ? "indent" : "outdent", false, null);
}
document.querySelectorAll("#detail-description-toolbar .rte-btn").forEach((btn) => {
  if (btn.id === "rte-link-btn" || btn.id === "rte-emoji-btn" || btn.id === "rte-normal-btn") return; // wired separately below
  // Without this, clicking a toolbar button first steals focus (and the
  // text selection) away from the description field, so the formatting
  // command would have nothing to apply to.
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => {
    if (btn.dataset.heading) {
      applyHeading(btn.dataset.heading);
    } else if (btn.dataset.cmd === "indent" || btn.dataset.cmd === "outdent") {
      applyIndent(btn.dataset.cmd === "indent");
    } else {
      document.execCommand(btn.dataset.cmd, false, null);
    }
    detailDescription.focus();
    autoGrowDescription();
    updateRteToolbarState();
  });
});
const rteNormalBtn = document.getElementById("rte-normal-btn");
rteNormalBtn.addEventListener("mousedown", (e) => e.preventDefault());
rteNormalBtn.addEventListener("click", () => {
  applyNormalBlock();
  detailDescription.focus();
  autoGrowDescription();
  updateRteToolbarState();
});
detailDescription.addEventListener("keyup", updateRteToolbarState);
detailDescription.addEventListener("mouseup", updateRteToolbarState);
detailDescription.addEventListener("focus", updateRteToolbarState);
// Headings and quotes are the two block formats where the browser's default
// Enter behavior reads as broken rather than useful:
// - Heading: continuing to type in the same H1/H2/H3 tag after Enter is
//   never what's wanted here (headings are single-line by convention), so
//   the new line always drops straight to plain text.
// - Blockquote: a single Enter reasonably continues the quote (multi-line
//   quotes are normal), but the browser's default never offers a way back
//   out short of manually re-toggling the Quote button - so a second Enter
//   on an already-empty quote line exits to plain text instead of starting
//   yet another blockquote. Shift+Enter is untouched, so it still works as
//   an explicit "stay in the quote, just add a line" per the toolbar's
//   existing behavior.
detailDescription.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.shiftKey) return;
  let blockTag = "";
  try { blockTag = document.queryCommandValue("formatBlock").toUpperCase(); } catch (err) {}
  if (blockTag === "H1" || blockTag === "H2" || blockTag === "H3") {
    e.preventDefault();
    document.execCommand("insertParagraph", false, null);
    document.execCommand("formatBlock", false, "P");
    autoGrowDescription();
    updateRteToolbarState();
    return;
  }
  if (blockTag === "BLOCKQUOTE") {
    const sel = window.getSelection();
    let block = sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
    while (block && block.nodeType !== 1) block = block.parentNode;
    while (block && block !== detailDescription && block.tagName !== "BLOCKQUOTE") block = block.parentNode;
    if (block && block.tagName === "BLOCKQUOTE" && !block.textContent.trim()) {
      e.preventDefault();
      document.execCommand("formatBlock", false, "P");
      autoGrowDescription();
      updateRteToolbarState();
    }
  }
});

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
// A -/+ stepper through 5 presets, not a dropdown - quicker to tap than
// picking from a list, per explicit request. Normal sits in the middle (2
// steps down, 2 steps up) so it reads as a balanced scale rather than
// "small, then three bigger ones."
const RTE_FONT_SIZES = [10, 12, 14, 18, 24];
const RTE_FONT_SIZE_NORMAL_INDEX = 2;
let rteFontSizeIndex = RTE_FONT_SIZE_NORMAL_INDEX; // also the reset point each time a card's detail view opens
const rteFontSizeDecBtn = document.getElementById("rte-font-size-dec");
const rteFontSizeIncBtn = document.getElementById("rte-font-size-inc");
const rteFontSizeResetBtn = document.getElementById("rte-font-size-reset");
// The middle button doubles as a label for the current step - just the
// plain px number, not a word (Small/Normal/Large/...), since those varied
// in length and made every button after it visibly shift left/right each
// time the size changed. Digits stay a fixed width. Clicking it still always
// jumps straight back to Normal.
function updateRteFontSizeButtons() {
  rteFontSizeDecBtn.disabled = rteFontSizeIndex === 0;
  rteFontSizeIncBtn.disabled = rteFontSizeIndex === RTE_FONT_SIZES.length - 1;
  rteFontSizeResetBtn.textContent = String(RTE_FONT_SIZES[rteFontSizeIndex]);
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
  document.getElementById("detail-repeat-btn").classList.toggle("hidden", !hasDate);
  detailDueTime.classList.toggle("hidden", !showTime);
  if (!showTime) detailDueTimeConfirmBtn.classList.add("hidden");
  syncDueAlarmHint(document.getElementById("detail-alarm-hint"), showTime);
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
  // Re-checked rather than copied over, so e.g. completing a card while
  // "Hide completed" is on hides it right away.
  if (!(matchesSearch(card) && matchesCardFilter(card))) newEl.style.display = "none";
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

const WHITEBOARD_MAX_PAGES = 10;
// x/y stay null until wbEnsurePageViewportCentered actually measures the
// canvas-wrap and picks a starting position - it can't happen here, since a
// brand new page is often created (e.g. a fresh board) while the whiteboard
// view itself is still hidden and has no real size to center against yet.
function newWhiteboardPage(name) {
  return { id: crypto.randomUUID(), name, shapes: [], connectors: [], viewport: { x: null, y: null, zoom: 1 } };
}
function normalizeWhiteboardPage(w) {
  if (!w.id) w.id = crypto.randomUUID();
  if (!w.name) w.name = "Page";
  if (!Array.isArray(w.shapes)) w.shapes = [];
  if (!Array.isArray(w.connectors)) w.connectors = [];
  if (!w.viewport || typeof w.viewport !== "object") w.viewport = {};
  if (typeof w.viewport.zoom !== "number") w.viewport.zoom = 1;
  // Missing x/y (pre-viewport save data) or still sitting at the old
  // untouched (0,0) top-left default both mean "never actually positioned
  // by the user" - re-centered on next display instead of staying pinned
  // to the top-left corner.
  const atOldDefault = w.viewport.x === 0 && w.viewport.y === 0;
  if (typeof w.viewport.x !== "number" || typeof w.viewport.y !== "number" || atOldDefault) {
    w.viewport.x = null;
    w.viewport.y = null;
  }
  return w;
}

function createNewBoard(name) {
  const wb = newWhiteboardPage("Page 1");
  return { id: crypto.randomUUID(), name, columns: newDefaultColumns(), labels: [], archivedCards: [], backgroundImage: null, backgroundImageType: null, backgroundBlur: 0, dueDate: null, hasDueTime: false, emoji: null, whiteboards: [wb], activeWhiteboardId: wb.id };
}

function defaultAppData() {
  const b = createNewBoard("My Board");
  return { boards: [b], archivedBoards: [], activeBoardId: b.id, theme: "dark", pattern: "none", pomodoroCowMode: false, pomodoroOverlayHidden: false, pomodoroPersistSettings: false, pomodoroSavedPlan: null, wbPhotoRegistry: {} };
}

function normalizeCardDefaults(c) {
  if (!c.labelIds) c.labelIds = [];
  if (c.color === undefined) c.color = null;
  if (c.completed === undefined) c.completed = false;
  if (!Array.isArray(c.comments)) c.comments = [];
  if (c.emoji === undefined) c.emoji = null;
  if (c.repeat === undefined) c.repeat = null;
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
  if (!Array.isArray(b.whiteboards) || !b.whiteboards.length) {
    const wb = newWhiteboardPage("Page 1");
    b.whiteboards = [wb];
    b.activeWhiteboardId = wb.id;
  } else {
    b.whiteboards.forEach(normalizeWhiteboardPage);
    if (!b.whiteboards.some((w) => w.id === b.activeWhiteboardId)) {
      b.activeWhiteboardId = b.whiteboards[0].id;
    }
  }
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
    applyNotificationDefaults(loaded);
    // A record of {originalName, boardName, pageName} per photo id, kept
    // independent of whether the photo's shape currently still exists - see
    // wbCreatePhotoFromFile/wbDeletePhotoFilesForShapes/wbSweepAssetIssues.
    // This is what lets the orphan-cleanup popup name where a photo used to
    // live even after undo history has forgotten the shape that carried it.
    if (!loaded.wbPhotoRegistry || typeof loaded.wbPhotoRegistry !== "object") loaded.wbPhotoRegistry = {};
    if (!Array.isArray(loaded.customColors)) loaded.customColors = [];
    if (!loaded.boards.length) return defaultAppData();
    return loaded;
  }
  if (loaded && Array.isArray(loaded.columns)) {
    const b = normalizeBoard(loaded);
    return { boards: [b], archivedBoards: [], activeBoardId: b.id, theme: "dark", pattern: "none", pomodoroCowMode: false, pomodoroOverlayHidden: false, pomodoroPersistSettings: false, pomodoroSavedPlan: null, wbPhotoRegistry: {} };
  }
  const order = [
    { key: "todo", title: "To Do" },
    { key: "doing", title: "Doing" },
    { key: "done", title: "Done" },
  ];
  const columns = order.map((o) => ({ id: o.key, title: o.title, cards: (loaded && loaded[o.key]) || [] }));
  const b = normalizeBoard({ id: crypto.randomUUID(), name: "My Board", columns, labels: [] });
  return { boards: [b], archivedBoards: [], activeBoardId: b.id, theme: "dark", pattern: "none", pomodoroCowMode: false, pomodoroOverlayHidden: false, pomodoroPersistSettings: false, pomodoroSavedPlan: null, wbPhotoRegistry: {} };
}

async function loadAppData() {
  try {
    const json = await invoke("load_data");
    appData = migrateAppData(JSON.parse(json));
  } catch (e) {
    // First-ever launch: no data file yet. Save right away rather than
    // waiting for the first edit, so Documents\kkanban exists immediately -
    // e.g. so a fresh install is ready to have a backup file imported/
    // restored into it without needing an edit first to create the folder.
    appData = defaultAppData();
    applyNotificationDefaults(appData);
    saveBoard();
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
  // Not awaited - reconciling on-disk image files against what's actually
  // referenced can run quietly in the background after the app is already
  // visible, rather than delaying first paint.
  wbSweepAssetIssues();
  syncDueAlarms();
  handlePendingOpenUrl();
  runAutoBackup();
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
    syncDueAlarms();
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
  const idx = col.cards.findIndex((c) => c.id === cardId);
  if (idx < 0) return;
  const [card] = col.cards.splice(idx, 1);
  render();
  saveBoard();
  const b = board;
  offerUndo(`Deleted "${shortTitle(card)}"`, () => {
    const target = b.columns.find((c) => c.id === col.id) || b.columns[0];
    if (target) target.cards.splice(Math.min(idx, target.cards.length), 0, card);
  }, b);
}

// ----- Undo delete -----
// One slot: the most recent delete can be put back from the toast's Undo
// button, or Ctrl+Z while that toast is still showing. `b` is the board the
// thing came from, so undo still works after switching boards.
let pendingUndo = null;
function offerUndo(message, restore, b) {
  pendingUndo = { restore, board: b };
  showToast(message, { actionLabel: "Undo", onAction: runUndo, duration: 8000 });
}
function runUndo() {
  if (!pendingUndo) return;
  const { restore, board: b } = pendingUndo;
  pendingUndo = null;
  hideToast();
  if (!appData.boards.includes(b) && !appData.archivedBoards.includes(b)) return;
  restore();
  if (b === board) {
    render();
    if (!document.getElementById("archived-cards-overlay").classList.contains("hidden")) renderArchivedCardsGrid();
  }
  saveBoard();
}
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
  const toast = document.getElementById("toast");
  if (!pendingUndo || !toast || !toast.classList.contains("toast-visible")) return;
  if (whiteboardActive || isTypingInField()) return;
  e.preventDefault();
  runUndo();
});

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
    const idx = board.archivedCards.findIndex((c) => c.id === entry.id);
    if (idx < 0) return;
    const [removed] = board.archivedCards.splice(idx, 1);
    renderArchivedCardsGrid();
    saveBoard();
    const b = board;
    offerUndo(`Deleted "${shortTitle(removed)}"`, () => {
      b.archivedCards.splice(Math.min(idx, b.archivedCards.length), 0, removed);
    }, b);
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

function openConfirmPopover(message, onConfirm, confirmLabel = "Delete") {
  const overlay = document.createElement("div");
  overlay.id = "confirm-overlay";
  overlay.innerHTML = `
    <div id="confirm-box">
      <p>${escapeHtml(message)}</p>
      <div class="popover-buttons">
        <button id="confirm-cancel">Cancel</button>
        <button id="confirm-delete">${escapeHtml(confirmLabel)}</button>
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

// Same shape as openConfirmPopover, but two custom actions instead of a
// single confirm/cancel pair - for a choice between two real options
// (e.g. "Browse for File..." vs "Delete Missing Reference") rather than a
// yes/no decision.
function openTwoActionPopover(message, labelA, onA, labelB, onB) {
  const overlay = document.createElement("div");
  overlay.id = "confirm-overlay";
  overlay.innerHTML = `
    <div id="confirm-box">
      <p>${escapeHtml(message)}</p>
      <div class="popover-buttons">
        <button id="two-action-a" style="background:var(--accent);color:#fff;">${escapeHtml(labelA)}</button>
        <button id="two-action-b" style="background:#7a2b2b;color:#fff;">${escapeHtml(labelB)}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector("#two-action-a").addEventListener("click", () => { overlay.remove(); onA(); });
  overlay.querySelector("#two-action-b").addEventListener("click", () => { overlay.remove(); onB(); });
}

// items: array of {fileName, pageName, boardName} | null (null = no
// registry record - an "unused" file predating that tracking, or one
// whose kind doesn't keep one). "Whiteboard" is spelled out per item since
// other kinds of attachment (e.g. a future card attachment) could show up
// in this same list later and need to stay distinguishable from it.
function wbShowOrphanCleanupPopover(items) {
  const n = items.length;
  const rows = items.map((it) => {
    if (!it) return `<li>an unnamed image</li>`;
    return `<li>${escapeHtml(it.fileName)} (<em>${escapeHtml(it.pageName)}</em> on <em>${escapeHtml(it.boardName)}</em> whiteboard)</li>`;
  }).join("");
  const overlay = document.createElement("div");
  overlay.id = "confirm-overlay";
  overlay.innerHTML = `
    <div id="confirm-box" class="confirm-box-wide">
      <p>${n} unused image${n === 1 ? "" : "s"} ${n === 1 ? "has" : "have"} been removed to free up space:</p>
      <ul class="orphan-cleanup-list">${rows}</ul>
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

// Sidebar layout lives in two places: appData.sidebarOrder is the top-level
// sequence of {type: "board"|"category", id} entries, and each category in
// appData.categories keeps its own ordered boardIds. Plenty of other code
// just pushes to / filters appData.boards directly (new board, archive,
// restore, delete, import) without knowing categories exist - so rather than
// touching every one of those, this reconciles the layout against whatever
// boards currently exist on every sidebar render: stale ids dropped, any
// board not placed yet appended at the top level. It also re-sorts
// appData.boards itself to match the sidebar's visual order.
function syncSidebarLayout() {
  if (!Array.isArray(appData.categories)) appData.categories = [];
  if (!Array.isArray(appData.sidebarOrder)) appData.sidebarOrder = [];
  const boardsById = new Map(appData.boards.map((b) => [b.id, b]));
  const catIds = new Set(appData.categories.map((c) => c.id));
  const placedBoards = new Set();
  const placedCats = new Set();
  appData.categories.forEach((c) => {
    if (!Array.isArray(c.boardIds)) c.boardIds = [];
    c.boardIds = c.boardIds.filter((id) => {
      if (!boardsById.has(id) || placedBoards.has(id)) return false;
      placedBoards.add(id);
      return true;
    });
  });
  appData.sidebarOrder = appData.sidebarOrder.filter((e) => {
    if (e.type === "category") {
      if (!catIds.has(e.id) || placedCats.has(e.id)) return false;
      placedCats.add(e.id);
      return true;
    }
    if (e.type === "board") {
      if (!boardsById.has(e.id) || placedBoards.has(e.id)) return false;
      placedBoards.add(e.id);
      return true;
    }
    return false;
  });
  appData.categories.forEach((c) => { if (!placedCats.has(c.id)) appData.sidebarOrder.push({ type: "category", id: c.id }); });
  appData.boards.forEach((b) => { if (!placedBoards.has(b.id)) appData.sidebarOrder.push({ type: "board", id: b.id }); });
  const ordered = [];
  appData.sidebarOrder.forEach((e) => {
    if (e.type === "board") ordered.push(boardsById.get(e.id));
    else appData.categories.find((c) => c.id === e.id).boardIds.forEach((id) => ordered.push(boardsById.get(id)));
  });
  appData.boards = ordered;
}

function renderSidebar() {
  syncSidebarLayout();
  const list = document.getElementById("boards-list");
  list.innerHTML = "";
  const boardsById = new Map(appData.boards.map((b) => [b.id, b]));
  appData.sidebarOrder.forEach((entry) => {
    if (entry.type === "board") list.appendChild(buildSidebarBoardItem(boardsById.get(entry.id)));
    else list.appendChild(buildSidebarCategory(appData.categories.find((c) => c.id === entry.id), boardsById));
  });
}

function buildSidebarBoardItem(b) {
  const item = document.createElement("div");
  item.className = "board-item" + (b.id === appData.activeBoardId ? " board-item-active" : "");
  item.innerHTML = `${b.emoji ? `<span class="board-item-emoji">${emojiHtml(b.emoji)}</span>` : ""}${escapeHtml(b.name)}`;
  item.dataset.boardId = b.id;
  item.addEventListener("mousedown", (e) => onBoardItemMouseDown(e, b, item));
  item.addEventListener("dblclick", () => renameBoardPrompt(b));
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
  return item;
}

// ----- Sidebar: board categories -----

function buildSidebarCategory(cat, boardsById) {
  const wrap = document.createElement("div");
  wrap.className = "sidebar-category" + (cat.collapsed ? " collapsed" : "");
  wrap.dataset.categoryId = cat.id;
  const header = document.createElement("div");
  header.className = "category-header";
  // A collapsed category hides the open board - a small dot keeps it findable.
  const hidesActive = cat.collapsed && cat.boardIds.includes(appData.activeBoardId);
  header.innerHTML = `<span class="category-caret">›</span>${cat.emoji ? `<span class="board-item-emoji">${emojiHtml(cat.emoji)}</span>` : ""}<span class="category-name">${escapeHtml(cat.name)}</span>${hidesActive ? `<span class="category-active-dot" title="Contains the open board"></span>` : ""}`;
  header.addEventListener("mousedown", (e) => onCategoryMouseDown(e, cat, wrap));
  header.addEventListener("dblclick", () => startRenameCategory(cat));
  header.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY, [
      { label: "📋 Add Board", onClick: () => openInlineAddBoardInCategory(cat) },
      { label: "✏️ Rename", onClick: () => startRenameCategory(cat) },
      { label: "😎 Add Emoji", onClick: () => openEmojiPicker(e.clientX, e.clientY, cat.emoji,
          (emoji) => { cat.emoji = emoji; renderSidebar(); saveBoard(); },
          () => { cat.emoji = null; renderSidebar(); saveBoard(); }
        ) },
      { label: "🗑️ Delete Category", onClick: () => confirmDeleteCategory(cat) },
    ]);
  });
  wrap.appendChild(header);
  const boardsEl = document.createElement("div");
  boardsEl.className = "category-boards";
  if (!cat.collapsed) {
    cat.boardIds.forEach((id) => boardsEl.appendChild(buildSidebarBoardItem(boardsById.get(id))));
    if (!cat.boardIds.length) {
      const empty = document.createElement("div");
      empty.className = "category-empty";
      empty.textContent = "Drag boards here";
      boardsEl.appendChild(empty);
    }
  }
  wrap.appendChild(boardsEl);
  return wrap;
}

// A category with boards in it gets a choice: keep the boards (the default -
// focused, so a reflexive Enter can't wipe anything; they drop back out to
// the top level right where the category sat), or permanently delete them
// along with it.
function confirmDeleteCategory(cat) {
  function keepBoards() {
    const idx = appData.sidebarOrder.findIndex((e) => e.type === "category" && e.id === cat.id);
    appData.sidebarOrder.splice(idx, 1, ...cat.boardIds.map((id) => ({ type: "board", id })));
    appData.categories = appData.categories.filter((c) => c.id !== cat.id);
    renderSidebar();
    saveBoard();
  }
  function deleteWithBoards() {
    const doomed = new Set(cat.boardIds);
    appData.boards.filter((b) => doomed.has(b.id)).forEach(discardBoardFiles);
    appData.boards = appData.boards.filter((b) => !doomed.has(b.id));
    appData.sidebarOrder = appData.sidebarOrder.filter((e) => !(e.type === "category" && e.id === cat.id));
    appData.categories = appData.categories.filter((c) => c.id !== cat.id);
    if (doomed.has(appData.activeBoardId)) {
      appData.activeBoardId = appData.boards[0].id;
      board = appData.boards[0];
      syncBoardBackground();
    }
    renderBoardTitle();
    renderSidebar();
    render();
    saveBoard();
  }
  const n = cat.boardIds.length;
  if (!n) { keepBoards(); return; }
  const plural = n === 1 ? "board" : "boards";
  const question = cat.name ? `Delete category "${cat.name}"?` : "Delete this category?";
  const overlay = document.createElement("div");
  overlay.id = "confirm-overlay";
  overlay.innerHTML = `
    <div id="confirm-box">
      <p>${escapeHtml(question)}</p>
      <div class="popover-buttons popover-buttons-stacked">
        <button id="category-delete-keep">Delete &amp; keep boards</button>
        <button id="category-delete-all">Delete category + ${n} ${plural}</button>
        <button id="confirm-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  overlay.querySelector("#confirm-cancel").addEventListener("click", close);
  const keepBtn = overlay.querySelector("#category-delete-keep");
  keepBtn.addEventListener("click", () => { close(); keepBoards(); });
  overlay.querySelector("#category-delete-all").addEventListener("click", () => {
    close();
    if (n >= appData.boards.length) {
      openAlertPopover("You need at least one board — move a board out of this category or create another before deleting all of its boards.");
      return;
    }
    deleteWithBoards();
  });
  keepBtn.focus();
}

// Shared by new-category and rename: an input with the emoji slot beside it,
// same as "+ New Board" / add-column. Commits on Enter or once focus leaves
// the row entirely; Escape cancels.
function wireSidebarNameRow(row, input, emojiBtn, commit, cancel) {
  row.appendChild(input);
  row.appendChild(emojiBtn);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") cancel();
  });
  function onRowFocusOut(e) {
    if (e.relatedTarget && row.contains(e.relatedTarget)) return;
    setTimeout(commit, 100);
  }
  input.addEventListener("focusout", onRowFocusOut);
  emojiBtn.addEventListener("focusout", onRowFocusOut);
}

function openInlineAddCategory() {
  document.getElementById("sidebar").classList.remove("collapsed");
  const list = document.getElementById("boards-list");
  const existing = list.querySelector(".category-add-area");
  if (existing) { existing.querySelector("input").focus(); return; }
  const area = document.createElement("div");
  area.className = "category-add-area";
  const row = document.createElement("div");
  row.className = "inline-add-row";
  let pendingEmoji = null;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "sidebar-name-input";
  input.placeholder = "Category name...";
  const emojiBtn = createEmojiSlotButton(() => pendingEmoji, (emoji) => { pendingEmoji = emoji; });
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    const val = input.value.trim();
    if (val || pendingEmoji) {
      const cat = { id: crypto.randomUUID(), name: val, emoji: pendingEmoji || null, collapsed: false, boardIds: [] };
      appData.categories.push(cat);
      appData.sidebarOrder.push({ type: "category", id: cat.id });
      saveBoard();
    }
    renderSidebar();
  }
  function cancel() {
    if (done) return;
    done = true;
    area.remove();
  }
  wireSidebarNameRow(row, input, emojiBtn, commit, cancel);
  area.appendChild(row);
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "inline-add-confirm-btn";
  confirmBtn.textContent = "Confirm";
  confirmBtn.addEventListener("click", commit);
  area.appendChild(confirmBtn);
  list.appendChild(area);
  area.scrollIntoView({ block: "nearest" });
  input.focus();
}

// Category right-click > Add Board: the same name/emoji input as
// "+ New Board", opened at the bottom of that category's list, and the new
// board lands right there.
function openInlineAddBoardInCategory(cat) {
  if (cat.collapsed) {
    cat.collapsed = false;
    renderSidebar();
    saveBoard();
  }
  const boardsEl = document.querySelector(`.sidebar-category[data-category-id="${cat.id}"] .category-boards`);
  if (!boardsEl) return;
  const existing = boardsEl.querySelector(".category-board-add-area");
  if (existing) { existing.querySelector("input").focus(); return; }
  const hint = boardsEl.querySelector(".category-empty");
  if (hint) hint.remove();
  const area = document.createElement("div");
  area.className = "category-board-add-area";
  const row = document.createElement("div");
  row.className = "inline-add-row";
  let pendingEmoji = null;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "sidebar-name-input";
  input.placeholder = "Board name...";
  const emojiBtn = createEmojiSlotButton(() => pendingEmoji, (emoji) => { pendingEmoji = emoji; });
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    const val = input.value.trim();
    if (!val && !pendingEmoji) { renderSidebar(); return; }
    const nb = createNewBoard(val || "My Board");
    nb.emoji = pendingEmoji || null;
    appData.boards.push(nb);
    // Placed in the category before switching, so the sidebar re-render
    // inside switchBoard sees it here rather than loose at the top level.
    cat.boardIds.push(nb.id);
    switchBoard(nb.id);
  }
  function cancel() {
    if (done) return;
    done = true;
    renderSidebar();
  }
  wireSidebarNameRow(row, input, emojiBtn, commit, cancel);
  area.appendChild(row);
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "inline-add-confirm-btn";
  confirmBtn.textContent = "Confirm";
  confirmBtn.addEventListener("click", commit);
  area.appendChild(confirmBtn);
  boardsEl.appendChild(area);
  area.scrollIntoView({ block: "nearest" });
  input.focus();
}

// Inline swap like clicking a column title, but with the emoji slot right
// beside the input so the emoji can be changed/removed in the same go.
function startRenameCategory(cat) {
  const header = document.querySelector(`.sidebar-category[data-category-id="${cat.id}"] .category-header`);
  if (!header) return;
  let pendingEmoji = cat.emoji || null;
  const row = document.createElement("div");
  row.className = "inline-add-row category-rename-row";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "sidebar-name-input";
  input.placeholder = "Category name...";
  input.value = cat.name;
  const emojiBtn = createEmojiSlotButton(() => pendingEmoji, (emoji) => { pendingEmoji = emoji; });
  let done = false;
  function commit() {
    if (done) return;
    done = true;
    const val = input.value.trim();
    // Clearing both the name and the emoji would leave nothing visible to
    // click on, so that combination just keeps the old values.
    if (val || pendingEmoji) {
      cat.name = val;
      cat.emoji = pendingEmoji;
      saveBoard();
    }
    renderSidebar();
  }
  function cancel() {
    if (done) return;
    done = true;
    renderSidebar();
  }
  wireSidebarNameRow(row, input, emojiBtn, commit, cancel);
  header.replaceWith(row);
  input.focus();
  input.select();
}

// Right-click on any empty stretch of the sidebar (anything that isn't a
// board, category, button or input with its own behavior).
document.getElementById("sidebar").addEventListener("contextmenu", (e) => {
  if (e.target.closest(".board-item, .category-header, button, input, #sidebar-footer")) return;
  e.preventDefault();
  openMenu(e.clientX, e.clientY, [
    { label: "📁 New Category", onClick: () => openInlineAddCategory() },
  ]);
});

function switchBoard(id) {
  // The sidebar switches on mouseup and re-renders right away, so no click
  // ever reaches the document listener that normally closes an open menu.
  closeMenu();
  closeCustomColorPanel();
  if (id === appData.activeBoardId) return;
  appData.activeBoardId = id;
  board = appData.boards.find((b) => b.id === id);
  closeArchivedCardsWindow();
  renderBoardTitle();
  renderSidebar();
  render();
  syncBoardBackground();
  if (whiteboardActive) {
    updateWbPagePicker();
    renderWhiteboardCanvas();
    wbGetHistory(getActiveWhiteboard().id); // same reasoning as toggleWhiteboardView/switchWhiteboardPage
  }
  saveBoard();
}

// ----- Whiteboard -----

let whiteboardActive = false;
const whiteboardViewEl = document.getElementById("whiteboard-view");
const whiteboardToggleBtn = document.getElementById("whiteboard-toggle-btn");
const whiteboardSvg = document.getElementById("whiteboard-svg");
const whiteboardCanvasWrapEl = document.getElementById("whiteboard-canvas-wrap");
const wbPagePickerBtn = document.getElementById("wb-page-picker-btn");
let whiteboardRootG = null;

function getActiveWhiteboard() {
  return board.whiteboards.find((w) => w.id === board.activeWhiteboardId) || board.whiteboards[0];
}

function toggleWhiteboardView() {
  whiteboardActive = !whiteboardActive;
  boardEl.classList.toggle("hidden", whiteboardActive);
  whiteboardViewEl.classList.toggle("hidden", !whiteboardActive);
  whiteboardToggleBtn.classList.toggle("active", whiteboardActive);
  if (whiteboardActive) {
    updateWbPagePicker();
    renderWhiteboardCanvas();
    // Seeds this page's undo baseline from its current (pre-edit) state -
    // must happen before anything is drawn, not lazily on the first push,
    // or that first push's "before" snapshot ends up capturing the shape
    // that was just added instead of the empty state that preceded it.
    wbGetHistory(getActiveWhiteboard().id);
  }
}
whiteboardToggleBtn.addEventListener("click", toggleWhiteboardView);

// The picker button just names the active page - the actual list only
// exists while the dropdown built by openWbPagePickerMenu is open, so this
// is the one thing that needs to stay in sync with add/rename/switch/delete
// on its own.
function updateWbPagePicker() {
  wbPagePickerBtn.textContent = getActiveWhiteboard().name;
}

const WB_PAGE_PICKER_PENCIL_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const WB_PAGE_PICKER_X_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>`;

function closeWbPagePickerMenu() {
  const m = document.getElementById("wb-page-picker-menu");
  if (m) m.remove();
  wbPagePickerBtn.classList.remove("active");
  document.removeEventListener("click", wbHandlePagePickerOutsideClick);
}

// A plain `document.addEventListener("click", closeWbPagePickerMenu)` would
// fire (and tear the menu down) on a click on ANYTHING inside the menu too,
// not just outside it - harmless for actions that already close the menu
// themselves synchronously, but it raced the page-name row's click/dblclick
// debounce (see below), destroying the row before a real double-click could
// ever land on it. Only actually closing for clicks outside the menu is
// what makes both gestures work on that row.
function wbHandlePagePickerOutsideClick(e) {
  const menu = document.getElementById("wb-page-picker-menu");
  if (menu && !menu.contains(e.target)) closeWbPagePickerMenu();
}

function openWbPagePickerMenu() {
  // Same toggle behavior as a native <select> - clicking the trigger again
  // while it's open closes it rather than stacking/re-opening.
  if (document.getElementById("wb-page-picker-menu")) { closeWbPagePickerMenu(); return; }
  const menu = document.createElement("div");
  menu.id = "wb-page-picker-menu";
  board.whiteboards.forEach((w) => {
    const row = document.createElement("div");
    row.className = "wb-page-picker-row" + (w.id === board.activeWhiteboardId ? " wb-page-picker-row-active" : "");
    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "wb-page-picker-name";
    nameBtn.textContent = w.name;
    // Unlike the persistent board list/old tab row (where a click just
    // re-renders elements in place, so a native dblclick still lands on the
    // freshly-rebuilt element at the same spot), a single click here closes
    // and removes this whole dropdown - which would delete the row out from
    // under a real double-click before the second click/dblclick could ever
    // land on it. Debouncing the single-click action long enough for a
    // dblclick to preempt it is what makes both gestures work here.
    let nameClickTimer = null;
    nameBtn.addEventListener("click", () => {
      clearTimeout(nameClickTimer);
      nameClickTimer = setTimeout(() => {
        closeWbPagePickerMenu();
        switchWhiteboardPage(w.id);
      }, 250);
    });
    nameBtn.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      clearTimeout(nameClickTimer);
      closeWbPagePickerMenu();
      renameWhiteboardPagePrompt(w);
    });
    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "wb-page-picker-action";
    renameBtn.title = "Rename";
    renameBtn.innerHTML = WB_PAGE_PICKER_PENCIL_SVG;
    renameBtn.addEventListener("click", () => { closeWbPagePickerMenu(); renameWhiteboardPagePrompt(w); });
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "wb-page-picker-action";
    deleteBtn.title = "Delete";
    deleteBtn.innerHTML = WB_PAGE_PICKER_X_SVG;
    deleteBtn.addEventListener("click", () => { closeWbPagePickerMenu(); confirmDeleteWhiteboardPage(w); });
    row.append(nameBtn, renameBtn, deleteBtn);
    menu.appendChild(row);
  });
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.id = "wb-page-picker-add";
  addBtn.textContent = "+ Add Page";
  addBtn.disabled = board.whiteboards.length >= WHITEBOARD_MAX_PAGES;
  addBtn.title = addBtn.disabled ? `Up to ${WHITEBOARD_MAX_PAGES} pages per board` : "Add page";
  addBtn.addEventListener("click", () => { closeWbPagePickerMenu(); addWhiteboardPage(); });
  menu.appendChild(addBtn);
  document.body.appendChild(menu);
  wbPagePickerBtn.classList.add("active");
  // Right-aligned to the trigger since the trigger sits at the toolbar's
  // far right edge - a left-aligned menu would run off the window.
  const rect = wbPagePickerBtn.getBoundingClientRect();
  menu.style.top = rect.bottom + 4 + "px";
  menu.style.right = window.innerWidth - rect.right + "px";
  setTimeout(() => document.addEventListener("click", wbHandlePagePickerOutsideClick), 0);
}
wbPagePickerBtn.addEventListener("click", (e) => { e.stopPropagation(); openWbPagePickerMenu(); });

function switchWhiteboardPage(id) {
  if (id === board.activeWhiteboardId) return;
  board.activeWhiteboardId = id;
  updateWbPagePicker();
  renderWhiteboardCanvas();
  wbGetHistory(id); // seed its undo baseline before anything gets drawn on it
  saveBoard();
}

function addWhiteboardPage() {
  if (board.whiteboards.length >= WHITEBOARD_MAX_PAGES) return;
  const wb = newWhiteboardPage(`Page ${board.whiteboards.length + 1}`);
  board.whiteboards.push(wb);
  board.activeWhiteboardId = wb.id;
  updateWbPagePicker();
  renderWhiteboardCanvas();
  wbGetHistory(wb.id);
  saveBoard();
}

function renameWhiteboardPagePrompt(w) {
  openInputPopover(`Rename "${w.name}"`, w.name, (newName) => {
    w.name = newName;
    updateWbPagePicker();
    saveBoard();
  });
}

function confirmDeleteWhiteboardPage(w) {
  if (board.whiteboards.length <= 1) {
    openAlertPopover("You need at least one page — create another before deleting this one.");
    return;
  }
  openConfirmPopover(`Delete "${w.name}"? This can't be undone.`, () => {
    wbDeletePhotoFilesForShapes(w.shapes);
    board.whiteboards = board.whiteboards.filter((x) => x.id !== w.id);
    if (board.activeWhiteboardId === w.id) board.activeWhiteboardId = board.whiteboards[0].id;
    delete wbHistoryByPage[w.id]; // that page's undo history is meaningless once the page itself is gone
    updateWbPagePicker();
    renderWhiteboardCanvas();
    saveBoard();
  }, "Delete");
}

// A single <g> holds everything drawn on the page (shapes/connectors land
// here in later phases) so pan/zoom is just one transform on this one
// element, not per-shape math.
function ensureWhiteboardRootG() {
  if (!whiteboardRootG || !whiteboardSvg.contains(whiteboardRootG)) {
    whiteboardSvg.innerHTML = "";
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `<marker id="wb-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${WB_SHAPE_STROKE}"/></marker>
      <pattern id="wb-grid-pattern" width="${WB_GRID_SIZE}" height="${WB_GRID_SIZE}" patternUnits="userSpaceOnUse">
        <path d="M ${WB_GRID_SIZE} 0 L 0 0 0 ${WB_GRID_SIZE}" fill="none" stroke="rgba(43,43,43,0.2)" stroke-width="1"/>
      </pattern>`;
    whiteboardSvg.appendChild(defs);
    whiteboardRootG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    whiteboardRootG.id = "whiteboard-root-g";
    whiteboardSvg.appendChild(whiteboardRootG);
  }
  return whiteboardRootG;
}

function applyWhiteboardTransform() {
  const wb = getActiveWhiteboard();
  const g = ensureWhiteboardRootG();
  g.setAttribute("transform", `translate(${wb.viewport.x} ${wb.viewport.y}) scale(${wb.viewport.zoom})`);
  updateWbZoomDisplay();
}

// ----- Whiteboard: shapes + selection (Phase 2) -----

const WB_SVG_NS = "http://www.w3.org/2000/svg";
// A "page" is a visual unit, not a hard boundary - drawing/dragging is
// never restricted by it. The grid of page tiles just auto-expands (and
// contracts back) to always fully cover wherever the content actually is,
// draw.io-style, so it's obvious at a glance whether everything is inside
// the space being used or something's drifted out into empty territory.
// US-Legal (8.5" x 14") at 100px/inch - draw.io's own internal page-unit
// convention (not the 96px/inch CSS-standard), picked to track draw.io's
// own page sizing as closely as possible.
const WB_PAGE_WIDTH = 850;
const WB_PAGE_HEIGHT = 1400;
const WB_GRID_SIZE = 20;
let wbGridVisible = false;
let wbSnapToGrid = false;
let wbSpellcheckEnabled = true;
const WB_SHAPE_FILL = "#ffffff";
const WB_SHAPE_STROKE = "#2b2b2b";
const WB_PEN_WIDTHS = [1, 2, 3, 5, 8];
const WB_PEN_WIDTH_NORMAL_INDEX = 2;
let wbPenWidthIndex = WB_PEN_WIDTH_NORMAL_INDEX;
let wbPenColor = "#2b2b2b";
let wbPenDrawState = null;
// A straight line between every recorded mouse point looks jagged - this
// runs a quadratic curve through the midpoint of each consecutive pair
// instead, the standard trick for turning raw pointer samples into a
// smooth freehand stroke.
function wbPenPathD(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}
const WB_SHAPE_STROKE_WIDTH = 2;
const WB_SELECT_COLOR = "#2f6fed";
const WB_MIN_SHAPE_SIZE = 10;
// rect/ellipse/diamond store an order-independent box (x, y, width, height).
// line/blockArrow instead store the two endpoints (x1,y1 -> x2,y2) directly,
// since direction matters for an arrow - collapsing that to a box the way
// the other shapes do would throw away which end the arrowhead is on.
const WB_VECTOR_TOOLS = new Set(["line", "plainLine", "blockArrow"]);

let wbTool = "select"; // "select" | "rect" | "ellipse" | "diamond" | "blockArrow" | "line" | "plainLine" | "branch"
// The four shape tools with an interior that can be filled - clicking the
// already-active one of these again (rather than a plain fresh click)
// toggles whether newly drawn shapes of that type get a fill at all.
const WB_FILLABLE_TOOLS = new Set(["rect", "ellipse", "diamond", "blockArrow"]);
let wbNoFillTools = new Set();
let wbSelectedShapeIds = new Set();
let wbPanState = null;
let wbDrawState = null;
let wbDragState = null;
let wbResizeState = null;
// True only while a drag has just snapped the dragged shape(s)' combined
// horizontal center onto the page's own vertical center line - drives the
// highlighted guide line in renderWbCenterSnapGuide, and is recomputed
// fresh on every drag mousemove (see the wbDragState branch) rather than
// merely toggled, so it can't get stuck on past the drag that set it.
let wbCenterSnapActive = false;
let wbMarqueeState = null;
let wbMarqueeEl = null;
let wbSpaceDown = false;
// Whether a wb-text-editor div is actively being typed into right now -
// distinct from wbTool, since double-clicking an existing shape's label (or
// a standalone text box) opens it for editing without switching the active
// drawing tool to "text". The format toolbar needs to key off this too, or
// it stays hidden (showing whatever OTHER tool's controls happen to occupy
// that space instead) for every text edit that didn't start from the Text
// tool itself - see updateWbToolbarGroups.
let wbTextEditActive = false;

function updateWbToolbarGroups() {
  document.getElementById("wb-text-format-group").classList.toggle("hidden", !(wbTool === "text" || wbTextEditActive));
  document.getElementById("wb-pen-options-group").classList.toggle("hidden", !(wbTool === "pen" && !wbTextEditActive));
}

function setWbTool(tool) {
  wbTool = tool;
  // [data-tool] specifically - the toolbar's zoom/grid/snap/clear buttons
  // share the plain .wb-tool-btn class purely for matching visual styling,
  // not because they're tool selectors. Querying the bare class caught them
  // too: clicking any of them called setWbTool(undefined), which then
  // matched every button lacking data-tool (undefined === undefined) and
  // lit them all up as "active" simultaneously.
  document.querySelectorAll(".wb-tool-btn[data-tool]").forEach((b) => b.classList.toggle("active", b.dataset.tool === tool));
  updateWbToolbarGroups();
  renderWhiteboardSelection();
}
// Each fillable tool's button holds its own small inline SVG shape (same
// technique the Select tool's cursor icon already uses) rather than a text
// glyph - Unicode has no filled/outline pair for these that actually
// matches in size and weight (a filled circle glyph renders noticeably
// smaller than an outline one in most fonts, and there's no clean filled
// counterpart to a block-arrow glyph at all). Toggling just flips the same
// shape's own fill between solid and none, so it's pixel-identical either way.
function wbUpdateFillIcon(tool) {
  const btn = document.querySelector(`.wb-tool-btn[data-tool="${tool}"]`);
  const shapeEl = btn && btn.querySelector("svg > *");
  if (!shapeEl) return;
  shapeEl.setAttribute("fill", wbNoFillTools.has(tool) ? "none" : "currentColor");
}
// Clicking the already-active fillable-shape tool again doesn't restart
// drawing (that'd be indistinguishable from just clicking it once) - it
// flips that tool's fill mode instead, since there's no other single-click
// gesture free for it on a toolbar button.
function wbToggleFillMode(tool) {
  if (wbNoFillTools.has(tool)) wbNoFillTools.delete(tool); else wbNoFillTools.add(tool);
  wbUpdateFillIcon(tool);
}
// Same "click the already-active tool again to flip a mode" gesture as fill
// mode above - controls which style a newly-drawn branch starts as. An
// existing branch can still be switched individually afterward via its own
// right-click menu; this only sets the default for the next one placed.
let wbBranchStyle = "y";
function wbUpdateBranchIcon() {
  const btn = document.querySelector('.wb-tool-btn[data-tool="branch"]');
  if (btn) btn.textContent = wbBranchStyle === "t" ? "T" : "Y";
}
function wbToggleBranchStyle() {
  wbBranchStyle = wbBranchStyle === "t" ? "y" : "t";
  wbUpdateBranchIcon();
}
// A drawing tool (excluding pen and text, which always stay active) reverts
// to Select right after one shape is placed - see the tail of
// commitDrawShape - so you land straight on resize/reposition handles
// instead of needing to switch tools yourself. Right-click a tool to
// "lock" it here if you want to keep placing several of the same shape in
// a row instead; the little corner dot shows which tools are currently
// locked.
let wbLockedTools = new Set();
const WB_LOCKABLE_TOOLS = new Set(["rect", "ellipse", "diamond", "blockArrow", "line", "plainLine", "branch"]);
// A shortcut for dropping one shape without disturbing whatever tool
// you're actually using right now - a box shape gets a sensible default
// size, a line/plainLine a sensible default length, both centered in the
// current view (same spot a pasted image lands). Useful for dividers drawn
// with the Line tool as much as for box shapes.
const WB_QUICK_ADD_TOOLS = new Set(["rect", "ellipse", "diamond", "blockArrow", "line", "plainLine", "branch"]);
// Repeated quick-adds of the same type cascade diagonally, same idea (and
// same step size) as repeated Ctrl+V - otherwise they'd all land exactly
// on top of each other at the view's center every time. Wraps back to
// center after a handful of steps instead of drifting off-screen forever.
let wbQuickAddCounts = {};
function wbQuickAddShape(type) {
  const wb = getActiveWhiteboard();
  if (!wb) return;
  const rect = whiteboardSvg.getBoundingClientRect();
  const viewCenter = wbClientToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
  const step = (wbQuickAddCounts[type] || 0) % 6;
  wbQuickAddCounts[type] = step + 1;
  const offset = WB_PASTE_OFFSET * step;
  const center = { x: viewCenter.x + offset, y: viewCenter.y + offset };
  let shape;
  if (type === "branch") {
    const half = 45, drop = 55;
    shape = {
      id: crypto.randomUUID(), type, x1: center.x, y1: center.y - drop,
      x2: center.x - half, y2: center.y + drop, x3: center.x + half, y3: center.y + drop,
      forkT: 0.5, style: wbBranchStyle, topAttach: null, leftAttach: null, rightAttach: null,
    };
  } else if (type === "line" || type === "plainLine" || type === "blockArrow") {
    const half = 110;
    shape = { id: crypto.randomUUID(), type, x1: center.x - half, y1: center.y, x2: center.x + half, y2: center.y, startAttach: null, endAttach: null };
    if (type === "blockArrow") shape.thickness = WB_BLOCK_ARROW_DEFAULT_THICKNESS;
  } else {
    const w = 140, h = 90;
    shape = { id: crypto.randomUUID(), type, x: center.x - w / 2, y: center.y - h / 2, width: w, height: h };
  }
  if (WB_FILLABLE_TOOLS.has(type)) shape.noFill = wbNoFillTools.has(type);
  wb.shapes.push(shape);
  wbSelectedShapeIds = new Set([shape.id]);
  renderWhiteboardCanvas();
  wbPushHistory();
  saveBoard();
}
document.querySelectorAll(".wb-tool-btn[data-tool]").forEach((btn) => {
  const tool = btn.dataset.tool;
  btn.addEventListener("click", () => {
    if (WB_FILLABLE_TOOLS.has(tool) && wbTool === tool) {
      wbToggleFillMode(tool);
      return;
    }
    if (tool === "branch" && wbTool === "branch") {
      wbToggleBranchStyle();
      return;
    }
    setWbTool(tool);
    if (tool !== "select") wbClearSelection();
  });
  if (WB_LOCKABLE_TOOLS.has(tool)) {
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (wbLockedTools.has(tool)) wbLockedTools.delete(tool); else wbLockedTools.add(tool);
      btn.classList.toggle("wb-tool-locked", wbLockedTools.has(tool));
    });
  }
  if (WB_QUICK_ADD_TOOLS.has(tool)) {
    btn.addEventListener("mousedown", (e) => {
      if (e.button !== 1) return;
      e.preventDefault(); // stop the browser's default middle-click autoscroll
      wbQuickAddShape(tool);
    });
  }
});
// Sets each fillable tool's icon to match its starting (filled) mode -
// the markup ships with the outline glyphs since those double as the
// plain shape-tool icons before this feature existed.
WB_FILLABLE_TOOLS.forEach((tool) => wbUpdateFillIcon(tool));

function wbSelectOnly(id) {
  wbSelectedShapeIds = new Set(id ? [id] : []);
  renderWhiteboardSelection();
}
function wbToggleSelect(id) {
  if (wbSelectedShapeIds.has(id)) wbSelectedShapeIds.delete(id); else wbSelectedShapeIds.add(id);
  renderWhiteboardSelection();
}
function wbClearSelection() {
  wbSelectedShapeIds = new Set();
  renderWhiteboardSelection();
}

// Mouse coordinates are in screen/client space; shapes are stored in the
// same untransformed "world" space the pan/zoom <g> wraps - this undoes
// that transform so drawing/dragging math never has to think about the
// current pan or zoom level.
function wbClientToWorld(clientX, clientY) {
  const wb = getActiveWhiteboard();
  const rect = whiteboardSvg.getBoundingClientRect();
  let x = (clientX - rect.left - wb.viewport.x) / wb.viewport.zoom;
  let y = (clientY - rect.top - wb.viewport.y) / wb.viewport.zoom;
  // Snapping here (rather than at each individual draw/drag/resize site)
  // means every one of them gets it for free, and a shape-to-shape snap
  // (wbAttachEndpoint) still wins afterward since it overwrites whatever
  // coordinate this produced.
  if (wbSnapToGrid) {
    x = Math.round(x / WB_GRID_SIZE) * WB_GRID_SIZE;
    y = Math.round(y / WB_GRID_SIZE) * WB_GRID_SIZE;
  }
  return { x, y };
}

const WB_BLOCK_ARROW_DEFAULT_THICKNESS = 14;
const WB_BLOCK_ARROW_MIN_THICKNESS = 4;
// Unit vector perpendicular to the arrow's own direction - the axis its
// width handle and thickness-drag math both move along.
function wbBlockArrowPerp(shape) {
  const dx = shape.x2 - shape.x1;
  const dy = shape.y2 - shape.y1;
  const length = Math.hypot(dx, dy) || 1;
  return { x: -dy / length, y: dx / length };
}

// A classic 7-point block-arrow polygon pointing from (x1,y1) to (x2,y2).
// Half the shaft's thickness is an explicit stored value (adjustable via
// its own selection handle) rather than always being a fixed proportion of
// length - it still gets a sensible proportional default when first drawn
// (see commitDrawShape), but once set it stays put as the arrow is
// stretched or shortened, same as a real arrow's line weight would.
function blockArrowPoints(x1, y1, x2, y2, thickness) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const angle = Math.atan2(dy, dx);
  const shaftHalf = Math.min(thickness || WB_BLOCK_ARROW_DEFAULT_THICKNESS, length / 2 - 2);
  const headHalf = shaftHalf * 2.2;
  const headLen = Math.min(length * 0.4, shaftHalf * 2.6);
  const local = [
    [0, -shaftHalf],
    [length - headLen, -shaftHalf],
    [length - headLen, -headHalf],
    [length, 0],
    [length - headLen, headHalf],
    [length - headLen, shaftHalf],
    [0, shaftHalf],
  ];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return local.map(([lx, ly]) => [x1 + lx * cos - ly * sin, y1 + lx * sin + ly * cos]);
}

// ----- Whiteboard: snapping (lines/arrows -> rect/ellipse/diamond/blockArrow) -----

// Only thin lines and arrows snap onto something - a block arrow, per
// explicit call, is a valid thing to snap ONTO but never itself snaps.
const WB_SNAP_SOURCE_TYPES = new Set(["line", "plainLine"]);
const WB_SNAP_TARGET_TYPES = new Set(["rect", "ellipse", "diamond", "blockArrow"]);
const WB_SNAP_PADDING = 10;

function wbShapeCenter(shape) {
  if (shape.type === "blockArrow") return { x: (shape.x1 + shape.x2) / 2, y: (shape.y1 + shape.y2) / 2 };
  return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
}
function wbShapeBox(shape) {
  if (shape.type === "pen") {
    const xs = shape.points.map((p) => p.x);
    const ys = shape.points.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  if (WB_VECTOR_TOOLS.has(shape.type)) {
    return {
      x: Math.min(shape.x1, shape.x2), y: Math.min(shape.y1, shape.y2),
      width: Math.abs(shape.x2 - shape.x1), height: Math.abs(shape.y2 - shape.y1),
    };
  }
  if (shape.type === "branch") {
    const xs = [shape.x1, shape.x2, shape.x3];
    const ys = [shape.y1, shape.y2, shape.y3];
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
}
// Where the ray from a shape's center, in direction (dirX, dirY), exits its
// boundary - rect/blockArrow use their bounding box, diamond its exact
// rhombus edge, ellipse its exact curve. Storing an attachment as this
// direction (rather than a fixed point) is what lets the same attachment
// stay correct after the target shape moves OR resizes.
function wbBoundaryPoint(shape, dirX, dirY) {
  const box = wbShapeBox(shape);
  const center = wbShapeCenter(shape);
  const hw = box.width / 2 || 0.001;
  const hh = box.height / 2 || 0.001;
  const len = Math.hypot(dirX, dirY) || 1;
  const dx = dirX / len;
  const dy = dirY / len;
  let t;
  if (shape.type === "ellipse") {
    t = 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2);
  } else if (shape.type === "diamond") {
    const denom = hh * Math.abs(dx) + hw * Math.abs(dy);
    t = denom ? (hw * hh) / denom : 0;
  } else {
    const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
    const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity;
    t = Math.min(tx, ty);
  }
  return { x: center.x + dx * t, y: center.y + dy * t };
}
// Topmost-drawn-first, so an overlapping shape drawn later (visually on
// top) is the one that actually receives the snap.
function wbFindSnapTarget(wb, worldX, worldY) {
  for (let i = wb.shapes.length - 1; i >= 0; i--) {
    const s = wb.shapes[i];
    if (!WB_SNAP_TARGET_TYPES.has(s.type)) continue;
    const box = wbShapeBox(s);
    if (worldX >= box.x - WB_SNAP_PADDING && worldX <= box.x + box.width + WB_SNAP_PADDING &&
        worldY >= box.y - WB_SNAP_PADDING && worldY <= box.y + box.height + WB_SNAP_PADDING) {
      return s;
    }
  }
  return null;
}
// Called when a line/plainLine endpoint is placed (drawn or dragged) - snaps
// it onto whatever shape it landed near, or leaves it as a free point.
function wbAttachEndpoint(shape, end, wb, worldX, worldY) {
  const field = end === "start" ? "startAttach" : "endAttach";
  const target = wbFindSnapTarget(wb, worldX, worldY);
  if (!target) {
    shape[field] = null;
    if (end === "start") { shape.x1 = worldX; shape.y1 = worldY; } else { shape.x2 = worldX; shape.y2 = worldY; }
    return;
  }
  const center = wbShapeCenter(target);
  shape[field] = { shapeId: target.id, dx: worldX - center.x || 0.001, dy: worldY - center.y || 0.001 };
}
// A branch shape has three independently-snappable endpoints (top/left/
// right) instead of a line's two - kept as its own function rather than
// generalizing wbAttachEndpoint above, since every caller of that one is
// hard-wired to exactly the start/end + x1/x2 pair.
function wbAttachBranchEndpoint(shape, which, wb, worldX, worldY) {
  const field = which === "top" ? "topAttach" : which === "left" ? "leftAttach" : "rightAttach";
  const coordX = which === "top" ? "x1" : which === "left" ? "x2" : "x3";
  const coordY = which === "top" ? "y1" : which === "left" ? "y2" : "y3";
  const target = wbFindSnapTarget(wb, worldX, worldY);
  if (!target) {
    shape[field] = null;
    shape[coordX] = worldX; shape[coordY] = worldY;
    return;
  }
  const center = wbShapeCenter(target);
  shape[field] = { shapeId: target.id, dx: worldX - center.x || 0.001, dy: worldY - center.y || 0.001 };
}
// Runs before every render - re-derives attached endpoints from their
// target shape's *current* position/size, which is what makes an arrow
// actually re-route when the shape it's snapped to moves or resizes.
function resolveWbAttachments(wb) {
  wb.shapes.forEach((shape) => {
    if (shape.type === "branch") {
      [["topAttach", "x1", "y1"], ["leftAttach", "x2", "y2"], ["rightAttach", "x3", "y3"]].forEach(([field, xk, yk]) => {
        if (!shape[field]) return;
        const target = wb.shapes.find((s) => s.id === shape[field].shapeId);
        if (target) { const p = wbBoundaryPoint(target, shape[field].dx, shape[field].dy); shape[xk] = p.x; shape[yk] = p.y; }
        else shape[field] = null;
      });
      return;
    }
    if (!WB_SNAP_SOURCE_TYPES.has(shape.type)) return;
    if (shape.startAttach) {
      const target = wb.shapes.find((s) => s.id === shape.startAttach.shapeId);
      if (target) { const p = wbBoundaryPoint(target, shape.startAttach.dx, shape.startAttach.dy); shape.x1 = p.x; shape.y1 = p.y; }
      else shape.startAttach = null;
    }
    if (shape.endAttach) {
      const target = wb.shapes.find((s) => s.id === shape.endAttach.shapeId);
      if (target) { const p = wbBoundaryPoint(target, shape.endAttach.dx, shape.endAttach.dy); shape.x2 = p.x; shape.y2 = p.y; }
      else shape.endAttach = null;
    }
  });
}

// Shared by every shape type's own interactive element (or, for a thin
// line/arrow, its invisible wide hit-line) - shift-click toggles that shape
// into/out of the current (possibly multi-shape) selection; a plain click
// either starts a group drag (if this shape is already part of a multi
// selection) or replaces the selection with just this shape first.
function wbWireShapeMousedown(el, shape) {
  el.dataset.shapeId = shape.id;
  el.style.cursor = "move";
  el.addEventListener("mousedown", (e) => {
    // A drawing tool being active takes priority - let the mousedown bubble
    // up to the canvas-level draw-start handler instead of selecting/
    // dragging whatever shape happens to be under the click. Text is the
    // one exception: with the Text tool active, a click on an EXISTING text
    // box should never start drawing a new one right on top of it - it just
    // gets swallowed here (no drag/selection either, since the tool still
    // isn't Select) so the shape's own dblclick handler is free to open it
    // for editing instead, per the Text tool's "double-click existing text
    // to edit it" behavior.
    if (wbTool !== "select") {
      if (wbTool === "text" && shape.type === "text") e.stopPropagation();
      return;
    }
    // A standalone text box being actively edited - let the click place the
    // text cursor normally instead of hijacking it to start a drag.
    if (el.isContentEditable) return;
    e.stopPropagation();
    if (e.shiftKey) {
      wbToggleSelect(shape.id);
      return;
    }
    if (!wbSelectedShapeIds.has(shape.id)) wbSelectOnly(shape.id);
    const wb = getActiveWhiteboard();
    const startWorld = wbClientToWorld(e.clientX, e.clientY);
    const origins = {};
    wbSelectedShapeIds.forEach((id) => {
      const s = wb.shapes.find((x) => x.id === id);
      if (!s) return;
      origins[id] = { ...s };
      // Grabbing the body (not an endpoint) of an attached arrow detaches
      // it - otherwise resolveWbAttachments would snap it straight back to
      // its old spot on every render during the drag, and it would never
      // visibly move.
      if (s.startAttach || s.endAttach) { s.startAttach = null; s.endAttach = null; }
      if (s.topAttach || s.leftAttach || s.rightAttach) { s.topAttach = null; s.leftAttach = null; s.rightAttach = null; }
    });
    wbDragState = { ids: [...wbSelectedShapeIds], origins, startX: startWorld.x, startY: startWorld.y };
  });
}

// Same label-palette swatch submenu the card color picker uses - any
// fillable shape can be colored this way, not just a dedicated shape type.
function wbBuildShapeColorSubmenu(shape) {
  const entries = LABEL_COLORS.map((color, i) => ({
    label: LABEL_COLOR_NAMES[i] || "",
    swatch: mutedCardColor(color),
    hideLabel: true, // whiteboard color pickers stay swatch-only - the name adds width without adding information once you can see the color itself
    onClick: () => { shape.color = color; renderWhiteboardCanvas(); wbPushHistory(); saveBoard(); },
  }));
  entries.push({ label: "No Color", onClick: () => { shape.color = null; renderWhiteboardCanvas(); wbPushHistory(); saveBoard(); } });
  return entries;
}
// Right-click on any shape - Color for fillable shapes, Delete for every
// shape type as a non-keyboard way to remove one.
function wbWireShapeContextMenu(el, shape, colorable) {
  el.addEventListener("contextmenu", (e) => {
    // Right-click-to-color/delete works no matter which drawing tool is
    // active - it's acting on an existing shape, not starting a new one, so
    // there's no reason it should require switching to Select first.
    e.preventDefault();
    e.stopPropagation();
    if (!wbSelectedShapeIds.has(shape.id)) wbSelectOnly(shape.id);
    const items = [];
    if (colorable) items.push({ label: "🎨 Color", submenu: wbBuildShapeColorSubmenu(shape) });
    if (shape.type === "branch") {
      items.push({
        label: shape.style === "t" ? "🔀 Switch to Y-fork" : "🔀 Switch to T-fork",
        onClick: () => { shape.style = shape.style === "t" ? "y" : "t"; renderWhiteboardCanvas(); wbPushHistory(); saveBoard(); },
      });
    }
    if (shape.type === "photo" && wbBrokenPhotoIds.has(shape.id)) {
      items.push({ label: "🔗 Locate File...", onClick: () => wbRelinkAsset({ id: shape.id, kind: "wb-photo" }) });
    }
    items.push({ label: "⬆️ Bring Forward", onClick: () => wbMoveShapeLayer(shape, 1) });
    items.push({ label: "⬇️ Send Backward", onClick: () => wbMoveShapeLayer(shape, -1) });
    items.push({ label: "🗑️ Delete", onClick: () => {
      const wb = getActiveWhiteboard();
      wb.shapes = wb.shapes.filter((s) => s.id !== shape.id);
      wbSelectedShapeIds.delete(shape.id);
      wbDeletePhotoFilesForShapes([shape]);
      renderWhiteboardCanvas();
      wbPushHistory();
      saveBoard();
    } });
    openMenu(e.clientX, e.clientY, items);
  });
}

// Where a branch shape's stem splits - shared by both rendering and the
// fork-position selection handle, so they never disagree. Travels along
// the straight line from the top point toward the midpoint of the two
// branch endpoints (not just straight down) - this is what lets the whole
// shape point in any direction, not only downward, since every other point
// on the shape is ultimately positioned relative to this one.
function wbBranchForkPoint(shape) {
  const midX = (shape.x2 + shape.x3) / 2;
  const midY = (shape.y2 + shape.y3) / 2;
  const t = shape.forkT != null ? shape.forkT : 0.5;
  return { x: shape.x1 + (midX - shape.x1) * t, y: shape.y1 + (midY - shape.y1) * t };
}
// Where a T-fork's crossbar meets one of its drops - the branch endpoint
// projected onto the line through the fork point that's perpendicular to
// the stem direction. For a straight-down stem this lands at exactly
// (endpoint.x, fork.y) - the plain horizontal-crossbar case - but it holds
// up for a stem pointing any other direction too, which is what makes a
// sideways or diagonal T-fork look like a rotated T instead of a broken one.
function wbBranchCrossbarPoint(shape, fork, endX, endY) {
  const stemDx = fork.x - shape.x1, stemDy = fork.y - shape.y1;
  const stemLen = Math.hypot(stemDx, stemDy) || 1;
  const perpX = -stemDy / stemLen, perpY = stemDx / stemLen;
  const vx = endX - fork.x, vy = endY - fork.y;
  const proj = vx * perpX + vy * perpY;
  return { x: fork.x + perpX * proj, y: fork.y + perpY * proj };
}
// "y" = stem to a point, then two diagonals out to the branch endpoints.
// "t" = stem to a crossbar (perpendicular to the stem) spanning the two
// endpoints, then a straight drop from each crossbar end to its endpoint -
// matches the two reference styles this was modeled on.
function wbBranchPathD(shape) {
  const fork = wbBranchForkPoint(shape);
  if (shape.style === "t") {
    const cb2 = wbBranchCrossbarPoint(shape, fork, shape.x2, shape.y2);
    const cb3 = wbBranchCrossbarPoint(shape, fork, shape.x3, shape.y3);
    return `M ${shape.x1} ${shape.y1} L ${fork.x} ${fork.y} ` +
      `M ${cb2.x} ${cb2.y} L ${cb3.x} ${cb3.y} ` +
      `M ${cb2.x} ${cb2.y} L ${shape.x2} ${shape.y2} ` +
      `M ${cb3.x} ${cb3.y} L ${shape.x3} ${shape.y3}`;
  }
  return `M ${shape.x1} ${shape.y1} L ${fork.x} ${fork.y} ` +
    `M ${fork.x} ${fork.y} L ${shape.x2} ${shape.y2} ` +
    `M ${fork.x} ${fork.y} L ${shape.x3} ${shape.y3}`;
}
function wbCreateBranchElement(shape) {
  const group = document.createElementNS(WB_SVG_NS, "g");
  const d = wbBranchPathD(shape);
  const visible = document.createElementNS(WB_SVG_NS, "path");
  visible.setAttribute("d", d);
  visible.setAttribute("fill", "none");
  visible.setAttribute("stroke", WB_SHAPE_STROKE);
  visible.setAttribute("stroke-width", WB_SHAPE_STROKE_WIDTH);
  visible.style.pointerEvents = "none";

  // A thin stroked path alone only catches a click landing exactly on one
  // of the three 2px segments - easy to miss, and right-clicking anywhere
  // in the open space "inside" the fork (between its two branches) would
  // hit nothing at all. This fills in that interior too, roughly matching
  // the shape's own silhouette: a Y-fork's triangle, or a T-fork's blockier
  // bounding box.
  const fork = wbBranchForkPoint(shape);
  const hitFill = document.createElementNS(WB_SVG_NS, "polygon");
  let fillPoints;
  if (shape.style === "t") {
    const cb2 = wbBranchCrossbarPoint(shape, fork, shape.x2, shape.y2);
    const cb3 = wbBranchCrossbarPoint(shape, fork, shape.x3, shape.y3);
    fillPoints = [[shape.x1, shape.y1], [cb2.x, cb2.y], [shape.x2, shape.y2], [shape.x3, shape.y3], [cb3.x, cb3.y]];
  } else {
    fillPoints = [[shape.x1, shape.y1], [shape.x2, shape.y2], [shape.x3, shape.y3]];
  }
  hitFill.setAttribute("points", fillPoints.map((p) => p.join(",")).join(" "));
  hitFill.setAttribute("fill", "transparent");

  // Same invisible-wide-path-under-thin-visible-path hit target as a plain
  // line, layered on top of the interior fill above so the two drops/
  // diagonals themselves stay easy to click precisely too.
  const hit = document.createElementNS(WB_SVG_NS, "path");
  hit.setAttribute("d", d);
  hit.setAttribute("fill", "none");
  hit.setAttribute("stroke", "transparent");
  hit.setAttribute("stroke-width", 16);
  group.appendChild(hitFill);
  group.appendChild(hit);
  group.appendChild(visible);
  wbWireShapeMousedown(hitFill, shape);
  wbWireShapeContextMenu(hitFill, shape, false);
  wbWireShapeMousedown(hit, shape);
  wbWireShapeContextMenu(hit, shape, false);
  return group;
}

function createShapeElement(shape) {
  // Only two points exist yet while a branch is still being dragged out
  // (the third comes from commitDrawShape) - shown as a plain straight
  // line placeholder, same as how the Text tool previews a bare rect.
  if (shape.type === "branch") {
    if (shape.id === "__preview__") {
      const group = document.createElementNS(WB_SVG_NS, "g");
      const visible = document.createElementNS(WB_SVG_NS, "line");
      visible.setAttribute("x1", shape.x1);
      visible.setAttribute("y1", shape.y1);
      visible.setAttribute("x2", shape.x2);
      visible.setAttribute("y2", shape.y2);
      visible.setAttribute("stroke", WB_SHAPE_STROKE);
      visible.setAttribute("stroke-width", WB_SHAPE_STROKE_WIDTH);
      visible.style.pointerEvents = "none";
      group.appendChild(visible);
      return group;
    }
    return wbCreateBranchElement(shape);
  }

  // A thin line/arrow's actual stroke is only 2px wide - clicking it
  // precisely is fiddly, so it gets an invisible, much wider line laid on
  // top purely for hit-testing, with the thin visible line underneath just
  // for looks.
  if (shape.type === "line" || shape.type === "plainLine") {
    const group = document.createElementNS(WB_SVG_NS, "g");
    const visible = document.createElementNS(WB_SVG_NS, "line");
    visible.setAttribute("x1", shape.x1);
    visible.setAttribute("y1", shape.y1);
    visible.setAttribute("x2", shape.x2);
    visible.setAttribute("y2", shape.y2);
    visible.setAttribute("stroke", WB_SHAPE_STROKE);
    visible.setAttribute("stroke-width", WB_SHAPE_STROKE_WIDTH);
    if (shape.type === "line") visible.setAttribute("marker-end", "url(#wb-arrowhead)");
    visible.style.pointerEvents = "none";
    const hit = document.createElementNS(WB_SVG_NS, "line");
    hit.setAttribute("x1", shape.x1);
    hit.setAttribute("y1", shape.y1);
    hit.setAttribute("x2", shape.x2);
    hit.setAttribute("y2", shape.y2);
    hit.setAttribute("stroke", "transparent");
    hit.setAttribute("stroke-width", 16);
    if (shape.id === "__preview__") hit.style.pointerEvents = "none";
    group.appendChild(hit);
    group.appendChild(visible);
    if (shape.id !== "__preview__") { wbWireShapeMousedown(hit, shape); wbWireShapeContextMenu(hit, shape, false); }
    return group;
  }

  // A freehand stroke is a smooth path through its recorded points (via
  // quadratic curves through consecutive midpoints - the standard trick for
  // turning a jagged sequence of mouse positions into a smooth line) - same
  // invisible-wide-hit-path-under-thin-visible-path pattern as a plain line.
  if (shape.type === "pen") {
    const group = document.createElementNS(WB_SVG_NS, "g");
    const d = wbPenPathD(shape.points);
    const visible = document.createElementNS(WB_SVG_NS, "path");
    visible.setAttribute("d", d);
    visible.setAttribute("fill", "none");
    visible.setAttribute("stroke", shape.color || WB_SHAPE_STROKE);
    visible.setAttribute("stroke-width", shape.width || WB_PEN_WIDTHS[WB_PEN_WIDTH_NORMAL_INDEX]);
    visible.setAttribute("stroke-linecap", "round");
    visible.setAttribute("stroke-linejoin", "round");
    visible.style.pointerEvents = "none";
    const hit = document.createElementNS(WB_SVG_NS, "path");
    hit.setAttribute("d", d);
    hit.setAttribute("fill", "none");
    hit.setAttribute("stroke", "transparent");
    hit.setAttribute("stroke-width", (shape.width || WB_PEN_WIDTHS[WB_PEN_WIDTH_NORMAL_INDEX]) + 16);
    if (shape.id === "__preview__") hit.style.pointerEvents = "none";
    group.appendChild(hit);
    group.appendChild(visible);
    if (shape.id !== "__preview__") { wbWireShapeMousedown(hit, shape); wbWireShapeContextMenu(hit, shape, false); }
    return group;
  }

  // A photo's bytes live on disk (see wbGetPhotoDataUrl), not in this
  // shape's data - the <image> renders empty until that async fetch
  // resolves and fills in its href, same lazy-load pattern the board
  // background image already uses.
  if (shape.type === "photo") {
    const group = document.createElementNS(WB_SVG_NS, "g");
    const img = document.createElementNS(WB_SVG_NS, "image");
    img.setAttribute("x", shape.x);
    img.setAttribute("y", shape.y);
    img.setAttribute("width", Math.max(shape.width, 1));
    img.setAttribute("height", Math.max(shape.height, 1));
    img.setAttribute("preserveAspectRatio", "none");
    group.appendChild(img);
    if (shape.id !== "__preview__") {
      wbGetPhotoDataUrl(shape).then((url) => {
        if (!url) {
          // Its file is missing - a blank box would just look like nothing
          // was ever there, so this shows it's a real, recoverable problem
          // instead (see the "Locate File..." option this also unlocks on
          // the right-click menu).
          wbBrokenPhotoIds.add(shape.id);
          const rect = document.createElementNS(WB_SVG_NS, "rect");
          rect.setAttribute("x", shape.x);
          rect.setAttribute("y", shape.y);
          rect.setAttribute("width", Math.max(shape.width, 1));
          rect.setAttribute("height", Math.max(shape.height, 1));
          rect.setAttribute("fill", "#f5f5f5");
          rect.setAttribute("stroke", "#c0392b");
          rect.setAttribute("stroke-width", 1.5);
          rect.setAttribute("stroke-dasharray", "5 3");
          rect.style.pointerEvents = "none";
          const label = document.createElementNS(WB_SVG_NS, "text");
          label.setAttribute("x", shape.x + shape.width / 2);
          label.setAttribute("y", shape.y + shape.height / 2);
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("dominant-baseline", "middle");
          label.setAttribute("fill", "#c0392b");
          label.setAttribute("font-size", "12");
          label.style.pointerEvents = "none";
          label.textContent = `Missing: ${shape.originalName || "image"}`;
          group.appendChild(rect);
          group.appendChild(label);
          return;
        }
        wbBrokenPhotoIds.delete(shape.id);
        img.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
        img.setAttribute("href", url);
      });
      wbWireShapeMousedown(img, shape);
      wbWireShapeContextMenu(img, shape, false);
      // Right-click is easy to miss - double-click (already the convention
      // for "interact with this shape's content" on every other shape
      // type) offers the same recovery prompt directly.
      img.addEventListener("dblclick", (e) => {
        if (!wbBrokenPhotoIds.has(shape.id)) return;
        e.stopPropagation();
        openTwoActionPopover(
          `"${shape.originalName || "This image"}" could not be found.`,
          "Replace File",
          () => wbRelinkAsset({ id: shape.id, kind: "wb-photo" }),
          "Delete Missing Reference",
          () => wbRemoveMissingAssetReference({ id: shape.id, kind: "wb-photo" })
        );
      });
    }
    return group;
  }

  // A free-floating text box has no background shape of its own - the
  // foreignObject/div IS the whole clickable element.
  if (shape.type === "text") {
    const group = document.createElementNS(WB_SVG_NS, "g");
    // A text box has no background shape of its own, so while it's being
    // drag-sized (preview only) it needs an outline to actually show what's
    // being sized - stroke-dasharray is left unset here so it inherits the
    // dashed style updateDrawShape applies to the whole preview group.
    if (shape.id === "__preview__") {
      const outline = document.createElementNS(WB_SVG_NS, "rect");
      outline.setAttribute("x", shape.x);
      outline.setAttribute("y", shape.y);
      outline.setAttribute("width", Math.max(shape.width, 0));
      outline.setAttribute("height", Math.max(shape.height, 0));
      outline.setAttribute("fill", "none");
      outline.setAttribute("stroke", WB_SHAPE_STROKE);
      outline.setAttribute("stroke-width", 1);
      group.appendChild(outline);
    }
    const { fo } = wbCreateTextOverlay(shape, "left", true);
    group.appendChild(fo);
    return group;
  }

  let el;
  if (shape.type === "ellipse") {
    el = document.createElementNS(WB_SVG_NS, "ellipse");
    el.setAttribute("cx", shape.x + shape.width / 2);
    el.setAttribute("cy", shape.y + shape.height / 2);
    el.setAttribute("rx", Math.max(shape.width / 2, 0));
    el.setAttribute("ry", Math.max(shape.height / 2, 0));
  } else if (shape.type === "diamond") {
    el = document.createElementNS(WB_SVG_NS, "polygon");
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const pts = [[cx, shape.y], [shape.x + shape.width, cy], [cx, shape.y + shape.height], [shape.x, cy]]
      .map((p) => p.join(",")).join(" ");
    el.setAttribute("points", pts);
  } else if (shape.type === "blockArrow") {
    el = document.createElementNS(WB_SVG_NS, "polygon");
    el.setAttribute("points", blockArrowPoints(shape.x1, shape.y1, shape.x2, shape.y2, shape.thickness).map((p) => p.join(",")).join(" "));
  } else {
    el = document.createElementNS(WB_SVG_NS, "rect");
    el.setAttribute("x", shape.x);
    el.setAttribute("y", shape.y);
    el.setAttribute("width", Math.max(shape.width, 0));
    el.setAttribute("height", Math.max(shape.height, 0));
    el.setAttribute("rx", 4);
  }
  // Any fillable shape can carry a color from the same label palette used
  // everywhere else in the app (right-click > Color) - falls back to the
  // shared default white/dark fill+stroke when none is set. A shape drawn
  // in no-fill mode (see wbToggleFillMode) still honors its own color as an
  // outline, it just skips painting the interior.
  let shapeTextColor = null;
  if (shape.noFill) {
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", shape.color ? darkenForOutline(shape.color) : WB_SHAPE_STROKE);
    el.setAttribute("stroke-width", shape.color ? 2 : WB_SHAPE_STROKE_WIDTH);
  } else if (shape.color) {
    const fill = mutedCardColor(shape.color);
    el.setAttribute("fill", fill);
    el.setAttribute("stroke", darkenForOutline(shape.color));
    el.setAttribute("stroke-width", 1);
    shapeTextColor = contrastTextColor(fill);
  } else {
    el.setAttribute("fill", WB_SHAPE_FILL);
    el.setAttribute("stroke", WB_SHAPE_STROKE);
    el.setAttribute("stroke-width", WB_SHAPE_STROKE_WIDTH);
  }
  if (shape.id !== "__preview__") { wbWireShapeMousedown(el, shape); wbWireShapeContextMenu(el, shape, true); }

  // Every fillable shape can carry a centered text label, double-click to
  // edit - the label overlay sits on top but stays click-through (pointer-
  // events: none) until actually being edited, so the shape underneath
  // keeps handling normal select/drag clicks.
  const group = document.createElementNS(WB_SVG_NS, "g");
  group.appendChild(el);
  const { fo } = wbCreateTextOverlay(shape, "center", false);
  if (shapeTextColor) fo.querySelector(".wb-text-editor").style.color = shapeTextColor;
  group.appendChild(fo);
  if (shape.id !== "__preview__") {
    el.addEventListener("dblclick", (e) => {
      // Works regardless of the active tool - labeling an existing shape
      // isn't "drawing," so it shouldn't require switching to Select first.
      e.stopPropagation();
      wbEnterTextEdit(shape, fo.querySelector(".wb-text-editor"));
    });
  }
  return group;
}

// Builds the foreignObject + contenteditable div that carries a shape's
// text - shared by the standalone Text tool (fully interactive, since it
// has no backing shape of its own) and every fillable shape's text label
// (click-through until double-clicked into edit mode; see createShapeElement).
function wbCreateTextOverlay(shape, align, standalone) {
  // wbShapeBox handles both schemas - x/y/width/height directly for box
  // shapes, derived from x1/y1/x2/y2 for block arrows - so this positions
  // correctly either way instead of reading fields a block arrow doesn't have.
  const box = wbShapeBox(shape);
  const fo = document.createElementNS(WB_SVG_NS, "foreignObject");
  fo.setAttribute("x", box.x);
  fo.setAttribute("y", box.y);
  fo.setAttribute("width", Math.max(box.width, 1));
  fo.setAttribute("height", Math.max(box.height, 1));
  // The wrap (not div) is the flex container that vertically centers the
  // text - see the .wb-text-editor-wrap CSS comment for why that centering
  // can't live on div itself once it can hold mixed content (a line-break
  // text node next to a Bold/Underline/size span from the format toolbar).
  const wrap = document.createElement("div");
  wrap.className = "wb-text-editor-wrap";
  const div = document.createElement("div");
  div.className = "wb-text-editor" + (align === "center" ? " wb-text-editor-center" : "");
  div.dataset.shapeId = shape.id;
  div.contentEditable = "false";
  div.spellcheck = wbSpellcheckEnabled;
  // shape.text holds HTML (bold/italic/underline/size spans, plus literal
  // "\n" text nodes for line breaks - see wbCommitTextEdit), not plain text.
  div.innerHTML = shape.text || "";
  wrap.appendChild(div);
  fo.appendChild(wrap);
  if (shape.id !== "__preview__") {
    div.addEventListener("blur", () => wbCommitTextEdit(shape, div, standalone));
    div.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); div.blur(); }
      else if (e.key === "Enter") {
        // insertLineBreak (unlike insertText with a literal "\n", which
        // Chromium normalizes into a new <div> block) inserts an actual
        // "\n" text node - which is exactly what wbCommitTextEdit's plain
        // textContent read (and this overlay's own textContent-based
        // render) already expect, so no other changes are needed to make
        // the line break survive a commit/redisplay round-trip.
        e.preventDefault();
        document.execCommand("insertLineBreak");
      }
      // Keeps typing (including Backspace/Delete) from also being read by
      // the canvas-level Delete-selected-shapes shortcut.
      e.stopPropagation();
    });
  }
  if (shape.id === "__preview__") {
    fo.style.pointerEvents = "none";
  } else if (standalone) {
    fo.style.pointerEvents = "auto";
    wbWireShapeMousedown(div, shape);
    wbWireShapeContextMenu(div, shape, false);
    div.addEventListener("dblclick", (e) => {
      // Same reasoning as the fillable-shape label case - editing existing
      // text isn't "drawing," so no tool-switch should be required for it.
      e.stopPropagation();
      wbEnterTextEdit(shape, div);
    });
    // Auto-grows the box to fit whatever's typed instead of silently
    // clipping it - a standalone text box's whole purpose is to hold its
    // text, unlike a fillable shape's label (which stays sized to the
    // shape itself; see the wb-text-editor-editing overflow:visible CSS for
    // that case instead). Never shrinks below the box's last-committed
    // size, only grows - re-measured on every keystroke via scrollHeight,
    // which reflects the un-clipped content height regardless of the box's
    // current (possibly smaller) actual height.
    div.addEventListener("input", () => {
      const needed = Math.max(div.scrollHeight, box.height);
      fo.setAttribute("height", needed);
      shape.height = needed;
    });
  } else {
    fo.style.pointerEvents = "none";
    div.style.pointerEvents = "none";
  }
  return { fo, div };
}

// contentEditable stays "false" the rest of the time (see wbCreateTextOverlay)
// so a plain click just selects/drags the shape like any other - only a
// double-click (or, for the Text tool, placing a brand new box) actually
// opens it up for typing.
function wbEnterTextEdit(shape, div) {
  div.parentElement.style.pointerEvents = "auto";
  div.parentElement.classList.add("wb-text-editor-editing");
  div.style.pointerEvents = "auto";
  div.contentEditable = "true";
  div.style.cursor = "text";
  // An empty contenteditable div has no line box for align-items:center to
  // center against, so the cursor initially renders pinned to the top - a
  // <br> gives it something to center around from the very first click,
  // without affecting textContent (so the empty-check on commit still works).
  if (!div.textContent) div.innerHTML = "<br>";
  div.focus();
  document.execCommand("selectAll", false, null);
  // The size stepper is a simple step counter, not a read of this
  // particular label's actual formatting - reset it each time a different
  // piece of text starts being edited, same tradeoff the card description's
  // own font-size stepper already makes.
  wbTextSizeIndex = WB_TEXT_SIZE_NORMAL_INDEX;
  updateWbTextSizeButtons();
  // Shows Bold/Italic/Underline/size even though editing a shape's label
  // (or a standalone box via double-click) never switches wbTool to "text" -
  // see updateWbToolbarGroups.
  wbTextEditActive = true;
  updateWbToolbarGroups();
}
function wbCommitTextEdit(shape, div, standalone) {
  const plainText = div.textContent.replace(/\r\n?/g, "\n").trim();
  div.contentEditable = "false";
  div.parentElement.classList.remove("wb-text-editor-editing");
  wbTextEditActive = false;
  updateWbToolbarGroups();
  // A standalone text box with nothing typed into it (switched tools,
  // pressed Escape, or backspaced everything back out) isn't a real shape -
  // it was never anything but an empty placeholder, so it shouldn't linger
  // as an invisible, still-selectable/draggable ghost. A fillable shape's
  // label going back to empty is fine as-is - that shape was already real.
  if (standalone && !plainText) {
    const wb = getActiveWhiteboard();
    wb.shapes = wb.shapes.filter((s) => s.id !== shape.id);
    wbSelectedShapeIds.delete(shape.id);
    renderWhiteboardCanvas();
    // Keeps history consistent with live state - the box's creation was its
    // own undo step (from the Text tool's commitDrawShape), so its removal
    // needs one too, or a later Undo could resurrect this empty ghost.
    wbPushHistory();
    saveBoard();
    return;
  }
  // Stored as HTML (same approach as the card description RTE) rather than
  // plain textContent, so Bold/Italic/Underline/size - all applied live via
  // execCommand while editing - actually survive a commit/redisplay round
  // trip instead of silently reverting to plain text the moment the box
  // loses focus.
  shape.text = plainText ? div.innerHTML : "";
  if (standalone) {
    div.style.cursor = "move";
  } else {
    div.parentElement.style.pointerEvents = "none";
    div.style.pointerEvents = "none";
  }
  renderWhiteboardCanvas();
  wbPushHistory();
  saveBoard();
}

// A multi-shape selection just gets a dashed outline per shape (drag-to-
// move-the-group only) - full resize handles only make sense, and only
// show, when exactly one shape is selected.
function renderWhiteboardMultiOutline(g, shape) {
  const box = wbShapeBox(shape);
  const outline = document.createElementNS(WB_SVG_NS, "rect");
  outline.setAttribute("x", box.x - 4);
  outline.setAttribute("y", box.y - 4);
  outline.setAttribute("width", box.width + 8);
  outline.setAttribute("height", box.height + 8);
  outline.setAttribute("fill", "none");
  outline.setAttribute("stroke", WB_SELECT_COLOR);
  outline.setAttribute("stroke-width", 1.5);
  outline.setAttribute("stroke-dasharray", "4 3");
  outline.classList.add("wb-selection-el");
  outline.style.pointerEvents = "none";
  g.appendChild(outline);
}

function renderWhiteboardSelection() {
  wbUpdateLayerButtonsState();
  document.querySelectorAll(".wb-selection-el").forEach((el) => el.remove());
  // Handles are only safe to show in Select mode - a drawing tool's own
  // canvas mousedown needs to see every click as "start a new shape," not
  // have it intercepted by a leftover handle from the last selection.
  if (wbTool !== "select") return;
  if (wbSelectedShapeIds.size === 0) return;
  const wb = getActiveWhiteboard();
  // Drop ids that no longer resolve to a real shape (deleted, page/board switch, etc.)
  const shapes = [...wbSelectedShapeIds].map((id) => wb.shapes.find((s) => s.id === id)).filter(Boolean);
  wbSelectedShapeIds = new Set(shapes.map((s) => s.id));
  if (shapes.length === 0) return;
  const g = ensureWhiteboardRootG();

  if (shapes.length > 1) {
    shapes.forEach((s) => renderWhiteboardMultiOutline(g, s));
    return;
  }
  const shape = shapes[0];

  if (shape.type === "branch") {
    [["top", shape.x1, shape.y1], ["left", shape.x2, shape.y2], ["right", shape.x3, shape.y3]].forEach(([handleName, cx, cy]) => {
      const size = 9;
      const dot = document.createElementNS(WB_SVG_NS, "circle");
      dot.setAttribute("cx", cx);
      dot.setAttribute("cy", cy);
      dot.setAttribute("r", size / 2);
      dot.setAttribute("fill", "#ffffff");
      dot.setAttribute("stroke", WB_SELECT_COLOR);
      dot.setAttribute("stroke-width", 1.5);
      dot.classList.add("wb-selection-el");
      dot.style.cursor = "pointer";
      dot.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        const field = handleName === "top" ? "topAttach" : handleName === "left" ? "leftAttach" : "rightAttach";
        shape[field] = null;
        wbResizeState = { id: shape.id, handle: "branch-" + handleName };
      });
      g.appendChild(dot);
    });
    // A small square handle on the stem, vertical-drag only, for raising or
    // lowering where the branch splits (shape.forkT).
    const fork = wbBranchForkPoint(shape);
    const fsize = 8;
    const forkHandle = document.createElementNS(WB_SVG_NS, "rect");
    forkHandle.setAttribute("x", fork.x - fsize / 2);
    forkHandle.setAttribute("y", fork.y - fsize / 2);
    forkHandle.setAttribute("width", fsize);
    forkHandle.setAttribute("height", fsize);
    forkHandle.setAttribute("fill", "#ffffff");
    forkHandle.setAttribute("stroke", WB_SELECT_COLOR);
    forkHandle.setAttribute("stroke-width", 1.5);
    forkHandle.classList.add("wb-selection-el");
    forkHandle.style.cursor = "ns-resize";
    forkHandle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      wbResizeState = { id: shape.id, handle: "branch-fork" };
    });
    g.appendChild(forkHandle);
    return;
  }

  if (WB_VECTOR_TOOLS.has(shape.type)) {
    [["start", shape.x1, shape.y1], ["end", shape.x2, shape.y2]].forEach(([handleName, cx, cy]) => {
      const size = 9;
      const dot = document.createElementNS(WB_SVG_NS, "circle");
      dot.setAttribute("cx", cx);
      dot.setAttribute("cy", cy);
      dot.setAttribute("r", size / 2);
      dot.setAttribute("fill", "#ffffff");
      dot.setAttribute("stroke", WB_SELECT_COLOR);
      dot.setAttribute("stroke-width", 1.5);
      dot.classList.add("wb-selection-el");
      dot.style.cursor = "pointer";
      dot.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        const field = handleName === "start" ? "startAttach" : "endAttach";
        shape[field] = null; // detach while actively dragging; wbAttachEndpoint re-attaches on release if it lands on something
        wbResizeState = { id: shape.id, handle: handleName };
      });
      g.appendChild(dot);
    });
    if (shape.type === "blockArrow") {
      // A pair of handles, one on each side of the shaft's midpoint, for
      // adjusting thickness independently of the start/end (length/
      // direction) handles above - both drive the same shape.thickness
      // value (the shape is symmetric about its centerline either way), so
      // they share the same "width" resize handling regardless of which
      // side you grab.
      const perp = wbBlockArrowPerp(shape);
      const midX = (shape.x1 + shape.x2) / 2;
      const midY = (shape.y1 + shape.y2) / 2;
      const thickness = shape.thickness || WB_BLOCK_ARROW_DEFAULT_THICKNESS;
      [1, -1].forEach((side) => {
        const size = 9;
        const dot = document.createElementNS(WB_SVG_NS, "circle");
        dot.setAttribute("cx", midX + perp.x * thickness * side);
        dot.setAttribute("cy", midY + perp.y * thickness * side);
        dot.setAttribute("r", size / 2);
        dot.setAttribute("fill", "#ffffff");
        dot.setAttribute("stroke", WB_SELECT_COLOR);
        dot.setAttribute("stroke-width", 1.5);
        dot.classList.add("wb-selection-el");
        dot.style.cursor = "ns-resize";
        dot.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          wbResizeState = { id: shape.id, handle: "width" };
        });
        g.appendChild(dot);
      });
    }
    return;
  }

  const outline = document.createElementNS(WB_SVG_NS, "rect");
  outline.setAttribute("x", shape.x - 4);
  outline.setAttribute("y", shape.y - 4);
  outline.setAttribute("width", shape.width + 8);
  outline.setAttribute("height", shape.height + 8);
  outline.setAttribute("fill", "none");
  outline.setAttribute("stroke", WB_SELECT_COLOR);
  outline.setAttribute("stroke-width", 1.5);
  outline.setAttribute("stroke-dasharray", "4 3");
  outline.classList.add("wb-selection-el");
  outline.style.pointerEvents = "none";
  g.appendChild(outline);

  const corners = {
    nw: [shape.x, shape.y],
    ne: [shape.x + shape.width, shape.y],
    sw: [shape.x, shape.y + shape.height],
    se: [shape.x + shape.width, shape.y + shape.height],
  };
  Object.entries(corners).forEach(([corner, [cx, cy]]) => {
    const size = 8;
    const handle = document.createElementNS(WB_SVG_NS, "rect");
    handle.setAttribute("x", cx - size / 2);
    handle.setAttribute("y", cy - size / 2);
    handle.setAttribute("width", size);
    handle.setAttribute("height", size);
    handle.setAttribute("fill", "#ffffff");
    handle.setAttribute("stroke", WB_SELECT_COLOR);
    handle.setAttribute("stroke-width", 1.5);
    handle.classList.add("wb-selection-el");
    handle.style.cursor = corner + "-resize";
    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      const startWorld = wbClientToWorld(e.clientX, e.clientY);
      wbResizeState = { id: shape.id, handle: corner, origX: shape.x, origY: shape.y, origW: shape.width, origH: shape.height, startX: startWorld.x, startY: startWorld.y };
    });
    g.appendChild(handle);
  });
}

// How many page-tiles wide/tall the content currently spans, as a
// [minCol, maxCol] / [minRow, maxRow] range (tile 0 = x:[0,WB_PAGE_WIDTH),
// y:[0,WB_PAGE_HEIGHT) - negative tiles are just as valid, content can grow
// in any direction). No shapes yet = exactly the single origin tile.
function wbComputePageGrid(wb) {
  if (!wb.shapes.length) return { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  wb.shapes.forEach((s) => {
    const box = wbShapeBox(s);
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  });
  return {
    minCol: Math.floor(minX / WB_PAGE_WIDTH),
    maxCol: Math.ceil(maxX / WB_PAGE_WIDTH) - 1,
    minRow: Math.floor(minY / WB_PAGE_HEIGHT),
    maxRow: Math.ceil(maxY / WB_PAGE_HEIGHT) - 1,
  };
}
function renderWhiteboardPageGrid(g, wb) {
  const grid = wbComputePageGrid(wb);
  const left = grid.minCol * WB_PAGE_WIDTH;
  const right = (grid.maxCol + 1) * WB_PAGE_WIDTH;
  const top = grid.minRow * WB_PAGE_HEIGHT;
  const bottom = (grid.maxRow + 1) * WB_PAGE_HEIGHT;

  // The peach fill only covers the page-tile area itself - everything past
  // it is the canvas wrap's own (themed) background, so "in bounds" vs "out
  // of bounds" is visually obvious at a glance, not just a faint gridline.
  const fill = document.createElementNS(WB_SVG_NS, "rect");
  fill.setAttribute("x", left);
  fill.setAttribute("y", top);
  fill.setAttribute("width", right - left);
  fill.setAttribute("height", bottom - top);
  fill.setAttribute("fill", "#FFD19C");
  fill.setAttribute("pointer-events", "none");
  g.appendChild(fill);

  if (wbGridVisible) {
    const gridFill = document.createElementNS(WB_SVG_NS, "rect");
    gridFill.setAttribute("x", left);
    gridFill.setAttribute("y", top);
    gridFill.setAttribute("width", right - left);
    gridFill.setAttribute("height", bottom - top);
    gridFill.setAttribute("fill", "url(#wb-grid-pattern)");
    gridFill.setAttribute("pointer-events", "none");
    g.appendChild(gridFill);
  }

  for (let col = grid.minCol; col <= grid.maxCol + 1; col++) {
    const x = col * WB_PAGE_WIDTH;
    const line = document.createElementNS(WB_SVG_NS, "line");
    line.setAttribute("x1", x); line.setAttribute("y1", top);
    line.setAttribute("x2", x); line.setAttribute("y2", bottom);
    line.setAttribute("class", "wb-page-grid-line");
    g.appendChild(line);
  }
  for (let row = grid.minRow; row <= grid.maxRow + 1; row++) {
    const y = row * WB_PAGE_HEIGHT;
    const line = document.createElementNS(WB_SVG_NS, "line");
    line.setAttribute("x1", left); line.setAttribute("y1", y);
    line.setAttribute("x2", right); line.setAttribute("y2", y);
    line.setAttribute("class", "wb-page-grid-line");
    g.appendChild(line);
  }
}

const WB_PAGE_TOP_MARGIN = 50;
// A page whose viewport is still null (see newWhiteboardPage/
// normalizeWhiteboardPage) gets its real starting position picked here,
// the moment it's actually about to be drawn - the canvas-wrap is
// guaranteed visible/measurable at that point, unlike at page-creation or
// data-load time. Runs once per page: after this, x/y are real numbers and
// this is a no-op on every later render (including ones mid-pan/zoom).
function wbEnsurePageViewportCentered(wb) {
  if (wb.viewport.x !== null && wb.viewport.y !== null) return;
  const wrapWidth = whiteboardCanvasWrapEl.getBoundingClientRect().width;
  wb.viewport.x = (wrapWidth - WB_PAGE_WIDTH) / 2;
  wb.viewport.y = WB_PAGE_TOP_MARGIN;
}

// Standalone text boxes always paint in front of every other shape type,
// regardless of draw order or wb.shapes' actual stored order - so a
// rectangle (or anything else) drawn after a text box never visually covers
// it. A stable partition, not a mutation of wb.shapes itself: relative
// order within each of the two layers is untouched, which is also what
// wbMoveShapeLayer's Bring Forward/Send Backward reorder within.
function wbShapesInPaintOrder(wb) {
  const shapes = wb.shapes.filter((s) => s.type !== "text");
  const texts = wb.shapes.filter((s) => s.type === "text");
  return shapes.concat(texts);
}

// A shape's own layer-mates - every other shape sharing its paint-order
// group (see wbShapesInPaintOrder) - Bring Forward/Send Backward swap a
// shape with its nearest neighbor within this group only, so a shape can
// never leapfrog into the other layer entirely (e.g. a regular shape
// "brought forward" repeatedly still can't end up in front of text).
function wbShapeLayerMates(wb, shape) {
  const isText = shape.type === "text";
  return wb.shapes.filter((s) => (s.type === "text") === isText);
}
function wbMoveShapeLayer(shape, direction) {
  const wb = getActiveWhiteboard();
  const mates = wbShapeLayerMates(wb, shape);
  const swapWith = mates[mates.indexOf(shape) + direction];
  if (!swapWith) return;
  const i = wb.shapes.indexOf(shape);
  const j = wb.shapes.indexOf(swapWith);
  wb.shapes[i] = swapWith;
  wb.shapes[j] = shape;
  renderWhiteboardCanvas();
  wbPushHistory();
  saveBoard();
}

// A distinctly-colored guide line (not the grid's own dashed lines) shown
// only while wbCenterSnapActive is true - i.e. only during the exact drag
// frames where the dragged shape(s) are actually snapped onto the page's
// vertical center line, not merely near it. Drawn after every shape so it
// stays visible on top instead of being covered by whatever's being
// dragged over it.
function renderWbCenterSnapGuide(g, wb) {
  if (!wbCenterSnapActive) return;
  const grid = wbComputePageGrid(wb);
  const x = WB_PAGE_WIDTH / 2;
  const line = document.createElementNS(WB_SVG_NS, "line");
  line.setAttribute("x1", x);
  line.setAttribute("y1", grid.minRow * WB_PAGE_HEIGHT);
  line.setAttribute("x2", x);
  line.setAttribute("y2", (grid.maxRow + 1) * WB_PAGE_HEIGHT);
  line.setAttribute("stroke", "#ff2d95");
  line.setAttribute("stroke-width", 1.5);
  line.setAttribute("pointer-events", "none");
  g.appendChild(line);
}

function renderWhiteboardCanvas() {
  const g = ensureWhiteboardRootG();
  g.innerHTML = "";
  const wb = getActiveWhiteboard();
  wbEnsurePageViewportCentered(wb);
  resolveWbAttachments(wb);
  renderWhiteboardPageGrid(g, wb);
  wbShapesInPaintOrder(wb).forEach((shape) => g.appendChild(createShapeElement(shape)));
  renderWbCenterSnapGuide(g, wb);
  applyWhiteboardTransform();
  renderWhiteboardSelection();
}

function startDrawShape(e) {
  const start = wbClientToWorld(e.clientX, e.clientY);
  // `current` is populated right away (not left null until the first
  // mousemove) so a plain click with zero movement - the whole point of the
  // Text tool - still has a valid zero-size box/segment to commit on mouseup
  // instead of silently doing nothing.
  const current = (WB_VECTOR_TOOLS.has(wbTool) || wbTool === "branch")
    ? { x1: start.x, y1: start.y, x2: start.x, y2: start.y }
    : { x: start.x, y: start.y, width: 0, height: 0 };
  wbDrawState = { type: wbTool, startX: start.x, startY: start.y, el: null, current };
}
function updateDrawShape(e) {
  const cur = wbClientToWorld(e.clientX, e.clientY);
  let previewShape;
  if (WB_VECTOR_TOOLS.has(wbDrawState.type) || wbDrawState.type === "branch") {
    // Line/plainLine/blockArrow (and a branch's initial two-point drag) are
    // all drawn point-to-point rather than as
    // a box, so "even ratio" for these means the art-program-standard
    // angle snap instead - hold Shift to lock the drag to 45-degree
    // increments (straight horizontal/vertical/diagonal) at the current
    // drag distance.
    let endX = cur.x, endY = cur.y;
    if (e.shiftKey) {
      const dx = cur.x - wbDrawState.startX;
      const dy = cur.y - wbDrawState.startY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const step = Math.PI / 4;
        const angle = Math.round(Math.atan2(dy, dx) / step) * step;
        endX = wbDrawState.startX + Math.cos(angle) * dist;
        endY = wbDrawState.startY + Math.sin(angle) * dist;
      }
    }
    const current = { x1: wbDrawState.startX, y1: wbDrawState.startY, x2: endX, y2: endY };
    previewShape = { id: "__preview__", type: wbDrawState.type, ...current };
    wbDrawState.current = current;
  } else {
    let dx = cur.x - wbDrawState.startX;
    let dy = cur.y - wbDrawState.startY;
    // Shift locks rect/ellipse/diamond to a square as they're drawn -
    // whichever axis has dragged further wins, keeping the drag anchored
    // at the original start corner.
    if (e.shiftKey) {
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      dx = (dx < 0 ? -1 : 1) * side;
      dy = (dy < 0 ? -1 : 1) * side;
    }
    const current = {
      x: Math.min(wbDrawState.startX, wbDrawState.startX + dx),
      y: Math.min(wbDrawState.startY, wbDrawState.startY + dy),
      width: Math.abs(dx),
      height: Math.abs(dy),
    };
    previewShape = { id: "__preview__", type: wbDrawState.type, ...current };
    wbDrawState.current = current;
  }
  // The preview otherwise always renders with the default solid fill,
  // regardless of the tool's current fill mode - misleading while you're
  // still dragging out a shape that's actually going to land outline-only.
  if (WB_FILLABLE_TOOLS.has(previewShape.type)) previewShape.noFill = wbNoFillTools.has(previewShape.type);
  if (wbDrawState.el) wbDrawState.el.remove();
  const el = createShapeElement(previewShape);
  el.style.pointerEvents = "none";
  el.setAttribute("stroke-dasharray", "4 3");
  ensureWhiteboardRootG().appendChild(el);
  wbDrawState.el = el;
}
function commitDrawShape() {
  const state = wbDrawState;
  wbDrawState = null;
  if (!state) return;
  if (state.el) state.el.remove();
  const cur = state.current;
  if (!cur) return;
  const wb = getActiveWhiteboard();
  let shape;
  if (state.type === "branch") {
    // The drag only ever defines a top point and one reference bottom
    // point (same gesture as a line) - the two branch endpoints are
    // auto-spread symmetrically around that bottom point, then adjustable
    // afterward via their own handles. Spread perpendicular to the actual
    // drag direction (not always horizontal) so dragging sideways or
    // diagonally produces a branch that's actually oriented that way,
    // instead of a sideways stem with an always-horizontal fork.
    const dragDx = cur.x2 - cur.x1, dragDy = cur.y2 - cur.y1;
    const dragLen = Math.hypot(dragDx, dragDy);
    if (dragLen < 4) return;
    const spread = 55;
    const perpX = -dragDy / dragLen, perpY = dragDx / dragLen;
    shape = {
      id: crypto.randomUUID(), type: "branch",
      x1: cur.x1, y1: cur.y1,
      x2: cur.x2 + perpX * spread, y2: cur.y2 + perpY * spread,
      x3: cur.x2 - perpX * spread, y3: cur.y2 - perpY * spread,
      forkT: 0.5, style: wbBranchStyle,
      topAttach: null, leftAttach: null, rightAttach: null,
    };
    wbAttachBranchEndpoint(shape, "top", wb, shape.x1, shape.y1);
    wbAttachBranchEndpoint(shape, "left", wb, shape.x2, shape.y2);
    wbAttachBranchEndpoint(shape, "right", wb, shape.x3, shape.y3);
  } else if (WB_VECTOR_TOOLS.has(state.type)) {
    // A click with no real drag reads as a misfire, not an intentional arrow.
    if (Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) < 4) return;
    shape = { id: crypto.randomUUID(), type: state.type, x1: cur.x1, y1: cur.y1, x2: cur.x2, y2: cur.y2, startAttach: null, endAttach: null };
    if (state.type === "blockArrow") {
      // Same proportional formula the old fixed calc used, just captured as
      // an explicit starting value instead of staying tied to length forever.
      const length = Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1);
      shape.thickness = Math.min(length * 0.15, WB_BLOCK_ARROW_DEFAULT_THICKNESS);
    }
    if (WB_SNAP_SOURCE_TYPES.has(state.type)) {
      wbAttachEndpoint(shape, "start", wb, cur.x1, cur.y1);
      wbAttachEndpoint(shape, "end", wb, cur.x2, cur.y2);
    }
  } else if (state.type === "text") {
    let { x, y, width, height } = cur;
    // A plain click (no real drag) with the Text tool places a default-
    // sized box ready to type into immediately, rather than being discarded
    // as a misfire the way a too-small rectangle/ellipse would be.
    if (width < 4 && height < 4) { width = 160; height = 32; }
    else if (width < 4 || height < 4) { return; }
    shape = { id: crypto.randomUUID(), type: "text", x, y, width, height, text: "" };
  } else {
    if (cur.width < 4 || cur.height < 4) return;
    shape = { id: crypto.randomUUID(), type: state.type, x: cur.x, y: cur.y, width: cur.width, height: cur.height };
  }
  if (WB_FILLABLE_TOOLS.has(shape.type)) shape.noFill = wbNoFillTools.has(shape.type);
  wb.shapes.push(shape);
  wbSelectedShapeIds = new Set([shape.id]);
  // Reverts to Select right after placing one shape - lands you straight on
  // its resize/reposition handles - unless this tool's been right-click
  // locked to keep placing several of the same shape in a row (text always
  // stays on its own tool regardless, for fast repeated box placement).
  if (shape.type !== "text" && !wbLockedTools.has(shape.type)) setWbTool("select");
  renderWhiteboardCanvas();
  wbPushHistory();
  saveBoard();
  if (shape.type === "text") {
    const div = document.querySelector(`.wb-text-editor[data-shape-id="${shape.id}"]`);
    if (div) wbEnterTextEdit(shape, div);
  }
}

// ----- Whiteboard: freehand pen -----

function wbStartPenStroke(e) {
  const p = wbClientToWorld(e.clientX, e.clientY);
  wbPenDrawState = { points: [p], el: null };
}
function wbUpdatePenStroke(e) {
  const p = wbClientToWorld(e.clientX, e.clientY);
  const pts = wbPenDrawState.points;
  const last = pts[pts.length - 1];
  // Distance-based thinning (~2 screen px, scaled for zoom) - without this,
  // a point got recorded on every single mousemove with no minimum
  // spacing, so a slow, careful stroke could pile up thousands of points
  // that add nothing visible (wbPenPathD's quadratic-curve smoothing
  // already interpolates between points) but cost real time to re-render
  // on every page switch. Skipping near-duplicate points keeps strokes
  // looking identical while keeping their data small.
  const minDist = 2 / getActiveWhiteboard().viewport.zoom;
  if (last && Math.hypot(p.x - last.x, p.y - last.y) < minDist) return;
  pts.push(p);
  if (wbPenDrawState.el) wbPenDrawState.el.remove();
  const el = createShapeElement({ id: "__preview__", type: "pen", points: pts, color: wbPenColor, width: WB_PEN_WIDTHS[wbPenWidthIndex] });
  ensureWhiteboardRootG().appendChild(el);
  wbPenDrawState.el = el;
}
function wbCommitPenStroke() {
  const state = wbPenDrawState;
  wbPenDrawState = null;
  if (!state) return;
  if (state.el) state.el.remove();
  // A plain click (or a real-but-tiny wobble) isn't an intentional stroke.
  if (state.points.length < 2) return;
  const xs = state.points.map((p) => p.x);
  const ys = state.points.map((p) => p.y);
  if (Math.max(...xs) - Math.min(...xs) < 2 && Math.max(...ys) - Math.min(...ys) < 2) return;
  const wb = getActiveWhiteboard();
  const shape = { id: crypto.randomUUID(), type: "pen", points: state.points, color: wbPenColor, width: WB_PEN_WIDTHS[wbPenWidthIndex] };
  wb.shapes.push(shape);
  wbSelectedShapeIds = new Set([shape.id]);
  renderWhiteboardCanvas();
  wbPushHistory();
  saveBoard();
}

// ----- Whiteboard: undo/redo -----

// Session-only (never persisted, never saved to disk) - a plain snapshot-
// per-committed-action stack, keyed by whiteboard page id so switching
// pages doesn't carry undo history over, matching the plan. A shape is
// always plain JSON-shaped data (no DOM refs/functions), so a deep clone is
// just parse(stringify(...)) - simplest possible correct snapshot.
const WB_HISTORY_LIMIT = 50;
let wbHistoryByPage = {};
function wbSnapshotShapes(wb) {
  return JSON.parse(JSON.stringify(wb.shapes));
}
function wbGetHistory(pageId) {
  if (!wbHistoryByPage[pageId]) {
    const wb = board.whiteboards.find((w) => w.id === pageId);
    wbHistoryByPage[pageId] = { stack: [wbSnapshotShapes(wb)], index: 0 };
  }
  return wbHistoryByPage[pageId];
}
// Called once per committed action (drawing a shape, finishing a drag/
// resize, deleting, recoloring, clearing the page - never per mousemove,
// or every drag frame would become its own undo step).
function wbPushHistory() {
  const wb = getActiveWhiteboard();
  if (!wb) return;
  const h = wbGetHistory(wb.id);
  h.stack = h.stack.slice(0, h.index + 1); // drop any redo entries past the current point
  h.stack.push(wbSnapshotShapes(wb));
  if (h.stack.length > WB_HISTORY_LIMIT) h.stack.shift();
  h.index = h.stack.length - 1;
}
function wbUndo() {
  const wb = getActiveWhiteboard();
  if (!wb) return;
  const h = wbGetHistory(wb.id);
  if (h.index <= 0) return;
  h.index -= 1;
  wb.shapes = JSON.parse(JSON.stringify(h.stack[h.index]));
  wbClearSelection();
  renderWhiteboardCanvas();
  saveBoard();
}
function wbRedo() {
  const wb = getActiveWhiteboard();
  if (!wb) return;
  const h = wbGetHistory(wb.id);
  if (h.index >= h.stack.length - 1) return;
  h.index += 1;
  wb.shapes = JSON.parse(JSON.stringify(h.stack[h.index]));
  wbClearSelection();
  renderWhiteboardCanvas();
  saveBoard();
}

// ----- Whiteboard: copy/paste -----

// Session-only, never persisted - a plain deep-cloned snapshot of whatever
// was selected at copy time, same "not the real objects" precaution as the
// undo history snapshots (so nothing pasted could ever end up sharing a
// live reference back to the originals).
let wbClipboard = [];
let wbPasteCount = 0;
const WB_PASTE_OFFSET = 24;

function wbCopySelection() {
  const wb = getActiveWhiteboard();
  if (!wb || wbSelectedShapeIds.size === 0) return;
  wbClipboard = wb.shapes.filter((s) => wbSelectedShapeIds.has(s.id)).map((s) => JSON.parse(JSON.stringify(s)));
  wbPasteCount = 0;
}

// Each repeated Ctrl+V (without copying again in between) steps the offset
// further, so repeated pastes stagger diagonally instead of stacking
// exactly on top of each other and each other's own previous paste.
async function wbPasteClipboard() {
  if (!wbClipboard.length) return;
  const wb = getActiveWhiteboard();
  if (!wb) return;
  wbPasteCount += 1;
  const offset = WB_PASTE_OFFSET * wbPasteCount;
  const newShapes = [];
  for (const orig of wbClipboard) {
    const copy = JSON.parse(JSON.stringify(orig));
    const oldId = copy.id;
    copy.id = crypto.randomUUID();
    if (copy.type === "branch") {
      copy.x1 += offset; copy.y1 += offset;
      copy.x2 += offset; copy.y2 += offset;
      copy.x3 += offset; copy.y3 += offset;
      copy.topAttach = null;
      copy.leftAttach = null;
      copy.rightAttach = null;
    } else if (WB_VECTOR_TOOLS.has(copy.type)) {
      copy.x1 += offset; copy.y1 += offset;
      copy.x2 += offset; copy.y2 += offset;
      // A copy shouldn't inherit an attachment to whatever shape the
      // original happened to be snapped to - it's landing in new,
      // unrelated territory, possibly nowhere near that shape anymore.
      copy.startAttach = null;
      copy.endAttach = null;
    } else if (copy.type === "pen") {
      copy.points = copy.points.map((p) => ({ x: p.x + offset, y: p.y + offset }));
    } else {
      copy.x += offset; copy.y += offset;
    }
    if (copy.type === "photo") {
      // Each photo shape owns its own file on disk, keyed by its own id -
      // a pasted copy needs a genuine duplicate file under its new id, not
      // a second shape pointing at the original's file (deleting either
      // one would then break the other).
      try {
        const base64 = await invoke("load_wb_photo", { photoId: oldId });
        await invoke("save_wb_photo", { photoId: copy.id, dataBase64: base64 });
        appData.wbPhotoRegistry[copy.id] = { originalName: copy.originalName, boardName: board.name, pageName: wb.name };
      } catch (err) {
        continue; // source file unreadable - skip this one rather than paste a guaranteed-broken copy
      }
    }
    newShapes.push(copy);
  }
  if (!newShapes.length) return;
  newShapes.forEach((s) => wb.shapes.push(s));
  wbSelectedShapeIds = new Set(newShapes.map((s) => s.id));
  renderWhiteboardCanvas();
  wbPushHistory();
  saveBoard();
}
document.addEventListener("keydown", (e) => {
  if (!whiteboardActive || !(e.ctrlKey || e.metaKey)) return;
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
  const key = e.key.toLowerCase();
  if (key === "z" && !e.shiftKey) { e.preventDefault(); wbUndo(); return; }
  if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); wbRedo(); }
});
document.getElementById("wb-undo-btn").addEventListener("click", wbUndo);
document.getElementById("wb-redo-btn").addEventListener("click", wbRedo);

// ----- Whiteboard: marquee (rubber-band) selection -----

// Drawn directly in the SVG's own screen space (not inside the pan/zoom
// <g>), since it's a pure screen-space drag rectangle - only converted to
// world space once, at the end, to test against shape bounds.
function startMarquee(e) {
  const rect = whiteboardSvg.getBoundingClientRect();
  wbMarqueeState = { startX: e.clientX - rect.left, startY: e.clientY - rect.top };
  wbClearSelection();
}
function updateMarquee(e) {
  const rect = whiteboardSvg.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const x = Math.min(wbMarqueeState.startX, cx);
  const y = Math.min(wbMarqueeState.startY, cy);
  const width = Math.abs(cx - wbMarqueeState.startX);
  const height = Math.abs(cy - wbMarqueeState.startY);
  wbMarqueeState.rect = { x, y, width, height };
  if (!wbMarqueeEl) {
    wbMarqueeEl = document.createElementNS(WB_SVG_NS, "rect");
    wbMarqueeEl.id = "wb-marquee";
    whiteboardSvg.appendChild(wbMarqueeEl);
  }
  wbMarqueeEl.setAttribute("x", x);
  wbMarqueeEl.setAttribute("y", y);
  wbMarqueeEl.setAttribute("width", width);
  wbMarqueeEl.setAttribute("height", height);
}
function commitMarquee() {
  if (wbMarqueeEl) { wbMarqueeEl.remove(); wbMarqueeEl = null; }
  const state = wbMarqueeState;
  wbMarqueeState = null;
  // A click with no real drag just deselects (already cleared at drag-start).
  if (!state || !state.rect || state.rect.width < 3 || state.rect.height < 3) return;
  const wb = getActiveWhiteboard();
  const svgRect = whiteboardSvg.getBoundingClientRect();
  const w1 = wbClientToWorld(svgRect.left + state.rect.x, svgRect.top + state.rect.y);
  const w2 = wbClientToWorld(svgRect.left + state.rect.x + state.rect.width, svgRect.top + state.rect.y + state.rect.height);
  const minX = Math.min(w1.x, w2.x), maxX = Math.max(w1.x, w2.x);
  const minY = Math.min(w1.y, w2.y), maxY = Math.max(w1.y, w2.y);
  const picked = wb.shapes.filter((s) => {
    const box = wbShapeBox(s);
    return box.x < maxX && box.x + box.width > minX && box.y < maxY && box.y + box.height > minY;
  });
  wbSelectedShapeIds = new Set(picked.map((s) => s.id));
  renderWhiteboardSelection();
}

// Spacebar held = temporary pan override on the Select tool (Figma-style),
// so a plain click-drag stays free for marquee selection.
document.addEventListener("keydown", (e) => {
  if (!whiteboardActive || e.code !== "Space") return;
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
  e.preventDefault();
  if (!wbSpaceDown) { wbSpaceDown = true; whiteboardSvg.style.cursor = "grab"; }
});
document.addEventListener("keyup", (e) => {
  if (e.code !== "Space") return;
  wbSpaceDown = false;
  if (!wbPanState) whiteboardSvg.style.cursor = "";
});
document.addEventListener("keydown", (e) => {
  if (!whiteboardActive || e.key.toLowerCase() !== "a" || !(e.ctrlKey || e.metaKey)) return;
  const active = document.activeElement;
  // Editing a whiteboard text box (or any other field) should still get
  // the browser's normal select-all-text-in-this-field behavior, not have
  // it hijacked into selecting every shape on the page.
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
  e.preventDefault();
  if (wbTool !== "select") setWbTool("select");
  const wb = getActiveWhiteboard();
  wbSelectedShapeIds = new Set(wb.shapes.map((s) => s.id));
  renderWhiteboardSelection();
});
document.addEventListener("keydown", (e) => {
  if (!whiteboardActive || e.key.toLowerCase() !== "c" || !(e.ctrlKey || e.metaKey)) return;
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
  if (wbSelectedShapeIds.size === 0) return;
  e.preventDefault();
  wbCopySelection();
});
whiteboardSvg.addEventListener("mousedown", (e) => {
  // Middle-click pans regardless of tool, same as most diagram/design apps.
  if (e.button === 1) {
    e.preventDefault();
    const wb = getActiveWhiteboard();
    wbPanState = { startX: e.clientX, startY: e.clientY, origX: wb.viewport.x, origY: wb.viewport.y };
    whiteboardSvg.classList.add("panning");
    whiteboardSvg.style.cursor = "grabbing";
    return;
  }
  if (e.button !== 0) return;
  if (wbSpaceDown) {
    const wb = getActiveWhiteboard();
    wbPanState = { startX: e.clientX, startY: e.clientY, origX: wb.viewport.x, origY: wb.viewport.y };
    whiteboardSvg.classList.add("panning");
    whiteboardSvg.style.cursor = "grabbing";
    return;
  }
  if (wbTool === "pen") {
    wbStartPenStroke(e);
    return;
  }
  if (wbTool !== "select") {
    startDrawShape(e);
    return;
  }
  startMarquee(e);
});
document.addEventListener("mousemove", (e) => {
  if (wbPanState) {
    const wb = getActiveWhiteboard();
    wb.viewport.x = wbPanState.origX + (e.clientX - wbPanState.startX);
    wb.viewport.y = wbPanState.origY + (e.clientY - wbPanState.startY);
    applyWhiteboardTransform();
    return;
  }
  if (wbPenDrawState) { wbUpdatePenStroke(e); return; }
  if (wbDrawState) { updateDrawShape(e); return; }
  if (wbMarqueeState) { updateMarquee(e); return; }
  if (wbDragState) {
    const wb = getActiveWhiteboard();
    const cur = wbClientToWorld(e.clientX, e.clientY);
    let dx = cur.x - wbDragState.startX;
    const dy = cur.y - wbDragState.startY;
    // Snapping the dragged shapes' combined bounding box onto the page's
    // own vertical center line - a distinct, deliberate snap target (not
    // just whatever the grid happens to land on), so it gets its own
    // highlighted guide line instead of blending into the grid's dashed
    // lines. Reuses the existing snap-to-grid toggle rather than adding a
    // separate one, per how the feature was asked for ("when snap is on").
    wbCenterSnapActive = false;
    if (wbSnapToGrid) {
      let minX = Infinity, maxX = -Infinity;
      wbDragState.ids.forEach((id) => {
        const orig = wbDragState.origins[id];
        if (!orig) return;
        const box = wbShapeBox(orig);
        minX = Math.min(minX, box.x);
        maxX = Math.max(maxX, box.x + box.width);
      });
      if (minX !== Infinity) {
        const groupCenterX = (minX + maxX) / 2 + dx;
        const pageCenterX = WB_PAGE_WIDTH / 2;
        const threshold = 6 / wb.viewport.zoom; // ~6 screen px regardless of zoom
        if (Math.abs(groupCenterX - pageCenterX) <= threshold) {
          dx += pageCenterX - groupCenterX;
          wbCenterSnapActive = true;
        }
      }
    }
    wbDragState.ids.forEach((id) => {
      const shape = wb.shapes.find((s) => s.id === id);
      const orig = wbDragState.origins[id];
      if (!shape || !orig) return;
      if (shape.type === "pen") {
        shape.points = orig.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      } else if (shape.type === "branch") {
        shape.x1 = orig.x1 + dx; shape.y1 = orig.y1 + dy;
        shape.x2 = orig.x2 + dx; shape.y2 = orig.y2 + dy;
        shape.x3 = orig.x3 + dx; shape.y3 = orig.y3 + dy;
      } else if (WB_VECTOR_TOOLS.has(shape.type)) {
        shape.x1 = orig.x1 + dx; shape.y1 = orig.y1 + dy;
        shape.x2 = orig.x2 + dx; shape.y2 = orig.y2 + dy;
      } else {
        shape.x = orig.x + dx; shape.y = orig.y + dy;
      }
    });
    renderWhiteboardCanvas();
    return;
  }
  if (wbResizeState) {
    const wb = getActiveWhiteboard();
    const shape = wb.shapes.find((s) => s.id === wbResizeState.id);
    if (shape) {
      const cur = wbClientToWorld(e.clientX, e.clientY);
      if (WB_VECTOR_TOOLS.has(shape.type)) {
        if (wbResizeState.handle === "start") { shape.x1 = cur.x; shape.y1 = cur.y; }
        else if (wbResizeState.handle === "end") { shape.x2 = cur.x; shape.y2 = cur.y; }
        else if (wbResizeState.handle === "width") {
          const perp = wbBlockArrowPerp(shape);
          const midX = (shape.x1 + shape.x2) / 2;
          const midY = (shape.y1 + shape.y2) / 2;
          const length = Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) || 1;
          const dist = (cur.x - midX) * perp.x + (cur.y - midY) * perp.y;
          shape.thickness = Math.max(WB_BLOCK_ARROW_MIN_THICKNESS, Math.min(Math.abs(dist), length / 2 - 2));
        }
      } else if (shape.type === "branch") {
        if (wbResizeState.handle === "branch-top") { shape.x1 = cur.x; shape.y1 = cur.y; }
        else if (wbResizeState.handle === "branch-left") { shape.x2 = cur.x; shape.y2 = cur.y; }
        else if (wbResizeState.handle === "branch-right") { shape.x3 = cur.x; shape.y3 = cur.y; }
        else if (wbResizeState.handle === "branch-fork") {
          // Projects the cursor onto the actual stem line (top point toward
          // the midpoint of the two endpoints) rather than assuming that
          // line is vertical - matches wbBranchForkPoint's own math so the
          // handle tracks correctly no matter which way the branch points.
          const midX = (shape.x2 + shape.x3) / 2, midY = (shape.y2 + shape.y3) / 2;
          const stemDx = midX - shape.x1, stemDy = midY - shape.y1;
          const stemLenSq = stemDx * stemDx + stemDy * stemDy;
          const t = stemLenSq > 0 ? ((cur.x - shape.x1) * stemDx + (cur.y - shape.y1) * stemDy) / stemLenSq : 0.5;
          shape.forkT = Math.max(0.05, Math.min(0.95, t));
        }
      } else {
        const dx = cur.x - wbResizeState.startX;
        const dy = cur.y - wbResizeState.startY;
        const corner = wbResizeState.handle;
        let x = wbResizeState.origX, y = wbResizeState.origY, w = wbResizeState.origW, h = wbResizeState.origH;
        if (corner.includes("w")) { x = wbResizeState.origX + dx; w = wbResizeState.origW - dx; }
        if (corner.includes("e")) { w = wbResizeState.origW + dx; }
        if (corner.includes("n")) { y = wbResizeState.origY + dy; h = wbResizeState.origH - dy; }
        if (corner.includes("s")) { h = wbResizeState.origH + dy; }
        if (w < WB_MIN_SHAPE_SIZE) { if (corner.includes("w")) x = wbResizeState.origX + wbResizeState.origW - WB_MIN_SHAPE_SIZE; w = WB_MIN_SHAPE_SIZE; }
        if (h < WB_MIN_SHAPE_SIZE) { if (corner.includes("n")) y = wbResizeState.origY + wbResizeState.origH - WB_MIN_SHAPE_SIZE; h = WB_MIN_SHAPE_SIZE; }
        shape.x = x; shape.y = y; shape.width = w; shape.height = h;
      }
      renderWhiteboardCanvas();
    }
    return;
  }
});
document.addEventListener("mouseup", (e) => {
  if (wbPanState) {
    wbPanState = null;
    whiteboardSvg.classList.remove("panning");
    whiteboardSvg.style.cursor = wbSpaceDown ? "grab" : "";
    saveBoard();
    return;
  }
  if (wbPenDrawState) { wbCommitPenStroke(); return; }
  if (wbDrawState) { commitDrawShape(); return; }
  if (wbMarqueeState) { commitMarquee(); return; }
  if (wbDragState) {
    wbDragState = null;
    wbCenterSnapActive = false;
    renderWhiteboardCanvas();
    wbPushHistory();
    saveBoard();
    return;
  }
  if (wbResizeState) {
    const wb = getActiveWhiteboard();
    const shape = wb.shapes.find((s) => s.id === wbResizeState.id);
    if (shape && WB_SNAP_SOURCE_TYPES.has(shape.type)) {
      const cur = wbClientToWorld(e.clientX, e.clientY);
      wbAttachEndpoint(shape, wbResizeState.handle, wb, cur.x, cur.y);
      renderWhiteboardCanvas();
    } else if (shape && shape.type === "branch" && wbResizeState.handle.startsWith("branch-") && wbResizeState.handle !== "branch-fork") {
      const cur = wbClientToWorld(e.clientX, e.clientY);
      wbAttachBranchEndpoint(shape, wbResizeState.handle.replace("branch-", ""), wb, cur.x, cur.y);
      renderWhiteboardCanvas();
    }
    wbResizeState = null;
    wbPushHistory();
    saveBoard();
    return;
  }
});
document.addEventListener("keydown", (e) => {
  if (!whiteboardActive || wbSelectedShapeIds.size === 0) return;
  if (e.key !== "Delete" && e.key !== "Backspace") return;
  // Renaming a page (or anything else focused) should type Backspace
  // normally, not delete a shape behind it.
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
  const wb = getActiveWhiteboard();
  const removed = wb.shapes.filter((s) => wbSelectedShapeIds.has(s.id));
  wb.shapes = wb.shapes.filter((s) => !wbSelectedShapeIds.has(s.id));
  wbDeletePhotoFilesForShapes(removed);
  wbClearSelection();
  renderWhiteboardCanvas();
  wbPushHistory();
  saveBoard();
});

const WB_ZOOM_MIN = 0.25;
const WB_ZOOM_MAX = 3;
const wbZoomLevelBtn = document.getElementById("wb-zoom-level-btn");
function updateWbZoomDisplay() {
  wbZoomLevelBtn.textContent = Math.round(getActiveWhiteboard().viewport.zoom * 100) + "%";
}
// Shared by the wheel, the +/- buttons, and the reset-to-100% button - all
// three are really the same operation (pick a new zoom level, keep some
// screen point fixed under it) with a different source for the new level
// and the point to anchor on.
function wbSetZoomAt(newZoom, cx, cy) {
  const wb = getActiveWhiteboard();
  newZoom = Math.min(WB_ZOOM_MAX, Math.max(WB_ZOOM_MIN, newZoom));
  wb.viewport.x = cx - ((cx - wb.viewport.x) / wb.viewport.zoom) * newZoom;
  wb.viewport.y = cy - ((cy - wb.viewport.y) / wb.viewport.zoom) * newZoom;
  wb.viewport.zoom = newZoom;
  applyWhiteboardTransform();
  updateWbZoomDisplay();
  saveBoard();
}
function wbCanvasCenter() {
  const rect = whiteboardSvg.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}
whiteboardSvg.addEventListener("wheel", (e) => {
  e.preventDefault();
  const wb = getActiveWhiteboard();
  const rect = whiteboardSvg.getBoundingClientRect();
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  wbSetZoomAt(wb.viewport.zoom * factor, e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });
document.getElementById("wb-zoom-in-btn").addEventListener("click", () => {
  const c = wbCanvasCenter();
  wbSetZoomAt(getActiveWhiteboard().viewport.zoom * 1.1, c.x, c.y);
});
document.getElementById("wb-zoom-out-btn").addEventListener("click", () => {
  const c = wbCanvasCenter();
  wbSetZoomAt(getActiveWhiteboard().viewport.zoom / 1.1, c.x, c.y);
});
wbZoomLevelBtn.addEventListener("click", () => {
  const c = wbCanvasCenter();
  wbSetZoomAt(1, c.x, c.y);
});

// ----- Whiteboard: layer order toolbar buttons -----
// Same wbMoveShapeLayer as the shape context menu's Bring Forward/Send
// Backward entries - just a toolbar shortcut for whichever single shape is
// currently selected, since only one shape's layer position makes
// unambiguous sense to move at a time (see wbUpdateLayerButtonsState).
const wbBringForwardBtn = document.getElementById("wb-bring-forward-btn");
const wbSendBackwardBtn = document.getElementById("wb-send-backward-btn");
function wbUpdateLayerButtonsState() {
  const disabled = wbSelectedShapeIds.size !== 1;
  wbBringForwardBtn.disabled = disabled;
  wbSendBackwardBtn.disabled = disabled;
}
function wbSelectedSingleShape() {
  if (wbSelectedShapeIds.size !== 1) return null;
  return getActiveWhiteboard().shapes.find((s) => s.id === [...wbSelectedShapeIds][0]) || null;
}
wbBringForwardBtn.addEventListener("click", () => {
  const shape = wbSelectedSingleShape();
  if (shape) wbMoveShapeLayer(shape, 1);
});
wbSendBackwardBtn.addEventListener("click", () => {
  const shape = wbSelectedSingleShape();
  if (shape) wbMoveShapeLayer(shape, -1);
});

// ----- Whiteboard: text formatting toolbar -----

// Bold/Italic/Underline just target the browser's normal focus+selection,
// same as the card description RTE toolbar - mousedown preventDefault keeps
// focus (and the text selection) on the whiteboard text div being edited
// instead of jumping to the button.
[["wb-text-bold-btn", "bold"], ["wb-text-italic-btn", "italic"], ["wb-text-underline-btn", "underline"]].forEach(([id, cmd]) => {
  const btn = document.getElementById(id);
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => document.execCommand(cmd, false, null));
});

const WB_TEXT_SIZES = [10, 12, 14, 18, 24];
const WB_TEXT_SIZE_NORMAL_INDEX = 2;
let wbTextSizeIndex = WB_TEXT_SIZE_NORMAL_INDEX;
const wbTextSizeDecBtn = document.getElementById("wb-text-size-dec");
const wbTextSizeIncBtn = document.getElementById("wb-text-size-inc");
const wbTextSizeResetBtn = document.getElementById("wb-text-size-reset");
function updateWbTextSizeButtons() {
  wbTextSizeResetBtn.textContent = String(WB_TEXT_SIZES[wbTextSizeIndex]);
}
// Same technique as the card description RTE's font-size stepper - fontSize
// execCommand only gives legacy <font size> tags, swapped here for a real
// inline style so it survives save/reload like the rest of the markup.
function applyWbTextSize() {
  const scope = document.activeElement;
  if (!scope || !scope.isContentEditable) return;
  const px = WB_TEXT_SIZES[wbTextSizeIndex];
  document.execCommand("fontSize", false, "7");
  const spans = [];
  scope.querySelectorAll('font[size="7"]').forEach((el) => {
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
}
[wbTextSizeDecBtn, wbTextSizeIncBtn, wbTextSizeResetBtn].forEach((btn) => btn.addEventListener("mousedown", (e) => e.preventDefault()));
wbTextSizeDecBtn.addEventListener("click", () => {
  if (wbTextSizeIndex === 0) return;
  wbTextSizeIndex -= 1;
  updateWbTextSizeButtons();
  applyWbTextSize();
});
wbTextSizeIncBtn.addEventListener("click", () => {
  if (wbTextSizeIndex === WB_TEXT_SIZES.length - 1) return;
  wbTextSizeIndex += 1;
  updateWbTextSizeButtons();
  applyWbTextSize();
});
wbTextSizeResetBtn.addEventListener("click", () => {
  wbTextSizeIndex = WB_TEXT_SIZE_NORMAL_INDEX;
  updateWbTextSizeButtons();
  applyWbTextSize();
});
updateWbTextSizeButtons();

// ----- Whiteboard: grid, snap-to-grid, clear page -----

const wbGridToggleBtn = document.getElementById("wb-grid-toggle-btn");
wbGridToggleBtn.addEventListener("click", () => {
  wbGridVisible = !wbGridVisible;
  wbGridToggleBtn.classList.toggle("active", wbGridVisible);
  renderWhiteboardCanvas();
});
const wbSnapToggleBtn = document.getElementById("wb-snap-toggle-btn");
wbSnapToggleBtn.addEventListener("click", () => {
  wbSnapToGrid = !wbSnapToGrid;
  wbSnapToggleBtn.classList.toggle("active", wbSnapToGrid);
});
const wbSpellcheckToggleBtn = document.getElementById("wb-spellcheck-toggle-btn");
wbSpellcheckToggleBtn.addEventListener("click", () => {
  wbSpellcheckEnabled = !wbSpellcheckEnabled;
  wbSpellcheckToggleBtn.classList.toggle("active", wbSpellcheckEnabled);
  // Rebuilds every text overlay so the new spellcheck value actually takes -
  // it's read once at overlay-creation time in wbCreateTextOverlay, same as
  // wbGridVisible is only read at render time above.
  renderWhiteboardCanvas();
});
document.getElementById("wb-clear-page-btn").addEventListener("click", () => {
  const wb = getActiveWhiteboard();
  if (!wb.shapes.length) return;
  openConfirmPopover(`Clear everything on "${wb.name}"?`, () => {
    wbDeletePhotoFilesForShapes(wb.shapes);
    wb.shapes = [];
    // With nothing left, wherever the viewport happened to be panned to is
    // meaningless - reset to null so the upcoming renderWhiteboardCanvas
    // call re-centers it (wbEnsurePageViewportCentered) instead of leaving
    // the user stranded wherever they last scrolled to.
    wb.viewport = { x: null, y: null, zoom: 1 };
    wbClearSelection();
    renderWhiteboardCanvas();
    wbPushHistory();
    saveBoard();
  }, "Clear");
});

// ----- Whiteboard: pen color/width toolbar -----

const wbPenColorDot = document.getElementById("wb-pen-color-dot");
function updateWbPenColorDot() {
  wbPenColorDot.style.background = wbPenColor;
}
updateWbPenColorDot();
document.getElementById("wb-pen-color-btn").addEventListener("click", (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const items = LABEL_COLORS.map((color, i) => ({
    label: LABEL_COLOR_NAMES[i] || "",
    swatch: mutedCardColor(color),
    hideLabel: true,
    onClick: () => { wbPenColor = color; updateWbPenColorDot(); },
  }));
  openMenu(rect.left, rect.bottom + 4, items);
});

const wbPenWidthDecBtn = document.getElementById("wb-pen-width-dec");
const wbPenWidthIncBtn = document.getElementById("wb-pen-width-inc");
const wbPenWidthResetBtn = document.getElementById("wb-pen-width-reset");
const wbPenWidthNumberEl = document.getElementById("wb-pen-width-number");
const wbPenWidthDotEl = document.getElementById("wb-pen-width-dot");
function updateWbPenWidthButtons() {
  wbPenWidthDecBtn.disabled = wbPenWidthIndex === 0;
  wbPenWidthIncBtn.disabled = wbPenWidthIndex === WB_PEN_WIDTHS.length - 1;
  const w = WB_PEN_WIDTHS[wbPenWidthIndex];
  wbPenWidthNumberEl.textContent = String(w);
  const dotSize = w * 2 + 4;
  wbPenWidthDotEl.style.width = dotSize + "px";
  wbPenWidthDotEl.style.height = dotSize + "px";
}
wbPenWidthDecBtn.addEventListener("click", () => {
  if (wbPenWidthIndex === 0) return;
  wbPenWidthIndex -= 1;
  updateWbPenWidthButtons();
});
wbPenWidthIncBtn.addEventListener("click", () => {
  if (wbPenWidthIndex === WB_PEN_WIDTHS.length - 1) return;
  wbPenWidthIndex += 1;
  updateWbPenWidthButtons();
});
wbPenWidthResetBtn.addEventListener("click", () => {
  wbPenWidthIndex = WB_PEN_WIDTH_NORMAL_INDEX;
  updateWbPenWidthButtons();
});
updateWbPenWidthButtons();
// Scroll up/down while hovering any of the three width controls steps the
// size the same way the +/- buttons do - same up=bigger convention the
// canvas zoom wheel already uses, for consistency.
[wbPenWidthDecBtn, wbPenWidthResetBtn, wbPenWidthIncBtn].forEach((btn) => {
  btn.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.deltaY < 0 && wbPenWidthIndex < WB_PEN_WIDTHS.length - 1) { wbPenWidthIndex += 1; updateWbPenWidthButtons(); }
    else if (e.deltaY > 0 && wbPenWidthIndex > 0) { wbPenWidthIndex -= 1; updateWbPenWidthButtons(); }
  }, { passive: false });
});

// ----- Whiteboard: photo attachment -----

const WB_PHOTO_MAX_DIM = 280;
// Photo bytes live on disk (via Rust), not in the JSON - same reasoning and
// same lazy in-memory-only cache pattern as backgroundImageCache.
const wbPhotoCache = new Map();
// Which photo ids are currently known to be missing their file - drives
// both the broken-image placeholder on canvas and whether the right-click
// menu offers "Locate File...".
const wbBrokenPhotoIds = new Set();
async function wbGetPhotoDataUrl(shape) {
  if (wbPhotoCache.has(shape.id)) return wbPhotoCache.get(shape.id);
  try {
    const base64 = await invoke("load_wb_photo", { photoId: shape.id });
    const url = `data:${shape.mimeType || "image/png"};base64,${base64}`;
    wbPhotoCache.set(shape.id, url);
    return url;
  } catch (err) {
    return null;
  }
}
// Every place a "photo" shape can be removed from wb.shapes - deleting one
// shape, deleting a multi-selection, clearing a page, deleting a whole
// page - must also delete its backing file, or it becomes permanently
// orphaned on disk (the JSON side self-cleans on the next save since it's
// just an inline reference, but a separate file on disk never does unless
// something explicitly removes it).
function wbDeletePhotoFilesForShapes(shapes) {
  shapes.forEach((s) => {
    if (s.type !== "photo") return;
    wbPhotoCache.delete(s.id);
    // Deleted on purpose, right now - no need to remember where it used to
    // live for a future orphan-cleanup message, unlike the undo-truncation
    // path where the registry entry is what's left of that context.
    if (appData.wbPhotoRegistry) delete appData.wbPhotoRegistry[s.id];
    invoke("delete_wb_photo", { photoId: s.id }).catch(() => {});
  });
}

// Shared by every way of getting an image onto the canvas (paste, drop,
// the Insert Image button) once each has independently produced a mime
// type + base64 payload + a usable data URL - avoids repeating the
// image-sizing/save/registry/history steps per source.
function wbCommitPhotoShape(mimeType, base64Data, dataUrl, fileName, worldX, worldY) {
  const img = new Image();
  img.onload = async () => {
    const naturalW = img.naturalWidth || 1;
    const naturalH = img.naturalHeight || 1;
    // Scaled to fit within a sensible default box, aspect ratio intact -
    // it's still just a resizable shape afterward via the normal corner
    // handles, same as every other box shape.
    const scale = Math.min(1, WB_PHOTO_MAX_DIM / Math.max(naturalW, naturalH));
    const width = naturalW * scale;
    const height = naturalH * scale;
    const shape = { id: crypto.randomUUID(), type: "photo", x: worldX - width / 2, y: worldY - height / 2, width, height, mimeType, originalName: fileName || "Untitled image" };
    try {
      await invoke("save_wb_photo", { photoId: shape.id, dataBase64: base64Data });
    } catch (err) {
      openAlertPopover("Couldn't save that image - please try a different file.");
      return;
    }
    wbPhotoCache.set(shape.id, dataUrl);
    const wb = getActiveWhiteboard();
    wb.shapes.push(shape);
    appData.wbPhotoRegistry[shape.id] = { originalName: shape.originalName, boardName: board.name, pageName: wb.name };
    wbSelectedShapeIds = new Set([shape.id]);
    renderWhiteboardCanvas();
    wbPushHistory();
    saveBoard();
  };
  img.src = dataUrl;
}

function wbCreatePhotoFromFile(file, worldX, worldY) {
  if (!file || !file.type || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) return;
    const [, mimeType, base64Data] = match;
    wbCommitPhotoShape(mimeType, base64Data, dataUrl, file.name, worldX, worldY);
  };
  reader.readAsDataURL(file);
}

// Insert Image button path - a native file picker hands back a filesystem
// path (not a browser File object), so this reads it via the same Rust
// command "Locate File" already uses instead of FileReader.
async function wbCreatePhotoFromPath(path, worldX, worldY) {
  let base64Data;
  try {
    base64Data = await invoke("read_file_as_base64", { path });
  } catch (err) {
    openAlertPopover("Couldn't read that file.");
    return;
  }
  const ext = String(path).split(".").pop().toLowerCase();
  const mimeType = WB_IMAGE_EXT_MIME[ext] || "image/png";
  const fileName = String(path).split(/[\\/]/).pop();
  wbCommitPhotoShape(mimeType, base64Data, `data:${mimeType};base64,${base64Data}`, fileName, worldX, worldY);
}

// Clipboard paste - only while the whiteboard is showing and focus isn't in
// some other text field (which should get its own normal paste instead).
// kkanban's own internal shape clipboard (Ctrl+C on a selection) wins if
// it has anything in it - it only ever gets populated by an explicit,
// recent in-app copy, whereas the OS clipboard can be holding an image
// (e.g. a screenshot) from well before this session and would otherwise
// silently win every paste forever, no matter what was copied since.
// The OS-clipboard-image path is the fallback, for when nothing's been
// copied in-app yet.
document.addEventListener("paste", (e) => {
  if (!whiteboardActive) return;
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
  if (wbClipboard.length) {
    e.preventDefault();
    wbPasteClipboard();
    return;
  }
  const items = e.clipboardData && e.clipboardData.items;
  if (items) {
    for (const item of items) {
      if (item.type && item.type.startsWith("image/")) {
        e.preventDefault();
        const rect = whiteboardSvg.getBoundingClientRect();
        // No cursor position to anchor to for a paste - drop it at the
        // center of whatever's currently in view.
        const center = wbClientToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
        wbCreatePhotoFromFile(item.getAsFile(), center.x, center.y);
        return;
      }
    }
  }
});
// Drag-and-drop (e.g. a file dragged in from the OS file explorer).
whiteboardSvg.addEventListener("dragover", (e) => { e.preventDefault(); });
whiteboardSvg.addEventListener("drop", (e) => {
  e.preventDefault();
  const files = e.dataTransfer && e.dataTransfer.files;
  if (!files || !files.length) return;
  const p = wbClientToWorld(e.clientX, e.clientY);
  wbCreatePhotoFromFile(files[0], p.x, p.y);
});
// A plain button, for anyone who wouldn't think to paste or drag a file in.
document.getElementById("wb-insert-image-btn").addEventListener("click", async () => {
  const path = await window.__TAURI__.dialog.open({
    title: "Insert Image",
    multiple: false,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] }],
  });
  if (!path) return;
  const rect = whiteboardSvg.getBoundingClientRect();
  const center = wbClientToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
  wbCreatePhotoFromPath(path, center.x, center.y);
});

// ----- Whiteboard/board: file-backed image reconciliation -----

// Every category of "this shape/board points at a separate image file on
// disk" registers itself here once, so the orphan sweep and missing-file
// detection below are written a single time and reused - not duplicated
// per category. If card attachments/embeds are ever built, they'd plug in
// as a third entry here rather than needing their own copy of this logic.
const WB_ASSET_KINDS = [
  {
    key: "board-bg",
    listCmd: "list_backgrounds",
    saveCmd: "save_background_image",
    saveIdParam: "boardId",
    deleteCmd: "delete_background_image",
    deleteIdParam: "boardId",
    // One background image per board - references are boards that have one set.
    collectReferences() {
      return [...appData.boards, ...appData.archivedBoards]
        .filter((b) => b.backgroundImage)
        .map((b) => ({ id: b.id, fileName: null, locationLabel: `board "${b.name}"` }));
    },
    onRelinked(id, mimeType) {
      const b = [...appData.boards, ...appData.archivedBoards].find((x) => x.id === id);
      if (b) b.backgroundImageType = mimeType;
      backgroundImageCache.delete(id);
      syncBoardBackground();
    },
    onReferenceRemoved(id) {
      const b = [...appData.boards, ...appData.archivedBoards].find((x) => x.id === id);
      if (b) { b.backgroundImage = null; b.backgroundImageType = null; }
      backgroundImageCache.delete(id);
      syncBoardBackground();
    },
  },
  {
    key: "wb-photo",
    listCmd: "list_wb_photos",
    saveCmd: "save_wb_photo",
    saveIdParam: "photoId",
    deleteCmd: "delete_wb_photo",
    deleteIdParam: "photoId",
    collectReferences() {
      const out = [];
      [...appData.boards, ...appData.archivedBoards].forEach((b) => {
        (b.whiteboards || []).forEach((w) => {
          w.shapes.forEach((s) => {
            if (s.type === "photo") out.push({ id: s.id, fileName: s.originalName || "Untitled image", locationLabel: `"${w.name}" on "${b.name}" whiteboard` });
          });
        });
      });
      return out;
    },
    onRelinked(id, mimeType, fileName) {
      wbPhotoCache.delete(id);
      wbBrokenPhotoIds.delete(id);
      for (const b of [...appData.boards, ...appData.archivedBoards]) {
        for (const w of b.whiteboards || []) {
          const s = w.shapes.find((sh) => sh.id === id);
          // The name that was recorded belonged to the old (now-missing)
          // file - it needs to track whatever was actually just relinked,
          // or a future "Missing: ..." message would show the wrong name.
          if (s) {
            s.mimeType = mimeType;
            if (fileName) {
              s.originalName = fileName;
              if (appData.wbPhotoRegistry[id]) appData.wbPhotoRegistry[id].originalName = fileName;
            }
            renderWhiteboardCanvas();
            return;
          }
        }
      }
    },
    getOrphanInfo(id) {
      const entry = appData.wbPhotoRegistry && appData.wbPhotoRegistry[id];
      if (!entry) return null;
      return { fileName: entry.originalName, pageName: entry.pageName, boardName: entry.boardName };
    },
    cleanupOrphanRecord(id) {
      if (appData.wbPhotoRegistry) delete appData.wbPhotoRegistry[id];
    },
    onReferenceRemoved(id) {
      wbPhotoCache.delete(id);
      wbBrokenPhotoIds.delete(id);
      for (const b of [...appData.boards, ...appData.archivedBoards]) {
        for (const w of b.whiteboards || []) {
          const before = w.shapes.length;
          w.shapes = w.shapes.filter((s) => s.id !== id);
          if (w.shapes.length !== before) { renderWhiteboardCanvas(); return; }
        }
      }
    },
  },
];

const WB_IMAGE_EXT_MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp" };

let wbMissingAssetQueue = [];
function wbShowNextMissingAssetPrompt() {
  if (!wbMissingAssetQueue.length) return;
  const item = wbMissingAssetQueue.shift();
  const name = item.fileName || "This image";
  openTwoActionPopover(
    `"${name}" (${item.locationLabel}) could not be found.`,
    "Replace File",
    async () => { await wbRelinkAsset(item); wbShowNextMissingAssetPrompt(); },
    "Delete Missing Reference",
    async () => { await wbRemoveMissingAssetReference(item); wbShowNextMissingAssetPrompt(); }
  );
}
async function wbRelinkAsset(item) {
  const path = await window.__TAURI__.dialog.open({
    title: "Locate Image File",
    multiple: false,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] }],
  });
  if (!path) return; // left broken for now - still reachable again later (right-click on a broken photo, or next launch's sweep)
  let base64;
  try {
    base64 = await invoke("read_file_as_base64", { path });
  } catch (err) {
    openAlertPopover("Couldn't read that file.");
    return;
  }
  const ext = String(path).split(".").pop().toLowerCase();
  const mimeType = WB_IMAGE_EXT_MIME[ext] || "image/png";
  const fileName = String(path).split(/[\\/]/).pop();
  const kind = WB_ASSET_KINDS.find((k) => k.key === item.kind);
  try {
    await invoke(kind.saveCmd, { [kind.saveIdParam]: item.id, dataBase64: base64 });
  } catch (err) {
    openAlertPopover("Couldn't save that image.");
    return;
  }
  kind.onRelinked(item.id, mimeType, fileName);
  saveBoard();
}
async function wbRemoveMissingAssetReference(item) {
  const kind = WB_ASSET_KINDS.find((k) => k.key === item.kind);
  kind.onReferenceRemoved(item.id);
  saveBoard();
}

// Runs once at startup (see loadAppData): reconciles what's actually on
// disk against what the current data references, for every registered
// kind. A file with no reference is an orphan (deleted immediately, no
// prompt - by the time something's orphaned, there's no shape/board left
// to name where it used to belong, so there's nothing meaningful to ask
// about). A reference with no file gets queued for a one-at-a-time
// Locate/Delete prompt, since that shape is still very much a real thing
// sitting on a real page.
async function wbSweepAssetIssues() {
  const orphanItems = [];
  const missing = [];
  for (const kind of WB_ASSET_KINDS) {
    let onDisk;
    try { onDisk = new Set(await invoke(kind.listCmd)); } catch (err) { continue; }
    const refs = kind.collectReferences();
    const referencedIds = new Set(refs.map((r) => r.id));
    for (const id of onDisk) {
      if (!referencedIds.has(id)) {
        try {
          await invoke(kind.deleteCmd, { [kind.deleteIdParam]: id });
          // The registry (wb-photo only) still remembers where an orphan
          // used to live even though its shape is gone - use that for the
          // popup's list if present, then retire the record now that
          // cleanup is actually done.
          orphanItems.push(kind.getOrphanInfo ? kind.getOrphanInfo(id) : null);
          if (kind.cleanupOrphanRecord) kind.cleanupOrphanRecord(id);
        } catch (err) {}
      }
    }
    refs.forEach((r) => {
      if (!onDisk.has(r.id)) missing.push({ ...r, kind: kind.key });
    });
  }
  if (orphanItems.length > 0) {
    wbShowOrphanCleanupPopover(orphanItems);
    saveBoard();
  }
  if (missing.length) {
    wbMissingAssetQueue = missing;
    wbShowNextMissingAssetPrompt();
  }
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
      // The regular switch path, so the previous board's background image
      // (and whiteboard view) gets swapped out too, not just the columns.
      switchBoard(nb.id);
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

// On-disk leftovers of a board being permanently deleted.
function discardBoardFiles(b) {
  backgroundImageCache.delete(b.id);
  invoke("delete_background_image", { boardId: b.id }).catch(() => {});
  // A board can carry several whiteboard pages, each with its own photos -
  // deleting the whole board needs to sweep every one of them, not just
  // the board's own background image above.
  (b.whiteboards || []).forEach((w) => {
    wbDeletePhotoFilesForShapes(w.shapes);
    delete wbHistoryByPage[w.id];
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
    discardBoardFiles(b);
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
    (entry.whiteboards || []).forEach((w) => {
      wbDeletePhotoFilesForShapes(w.shapes);
      delete wbHistoryByPage[w.id];
    });
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
    { label: "📁 New Category", onClick: () => openInlineAddCategory() },
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
  renderNotificationSettings();
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
// ----- Windows notifications (due-date alarms, Pomodoro) -----
// Off by default: nothing is handed to Windows until the user opts in under
// Settings > Notifications. Due-date alarms are scheduled with Windows
// itself (see src-tauri/src/alarms.rs), so they ring even while kkanban is
// closed; Pomodoro notices are shown on the spot, since that timer only
// runs while kkanban is open.

const HEADSUP_UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
const HEADSUP_MAX_MS = 30 * HEADSUP_UNIT_MS.days;

function applyNotificationDefaults(data) {
  if (data.notificationsEnabled === undefined) data.notificationsEnabled = false;
  if (data.dueAlarmsEnabled === undefined) data.dueAlarmsEnabled = true;
  if (data.dueHeadsUpEnabled === undefined) data.dueHeadsUpEnabled = true;
  if (data.dueHeadsUpAmount === undefined) data.dueHeadsUpAmount = 30;
  if (data.dueHeadsUpUnit === undefined) data.dueHeadsUpUnit = "minutes";
  if (data.pomodoroNotificationsEnabled === undefined) data.pomodoroNotificationsEnabled = true;
}

function headsUpLabel() {
  const n = appData.dueHeadsUpAmount;
  const unit = appData.dueHeadsUpUnit;
  return `${n} ${n === 1 ? unit.slice(0, -1) : unit}`;
}

function titleWithEmoji(emoji, text) {
  return emoji ? `${emoji} ${text}` : text;
}

// Every timed due date on a non-archived board (date-only ones never
// ring), as the list Windows should have scheduled right now.
function computeDueAlarms() {
  if (!appData.notificationsEnabled || !appData.dueAlarmsEnabled) return [];
  const leadMs = appData.dueHeadsUpEnabled ? appData.dueHeadsUpAmount * HEADSUP_UNIT_MS[appData.dueHeadsUpUnit] : 0;
  const alarms = [];
  function add(key, dueDate, name, where, url) {
    const whenMs = new Date(dueDate).getTime();
    if (!Number.isFinite(whenMs)) return;
    alarms.push({ id: `alarm-${key}`, kind: "alarm", whenMs, title: `⏰ ${name}`, body: `Due now · ${where}`, url });
    if (leadMs) alarms.push({ id: `headsup-${key}`, kind: "headsup", whenMs: whenMs - leadMs, title: `🔔 ${name}`, body: `Due in ${headsUpLabel()} · ${where}`, url });
  }
  appData.boards.forEach((b) => {
    const boardName = titleWithEmoji(b.emoji, b.name || "My Board");
    if (b.dueDate && b.hasDueTime) add(b.id, b.dueDate, boardName, "Board", `kkanban://open?board=${b.id}`);
    b.columns.forEach((col) => col.cards.forEach((card) => {
      if (!card.dueDate || !card.hasDueTime || card.completed) return;
      add(`${b.id}-${card.id}`, card.dueDate, titleWithEmoji(card.emoji, card.title || "(untitled)"), boardName, `kkanban://open?board=${b.id}&card=${card.id}`);
    }));
  });
  return alarms;
}

// Called after every save (and on launch). Only talks to Windows when the
// list actually changed, and a failure here must never get in the way of
// saving.
let lastDueAlarmsSignature = null;
function syncDueAlarms() {
  const alarms = computeDueAlarms();
  const signature = JSON.stringify(alarms);
  if (signature === lastDueAlarmsSignature) return;
  lastDueAlarmsSignature = signature;
  invoke("sync_due_alarms", { alarms }).catch(() => { lastDueAlarmsSignature = null; });
}

function notificationsOn() {
  return !!appData.notificationsEnabled;
}

// "🔕 Alarms are off" line under a due-time field, shown only while a time
// is actually being set and notifications are switched off.
function syncDueAlarmHint(el, timeIsSet) {
  if (!el || !appData) return;
  const show = timeIsSet && !(notificationsOn() && appData.dueAlarmsEnabled);
  el.classList.toggle("hidden", !show);
  if (!show) return;
  el.innerHTML = `🔕 Alarms are off. <button type="button" class="due-alarm-hint-link">Turn them on in Settings</button>`;
  el.querySelector("button").addEventListener("click", (e) => {
    e.stopPropagation();
    closeDueDatePopover();
    openSettingsPanel();
  });
}

function renderNotificationSettings() {
  const master = document.getElementById("notif-master");
  const due = document.getElementById("notif-due");
  const headsUp = document.getElementById("notif-headsup");
  const amount = document.getElementById("notif-headsup-amount");
  const unit = document.getElementById("notif-headsup-unit");
  const pomoCb = document.getElementById("notif-pomo");
  master.checked = notificationsOn();
  due.checked = appData.dueAlarmsEnabled;
  headsUp.checked = appData.dueHeadsUpEnabled;
  amount.value = appData.dueHeadsUpAmount;
  unit.value = appData.dueHeadsUpUnit;
  pomoCb.checked = appData.pomodoroNotificationsEnabled;
  // Sub-options stay visible but greyed out while their parent is off.
  const on = master.checked;
  document.getElementById("notif-options").classList.toggle("is-disabled", !on);
  due.disabled = !on;
  pomoCb.disabled = !on;
  headsUp.disabled = !on || !due.checked;
  amount.disabled = unit.disabled = !on || !due.checked || !headsUp.checked;
}

function onNotificationSettingChanged() {
  renderNotificationSettings();
  saveBoard();
}

document.getElementById("notif-master").addEventListener("change", (e) => {
  appData.notificationsEnabled = e.target.checked;
  onNotificationSettingChanged();
  // Also what introduces kkanban to Windows - a scheduled alarm from an app
  // that has never shown a notification gets silently dropped.
  if (e.target.checked) {
    invoke("show_notification", {
      title: "⏰ Windows notifications are on",
      body: "kkanban will alert you when a due date with a time arrives, even while it's closed.",
      silent: false,
    }).catch((err) => openAlertPopover(`Windows didn't accept kkanban's notification: ${err}`));
  }
});
document.getElementById("notif-due").addEventListener("change", (e) => { appData.dueAlarmsEnabled = e.target.checked; onNotificationSettingChanged(); });
document.getElementById("notif-headsup").addEventListener("change", (e) => { appData.dueHeadsUpEnabled = e.target.checked; onNotificationSettingChanged(); });
document.getElementById("notif-pomo").addEventListener("change", (e) => { appData.pomodoroNotificationsEnabled = e.target.checked; onNotificationSettingChanged(); });
// A typed amount only sticks if it's a whole number of at least 1 and the
// total stays within 30 days; anything else snaps back to the last valid
// value once the field is left.
function commitHeadsUpAmount() {
  const amountEl = document.getElementById("notif-headsup-amount");
  const unit = document.getElementById("notif-headsup-unit").value;
  const n = Number(amountEl.value);
  if (Number.isInteger(n) && n >= 1 && n * HEADSUP_UNIT_MS[unit] <= HEADSUP_MAX_MS) {
    appData.dueHeadsUpAmount = n;
    appData.dueHeadsUpUnit = unit;
  }
  onNotificationSettingChanged();
}
document.getElementById("notif-headsup-amount").addEventListener("change", commitHeadsUpAmount);
document.getElementById("notif-headsup-amount").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
document.getElementById("notif-headsup-unit").addEventListener("change", commitHeadsUpAmount);

// Only when kkanban isn't the window in front - if it is, the in-app sound
// and overlay already cover it. Always silent, since the in-app sound plays
// regardless.
function notifyPomodoro(title, body) {
  if (!notificationsOn() || !appData.pomodoroNotificationsEnabled || document.hasFocus()) return;
  invoke("show_notification", { title, body, silent: true }).catch(() => {});
}

// kkanban://open?board=<id>[&card=<id>] - from an alarm's "Open" button.
// The card's column is looked up now rather than baked into the link, since
// the card may have moved columns since the alarm was scheduled.
function handleOpenUrl(url) {
  let params;
  try { params = new URL(url).searchParams; } catch (e) { return; }
  const target = appData.boards.find((b) => b.id === params.get("board"));
  if (!target) {
    openAlertPopover("That board no longer exists (it may have been archived or deleted).");
    return;
  }
  if (whiteboardActive) toggleWhiteboardView();
  switchBoard(target.id);
  const cardId = params.get("card");
  if (!cardId) return;
  const col = target.columns.find((c) => c.cards.some((x) => x.id === cardId));
  if (col) openDetailModal(col.id, col.cards.find((x) => x.id === cardId));
}
async function handlePendingOpenUrl() {
  try {
    const url = await invoke("take_open_url");
    if (url) handleOpenUrl(url);
  } catch (e) {}
}
window.__TAURI__.event.listen("open-url", (e) => handleOpenUrl(e.payload));
document.getElementById("settings-overlay").addEventListener("click", (e) => {
  if (e.target.id === "settings-overlay") closeSettingsPanel();
});

// ----- Backup export / import -----
// A full backup bundles appData (every board, including archived ones) plus
// each board's background image (stored separately on disk, see
// getBoardBackgroundDataUrl above) into one self-contained JSON file, so
// restoring doesn't also require separately copying the backgrounds folder.
//
// A plain `<a download>`/Blob click (the normal browser way to trigger a
// save) silently does nothing inside a Tauri webview - there's no download
// handler wired up to actually write the file anywhere. The real fix is a
// native Save/Open dialog, via tauri-plugin-dialog: registering that plugin
// in src-tauri (see lib.rs) makes it inject its own window.__TAURI__.dialog
// API automatically (same withGlobalTauri mechanism that already exposes
// window.__TAURI__.core.invoke, no npm/bundler needed). The dialog only
// returns a path the user picked; the actual read/write still goes through
// our own write_text_file/read_text_file commands, same pattern as
// save_data/load_data.
// Once a day (checked at launch, then every few hours while open), a copy of
// the data goes to Documents\kkanban\backups - the Rust side skips it if
// today's file already exists and keeps only the newest 14. Same payload
// shape as Export, so Import Backup restores one directly. Images aren't
// bundled: they live in their own folders and restoring leaves them alone.
function runAutoBackup() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const payload = { kkanbanBackup: 1, exportedAt: d.toISOString(), appData, backgrounds: {}, wbPhotos: {} };
  invoke("auto_backup", { date, data: JSON.stringify(payload) }).catch(() => {});
}
setInterval(runAutoBackup, 3 * 60 * 60 * 1000);

async function exportBackup() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const path = await window.__TAURI__.dialog.save({
    title: "Export kkanban Backup",
    defaultPath: `kkanban-backup-${stamp}.json`,
    filters: [{ name: "kkanban Backup", extensions: ["json"] }],
  });
  if (!path) return;
  const allBoards = [...appData.boards, ...appData.archivedBoards];
  const backgrounds = {};
  for (const b of allBoards) {
    if (!b.backgroundImage) continue;
    try {
      const dataBase64 = await invoke("load_background_image", { boardId: b.id });
      backgrounds[b.id] = { mime: b.backgroundImageType || "image/png", dataBase64 };
    } catch (err) {
      // Skip a board whose background file is missing/unreadable rather than failing the whole export.
    }
  }
  // Whiteboard photos live on disk the same way background images do, so
  // they need the same explicit fetch-and-embed treatment here - without
  // this, a backup would carry the JSON reference to each photo but not
  // its actual bytes, and importing it anywhere would show broken images.
  const wbPhotos = {};
  for (const b of allBoards) {
    for (const w of b.whiteboards || []) {
      for (const s of w.shapes) {
        if (s.type !== "photo") continue;
        try {
          const dataBase64 = await invoke("load_wb_photo", { photoId: s.id });
          wbPhotos[s.id] = { mime: s.mimeType || "image/png", dataBase64 };
        } catch (err) {
          // Skip a photo whose file is missing/unreadable rather than failing the whole export.
        }
      }
    }
  }
  const payload = { kkanbanBackup: 1, exportedAt: new Date().toISOString(), appData, backgrounds, wbPhotos };
  try {
    await invoke("write_text_file", { path, data: JSON.stringify(payload) });
    openAlertPopover(`Backup exported to ${path}`);
  } catch (err) {
    openAlertPopover("Couldn't write the backup file: " + err);
  }
}

async function importBackup() {
  const path = await window.__TAURI__.dialog.open({
    title: "Import kkanban Backup",
    multiple: false,
    filters: [{ name: "kkanban Backup", extensions: ["json"] }],
  });
  if (!path) return;
  let parsed;
  try {
    const text = await invoke("read_text_file", { path });
    parsed = JSON.parse(text);
  } catch (err) {
    openAlertPopover("Couldn't read that file.");
    return;
  }
  if (!parsed || typeof parsed !== "object" || !parsed.appData || !Array.isArray(parsed.appData.boards)) {
    openAlertPopover("That doesn't look like a kkanban backup file.");
    return;
  }
  openConfirmPopover(
    "Replace everything currently in kkanban with this backup? This can't be undone.",
    () => applyImportedBackup(parsed),
    "Replace"
  );
}

async function applyImportedBackup(parsed) {
  const imported = migrateAppData(parsed.appData);
  const backgrounds = parsed.backgrounds || {};
  for (const [boardId, entry] of Object.entries(backgrounds)) {
    try {
      await invoke("save_background_image", { boardId, dataBase64: entry.dataBase64 });
    } catch (err) {
      // That board just won't show a background if this failed - not fatal to the rest of the import.
    }
  }
  const wbPhotos = parsed.wbPhotos || {};
  for (const [photoId, entry] of Object.entries(wbPhotos)) {
    try {
      await invoke("save_wb_photo", { photoId, dataBase64: entry.dataBase64 });
    } catch (err) {
      // That photo just won't load if this failed - not fatal to the rest of the import.
    }
  }
  appData = imported;
  backgroundImageCache.clear();
  wbPhotoCache.clear();
  board = appData.boards.find((b) => b.id === appData.activeBoardId) || appData.boards[0];
  applyTheme(appData.theme);
  applyPattern(appData.pattern);
  pomo.cowMode = !!appData.pomodoroCowMode;
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
  await syncBoardBackground();
  renderPomodoro(true);
  saveBoard();
  closeSettingsPanel();
  openAlertPopover("Backup imported.");
}

document.getElementById("settings-export-btn").addEventListener("click", exportBackup);
document.getElementById("settings-import-btn").addEventListener("click", importBackup);

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
    <div id="popover-alarm-hint" class="due-alarm-hint hidden"></div>
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
  const alarmHint = panel.querySelector("#popover-alarm-hint");
  syncDueAlarmHint(alarmHint, timeToggle.checked);

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
    syncDueAlarmHint(alarmHint, timeToggle.checked);
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
    el.style.display = matchesSearch(card) && matchesCardFilter(card) ? "" : "none";
  });
  updateFilterButton();
}

// ----- Filter by label / hide completed -----
// Per board, kept in memory only - a restart always shows every card, so a
// forgotten filter can't make cards look like they vanished.
const cardFilters = {};
function currentFilter() {
  return cardFilters[board.id] || (cardFilters[board.id] = { labelIds: [], hideCompleted: false });
}
function activeFilterLabelIds() {
  return currentFilter().labelIds.filter((id) => board.labels.some((l) => l.id === id));
}
function matchesCardFilter(card) {
  const f = currentFilter();
  if (f.hideCompleted && card.completed) return false;
  const ids = activeFilterLabelIds();
  return !ids.length || ids.some((id) => (card.labelIds || []).includes(id));
}
function updateFilterButton() {
  const count = activeFilterLabelIds().length + (currentFilter().hideCompleted ? 1 : 0);
  const btn = document.getElementById("btn-filter");
  btn.textContent = count ? `⏷ Filter (${count})` : "⏷ Filter";
  btn.classList.toggle("filter-active", !!count);
}
// Built as the shared #context-menu element so the existing outside-click
// closing (closeMenu) and styling just apply.
document.getElementById("btn-filter").addEventListener("click", (e) => {
  e.stopPropagation();
  if (document.getElementById("context-menu")) { closeMenu(); return; }
  const f = currentFilter();
  const panel = document.createElement("div");
  panel.id = "context-menu";
  panel.className = "filter-panel";
  panel.innerHTML = `
    <label class="label-picker-row"><input type="checkbox" data-hide-completed ${f.hideCompleted ? "checked" : ""} /> Hide completed</label>
    <div class="filter-panel-divider"></div>
    ${board.labels.length ? board.labels.map((l) => `
      <label class="label-picker-row">
        <input type="checkbox" data-id="${l.id}" ${f.labelIds.includes(l.id) ? "checked" : ""} />
        <span class="label-swatch-static" style="background:${l.color}"></span>
        <span class="label-picker-name">${l.emoji ? emojiHtml(l.emoji) + " " : ""}${escapeHtml(l.name)}</span>
      </label>`).join("") : `<div class="label-picker-empty">No labels on this board.</div>`}
    <button type="button" data-clear>Clear filter</button>
  `;
  panel.addEventListener("click", (ev) => ev.stopPropagation());
  panel.querySelector("[data-hide-completed]").addEventListener("change", (ev) => { f.hideCompleted = ev.target.checked; applySearchFilter(); });
  panel.querySelectorAll("input[data-id]").forEach((cb) => cb.addEventListener("change", () => {
    f.labelIds = Array.from(panel.querySelectorAll("input[data-id]:checked")).map((x) => x.dataset.id);
    applySearchFilter();
  }));
  panel.querySelector("[data-clear]").addEventListener("click", () => {
    f.labelIds = [];
    f.hideCompleted = false;
    applySearchFilter();
    closeMenu();
  });
  document.body.appendChild(panel);
  const rect = e.currentTarget.getBoundingClientRect();
  panel.style.left = Math.min(rect.left, window.innerWidth - panel.offsetWidth - 10) + "px";
  panel.style.top = rect.bottom + 4 + "px";
  setTimeout(() => document.addEventListener("click", closeMenu), 0);
});
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
  if (card.completed && card.repeat && card.dueDate) {
    spawnNextRepeat(columnId, card);
    return;
  }
  patchCard(columnId, cardId);
  saveBoard();
}

// ----- Recurring cards -----
// Drawn rather than a character: Unicode's only "repeat" symbol is the 🔁
// emoji, and the closest text glyphs (↻ ⟳) read as "refresh".
const REPEAT_ICON_SVG = `<svg class="repeat-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 7V6a2 2 0 0 1 2-2H13"/><path d="M11 2l2 2-2 2"/><path d="M13.5 9v1a2 2 0 0 1-2 2H3"/><path d="M5 14l-2-2 2-2"/></svg>`;
const REPEAT_NAMES = { day: "Daily", week: "Weekly", month: "Monthly" };

// Card detail's repeat picker: a small icon button (faded when off, with
// the choice beside it when on) that opens the regular app menu.
let detailRepeat = null;
const detailRepeatBtn = document.getElementById("detail-repeat-btn");
function setDetailRepeat(value) {
  detailRepeat = value;
  detailRepeatBtn.classList.toggle("repeat-on", !!value);
  detailRepeatBtn.innerHTML = `${REPEAT_ICON_SVG}${value ? `<span>${REPEAT_NAMES[value]}</span>` : ""}<span class="repeat-caret">▾</span>`;
}
// Clicking the button again closes the menu. Checked on mousedown, since the
// close-on-press listener below has already removed the menu by click time.
let repeatMenuWasOpen = false;
detailRepeatBtn.addEventListener("mousedown", () => { repeatMenuWasOpen = !!document.getElementById("context-menu"); });
detailRepeatBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (repeatMenuWasOpen) { closeMenu(); return; }
  const rect = detailRepeatBtn.getBoundingClientRect();
  const opt = (value, label) => ({ label: `${detailRepeat === value ? "✓" : " "} ${label}`, onClick: () => setDetailRepeat(value) });
  openMenu(rect.left, rect.bottom + 4, [opt(null, "No repeat"), opt("day", "Daily"), opt("week", "Weekly"), opt("month", "Monthly")]);
  // Clicks inside the card window don't reach the document listener that
  // normally closes menus, so close it on the next press in there.
  detailModal.addEventListener("mousedown", (ev) => { if (!ev.target.closest("#context-menu")) closeMenu(); }, { once: true });
});
// Completing a repeating card leaves it completed and adds the next one
// right below it: due date moved forward (and past today, if it was
// overdue), checklist unticked, comments not carried over. The repeat rule
// moves to the new card, so un-completing/re-completing the old one can't
// spawn duplicates.
function nextRepeatDate(dueDate, repeat) {
  const [y, m, d] = dueDate.slice(0, 10).split("-").map(Number);
  const time = dueDate.slice(10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let date = new Date(y, m - 1, d);
  do {
    if (repeat === "day") date.setDate(date.getDate() + 1);
    else if (repeat === "week") date.setDate(date.getDate() + 7);
    else {
      // Same day next month, clamped (Jan 31 -> Feb 28/29).
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 0).getDate();
      date = new Date(date.getFullYear(), date.getMonth() + 1, Math.min(d, lastDay));
    }
  } while (date < today);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}${time}`;
}
function spawnNextRepeat(columnId, card) {
  const col = getColumn(columnId);
  const next = instantiateSnapshot(snapshotCard(card, board), board);
  next.completed = false;
  next.comments = [];
  (next.checklist || []).forEach((i) => { i.done = false; });
  next.dueDate = nextRepeatDate(card.dueDate, card.repeat);
  card.repeat = null;
  col.cards.splice(col.cards.indexOf(card) + 1, 0, next);
  render();
  saveBoard();
  flashCard(next.id);
  showToast(`Next "${shortTitle(next)}" due ${formatDueDate(next.dueDate, next.hasDueTime)}`);
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
    colEl.addEventListener("mouseenter", () => { hoveredColumnId = col.id; });
    colEl.addEventListener("mouseleave", () => { if (hoveredColumnId === col.id) hoveredColumnId = null; });
    // Right-click anywhere in the column (cards have their own menu): paste
    // lands between the cards nearest the click.
    colEl.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".card")) return;
      e.preventDefault();
      const cardEls = Array.from(colEl.querySelectorAll(".card"));
      let index = cardEls.findIndex((el) => { const r = el.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
      if (index < 0) index = col.cards.length;
      const items = [];
      if (cardClipboard) items.push({ label: `📋 Paste "${shortTitle(cardClipboard.card)}" here`, onClick: () => pasteCard(col.id, index) });
      items.push({ label: "➕ Add card", onClick: () => openInlineAdd(col.id) });
      openMenu(e.clientX, e.clientY, items);
    });

    const header = document.createElement("div");
    header.className = "column-header";
    header.innerHTML = `
      <span class="column-drag-handle" title="Drag to reorder">⠿</span>
      <div class="column-title-row">
        <div class="column-title">${titleEmojiHtml(col.emoji)}<span class="title-text">${escapeHtml(col.title)}</span></div>
      </div>
      <button class="column-add-top-btn" title="Add card to top">+</button>
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
    header.querySelector(".column-add-top-btn").addEventListener("click", () => openInlineAdd(col.id, true));
    header.querySelector(".column-menu-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = e.target.getBoundingClientRect();
      const items = [];
      if (cardClipboard) items.push({ label: `📋 Paste "${shortTitle(cardClipboard.card)}"`, onClick: () => pasteCard(col.id) });
      items.push({ label: "🗑️ Delete Column", onClick: () => confirmDeleteColumn(col) });
      openMenu(rect.left, rect.bottom + 4, items);
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
    ? `<span class="due-badge ${card.completed ? "due-completed" : dueDateColorClass(card.dueDate, card.hasDueTime)}"${card.repeat ? ` title="Repeats ${REPEAT_NAMES[card.repeat].toLowerCase()}"` : ""}>${card.completed ? "✅ " : ""}${card.repeat ? REPEAT_ICON_SVG + " " : ""}${formatDueDate(card.dueDate, card.hasDueTime)}</span>`
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
      { label: "📋 Copy", onClick: () => copyCard(columnId, card.id) },
      ...(cardClipboard ? [{ label: `📋 Paste "${shortTitle(cardClipboard.card)}" below`, onClick: () => {
        const col = getColumn(columnId);
        pasteCard(columnId, col ? col.cards.findIndex((c) => c.id === card.id) + 1 : undefined);
      } }] : []),
      { label: "📑 Duplicate", onClick: () => duplicateCard(columnId, card.id) },
      { label: "➡️ Move to board", submenu: buildSendToBoardSubmenu(columnId, card.id, "move", e.clientX, e.clientY) },
      { label: "📄 Copy to board", submenu: buildSendToBoardSubmenu(columnId, card.id, "copy", e.clientX, e.clientY) },
      { label: "🗃️ Archive", onClick: () => archiveCard(columnId, card.id) },
    ]);
  });
  el.addEventListener("mouseenter", () => { hoveredCardRef = { columnId, cardId: card.id }; });
  el.addEventListener("mouseleave", () => {
    if (hoveredCardRef && hoveredCardRef.cardId === card.id) hoveredCardRef = null;
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
    const idx = board.columns.indexOf(col);
    if (idx < 0) return;
    board.columns.splice(idx, 1);
    render();
    saveBoard();
    const b = board;
    offerUndo(`Deleted column "${col.title}"`, () => {
      b.columns.splice(Math.min(idx, b.columns.length), 0, col);
    }, b);
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
              if (sub.hideLabel) sbtn.classList.add("has-swatch");
              const swatchSpan = `<span class="submenu-swatch${sub.customSwatch ? " submenu-swatch-custom" : ""}" style="background:${sub.swatch}"></span>`;
              sbtn.innerHTML = sub.hideLabel ? swatchSpan : `${swatchSpan}<span>${escapeHtml(sub.label)}</span>`;
              if (sub.hideLabel) sbtn.title = sub.label;
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
      // Same swatch rendering a submenu entry gets, for a top-level item
      // that's itself a flat list of colors (e.g. the pen color picker) -
      // no reason to force an extra "Color" submenu hop just to see swatches.
      if (item.swatch) {
        btn.classList.add("has-swatch");
        const swatchSpan = `<span class="submenu-swatch${item.customSwatch ? " submenu-swatch-custom" : ""}" style="background:${item.swatch}"></span>`;
        btn.innerHTML = item.hideLabel ? swatchSpan : `${swatchSpan}<span>${escapeHtml(item.label)}</span>`;
        if (item.hideLabel) btn.title = item.label;
      } else {
        btn.textContent = item.label;
      }
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
const CUSTOM_COLOR_POOL_MAX = 40;
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
      <button type="button" id="ccp-save-btn" title="Save to my colors">+</button>
      <button type="button" id="custom-color-panel-confirm">Confirm</button>
    </div>
    <div id="ccp-pool"></div>
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

  // Saved "my colors" pool - shared by every place this panel opens from
  // (label manager, card Color > Custom...). Clicking one only loads it
  // into the picker; Confirm still applies it, same as any other pick.
  // Right-click removes it, but also loads it first, so the + button
  // puts it straight back if that was a misclick.
  const poolEl = panel.querySelector("#ccp-pool");
  function renderPool() {
    const pool = appData.customColors || [];
    poolEl.innerHTML = pool.length ? "" : `<span class="ccp-pool-empty">Saved colors appear here</span>`;
    pool.forEach((color) => {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "ccp-pool-swatch";
      sw.style.background = color;
      sw.title = `${color} · Click to use · Right-click to remove`;
      sw.addEventListener("click", () => { ({ h, s, v } = hexToHsv(color)); updateUI(); });
      sw.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ({ h, s, v } = hexToHsv(color));
        updateUI();
        appData.customColors = pool.filter((c) => c !== color);
        renderPool();
        saveBoard();
      });
      poolEl.appendChild(sw);
    });
  }
  renderPool();
  panel.querySelector("#ccp-save-btn").addEventListener("click", () => {
    const hex = currentHex().toLowerCase();
    const pool = (appData.customColors || []).filter((c) => c !== hex);
    appData.customColors = [hex, ...pool].slice(0, CUSTOM_COLOR_POOL_MAX);
    renderPool();
    saveBoard();
  });

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

// ----- Toast -----
// A small bottom-center message that fades on its own, with an optional
// single action button (e.g. "Go to board"). Only one at a time - a new
// toast replaces whatever is showing.
let toastTimer = null;
function showToast(message, { actionLabel, onAction, duration = 4000 } = {}) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.innerHTML = `<span class="toast-msg">${escapeHtml(message)}</span>${actionLabel ? `<button type="button" class="toast-action">${escapeHtml(actionLabel)}</button>` : ""}`;
  if (actionLabel) {
    el.querySelector(".toast-action").addEventListener("click", () => { hideToast(); onAction(); });
  }
  el.classList.add("toast-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, duration);
}
function hideToast() {
  clearTimeout(toastTimer);
  const el = document.getElementById("toast");
  if (el) el.classList.remove("toast-visible");
}
function shortTitle(card) {
  const t = card.title || "(untitled)";
  return t.length > 40 ? t.slice(0, 39) + "…" : t;
}

// ----- Card copy / paste / move / duplicate -----
// The clipboard holds a snapshot taken at copy time (same precaution as the
// whiteboard's wbClipboard), plus the source board's label objects - so a
// paste still knows each label's name/color even if the source board was
// archived or deleted in between.
let cardClipboard = null;
let hoveredCardRef = null; // { columnId, cardId } - for Ctrl+C / Ctrl+V
let hoveredColumnId = null;

function snapshotCard(card, srcBoard) {
  return {
    card: JSON.parse(JSON.stringify(card)),
    labels: (card.labelIds || []).map((id) => srcBoard.labels.find((l) => l.id === id)).filter(Boolean).map((l) => ({ ...l })),
    sourceBoardId: srcBoard.id,
  };
}

// Labels are per-board, so a card landing on another board gets its labels
// matched there by name + color, then by name alone, and any still missing
// get created on the destination board.
function remapSnapshotLabels(snap, dstBoard) {
  if (snap.sourceBoardId === dstBoard.id) {
    return (snap.card.labelIds || []).filter((id) => dstBoard.labels.some((l) => l.id === id));
  }
  return snap.labels.map((src) => {
    const name = (src.name || "").trim().toLowerCase();
    const match =
      dstBoard.labels.find((l) => (l.name || "").trim().toLowerCase() === name && (l.color || "").toLowerCase() === (src.color || "").toLowerCase()) ||
      dstBoard.labels.find((l) => (l.name || "").trim().toLowerCase() === name);
    if (match) return match.id;
    const created = { id: crypto.randomUUID(), name: src.name, color: src.color, emoji: src.emoji || null };
    dstBoard.labels.push(created);
    return created.id;
  });
}

// keepIds: a move keeps the card's identity; a copy gets fresh ids
// everywhere (card, checklist items, comments) so nothing is shared.
function instantiateSnapshot(snap, dstBoard, keepIds = false) {
  const card = JSON.parse(JSON.stringify(snap.card));
  delete card.archivedAt;
  delete card.originalColumnId;
  delete card.originalColumnTitle;
  if (!keepIds) {
    card.id = crypto.randomUUID();
    (card.checklist || []).forEach((i) => { i.id = crypto.randomUUID(); });
    (card.comments || []).forEach((c) => { c.id = crypto.randomUUID(); });
  }
  card.labelIds = remapSnapshotLabels(snap, dstBoard);
  normalizeCardDefaults(card);
  return card;
}

// Briefly highlights a card that just appeared, so a paste/duplicate is
// easy to spot among its neighbors.
function flashCard(cardId) {
  const el = document.querySelector(`.card[data-id="${cardId}"]`);
  if (!el) return;
  el.classList.remove("card-flash");
  void el.offsetWidth;
  el.classList.add("card-flash");
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function copyCard(columnId, cardId) {
  const card = findCard(cardId, columnId);
  if (!card) return;
  cardClipboard = snapshotCard(card, board);
  // Also a plain-text version on the OS clipboard, for pasting into other apps.
  const lines = [card.title || "", ...(card.checklist || []).map((i) => `${i.done ? "[x]" : "[ ]"} ${i.text}`)];
  if (navigator.clipboard) navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
  showToast(`Copied "${shortTitle(card)}" · Ctrl+V or a column's ⋯ menu to paste`);
}

function pasteCard(columnId, index) {
  if (!cardClipboard) return;
  const col = getColumn(columnId);
  if (!col) return;
  const card = instantiateSnapshot(cardClipboard, board);
  const at = index === undefined ? col.cards.length : Math.max(0, Math.min(index, col.cards.length));
  col.cards.splice(at, 0, card);
  render();
  saveBoard();
  flashCard(card.id);
}

function duplicateCard(columnId, cardId) {
  const col = getColumn(columnId);
  if (!col) return;
  const idx = col.cards.findIndex((c) => c.id === cardId);
  if (idx < 0) return;
  const copy = instantiateSnapshot(snapshotCard(col.cards[idx], board), board);
  col.cards.splice(idx + 1, 0, copy);
  render();
  saveBoard();
  flashCard(copy.id);
}

// Sends a card from the current board to a column on another board -
// either a copy (the original stays) or a move (the original is removed).
function sendCardToBoard(columnId, cardId, dstBoard, dstColumnId, mode) {
  const col = getColumn(columnId);
  const dstCol = dstBoard.columns.find((c) => c.id === dstColumnId);
  if (!col || !dstCol) return;
  const idx = col.cards.findIndex((c) => c.id === cardId);
  if (idx < 0) return;
  const card = col.cards[idx];
  dstCol.cards.push(instantiateSnapshot(snapshotCard(card, board), dstBoard, mode === "move"));
  if (mode === "move") col.cards.splice(idx, 1);
  render();
  saveBoard();
  const where = `${dstBoard.name} › ${dstCol.title}`;
  showToast(`${mode === "move" ? "Moved" : "Copied"} "${shortTitle(card)}" to ${where}`, {
    actionLabel: "Go to board",
    onAction: () => switchBoard(dstBoard.id),
    duration: 6000,
  });
}

// "Move to board…" / "Copy to board…" submenu: every other board, in
// sidebar order. Picking a board with several columns opens a second small
// menu (same spot) to choose the column; a one-column board skips that.
function buildSendToBoardSubmenu(columnId, cardId, mode, x, y) {
  const others = appData.boards.filter((b) => b.id !== board.id);
  if (!others.length) return [{ label: "(no other boards)", onClick: () => {} }];
  return others.map((b) => ({
    label: `${b.emoji ? b.emoji + " " : ""}${b.name || "Untitled"}`,
    onClick: () => {
      if (!b.columns.length) { openAlertPopover(`"${b.name}" has no columns yet.`); return; }
      if (b.columns.length === 1) { sendCardToBoard(columnId, cardId, b, b.columns[0].id, mode); return; }
      setTimeout(() => openMenu(x, y, b.columns.map((c) => ({
        label: `→ ${c.emoji ? c.emoji + " " : ""}${c.title}`,
        onClick: () => sendCardToBoard(columnId, cardId, b, c.id, mode),
      }))), 0);
    },
  }));
}

function isTypingInField() {
  const active = document.activeElement;
  return !!(active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable));
}
function anyOverlayOpen() {
  return !!document.querySelector('[id$="-overlay"]:not(.hidden):not(#pomo-board-overlay)');
}
// Ctrl+C / Ctrl+V on the board itself (never while typing, on the
// whiteboard, with a modal open, or with text selected - those all keep
// their normal copy/paste).
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key !== "c" && key !== "v") return;
  if (whiteboardActive || isTypingInField() || anyOverlayOpen()) return;
  if (key === "c") {
    if (!hoveredCardRef || String(window.getSelection() || "").trim()) return;
    e.preventDefault();
    copyCard(hoveredCardRef.columnId, hoveredCardRef.cardId);
  } else {
    if (!cardClipboard || !board.columns.length) return;
    e.preventDefault();
    if (hoveredCardRef && getColumn(hoveredCardRef.columnId)) {
      const col = getColumn(hoveredCardRef.columnId);
      const idx = col.cards.findIndex((c) => c.id === hoveredCardRef.cardId);
      pasteCard(col.id, idx < 0 ? undefined : idx + 1);
    } else {
      pasteCard(getColumn(hoveredColumnId) ? hoveredColumnId : board.columns[0].id);
    }
  }
});

// ----- Inline "Add Card" -----

// insertIndex null = the usual "+ Add Card" at the bottom; a number = the
// header "+" button, adding at that position from the top (0 first, then
// 1, 2... as Enter keeps adding, so cards stay in the order typed).
function createInlineAddInput(columnId, insertIndex = null) {
  const container = document.getElementById(`cards-${columnId}`);
  if (!container) return;
  const wrapper = document.createElement("div");
  wrapper.className = "card inline-add-card";
  const row = document.createElement("div");
  row.className = "inline-add-row";
  activeInlineAdd = { status: columnId, wrapperEl: wrapper, inputEl: null, emoji: null, insertIndex };
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
  if (insertIndex === null) {
    container.appendChild(wrapper);
  } else {
    container.insertBefore(wrapper, container.children[insertIndex] || null);
    if (insertIndex === 0) container.scrollTop = 0;
  }
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

function openInlineAdd(columnId, atTop = false) {
  if (activeInlineAdd) {
    const sameSpot = activeInlineAdd.status === columnId && (activeInlineAdd.insertIndex !== null) === atTop;
    if (sameSpot) { activeInlineAdd.inputEl.focus(); return; }
    commitInlineAdd(false);
  }
  createInlineAddInput(columnId, atTop ? 0 : null);
}

function commitInlineAdd(reopen) {
  if (!activeInlineAdd) return;
  const { status: columnId, inputEl, emoji, insertIndex } = activeInlineAdd;
  const typedTitle = inputEl.value.trim();
  activeInlineAdd = null;
  if (!typedTitle && !emoji) { render(); return; }
  const col = getColumn(columnId);
  if (col) {
    const newCard = { id: crypto.randomUUID(), title: typedTitle, description: "", checklist: [], dueDate: null, hasDueTime: false, labelIds: [], color: null, completed: false, comments: [], emoji: emoji || null };
    if (insertIndex === null) col.cards.push(newCard);
    else col.cards.splice(insertIndex, 0, newCard);
  }
  render();
  saveBoard();
  if (reopen) createInlineAddInput(columnId, insertIndex === null ? null : insertIndex + 1);
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
  setDetailRepeat(card.repeat || null);
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
  card.repeat = card.dueDate ? detailRepeat : null;
  return card;
}

function saveAndCloseDetail() {
  const columnId = editingCard && editingCard.status;
  const cardId = editingCard && editingCard.id;
  const card = commitDetailFieldsToCard();
  if (card) {
    // A full render() tears down and rebuilds every column's .cards
    // container from scratch, which reset all of them (not just this
    // card's) to scrollTop 0 - patchCard rebuilds just this one card in
    // place instead, the same pattern used for every other single-card
    // edit (checklist toggle, complete toggle, emoji pick, etc.).
    patchCard(columnId, cardId);
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
  // Commit first, so a repeating card's next copy gets any unsaved edits
  // (including a just-picked Repeat setting).
  commitDetailFieldsToCard();
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
    <div id="popover-alarm-hint" class="due-alarm-hint hidden"></div>
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
  const alarmHint = panel.querySelector("#popover-alarm-hint");
  syncDueAlarmHint(alarmHint, timeToggle.checked);

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
    syncDueAlarmHint(alarmHint, timeToggle.checked);
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
  boardDragState = { id: b.id, startX: e.clientX, startY: e.clientY, dragging: false, ghostEl: null, indicatorEl: null, dropTarget: null, itemEl };
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

// Top-level rows of the boards list (loose boards + whole category blocks),
// minus whatever's currently being dragged - indexes into this line up with
// appData.sidebarOrder once the dragged entry has been taken out of it.
function sidebarTopLevelEls(list) {
  return Array.from(list.children).filter((el) =>
    el.matches(".board-item, .sidebar-category") &&
    !el.classList.contains("board-item-dragging-source") &&
    !el.classList.contains("sidebar-category-dragging-source"));
}

// Where a dragged board would land: { catId, index } (catId null = top
// level). Hovering a category's header (or its "Drag boards here" hint)
// drops into that category; the lower half of a category's last board still
// counts as inside it, anything below that is back out at the top level.
function updateBoardItemDropTarget(e) {
  const list = document.getElementById("boards-list");
  const y = e.clientY;
  const ind = boardDragState.indicatorEl || (boardDragState.indicatorEl = document.createElement("div"));
  ind.className = "board-item-drop-indicator";
  list.querySelectorAll(".category-drop-target").forEach((el) => el.classList.remove("category-drop-target"));
  const within = (el) => { const r = el.getBoundingClientRect(); return y >= r.top && y <= r.bottom; };

  for (const catEl of list.querySelectorAll(".sidebar-category")) {
    const header = catEl.querySelector(".category-header");
    const emptyHint = catEl.querySelector(".category-empty");
    if (!within(header) && !(emptyHint && within(emptyHint))) continue;
    const cat = appData.categories.find((c) => c.id === catEl.dataset.categoryId);
    if (cat.collapsed || emptyHint) {
      // Nothing visible inside to point between - highlight the header instead.
      header.classList.add("category-drop-target");
      ind.remove();
      boardDragState.dropTarget = { catId: cat.id, index: Infinity };
    } else {
      ind.classList.add("in-category");
      catEl.querySelector(".category-boards").prepend(ind);
      boardDragState.dropTarget = { catId: cat.id, index: 0 };
    }
    return;
  }

  const rows = Array.from(list.querySelectorAll(".board-item:not(.board-item-dragging-source), .category-header"));
  let i = rows.findIndex((r) => { const rect = r.getBoundingClientRect(); return y < rect.top + rect.height / 2; });
  const prev = i === -1 ? rows[rows.length - 1] : rows[i - 1];
  const prevCatEl = prev && prev.classList.contains("board-item") ? prev.closest(".sidebar-category") : null;
  if (prevCatEl && y <= prev.getBoundingClientRect().bottom + 2) {
    ind.classList.add("in-category");
    prevCatEl.querySelector(".category-boards").appendChild(ind);
    boardDragState.dropTarget = { catId: prevCatEl.dataset.categoryId, index: Infinity };
    return;
  }
  if (i === -1) {
    list.appendChild(ind);
    boardDragState.dropTarget = { catId: null, index: Infinity };
    return;
  }
  const row = rows[i];
  const rowCatEl = row.closest(".sidebar-category");
  if (row.classList.contains("board-item") && rowCatEl) {
    const siblings = Array.from(rowCatEl.querySelectorAll(".board-item:not(.board-item-dragging-source)"));
    ind.classList.add("in-category");
    row.before(ind);
    boardDragState.dropTarget = { catId: rowCatEl.dataset.categoryId, index: siblings.indexOf(row) };
  } else {
    // A loose board, or a category header (i.e. just above that category).
    const topEl = rowCatEl || row;
    topEl.before(ind);
    boardDragState.dropTarget = { catId: null, index: sidebarTopLevelEls(list).indexOf(topEl) };
  }
}

function onBoardItemDocMouseUp(e) {
  if (!boardDragState) return;
  document.removeEventListener("mousemove", onBoardItemDocMouseMove);
  document.removeEventListener("mouseup", onBoardItemDocMouseUp);
  if (boardDragState.indicatorEl) boardDragState.indicatorEl.remove();

  if (boardDragState.dragging) {
    if (boardDragState.ghostEl) boardDragState.ghostEl.remove();
    boardDragState.itemEl.classList.remove("board-item-dragging-source");
    const target = boardDragState.dropTarget;
    if (target) {
      const id = boardDragState.id;
      appData.sidebarOrder = appData.sidebarOrder.filter((x) => !(x.type === "board" && x.id === id));
      appData.categories.forEach((c) => { c.boardIds = c.boardIds.filter((x) => x !== id); });
      const cat = target.catId && appData.categories.find((c) => c.id === target.catId);
      if (cat) cat.boardIds.splice(Math.min(target.index, cat.boardIds.length), 0, id);
      else appData.sidebarOrder.splice(Math.min(target.index, appData.sidebarOrder.length), 0, { type: "board", id });
    }
    renderSidebar();
    if (target) saveBoard();
  } else {
    switchBoard(boardDragState.id);
  }
  boardDragState = null;
}

// ----- Sidebar category drag-and-drop -----
// Hold-and-drag on a category header moves the whole block (its boards come
// along); a plain click without dragging toggles collapsed/expanded instead.

let categoryDragState = null;

function onCategoryMouseDown(e, cat, wrapEl) {
  if (e.button !== 0) return;
  categoryDragState = { id: cat.id, startX: e.clientX, startY: e.clientY, dragging: false, ghostEl: null, indicatorEl: null, dropIndex: null, wrapEl };
  document.addEventListener("mousemove", onCategoryDocMouseMove);
  document.addEventListener("mouseup", onCategoryDocMouseUp);
}

function onCategoryDocMouseMove(e) {
  const s = categoryDragState;
  if (!s) return;
  if (!s.dragging && Math.hypot(e.clientX - s.startX, e.clientY - s.startY) > 6) {
    s.dragging = true;
    const rect = s.wrapEl.getBoundingClientRect();
    const ghost = s.wrapEl.cloneNode(true);
    ghost.classList.add("sidebar-category-ghost");
    ghost.style.width = rect.width + "px";
    document.body.appendChild(ghost);
    s.ghostEl = ghost;
    s.offsetX = s.startX - rect.left;
    s.offsetY = s.startY - rect.top;
    s.wrapEl.classList.add("sidebar-category-dragging-source");
  }
  if (!s.dragging) return;
  s.ghostEl.style.left = e.clientX - s.offsetX + "px";
  s.ghostEl.style.top = e.clientY - s.offsetY + "px";

  const list = document.getElementById("boards-list");
  const els = sidebarTopLevelEls(list);
  let index = els.findIndex((el) => { const r = el.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
  if (index === -1) index = els.length;
  s.dropIndex = index;
  if (!s.indicatorEl) {
    s.indicatorEl = document.createElement("div");
    s.indicatorEl.className = "board-item-drop-indicator";
  }
  if (index >= els.length) list.appendChild(s.indicatorEl);
  else els[index].before(s.indicatorEl);
}

function onCategoryDocMouseUp(e) {
  const s = categoryDragState;
  if (!s) return;
  document.removeEventListener("mousemove", onCategoryDocMouseMove);
  document.removeEventListener("mouseup", onCategoryDocMouseUp);
  categoryDragState = null;
  if (s.indicatorEl) s.indicatorEl.remove();
  const cat = appData.categories.find((c) => c.id === s.id);
  if (!cat) return;
  if (s.dragging) {
    if (s.ghostEl) s.ghostEl.remove();
    s.wrapEl.classList.remove("sidebar-category-dragging-source");
    if (s.dropIndex !== null) {
      appData.sidebarOrder = appData.sidebarOrder.filter((x) => !(x.type === "category" && x.id === s.id));
      appData.sidebarOrder.splice(Math.min(s.dropIndex, appData.sidebarOrder.length), 0, { type: "category", id: s.id });
      renderSidebar();
      saveBoard();
    }
  } else {
    cat.collapsed = !cat.collapsed;
    renderSidebar();
    saveBoard();
  }
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
// the whole plan (the last of pomo.totalSessions work sessions finishing)
// stops and celebrates immediately, with no trailing break - a break exists
// to lead back into another work session, so tacking one onto the very end
// (right before declaring the plan done) has nothing left for it to lead
// into. Requested after the non-auto version confused the user: it left
// them stuck manually pressing Start into a break instead of a fresh focus
// session, and Reset only cleared the current phase rather than letting
// them start the plan over.
function pomoCompletePhase() {
  clearInterval(pomo.intervalId);
  pomo.intervalId = null;
  pomo.running = false;

  if (pomo.phase === "work") {
    playPomoSound(pomo.cowMode ? "cowComplete" : "complete");
    pomo.workSessionsCompleted += 1;
    const icon = pomo.cowMode ? "🥛" : "🍅";
    if (pomo.workSessionsCompleted >= pomo.totalSessions) {
      notifyPomodoro("🎉 All focus sessions done", "Nice work - that's the whole plan.");
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
    notifyPomodoro(`${icon} Focus session done`, pomo.phase === "longBreak" ? "Time for a long break." : "Time for a short break.");
  } else {
    playPomoSound("breakEnd");
    pomo.phase = "work";
    notifyPomodoro("☕ Break's over", "Back to focus.");
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