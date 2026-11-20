using Hackaton.Models;
using Hackaton.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Controllers
{
    public class RankingController : Controller
    {
        private readonly RankingService _svc;
        public RankingController(RankingService svc) => _svc = svc;

        // GET /Ranking?kind=Employment&indicator=EmpRate15to64&sex=Total&period=2026Q2
        // GET /Ranking?kind=Unemployment
        // GET /Ranking?kind=Profession&professionId=3
        [HttpGet]
        public async Task<IActionResult> Index([FromQuery] RankingQuery q)
        {
            if (q.Kind == RankingKind.Profession && q.ProfessionId is null)
                return BadRequest("professionId е задължително за kind=Profession.");

            var vm = await _svc.GetAsync(q);

            // Връщаме само таблицата; страницата я вмъква в #ranking с fetch
            return PartialView("_RankingTable", vm);
        }
    }
}
