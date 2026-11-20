using Hackaton.Models;
using Hackaton.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Controllers
{
    [Route("api")]
    [ApiController]
    public class ApiController : ControllerBase
    {
        private readonly MapService _map;
        private readonly DatasetService _dataset;

        public ApiController(MapService map, DatasetService dataset)
        {
            _map = map;
            _dataset = dataset;
        }

        // GET /api/employment?indicator=EmpRate15to64&sex=Total&period=2026Q2
        [HttpGet("employment")]
        public async Task<IActionResult> Employment(Indicator indicator = Indicator.EmpRate15to64,
                                                    Sex sex = Sex.Total, string period = "2026Q2")
            => Ok(await _map.GetEmploymentAsync(indicator, sex, period));

        [HttpGet("jobs")]
        public async Task<IActionResult> Jobs(Sex sex = Sex.Total, string period = "2026Q2")
            => Ok(await _map.GetEmploymentAsync(Indicator.EmployedThousands, sex, period));

        // GET /api/dataset - всичко, което картата и таблиците на началната страница показват
        [HttpGet("dataset")]
        public async Task<IActionResult> Dataset()
            => Ok(await _dataset.GetAsync(new[] { "2026Q1", "2026Q2" }));
    }
}
