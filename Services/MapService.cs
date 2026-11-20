using Hackaton.Data;
using Hackaton.Models;
using Hackaton.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Services
{
    public class MapService
    {
        private readonly ApplicationDbContext _db;
        public MapService(ApplicationDbContext db) => _db = db;

        public async Task<MapResultDto> GetEmploymentAsync(Indicator ind, Sex sex, string period)
        {
            var rows = await _db.EmploymentValues.AsNoTracking()
                .Where(v => v.Indicator == ind && v.Sex == sex
                         && v.Period == period && v.RegionId != null)
                .Select(v => new { v.Region!.MapCode, v.Region.Name, v.Value, v.IsDemo })
                .ToListAsync();

            var items = rows.OrderByDescending(r => r.Value)
                .Select((r, i) => new RegionValueDto(r.MapCode, r.Name, r.Value, r.IsDemo, i + 1))
                .ToList();

            decimal? national = await _db.EmploymentValues.AsNoTracking()
                .Where(v => v.RegionId == null && v.StatRegionId == null
                         && v.Indicator == ind && v.Sex == sex && v.Period == period)
                .Select(v => (decimal?)v.Value)
                .FirstOrDefaultAsync();

            return new MapResultDto(items, national, ind.ToString());
        }
    }
}
