const questionElement = document.getElementById("question");
const answersContainer = document.getElementById("answers");
const nextButton = document.getElementById("next-btn");

let questions = [];
let currentQuestionIndex = 0;
let score = 0;

const params = new URLSearchParams(window.location.search);
const theme = params.get("theme");

fetch(`http://localhost:3000/api/questions?theme=${theme}`, {
  credentials: "include",
})
  .then((response) => response.json())
  .then((data) => {
    questions = data;
    showQuestion();
  })
  .catch((error) => {
    questionElement.textContent = "Erreur de chargement des questions.";
    console.error(error);
  });

function showQuestion() {
  resetState();

  let currentQuestion = questions[currentQuestionIndex];
  questionElement.textContent = currentQuestion.question;

  currentQuestion.answers.forEach((answer) => {
    const button = document.createElement("button");
    button.textContent = answer;
    button.classList.add("answer-btn");
    button.addEventListener("click", selectAnswer);
    answersContainer.appendChild(button);
  });
}

function resetState() {
  nextButton.style.display = "none";
  answersContainer.innerHTML = "";
}

function selectAnswer(event) {
  const selectedAnswer = event.target.textContent;
  const correctAnswer = questions[currentQuestionIndex].correct;

   //J’affiche la bonne réponse en vert même si l’utilisateur s’est trompé. 
   // Je désactive aussi tous les boutons pour éviter plusieurs clics, 
   // et je montre ensuite le bouton suivant.

  Array.from(answersContainer.children).forEach(button => {
    button.disabled = true; //   J'empêche de recliquer après une réponse

    //  bonne réponse → vert meme si l'utilisateur c'est trompe
    if (button.textContent === correctAnswer) {
      button.style.backgroundColor = "#22c55e";
    }

    //  Si c'est le bouton cliqué ET c'était une mauvaise réponse → rouge
    else if (button === event.target && selectedAnswer !== correctAnswer) {
      button.style.backgroundColor = "#ef4444";
    }
  });

  if (selectedAnswer === correctAnswer) {
    score++;
  }

  nextButton.style.display = "block";
}


function showNextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion();
  } else {
    showScore();
  }
}

function showScore() {
  resetState();
  questionElement.textContent = `Bravo ! Ton score est ${score} / ${questions.length}`;

  fetch("http://localhost:3000/api/score", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ score, theme }) 
});



  const backButton = document.createElement("button");
  backButton.textContent = "Retour au menu";
  backButton.classList.add("next-btn");
  backButton.onclick = () => {
    window.location.href = "choix.html";
  };
  answersContainer.appendChild(backButton);
  console.log('azeee')
}

nextButton.addEventListener("click", showNextQuestion);
