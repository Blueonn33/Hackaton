# Hackaton - Заетост и професии по области

ASP.NET Core MVC (.NET 10) + EF Core (SQL Server). Картата, класациите и таблиците
четат данните от базата през `/api/dataset`.

## Стартиране

1. Инсталирайте .NET 10 SDK и SQL Server LocalDB (идва с Visual Studio).
   Друг SQL Server? Сменете `ConnectionStrings:DefaultConnection` в `appsettings.json`
   (в файла има готови редове за PREDATOR и IVAYLO - копирайте нужния като `DefaultConnection`).
2. `dotnet run` (или F5 във Visual Studio).
3. При първо стартиране приложението само създава базата `ZaetostDb` и я зарежда
   (около 30 хил. реда от НСИ, 10-20 сек.). Следващите стартирания са мигновени.

Нулиране на данните: изтрийте базата `ZaetostDb` и стартирайте отново.

> Проектът не използва EF миграции: схемата се създава с `EnsureCreated`.
> Ако променяте моделите, изтрийте базата.

## Структура

| Какво | Къде |
|---|---|
| Реални данни на НСИ (CSV) | `Data/Imports/*.csv` |
| Области, райони, ДЕМО дялове по професии, безработица (АЗ), дейности | `Data/Seed/seed.json` |
| Създаване и зареждане на базата | `Data/DbInitializer.cs` |
| Данни за страницата | `Services/DatasetService.cs` -> `GET /api/dataset` |
| Класации | `Services/RankingService.cs`, `Controllers/RankingController.cs`, `Views/Ranking`, `Views/Shared/_RankingTable.cshtml` |
| Карта (граници) | `wwwroot/data/map.json` |
| Скрипт на картата | `wwwroot/js/employment.js` |

## Адреси

- `/` - карта, класация и таблица по икономически дейности
- `/Ranking?kind=Employment&indicator=EmpRate15to64&sex=Total&period=2026Q2`
- `/Ranking?kind=Unemployment`
- `/Ranking?kind=Profession&professionId=3`
- `/api/employment?indicator=EmpRate15to64&sex=Total&period=2026Q2`
- `/api/dataset`

Стойностите с етикет „ДЕМО“ са измислени за илюстрация и не са статистика.
