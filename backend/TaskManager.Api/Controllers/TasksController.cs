using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Data;
using TaskManager.Api.Dtos;
using TaskManager.Api.Models;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize] // all task endpoints require a valid JWT
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;

    public TasksController(AppDbContext db) => _db = db;

    // GET /api/tasks
    // Returns only active (incomplete) tasks, ordered by priority (High -> Low), then by due
    // date (undated tasks last), then by creation order. Completed tasks are hidden.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskResponse>>> GetAll()
    {
        var tasks = await _db.Tasks
            .Where(t => !t.IsComplete)
            .OrderByDescending(t => t.Priority)
            .ThenBy(t => t.DueDate == null) // dated tasks (false) before undated (true)
            .ThenBy(t => t.DueDate)
            .ThenBy(t => t.CreatedAtUtc)
            .Select(t => new TaskResponse(t.Id, t.Title, t.Description, t.Priority, t.DueDate, t.IsComplete))
            .ToListAsync();

        return Ok(tasks);
    }

    // GET /api/tasks/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskResponse>> GetById(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task is null) return NotFound();

        return Ok(ToResponse(task));
    }

    // POST /api/tasks
    [HttpPost]
    public async Task<ActionResult<TaskResponse>> Create(CreateTaskRequest request)
    {
        var task = new TaskItem
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Priority = request.Priority,
            DueDate = request.DueDate,
            IsComplete = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = task.Id }, ToResponse(task));
    }

    // PUT /api/tasks/{id}
    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskResponse>> Update(int id, UpdateTaskRequest request)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task is null) return NotFound();

        task.Title = request.Title.Trim();
        task.Description = request.Description?.Trim();
        task.Priority = request.Priority;
        task.DueDate = request.DueDate;
        task.IsComplete = request.IsComplete;

        await _db.SaveChangesAsync();

        return Ok(ToResponse(task));
    }

    // DELETE /api/tasks/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task is null) return NotFound();

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static TaskResponse ToResponse(TaskItem t) =>
        new(t.Id, t.Title, t.Description, t.Priority, t.DueDate, t.IsComplete);
}
