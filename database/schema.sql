-- ============================================================
-- AI-based Smart Citizen Service Management System
-- MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS citizen_service_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE citizen_service_system;

-- ------------------------------------------------------------
-- USERS  (citizen | staff | admin)
-- ------------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  mobile VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('citizen', 'staff', 'admin') NOT NULL DEFAULT 'citizen',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SERVICES  (admin-managed, not hard-coded)
-- ------------------------------------------------------------
CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  estimated_duration INT NOT NULL DEFAULT 10, -- minutes, avg service time
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- DOCUMENTS  (required/optional documents per service)
-- ------------------------------------------------------------
CREATE TABLE documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  document_name VARCHAR(160) NOT NULL,
  required TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- UPLOADED DOCUMENTS  (per citizen, per service, per document)
-- ------------------------------------------------------------
CREATE TABLE uploaded_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_id INT NOT NULL,
  document_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE KEY unique_upload (user_id, service_id, document_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- COUNTERS
-- ------------------------------------------------------------
CREATE TABLE counters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  counter_number VARCHAR(20) NOT NULL UNIQUE,
  status ENUM('Active', 'Inactive', 'Serving', 'Available') NOT NULL DEFAULT 'Available',
  active TINYINT(1) NOT NULL DEFAULT 1,
  assigned_staff_id INT DEFAULT NULL,
  service_ids VARCHAR(255) DEFAULT NULL, -- comma-separated service ids this counter handles
  FOREIGN KEY (assigned_staff_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TOKENS  (the queue)
-- ------------------------------------------------------------
CREATE TABLE tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_number VARCHAR(20) NOT NULL,
  user_id INT NOT NULL,
  service_id INT NOT NULL,
  status ENUM('Waiting','Approaching','Called','Serving','Completed','Missed','Expired')
    NOT NULL DEFAULT 'Waiting',
  queue_position INT NOT NULL,
  predicted_wait_time INT NOT NULL, -- minutes, snapshot at generation time
  counter_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  called_at TIMESTAMP NULL DEFAULT NULL,
  serving_started_at TIMESTAMP NULL DEFAULT NULL,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  expired_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SERVICE HISTORY  (feeds the AI model's "historical average")
-- ------------------------------------------------------------
CREATE TABLE service_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_id INT NOT NULL,
  service_id INT NOT NULL,
  service_duration INT NOT NULL,   -- minutes actually taken at the counter
  waiting_duration INT NOT NULL,   -- minutes the citizen actually waited
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_id INT DEFAULT NULL,
  message VARCHAR(500) NOT NULL,
  type ENUM('info','approaching','called','expired','completed') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Helpful indexes
-- ------------------------------------------------------------
CREATE INDEX idx_tokens_status ON tokens(status);
CREATE INDEX idx_tokens_service ON tokens(service_id);
CREATE INDEX idx_uploaded_docs_user ON uploaded_documents(user_id, service_id);
