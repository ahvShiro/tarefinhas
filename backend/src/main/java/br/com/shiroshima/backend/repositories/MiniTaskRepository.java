package br.com.shiroshima.backend.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.shiroshima.backend.models.MiniTask;
import br.com.shiroshima.backend.models.User;

public interface MiniTaskRepository extends JpaRepository<MiniTask, UUID> {

    /** The user's miniTasks with their MainTask in a single query, grouped by MainTask in step order. */
    @Query("""
            select miniTask from MiniTask miniTask
            join fetch miniTask.mainTask mainTask
            where mainTask.user = :user
            order by mainTask.createdAt, mainTask.id, miniTask.position
            """)
    List<MiniTask> findAllWithMainTaskByUser(@Param("user") User user);
}
