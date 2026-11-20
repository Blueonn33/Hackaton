namespace Hackaton.Models.DTOs
{
    /// <summary>
    /// DTO за представяне на стойност на регион в картата
    /// </summary>
    public class RegionValueDto
    {
        /// <summary>
        /// Код на региона (ID на SVG path елемента)
        /// </summary>
        public string MapCode { get; set; }

        /// <summary>
        /// Названието на региона
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Стойността на показателя
        /// </summary>
        public decimal Value { get; set; }

        /// <summary>
        /// Маркер дали стойносттага е демонстрационна (тестова)
        /// </summary>
        public bool IsDemo { get; set; }

        /// <summary>
        /// Ранг (позиция) на региона при сортиране по стойност
        /// </summary>
        public int Rank { get; set; }

        public RegionValueDto(string mapCode, string name, decimal value, bool isDemo, int rank)
        {
            MapCode = mapCode;
            Name = name;
            Value = value;
            IsDemo = isDemo;
            Rank = rank;
        }
    }
}
