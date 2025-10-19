-- Bufas Cards Database Schema (clean + real images support)
CREATE DATABASE IF NOT EXISTS bufas_cards CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bufas_cards;

-- Drop legacy, optional (uncomment if you want a clean reset)
-- DROP TABLE IF EXISTS card_trades, daily_quiz_answers, daily_quiz_questions, packs, user_cards, cards, fantasy_rush, coin_transactions, players, users;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  coins INT DEFAULT 1000,
  last_daily_quiz DATE NULL,
  daily_quiz_streak INT DEFAULT 0,
  total_cards_opened INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Players
CREATE TABLE IF NOT EXISTS players (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  team VARCHAR(50),
  position1 ENUM('GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST') NOT NULL,
  position2 ENUM('GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST') NULL,
  pace INT NOT NULL,
  shooting INT NOT NULL,
  passing INT NOT NULL,
  defending INT NOT NULL,
  physical INT NOT NULL,
  fifa_rating INT NOT NULL,
  market_value DECIMAL(10,2) DEFAULT 0,
  fantasy_points INT DEFAULT 0,
  image_url VARCHAR(255),
  card_asset_basename VARCHAR(100) NULL,
  eligible_for_quiz TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_position1 (position1),
  INDEX idx_fifa_rating (fifa_rating),
  INDEX idx_fantasy_points (fantasy_points),
  UNIQUE KEY idx_card_asset_basename (card_asset_basename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cards (now with image_path and extended specials)
CREATE TABLE IF NOT EXISTS cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player_id INT NOT NULL,
  rarity ENUM('Bronze','Silver','Gold','Elite','Legend') NOT NULL,
  special_type ENUM(
    'Regular','PLAYER_OF_THE_MONTH','RATING_RELOAD','ASSIST_ENGINE',
    'MARKET_MASTER','COMEBACK_HERO','TEAM_OF_THE_WEEK','OLD_GENERATION'
  ) NOT NULL DEFAULT 'Regular',
  special_month DATE NULL,
  base_price INT DEFAULT 100,
  image_path VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cards_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  INDEX idx_rarity (rarity),
  INDEX idx_special_type (special_type),
  INDEX idx_special_month (special_month),
  INDEX idx_image_path (image_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User cards
CREATE TABLE IF NOT EXISTS user_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  card_id INT NOT NULL,
  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_for_sale TINYINT(1) DEFAULT 0,
  sale_price INT NULL,
  CONSTRAINT fk_uc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_uc_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  INDEX idx_uc_user (user_id),
  INDEX idx_uc_card (card_id),
  INDEX idx_uc_sale (is_for_sale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Packs
CREATE TABLE IF NOT EXISTS packs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('FREE_DAILY','PREMIUM','SPECIAL') DEFAULT 'FREE_DAILY',
  cost INT DEFAULT 0,
  opened TINYINT(1) DEFAULT 0,
  next_free_pack TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP NULL,
  CONSTRAINT fk_packs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_packs_user (user_id),
  INDEX idx_packs_opened (opened),
  INDEX idx_packs_next (next_free_pack)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Daily quiz questions
CREATE TABLE IF NOT EXISTS daily_quiz_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  question_number TINYINT NOT NULL,
  player_id INT NOT NULL,
  stat_name ENUM('pace','shooting','passing','defending','physical','fifa_rating') NOT NULL,
  correct_answer INT NOT NULL,
  option_a INT NOT NULL,
  option_b INT NOT NULL,
  option_c INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dqq_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE KEY unique_daily_question (date, question_number),
  INDEX idx_dqq_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Daily quiz answers
CREATE TABLE IF NOT EXISTS daily_quiz_answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_answer INT NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  coins_earned INT DEFAULT 0,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dqa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dqa_question FOREIGN KEY (question_id) REFERENCES daily_quiz_questions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_question (user_id, question_id),
  INDEX idx_dqa_user_date (user_id, answered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fantasy Rush
CREATE TABLE IF NOT EXISTS fantasy_rush (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  week_start DATE NOT NULL,
  forward_player_id INT NOT NULL,
  midfielder_player_id INT NOT NULL,
  defender_player_id INT NOT NULL,
  total_points INT DEFAULT 0,
  coins_earned INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fr_forward FOREIGN KEY (forward_player_id) REFERENCES players(id),
  CONSTRAINT fk_fr_mid FOREIGN KEY (midfielder_player_id) REFERENCES players(id),
  CONSTRAINT fk_fr_def FOREIGN KEY (defender_player_id) REFERENCES players(id),
  UNIQUE KEY unique_user_week (user_id, week_start),
  INDEX idx_fr_week (week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Card trades
CREATE TABLE IF NOT EXISTS card_trades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  seller_id INT NOT NULL,
  buyer_id INT NULL,
  user_card_id INT NOT NULL,
  price INT NOT NULL,
  status ENUM('ACTIVE','SOLD','CANCELLED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  CONSTRAINT fk_ct_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ct_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ct_uc FOREIGN KEY (user_card_id) REFERENCES user_cards(id) ON DELETE CASCADE,
  INDEX idx_ct_seller (seller_id),
  INDEX idx_ct_status (status),
  INDEX idx_ct_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coin transactions
CREATE TABLE IF NOT EXISTS coin_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  amount INT NOT NULL,
  type ENUM('DAILY_QUIZ','FANTASY_RUSH','PACK_PURCHASE','PACK_SPEEDUP','CARD_SALE','CARD_PURCHASE','INITIAL_BONUS') NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ct_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ct_user (user_id),
  INDEX idx_ct_type (type),
  INDEX idx_ct_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed players (no cards; cards will be synced from /public/cards)
INSERT INTO players (name, team, position1, position2, pace, shooting, passing, defending, physical, fifa_rating, market_value, fantasy_points, image_url, card_asset_basename, eligible_for_quiz) VALUES
('Nico Vehi','FC Bufas','CB','GK',84,81,81,83,85,84,25000.00,120,'/images/players/nico-vehi.jpg','yazawa',1),
('Pablo Vehi','FC Bufas','RB','CM',78,65,85,88,82,81,18000.00,95,'/images/players/pablo-vehi.jpg','elvei',1),
('Albert Rodriguez','FC Bufas','LM','CAM',90,75,88,55,70,83,22000.00,110,'/images/players/albert-rodriguez.jpg','albert',1),
('Marc Sanchez','FC Bufas','CB','CDM',65,45,75,92,88,82,20000.00,85,'/images/players/marc-sanchez.jpg','mister',1),
('Mario Roca','FC Bufas','CM','CAM',75,78,90,65,75,80,16000.00,100,'/images/players/mario-roca.jpg','mario',1),
('Marcos Lopez','FC Bufas','ST','RW',88,90,70,35,85,85,28000.00,135,'/images/players/marcos-lopez.jpg','marcos',1),
('Nico Uriburu','FC Bufas','ST','LW',92,85,75,40,80,84,26000.00,125,'/images/players/nico-uriburu.jpg','nicou',1),
('Javo Ayesta','FC Bufas','CM','CDM',70,68,88,82,78,79,15000.00,90,'/images/players/javo-ayesta.jpg','javo',1),
('Marc Permanyer','FC Bufas','GK',NULL,45,30,65,95,85,78,12000.00,75,'/images/players/marc-permanyer.jpg','perma',1),
('Fan Xu','FC Bufas','CB','RB',68,40,72,90,85,77,14000.00,80,'/images/players/fan-xu.jpg','fan',1);

-- Note: run `node scripts/sync-cards-from-files.mjs` to import cards from /public/cards
