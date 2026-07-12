namespace TaskManager.Api.Models;

/// <summary>
/// Task priority
/// </summary>
public enum Priority
{
    Low = 0,
    Medium = 1,
    High = 2,
}

/// <summary>
/// A single to-do task
/// </summary>
public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Priority Priority { get; set; } = Priority.Medium;
    public DateTime? DueDate { get; set; }
    public bool IsComplete { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
