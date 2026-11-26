package br.com.shiroshima.backend.repositories;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.shiroshima.backend.models.MainTask;
import br.com.shiroshima.backend.models.User;

/** Deleted MainTasks are hidden by @SQLRestriction on the entity. */
public interface MainTaskRepository extends JpaRepository<MainTask, UUID> {

    /** Only the user's own MainTask. Someone else's id finds nothing. */
    Optional<MainTask> findByIdAndUser(UUID id, User user);
}
