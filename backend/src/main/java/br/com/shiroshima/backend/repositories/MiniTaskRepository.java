package br.com.shiroshima.backend.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.shiroshima.backend.models.MainTask;
import br.com.shiroshima.backend.models.MiniTask;
import br.com.shiroshima.backend.models.User;

/** Deleted miniTasks are hidden by @SQLRestriction on the entity. */
public interface MiniTaskRepository extends JpaRepository<MiniTask, UUID> {

    /** The user's miniTasks with their MainTask in a single query, grouped by MainTask in step order. */
    @Query("""
            select miniTask from MiniTask miniTask
            join fetch miniTask.mainTask mainTask
            where mainTask.user = :user and mainTask.deletedAt is null
            order by mainTask.createdAt, mainTask.id, miniTask.position
            """)
    List<MiniTask> findAllWithMainTaskByUser(@Param("user") User user);

    /** Only a miniTask of the user's own MainTasks. Someone else's id finds nothing. */
    @Query("""
            select miniTask from MiniTask miniTask
            join fetch miniTask.mainTask mainTask
            where miniTask.id = :id and mainTask.user = :user and mainTask.deletedAt is null
            """)
    Optional<MiniTask> findByIdAndUser(@Param("id") UUID id, @Param("user") User user);

    long countByMainTask(MainTask mainTask);

    /** Highest step position in the MainTask, or 0 without steps. */
    @Query("select coalesce(max(miniTask.position), 0) from MiniTask miniTask where miniTask.mainTask = :mainTask")
    int findMaxPosition(@Param("mainTask") MainTask mainTask);
}
