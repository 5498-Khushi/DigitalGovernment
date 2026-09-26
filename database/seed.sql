-- ============================================================
-- Demo seed data
-- Password for ALL seeded users is: Password123
-- (bcrypt hash below corresponds to that password)
-- ============================================================

USE citizen_service_system;

SET @pw = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8k1WOOjOFcYvIrOWpxxOmYh5ZQE2Wa'; -- Password123

-- Users
INSERT INTO users (name, email, mobile, password_hash, role) VALUES
('Admin User', 'admin@citizenservice.gov', '9999900001', @pw, 'admin'),
('Ravi Kulkarni', 'staff1@citizenservice.gov', '9999900002', @pw, 'staff'),
('Sunita Pawar', 'staff2@citizenservice.gov', '9999900003', @pw, 'staff'),
('Asha Deshmukh', 'asha@example.com', '9999900010', @pw, 'citizen'),
('Vikram Shah', 'vikram@example.com', '9999900011', @pw, 'citizen'),
('Priya Nair', 'priya@example.com', '9999900012', @pw, 'citizen');

-- Services
INSERT INTO services (name, description, estimated_duration, active) VALUES
('Income Certificate', 'Certificate confirming annual household income for eligibility purposes.', 10, 1),
('Birth Certificate', 'Official record of birth registration.', 8, 1),
('Caste Certificate', 'Certificate confirming caste category for reservation benefits.', 12, 1),
('Property Tax Service', 'Assessment, payment and receipts for municipal property tax.', 15, 1),
('Aadhaar-related Service', 'Updates and corrections to Aadhaar enrolment details.', 9, 1),
('Domicile Certificate', 'Certificate confirming permanent residency status.', 11, 1);

-- Documents per service
INSERT INTO documents (service_id, document_name, required) VALUES
(1, 'Identity Proof', 1),
(1, 'Address Proof', 1),
(1, 'Income Proof', 1),
(1, 'Passport-size Photograph', 1),
(1, 'Bank Statement (last 6 months)', 0),

(2, 'Hospital Birth Record', 1),
(2, 'Parents Identity Proof', 1),
(2, 'Address Proof', 1),

(3, 'Identity Proof', 1),
(3, 'Address Proof', 1),
(3, 'Caste Validity Document (if any)', 0),
(3, 'Passport-size Photograph', 1),

(4, 'Property Ownership Document', 1),
(4, 'Previous Tax Receipt', 1),
(4, 'Identity Proof', 1),

(5, 'Existing Aadhaar Copy', 1),
(5, 'Address Proof', 1),
(5, 'Mobile Number Verification', 0),

(6, 'Identity Proof', 1),
(6, 'Address Proof (7+ years residency)', 1),
(6, 'Ration Card', 0);

-- Counters
INSERT INTO counters (counter_number, status, active, assigned_staff_id, service_ids) VALUES
('C-1', 'Active', 1, 2, '1,2,3'),
('C-2', 'Active', 1, 3, '4,5,6'),
('C-3', 'Available', 1, NULL, '1,2,3,4,5,6'),
('C-4', 'Inactive', 0, NULL, NULL);

-- Sample completed tokens + matching history rows (feeds AI "historical average duration").
-- Each pair of statements creates one completed token, then logs its history row
-- against that real token id, so the foreign key stays valid.

INSERT INTO tokens (token_number, user_id, service_id, status, queue_position, predicted_wait_time, completed_at)
VALUES ('A-090', 4, 1, 'Completed', 0, 20, NOW() - INTERVAL 1 DAY);
INSERT INTO service_history (token_id, service_id, service_duration, waiting_duration, completed_at)
VALUES (LAST_INSERT_ID(), 1, 9, 22, NOW() - INTERVAL 1 DAY);

INSERT INTO tokens (token_number, user_id, service_id, status, queue_position, predicted_wait_time, completed_at)
VALUES ('A-091', 5, 1, 'Completed', 0, 18, NOW() - INTERVAL 1 DAY);
INSERT INTO service_history (token_id, service_id, service_duration, waiting_duration, completed_at)
VALUES (LAST_INSERT_ID(), 1, 11, 18, NOW() - INTERVAL 1 DAY);

INSERT INTO tokens (token_number, user_id, service_id, status, queue_position, predicted_wait_time, completed_at)
VALUES ('B-050', 6, 2, 'Completed', 0, 15, NOW() - INTERVAL 2 DAY);
INSERT INTO service_history (token_id, service_id, service_duration, waiting_duration, completed_at)
VALUES (LAST_INSERT_ID(), 2, 7, 15, NOW() - INTERVAL 2 DAY);

INSERT INTO tokens (token_number, user_id, service_id, status, queue_position, predicted_wait_time, completed_at)
VALUES ('C-030', 4, 3, 'Completed', 0, 25, NOW() - INTERVAL 2 DAY);
INSERT INTO service_history (token_id, service_id, service_duration, waiting_duration, completed_at)
VALUES (LAST_INSERT_ID(), 3, 13, 25, NOW() - INTERVAL 2 DAY);

INSERT INTO tokens (token_number, user_id, service_id, status, queue_position, predicted_wait_time, completed_at)
VALUES ('D-012', 5, 4, 'Completed', 0, 30, NOW() - INTERVAL 3 DAY);
INSERT INTO service_history (token_id, service_id, service_duration, waiting_duration, completed_at)
VALUES (LAST_INSERT_ID(), 4, 16, 30, NOW() - INTERVAL 3 DAY);

INSERT INTO tokens (token_number, user_id, service_id, status, queue_position, predicted_wait_time, completed_at)
VALUES ('E-021', 6, 5, 'Completed', 0, 12, NOW() - INTERVAL 3 DAY);
INSERT INTO service_history (token_id, service_id, service_duration, waiting_duration, completed_at)
VALUES (LAST_INSERT_ID(), 5, 8, 12, NOW() - INTERVAL 3 DAY);

INSERT INTO tokens (token_number, user_id, service_id, status, queue_position, predicted_wait_time, completed_at)
VALUES ('F-007', 4, 6, 'Completed', 0, 20, NOW() - INTERVAL 4 DAY);
INSERT INTO service_history (token_id, service_id, service_duration, waiting_duration, completed_at)
VALUES (LAST_INSERT_ID(), 6, 10, 20, NOW() - INTERVAL 4 DAY);

-- A few live sample tokens currently in queue, so the app looks active on first run
INSERT INTO tokens (token_number, user_id, service_id, status, queue_position, predicted_wait_time, counter_id)
VALUES
('A-105', 5, 1, 'Waiting', 3, 24, NULL),
('A-106', 6, 1, 'Waiting', 4, 30, NULL);
