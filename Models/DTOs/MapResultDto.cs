namespace Hackaton.Models.DTOs
{
    /// <summary>
    /// DTO за резултатите от картата на регионите с показател
    /// </summary>
    public class MapResultDto
    {
        /// <summary>
        /// Списък на регионите с техните стойности, сортирани по стойност
        /// </summary>
        public List<RegionValueDto> Items { get; set; }

        /// <summary>
        /// Национална стойност на показателя
        /// </summary>
        public decimal? National { get; set; }

        /// <summary>
        /// Названието на показателя
        /// </summary>
        public string Indicator { get; set; }

        public MapResultDto(List<RegionValueDto> items, decimal? national, string indicator)
        {
            Items = items;
            National = national;
            Indicator = indicator;
        }
    }
}
