using Hackaton.Data;
using Hackaton.Models;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Services
{
    public class RankingService
    {
        private readonly ApplicationDbContext _db;
        public RankingService(ApplicationDbContext db) => _db = db;

        public Task<RankingViewModel> GetAsync(RankingQuery q) => q.Kind switch
        {
            RankingKind.Employment => EmploymentAsync(q),
            RankingKind.Unemployment => UnemploymentAsync(q),
            RankingKind.Profession => ProfessionAsync(q),
            _ => throw new ArgumentOutOfRangeException(nameof(q))
        };

        // ---------- Заетост (реални данни на НСИ) ----------
        private async Task<RankingViewModel> EmploymentAsync(RankingQuery q)
        {
            var rows = await _db.EmploymentValues.AsNoTracking()
                .Where(v => v.RegionId != null && v.Indicator == q.Indicator
                         && v.Sex == q.Sex && v.Period == q.Period)
                .Select(v => new { v.Region!.Name, v.Value, v.IsDemo })
                .OrderByDescending(v => v.Value)
                .ToListAsync();

            var national = await _db.EmploymentValues.AsNoTracking()
                .Where(v => v.RegionId == null && v.StatRegionId == null
                         && v.Indicator == q.Indicator
                         && v.Sex == q.Sex && v.Period == q.Period)
                .Select(v => v.Value).FirstOrDefaultAsync();

            var isThousands = q.Indicator == Indicator.EmployedThousands;

            return new RankingViewModel
            {
                Kind = RankingKind.Employment,
                Subtitle = $"{IndicatorName(q.Indicator)}, {SexName(q.Sex)}, {q.Period}. " +
                           $"Средно за страната: {national:N1}{(isThousands ? " хил." : "%")}.",
                ValueHeader = isThousands ? "Заети, хил." : "Коефициент, %",
                Unit = isThousands ? " хил." : "%",
                National = national,
                Selected = q.Selected,
                Rows = rows.Select((r, i) => new RankingRow(i + 1, r.Name, r.Value, r.IsDemo)).ToList()
            };
        }

        // ---------- Регистрирана безработица (АЗ; част от областите са ДЕМО) ----------
        private async Task<RankingViewModel> UnemploymentAsync(RankingQuery q)
        {
            var month = await _db.Unemployments.MaxAsync(u => (DateOnly?)u.Month);
            var rows = await _db.Unemployments.AsNoTracking()
                .Where(u => u.Month == month && u.RegionId != null)
                .Select(u => new { u.Region!.Name, Value = u.Rate, u.IsDemo })
                .OrderBy(u => u.Value)                 // най-ниска безработица = 1-во място
                .ToListAsync();

            // национален ред: RegionId == null (направете RegionId в Unemployment nullable)
            var national = await _db.Unemployments.AsNoTracking()
                .Where(u => u.Month == month && u.RegionId == null)
                .Select(u => u.Rate).FirstOrDefaultAsync();

            var real = rows.Count(r => !r.IsDemo);
            return new RankingViewModel
            {
                Kind = RankingKind.Unemployment,
                Subtitle = $"Регистрирана безработица по области, {month:MM.yyyy}. Средно за страната: {national:N2}%.",
                ValueHeader = "Безработица, %",
                Decimals = 2,
                National = national,
                Selected = q.Selected,
                Note = $"{real} реални стойности (Агенция по заетостта) и {rows.Count - real} ДЕМО.",
                Rows = rows.Select((r, i) => new RankingRow(i + 1, r.Name, r.Value, r.IsDemo)).ToList()
            };
        }

        // ---------- Дял по професия (ДЕМО), брой заети - реален ----------
        private async Task<RankingViewModel> ProfessionAsync(RankingQuery q)
        {
            var prof = await _db.Professions.AsNoTracking()
                .FirstAsync(p => p.Id == q.ProfessionId);

            var employed = await _db.EmploymentValues.AsNoTracking()
                .Where(v => v.RegionId != null && v.Indicator == Indicator.EmployedThousands
                         && v.Sex == Sex.Total && v.Period == q.Period)
                .ToDictionaryAsync(v => v.RegionId!.Value, v => v.Value);

            var shares = await _db.ProfessionShares.AsNoTracking()
                .Where(s => s.ProfessionId == prof.Id)
                .Select(s => new { s.RegionId, s.Region.Name, s.Share, s.IsDemo })
                .OrderByDescending(s => s.Share)
                .ToListAsync();

            var rows = shares.Select((s, i) =>
            {
                decimal? emp = employed.TryGetValue(s.RegionId, out var value) ? value : null;
                // дял% * хил. заети * 10 = души; заобляме до стотици
                decimal? persons = emp.HasValue ? Math.Round(s.Share * emp.Value / 10, MidpointRounding.AwayFromZero) * 100 : null;
                return new RankingRow(i + 1, s.Name, s.Share, s.IsDemo, persons, emp);
            }).ToList();

            // претеглена средна за страната
            var totalEmp = rows.Sum(r => r.EmployedThousands ?? 0);
            var national = totalEmp == 0 ? 0 : rows.Sum(r => r.Value * (r.EmployedThousands ?? 0)) / totalEmp;

            return new RankingViewModel
            {
                Kind = RankingKind.Profession,
                Subtitle = $"{prof.Name}: дял от заетите по области. ДЕМО ДАННИ.",
                ValueHeader = "Дял от заетите (ДЕМО)",
                National = national,
                NationalIsDemo = true,
                NationalLabel = "България (претеглено, ДЕМО)",
                Selected = q.Selected,
                Note = "ДЕМО: дяловете по професии са измислени. Само броят заети е реален (НСИ).",
                Rows = rows
            };
        }

        public Task<List<Profession>> GetProfessionsAsync() =>
            _db.Professions.AsNoTracking().OrderBy(p => p.Id).ToListAsync();

        public async Task<List<string>> GetDistrictPeriodsAsync()
        {
            var periods = await _db.EmploymentValues.AsNoTracking()
                .Where(v => v.RegionId != null)
                .Select(v => v.Period)
                .Distinct()
                .ToListAsync();
            return periods.OrderByDescending(p => p, StringComparer.Ordinal).ToList();
        }

        private static string IndicatorName(Indicator i) => i switch
        {
            Indicator.EmpRate15Plus => "Коефициент на заетост 15+ г.",
            Indicator.EmpRate15to64 => "Коефициент на заетост 15–64 г.",
            _ => "Заети лица"
        };

        private static string SexName(Sex s) => s switch
        {
            Sex.Men => "мъже",
            Sex.Women => "жени",
            _ => "общо"
        };
    }
}
