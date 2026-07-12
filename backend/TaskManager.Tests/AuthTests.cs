using System.Net;
using System.Net.Http.Json;
using TaskManager.Api.Dtos;

namespace TaskManager.Tests;

public class AuthTests
{
    [Fact]
    public async Task Task_endpoint_without_token_returns_401()
    {
        using var factory = new TestAppFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/tasks");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        using var factory = new TestAppFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/login", new { username = "admin", password = "nope" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_with_missing_credentials_returns_400()
    {
        using var factory = new TestAppFactory();
        var client = factory.CreateClient();

        // Empty username/password fail the [Required] validation on LoginRequest.
        var response = await client.PostAsJsonAsync(
            "/api/auth/login", new { username = "", password = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_with_correct_credentials_returns_token_that_grants_access()
    {
        using var factory = new TestAppFactory();
        var client = factory.CreateClient();

        var login = await client.PostAsJsonAsync(
            "/api/auth/login", new { username = "admin", password = "password123" });

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));

        // The token actually grants access to a protected endpoint.
        var authed = await factory.CreateAuthenticatedClientAsync();
        var tasks = await authed.GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.OK, tasks.StatusCode);
    }
}
