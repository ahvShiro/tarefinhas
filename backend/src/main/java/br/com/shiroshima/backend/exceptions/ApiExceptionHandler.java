package br.com.shiroshima.backend.exceptions;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Turns errors into { "errors": { field: message } } (see {@link ApiErrors}). */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Map<String, String>> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> errors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return ApiErrors.of(errors);
    }

    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, Map<String, String>> handleConflict(ConflictException exception) {
        return ApiErrors.of(exception.getField(), exception.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Map<String, String>> handleNotFound(NotFoundException exception) {
        return ApiErrors.of(ApiErrors.FORM, exception.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Map<String, String>> handleBusiness(BusinessException exception) {
        return ApiErrors.of(exception.getField(), exception.getMessage());
    }

    /** Wrong e-mail or password on sign-in. Same message for both, so it does not reveal which accounts exist. */
    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public Map<String, Map<String, String>> handleBadCredentials() {
        return ApiErrors.of(ApiErrors.FORM, "E-mail ou senha incorretos.");
    }
}
