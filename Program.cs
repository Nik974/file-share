using Microsoft.AspNetCore.SpaServices.Extensions;
using Microsoft.EntityFrameworkCore;
using WebApplication3.Data;
using WebApplication3.Services;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 100 * 1024 * 1024;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHostedService<FileCleanupService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors("DevPolicy");
app.UseAuthorization();

app.MapControllers();
app.MapGet("/debug/routes", (IEnumerable<EndpointDataSource> sources) =>
    string.Join("\n", sources.SelectMany(s => s.Endpoints).Select(e => e.DisplayName)));
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.UseEndpoints(_ => { });

app.MapWhen(ctx => !ctx.Request.Path.StartsWithSegments("/api"), appBuilder =>
{
    appBuilder.UseSpa(spa =>
    {
        spa.Options.SourcePath = "client";
        spa.UseProxyToSpaDevelopmentServer("http://localhost:5173");
    });
});

app.Run();