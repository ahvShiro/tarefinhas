package br.com.shiroshima.backend.dtos;

import java.util.UUID;

import br.com.shiroshima.backend.models.User;

public record UserResponse(UUID id, String name, String email) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}
