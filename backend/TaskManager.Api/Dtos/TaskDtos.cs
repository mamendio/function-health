using System.ComponentModel.DataAnnotations;
using TaskManager.Api.Models;

namespace TaskManager.Api.Dtos;

/// <summary>Payload for creating a task.</summary>
public class CreateTaskRequest
{
    // [Required] on a string rejects null, empty, AND whitespace-only values.
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be 1-200 characters.")]
    public string Title { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or fewer.")]
    public string? Description { get; set; }

    public Priority Priority { get; set; } = Priority.Medium;

    // Optional. When supplied it must be a valid UTC timestamp (an unparseable value fails
    // model binding and returns 400); when omitted, the task simply has no due date.
    public DateTime? DueDate { get; set; }
}

/// <summary>Payload for updating a task.</summary>
public class UpdateTaskRequest
{
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be 1-200 characters.")]
    public string Title { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or fewer.")]
    public string? Description { get; set; }

    public Priority Priority { get; set; } = Priority.Medium;

    public DateTime? DueDate { get; set; }

    public bool IsComplete { get; set; }
}

/// <summary>Shape returned to the client for a task.</summary>
public record TaskResponse(
    int Id,
    string Title,
    string? Description,
    Priority Priority,
    DateTime? DueDate,
    bool IsComplete);
