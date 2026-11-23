package br.com.shiroshima.backend.dtos;

import jakarta.validation.constraints.NotBlank;

/** Body of PUT /users/me. Only the name can change, as in the budgie project. */
public record UpdateUserRequest(
        @NotBlank(message = "Informe seu nome.")
        String name) {
}
