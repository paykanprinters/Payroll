/**
 * Browser-side pagination: pack flowing report blocks into fixed-height sheets.
 * Injected into Chromium print documents (and iframe preview via srcDoc).
 */
export const REPORT_SHEET_PAGINATION_SCRIPT = `
(function () {
  function createSheet(innerMaxPx) {
    var sheet = document.createElement("div");
    sheet.className = "sheet";
    var inner = document.createElement("div");
    inner.className = "sheet-inner";
    inner.dataset.maxPx = String(innerMaxPx);
    sheet.appendChild(inner);
    return { sheet: sheet, inner: inner };
  }

  function exceeds(inner, maxPx) {
    return inner.scrollHeight > maxPx + 1;
  }

  function paginate() {
    var flow = document.getElementById("report-flow");
    var desk = document.getElementById("sheets");
    if (!flow || !desk) {
      window.__REPORT_PAGINATED__ = true;
      window.__REPORT_SHEET_COUNT__ = 0;
      return;
    }

    var innerMaxPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sheet-inner-max-px")) || 900;
    var blocks = [];
    Array.prototype.forEach.call(flow.children, function (el) {
      if (el.classList && el.classList.contains("body")) {
        Array.prototype.forEach.call(el.children, function (child) { blocks.push(child); });
      } else {
        blocks.push(el);
      }
    });

    desk.innerHTML = "";
    var pack = createSheet(innerMaxPx);
    desk.appendChild(pack.sheet);

    function newSheet() {
      pack = createSheet(innerMaxPx);
      desk.appendChild(pack.sheet);
    }

    function placeNode(node) {
      pack.inner.appendChild(node);
      if (!exceeds(pack.inner, innerMaxPx)) return;
      pack.inner.removeChild(node);
      if (pack.inner.childNodes.length > 0) {
        newSheet();
      }
      pack.inner.appendChild(node);
    }

    function placeTable(table) {
      var thead = table.querySelector("thead");
      var bodyEl = table.tBodies && table.tBodies[0] ? table.tBodies[0] : table;
      var rows = Array.prototype.slice.call(bodyEl.rows || []);
      if (rows.length === 0) {
        placeNode(table);
        return;
      }

      function freshTable() {
        var t = document.createElement("table");
        if (table.className) t.className = table.className;
        var st = table.getAttribute("style");
        if (st) t.setAttribute("style", st);
        if (thead) t.appendChild(thead.cloneNode(true));
        var tb = document.createElement("tbody");
        t.appendChild(tb);
        return { table: t, tbody: tb };
      }

      var cur = freshTable();
      pack.inner.appendChild(cur.table);
      if (exceeds(pack.inner, innerMaxPx)) {
        pack.inner.removeChild(cur.table);
        newSheet();
        cur = freshTable();
        pack.inner.appendChild(cur.table);
      }

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        cur.tbody.appendChild(row);
        if (exceeds(pack.inner, innerMaxPx)) {
          cur.tbody.removeChild(row);
          if (cur.tbody.rows.length === 0) {
            pack.inner.removeChild(cur.table);
          }
          newSheet();
          cur = freshTable();
          pack.inner.appendChild(cur.table);
          cur.tbody.appendChild(row);
        }
      }
    }

    for (var i = 0; i < blocks.length; i++) {
      var node = blocks[i];
      if (node.tagName && node.tagName.toLowerCase() === "table") {
        placeTable(node);
      } else {
        placeNode(node);
      }
    }

    if (flow.parentNode) flow.parentNode.removeChild(flow);
    window.__REPORT_SHEET_COUNT__ = desk.children.length;
    window.__REPORT_PAGINATED__ = true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paginate);
  } else {
    paginate();
  }
})();
`.trim();
