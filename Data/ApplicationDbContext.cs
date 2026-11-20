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
                .HasIndex(e => new { e.RegionId, e.StatRegionId, e.Period, e.Indicator, e.Sex })
                .IsUnique();
            b.Entity<EmploymentValue>().Property(e => e.Value).HasPrecision(10, 2);

            b.Entity<ProfessionShare>().Property(e => e.Share).HasPrecision(10, 4);
            b.Entity<Unemployment>().Property(e => e.Rate).HasPrecision(6, 2);

            b.Entity<Activity>().Property(e => e.Total).HasPrecision(10, 1);
            b.Entity<Activity>().Property(e => e.Men).HasPrecision(10, 1);
            b.Entity<Activity>().Property(e => e.Women).HasPrecision(10, 1);

            b.Entity<StatRegion>().HasIndex(e => e.Code).IsUnique();
            b.Entity<Region>().HasIndex(e => e.MapCode).IsUnique();
        }
    }
}
