namespace Hackaton.Models
{
    public class ProfessionShare
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
        public int ProfessionId
        {
            get; set;
        }
        public Profession Profession { get; set; } = null!;
        public decimal Share
        {
            get; set;
        }          // % от заетите
        public bool IsDemo { get; set; } = true;
    }
}
