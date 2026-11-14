package com.prochat.handler;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.prochat.model.Message;
import com.prochat.model.User;
import com.prochat.repository.MessageRepository;
import com.prochat.repository.UserRepository;
import com.prochat.service.OllamaService;

@Component
public class ChatHandler extends TextWebSocketHandler {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OllamaService ollamaService;

    @Autowired
    private MessageRepository messageRepository;

    private static Set<WebSocketSession> sessions = new HashSet<>();
    private static Map<WebSocketSession, String> userMap = new HashMap<>();

    // username -> session (private chat)
    private static Map<String, WebSocketSession> userSessions = new HashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {

        String payload = message.getPayload();

        // ================== AI MODE ==================
        if (payload.startsWith("AI|")) {

            String[] parts = payload.split("\\|", 3);
            String sender = parts.length > 1 ? parts[1] : "User";
            String question = parts.length > 2 ? parts[2] : "";

            // Save and broadcast user question
            Message userMsg = new Message();
            userMsg.setSender(sender);
            userMsg.setReceiver("ALL");
            userMsg.setContent(question);
            userMsg.setMode("AI");
            userMsg = messageRepository.save(userMsg);
            broadcast("AI|" + sender + "|" + question + "|" + userMsg.getId());

            String aiReply;

            try {
                aiReply = ollamaService.askAI(question);
            } catch (Exception e) {
                aiReply = "VarTalaap AI: I received your request (" + question + "), but could not generate a response. Please try again.";
            }

            // Save AI message
            Message msg = new Message();
            msg.setSender("AI");
            msg.setReceiver("ALL");
            msg.setContent(aiReply);
            msg.setMode("AI");

            msg = messageRepository.save(msg);

            broadcast("AI|AI|" + aiReply + "|" + msg.getId());
            return;
        }

        // ================== JOIN ==================
        if (payload.startsWith("JOIN:")) {

            String username = payload.substring(5);

            User user = userRepository.findByUsername(username);

            if (user != null && user.isBlocked()) {
                session.sendMessage(new TextMessage("BLOCKED"));
                session.close();
                return;
            }

            userMap.put(session, username);
            userSessions.put(username, session);

            broadcast("SYSTEM|🔵 " + username + " joined the chat");
            broadcastUsers();
            return;
        }

        // ================== CHAT ==================
        // FORMAT: mode|sender|receiver|message
        // OR mode|sender|message

        String[] parts = payload.split("\\|", 4);

        if (parts.length < 3)
            return;

        String mode = parts[0];
        String sender = parts[1];

        // ================== PERSONAL ==================
        if (mode.equals("PERSONAL")) {

            if (parts.length < 4)
                return;

            String receiver = parts[2];
            String msgText = parts[3];

            Message msg = new Message();
            msg.setSender(sender);
            msg.setReceiver(receiver);
            msg.setContent(msgText);
            msg.setMode("PERSONAL");

            msg = messageRepository.save(msg);

            String finalMsg = "PERSONAL|" + sender + "|" + receiver + "|" + msgText + "|" + msg.getId();

            sendToUser(sender, finalMsg);
            sendToUser(receiver, finalMsg);

            return;
        }

        // ================== GROUP ==================
        String msgText = parts[2];

        Message msg = new Message();
        msg.setSender(sender);
        msg.setReceiver("ALL");
        msg.setContent(msgText);
        msg.setMode(mode);

        msg = messageRepository.save(msg);

        String finalMsg = mode + "|" + sender + "|" + msgText + "|" + msg.getId();
        broadcast(finalMsg);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {

        String username = userMap.get(session);

        sessions.remove(session);
        userMap.remove(session);

        if (username != null) {
            userSessions.remove(username);

            try {
                broadcast("SYSTEM|🔴 " + username + " left the chat");
                broadcastUsers();
            } catch (Exception ignored) {
            }
        }
    }

    // ================== BROADCAST ==================
    private void broadcast(String msg) throws Exception {
        for (WebSocketSession s : sessions) {
            if (s.isOpen()) {
                s.sendMessage(new TextMessage(msg));
            }
        }
    }

    public static void broadcastStatic(String msg) {
        for (WebSocketSession s : sessions) {
            try {
                if (s.isOpen()) {
                    s.sendMessage(new TextMessage(msg));
                }
            } catch (Exception ignored) {
            }
        }
    }

    // ================== PRIVATE ==================
    private void sendToUser(String username, String msg) throws Exception {

        WebSocketSession s = userSessions.get(username);

        if (s != null && s.isOpen()) {
            s.sendMessage(new TextMessage(msg));
        }
    }

    // ================== USERS ==================
    private void broadcastUsers() throws Exception {

        String users = "USERS:" + String.join(",", userMap.values());

        for (WebSocketSession s : sessions) {
            if (s.isOpen()) {
                s.sendMessage(new TextMessage(users));
            }
        }
    }
}
