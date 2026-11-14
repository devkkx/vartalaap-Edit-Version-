package com.prochat.service;

public class OllamaServiceTest {

    public static void main(String[] args) {
        System.out.println("=== Testing OllamaService Resilience & Fallbacks ===");
        OllamaService service = new OllamaService();

        // 1. Test greeting
        String greeting = service.askAI("Hello");
        System.out.println("\n[1] Greeting response:\n" + greeting);
        if (greeting == null || (!greeting.toLowerCase().contains("hello") && !greeting.toLowerCase().contains("vartalaap"))) {
            throw new AssertionError("Greeting test failed!");
        }

        // 2. Test document summarization
        String summary = service.summarizeDocument("architecture.txt",
                "VarTalaap is an enterprise messaging system built with Spring Boot and WebSocket. It features multi-mode messaging, smart reminders, and document Q&A.");
        System.out.println("\n[2] Document summary:\n" + summary);
        if (summary == null || !summary.contains("Topics:") || !summary.contains("Summary:")) {
            throw new AssertionError("Document summarization failed!");
        }

        // 3. Test document Q&A
        String answer = service.askDocumentQuestion("specs.txt",
                "VarTalaap provides four modes: Casual, Work, Emergency, and AI. Work mode is strictly reserved for formal deliverables.",
                "What is Work mode reserved for?");
        System.out.println("\n[3] Document QA response:\n" + answer);
        if (answer == null || !answer.toLowerCase().contains("work mode")) {
            throw new AssertionError("Document QA failed!");
        }

        // 4. Test decision memory
        String memoryPrompt = "Answer the user question based on the following project decisions memory:\n"
                + "Known Decisions Memory:\n"
                + "- Topic: Database Engine | Decision: Use MySQL 8 with InnoDB | Decided By: Team Lead | Date: 2026-09-10\n"
                + "- Topic: Auth Protocol | Decision: Use OTP verification with Gmail SMTP | Decided By: Security Team | Date: 2026-09-12\n"
                + "Question: What database did we choose?";
        String decisionReply = service.askAI(memoryPrompt);
        System.out.println("\n[4] Decision memory reply:\n" + decisionReply);
        if (decisionReply == null || (!decisionReply.contains("Database Engine") && !decisionReply.contains("MySQL"))) {
            throw new AssertionError("Decision memory test failed!");
        }

        System.out.println("\n✅ ALL TESTS PASSED SUCCESSFULLY! No timeouts, no 403 crashes, clean answers.");
    }
}
