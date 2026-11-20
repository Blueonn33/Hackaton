namespace Hackaton.Models
{
    public class Activity
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public decimal Total { get; set; }
        public decimal Men { get; set; }
        public decimal Women { get; set; }
        // true = малка извадка, стойността не е достатъчно точна (звездичка)
        public bool TotalLowSample { get; set; }
        public bool MenLowSample { get; set; }
        public bool WomenLowSample { get; set; }
        public string Period { get; set; } = "2026Q3";
    }
}
