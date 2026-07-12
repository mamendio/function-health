using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using TaskManager.Api.Dtos;

namespace TaskManager.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _config;

    public AuthController(IConfiguration config)
    {
        _config = config;
    }

    // POST /api/auth/login
    // Single-user gate: validates against the seeded demo credentials in configuration
    // and returns a signed JWT. These are demo credentials, not production auth.
    [HttpPost("login")]
    [AllowAnonymous]
    public ActionResult<LoginResponse> Login(LoginRequest request)
    {
        var expectedUser = _config["Auth:Username"];
        var expectedPass = _config["Auth:Password"];

        if (!string.Equals(request.Username, expectedUser, StringComparison.Ordinal) ||
            !string.Equals(request.Password, expectedPass, StringComparison.Ordinal))
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        return Ok(new LoginResponse(GenerateToken(request.Username)));
    }

    // Generates a JWT for the given username using configuration settings for key, issuer, audience, and expiry.
    private string GenerateToken(string username)
    {
        var key = _config["Auth:Jwt:Key"]
            ?? throw new InvalidOperationException("Auth:Jwt:Key is not configured.");
        var issuer = _config["Auth:Jwt:Issuer"];
        var audience = _config["Auth:Jwt:Audience"];
        var expiryHours = int.TryParse(_config["Auth:Jwt:ExpiryHours"], out var h) ? h : 8;

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: new[] { new Claim(ClaimTypes.Name, username) },
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
