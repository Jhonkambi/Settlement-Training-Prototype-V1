/* Constants */
const DIFFICULTY_TIMES = {
  easy: 120,
  medium: 60,
  hard: 30,
  insane: 15,
  peaceful: null
};

const DEBOUNCE_DELAY = 300;

/* State and variables */
let questions = [];
let filteredQuestions = [];
let categories = [];

let currentIndex = 0;
let correctAnswers = 0;
let timedOutCount = 0;
let answeredCount = 0;

let chosenDifficulty = 'easy';
let chosenCategory = 'All Categories';
let chosenNumQueries = 10;

let userResponses = [];
let startTime;
let totalTimeTaken = 0;

/* Timer encapsulation */
class QuizTimer {
  constructor(durationSec, onTick, onTimeout) {
    this.duration = durationSec;
    this.onTick = onTick;
    this.onTimeout = onTimeout;
    this.timeLeft = durationSec;
    this.intervalId = null;
  }

  start() {
    if (this.duration === null) {
      // No timer for peaceful mode
      this.timeLeft = null;
      this.onTick(null);
      return;
    }
    this.stop();
    this.timeLeft = this.duration;
    this.onTick(this.timeLeft);

    this.intervalId = setInterval(() => {
      this.timeLeft--;
      this.onTick(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.stop();
        this.onTimeout();
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

let quizTimer = null;

/* Utility: debounce */
function debounce(func, delay) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => func.apply(this, args), delay);
  }
}

/* Load questions on page load */
loadQuestionsFromStorage();
initCategories();
populateQuizStartCategories();

// Attach event listeners instead of inline onclick
document.getElementById('popupCancelBtn').addEventListener('click', () => {
  closeQuizStartPopup();
});

document.getElementById('quizStartOverlay').addEventListener('click', () => {
  closeQuizStartPopup();
});

document.getElementById('popupStartBtn').addEventListener('click', () => {
  startQuizWithSelectedOptions();
});

// For the header "Configure Quiz" button
document.querySelector('button[onclick="openQuizStartPopup()"]').addEventListener('click', openQuizStartPopup);

function initCategories() {
  const catSet = new Set();
  questions.forEach(q => {
    if (q.category && q.category.trim() !== '') {
      catSet.add(q.category.trim());
    }
  });
  categories = Array.from(catSet).sort();
  if (categories.length === 0) {
    categories.push('Uncategorized');
  }
}

function populateQuizStartCategories() {
  const select = document.getElementById('popupCategorySelect');
  select.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = 'All Categories';
  allOption.textContent = 'All Categories';
  select.appendChild(allOption);
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
  select.value = 'All Categories';
}

// Format datetime to YYYY-MM-DD HH:mm (24hr)
function formatDateTimeMilitary(dtString) {
  const dt = new Date(dtString);
  if (isNaN(dt)) return dtString; // Fallback if invalid date
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function openQuizStartPopup() {
  populateQuizStartCategories();
  document.getElementById('popupDifficultySelect').value = chosenDifficulty;
  document.getElementById('popupQueryCountSelect').value = chosenNumQueries.toString();

  document.getElementById('quizStartOverlay').style.display = 'block';
  document.getElementById('quizStartPopup').style.display = 'block';
}

function closeQuizStartPopup() {
  document.getElementById('quizStartOverlay').style.display = 'none';
  document.getElementById('quizStartPopup').style.display = 'none';
}

function startQuizWithSelectedOptions() {
  const categorySelect = document.getElementById('popupCategorySelect');
  const difficultySelect = document.getElementById('popupDifficultySelect');
  const queryCountSelect = document.getElementById('popupQueryCountSelect');

  const selectedCategory = categorySelect.value;
  const selectedDifficulty = difficultySelect.value;
  const selectedQueryCount = parseInt(queryCountSelect.value, 10);

  if (!selectedCategory) {
    alert('Please select a category.');
    return;
  }
  if (!selectedDifficulty) {
    alert('Please select a difficulty.');
    return;
  }
  if (!selectedQueryCount || selectedQueryCount <= 0) {
    alert('Please select a valid number of queries.');
    return;
  }

  chosenCategory = selectedCategory;
  chosenDifficulty = selectedDifficulty;
  chosenNumQueries = selectedQueryCount;

  closeQuizStartPopup();

  if (chosenCategory === 'All Categories') {
    filteredQuestions = questions.slice();
  } else {
    filteredQuestions = questions.filter(q => q.category === chosenCategory);
  }

  if (filteredQuestions.length === 0) {
    alert('No queries available for the selected category.');
    return;
  }

  if (filteredQuestions.length > chosenNumQueries) {
    filteredQuestions = filteredQuestions.slice(0, chosenNumQueries);
  }

  currentIndex = 0;
  correctAnswers = 0;
  timedOutCount = 0;
  answeredCount = 0;
  userResponses = [];
  startTime = new Date();

  document.getElementById('quizArea').style.display = 'block';
  document.getElementById('summary').style.display = 'none';

  showNextQuestion();
}

function loadQuestionsFromStorage() {
  const saved = localStorage.getItem('settlementQueries');
  if (saved) {
    questions = JSON.parse(saved);
  }
}

function showNextQuestion() {
  // Stop previous timer if any
  if (quizTimer) {
    quizTimer.stop();
  }

  if (currentIndex >= filteredQuestions.length) {
    showSummary();
    return;
  }

  const q = filteredQuestions[currentIndex];

  quizTimer = new QuizTimer(DIFFICULTY_TIMES[chosenDifficulty],
    (timeLeft) => {
      if (timeLeft === null) {
        document.getElementById('timer').textContent = '';
      } else {
        document.getElementById('timer').textContent = 'Time Left: ' + timeLeft + ' sec';
      }
    },
    () => {
      timedOutCount++;
      answeredCount++;
      userResponses.push({ question: q.question, correctAnswer: q.correctAnswer, userAnswer: null, timedOut: true });
      currentIndex++;
      setTimeout(() => {
        if (currentIndex < filteredQuestions.length) {
          showNextQuestion();
        } else {
          showSummary();
        }
      }, 0);
    }
  );

  quizTimer.start();

  document.getElementById('questionDate').textContent = formatDateTimeMilitary(q.datetime);
  document.getElementById('quizQuestion').textContent = q.question;
  document.getElementById('questionDescription').textContent = q.description || '';
  document.getElementById('feedback').textContent = '';
  updateProgressBar();

  const quizInputArea = document.getElementById('quizInputArea');
  quizInputArea.innerHTML = '';

  const inputControlsDiv = document.createElement('div');
  inputControlsDiv.id = 'quizInputControls';

  const submitAndSideDescDiv = document.createElement('div');
  submitAndSideDescDiv.id = 'submitAndSideDescContainer';

  const sideDescDiv = document.createElement('div');
  sideDescDiv.id = 'questionSideDescription';

  if (q.sideDescription && q.sideDescription.trim() !== '') {
    sideDescDiv.style.display = 'block';
    sideDescDiv.textContent = q.sideDescription.trim();
  } else {
    sideDescDiv.style.display = 'none';
    sideDescDiv.textContent = '';
  }

  if (q.type === 'open') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'answerInput';
    input.placeholder = 'Your answer...';

    // Enable submit only when user types, debounced for performance
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Save';
    submitBtn.disabled = true;
    submitBtn.classList.add('save-button');
    submitBtn.onclick = checkAnswer;

    const debouncedEnableSubmit = debounce(() => {
      submitBtn.disabled = input.value.trim() === '';
    }, DEBOUNCE_DELAY);

    input.addEventListener('input', debouncedEnableSubmit);

    // Add Enter key handling to submit answer
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !submitBtn.disabled) {
        event.preventDefault();
        submitBtn.click(); // Trigger the click event on the Save button
      }
    });

    inputControlsDiv.appendChild(input);
    submitAndSideDescDiv.appendChild(submitBtn);
    submitAndSideDescDiv.appendChild(sideDescDiv);
    inputControlsDiv.appendChild(submitAndSideDescDiv);
  } else if (q.type === 'yesno') {
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Save';
    submitBtn.disabled = true;
    submitBtn.classList.add('save-button');
    submitBtn.onclick = checkAnswer;

    ['Yes', 'No', 'Void'].forEach(opt => {
      const label = document.createElement('label');
      label.className = 'checkbox-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'yesnoAnswer';
      checkbox.value = opt;
      checkbox.addEventListener('change', (event) => {
        if (event.target.checked) {
          const others = Array.from(document.getElementsByName('yesnoAnswer'));
          others.forEach(cb => {
            if (cb !== event.target) cb.checked = false;
          });
          // Enable submit button when one is checked
          submitBtn.disabled = false;
        } else {
          // If no checkboxes are checked, disable submit
          const anyChecked = Array.from(document.getElementsByName('yesnoAnswer')).some(cb => cb.checked);
          submitBtn.disabled = !anyChecked;
        }
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(opt));
      inputControlsDiv.appendChild(label);
    });

    // Add keydown listener on the inputControlsDiv so that Enter anywhere triggers save if enabled
    inputControlsDiv.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !submitBtn.disabled) {
        event.preventDefault();
        submitBtn.click();
      }
    });

    submitAndSideDescDiv.appendChild(submitBtn);
    submitAndSideDescDiv.appendChild(sideDescDiv);
    inputControlsDiv.appendChild(submitAndSideDescDiv);
  } else if (q.type === 'multiple') {
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Save';
    submitBtn.disabled = true;
    submitBtn.classList.add('save-button');
    submitBtn.onclick = checkAnswer;

    q.options.forEach(opt => {
      const label = document.createElement('label');
      label.className = 'checkbox-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'multipleAnswer';
      checkbox.value = opt;
      checkbox.addEventListener('change', (event) => {
        if (event.target.checked) {
          const others = Array.from(document.getElementsByName('multipleAnswer'));
          others.forEach(cb => {
            if (cb !== event.target) cb.checked = false;
          });
          // Enable submit button when one is checked
          submitBtn.disabled = false;
        } else {
          // If no checkboxes are checked, disable submit
          const anyChecked = Array.from(document.getElementsByName('multipleAnswer')).some(cb => cb.checked);
          submitBtn.disabled = !anyChecked;
        }
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(opt));
      inputControlsDiv.appendChild(label);
    });

    // Add keydown listener on the inputControlsDiv so Enter triggers save when enabled
    inputControlsDiv.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !submitBtn.disabled) {
        event.preventDefault();
        submitBtn.click();
      }
    });

    submitAndSideDescDiv.appendChild(submitBtn);
    submitAndSideDescDiv.appendChild(sideDescDiv);
    inputControlsDiv.appendChild(submitAndSideDescDiv);
  }

  quizInputArea.appendChild(inputControlsDiv);
}

function checkAnswer() {
  quizTimer.stop();
  const q = filteredQuestions[currentIndex];
  let userAnswer = null;

  if (q.type === 'open') {
    userAnswer = document.getElementById('answerInput').value.trim();
  } else if (q.type === 'yesno') {
    const checkboxes = Array.from(document.getElementsByName('yesnoAnswer'));
    for (let cb of checkboxes) {
      if (cb.checked) {
        userAnswer = cb.value;
        break;
      }
    }
  } else if (q.type === 'multiple') {
    const checkboxes = Array.from(document.getElementsByName('multipleAnswer'));
    for (let cb of checkboxes) {
      if (cb.checked) {
        userAnswer = cb.value;
        break;
      }
    }
  }

  if (userAnswer === null || userAnswer === '') {
    alert('Please select or enter an answer before submitting.');

    // Restart timer if not peaceful mode
    if (DIFFICULTY_TIMES[chosenDifficulty] !== null) {
      quizTimer.start();
    }
    return;
  }

  const isCorrect = (userAnswer.toLowerCase() === q.correctAnswer.toLowerCase());

  if (isCorrect) {
    correctAnswers++;
  }
  answeredCount++;

  userResponses.push({ question: q.question, correctAnswer: q.correctAnswer, userAnswer: userAnswer, timedOut: false });

  currentIndex++;
  setTimeout(() => {
    if (currentIndex < filteredQuestions.length) {
      showNextQuestion();
    } else {
      showSummary();
    }
  }, 200);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`;
}

function showSummary() {
  document.getElementById('quizArea').style.display = 'none';
  const summaryDiv = document.getElementById('summary');
  summaryDiv.style.display = 'block';

  totalTimeTaken = (new Date() - startTime) / 1000; // seconds as float
  const averageTimePerQuestion = answeredCount > 0 ? (totalTimeTaken / answeredCount) : 0;
  const percentageCorrect = (correctAnswers / answeredCount * 100).toFixed(2);

  let html = `<h3>Quiz Summary</h3>`;
  html += `<p>Total Queries: ${filteredQuestions.length}</p>`;
  html += `<p>Answered: ${answeredCount}</p>`;
  html += `<p>Correct Answers: ${correctAnswers}</p>`;
  html += `<p>Timed Out: ${timedOutCount}</p>`;
  html += `<p>Total Time Taken: ${formatTime(totalTimeTaken)}</p>`;
  html += `<p>Average Time per Question: ${formatTime(averageTimePerQuestion)}</p>`;
  html += `<p>Percentage Correct: ${percentageCorrect}%</p>`;

  const incorrects = userResponses.filter(r => !r.timedOut && (!r.userAnswer || r.userAnswer.toLowerCase() !== r.correctAnswer.toLowerCase()));
  if (incorrects.length > 0) {
    html += `<div id="incorrectList"><h4>Incorrect Answers:</h4>`;
    incorrects.forEach(inc => {
      html += `<div class="incorrect-item">
        <div class="incorrect-question">${inc.question}</div>
        <div>Your Answer: <span class="incorrect-user-answer">${inc.userAnswer || 'No answer'}</span></div>
        <div>Correct Answer: <span class="incorrect-correct-answer">${inc.correctAnswer}</span></div>
      </div>`;
    });
    html += `</div>`;
  }

  const timedOuts = userResponses.filter(r => r.timedOut);
  if (timedOuts.length > 0) {
    html += `<div id="timedOutList"><h4>Timed Out Questions:</h4>`;
    timedOuts.forEach(toq => {
      html += `<div class="incorrect-item">
        <div class="incorrect-question timedout-question">${toq.question}</div>
        <div><em>You did not answer this query in time.</em></div>
        <div>Correct Answer: <span class="incorrect-correct-answer">${toq.correctAnswer}</span></div>
      </div>`;
    });
    html += `</div>`;
  }

  if (userResponses.length > 0) {
    html += `<button id="exportExcelBtn" style="margin-top:15px;">Export All Answers to Excel</button>`;
  }

  summaryDiv.innerHTML = html;

  const btn = document.getElementById('exportExcelBtn');
  if (btn) {
    btn.addEventListener('click', exportAnswersExcel);
  }
}

function exportAnswersExcel() {
  if (userResponses.length === 0) {
    alert("No answers to export.");
    return;
  }
  const ws_data = [
    ["Question", "Your Answer", "Correct Answer", "Status"]
  ];
  userResponses.forEach(item => {
    const isCorrect = !item.timedOut && item.userAnswer && item.userAnswer.toLowerCase() === item.correctAnswer.toLowerCase();
    const statusText = item.timedOut ? "Timed Out" : (isCorrect ? "Correct" : "Incorrect");
    const userAnswerText = item.userAnswer || (item.timedOut ? "[Timed Out]" : "No answer");
    ws_data.push([item.question, userAnswerText, item.correctAnswer, statusText]);
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "QuizResults");
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }
  const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quiz_results.xlsx";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function updateProgressBar(reset = false) {
  const progressBar = document.getElementById('progressBar');
  if (reset || filteredQuestions.length === 0) {
    progressBar.style.width = '0%';
  } else {
    const progressPercentage = ((currentIndex) / filteredQuestions.length) * 100;
    progressBar.style.width = `${progressPercentage}%`;
  }
}

