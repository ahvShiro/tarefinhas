package br.com.shiroshima.backend.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Body of POST /auth/sign-in. */
public record SignInRequest(
        @NotBlank(message = "Informe seu e-mail.")
        @Email(regexp = SignUpRequest.EMAIL_PATTERN, message = "Use um e-mail no formato nome@exemplo.com.")
        String email,

        @NotBlank(message = "Informe sua senha.")
        String password) {
}
