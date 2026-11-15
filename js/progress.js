// שמירת התקדמות בדפדפן (localStorage) וחישוב אחוז ההתקדמות הכללי.
var Progress = (function () {
  var KEY = "halacha-progress-v1";

  // רשימת כל החלקים באתר. להוספת חלק חדש: מוסיפים כאן את המזהה שלו.
  var ALL_PARTS = [
    "melachot-1",
    "melachot-2",
    "melachot-3",
    "melachot-4",
    "melachot-5"
  ];

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }

  function write(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }

  return {
    isDone: function (id) { return read()[id] === true; },

    // מחזיר true אם ההתקדמות נשמרה בפועל בדפדפן
    markDone: function (id) {
      var data = read();
      data[id] = true;
      return write(data) && read()[id] === true;
    },

    percent: function () {
      var data = read();
      var done = ALL_PARTS.filter(function (id) { return data[id] === true; }).length;
      return Math.round(done / ALL_PARTS.length * 100);
    },

    reset: function () { write({}); }
  };
})();
