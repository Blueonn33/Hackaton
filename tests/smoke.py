"""Browser checks for the map and both ranking views against a running app."""
import os
import sys

from playwright.sync_api import expect, sync_playwright


def visible_rows(table):
    return table.locator("tbody tr[data-row]:visible")


def sort_by(table, key):
    table.locator(f'[data-column="{key}"] .ranking-sort').click()


def raw_values(table, index):
    return [float(cell) for cell in table.locator(
        f"tbody tr:not([hidden]):not(.ranking-empty) td:nth-child({index})"
    ).evaluate_all("(cells) => cells.map(c => c.dataset.value)")]


def main(base):
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH"))
        page = browser.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
        page.goto(base)
        metric = page.locator("#metric")
        expect(metric).to_be_enabled()
        area = page.locator("#map [data-entity]")
        for field in ["sex", "per", "lvl"]:
            expect(page.locator("#" + field + "Control")).to_be_visible()
        expect(area).to_have_count(28)

        page.locator("#lvl").select_option("reg")
        expect(area).to_have_count(6)
        region = area.locator('xpath=self::*[@data-entity="Югозападен"]')
        region.dispatch_event("pointerover")
        expect(region).to_have_class("d hovered")
        expect(page.locator("#mapOutline")).to_have_attribute("d", region.get_attribute("d"))
        expect(page.locator("#info")).to_contain_text("Югозападен икономически регион")
        expect(page.locator("#info .list li")).to_have_count(5)
        page.locator("#map").dispatch_event("pointerleave")
        expect(page.locator("#mapOutline")).to_be_hidden()

        page.locator("#lvl").select_option("obl")
        district = area.locator('xpath=self::*[@data-entity="Варна"]')
        district.dispatch_event("pointerover")
        expect(page.locator("#map .hovered")).to_have_count(1)
        expect(page.locator("#mapOutline")).to_have_attribute("d", district.get_attribute("d"))
        district.focus()
        district.press("Enter")
        expect(district).to_have_attribute("aria-pressed", "true")
        expect(page.locator("#info h3")).to_have_text("Варна")
        district.press("Enter")
        expect(district).to_have_attribute("aria-pressed", "false")

        metric.select_option("activity")
        expect(area).to_have_count(1)
        expect(area).to_have_attribute("data-entity", "България")
        expect(page.locator("#activityData")).to_be_visible()
        expect(page.locator("#rankingPanel")).to_be_hidden()
        expect(page.locator("#sexControl")).to_be_visible()
        expect(page.locator("#perControl")).to_be_hidden()
        expect(page.locator("#lvlControl")).to_be_hidden()
        activities = page.locator("#activityTable")
        expect(visible_rows(activities)).to_have_count(20)
        page.locator("#sex").select_option("2")
        activities.get_by_role("button", name="Добивна промишленост", exact=True).click()
        expect(page.locator("#info .big")).to_contain_text("4,1 хил.*")
        expect(page.locator("#info")).to_contain_text("малка извадка")
        expect(activities.locator("tfoot")).to_contain_text("Общо")
        expect(page.locator("#activity")).to_have_value("2")
        sort_by(activities, "sex2")
        women = raw_values(activities, 4)
        assert women == sorted(women, reverse=True)

        metric.select_option("prof:0")
        for field in ["sex", "per", "lvl"]:
            expect(page.locator("#" + field + "Control")).to_be_hidden()
        table = page.locator("#mapRanking")
        expect(visible_rows(table)).to_have_count(28)
        sort_by(table, "name")
        expect(visible_rows(table).first).to_contain_text("Благоевград")
        sort_by(table, "persons")
        persons = raw_values(table, 4)
        assert persons == sorted(persons, reverse=True)
        sort_by(table, "persons")
        assert raw_values(table, 4) == sorted(persons)
        assert table.locator("th[aria-sort]").count() == 1

        metric.select_option("az")
        for field in ["sex", "per", "lvl"]:
            expect(page.locator("#" + field + "Control")).to_be_hidden()
        table.locator('[data-column="name"] .ranking-filter-button').click()
        page.get_by_role("searchbox", name="Съдържа").fill("Варна")
        page.get_by_role("button", name="Приложи").click()
        expect(visible_rows(table)).to_have_count(1)
        table.locator('[data-column="source"] .ranking-filter-button').click()
        page.get_by_label("Стойност", exact=True).select_option("Реално (АЗ)")
        page.get_by_role("button", name="Приложи").click()
        expect(visible_rows(table)).to_have_count(6)
        expect(table.locator("tfoot")).to_contain_text("България")
        page.get_by_role("button", name="Изчисти").click()
        expect(visible_rows(table)).to_have_count(28)

        metric.select_option("k1564")
        page.locator("#per").select_option("2003Q1")
        expect(table.locator('[data-column="change"]')).to_have_count(0)
        page.locator("#lvl").select_option("nat")
        assert "2026Q3" in page.locator("#per").locator("option").evaluate_all("(options) => options.map(o => o.value)")
        page.locator("#per").select_option("2026Q3")
        expect(page.locator("#sexControl")).to_be_hidden()
        expect(page.locator("#info .big")).to_have_text("70,8%")
        page.locator("#lvl").select_option("obl")
        expect(page.locator("#per")).to_have_value("2026Q2")

        page.goto(base + "/Ranking?kind=Profession")
        table = page.locator("table[data-ranking]")
        sort_by(table, "name")
        expect(table.locator("tbody tr").first).to_contain_text("Благоевград")
        sort_by(table, "persons")
        persons = raw_values(table, 4)
        assert len(persons) == 28 and persons == sorted(persons, reverse=True)
        table.locator('[data-column="persons"] .ranking-filter-button').click()
        page.get_by_label("От", exact=True).fill("10000")
        page.get_by_role("button", name="Приложи").click()
        assert raw_values(table, 4) == [v for v in persons if v >= 10000]
        expect(table.locator("tfoot")).to_contain_text("България")
        page.locator("#kind").select_option("Employment")
        expect(page.locator("#professionId")).to_be_hidden()
        expect(page.locator("#period")).to_be_visible()
        page.locator("#period").select_option("2003Q1")
        page.locator("#sex").select_option("Women")
        page.get_by_role("button", name="Покажи").click()
        expect(page.locator("table[data-ranking] tbody tr:not(.ranking-empty)")).to_have_count(28)

        assert not errors, "\n".join(errors)
        browser.close()
    print("Map and ranking smoke tests passed.")


if __name__ == "__main__":
    main((sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5076").rstrip("/"))
