package br.com.shiroshima.backend.services;

import java.time.Instant;
import java.util.Locale;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.shiroshima.backend.dtos.SignInRequest;
import br.com.shiroshima.backend.dtos.SignUpRequest;
import br.com.shiroshima.backend.dtos.UserResponse;
import br.com.shiroshima.backend.exceptions.BusinessException;
import br.com.shiroshima.backend.exceptions.ConflictException;
import br.com.shiroshima.backend.models.User;
import br.com.shiroshima.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    /** The person who came in and the token for the cookie. The token never goes in a response body. */
    public record SignedIn(UserResponse user, String token) {
    }

    /** Throws BadCredentialsException (401) on a wrong e-mail or password. */
    public SignedIn signIn(SignInRequest request) {
        var credentials = new UsernamePasswordAuthenticationToken(normalizeEmail(request.email()), request.password());
        User user = (User) authenticationManager.authenticate(credentials).getPrincipal();
        return signedIn(user);
    }

    /** Creates the account and signs the person in right away. */
    @Transactional
    public SignedIn signUp(SignUpRequest request) {
        if (!request.password().equals(request.passwordConfirmation())) {
            throw new BusinessException("passwordConfirmation",
                    "As senhas não são iguais. Digite a mesma senha nos 2 campos.");
        }
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("email", "Já existe uma conta com este e-mail.");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setCreatedAt(Instant.now());
        userRepository.save(user);

        return signedIn(user);
    }

    private SignedIn signedIn(User user) {
        return new SignedIn(UserResponse.from(user), tokenService.generateToken(user));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
