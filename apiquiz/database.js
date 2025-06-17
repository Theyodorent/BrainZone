// Script Node.js pour importer films.json et jeux.json dans MySQL
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'brainzone',
};

const files = [
  { name: 'films', path: path.join(__dirname, 'data', 'films.json') },
  { name: 'jeux', path: path.join(__dirname, 'data', 'jeux.json') },
];

async function insertCategoryIfNotExists(conn, name) {
  const [rows] = await conn.query('SELECT id FROM categories WHERE name = ?', [name]);
  if (rows.length > 0) return rows[0].id;
  const [result] = await conn.query('INSERT INTO categories (name) VALUES (?)', [name]);
  return result.insertId;
}

async function insertQuestion(conn, question, categoryId) {
  const [result] = await conn.query(
    'INSERT INTO questions (question_text, category_id) VALUES (?, ?)',
    [question.question, categoryId]
  );
  return result.insertId;
}

async function insertAnswers(conn, questionId, answers, correct) {
  for (const answer of answers) {
    const isCorrect = answer === correct;
    await conn.query(
      'INSERT INTO answers (question_id, text, is_correct) VALUES (?, ?, ?)',
      [questionId, answer, isCorrect]
    );
  }
}

async function importQuestions() {
  const conn = await mysql.createConnection(dbConfig);
  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf-8');
    const questions = JSON.parse(content);
    const categoryId = await insertCategoryIfNotExists(conn, file.name);
    for (const q of questions) {
      const questionId = await insertQuestion(conn, q, categoryId);
      await insertAnswers(conn, questionId, q.answers, q.correct);
    }
    console.log(`✅ Import des questions pour "${file.name}" terminé.`);
  }
  await conn.end();
}

importQuestions().catch(console.error);
