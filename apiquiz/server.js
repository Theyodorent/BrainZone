const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session); // <-- Stockage session sur disque
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'brainzone'
});



const app = express();
const PORT = 3000;

// Autoriser le front à accéder au back
app.use(cors({
  origin: ['http://localhost:5500'],
  credentials: true
}));


app.use(bodyParser.json());

// ✅ Nouvelle config avec session persistante
app.use(session({
  store: new FileStore({ path: './sessions' }), // les sessions sont sauvegardées dans ce dossier
  secret: 'monSecretSuperSecure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 1 jour
  }
}));

// Routes

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Champs requis.' });
  }

  try {
    const [existing] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Utilisateur déjà existant.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
  'INSERT INTO users (username, password) VALUES (?, ?)',
  [username, hashedPassword]
);


    res.json({ message: 'Utilisateur enregistré dans la base de données !' });
  } catch (error) {
    console.error('❌ Erreur MySQL :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});



app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Champs requis.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    req.session.user = user.username;
    res.json({ message: 'Connexion réussie !' });

  } catch (error) {
    console.error('❌ Erreur connexion :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



app.get('/api/questions', async (req, res) => {
  const theme = req.query.theme;
  if (!theme || !['films', 'jeux'].includes(theme)) {
    return res.status(400).json({ error: 'Thème invalide ou manquant.' });
  }

  try {
    const [rows] = await db.query(`
      SELECT q.id, q.question_text, a.text AS answer, a.is_correct
      FROM questions q
      JOIN categories c ON q.category_id = c.id
      JOIN answers a ON a.question_id = q.id
      WHERE c.name = ?
    `, [theme]);

    // Regrouper les réponses par question
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.id]) {         // grouped[row.id] crée une clés pour chaque question
        grouped[row.id] = {
          question: row.question_text,
          answers: [],
          correct: ""
        };
      }
      grouped[row.id].answers.push(row.answer);
      if (row.is_correct) grouped[row.id].correct = row.answer;
    }

    // Prendre 20 questions au hasard
    const shuffled = Object.values(grouped)                      
      .sort(() => Math.random() - 0.5)
      .slice(0, 20);

    res.json(shuffled);         // (shuffled) Envoie les 20 questions aléatoires formatées au frontend
  } catch (err) {
    console.error("❌ Erreur récupération questions :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});


app.get('/api/profile', async (req, res) => {
  const username = req.session.user;
  if (!username) return res.status(401).json({ error: 'Non connecté' });

  try {
    const [userRows] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const [scores] = await db.query(`
      SELECT theme, MAX(score) AS score
      FROM scores
      WHERE user_id = ?
      GROUP BY theme
  `, [user.id]);


    const result = {
      username: username,
      films: null,
      jeux: null
    };

    for (const s of scores) {
    if (s.theme === 'films') result.films = s.score;
    if (s.theme === 'jeux') result.jeux = s.score;
}


    res.json(result);
  } catch (error) {
    console.error('❌ Erreur /api/profile :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



app.post('/api/score', async (req, res) => {
  const username = req.session.user;
  const { score, theme } = req.body;

  if (!username) return res.status(401).json({ error: 'Non connecté' });
  if (!theme || !['films', 'jeux'].includes(theme)) return res.status(400).json({ error: 'Thème invalide' });

  try {
    const [users] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const userId = users[0].id;

    // Enregistrer score avec thème
    await db.query('INSERT INTO scores (user_id, score, theme) VALUES (?, ?, ?)', [userId, score, theme]);

    res.json({ message: 'Score enregistré avec thème !' });
  } catch (error) {
    console.error("Erreur score :", error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



app.get('/api/leaderboard', async (req, res) => {
  const theme = req.query.theme;
  if (!theme || !['films', 'jeux'].includes(theme)) {
    return res.status(400).json({ error: 'Thème invalide' });
  }

  try {
    const [rows] = await db.query(`
      SELECT u.username, s.score AS best_score
      FROM scores s
      JOIN users u ON s.user_id = u.id
      WHERE s.theme = ?
      ORDER BY s.score DESC
      LIMIT 5
    `, [theme]);

    res.json(rows);
  } catch (err) {
    console.error("Erreur leaderboard :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Déconnecté' });
  });
});


app.listen(PORT, () => {
  console.log(`✅ Serveur backend sur http://localhost:${PORT}`);
});
