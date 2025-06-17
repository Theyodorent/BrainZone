
# 📘 Notes de Commandes & Rappels — Projet BrainZone

Ce fichier contient toutes les commandes utiles et rappels pour travailler sur le projet.

---

## 🚀 Commandes Node.js

```bash
npm run dev           # Lancer le serveur Express (server.js)
npm run import      # Importer les questions JSON dans la base MySQL
node database.js    # Exécuter manuellement le script d'import
```

---

## 🧪 Test de l’API (avec Postman)

### 🔐 Connexion
```
POST http://localhost:3000/api/login
Body (JSON):
{
  "username": "ton_nom",
  "password": "ton_mot_de_passe"
}
```

### 📄 Obtenir des questions
```
GET http://localhost:3000/api/questions?theme=films
```

### 💾 Enregistrer un score
```
POST http://localhost:3000/api/score
Body (JSON):
{
  "score": 8
}
```

### 🔓 Déconnexion
```
POST http://localhost:3000/api/logout
```

---

## 🗃️ Structure MySQL (brainzone)

- **categories** (id, name)
- **questions** (id, question_text, category_id)
- **answers** (id, question_id, text, is_correct)
- **users** (id, username, password, score)

---

## 📦 Fichiers importants

- `server.js` → serveur Express
- `database.js` → script d’import de questions depuis JSON
- `films.json`, `jeux.json` → sources des questions

---

## ✅ Rappels

- Toujours lancer `npm run import` après avoir modifié les JSON
- Le front utilise Live Server (`http://localhost:5500`)
- Le back utilise Express (`http://localhost:3000`)
- Le cookie de session est obligatoire pour `/api/profile` et `/api/score`
- `credentials: "include"` est requis dans les appels `fetch()` avec session

---

✍️ Garde ce fichier à jour avec tes propres notes pour ne rien oublier !
