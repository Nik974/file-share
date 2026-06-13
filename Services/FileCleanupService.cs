using Microsoft.EntityFrameworkCore;
using WebApplication3.Data;

namespace WebApplication3.Services;

public class FileCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FileCleanupService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(1);

    public FileCleanupService(IServiceScopeFactory scopeFactory, ILogger<FileCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("FileCleanupService uruchomiony.");

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(_interval, stoppingToken);
            await CleanupExpiredFilesAsync(stoppingToken);
        }

        _logger.LogInformation("FileCleanupService zatrzymany.");
    }

    private async Task CleanupExpiredFilesAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var expiredAt = DateTime.UtcNow.AddMinutes(-Constants.CodeExpirationMinutes);

            var expiredFiles = await db.Files
                .Where(f => !f.IsDownloaded && f.UploadedAt < expiredAt)
                .ToListAsync(stoppingToken);

            if (expiredFiles.Count == 0)
                return;

            _logger.LogInformation("Znaleziono {Count} wygasłych plików do usunięcia.", expiredFiles.Count);

            foreach (var file in expiredFiles)
            {
                try
                {
                    if (File.Exists(file.StoredPath))
                    {
                        File.Delete(file.StoredPath);
                        _logger.LogInformation("Usunięto plik z dysku: {Code} ({Name})", file.GroupCode, file.OriginalName);
                    }
                    else
                    {
                        _logger.LogWarning("Plik {Code} nie istniał na dysku: {Path}", file.GroupCode, file.StoredPath);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Błąd podczas usuwania pliku {Code} z dysku.", file.GroupCode);
                }
            }

            db.Files.RemoveRange(expiredFiles);
            await db.SaveChangesAsync(stoppingToken);

            _logger.LogInformation("Usunięto {Count} wygasłych rekordów z bazy.", expiredFiles.Count);
        }
        catch (OperationCanceledException)
        {
            // normalne zatrzymanie aplikacji, ignorujemy
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Nieoczekiwany błąd w FileCleanupService.");
        }
    }
}