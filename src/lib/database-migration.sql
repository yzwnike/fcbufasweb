-- Additional tables for SBC (Squad Building Challenges) functionality
-- This file adds tables that were missing from the main schema but are used in the code

-- SBC Challenges
CREATE TABLE IF NOT EXISTS sbc_challenges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  difficulty ENUM('EASY','MEDIUM','HARD','EXPERT') DEFAULT 'MEDIUM',
  requirements JSON,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sbc_active (active),
  INDEX idx_sbc_difficulty (difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SBC Submissions (user completions)
CREATE TABLE IF NOT EXISTS sbc_submissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  challenge_id INT NOT NULL,
  user_id INT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sbc_sub_challenge FOREIGN KEY (challenge_id) REFERENCES sbc_challenges(id) ON DELETE CASCADE,
  CONSTRAINT fk_sbc_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_challenge (user_id, challenge_id),
  INDEX idx_sbc_sub_user (user_id),
  INDEX idx_sbc_sub_challenge (challenge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SBC Submission Items (cards used in submission)
CREATE TABLE IF NOT EXISTS sbc_submission_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  submission_id INT NOT NULL,
  user_card_id INT NOT NULL,
  CONSTRAINT fk_sbc_item_sub FOREIGN KEY (submission_id) REFERENCES sbc_submissions(id) ON DELETE CASCADE,
  INDEX idx_sbc_item_sub (submission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SBC Rewards
CREATE TABLE IF NOT EXISTS sbc_rewards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  challenge_id INT NOT NULL,
  reward_type ENUM('COINS','PACK','CARD') NOT NULL,
  amount INT DEFAULT 1,
  coins INT NULL,
  pack_type ENUM('FREE_DAILY','PREMIUM','SPECIAL') NULL,
  card_id INT NULL,
  CONSTRAINT fk_sbc_reward_challenge FOREIGN KEY (challenge_id) REFERENCES sbc_challenges(id) ON DELETE CASCADE,
  CONSTRAINT fk_sbc_reward_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL,
  INDEX idx_sbc_reward_challenge (challenge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Market sales history for demand analysis
CREATE TABLE IF NOT EXISTS market_sales_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  special_type VARCHAR(50) NOT NULL,
  price INT NOT NULL,
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_market_sales_type (special_type),
  INDEX idx_market_sales_date (sale_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Demand coefficients for dynamic pricing
CREATE TABLE IF NOT EXISTS demand_coefficients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  special_type VARCHAR(50) UNIQUE NOT NULL,
  coefficient DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_demand_type (special_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;