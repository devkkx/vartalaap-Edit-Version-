package com.prochat.repository;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.prochat.model.Message;

public interface MessageRepository extends JpaRepository<Message, Integer> {
    List<Message> findAllByOrderByIdAsc();
}