namespace Hackaton.Models
{
    public class Activity
    {
        public int Id
        {
            get; set;
        }
        public string Name { get; set; } = "";
        public decimal Total
        {
            get; set;
        }
        public decimal Men
        {
            get; set;
        }
        public decimal Women
        {
            get; set;
        }
        public string Period { get; set; } = "2026Q3";
    }
}
