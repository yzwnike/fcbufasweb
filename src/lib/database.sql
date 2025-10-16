-- Nike FC Cards Database Schema
CREATE DATABASE IF NOT EXISTS nike_fc_cards CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nike_fc_cards;

-- Tabla de usuarios
CREATE TABLE users (
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
);

-- Tabla de jugadores reales
CREATE TABLE players (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    team VARCHAR(50),
    position1 ENUM('GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST') NOT NULL,
    position2 ENUM('GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST') NULL,
    pace INT NOT NULL CHECK (pace BETWEEN 1 AND 99),
    shooting INT NOT NULL CHECK (shooting BETWEEN 1 AND 99),
    passing INT NOT NULL CHECK (passing BETWEEN 1 AND 99),
    defending INT NOT NULL CHECK (defending BETWEEN 1 AND 99),
    physical INT NOT NULL CHECK (physical BETWEEN 1 AND 99),
    fifa_rating INT NOT NULL CHECK (fifa_rating BETWEEN 1 AND 99),
    market_value DECIMAL(10,2) DEFAULT 0,
    fantasy_points INT DEFAULT 0,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_position1 (position1),
    INDEX idx_fifa_rating (fifa_rating),
    INDEX idx_fantasy_points (fantasy_points)
);

-- Tabla de cartas base
CREATE TABLE cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    rarity ENUM('Bronze', 'Silver', 'Gold', 'Elite', 'Legend') NOT NULL,
    special_type ENUM('Regular', 'PLAYER_OF_THE_MONTH', 'RATING_RELOAD', 'ASSIST_ENGINE', 'MARKET_MASTER', 'COMEBACK_HERO') DEFAULT 'Regular',
    special_month DATE NULL, -- Para cartas especiales mensuales
    base_price INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_rarity (rarity),
    INDEX idx_special_type (special_type),
    INDEX idx_special_month (special_month)
);

-- Tabla de cartas en posesión de usuarios
CREATE TABLE user_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    card_id INT NOT NULL,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_for_sale BOOLEAN DEFAULT FALSE,
    sale_price INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_card_id (card_id),
    INDEX idx_for_sale (is_for_sale)
);

-- Tabla de sobres
CREATE TABLE packs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('FREE_DAILY', 'PREMIUM', 'SPECIAL') DEFAULT 'FREE_DAILY',
    cost INT DEFAULT 0,
    opened BOOLEAN DEFAULT FALSE,
    next_free_pack TIMESTAMP NULL, -- Cuándo estará disponible el próximo sobre gratuito
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_opened (opened),
    INDEX idx_next_free_pack (next_free_pack)
);

-- Tabla de contenido de sobres
CREATE TABLE pack_contents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pack_id INT NOT NULL,
    card_id INT NOT NULL,
    FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Tabla de preguntas del quiz diario
CREATE TABLE daily_quiz_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    question_number TINYINT NOT NULL CHECK (question_number BETWEEN 1 AND 5),
    player_id INT NOT NULL,
    stat_name ENUM('pace', 'shooting', 'passing', 'defending', 'physical', 'fifa_rating') NOT NULL,
    correct_answer INT NOT NULL,
    option_a INT NOT NULL,
    option_b INT NOT NULL,
    option_c INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_question (date, question_number),
    INDEX idx_date (date)
);

-- Tabla de respuestas del quiz diario
CREATE TABLE daily_quiz_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_answer INT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    coins_earned INT DEFAULT 0,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES daily_quiz_questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_question (user_id, question_id),
    INDEX idx_user_date (user_id, answered_at)
);

-- Tabla de Fantasy Rush semanal
CREATE TABLE fantasy_rush (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    week_start DATE NOT NULL,
    forward_player_id INT NOT NULL,
    midfielder_player_id INT NOT NULL,
    defender_player_id INT NOT NULL,
    total_points INT DEFAULT 0,
    coins_earned INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (forward_player_id) REFERENCES players(id),
    FOREIGN KEY (midfielder_player_id) REFERENCES players(id),
    FOREIGN KEY (defender_player_id) REFERENCES players(id),
    UNIQUE KEY unique_user_week (user_id, week_start),
    INDEX idx_week_start (week_start)
);

-- Tabla de intercambios de cartas
CREATE TABLE card_trades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    seller_id INT NOT NULL,
    buyer_id INT NULL,
    user_card_id INT NOT NULL,
    price INT NOT NULL,
    status ENUM('ACTIVE', 'SOLD', 'CANCELLED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_card_id) REFERENCES user_cards(id) ON DELETE CASCADE,
    INDEX idx_seller_id (seller_id),
    INDEX idx_status (status),
    INDEX idx_price (price)
);

-- Tabla de transacciones de monedas
CREATE TABLE coin_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount INT NOT NULL, -- Positivo para ganar, negativo para gastar
    type ENUM('DAILY_QUIZ', 'FANTASY_RUSH', 'PACK_PURCHASE', 'PACK_SPEEDUP', 'CARD_SALE', 'CARD_PURCHASE', 'INITIAL_BONUS') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
);

-- Insertar algunos jugadores de ejemplo
INSERT INTO players (name, team, position1, position2, pace, shooting, passing, defending, physical, fifa_rating, market_value, fantasy_points, image_url) VALUES
('Nico Vehi', 'FC Bufas', 'ST', 'CAM', 85, 88, 82, 45, 78, 84, 25000.00, 120, '/images/players/nico-vehi.jpg'),
('Pablo Vehi', 'FC Bufas', 'RB', 'CM', 78, 65, 85, 88, 82, 81, 18000.00, 95, '/images/players/pablo-vehi.jpg'),
('Albert Rodriguez', 'FC Bufas', 'LM', 'CAM', 90, 75, 88, 55, 70, 83, 22000.00, 110, '/images/players/albert-rodriguez.jpg'),
('Marc Sanchez', 'FC Bufas', 'CB', 'CDM', 65, 45, 75, 92, 88, 82, 20000.00, 85, '/images/players/marc-sanchez.jpg'),
('Mario Roca', 'FC Bufas', 'CM', 'CAM', 75, 78, 90, 65, 75, 80, 16000.00, 100, '/images/players/mario-roca.jpg'),
('Marcos Lopez', 'FC Bufas', 'ST', 'RW', 88, 90, 70, 35, 85, 85, 28000.00, 135, '/images/players/marcos-lopez.jpg'),
('Nico Uriburu', 'FC Bufas', 'ST', 'LW', 92, 85, 75, 40, 80, 84, 26000.00, 125, '/images/players/nico-uriburu.jpg'),
('Javo Ayesta', 'FC Bufas', 'CM', 'CDM', 70, 68, 88, 82, 78, 79, 15000.00, 90, '/images/players/javo-ayesta.jpg'),
('Marc Permanyer', 'FC Bufas', 'GK', NULL, 45, 30, 65, 95, 85, 78, 12000.00, 75, '/images/players/marc-permanyer.jpg'),
('Fan Xu', 'FC Bufas', 'CB', 'RB', 68, 40, 72, 90, 85, 77, 14000.00, 80, '/images/players/fan-xu.jpg');

-- Crear cartas para cada jugador con diferentes rarezas
INSERT INTO cards (player_id, rarity, special_type, base_price) 
SELECT 
    id as player_id,
    CASE 
        WHEN fifa_rating >= 85 THEN 'Elite'
        WHEN fifa_rating >= 82 THEN 'Gold' 
        WHEN fifa_rating >= 78 THEN 'Silver'
        ELSE 'Bronze'
    END as rarity,
    'Regular' as special_type,
    CASE 
        WHEN fifa_rating >= 85 THEN 1000
        WHEN fifa_rating >= 82 THEN 500
        WHEN fifa_rating >= 78 THEN 200
        ELSE 100
    END as base_price
FROM players;

-- Crear algunas cartas especiales mensuales
INSERT INTO cards (player_id, rarity, special_type, special_month, base_price) VALUES
(1, 'Legend', 'PLAYER_OF_THE_MONTH', '2025-01-01', 2000),
(6, 'Elite', 'RATING_RELOAD', '2025-01-01', 1500),
(3, 'Gold', 'ASSIST_ENGINE', '2025-01-01', 800),
(2, 'Gold', 'MARKET_MASTER', '2025-01-01', 800),
(7, 'Elite', 'COMEBACK_HERO', '2025-01-01', 1500);