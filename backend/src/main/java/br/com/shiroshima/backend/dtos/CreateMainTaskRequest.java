package br.com.shiroshima.backend.dtos;

import java.util.List;

import br.com.shiroshima.backend.models.MainTask;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/** Body of POST /main-tasks. Each form step becomes a MiniTask, in list order. */
public record CreateMainTaskRequest(
        @NotBlank(message = "Informe o nome.")
        String name,

        @NotBlank(message = "Informe a descrição.")
        String description,

        @Min(value = MainTask.MIN_DEADLINE_DAYS, message = "O prazo deve ser vazio ou um número inteiro de 1 a 7.")
        @Max(value = MainTask.MAX_DEADLINE_DAYS, message = "O prazo deve ser vazio ou um número inteiro de 1 a 7.")
        Integer deadlineDays,

        @NotEmpty(message = "Adicione pelo menos 1 passo.")
        List<@NotNull @Valid MiniTaskInput> miniTasks) {

    public record MiniTaskInput(
            @NotBlank(message = "Informe o texto do passo.")
            String text) {
    }
}
