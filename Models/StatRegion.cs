namespace Hackaton.Models
{
    public class StatRegion
    {
        public int Id
        {
            get; set;
        }
        public string Name { get; set; } = "";
        public List<Region> Regions { get; set; } = new();
    }
}
