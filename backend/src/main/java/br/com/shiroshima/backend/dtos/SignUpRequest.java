package br.com.shiroshima.backend.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of POST /auth/sign-up. Password rule from the budgie project: 8+ characters, upper, lower, digit, symbol. */
public record SignUpRequest(
        @NotBlank(message = "Informe seu nome.")
        String name,

        @NotBlank(message = "Informe seu e-mail.")
        @Email(regexp = EMAIL_PATTERN, message = "Use um e-mail no formato nome@exemplo.com.")
        String email,

        @NotBlank(message = "Informe uma senha.")
        @Size(min = MIN_PASSWORD_LENGTH, message = "Use uma senha com pelo menos 8 caracteres.")
        @Pattern(regexp = STRONG_PASSWORD_PATTERN,
                message = "Use pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial.")
        String password,

        @NotBlank(message = "Digite a senha de novo para confirmar.")
        String passwordConfirmation) {

    /** Same check as the frontend: text, one @, a domain with a dot. */
    public static final String EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
    public static final int MIN_PASSWORD_LENGTH = 8;
    public static final String STRONG_PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).+$";
}
