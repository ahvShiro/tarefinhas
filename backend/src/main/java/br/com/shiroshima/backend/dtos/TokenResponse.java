package br.com.shiroshima.backend.dtos;

/**
 * Result of sign-in and sign-up inside the backend: the JWT (goes out only in the HttpOnly cookie) and the person
 * (goes out in the body). The token never goes in the body, so page scripts never see it.
 */
public record TokenResponse(String token, UserResponse user) {
}
