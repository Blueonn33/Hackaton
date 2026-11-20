(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const indicators = {
    k1564: "Коефициент на заетост, 15–64 г.",
    k15: "Коефициент на заетост, 15+ г.",
    emp: "Заети лица, хиляди"
  };
  const sexes = ["Общо", "Мъже", "Жени"];
  const levels = {
    obl: "Области (28)",
    reg: "Икономически региони (6)",
    nat: "България (национално)"
  };
  const country = "България";
  const fmt = [0, 1, 2].map(d => new Intl.NumberFormat("bg-BG", {
    minimumFractionDigits: d, maximumFractionDigits: d
  }));
  const format = (n, decimals = 1) => Number.isFinite(n) ? fmt[decimals].format(n) : "—";
  const signed = (n, unit) => Number.isFinite(n) ? (n < 0 ? "−" : "+") + format(Math.abs(n)) + unit : "—";
  const quarter = p => p ? `Q${p[5]} ${p.slice(0, 4)}` : "—";
  const previous = p => !p ? null : p[5] === "1" ? (+p.slice(0, 4) - 1) + "Q4" : p.slice(0, 5) + (p[5] - 1);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const demo = '<span class="tag">ДЕМО</span>';
  const opt = (value, label) => `<option value="${esc(value)}">${esc(label)}</option>`;
  const header = (key, label, type = "text", direction = "asc") =>
    `<th scope="col" data-column="${key}" data-type="${type}" data-direction="${direction}"${type === "number" ? ' class="num"' : ""}>${esc(label)}</th>`;
  const numCell = (value, label, active) =>
    `<td class="num${active ? " hl" : ""}" data-value="${Number.isFinite(value) ? value : ""}">${label}</td>`;
  const rowButton = (label, key, selected) =>
    `<button type="button" data-select="${esc(key)}" aria-pressed="${selected}">${esc(label)}</button>`;

  function boot(mapData, data) {
    const { d, code, rCode, azAll, azReal, azNat, names, ps, act, activityPeriod } = data;
    const districts = Object.keys(mapData.paths);
    const regions = Object.keys(rCode);
    const codes = { ...code, ...rCode, [country]: "BG" };
    const s = { ind: "k1564", sex: 0, activitySex: 0, per: "2026Q2", lvl: "obl", activity: 0, sel: null, hover: null, focus: null };
    const tableStates = { employment: {}, az: {}, profession: {}, activity: {} };
    const map = $("map");
    const ranking = $("mapRanking");
    const activityTable = $("activityTable");
    const rankingControls = window.RankingTable.connect(ranking);
    const activityControls = window.RankingTable.connect(activityTable);
    let shapes = [];

    const isActivity = () => s.ind === "activity";
    const isAz = () => s.ind === "az";
    const isProfession = () => s.ind.startsWith("prof:");
    const profIndex = () => Number(s.ind.slice(5));
    const isEmployment = () => Object.hasOwn(indicators, s.ind);
    const areaLevel = () => isActivity() ? "nat" : isEmployment() ? s.lvl : "obl";
    const scope = level => level === "nat" ? [country] : level === "reg" ? regions : districts;
    const activeSex = () => isActivity() ? s.activitySex : s.sex;
    const nsi = (entity, ind, sex, period) => d[codes[entity]]?.[period]?.[ind]?.[sex] ?? null;
    const professionPopulation = name => nsi(name, "emp", 0, "2026Q2");
    const estimatePersons = (share, employed) => Number.isFinite(share) && Number.isFinite(employed)
      ? Math.round(share * employed / 10) * 100 : null;
    const activityValue = (i, sex = activeSex()) => act[i]?.[sex + 1]?.[0] ?? null;
    const activityFlag = (i, sex = activeSex()) => Boolean(act[i]?.[sex + 1]?.[1]);
    const delta = name => {
      const current = nsi(name, s.ind, s.sex, s.per);
      const before = nsi(name, s.ind, s.sex, previous(s.per));
      return current === null || before === null ? null : current - before;
    };
    const value = name => {
      if (isActivity()) return activityValue(s.activity);
      if (isAz()) return azAll[name] ?? null;
      if (isProfession()) return ps[name]?.[profIndex()] ?? null;
      return nsi(name, s.ind, s.sex, s.per);
    };
    const valueFmt = n => n === null ? "Няма данни" :
      format(n, isAz() ? 2 : 1) + (isActivity() || s.ind === "emp" ? " хил." : "%");
    const isDemo = name => isProfession() || (isAz() && Object.hasOwn(azAll, name) && !Object.hasOwn(azReal, name));
    const ranked = () => scope(areaLevel()).slice().sort((a, b) => {
      const x = value(a), y = value(b);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      return isAz() ? x - y : y - x;
    });
    const membership = name => districts.filter(district => mapData.membership[district] === name);
    const nameLabel = name => areaLevel() === "reg" ? name + " икономически регион" : name;
    const profNational = () => {
      let weighted = 0, population = 0;
      districts.forEach(name => {
        const employed = professionPopulation(name), share = value(name);
        if (employed !== null && share !== null) {
          weighted += employed * share;
          population += employed;
        }
      });
      return population ? weighted / population : null;
    };

    // Availability is calculated at the dataset's true geographical level.
    const available = Object.fromEntries(Object.keys(indicators).map(ind => [ind,
      Object.fromEntries(Object.keys(levels).map(level => {
        const periods = new Map();
        scope(level).forEach(name => Object.entries(d[codes[name]] || {}).forEach(([p, series]) => {
          series[ind]?.forEach((v, sex) => {
            if (v === null) return;
            if (!periods.has(p)) periods.set(p, new Set());
            periods.get(p).add(sex);
          });
        }));
        return [level, periods];
      }))
    ]));

    function options(id, values, selected, show = values.length > 1) {
      const field = $(id);
      const html = values.map(([key, label]) => opt(key, label)).join("");
      if (field.dataset.options !== html) {
        field.innerHTML = html;
        field.dataset.options = html;
      }
      field.value = selected ?? "";
      field.disabled = !show;
      $(id + "Control").hidden = !show;
    }

    function syncControls() {
      options("activity", isActivity() ? act.map((a, i) => [i, a[0]]) : [], s.activity);
      if (isActivity()) {
        options("sex", sexes.map((label, i) => [i, label]), s.activitySex);
        options("per", [], null);
        options("lvl", [], null);
        return;
      }
      if (!isEmployment()) {
        ["sex", "per", "lvl"].forEach(id => options(id, [], null));
        return;
      }
      const validLevels = Object.keys(levels).filter(level => available[s.ind][level].size);
      if (!validLevels.includes(s.lvl)) s.lvl = validLevels[0] ?? "obl";
      const periods = available[s.ind][s.lvl];
      const validPeriods = [...periods.keys()].sort().reverse();
      if (!periods.has(s.per)) {
        s.per = s.per ? validPeriods.find(p => p < s.per) ?? validPeriods[0] : validPeriods[0];
      }
      const validSexes = [...(periods.get(s.per) ?? [])].sort((a, b) => a - b);
      if (!validSexes.includes(s.sex)) s.sex = validSexes[0] ?? 0;
      options("lvl", validLevels.map(l => [l, levels[l]]), s.lvl);
      options("per", validPeriods.map(p => [p, quarter(p)]), s.per);
      options("sex", validSexes.map(i => [i, sexes[i]]), s.sex);
    }

    function drawMap() {
      const level = areaLevel(), entities = scope(level);
      const vals = entities.map(value).filter(Number.isFinite);
      const min = vals.length ? Math.min(...vals) : null, max = vals.length ? Math.max(...vals) : null;
      const geometry = level === "nat" ? { [country]: mapData.country } : level === "reg" ? mapData.regions : mapData.paths;
      map.setAttribute("aria-label", level === "nat" ? "Карта на България, национални данни" :
        level === "reg" ? "Карта по икономически региони" : "Карта по области");
      map.innerHTML = entities.map(name => {
        const v = value(name);
        const share = min === max ? 65 : Math.round((v - min) / (max - min) * 100);
        const fill = v === null ? "" : ` style="fill:color-mix(in srgb,var(--hi) ${share}%,var(--lo))"`;
        const label = nameLabel(name) + ": " + valueFmt(v) + (isDemo(name) ? " (ДЕМО)" : "");
        return `<path class="d${v === null ? " nd" : ""}${isDemo(name) ? " demo" : ""}"
          data-entity="${esc(name)}" tabindex="0" role="button" aria-pressed="false"
          aria-label="${esc(label)}"${fill} d="${esc(geometry[name])}"><title>${esc(label)}</title></path>`;
      }).join("") + '<path id="mapOutline" class="map-outline" aria-hidden="true" hidden></path>';
      shapes = Array.from(map.querySelectorAll("[data-entity]"));
      $("legend").hidden = !vals.length || min === max || level === "nat";
      $("lmin").textContent = valueFmt(min);
      $("lmax").textContent = valueFmt(max);
    }

    function paintInteraction() {
      const highlight = s.hover || s.focus;
      let activeShape;
      shapes.forEach(path => {
        const name = path.dataset.entity;
        path.classList.toggle("on", s.sel === name);
        path.classList.toggle("hovered", highlight === name);
        path.setAttribute("aria-pressed", String(s.sel === name));
        if (name === (highlight || s.sel)) activeShape = path;
      });
      const outline = $("mapOutline");
      outline.toggleAttribute("hidden", !activeShape);
      if (activeShape) outline.setAttribute("d", activeShape.getAttribute("d"));
      drawInfo();
    }

    function miniEmployment(name) {
      const rows = [["k15", "Заетост 15+ г."], ["k1564", "Заетост 15–64 г."], ["emp", "Заети, хил."]];
      return '<table class="mini"><thead><tr><th scope="col">Показател</th>' +
        sexes.map(label => `<th scope="col" class="num">${label}</th>`).join("") + "</tr></thead><tbody>" +
        rows.map(([ind, label]) => `<tr><th scope="row">${label}</th>` +
          sexes.map((_, i) => {
            const v = nsi(name, ind, i, s.per);
            return numCell(v, format(v) + (v !== null && ind !== "emp" ? "%" : ""), s.ind === ind && s.sex === i);
          }).join("") + "</tr>").join("") + "</tbody></table>";
    }

    function drawActivityInfo() {
      const i = s.activity, v = activityValue(i), total = activityValue(0);
      const share = total > 0 && v !== null ? v / total * 100 : null;
      $("info").innerHTML = `<h3>България</h3>
        <p class="m">Национални данни · ${quarter(activityPeriod)} · НСИ, КИД-2025</p>
        <p class="activity-name">${esc(act[i]?.[0] ?? "Няма данни")}</p>
        <div class="big">${valueFmt(v)}${activityFlag(i) ? "*" : ""}</div>
        <p>${sexes[s.activitySex]} · ${i === 0 ? "всички икономически дейности" : "от избраната икономическа дейност"}</p>` +
        (i > 0 && share !== null ? `<p class="m">${format(share)}% от всички заети за избрания пол.</p>` : "") +
        (activityFlag(i) ? '<p class="low">* Стойността е с ниска точност поради малка извадка.</p>' : "") +
        '<p class="m">Няма разбивка по области или икономически региони.</p>';
    }

    function drawInfo() {
      if (isActivity()) { drawActivityInfo(); return; }
      const el = $("info");
      const level = areaLevel(), name = s.hover || s.focus || s.sel || (level === "nat" ? country : null);
      const national = isAz() ? azNat : isProfession() ? profNational() : nsi(country, s.ind, s.sex, s.per);
      if (!name) {
        const hint = level === "reg" ? "Посочете икономически регион на картата." : "Посочете област на картата.";
        const label = isAz() ? "Регистрирана безработица, април 2026. Пунктираните области са ДЕМО." :
          isProfession() ? "Дял по професия (ДЕМО): " + names[profIndex()] + "." :
          indicators[s.ind] + " · " + sexes[s.sex] + " · " + quarter(s.per) + ".";
        el.innerHTML = `<p class="empty">${hint}</p><p>${esc(label)}</p><p class="m">България: ${valueFmt(national)}.</p>`;
        return;
      }
      const v = value(name);
      const localRank = ranked().filter(e => value(e) !== null);
      const rank = localRank.indexOf(name) + 1;
      const place = rank && level !== "nat" ? ` ${rank}-о място от ${localRank.length}.` : "";
      const location = level === "reg" ? "NUTS 2 · " + membership(name).length + " области" :
        level === "obl" ? mapData.membership[name] + " икономически регион" : "Национални данни";
      let html = `<h3>${esc(nameLabel(name))}</h3><p class="m">${esc(location)}</p>
        <div class="big">${valueFmt(v)}${isDemo(name) ? " " + demo : ""}</div>`;
      if (isAz()) {
        html += `<p>Регистрирана безработица, април 2026.${place} България: ${valueFmt(national)}.</p>` +
          (isDemo(name) ? '<p class="low">ДЕМО: няма публикувана стойност в набора за тази област.</p>' : '<p class="m">Източник: Агенция по заетостта.</p>');
      } else if (isProfession()) {
        const employed = professionPopulation(name);
        const persons = estimatePersons(v, employed);
        html += `<p>${esc(names[profIndex()])} · дял от заетите.${place}</p>` +
          (persons === null ? "" : `<p>≈ ${format(persons, 0)} души (ДЕМО) от ${format(employed)} хил. заети (НСИ, Q2 2026).</p>`) +
          '<p class="low">ДЕМО: дяловете по професии са измислени за илюстрация.</p>' +
          '<table class="mini"><tbody>' + names.map((label, i) => {
            const share = ps[name]?.[i] ?? null;
            return `<tr><th scope="row" class="wrap-text">${esc(label)}</th>` +
              numCell(share, share === null ? "—" : format(share) + "%", i === profIndex()) + "</tr>";
          }).join("") + "</tbody></table>";
      } else {
        const rate = s.ind !== "emp", change = delta(name);
        html += `<p>${esc(indicators[s.ind])} · ${sexes[s.sex]} · ${quarter(s.per)}.${place}</p>`;
        if (level !== "nat" && v !== null && national !== null) {
          const comparison = rate ? signed(v - national, " пр. п.") + " спрямо България" :
            national > 0 ? format(v / national * 100) + "% от заетите в България" : null;
          if (comparison) html += `<p class="m">${comparison}.</p>`;
        }
        if (change !== null) html += `<p class="m">Спрямо ${quarter(previous(s.per))}: ${signed(change, rate ? " пр. п." : " хил.")}</p>`;
        html += miniEmployment(name);
        if (level === "reg") {
          const members = membership(name).sort((a, b) =>
            (nsi(b, s.ind, s.sex, s.per) ?? -Infinity) - (nsi(a, s.ind, s.sex, s.per) ?? -Infinity));
          html += '<p class="m">Области в региона:</p><ul class="list">' + members.map(district =>
            `<li><span>${esc(district)}</span><span>${valueFmt(nsi(district, s.ind, s.sex, s.per))}</span></li>`).join("") + "</ul>";
        }
      }
      el.innerHTML = html;
    }

    function activityRow(i, total) {
      const label = act[i][0];
      return `<tr class="${total ? "nat" : ""}" data-row="${i}"><td class="wrap-text">${rowButton(label, i, s.activity === i)}</td>` +
        sexes.map((_, sex) => {
          const v = activityValue(i, sex);
          return numCell(v, format(v) + (activityFlag(i, sex) ? '<span title="Малка извадка">*</span>' : ""), sex === s.activitySex);
        }).join("") + "</tr>";
    }

    function drawActivityTable() {
      activityTable.dataset.defaultSort = "sex0";
      activityTable.tHead.innerHTML = "<tr>" + header("name", "Икономическа дейност") +
        sexes.map((label, i) => header("sex" + i, label + ", хил.", "number", "desc")).join("") + "</tr>";
      activityTable.tBodies[0].innerHTML = act.slice(1).map((_, i) => activityRow(i + 1, false)).join("");
      activityTable.tFoot.innerHTML = act.length ? activityRow(0, true) : "";
      activityControls.refresh(tableStates.activity);
    }

    function drawRanking() {
      const level = areaLevel();
      if (level === "nat") return;
      const key = isAz() ? "az" : isProfession() ? "profession" : "employment";
      const list = ranked(), national = isAz() ? azNat : isProfession() ? profNational() : nsi(country, s.ind, s.sex, s.per);
      const isRate = s.ind !== "emp", hasDelta = isEmployment() && list.some(name => delta(name) !== null);
      const changeUnit = isRate ? " пр. п." : " хил.";
      const best = Math.max(0, ...list.map(value).filter(Number.isFinite));
      const totalEstimate = isProfession()
        ? list.map(name => estimatePersons(value(name), professionPopulation(name))).filter(Number.isFinite) : [];
      const nationalMark = isEmployment() && isRate && national !== null && best > 0
        ? `<u style="left:${Math.min(100, national / best * 100)}%"></u>` : "";
      function bar(n) {
        const width = n === null || !best ? 0 : n / best * 100;
        return `<td data-value="${n ?? ""}"><div class="cell"><span class="num">${n === null ? "—" : valueFmt(n)}</span>
          <span class="bar" aria-hidden="true"><i style="width:${width}%"></i>${nationalMark}</span></div></td>`;
      }
      const valueLabel = isAz() ? "Безработица, %" : isProfession() ? "Дял от заетите (ДЕМО)" : isRate ? "Коефициент, %" : "Заети, хил.";
      let headings = header("rank", "№", "number") + header("name", level === "reg" ? "Икономически регион" : "Област") +
        header("value", valueLabel, "number", isAz() ? "asc" : "desc");
      if (isAz()) headings += header("source", "Източник", "category");
      else if (isProfession()) headings += header("persons", "≈ души (ДЕМО)", "number", "desc") +
        header("employment", "Заети, хил. (НСИ)", "number", "desc");
      else {
        headings += sexes.map((label, i) => header("sex" + i, label + (isRate ? ", %" : ", хил."), "number", "desc")).join("");
        if (hasDelta) headings += header("change", quarter(s.per) + " спрямо " + quarter(previous(s.per)), "number", "desc");
      }
      $("tsub").textContent = isAz() ? "Регистрирана безработица по области, април 2026." :
        isProfession() ? names[profIndex()] + " · ДЕМО данни по области." :
        indicators[s.ind] + " · " + sexes[s.sex] + " · " + quarter(s.per) + "." +
          (nationalMark ? " Оранжевата черта показва стойността за България (" + valueFmt(national) + ")." : "");
      $("tnote").textContent = isAz() ? "Реалните стойности са на Агенцията по заетостта. Останалите са ДЕМО." :
        isProfession() ? "Дяловете и приблизителният брой по професия са ДЕМО. Общият брой заети е от НСИ (Q2 2026)." :
        "Източник: НСИ, Наблюдение на работната сила." +
          (hasDelta ? " Промяната за избрания пол е спрямо предходното тримесечие. Данните не са сезонно изгладени." : "");
      function columns(name, nat) {
        const v = nat ? national : value(name);
        if (isAz()) {
          const source = nat || !isDemo(name) ? "Реално (АЗ)" : "ДЕМО";
          return bar(v) + `<td data-value="${source}">${isDemo(name) && !nat ? demo : source}</td>`;
        }
        if (isProfession()) {
          const employed = professionPopulation(name);
          const estimate = nat ? (totalEstimate.length ? totalEstimate.reduce((a, b) => a + b, 0) : null) : estimatePersons(v, employed);
          return bar(v) + numCell(estimate, format(estimate, 0)) + numCell(employed, format(employed));
        }
        return bar(v) + sexes.map((_, i) => {
          const n = nsi(name, s.ind, i, s.per);
          return numCell(n, format(n) + (n !== null && isRate ? "%" : ""), i === s.sex);
        }).join("") + (hasDelta ? numCell(delta(name), signed(delta(name), changeUnit)) : "");
      }
      ranking.dataset.defaultSort = "rank";
      ranking.tHead.innerHTML = "<tr>" + headings + "</tr>";
      ranking.tBodies[0].innerHTML = list.map((name, i) => {
        const rank = value(name) === null ? null : i + 1;
        return `<tr data-row="${esc(name)}" class="${isDemo(name) ? "demorow" : ""}">${numCell(rank, rank ?? "—")}
          <td>${rowButton(name, name, s.sel === name)}</td>${columns(name, false)}</tr>`;
      }).join("");
      ranking.tFoot.innerHTML = `<tr class="nat"><td></td><td>${country}${isProfession() ? " (претеглено, ДЕМО)" : ""}</td>${columns(country, true)}</tr>`;
      rankingControls.refresh(tableStates[key]);
    }

    function syncSelectedRows(table, value) {
      table.querySelectorAll("tr[data-row]").forEach(row => {
        const selected = row.dataset.row === String(value);
        row.classList.toggle("sel", selected);
        row.querySelector("[data-select]").setAttribute("aria-pressed", selected);
      });
    }

    function render() {
      syncControls();
      const activity = isActivity();
      $("activityData").hidden = !activity;
      $("rankingPanel").hidden = areaLevel() === "nat";
      drawMap();
      if (activity) {
        drawActivityTable();
        syncSelectedRows(activityTable, s.activity);
      } else if (areaLevel() !== "nat") {
        drawRanking();
        syncSelectedRows(ranking, s.sel);
      }
      paintInteraction();
    }

    function resetArea() { s.sel = s.hover = s.focus = null; }
    function chooseArea(name) {
      s.sel = s.sel === name ? null : name;
      s.hover = s.focus = null;
      syncSelectedRows(ranking, s.sel);
      paintInteraction();
    }
    function chooseActivity(i) {
      if (!act[i]) return;
      s.activity = i;
      $("activity").value = i;
      syncSelectedRows(activityTable, i);
      drawMap();
      paintInteraction();
    }
    const entityFrom = target => target?.closest?.("[data-entity]")?.dataset.entity ?? null;
    map.addEventListener("pointerover", event => {
      const next = entityFrom(event.target);
      if (next !== s.hover) { s.hover = next; paintInteraction(); }
    });
    map.addEventListener("pointerleave", () => {
      if (s.hover !== null) { s.hover = null; paintInteraction(); }
    });
    map.addEventListener("focusin", event => { s.focus = entityFrom(event.target); paintInteraction(); });
    map.addEventListener("focusout", () => { s.focus = null; paintInteraction(); });
    map.addEventListener("click", event => {
      const name = entityFrom(event.target);
      if (name) chooseArea(name);
    });
    map.addEventListener("keydown", event => {
      const name = entityFrom(event.target);
      if (name && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        chooseArea(name);
      }
    });
    ranking.addEventListener("click", event => {
      const button = event.target.closest("[data-select]");
      if (button) chooseArea(button.dataset.select);
    });
    activityTable.addEventListener("click", event => {
      const button = event.target.closest("[data-select]");
      if (button) chooseActivity(Number(button.dataset.select));
    });

    $("metric").innerHTML = '<optgroup label="НСИ · Наблюдение на работната сила">' +
      Object.entries(indicators).map(([key, label]) => opt(key, label)).join("") +
      (act.length ? opt("activity", "Заети лица по икономически дейности и пол, " + quarter(activityPeriod)) : "") +
      '</optgroup><optgroup label="Агенция по заетостта">' +
      opt("az", "Регистрирана безработица, април 2026 (реални и ДЕМО данни)") +
      '</optgroup><optgroup label="Дял от заетите по професия (ДЕМО)">' +
      names.map((name, i) => opt("prof:" + i, name + " (ДЕМО)")).join("") + "</optgroup>";
    $("metric").disabled = false;
    $("metric").value = s.ind;
    $("metric").addEventListener("change", event => { s.ind = event.target.value; resetArea(); render(); });
    $("lvl").addEventListener("change", event => { s.lvl = event.target.value; resetArea(); render(); });
    $("per").addEventListener("change", event => { s.per = event.target.value; render(); });
    $("sex").addEventListener("change", event => {
      if (isActivity()) s.activitySex = Number(event.target.value);
      else s.sex = Number(event.target.value);
      render();
    });
    $("activity").addEventListener("change", event => chooseActivity(Number(event.target.value)));
    $("at").textContent = "Заети лица по икономически дейности и пол, " + quarter(activityPeriod);
    $("kpis").innerHTML = (data.kpis || []).map(k => `<div class="kpi"><b>${format(k.value)}${k.kind === "rate" ? "%" : " хил."}</b><span>${esc(k.label)}</span></div>`).join("");
    render();
  }

  const json = async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  };
  const source = $("map");
  Promise.all([json(source.dataset.geometry), json(source.dataset.dataset)])
    .then(([geometry, data]) => boot(geometry, data))
    .catch(error => {
      $("info").textContent = "Данните не можаха да се заредят. Презаредете страницата или проверете връзката с приложението.";
      console.error(error);
    });
})();
