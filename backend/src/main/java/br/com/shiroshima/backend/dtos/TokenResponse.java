package br.com.shiroshima.backend.dtos;

/** JWT to send as "Authorization: Bearer <token>". */
public record TokenResponse(String token) {
}
