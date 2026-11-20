namespace Hackaton.Models
{
    public class EmploymentValue
    {
        public int Id
        {
            get; set;
        }
        public int? RegionId
        {
            get; set;
        }          // null = национално ниво
        public Region? Region
        {
            get; set;
        }
        public string Period { get; set; } = "";    // "2026Q2"
        public Indicator Indicator
        {
            get; set;
        }
        public Sex Sex
        {
            get; set;
        }
        public decimal Value
        {
            get; set;
        }
        public bool IsDemo
        {
            get; set;
        }
    }
}
