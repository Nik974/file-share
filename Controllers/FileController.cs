using System.IO.Compression;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication3.Data;
using WebApplication3.Models;

namespace WebApplication3.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FileController : Controller
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<FileController> _logger;

    private static readonly string[] AllowedMimeTypes =
    [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf", "text/plain",
        "application/zip", "application/x-zip-compressed",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    public FileController(AppDbContext db, IWebHostEnvironment env, ILogger<FileController> logger)
    {
        _db = db;
        _env = env;
        _logger = logger;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(500 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 500 * 1024 * 1024)]
    public async Task<IActionResult> Upload(List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
            return BadRequest(new { error = "Nie przesłano żadnego pliku." });

        if (files.Count > Constants.MaxFilesPerUpload)
            return BadRequest(new { error = $"Możesz przesłać maksymalnie {Constants.MaxFilesPerUpload} pliki na raz." });

        foreach (var f in files)
        {
            if (f.Length > Constants.MaxFileSizeBytes)
                return BadRequest(new { error = $"Plik '{f.FileName}' przekracza limit 100MB." });

            if (!AllowedMimeTypes.Contains(f.ContentType))
                return BadRequest(new { error = $"Typ pliku '{f.ContentType}' nie jest dozwolony." });
        }

        var groupCode = await GenerateUniqueGroupCodeAsync();
        var uploadFolder = Path.Combine(_env.ContentRootPath, "FileStorage");
        Directory.CreateDirectory(uploadFolder);

        var entries = new List<FileEntry>();

        foreach (var file in files)
        {
            var storedFileName = $"{groupCode}_{Path.GetRandomFileName()}";
            var storedPath = Path.Combine(uploadFolder, storedFileName);

            await using (var stream = new FileStream(storedPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            entries.Add(new FileEntry
            {
                GroupCode = groupCode,
                OriginalName = Path.GetFileName(file.FileName),
                StoredPath = storedPath,
                ContentType = file.ContentType,
                FileSize = file.Length,
                UploadedAt = DateTime.UtcNow,
                IsDownloaded = false
            });
        }

        _db.Files.AddRange(entries);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Wgrano {Count} plik(i) z kodem {Code}", entries.Count, groupCode);

        return Ok(new
        {
            code = groupCode,
            fileCount = entries.Count,
            files = entries.Select(e => new { e.OriginalName, e.FileSize, e.ContentType }),
            expiresAt = entries[0].UploadedAt.AddMinutes(Constants.CodeExpirationMinutes)
        });
    }

    [HttpGet("{code}")]
    public async Task<IActionResult> GetFileInfo(string code)
    {
        if (!IsValidCode(code))
            return BadRequest(new { error = "Nieprawidłowy format kodu." });

        var entries = await _db.Files
            .Where(f => f.GroupCode == code && !f.IsDownloaded)
            .ToListAsync();

        if (!entries.Any())
            return NotFound(new { error = "Nie znaleziono plików. Kod jest nieprawidłowy lub pliki zostały już pobrane." });

        if (DateTime.UtcNow > entries[0].UploadedAt.AddMinutes(Constants.CodeExpirationMinutes))
            return NotFound(new { error = "Kod wygasł. Pliki zostały usunięte." });

        return Ok(new
        {
            fileCount = entries.Count,
            files = entries.Select(e => new { e.OriginalName, e.FileSize, e.ContentType }),
            expiresAt = entries[0].UploadedAt.AddMinutes(Constants.CodeExpirationMinutes)
        });
    }

    [HttpGet("{code}/download")]
    public async Task<IActionResult> Download(string code)
    {
        if (!IsValidCode(code))
            return BadRequest(new { error = "Nieprawidłowy format kodu." });

        var entries = await _db.Files
            .Where(f => f.GroupCode == code && !f.IsDownloaded)
            .ToListAsync();

        if (!entries.Any())
            return NotFound(new { error = "Nie znaleziono plików. Kod jest nieprawidłowy lub pliki zostały już pobrane." });

        if (DateTime.UtcNow > entries[0].UploadedAt.AddMinutes(Constants.CodeExpirationMinutes))
            return NotFound(new { error = "Kod wygasł. Pliki zostały usunięte." });

        foreach (var e in entries)
            if (!System.IO.File.Exists(e.StoredPath))
            {
                _logger.LogWarning("Brak pliku na dysku: {Path}", e.StoredPath);
                return NotFound(new { error = "Jeden z plików nie istnieje na serwerze." });
            }

        foreach (var e in entries)
            e.IsDownloaded = true;
        await _db.SaveChangesAsync();

        var zipStream = new MemoryStream();
        using (var zip = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var entry in entries)
            {
                var zipEntry = zip.CreateEntry(entry.OriginalName, CompressionLevel.Fastest);
                await using var entryStream = zipEntry.Open();
                var bytes = await System.IO.File.ReadAllBytesAsync(entry.StoredPath);
                await entryStream.WriteAsync(bytes);
            }
        }

        _ = Task.Run(async () =>
        {
            await Task.Delay(500);
            foreach (var entry in entries)
            {
                try { System.IO.File.Delete(entry.StoredPath); }
                catch (Exception ex) { _logger.LogError(ex, "Błąd usuwania pliku {Path}", entry.StoredPath); }
            }
        });

        zipStream.Position = 0;
        var zipName = entries.Count == 1 ? entries[0].OriginalName : $"pliki_{code}.zip";
        var contentType = entries.Count == 1 ? entries[0].ContentType : "application/zip";

        return File(zipStream, contentType, zipName);
    }

    private async Task<string> GenerateUniqueGroupCodeAsync()
    {
        var random = new Random();
        string code;
        int attempts = 0;
        do
        {
            if (attempts++ > 100)
                throw new InvalidOperationException("Nie udało się wygenerować unikalnego kodu.");
            code = random.Next(100000, 999999).ToString();
        }
        while (await _db.Files.AnyAsync(f => f.GroupCode == code));
        return code;
    }

    private static bool IsValidCode(string code) =>
        code.Length == 6 && code.All(char.IsDigit);
}