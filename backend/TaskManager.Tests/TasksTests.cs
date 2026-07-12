using System.Net;
using System.Net.Http.Json;
using TaskManager.Api.Dtos;
using TaskManager.Api.Models;

namespace TaskManager.Tests;

public class TasksTests
{
    private const string ValidDue = "2026-07-15T14:30:00Z";

    [Theory]
    [InlineData("")]      // empty title
    [InlineData("   ")]   // whitespace-only title
    public async Task Create_with_blank_title_returns_400(string title)
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/tasks", new { title, dueDate = ValidDue });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_without_a_due_date_is_allowed()
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        // Due date is optional (added via a checkbox in the UI), so omitting it is valid.
        var response = await client.PostAsJsonAsync("/api/tasks", new { title = "Someday task" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var task = await response.Content.ReadFromJsonAsync<TaskResponse>(TestAppFactory.JsonOptions);
        Assert.Null(task!.DueDate);
    }

    [Fact]
    public async Task Create_with_invalid_due_date_returns_400()
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync(
            "/api/tasks", new { title = "Bad date", dueDate = "not-a-date" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Completed_task_is_hidden_from_the_active_list()
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        var created = await client.PostAsJsonAsync("/api/tasks", new { title = "Finish report", dueDate = ValidDue });
        var task = await created.Content.ReadFromJsonAsync<TaskResponse>(TestAppFactory.JsonOptions);

        // Mark it done.
        var update = await client.PutAsJsonAsync(
            $"/api/tasks/{task!.Id}",
            new { title = task.Title, dueDate = ValidDue, isComplete = true });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        // It should no longer appear in the active list.
        var list = await client.GetFromJsonAsync<List<TaskResponse>>("/api/tasks", TestAppFactory.JsonOptions);
        Assert.DoesNotContain(list!, t => t.Id == task.Id);
    }

    [Fact]
    public async Task Create_valid_task_returns_201_and_is_listed()
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        // No priority sent, and the title has surrounding whitespace.
        var response = await client.PostAsJsonAsync(
            "/api/tasks", new { title = "  my sample task  ", description = "NYC", dueDate = ValidDue });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<TaskResponse>(TestAppFactory.JsonOptions);
        Assert.Equal("my sample task", created!.Title);     // title is trimmed
        Assert.Equal(Priority.Medium, created.Priority);   // defaults to Medium when omitted
        Assert.False(created.IsComplete);

        // It shows up in the active list.
        var list = await client.GetFromJsonAsync<List<TaskResponse>>("/api/tasks", TestAppFactory.JsonOptions);
        Assert.Contains(list!, t => t.Id == created.Id);
    }

    [Fact]
    public async Task Update_saves_changes()
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        var created = await client.PostAsJsonAsync(
            "/api/tasks", new { title = "my sample task 2", priority = "Low", dueDate = ValidDue });
        var task = await created.Content.ReadFromJsonAsync<TaskResponse>(TestAppFactory.JsonOptions);

        var update = await client.PutAsJsonAsync(
            $"/api/tasks/{task!.Id}",
            new { title = "my updated sample task 2", priority = "High", dueDate = ValidDue, isComplete = false });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        // Re-fetch and confirm the changes actually persisted.
        var fetched = await client.GetFromJsonAsync<TaskResponse>(
            $"/api/tasks/{task.Id}", TestAppFactory.JsonOptions);
        Assert.Equal("my updated sample task 2", fetched!.Title);
        Assert.Equal(Priority.High, fetched.Priority);
    }

    [Fact]
    public async Task Update_nonexistent_task_returns_404()
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        var response = await client.PutAsJsonAsync(
            "/api/tasks/9999", new { title = "my sample task 3", dueDate = ValidDue, isComplete = false });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_removes_the_task()
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        var created = await client.PostAsJsonAsync("/api/tasks", new { title = "my sample task 4", dueDate = ValidDue });
        var task = await created.Content.ReadFromJsonAsync<TaskResponse>(TestAppFactory.JsonOptions);

        var delete = await client.DeleteAsync($"/api/tasks/{task!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var list = await client.GetFromJsonAsync<List<TaskResponse>>("/api/tasks", TestAppFactory.JsonOptions);
        Assert.DoesNotContain(list!, t => t.Id == task.Id);
    }

    [Fact]
    public async Task Delete_nonexistent_task_returns_404()
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        var response = await client.DeleteAsync("/api/tasks/9999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Active_tasks_are_ordered_by_priority_high_to_low()
    {
        using var factory = new TestAppFactory();
        var client = await factory.CreateAuthenticatedClientAsync();

        await client.PostAsJsonAsync("/api/tasks", new { title = "my sample task 5", priority = "Low", dueDate = ValidDue });
        await client.PostAsJsonAsync("/api/tasks", new { title = "my sample task 6", priority = "High", dueDate = ValidDue });

        var list = await client.GetFromJsonAsync<List<TaskResponse>>("/api/tasks", TestAppFactory.JsonOptions);

        // High priority sorts before Low.
        Assert.Equal("my sample task 6", list![0].Title);
        Assert.Equal("my sample task 5", list[1].Title);
    }
}
