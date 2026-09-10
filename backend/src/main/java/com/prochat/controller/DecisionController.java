package com.prochat.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.prochat.model.Decision;
import com.prochat.repository.DecisionRepository;
import com.prochat.service.OllamaService;

@RestController
@RequestMapping("/decisions")
@CrossOrigin
public class DecisionController {

    @Autowired
    private DecisionRepository decisionRepository;

    @Autowired
    private OllamaService ollamaService;

    @GetMapping
    public List<Decision> getDecisions() {
        return decisionRepository.findAllByOrderByIdDesc();
    }

    @PostMapping
    public Decision saveDecision(@RequestBody Decision decision) {
        return decisionRepository.save(decision);
    }

    @GetMapping("/search")
    public List<Decision> searchDecisions(@RequestParam("q") String query) {
        return decisionRepository.findByDecisionTextContainingIgnoreCaseOrTopicContainingIgnoreCase(query, query);
    }

    @PostMapping("/ask")
    public Map<String, Object> askDecisionMemory(@RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();
        String question = payload.get("question");

        List<Decision> allDecisions = decisionRepository.findAllByOrderByIdDesc();
        StringBuilder contextBuilder = new StringBuilder("Known Decisions Memory:\n");

        for (Decision d : allDecisions) {
            contextBuilder.append("- Topic: ").append(d.getTopic())
                    .append(" | Decision: ").append(d.getDecisionText())
                    .append(" | Decided By: ").append(d.getDecidedBy())
                    .append(" | Date: ").append(d.getTimestamp()).append("\n");
        }

        try {
            String aiAnswer = ollamaService.askAI("Answer the user question based on the following project decisions memory:\n"
                    + contextBuilder.toString() + "\nQuestion: " + question);

            response.put("success", true);
            response.put("answer", aiAnswer);
            response.put("decisions", allDecisions);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }

        return response;
    }
}
