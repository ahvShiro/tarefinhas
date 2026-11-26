package br.com.shiroshima.backend.services;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.shiroshima.backend.dtos.UpdateUserRequest;
import br.com.shiroshima.backend.dtos.UserResponse;
import br.com.shiroshima.backend.models.User;
import br.com.shiroshima.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /** The user of the current request. Only called on routes that require a token. */
    public User fetchAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new IllegalStateException("No signed-in user on a route that requires one");
        }
        return user;
    }

    public UserResponse getCurrentUser() {
        return UserResponse.from(fetchAuthenticatedUser());
    }

    @Transactional
    public UserResponse updateCurrentUser(UpdateUserRequest request) {
        User user = fetchAuthenticatedUser();
        user.setName(request.name().trim());
        return UserResponse.from(userRepository.save(user));
    }
}
