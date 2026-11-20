(function () {
  "use strict";

  const kind = document.getElementById("kind");
  if (!kind) return;
  function update() {
    document.querySelectorAll("[data-ranking-kinds]").forEach(field => {
      const available = field.dataset.rankingKinds.split(" ").includes(kind.value);
      field.hidden = !available;
      field.querySelector("select").disabled = !available;
    });
  }
  kind.addEventListener("change", update);
  update();
})();
