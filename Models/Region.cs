namespace Hackaton.Models
{
    public class Region
    {
        public int Id
        {
            get; set;
        }
        public string Name { get; set; } = "";
        public string MapCode { get; set; } = "";   // id на <path> в SVG картата
        public int StatRegionId
        {
            get; set;
        }
        public StatRegion StatRegion { get; set; } = null!;
    }
}
