namespace Hackaton.Models
{
    /// <summary>Област (NUTS 3), напр. BG411 – София (столица).</summary>
    public class Region
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string MapCode { get; set; } = "";   // NUTS3 код, напр. "BG411"
        public int StatRegionId { get; set; }
        public StatRegion StatRegion { get; set; } = null!;
    }
}
