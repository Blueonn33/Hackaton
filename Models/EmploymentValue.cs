namespace Hackaton.Models
{
    /// <summary>
    /// Една стойност от НСИ. Ниво: RegionId (област) ИЛИ StatRegionId (район);
    /// ако и двете са null, стойността е за цялата страна.
    /// </summary>
    public class EmploymentValue
    {
        public int Id { get; set; }
        public int? RegionId { get; set; }
        public Region? Region { get; set; }
        public int? StatRegionId { get; set; }
        public StatRegion? StatRegion { get; set; }
        public string Period { get; set; } = "";    // "2026Q2"
        public Indicator Indicator { get; set; }
        public Sex Sex { get; set; }
        public decimal Value { get; set; }
        public bool IsDemo { get; set; }
    }
}
