using System.Globalization;
using System.Text.Json;
using Hackaton.Models;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Data
{
    /// <summary>
    /// Създава базата (ако я няма) и я пълни при първо стартиране:
    ///  - реални данни на НСИ от Data/Imports/*.csv
    ///  - области, райони, ДЕМО дялове по професии, безработица (АЗ) и дейности от Data/Seed/seed.json
    /// </summary>
    public static class DbInitializer
    {
        private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

        // файл -> показател
        private static readonly (string File, Indicator Indicator)[] Imports =
        {
            ("table-LFS_Q_KZ_reg_obl_sex-data.csv",          Indicator.EmpRate15Plus),
            ("table-LFS_Q_KZ_15_64_reg_obl_sex-data.csv",    Indicator.EmpRate15to64),
            ("table-LFS_Q_zaeti_reg_obl_sex-data.csv",       Indicator.EmployedThousands),
        };

        public static async Task InitializeAsync(ApplicationDbContext db, string contentRoot, ILogger logger)
        {
            await db.Database.EnsureCreatedAsync();
            if (await db.Regions.AnyAsync())
            {
                return; // вече е заредена
            }

            var seedPath = Path.Combine(contentRoot, "Data", "Seed", "seed.json");
            var seed = JsonSerializer.Deserialize<SeedFile>(await File.ReadAllTextAsync(seedPath), Json)
                       ?? throw new InvalidOperationException("seed.json е празен или невалиден.");

            // 1) статистически райони и области
            var statRegions = seed.StatRegions
                .Select(s => new StatRegion { Code = s.Code, Name = s.Name })
                .ToList();
            db.StatRegions.AddRange(statRegions);
            await db.SaveChangesAsync();

            var statByName = statRegions.ToDictionary(s => s.Name);
            var regions = seed.Regions
                .Select(r => new Region
                {
                    Name = r.Name,
                    MapCode = r.Code,
                    StatRegionId = statByName[r.StatRegion].Id
                })
                .ToList();
            db.Regions.AddRange(regions);
            await db.SaveChangesAsync();

            var regionByName = regions.ToDictionary(r => r.Name);

            // 2) професии и ДЕМО дялове
            var professions = seed.Professions.Select(n => new Profession { Name = n }).ToList();
            db.Professions.AddRange(professions);
            await db.SaveChangesAsync();

            foreach (var (regionName, shares) in seed.ProfessionShares)
            {
                for (var i = 0; i < shares.Length && i < professions.Count; i++)
                {
                    db.ProfessionShares.Add(new ProfessionShare
                    {
                        RegionId = regionByName[regionName].Id,
                        ProfessionId = professions[i].Id,
                        Share = shares[i],
                        IsDemo = true
                    });
                }
            }

            // 3) безработица (АЗ): 6 реални области + ДЕМО за останалите; национална стойност
            var month = DateOnly.ParseExact(seed.Unemployment.Month, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            foreach (var (regionName, u) in seed.Unemployment.Regions)
            {
                db.Unemployments.Add(new Unemployment
                {
                    RegionId = regionByName[regionName].Id,
                    Month = month,
                    Rate = u.Value,
                    IsDemo = u.IsDemo
                });
            }
            db.Unemployments.Add(new Unemployment
            {
                RegionId = null,
                Month = month,
                Rate = seed.Unemployment.National,
                IsDemo = false
            });

            // 4) заети по икономически дейности, Q3 2026 (национално, НСИ)
            foreach (var a in seed.Activities)
            {
                db.Activities.Add(new Activity
                {
                    Name = a.Name,
                    Total = a.Total, Men = a.Men, Women = a.Women,
                    TotalLowSample = a.TotalLow, MenLowSample = a.MenLow, WomenLowSample = a.WomenLow,
                    Period = seed.NationalQ3.Period
                });
            }

            // 5) национални данни за Q3 2026 (пресъобщение на НСИ; няма разбивка по области)
            db.EmploymentValues.Add(new EmploymentValue
            {
                Period = seed.NationalQ3.Period, Indicator = Indicator.EmpRate15to64, Sex = Sex.Total,
                Value = seed.NationalQ3.EmpRate15to64, IsDemo = false
            });
            db.EmploymentValues.Add(new EmploymentValue
            {
                Period = seed.NationalQ3.Period, Indicator = Indicator.EmployedThousands, Sex = Sex.Total,
                Value = seed.NationalQ3.EmployedThousands, IsDemo = false
            });
            await db.SaveChangesAsync();

            // 6) реални данни на НСИ от CSV (над 29 хил. реда – зареждат се само веднъж)
            var regionIdByCode = regions.ToDictionary(r => r.MapCode, r => r.Id);
            var statIdByCode = statRegions.ToDictionary(s => s.Code, s => s.Id);

            db.ChangeTracker.AutoDetectChangesEnabled = false;
            var total = 0;
            foreach (var (file, indicator) in Imports)
            {
                var path = Path.Combine(contentRoot, "Data", "Imports", file);
                if (!File.Exists(path))
                {
                    logger.LogWarning("Липсва CSV файл: {Path}", path);
                    continue;
                }
                total += ImportCsv(db, path, indicator, regionIdByCode, statIdByCode);
            }
            await db.SaveChangesAsync();
            db.ChangeTracker.AutoDetectChangesEnabled = true;

            logger.LogInformation("Базата е заредена: {Regions} области, {Rows} реда от НСИ.", regions.Count, total);
        }

        private static int ImportCsv(ApplicationDbContext db, string path, Indicator indicator,
            Dictionary<string, int> regionIdByCode, Dictionary<string, int> statIdByCode)
        {
            var lines = File.ReadLines(path).GetEnumerator();
            if (!lines.MoveNext()) return 0;

            var header = lines.Current.Split(',').Select(h => h.Trim().Trim('"')).ToArray();
            var iNuts = Array.IndexOf(header, "NUTS");
            var iPeriod = Array.IndexOf(header, "periods");
            var iSex = Array.IndexOf(header, "GenderID");
            var iValue = Array.IndexOf(header, "ValueColumn");
            if (iNuts < 0 || iPeriod < 0 || iSex < 0 || iValue < 0)
            {
                throw new InvalidOperationException($"Неочаквани колони в {Path.GetFileName(path)}.");
            }

            var count = 0;
            while (lines.MoveNext())
            {
                var line = lines.Current;
                if (string.IsNullOrWhiteSpace(line)) continue;

                var f = line.Split(',').Select(x => x.Trim().Trim('"')).ToArray();
                if (f.Length <= Math.Max(Math.Max(iNuts, iPeriod), Math.Max(iSex, iValue))) continue;

                if (!int.TryParse(f[iSex], out var sexId) || sexId < 0 || sexId > 2) continue;
                if (!decimal.TryParse(f[iValue], NumberStyles.Float, CultureInfo.InvariantCulture, out var value)) continue;

                int? regionId = null;
                int? statId = null;
                var nuts = f[iNuts];
                if (nuts != "BG")
                {
                    if (regionIdByCode.TryGetValue(nuts, out var rid)) regionId = rid;
                    else if (statIdByCode.TryGetValue(nuts, out var sid)) statId = sid;
                    else continue; // непознат код
                }

                db.EmploymentValues.Add(new EmploymentValue
                {
                    RegionId = regionId,
                    StatRegionId = statId,
                    Period = f[iPeriod],
                    Indicator = indicator,
                    Sex = (Sex)sexId,
                    Value = value,
                    IsDemo = false
                });
                count++;
            }
            return count;
        }

        // ---- форма на seed.json ----
        private sealed class SeedFile
        {
            public List<SeedStatRegion> StatRegions { get; set; } = new();
            public List<SeedRegion> Regions { get; set; } = new();
            public List<string> Professions { get; set; } = new();
            public Dictionary<string, decimal[]> ProfessionShares { get; set; } = new();
            public SeedUnemployment Unemployment { get; set; } = new();
            public List<SeedActivity> Activities { get; set; } = new();
            public SeedNational NationalQ3 { get; set; } = new();
        }
        private sealed class SeedStatRegion { public string Code { get; set; } = ""; public string Name { get; set; } = ""; }
        private sealed class SeedRegion
        {
            public string Code { get; set; } = "";
            public string Name { get; set; } = "";
            public string StatRegion { get; set; } = "";
        }
        private sealed class SeedUnemployment
        {
            public string Month { get; set; } = "2026-04-01";
            public decimal National { get; set; }
            public Dictionary<string, SeedRate> Regions { get; set; } = new();
        }
        private sealed class SeedRate { public decimal Value { get; set; } public bool IsDemo { get; set; } }
        private sealed class SeedActivity
        {
            public string Name { get; set; } = "";
            public decimal Total { get; set; }
            public bool TotalLow { get; set; }
            public decimal Men { get; set; }
            public bool MenLow { get; set; }
            public decimal Women { get; set; }
            public bool WomenLow { get; set; }
        }
        private sealed class SeedNational
        {
            public string Period { get; set; } = "2026Q3";
            public decimal EmpRate15to64 { get; set; }
            public decimal EmployedThousands { get; set; }
        }
    }
}
