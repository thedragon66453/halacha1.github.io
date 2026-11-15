// מנוע המבחנים. כל עמוד מבחן מגדיר window.QUIZ עם השאלות, והקובץ הזה בונה ובודק.
(function () {
  var cfg = window.QUIZ;
  var COUNT = 4; // כמה שאלות בכל מבחן
  var root = document.getElementById("quiz");
  var current = []; // השאלות של הניסיון הנוכחי: { q, check }

  // ---------- כלי עזר ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // מנקה ניקוד, גרשיים וסימני פיסוק כדי להשוות תשובות פתוחות
  function normalize(s) {
    return String(s)
      .replace(/[\u0591-\u05C7]/g, "")
      .replace(/["'\u05F4\u05F3\u201C\u201D\u2018\u2019]/g, "")
      .replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function openCorrect(q, value) {
    var text = normalize(value);
    if (!text) return false;
    text = " " + text + " ";
    return q.accept.some(function (a) {
      return text.indexOf(" " + normalize(a) + " ") !== -1;
    });
  }

  // ---------- בחירת השאלות ----------
  function pickQuestions() {
    var always = cfg.questions.filter(function (q) { return q.always; });
    var rest = shuffle(cfg.questions.filter(function (q) { return !q.always; }));
    return shuffle(always.concat(rest).slice(0, COUNT));
  }

  // ---------- שאלה אמריקאית ----------
  function renderMc(q, i, box) {
    var opts = [{ t: q.correct, ok: true }].concat(
      q.wrong.map(function (w) { return { t: w, ok: false }; })
    );
    opts = shuffle(opts);
    var group = el("div", "opts");
    opts.forEach(function (o) {
      var label = el("label", "opt");
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "q" + i;
      label.appendChild(input);
      label.appendChild(el("span", null, o.t));
      group.appendChild(label);
      o.input = input;
    });
    box.appendChild(group);
    return function () {
      return opts.some(function (o) { return o.ok && o.input.checked; });
    };
  }

  // ---------- שאלה פתוחה ----------
  function renderOpen(q, i, box) {
    var input = document.createElement("input");
    input.type = "text";
    input.className = "open-input";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("placeholder", "כתוב כאן את התשובה");
    box.appendChild(input);
    return function () { return openCorrect(q, input.value); };
  }

  // ---------- מילוי תרשים ----------
  function flatten(node, out) {
    out.push(node);
    (node.children || []).forEach(function (c) { flatten(c, out); });
    return out;
  }

  function renderDiagram(q, i, box) {
    var all = flatten(q.tree, []).filter(function (n) { return n !== q.tree; });
    var blanks = shuffle(all).slice(0, q.blanks || 3);
    var selects = [];

    function build(node) {
      var li = el("li");
      if (blanks.indexOf(node) !== -1) {
        var sel = el("select", "node blank");
        sel.appendChild(new Option("בחר...", ""));
        shuffle(blanks).forEach(function (b) {
          sel.appendChild(new Option(b.text, b.id));
        });
        selects.push({ sel: sel, id: node.id });
        li.appendChild(sel);
      } else {
        li.appendChild(el("div", "node " + (node.c || ""), node.text));
      }
      if (node.children && node.children.length) {
        var ul = el("ul");
        node.children.forEach(function (c) { ul.appendChild(build(c)); });
        li.appendChild(ul);
      }
      return li;
    }

    var tree = el("ul", "tree");
    tree.appendChild(build(q.tree));
    box.appendChild(tree);
    return function () {
      return selects.every(function (s) { return s.sel.value === s.id; });
    };
  }

  // ---------- בניית המבחן ----------
  function render() {
    root.innerHTML = "";
    current = [];
    pickQuestions().forEach(function (q, i) {
      var box = el("div", "q");
      box.appendChild(el("p", "q-text", (i + 1) + ". " + q.text));
      var check;
      if (q.type === "mc") check = renderMc(q, i, box);
      else if (q.type === "open") check = renderOpen(q, i, box);
      else check = renderDiagram(q, i, box);
      current.push({ q: q, check: check });
      root.appendChild(box);
    });

    var btn = el("button", "check-btn", "סיום ובדיקה");
    btn.type = "button";
    btn.addEventListener("click", function () {
      showResult(current.map(function (c) { return c.check(); }));
    });
    root.appendChild(btn);
  }

  // ---------- תוצאה ----------
  function link(text, href, cls) {
    var a = el("a", "btn-link " + cls, text);
    a.href = href;
    return a;
  }

  function showResult(results) {
    var correct = results.filter(Boolean).length;
    var passed = correct === current.length;
    root.innerHTML = "";

    var box = el("div", "result " + (passed ? "pass" : "fail"));

    if (passed) {
      var saved = Progress.markDone(cfg.part);
      box.appendChild(el("h2", null, "כל הכבוד! ענית נכון על כל השאלות"));
      box.appendChild(el("p", null, "החלק הושלם, וההתקדמות הכללית שלך עלתה ל-" + Progress.percent() + "%."));

      var track = el("div", "progress-track");
      var fill = el("div", "progress-fill");
      fill.style.width = Progress.percent() + "%";
      track.appendChild(fill);
      box.appendChild(track);

      if (!saved) {
        box.appendChild(el("p", "warn", "שים לב: הדפדפן לא מאפשר לשמור התקדמות, ולכן היא לא תישמר."));
      }
      box.appendChild(link("חזרה לרשימת החלקים", cfg.topic, "gold"));
      box.appendChild(link("לחזור על החומר", cfg.material, "secondary"));
    } else {
      box.appendChild(el("h2", null, "ענית נכון על " + correct + " מתוך " + current.length));
      box.appendChild(el("p", null, "כדי להשלים את החלק צריך לענות נכון על כל השאלות. חזור לחומר ונסה שוב, ובמבחן הבא יופיעו שאלות אחרות."));

      var list = el("ul", "review");
      current.forEach(function (c, i) {
        var li = el("li", results[i] ? "ok" : "bad", (results[i] ? "✓ " : "✗ ") + c.q.text);
        list.appendChild(li);
      });
      box.appendChild(list);

      box.appendChild(link("חזרה לחומר", cfg.material, "primary"));
      box.appendChild(link("חזרה לרשימת החלקים", cfg.topic, "secondary"));
    }

    root.appendChild(box);
    window.scrollTo(0, 0);
  }

  render();
})();
