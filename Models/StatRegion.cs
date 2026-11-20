namespace Hackaton.Models
{
    /// <summary>Статистически район (NUTS 2), напр. BG41 – Югозападен.</summary>
    public class StatRegion
    {
        public int Id { get; set; }
        public string Code { get; set; } = "";      // "BG41"
        public string Name { get; set; } = "";
        public List<Region> Regions { get; set; } = new();
    }
}
