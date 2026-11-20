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
            if (!ModelState.IsValid || !Enum.IsDefined(q.Kind) ||
                !Enum.IsDefined(q.Indicator) || !Enum.IsDefined(q.Sex))
                return BadRequest("Невалидни параметри на класацията.");

            var professions = await _svc.GetProfessionsAsync();
            var isAjax = partial || Request.Headers.XRequestedWith == "XMLHttpRequest";

            if (q.Kind == RankingKind.Profession)
            {
                q.ProfessionId ??= professions.FirstOrDefault()?.Id;
                if (!professions.Any(p => p.Id == q.ProfessionId))
                    return BadRequest("Невалидна професия.");
            }

            var periods = await _svc.GetDistrictPeriodsAsync();
            if (q.Kind != RankingKind.Unemployment && !periods.Contains(q.Period))
                return BadRequest("За това тримесечие няма данни по области.");

            var table = await _svc.GetAsync(q);

            if (isAjax)
                return PartialView("_RankingTable", table);

            return View(new RankingPageViewModel { Query = q, Table = table, Professions = professions, Periods = periods });
        }
    }
}
