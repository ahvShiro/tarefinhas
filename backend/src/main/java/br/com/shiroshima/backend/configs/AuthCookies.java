package br.com.shiroshima.backend.configs;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

/**
 * The JWT travels in an HttpOnly cookie, so page scripts never see it (an injected script cannot steal it).
 * SameSite=Strict keeps the cookie out of requests started by other sites.
 */
@Component
public class AuthCookies {

    public static final String TOKEN_COOKIE = "tarefinhas_token";

    @Value("${api.security.token.expiration.hours:24}")
    private int expirationHours;

    // True by default. Chrome and Firefox accept Secure cookies on http://localhost.
    @Value("${api.security.cookie.secure:true}")
    private boolean secure;

    /** Cookie that holds the token, valid as long as the token. */
    public ResponseCookie tokenCookie(String token) {
        return base(token).maxAge(Duration.ofHours(expirationHours)).build();
    }

    /** Cookie that replaces the token cookie and expires at once. */
    public ResponseCookie clearedCookie() {
        return base("").maxAge(Duration.ZERO).build();
    }

    /** The token sent by the browser, or null. */
    public String readToken(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, TOKEN_COOKIE);
        if (cookie == null || cookie.getValue().isBlank()) return null;
        return cookie.getValue();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(TOKEN_COOKIE, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/");
    }
}
