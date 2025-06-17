let questions = [];
let categories = [];
let categoryBeingEdited = null;

// Utilities for showing and hiding elements
function showElement(el) {
  if (el) el.style.display = 'block';
}
function hideElement(el) {
  if (el) el.style.display = 'none';
}

window.addEventListener('DOMContentLoaded', () => {
  loadQuestionsFromStorage();
  initCategories();
  attachEventListeners();
});

function attachEventListeners() {
  document.getElementById('addCategoryBtn').addEventListener('click', showNewCategoryInputArea);
  document.getElementById('cancelNewCategoryBtn').addEventListener('click', hideNewCategoryInputArea);
  document.getElementById('confirmNewCategoryBtn').addEventListener('click', addNewCategory);
  document.getElementById('newCategoryInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewCategory();
    }
  });
  document.getElementById('popupOverlay').addEventListener('click', closeAllPopups);

  // Manage queries overlay buttons
  document.getElementById('openManageCategoriesBtn').addEventListener('click', openManageCategories);
  document.getElementById('manageCategoriesBackBtn').addEventListener('click', closeManageCategories);

  // Import / Export buttons
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').value = '';
    document.getElementById('importFileInput').click();
  });

  document.getElementById('importFileInput').addEventListener('change', handleImportFile);

  document.getElementById('exportBtn').addEventListener('click', exportQueries);
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("No file selected.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) {
        alert("Invalid file format: Expected an array of questions.");
        return;
      }
      // Overwrite existing questions with imported data
      questions = data;
      saveQuestionsToStorage();
      initCategories();
      alert("Questions imported successfully!");
      // Optionally refresh current view if Manage Queries is open
      if (document.getElementById('manageQueriesOverlay').style.display === 'flex') {
        renderManageQueriesList();
      }
    } catch (error) {
      alert("Failed to import questions. Please ensure the file is valid JSON.");
    }
  };

  reader.readAsText(file);
}

function exportQueries() {
  if (questions.length === 0) {
    alert("No queries to export.");
    return;
  }
  const dataStr = JSON.stringify(questions, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'settlement_queries_export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearCategoryEditInline() {
  categoryBeingEdited = null;
  renderCategoriesList();
}

function closeAllPopups() {
  document.getElementById('popupOverlay').style.display = 'none';
  document.getElementById('questionPopup').style.display = 'none';
  document.getElementById('manageQueriesOverlay').style.display = 'none';
  closeManageCategories();
  resetManageQueriesView();
}

function loadQuestionsFromStorage() {
  const stored = localStorage.getItem('settlementQueries');
  if (stored) {
    try {
      questions = JSON.parse(stored);
    } catch {
      questions = [];
    }
  }
}

function saveQuestionsToStorage() {
  localStorage.setItem('settlementQueries', JSON.stringify(questions));
}

function initCategories() {
  const catSet = new Set();
  for (const q of questions) {
    if (q.category && q.category.trim() !== '') {
      catSet.add(q.category.trim());
    }
  }
  categories = Array.from(catSet).sort();
  if (categories.length === 0) categories.push('Uncategorized');
  populateCategorySelect();
  populateManageCategoryFilter();
}

function populateCategorySelect() {
  const select = document.getElementById('categorySelect');
  select.innerHTML = '';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  if (categories.length > 0) select.value = categories[0];
  hideNewCategoryInputArea();
}

function populateManageCategoryFilter() {
  const filter = document.getElementById('manageCategoryFilter');
  filter.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = 'All Categories';
  allOpt.textContent = 'All Categories';
  filter.appendChild(allOpt);
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filter.appendChild(opt);
  });
  filter.value = 'All Categories';
  highlightSelectedCategory();
}

function highlightSelectedCategory() {
  const filter = document.getElementById('manageCategoryFilter');
  const options = filter.querySelectorAll('option');
  options.forEach(opt => opt.classList.remove('highlighted'));
  const selected = filter.value;
  for (const opt of options) {
    if (opt.value === selected && selected !== 'All Categories') {
      opt.classList.add('highlighted');
      break;
    }
  }
}

function showNewCategoryInputArea() {
  document.getElementById('newCategoryInputArea').style.display = 'flex';
  document.getElementById('categorySelect').style.display = 'none';
  document.getElementById('addCategoryBtn').style.display = 'none';
  document.getElementById('newCategoryInput').value = '';
  document.getElementById('newCategoryInput').focus();
}

function hideNewCategoryInputArea() {
  document.getElementById('newCategoryInputArea').style.display = 'none';
  document.getElementById('categorySelect').style.display = 'block';
  document.getElementById('addCategoryBtn').style.display = 'inline-block';
}

function addNewCategory() {
  const input = document.getElementById('newCategoryInput');
  const newCategory = input.value.trim();
  if (!newCategory) {
    alert('Please enter a category name.');
    input.focus();
    return;
  }
  if (categories.includes(newCategory)) {
    alert('Category already exists.');
    input.focus();
    return;
  }
  categories.push(newCategory);
  categories.sort();
  populateCategorySelect();
  populateManageCategoryFilter();
  document.getElementById('categorySelect').value = newCategory;
  hideNewCategoryInputArea();
}

function showQuestionPopup() {
  closeAllPopups();
  document.getElementById('popupOverlay').style.display = 'block';
  document.getElementById('questionPopup').style.display = 'block';
  resetAddQueryFields();
  initCategories();
  clearEditMode();
}

function closeQuestionPopup() {
  closeAllPopups();
}

function showManageQueries() {
  closeAllPopups();
  resetManageQueriesView();
  document.getElementById('manageQueriesOverlay').style.display = 'flex';
  populateManageCategoryFilter();
  document.getElementById('manageCategoryFilter').value = 'All Categories';
  renderManageQueriesList();
  document.getElementById('selectAllCheckbox').checked = false;
}

function closeManageQueries() {
  closeAllPopups();
}

function resetManageQueriesView() {
  document.getElementById('manageQueriesView').style.display = 'block';
  document.getElementById('manageCategoriesView').style.display = 'none';
  clearCategoryEditInline();
}

function openManageCategories() {
  document.getElementById('manageQueriesView').style.display = 'none';
  document.getElementById('manageCategoriesView').style.display = 'block';
  document.getElementById('manageTitle').textContent = 'Manage Categories';
  renderCategoriesList();
}

function closeManageCategories() {
  clearCategoryEditInline();
  document.getElementById('manageCategoriesView').style.display = 'none';
  document.getElementById('manageQueriesView').style.display = 'block';
  document.getElementById('manageTitle').textContent = 'Manage Queries';
  populateManageCategoryFilter();
  renderManageQueriesList();
  document.getElementById('selectAllCheckbox').checked = false;
}

function renderCategoriesList() {
  const categoriesList = document.getElementById('categoriesList');
  categoriesList.innerHTML = '';

  categories.forEach((cat, idx) => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.dataset.index = idx;

    if (categoryBeingEdited === idx) {
      // Edit mode
      const input = document.createElement('input');
      input.type = 'text';
      input.value = cat;
      input.className = 'category-edit-input';
      input.setAttribute('aria-label', `Edit category name for "${cat}"`);

      const errorMsg = document.createElement('div');
      errorMsg.className = 'category-error-msg';

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.className = 'save-btn';
      saveBtn.disabled = false;

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'cancel-btn';

      function validate() {
        const val = input.value.trim();
        if (!val) {
          setError('Category name cannot be empty.');
          saveBtn.disabled = true;
          input.classList.add('error');
          return false;
        }
        if (val === cat) {
          setError('Please enter a different category name.');
          saveBtn.disabled = true;
          input.classList.add('error');
          return false;
        }
        if (categories.includes(val)) {
          setError('Category name already exists.');
          saveBtn.disabled = true;
          input.classList.add('error');
          return false;
        }
        setError('');
        saveBtn.disabled = false;
        input.classList.remove('error');
        return true;
      }

      function setError(msg) {
        errorMsg.textContent = msg;
        if (msg) {
          input.classList.add('error');
          input.setAttribute('aria-invalid', 'true');
        } else {
          input.classList.remove('error');
          input.setAttribute('aria-invalid', 'false');
        }
      }

      input.addEventListener('input', validate);

      input.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelInlineCategoryEdit();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (!saveBtn.disabled) saveCategoryEdit(idx, input.value.trim());
        }
      });

      saveBtn.addEventListener('click', () => {
        if (!saveBtn.disabled) saveCategoryEdit(idx, input.value.trim());
      });

      cancelBtn.addEventListener('click', () => {
        cancelInlineCategoryEdit();
      });

      div.appendChild(input);
      div.appendChild(saveBtn);
      div.appendChild(cancelBtn);
      div.appendChild(errorMsg);

      setTimeout(() => input.focus(), 0);

    } else {
      // Normal display mode
      const nameSpan = document.createElement('span');
      nameSpan.className = 'category-name';
      nameSpan.textContent = cat;

      const controls = document.createElement('div');
      controls.className = 'category-edit-controls';

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.title = `Edit category "${cat}"`;
      editBtn.addEventListener('click', () => {
        categoryBeingEdited = idx;
        renderCategoriesList();
      });

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.title = `Remove category "${cat}"`;
      removeBtn.className = 'remove-btn';
      removeBtn.addEventListener('click', () => {
        removeCategory(idx);
      });

      controls.appendChild(editBtn);
      controls.appendChild(removeBtn);

      div.appendChild(nameSpan);
      div.appendChild(controls);
    }

    categoriesList.appendChild(div);
  });
}

function saveCategoryEdit(index, newName) {
  if (!newName || newName === categories[index] || categories.includes(newName)) return;
  const oldName = categories[index];
  categories[index] = newName;
  categories.sort();

  questions.forEach(q => {
    if (q.category === oldName) q.category = newName;
  });

  saveQuestionsToStorage();
  categoryBeingEdited = null;
  renderCategoriesList();
  populateCategorySelect();
  populateManageCategoryFilter();
  renderManageQueriesList();
}

function cancelInlineCategoryEdit() {
  categoryBeingEdited = null;
  renderCategoriesList();
}

function removeCategory(index) {
  const catName = categories[index];
  const hasQueries = questions.some(q => q.category === catName);
  if (hasQueries) {
    alert('Cannot remove category that still contains queries. Remove queries first.');
    return;
  }
  if (confirm(`Are you sure you want to remove category "${catName}"? This cannot be undone.`)) {
    categories.splice(index, 1);
    populateCategorySelect();
    populateManageCategoryFilter();
    renderManageQueriesList();
    renderCategoriesList();
    alert(`Category "${catName}" has been removed.`);
  }
}

function resetAddQueryFields() {
  document.getElementById('newDateTime').value = '';
  document.getElementById('newQuestion').value = '';
  document.getElementById('newDescription').value = '';
  document.getElementById('newSideDescription').value = '';
  document.getElementById('questionType').value = 'open';
  showOptionFields();
  document.getElementById('newAnswerOpen').value = '';
  document.getElementById('newAnswer').value = '';
  hideNewCategoryInputArea();
  Array.from(document.getElementsByName('yesnoAdd')).forEach(box => box.checked = false);
  document.querySelectorAll('.option-input').forEach(input => input.value = '');
}

function showOptionFields() {
  const type = document.getElementById('questionType').value;
  document.getElementById('openAnswer').style.display = (type === 'open') ? 'block' : 'none';
  document.getElementById('yesNoAnswer').style.display = (type === 'yesno') ? 'block' : 'none';
  document.getElementById('multipleOptions').style.display = (type === 'multiple') ? 'block' : 'none';
}

function addQuestion() {
  const dt = document.getElementById('newDateTime').value;
  const questionText = document.getElementById('newQuestion').value.trim();
  const description = document.getElementById('newDescription').value.trim();
  const sideDescription = document.getElementById('newSideDescription').value.trim();

  let category;
  if (document.getElementById('newCategoryInputArea').style.display === 'flex') {
    category = document.getElementById('newCategoryInput').value.trim();
    if (!category) {
      alert("Please enter a category name or cancel.");
      return;
    }
  } else {
    const select = document.getElementById('categorySelect');
    category = select.value || 'Uncategorized';
  }

  const type = document.getElementById('questionType').value;

  if (!dt || !questionText) {
    alert("Please enter date/time and query text.");
    return;
  }
  if (!category) {
    alert("Please enter a category or fill it with 'Uncategorized'.");
    return;
  }

  if (!categories.includes(category)) {
    categories.push(category);
    categories.sort();
  }

  let correctAnswer;
  let options = [];

  if (type === 'open') {
    correctAnswer = document.getElementById('newAnswerOpen').value.trim();
    if (!correctAnswer) {
      alert("Please enter the correct answer.");
      return;
    }
  } else if (type === 'yesno') {
    const boxes = Array.from(document.getElementsByName('yesnoAdd'));
    correctAnswer = null;
    for (const box of boxes) {
      if (box.checked) {
        correctAnswer = box.value;
        break;
      }
    }
    if (!correctAnswer) {
      alert("Please select the correct answer (Yes, No, or Void).");
      return;
    }
  } else if (type === 'multiple') {
    const optionInputs = document.querySelectorAll('.option-input');
    options = [];
    optionInputs.forEach(inp => {
      if (inp.value.trim()) {
        options.push(inp.value.trim());
      }
    });
    if (options.length < 2) {
      alert("Please enter at least two options.");
      return;
    }
    correctAnswer = document.getElementById('newAnswer').value.trim();
    if (!correctAnswer) {
      alert("Please enter the correct answer.");
      return;
    }
    if (!options.includes(correctAnswer)) {
      alert("Correct answer must match one of the options.");
      return;
    }
  }

  const editIndex = getEditIndex();
  if (editIndex !== null) {
    questions[editIndex] = {
      datetime: dt,
      question: questionText,
      description,
      sideDescription,
      category,
      type,
      options,
      correctAnswer
    };
  } else {
    questions.push({
      datetime: dt,
      question: questionText,
      description,
      sideDescription,
      category,
      type,
      options,
      correctAnswer
    });
  }

  saveQuestionsToStorage();
  initCategories();

  alert("Query " + (editIndex !== null ? "updated" : "added") + "!");
  closeAllPopups();
}

function editQuery(index) {
  const query = questions[index];
  if (!query) return;
  document.getElementById('newDateTime').value = query.datetime;
  document.getElementById('newQuestion').value = query.question;
  document.getElementById('newDescription').value = query.description;
  document.getElementById('newSideDescription').value = query.sideDescription || '';
  if (!categories.includes(query.category) && query.category) {
    categories.push(query.category);
    categories.sort();
    populateCategorySelect();
    populateManageCategoryFilter();
  }
  document.getElementById('categorySelect').value = query.category || '';
  document.getElementById('questionType').value = query.type;
  showOptionFields();
  if (query.type === 'open') {
    document.getElementById('newAnswerOpen').value = query.correctAnswer;
  } else if (query.type === 'yesno') {
    const boxes = Array.from(document.getElementsByName('yesnoAdd'));
    boxes.forEach(box => {
      box.checked = (box.value === query.correctAnswer);
    });
  } else if (query.type === 'multiple') {
    const optionInputs = document.querySelectorAll('.option-input');
    optionInputs.forEach((input, idx) => {
      input.value = query.options[idx] || '';
    });
    document.getElementById('newAnswer').value = query.correctAnswer;
  }
  closeAllPopups();
  document.getElementById('popupOverlay').style.display = 'block';
  document.getElementById('questionPopup').style.display = 'block';
  setEditIndex(index);
}

function renderManageQueriesList() {
  const listContainer = document.getElementById('manageQueriesList');
  listContainer.innerHTML = '';
  const selectedCategory = document.getElementById('manageCategoryFilter').value;
  const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  let filteredList = selectedCategory === 'All Categories' ? questions : questions.filter(q => q.category === selectedCategory);
  if (searchTerm) filteredList = filteredList.filter(q => q.question.toLowerCase().includes(searchTerm));
  if (filteredList.length === 0) {
    listContainer.innerHTML = '<p>No queries found for this category or search.</p>';
    return;
  }
  filteredList.forEach(query => {
    const originalIndex = questions.indexOf(query);
    const item = document.createElement('div');
    item.className = 'query-item';
    item.innerHTML = `
      <label class="checkbox-label" title="${query.question}">
        <input type="checkbox" class="query-checkbox" data-index="${originalIndex}" /> 
        <span class="query-question">${query.question}</span>
        <span class="query-date">${new Date(query.datetime).toLocaleString()}</span>
      </label>
      <button class="edit-btn" onclick="editQuery(${originalIndex})">Edit</button>
    `;
    listContainer.appendChild(item);
  });
}

function filterManageQueries() {
  renderManageQueriesList();
}

function toggleSelectAll(masterCheckbox) {
  const checkboxes = document.querySelectorAll('.query-checkbox');
  checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
}

function removeSelectedQueries() {
  const checkboxes = document.querySelectorAll('.query-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('Please select at least one query to remove.');
    return;
  }
  if (confirm('Are you sure you want to remove the selected queries?')) {
    const indicesToRemove = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-index'))).sort((a, b) => b - a);
    indicesToRemove.forEach(index => { questions.splice(index, 1); });
    saveQuestionsToStorage();
    initCategories();
    renderManageQueriesList();
    alert('Selected queries removed successfully.');
    document.getElementById('selectAllCheckbox').checked = false;
  }
}

function getEditIndex() {
  const val = document.getElementById('questionPopup').getAttribute('data-edit-index');
  if (!val) return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}

function setEditIndex(index) {
  const popup = document.getElementById('questionPopup');
  const btn = document.getElementById('addUpdateQuestionBtn');
  if (index !== null && index !== undefined) {
    btn.textContent = "Update Query";
    document.getElementById('popupTitle').textContent = "Edit Settlement Query";
    popup.setAttribute('data-edit-index', index);
  } else {
    btn.textContent = "Add Query";
    document.getElementById('popupTitle').textContent = "Add Settlement Query";
    popup.removeAttribute('data-edit-index');
  }
}

function clearEditMode() {
  setEditIndex(null);
}

function goBackToHome() {
  window.location.href = 'index.html';
}


// IMPORT & EXPORT HANDLERS

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) {
    alert("No file selected.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) {
        alert("Invalid file format: Expected an array of questions.");
        return;
      }
      questions = data;
      saveQuestionsToStorage();
      initCategories();
      alert("Questions imported successfully!");
      // Refresh if Manage Queries is open
      if (document.getElementById('manageQueriesOverlay').style.display === 'flex') {
        renderManageQueriesList();
      }
    } catch (error) {
      alert("Failed to import questions. Please ensure the file is valid JSON.");
    }
  };

  reader.readAsText(file);
}

function exportQueries() {
  if (questions.length === 0) {
    alert("No queries to export.");
    return;
  }
  const dataStr = JSON.stringify(questions, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'settlement_queries_export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

