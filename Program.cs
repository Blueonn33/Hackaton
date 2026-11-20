using Hackaton.Data;
using Hackaton.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ---- услуги ----
var connectionString = builder.Configuration.GetConnectionString("PredatorConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddControllersWithViews();

builder.Services.AddScoped<MapService>();
builder.Services.AddScoped<RankingService>();
builder.Services.AddScoped<DatasetService>();

var app = builder.Build();

// ---- база данни: създава се и се зарежда при първо стартиране ----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        await DbInitializer.InitializeAsync(db, app.Environment.ContentRootPath, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Неуспешна инициализация на базата. Проверете ConnectionStrings:DefaultConnection в appsettings.json.");
        throw;
    }
}

// ---- pipeline ----
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // HSTS: https://aka.ms/aspnetcore-hsts
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();

app.MapStaticAssets();
app.MapControllerRoute(
        name: "default",
        pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
