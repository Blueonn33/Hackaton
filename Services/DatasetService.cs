using Hackaton.Data;
using Hackaton.Models;
using Hackaton.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Services
{
    public class DatasetService
    {
        private readonly ApplicationDbContext _db;
        public DatasetService(ApplicationDbContext db) => _db = db;

        public async Task<DatasetDto> GetAsync()
        {
            var dto = new DatasetDto();

            // ---- НСИ: заетост по страна / райони / области ----
            var rows = await _db.EmploymentValues.AsNoTracking()
                .Select(v => new
                {
                    Code = v.Region != null ? v.Region.MapCode
                         : v.StatRegion != null ? v.StatRegion.Code
                         : "BG",
                    v.Period,
                    v.Indicator,
                    v.Sex,
                    v.Value
                })
                .ToListAsync();

            foreach (var r in rows)
            {
                var key = IndicatorKey(r.Indicator);
                if (key == null) continue;

                if (!dto.D.TryGetValue(r.Code, out var byPeriod))
                {
                    byPeriod = new Dictionary<string, Dictionary<string, decimal?[]>>();
                    dto.D[r.Code] = byPeriod;
                }
                if (!byPeriod.TryGetValue(r.Period, out var byInd))
                {
                    byInd = new Dictionary<string, decimal?[]>();
                    byPeriod[r.Period] = byInd;
                }
                if (!byInd.TryGetValue(key, out var arr))
                {
                    arr = new decimal?[3];
                    byInd[key] = arr;
                }
                arr[(int)r.Sex] = r.Value;
            }

            // ---- речници на кодовете ----
            dto.Code = await _db.Regions.AsNoTracking().OrderBy(r => r.Id)
                .ToDictionaryAsync(r => r.Name, r => r.MapCode);
            dto.RCode = await _db.StatRegions.AsNoTracking().OrderBy(s => s.Id)
                .ToDictionaryAsync(s => s.Name, s => s.Code);

            // ---- Агенция по заетостта (последният месец) ----
            var month = await _db.Unemployments.MaxAsync(u => (DateOnly?)u.Month);
            var az = await _db.Unemployments.AsNoTracking()
                .Where(u => u.Month == month && u.RegionId != null)
                .Select(u => new { u.Region!.Name, u.Rate, u.IsDemo })
                .ToListAsync();
            foreach (var u in az)
            {
                dto.AzAll[u.Name] = u.Rate;
                if (!u.IsDemo) dto.AzReal[u.Name] = u.Rate;
            }
            dto.AzNat = await _db.Unemployments.AsNoTracking()
                .Where(u => u.Month == month && u.RegionId == null)
                .Select(u => u.Rate)
                .FirstOrDefaultAsync();

            // ---- професии (ДЕМО) ----
            var professions = await _db.Professions.AsNoTracking().OrderBy(p => p.Id).ToListAsync();
            dto.Names = professions.Select(p => p.Name).ToList();
            var idx = professions.Select((p, i) => new { p.Id, i }).ToDictionary(x => x.Id, x => x.i);

            var shares = await _db.ProfessionShares.AsNoTracking()
                .Select(s => new { RegionName = s.Region.Name, s.ProfessionId, s.Share })
                .ToListAsync();
            foreach (var s in shares)
            {
                if (!idx.TryGetValue(s.ProfessionId, out var i)) continue;
                if (!dto.Ps.TryGetValue(s.RegionName, out var arr))
                {
                    arr = new decimal[professions.Count];
                    dto.Ps[s.RegionName] = arr;
                }
                arr[i] = s.Share;
            }

            // ---- икономически дейности (Q3) ----
            var acts = await _db.Activities.AsNoTracking()
                .Where(a => a.Period == dto.ActivityPeriod).OrderBy(a => a.Id).ToListAsync();
            foreach (var a in acts)
            {
                dto.Act.Add(new object[]
                {
                    a.Name,
                    new object[] { a.Total, a.TotalLowSample ? 1 : 0 },
                    new object[] { a.Men, a.MenLowSample ? 1 : 0 },
                    new object[] { a.Women, a.WomenLowSample ? 1 : 0 }
                });
            }

            // ---- KPI картите най-отгоре ----
            await AddKpi(dto, "2026Q2", Indicator.EmpRate15to64, "rate", "заетост 15–64 г., Q2 2026");
            await AddKpi(dto, "2026Q2", Indicator.EmpRate15Plus, "rate", "заетост 15+ г., Q2 2026");
            await AddKpi(dto, "2026Q2", Indicator.EmployedThousands, "count", "заети в страната, Q2 2026");
            await AddKpi(dto, "2026Q3", Indicator.EmployedThousands, "count", "заети в страната, Q3 2026 (само национално)");
            await AddKpi(dto, "2026Q3", Indicator.EmpRate15to64, "rate", "заетост 15–64 г., Q3 2026 (национално)");

            return dto;
        }

        private async Task AddKpi(DatasetDto dto, string period, Indicator ind, string kind, string label)
        {
            decimal? v = await _db.EmploymentValues.AsNoTracking()
                .Where(e => e.RegionId == null && e.StatRegionId == null
                         && e.Period == period && e.Indicator == ind && e.Sex == Sex.Total)
                .Select(e => (decimal?)e.Value)
                .FirstOrDefaultAsync();
            if (v != null)
            {
                dto.Kpis.Add(new KpiDto { Kind = kind, Value = v.Value, Label = label });
            }
        }

        private static string? IndicatorKey(Indicator i) => i switch
        {
            Indicator.EmpRate15Plus => "k15",
            Indicator.EmpRate15to64 => "k1564",
            Indicator.EmployedThousands => "emp",
            _ => null
        };
    }
}
