package com.prochat.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.prochat.model.Decision;

public interface DecisionRepository extends JpaRepository<Decision, Long> {
    List<Decision> findAllByOrderByIdDesc();
    List<Decision> findByDecisionTextContainingIgnoreCaseOrTopicContainingIgnoreCase(String query, String topicQuery);
}
