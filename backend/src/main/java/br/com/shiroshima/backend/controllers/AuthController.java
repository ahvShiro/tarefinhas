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
import br.com.shiroshima.backend.dtos.TokenResponse;
import br.com.shiroshima.backend.dtos.UserResponse;
import br.com.shiroshima.backend.services.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Sign-in and sign-up put the token in the HttpOnly cookie and answer with the person; sign-out clears the cookie. */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookies authCookies;

    @PostMapping("/sign-in")
    public ResponseEntity<UserResponse> signIn(@Valid @RequestBody SignInRequest request) {
        return signedIn(HttpStatus.OK, authService.signIn(request));
    }

    @PostMapping("/sign-up")
    public ResponseEntity<UserResponse> signUp(@Valid @RequestBody SignUpRequest request) {
        return signedIn(HttpStatus.CREATED, authService.signUp(request));
    }

    @PostMapping("/sign-out")
    public ResponseEntity<Void> signOut() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, authCookies.clearedCookie().toString())
                .build();
    }

    private ResponseEntity<UserResponse> signedIn(HttpStatus status, TokenResponse result) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, authCookies.tokenCookie(result.token()).toString())
                .body(result.user());
    }
}
