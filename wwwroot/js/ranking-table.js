(function () {
  "use strict";

  let nextFieldId = 0;
  const collator = new Intl.Collator("bg", { sensitivity: "base", numeric: true });
  const fold = value => value.trim().toLocaleLowerCase("bg");
  const inputNumber = value => {
    const text = value.trim().replace(/\s/g, "").replace(",", ".").replace("−", "-");
    if (text === "") return null;
    const number = Number(text);
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(number) ? number : NaN;
  };

  // Only one sorting column and one optional column filter are stored per dataset.
  function connect(table) {
    const toolbar = document.createElement("div");
    toolbar.className = "ranking-toolbar";
    toolbar.innerHTML = '<form class="ranking-filter" hidden></form><p class="hint" role="status" hidden></p>';
    table.closest(".tablewrap").before(toolbar);
    const form = toolbar.querySelector("form");
    const status = toolbar.querySelector("p");
    let state, columns, rows, empty, editor, defaultKey, defaultDirection;

    const raw = (row, column) => {
      const cell = row.cells[column.index];
      return cell?.dataset.value ?? cell?.textContent.trim() ?? "";
    };
    const typed = (row, column) => {
      const value = raw(row, column);
      if (!value) return null;
      if (column.type !== "number") return value;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };

    function refresh(nextState) {
      state = nextState;
      editor = null;
      form.hidden = true;
      columns = new Map();
      rows = Array.from(table.tBodies[0].rows).filter(r => !r.classList.contains("ranking-empty"));
      table.tBodies[0].querySelector(".ranking-empty")?.remove();
      empty = table.tBodies[0].insertRow();
      empty.className = "ranking-empty";
      const note = empty.insertCell();
      note.colSpan = table.tHead.rows[0].cells.length;
      note.textContent = "Няма редове за избрания филтър.";
      table.tHead.querySelectorAll("th[data-column]").forEach(th => {
        const fields = th.dataset;
        const column = {
          key: fields.column, type: fields.type || "text", direction: fields.direction || "asc",
          index: th.cellIndex, label: th.dataset.label || th.textContent.trim(), th
        };
        th.dataset.label = column.label;
        columns.set(column.key, column);
        th.replaceChildren();
        const wrap = document.createElement("span");
        wrap.className = "ranking-head";
        const sortButton = document.createElement("button");
        sortButton.type = "button";
        sortButton.className = "ranking-sort";
        sortButton.title = "Сортирай по „" + column.label + "“";
        sortButton.append(document.createTextNode(column.label + " "));
        const arrow = document.createElement("span");
        arrow.className = "sort-arrow";
        arrow.setAttribute("aria-hidden", "true");
        sortButton.append(arrow);
        sortButton.addEventListener("click", () => {
          const same = state.sort?.key === column.key;
          state.sort = {
            key: column.key,
            direction: same ? (state.sort.direction === "asc" ? "desc" : "asc") : column.direction
          };
          apply();
        });
        const filter = document.createElement("button");
        filter.type = "button";
        filter.className = "ranking-filter-button";
        filter.title = "Филтър по „" + column.label + "“";
        filter.setAttribute("aria-label", filter.title);
        filter.setAttribute("aria-expanded", "false");
        filter.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 3h12L9.5 8v3.5l-3 1.5V8z" fill="none" stroke="currentColor" stroke-linejoin="round"/></svg>';
        filter.addEventListener("click", () => {
          if (editor?.key === column.key) closeEditor(false);
          else openEditor(column);
        });
        Object.assign(column, { arrow, filter });
        wrap.append(sortButton, filter);
        th.append(wrap);
      });
      defaultKey = table.dataset.defaultSort;
      defaultDirection = table.dataset.defaultDirection;
      if (!columns.has(state.sort?.key)) {
        const key = columns.has(defaultKey) ? defaultKey : columns.keys().next().value;
        state.sort = { key, direction: defaultDirection || columns.get(key)?.direction || "asc" };
      }
      if (!columns.has(state.filter?.key)) state.filter = null;
      apply();
    }

    function apply() {
      const sort = columns.get(state.sort.key);
      const direction = state.sort.direction === "asc" ? 1 : -1;
      const filter = columns.get(state.filter?.key);
      function passes(row) {
        if (!filter) return true;
        const value = typed(row, filter);
        if (value === null) return false;
        if (filter.type === "number") {
          const { min, max } = state.filter;
          return (min === null || value >= min) && (max === null || value <= max);
        }
        if (filter.type === "category") return value === state.filter.text;
        return fold(value).includes(fold(state.filter.text));
      }
      const ordered = rows.slice().sort((a, b) => {
        if (!sort) return 0;
        const x = typed(a, sort), y = typed(b, sort);
        if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
        return direction * (sort.type === "number" ? x - y : collator.compare(x, y));
      });
      let shown = 0;
      ordered.forEach(row => {
        row.hidden = !passes(row);
        if (!row.hidden) shown++;
        table.tBodies[0].insertBefore(row, empty);
      });
      empty.hidden = shown > 0;
      columns.forEach(c => {
        if (c === sort) c.th.setAttribute("aria-sort", direction === 1 ? "ascending" : "descending");
        else c.th.removeAttribute("aria-sort");
        c.arrow.textContent = c === sort ? (direction === 1 ? "↑" : "↓") : "↕";
        c.filter.classList.toggle("active", c === filter);
        c.filter.setAttribute("aria-expanded", String(c === editor));
      });
      status.hidden = !filter;
      if (filter) {
        status.replaceChildren(document.createTextNode("Филтър по „" + filter.label + "“ · " + shown + " от " + rows.length + " реда. "));
        const clear = document.createElement("button");
        clear.type = "button";
        clear.textContent = "Изчисти";
        clear.addEventListener("click", () => {
          state.filter = null;
          closeEditor(false);
          apply();
          filter.filter.focus();
        });
        status.append(clear);
      }
    }

    function closeEditor(restoreFocus) {
      if (editor) {
        editor.filter.setAttribute("aria-expanded", "false");
        if (restoreFocus) editor.filter.focus();
      }
      editor = null;
      form.hidden = true;
    }

    function openEditor(column) {
      closeEditor(false);
      editor = column;
      editor.filter.setAttribute("aria-expanded", "true");
      const current = state.filter?.key === column.key ? state.filter : null;
      form.replaceChildren();
      const label = document.createElement("strong");
      label.textContent = "Филтър по „" + column.label + "“";
      form.append(label);
      function field(title, element) {
        const field = document.createElement("div");
        field.className = "ranking-field";
        const label = document.createElement("label");
        element.id = "ranking-field-" + (++nextFieldId);
        label.htmlFor = element.id;
        label.textContent = title;
        field.append(label, element);
        form.append(field);
        return element;
      }
      let first, second;
      if (column.type === "number") {
        first = field("От", document.createElement("input"));
        second = field("До", document.createElement("input"));
        first.inputMode = second.inputMode = "decimal";
        first.value = current?.min ?? "";
        second.value = current?.max ?? "";
      } else if (column.type === "category") {
        first = field("Стойност", document.createElement("select"));
        first.add(new Option("Всички", ""));
        const values = new Set(rows.map(row => raw(row, column)).filter(Boolean));
        Array.from(values).sort(collator.compare).forEach(value => first.add(new Option(value, value)));
        first.value = current?.text ?? "";
      } else {
        first = field("Съдържа", document.createElement("input"));
        first.type = "search";
        first.value = current?.text ?? "";
      }
      const submit = document.createElement("button");
      submit.textContent = "Приложи";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Затвори";
      cancel.addEventListener("click", () => closeEditor(true));
      form.append(submit, cancel);
      form.onsubmit = event => {
        event.preventDefault();
        if (column.type === "number") {
          const min = inputNumber(first.value), max = inputNumber(second.value);
          first.setCustomValidity(Number.isNaN(min) ? "Въведете число." :
            Number.isNaN(max) ? "Горната граница трябва да е число." :
            min !== null && max !== null && min > max ? "„От“ трябва да е по-малко или равно на „До“." : "");
          if (!form.reportValidity()) return;
          state.filter = min === null && max === null ? null : { key: column.key, min, max };
        } else {
          const text = first.value.trim();
          state.filter = text ? { key: column.key, text } : null;
        }
        closeEditor(true);
        apply();
      };
      first.addEventListener("input", () => first.setCustomValidity(""));
      second?.addEventListener("input", () => first.setCustomValidity(""));
      form.hidden = false;
      first.focus();
    }

    form.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeEditor(true);
      }
    });

    return { refresh };
  }

  window.RankingTable = { connect };
  document.querySelectorAll("table[data-ranking]").forEach(table => connect(table).refresh({}));
})();
