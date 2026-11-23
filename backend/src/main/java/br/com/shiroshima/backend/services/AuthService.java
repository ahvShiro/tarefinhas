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
import br.com.shiroshima.backend.dtos.TokenResponse;
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

    /** Throws BadCredentialsException (401) on a wrong e-mail or password. */
    public TokenResponse signIn(SignInRequest request) {
        var credentials = new UsernamePasswordAuthenticationToken(normalizeEmail(request.email()), request.password());
        User user = (User) authenticationManager.authenticate(credentials).getPrincipal();
        return new TokenResponse(tokenService.generateToken(user));
    }

    /** Creates the account and signs the person in right away. */
    @Transactional
    public TokenResponse signUp(SignUpRequest request) {
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

        return new TokenResponse(tokenService.generateToken(user));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
