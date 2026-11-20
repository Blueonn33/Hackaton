using Hackaton.Models;
using Hackaton.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Controllers
{
    public class RankingController : Controller
    {
        private readonly RankingService _svc;
        public RankingController(RankingService svc) => _svc = svc;

        // Страница:        GET /Ranking?kind=Employment&indicator=EmpRate15to64&sex=Total&period=2026Q2
        //                  GET /Ranking?kind=Unemployment
        //                  GET /Ranking?kind=Profession&professionId=3
        // Само таблицата:  същите адреси, но с fetch (заглавка X-Requested-With) или &partial=true
        [HttpGet]
        public async Task<IActionResult> Index([FromQuery] RankingQuery q, [FromQuery] bool partial = false)
        {
            var professions = await _svc.GetProfessionsAsync();
            var isAjax = partial || Request.Headers.XRequestedWith == "XMLHttpRequest";

            if (q.Kind == RankingKind.Profession && q.ProfessionId is null)
            {
                if (isAjax || professions.Count == 0)
                    return BadRequest("professionId е задължително за kind=Profession.");
                q.ProfessionId = professions[0].Id;
            }

            var table = await _svc.GetAsync(q);

            if (isAjax)
                return PartialView("_RankingTable", table);

            return View(new RankingPageViewModel { Query = q, Table = table, Professions = professions });
        }
    }
}
