using Hackaton.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Controllers
{
    [Route("api")]
    [ApiController]
    public class ApiController : ControllerBase
    {
        private readonly MapService _svc;
        public ApiController(MapService svc) => _svc = svc;

        [HttpGet("employment")]
        public async Task<IActionResult> Employment(Indicator indicator, Sex sex, string period)
            => Ok(await _svc.GetEmploymentAsync(indicator, sex, period));
    }

}
