package br.com.shiroshima.backend.controllers;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.shiroshima.backend.configs.AuthCookies;
import br.com.shiroshima.backend.dtos.SignInRequest;
import br.com.shiroshima.backend.dtos.SignUpRequest;
import br.com.shiroshima.backend.dtos.UserResponse;
import br.com.shiroshima.backend.services.AuthService;
import br.com.shiroshima.backend.services.AuthService.SignedIn;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** The token goes in an HttpOnly cookie (AuthCookies); the body has only the person's data. */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookies authCookies;

    @PostMapping("/sign-in")
    public ResponseEntity<UserResponse> signIn(@Valid @RequestBody SignInRequest request) {
        return withCookie(HttpStatus.OK, authService.signIn(request));
    }

    @PostMapping("/sign-up")
    public ResponseEntity<UserResponse> signUp(@Valid @RequestBody SignUpRequest request) {
        return withCookie(HttpStatus.CREATED, authService.signUp(request));
    }

    /** Expires the token cookie. Open, so a person with an expired token can also leave. */
    @PostMapping("/sign-out")
    public ResponseEntity<Void> signOut() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, authCookies.clearedCookie().toString())
                .build();
    }

    private ResponseEntity<UserResponse> withCookie(HttpStatus status, SignedIn signedIn) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, authCookies.tokenCookie(signedIn.token()).toString())
                .body(signedIn.user());
    }
}
