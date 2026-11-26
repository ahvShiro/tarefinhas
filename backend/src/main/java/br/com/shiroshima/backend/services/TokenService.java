package br.com.shiroshima.backend.services;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;

import br.com.shiroshima.backend.models.User;

/** Signs and checks the JWT. The token subject is the user's e-mail. */
@Service
public class TokenService {

    @Value("${api.security.token.secret}")
    private String secret;

    @Value("${api.security.token.issuer:tarefinhas-backend}")
    private String issuer;

    @Value("${api.security.token.expiration.hours:24}")
    private int expirationHours;

    public String generateToken(User user) {
        return JWT.create()
                .withIssuer(issuer)
                .withSubject(user.getEmail())
                .withExpiresAt(Instant.now().plus(expirationHours, ChronoUnit.HOURS))
                .sign(Algorithm.HMAC256(secret));
    }

    /** The e-mail in the token, or empty when the token is invalid or expired. */
    public Optional<String> validateToken(String token) {
        try {
            return Optional.of(JWT.require(Algorithm.HMAC256(secret))
                    .withIssuer(issuer)
                    .build()
                    .verify(token)
                    .getSubject());
        } catch (JWTVerificationException exception) {
            return Optional.empty();
        }
    }
}
