using Hackaton.Models;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Data
{
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
    {
        public DbSet<StatRegion> StatRegions => Set<StatRegion>();
        public DbSet<Region> Regions => Set<Region>();
        public DbSet<EmploymentValue> EmploymentValues => Set<EmploymentValue>();
        public DbSet<Profession> Professions => Set<Profession>();
        public DbSet<ProfessionShare> ProfessionShares => Set<ProfessionShare>();
        public DbSet<Unemployment> Unemployments => Set<Unemployment>();
        public DbSet<Activity> Activities => Set<Activity>();

        protected override void OnModelCreating(ModelBuilder b)
        {
            b.Entity<EmploymentValue>()
                .HasIndex(e => new { e.RegionId, e.Period, e.Indicator, e.Sex }).IsUnique();
            b.Entity<EmploymentValue>().Property(e => e.Value).HasPrecision(10, 2);
        }
    }
}
