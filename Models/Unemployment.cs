namespace Hackaton.Models
{
    public class Unemployment
    {
        public int Id
        {
            get; set;
        }
        public int RegionId
        {
            get; set;
        }
        public Region Region { get; set; } = null!;
        public DateOnly Month
        {
            get; set;
        }         // 2026-04-01
        public decimal Rate
        {
            get; set;
        }
        public bool IsDemo
        {
            get; set;
        }
    }
}
