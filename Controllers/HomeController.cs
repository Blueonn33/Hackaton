using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Controllers
{
    public class HomeController : Controller
    {
        // Началната страница е картата със заетостта
        public IActionResult Index() => View();

        // стар адрес, оставен за съвместимост
        public IActionResult Employment() => RedirectToActionPermanent(nameof(Index));

        public IActionResult Privacy() => View();

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() => View();
    }
}
