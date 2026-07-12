using System.ComponentModel.DataAnnotations;

namespace TaskManager.Api.Dtos;

/// <summary>Login payload for the single seeded user.</summary>
public class LoginRequest
{
    [Required(ErrorMessage = "Username is required.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;
}

/// <summary>Returned on successful login.</summary>
public record LoginResponse(string Token);
