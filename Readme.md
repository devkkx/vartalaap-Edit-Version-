# 🚀 Vartalaap (वार्तालाप) — Intelligent Real-Time Collaborative Platform

[![Java 21](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-2.7.18-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-blue.svg)](https://spring.io/guides/gs/messaging-stomp-websocket/)
[![MySQL 8.0](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 1. Project Gist & Vision

**Vartalaap** is a next-generation real-time collaborative communication platform engineered with **Java Spring Boot**, **STOMP WebSockets**, **MySQL**, and a responsive **HTML5/CSS3/JavaScript** frontend. 

Unlike conventional messaging tools (like WhatsApp or Telegram) that treat conversation purely as raw text exchanges, **Vartalaap bridges the gap between instant messaging and intelligent productivity workflows**. It transforms raw chat streams into structured team artifacts—extracting action items, scheduling context-aware reminders, recording consensus decision memory logs, and providing document intelligence Q&A—without requiring users to leave the active conversation stream.

---

## ⚡ 2. WebSocket Architecture & Deep-Dive

### Why WebSockets?
Traditional HTTP/REST APIs operate on a unidirectional request-response model: the client must continuously poll the server to detect new incoming messages. 

**WebSockets** establish a single, full-duplex TCP socket connection between client and server following an initial HTTP handshake. Over this persistent socket channel, frame-based protocols (like STOMP) allow both client and server to stream data bi-directionally with sub-millisecond overhead.

```
+------------------+  HTTP Handshake (Upgrade: websocket)  +--------------------+
|                  | ------------------------------------> |                    |
|  Client Web App  | <------------------------------------ |  Spring Boot       |
|  (Browser JS)    |       Full-Duplex TCP Socket Channel  |  WebSocket / STOMP |
|                  | <===================================> |  Server (8081)     |
+------------------+  Sub-5ms Real-Time Push Transmission  +--------------------+
```

### 🟢 Advantages of WebSockets
1. **Ultra-Low Latency Messaging (< 5ms)**: Eliminates polling delays. Messages, typing indicators, live edits, deletions, and user presence updates are broadcast instantaneously.
2. **Minimal Network Overhead**: HTTP requests require 500–1000 bytes of headers per request. WebSocket data frames require only **2 to 10 bytes** of framing overhead per packet after connection setup.
3. **Bi-Directional Server Push**: The backend server can proactively push event triggers (e.g., OTP validation responses, automated task creations, live reminders) directly to clients without client-side requests.
4. **Stateful Connection & Live Presence Tracking**: Server tracks active sessions, connection drops, and online/offline status effortlessly across connected clients.

### 🔴 Disadvantages of WebSockets
1. **Connection Memory & Scalability Overhead**: Keeping thousands of concurrent open TCP sockets consumes server RAM and OS file descriptors. Horizontal scaling requires central pub/sub brokers (e.g., Redis Pub/Sub or RabbitMQ).
2. **Reconnection & State Recovery Complexity**: Network drops on mobile devices terminate the socket. Re-establishing connection requires manual fallback buffers, message acknowledgement queues, and missed message sync algorithms.
3. **Proxy & Firewall Interference**: Corporate firewalls, strict NATs, or misconfigured load balancers (e.g., NGINX without `Upgrade` header mapping) can close idle TCP connections unless heartbeat ping/pong signals are maintained.
4. **Lack of Native Caching**: REST endpoints leverage browser caches, CDNs, and proxy caching. WebSocket streams are stateful events and cannot be cached out-of-the-box by intermediary networks.

---

## ✨ 3. Key Implemented Modules & Features

### ✉️ Real-Time Email OTP Registration Verification
* Integrated **Spring Mail (Gmail SMTP)** authentication flow (`/auth/send-otp`, `/auth/verify-otp`).
* Users must verify their Gmail address via a 6-digit OTP before password input fields are unlocked.
* Enforces password length validation (6 to 32 characters) with confirm password matching.

### ✏️ Real-Time 3-Dots Message Menu (`⋮`) (Edit & Delete)
* Each message bubble displays a **3-dots action menu (`⋮`)** for the sender.
* **✏️ Edit Message**: Updates message content in MySQL (`PUT /messages/{id}`), marks `edited = true`, and broadcasts an `EDIT|id|newContent` WebSocket event to all clients in real-time.
* **🗑️ Delete Message**: Removes message from MySQL (`DELETE /messages/{id}`) and broadcasts a `DELETE|id` WebSocket event, instantly removing the bubble across all connected screens.

### 🧠 Conversational Decision Memory Index (`🧠 Decision Memory`)
* Automatically extracts and indexes key consensus decisions made during team chat conversations (e.g., *"We decided to adopt MySQL 8.0 for backend storage"*).
* Allows natural-language queries (e.g., *"What database did we decide to use?"*) and returns exact historical choices instantly without manual scrolling.

### 📋 Automated In-Chat Task Tracker (`📋 Task Tracker`)
* Transforms chat text into structured task cards with assigned team members, descriptions, and deadlines directly inside the drawer.
* Integrates task tracking directly into the real-time chat lifecycle without forcing teams to switch contexts to external tools like Jira or Trello.

### 🔔 Context-Aware Scheduled Reminders (`🔔 Scheduled Reminders`)
* Schedules time-triggered alerts tied to specific users and deliverables directly from chat threads.
* Combines temporal execution directly with team communication, ensuring deadlines discussed in chat are automatically tracked and notified.

### 📄 In-Stream Document Intelligence & Q&A (`📄 Document Q&A`)
* Allows users to upload documents (PDFs, text files, code snippets) directly inside chat threads and query AI for contextual summaries and precise answers right in the modal.

---

## 🔮 4. Future Next-Gen Modules (Roadmap)

The following advanced modules are designed for future implementation to further elevate Vartalaap beyond existing market solutions:

### 1. ⚠️ AI Conflict & Architectural Misalignment Detector
* **Concept**: A real-time sentiment and technical logic engine that monitors multi-channel discussions across team streams to detect conflicting agreements (e.g., Frontend team agreeing on *REST* while Backend team agrees on *GraphQL* in a parallel channel).
* **Innovation**: Proactively alerts project leads with a *"Discrepancy Alert"* before code implementation begins, preventing costly architectural refactors.

### 2. 🛡️ Zero-Knowledge Client-Side Redaction Engine
* **Concept**: Client-side cryptography engine that automatically detects and masks sensitive data—such as API keys, database passwords, credit cards, and PII—*before* the message frame leaves the browser over WebSocket.
* **Innovation**: Enables role-based cryptographic unmasking where only authorized team roles can decrypt sensitive inline secrets.

### 3. 🌐 Live Speech-to-Speech Subtitle Overlay & Professional Tone Normalizer
* **Concept**: Real-time voice note and audio stream translator that transcribes spoken audio into dual-language subtitles while automatically applying a "Professional Tone Transformer" to smooth over heated or ambiguous phrasing.
* **Innovation**: Eliminates cross-cultural miscommunication and emotional escalation in high-stakes global team collaboration.

### 4. 📊 Predictive Thread Summarizer & Decision Tree Visualizer
* **Concept**: An offline-catchup AI engine that analyzes unread chat threads containing hundreds of messages and synthesizes them into an interactive visual decision tree and a 30-second bulleted action briefing customized to the user's specific role.
* **Innovation**: Eliminates notification fatigue and saves hours spent reading long, unstructured chat histories.

---

## 🛠️ 5. Technology Stack & Directory Structure

### Tech Stack
* **Language**: Java 21
* **Framework**: Spring Boot 2.7.18
* **Messaging & Sockets**: Spring WebSocket, STOMP Protocol, SockJS
* **Database**: MySQL 8.0 (Spring Data JPA / Hibernate)
* **Mail & OTP**: Spring Boot Starter Mail (SMTP)
* **AI Engine Integration**: Ollama AI Local Service Interface
* **Frontend**: HTML5, CSS3, JavaScript (ES6+), FontAwesome / Cursive Styling

### Directory Structure
```text
VARTALAAP-main/
├── README.md
└── backend/
    ├── pom.xml
    ├── README.md
    └── src/
        └── main/
            ├── java/com/prochat/
            │   ├── ProChatApplication.java         # Spring Boot Entry Point
            │   ├── config/
            │   │   ├── WebConfig.java             # CORS Configuration
            │   │   └── WebSocketConfig.java       # STOMP Sockets Config
            │   ├── controller/
            │   │   ├── AuthController.java        # Authentication & OTP API
            │   │   ├── MessageController.java     # REST API for Messages (Edit/Delete)
            │   │   ├── FileController.java        # Document & Image Uploads
            │   │   ├── TaskController.java        # Task Management API
            │   │   ├── ReminderController.java    # Reminders API
            │   │   └── DecisionController.java    # Decision Memory API
            │   ├── handler/
            │   │   └── ChatHandler.java           # WebSocket Broadcast Handler
            │   ├── model/                          # JPA Entities (User, Message, etc.)
            │   ├── repository/                     # Spring Data Repositories
            │   └── service/                        # Business Logic (OtpService, etc.)
            └── resources/
                ├── application.properties         # Database & SMTP Configuration
                └── static/                        # Frontend Single-Page Application
                    ├── index.html                 # Main Chat UI & Drawer Modals
                    ├── login.html                 # User Login View
                    ├── register.html              # Registration & OTP View
                    ├── chat.js                    # STOMP WebSocket Client Logic
                    ├── style.css                  # Responsive UI Styling
                    ├── loginpic.png               # Brand Header Assets
                    └── vlogo.jpeg                 # Logo Icon
```

---

## 🚀 6. Getting Started & Setup Guide

### Prerequisites
1. **JDK 21** installed and configured on system `PATH`.
2. **Apache Maven 3.8+**.
3. **MySQL 8.0 Server** running locally on port `3306`.

### Database & Application Configuration
Update `backend/src/main/resources/application.properties` with your MySQL credentials and Gmail SMTP settings:

```properties
server.port=8081

# MySQL Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/prochat?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# SMTP Mail Settings for OTP
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=YOUR_GMAIL_ADDRESS
spring.mail.password=YOUR_GMAIL_APP_PASSWORD
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

### Build & Run
Navigate to the `backend` directory and execute:

```bash
# 1. Compile and Package
mvn clean package -DskipTests

# 2. Run Application
java -jar target/prochat-1.0.jar
```

The application will start on **http://localhost:8081**.

---

## 📄 7. License

This project is licensed under the **MIT License**.
Made with ❤️ by **devkkx**.
