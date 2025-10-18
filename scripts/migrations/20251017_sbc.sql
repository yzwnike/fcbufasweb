-- SBC (Squad Building Challenges)
USE bufas_cards;

CREATE TABLE IF NOT EXISTS sbc_challenges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) UNIQUE NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  requirements JSON NOT NULL, -- {"min_players":2,"max_players":7,"min_avg_rating":85,"min_special_cards":1}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sbc_dates (start_at, end_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sbc_rewards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  challenge_id INT NOT NULL,
  reward_type ENUM('PACK','CARD') NOT NULL,
  pack_type ENUM('FREE_DAILY','PREMIUM','SPECIAL') NULL,
  card_id INT NULL,
  amount INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_sbc_reward_challenge FOREIGN KEY (challenge_id) REFERENCES sbc_challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sbc_submissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  challenge_id INT NOT NULL,
  user_id INT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_challenge (challenge_id, user_id),
  CONSTRAINT fk_sbc_sub_challenge FOREIGN KEY (challenge_id) REFERENCES sbc_challenges(id) ON DELETE CASCADE,
  CONSTRAINT fk_sbc_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sbc_submission_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  submission_id INT NOT NULL,
  user_card_id INT NOT NULL,
  CONSTRAINT fk_sbc_item_submission FOREIGN KEY (submission_id) REFERENCES sbc_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_sbc_item_uc FOREIGN KEY (user_card_id) REFERENCES user_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample monthly challenge
INSERT INTO sbc_challenges (code, title, description, start_at, end_at, requirements)
VALUES (
  'OCT25_STARTER',
  'Desafío Inicial de Octubre',
  'Entrega un equipo de 2-5 cartas con media >= 82 y al menos 1 carta especial.',
  NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY),
  JSON_OBJECT('min_players', 2, 'max_players', 5, 'min_avg_rating', 82, 'min_special_cards', 1)
);

INSERT INTO sbc_rewards (challenge_id, reward_type, pack_type, amount)
SELECT id, 'PACK', 'PREMIUM', 1 FROM sbc_challenges WHERE code = 'OCT25_STARTER';