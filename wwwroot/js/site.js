// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.
async function loadMap() {
    const q = new URLSearchParams({
        indicator: metric.value, sex: sex.value, period: per.value
    });
    const res = await fetch('/api/employment?' + q);
    const data = await res.json();
    colorMap(data.items, data.national);
}
[metric, sex, per, lvl].forEach(el => el.addEventListener('change', loadMap));
loadMap();
