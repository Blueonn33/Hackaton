namespace Hackaton.Models
{
    public enum RankingKind { Employment, Unemployment, Profession }

    // Параметри от заявката: /Ranking?kind=Employment&indicator=EmpRate15to64&sex=Total&period=2026Q2
    public class RankingQuery
    {
        public RankingKind Kind { get; set; } = RankingKind.Employment;
        public Indicator Indicator { get; set; } = Indicator.EmpRate15to64;
        public Sex Sex { get; set; } = Sex.Total;
        public string Period { get; set; } = "2026Q2";
        public int? ProfessionId { get; set; }      // само за Kind = Profession
        public string? Selected { get; set; }       // име на избраната област (за подчертаване)
    }

    public record RankingRow(
        int Rank,
        string RegionName,
        decimal Value,
        bool IsDemo,
        decimal? Persons = null,        // ≈ души (само за професии)
        decimal? EmployedThousands = null);

    public class RankingViewModel
    {
        public RankingKind Kind { get; init; }
        public string Subtitle { get; init; } = "";
        public string ValueHeader { get; init; } = "";
        public string Unit { get; init; } = "%";
        public int Decimals { get; init; } = 1;
        public decimal National { get; init; }
        public bool NationalIsDemo { get; init; }
        public string NationalLabel { get; init; } = "България";
        public string Note { get; init; } = "";
        public string? Selected { get; init; }
        public List<RankingRow> Rows { get; init; } = new();
        public decimal Max => Rows.Count == 0 ? 1 : Rows.Max(r => r.Value);
    }
}
