namespace WebApplication3.Models;

public class FileEntry
{
    public int Id { get; set; }
    public string GroupCode { get; set; } = string.Empty;  
    public string OriginalName { get; set; } = string.Empty;
    public string StoredPath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public bool IsDownloaded { get; set; } = false;
}