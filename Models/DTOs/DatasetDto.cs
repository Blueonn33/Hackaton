using System.Text.Json.Serialization;

namespace Hackaton.Models.DTOs
{
    /// <summary>
    /// Всички данни, от които страницата с картата се нуждае (GET /api/dataset).
    /// Формата е същият като във файла zaetost-po-profesii.html.
    /// </summary>
    public class DatasetDto
    {
        /// <summary>код (BG, BG41, BG411) -> тримесечие -> показател (k15|k1564|emp) -> [общо, мъже, жени]</summary>
        [JsonPropertyName("d")]
        public Dictionary<string, Dictionary<string, Dictionary<string, decimal[]>>> D { get; set; } = new();

        /// <summary>област -> NUTS3 код</summary>
        [JsonPropertyName("code")]
        public Dictionary<string, string> Code { get; set; } = new();

        /// <summary>статистически район -> NUTS2 код</summary>
        [JsonPropertyName("rCode")]
        public Dictionary<string, string> RCode { get; set; } = new();

        /// <summary>Само реалните стойности на АЗ (област -> %)</summary>
        [JsonPropertyName("azReal")]
        public Dictionary<string, decimal> AzReal { get; set; } = new();

        /// <summary>Всички стойности на АЗ, реални и ДЕМО (област -> %)</summary>
        [JsonPropertyName("azAll")]
        public Dictionary<string, decimal> AzAll { get; set; } = new();

        [JsonPropertyName("azNat")]

        public decimal AzNat { get; set; }

        /// <summary>Имена на професиите (ДЕМО), по ред</summary>
        [JsonPropertyName("names")]
        public List<string> Names { get; set; } = new();

        /// <summary>област -> дялове по професии (ДЕМО), в реда на Names</summary>
        [JsonPropertyName("ps")]
        public Dictionary<string, decimal[]> Ps { get; set; } = new();

        /// <summary>[име, [общо, звезда], [мъже, звезда], [жени, звезда]]; първият ред е "Общо"</summary>
        [JsonPropertyName("act")]
        public List<object[]> Act { get; set; } = new();

        [JsonPropertyName("kpis")]

        public List<KpiDto> Kpis { get; set; } = new();
    }

    public class KpiDto
    {
        [JsonPropertyName("kind")]
        public string Kind { get; set; } = "rate";   // rate | count
        [JsonPropertyName("value")]
        public decimal Value { get; set; }
        [JsonPropertyName("label")]
        public string Label { get; set; } = "";
    }
}
