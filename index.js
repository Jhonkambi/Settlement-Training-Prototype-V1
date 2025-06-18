(() => {
  const chatWidget = document.getElementById('aiChatWidget');
  const chatHeader = document.getElementById('aiChatHeader');
  const chatBody = document.getElementById('aiChatBody');
  const toggleIcon = document.getElementById('aiChatToggleIcon');
  const chatMessages = document.getElementById('aiChatMessages');
  const chatInput = document.getElementById('aiChatInput');
  const chatSendBtn = document.getElementById('aiChatSendBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const typingIndicator = document.getElementById('typingIndicator');

  const dropdownToggleBtn = document.getElementById('dropdownToggleBtn');
  const quickRepliesContent = document.getElementById('quickRepliesContent');

  let chatOpen = false;
  let suggestionsVisible = false;
  let lastAnswerText = '';
  let typingTimeout = null;
  let conversationHistory = [];

  // Suggested quick replies topics
  const commonTopics = [
    'How to import queries',
    'How to start a quiz',
    'Exporting results',
    'Managing queries',
    'Quiz difficulty levels',
    'Help and support'
  ];

  // Refined FAQ knowledge base with improved responses
  const faq = [
    {
      questions: ['how to settle', 'settle', 'settlement', 'how do i settle'],
      answer: `To complete settlement successfully, please begin by importing your queries through the Settings page. After importing, proceed to start the quiz, answering each question carefully as it appears.`
    },
    {
      questions: ['how to import', 'import queries', 'upload queries', 'json file import', 'load queries'],
      answer: `
        <h3>Step-by-Step Guide to Importing Queries</h3>
        <ol>
          <li><strong>Open Settings:</strong> Click the <em>Settings</em> button on the home page to access application preferences.</li>
          <li><strong>Locate Import Queries:</strong> Find the <em>Import Queries</em> section within the Settings page.</li>
          <li><strong>Select JSON File:</strong> Click <em>Import</em> and choose your settlement queries JSON file from your device storage.</li>
          <li><strong>Confirm Import:</strong> Verify and confirm the import to load queries into the quiz system.</li>
          <li><strong>Verify Queries:</strong> Visit the Manage Queries section to ensure all queries have imported correctly.</li>
          <li><strong>Start Quiz:</strong> Navigate back to the home page and begin your quiz with the imported queries.</li>
        </ol>
        <p>If you experience any difficulties during import, please reach out for assistance or consult the documentation.</p>
      `
    },
    {
      questions: ['exporting results', 'export', 'export results', 'export quiz results'],
      answer: `You may export your quiz answers at any time using the Export feature located in the Settings page. The exported records are saved as Excel files, facilitating easy review and record-keeping.`
    },
    {
      questions: ['managing queries', 'manage queries', 'edit queries', 'delete queries'],
      answer: `Within the Settings menu, use the Manage Queries section to add new queries, edit existing ones, or remove outdated content, ensuring your quiz material remains current and relevant.`
    },
    {
      questions: ['quiz difficulty levels', 'difficulty', 'levels', 'set difficulty'],
      answer: `When you start a quiz, you have the option to select a difficulty level. This choice adjusts the timing and number of questions to suit your comfort and challenge preferences.`
    },
    {
      questions: ['help', 'support', 'assistance'],
      answer: `If you require help or support, you can reach out to your inline manager or the settlement experts assigned to your department. They are readily available to provide guidance and assistance. Additionally, our support page and documentation offer useful resources to resolve common issues.`
    },
  ];

  // Debounce function
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // Toggle chat panel open/close with smooth animation
  function toggleChat() {
    chatOpen = !chatOpen;
    if (chatOpen) {
      chatWidget.classList.remove('collapsed');
      toggleIcon.classList.add('open');
      chatBody.style.display = 'flex';
      chatInput.focus();
      chatHeader.setAttribute('aria-expanded', 'true');
      chatHeader.setAttribute('aria-pressed', 'true');
      scrollMessagesToBottom();
    } else {
      chatWidget.classList.add('collapsed');
      toggleIcon.classList.remove('open');
      chatBody.style.display = 'none';
      chatHeader.setAttribute('aria-expanded', 'false');
      chatHeader.setAttribute('aria-pressed', 'false');
      hideSuggestions();
    }
  }
  chatHeader.addEventListener('click', toggleChat);
  chatHeader.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleChat();
    }
  });

  // Enable send button when input has text (debounced)
  chatInput.addEventListener('input', debounce(() => {
    const hasText = chatInput.value.trim() !== '';
    chatSendBtn.disabled = !hasText;
    chatSendBtn.setAttribute('aria-disabled', (!hasText).toString());
  }, 150));

  // Scroll chat messages to bottom
  function scrollMessagesToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Append message to chat
  function appendMessage(text, isUser, isHTML = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'aiMsg ' + (isUser ? 'aiUserMsg' : 'aiBotMsg');
    if (isHTML) {
      msgDiv.innerHTML = text;
    } else {
      msgDiv.textContent = text;
    }
    chatMessages.appendChild(msgDiv);
    scrollMessagesToBottom();
  }

  // Create feedback buttons and attach handlers
  function createFeedbackButtons(container) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-buttons';

    const thumbsUp = document.createElement('button');
    thumbsUp.type = 'button';
    thumbsUp.title = 'This answer was helpful';
    thumbsUp.innerHTML = '👍';
    thumbsUp.setAttribute('aria-label', 'Helpful answer');

    const thumbsDown = document.createElement('button');
    thumbsDown.type = 'button';
    thumbsDown.title = 'This answer was not helpful';
    thumbsDown.innerHTML = '👎';
    thumbsDown.setAttribute('aria-label', 'Unhelpful answer');

    thumbsUp.addEventListener('click', () => handleFeedback(true, container, thumbsUp, thumbsDown));
    thumbsDown.addEventListener('click', () => handleFeedback(false, container, thumbsUp, thumbsDown));

    feedbackDiv.appendChild(thumbsUp);
    feedbackDiv.appendChild(thumbsDown);
    container.appendChild(feedbackDiv);

    return { thumbsUp, thumbsDown };
  }

  // Wrap long answers inside expandable/collapsible content
  function createExpandableAnswer(text) {
    const container = document.createElement('div');
    const previewLength = 250;
    if (text.length <= previewLength) {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'answer-content';
      contentDiv.innerHTML = text;
      container.appendChild(contentDiv);
      return container;
    }
    const previewText = text.substring(0, previewLength) + '...';
    const fullTextDiv = document.createElement('div');
    fullTextDiv.className = 'answer-content collapsed';
    fullTextDiv.innerHTML = text;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'answer-content';
    previewDiv.innerHTML = previewText;

    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'answer-expandable';
    toggleBtn.textContent = 'Show more';

    toggleBtn.addEventListener('click', () => {
      const isCollapsed = fullTextDiv.classList.contains('collapsed');
      if (isCollapsed) {
        fullTextDiv.classList.remove('collapsed');
        previewDiv.style.display = 'none';
        toggleBtn.textContent = 'Show less';
      } else {
        fullTextDiv.classList.add('collapsed');
        previewDiv.style.display = 'block';
        toggleBtn.textContent = 'Show more';
      }
    });

    container.appendChild(previewDiv);
    container.appendChild(fullTextDiv);
    container.appendChild(toggleBtn);
    return container;
  }

  // Append assistant answer with feedback and suggested topics panel
  function appendAnswerWithFeedback(answerText) {
    lastAnswerText = answerText;
    const container = document.createElement('div');
    container.className = 'aiMsg aiBotMsg';
    container.style.maxWidth = '70%';
    container.style.marginBottom = '12px';
    container.style.borderRadius = '0 16px 16px 16px';
    container.style.backgroundColor = '#e2e8f0';
    container.style.color = '#222';
    container.style.padding = '10px 16px';
    container.style.lineHeight = '1.4';
    container.style.position = 'relative';

    // Expandable Answer Content
    const expandableAnswer = createExpandableAnswer(answerText);
    container.appendChild(expandableAnswer);

    // Feedback Buttons
    createFeedbackButtons(container);

    chatMessages.appendChild(container);
    scrollMessagesToBottom();

    // Populate suggested topics panel inline
    populateQuickRepliesDropdown(commonTopics);
  }

  // Handle user feedback on answers
  function handleFeedback(isPositive, messageContainer, thumbsUp, thumbsDown) {
    if (!lastAnswerText) return;

    thumbsUp.disabled = true;
    thumbsDown.disabled = true;
    thumbsUp.style.cursor = 'default';
    thumbsDown.style.cursor = 'default';
    thumbsUp.style.color = '#aaa';
    thumbsDown.style.color = '#aaa';

    let feedbackData = {};
    try {
      const stored = localStorage.getItem('aiAssistantFeedback');
      if (stored) feedbackData = JSON.parse(stored);
    } catch (e) {
      feedbackData = {};
    }

    if (!feedbackData[lastAnswerText]) {
      feedbackData[lastAnswerText] = { positive: 0, negative: 0 };
    }

    if (isPositive) {
      feedbackData[lastAnswerText].positive++;
      showFeedbackToast('Thanks for your positive feedback!');
    } else {
      feedbackData[lastAnswerText].negative++;
      showFeedbackToast('Thanks for your feedback! We\'ll strive to improve.');
    }

    localStorage.setItem('aiAssistantFeedback', JSON.stringify(feedbackData));
  }

  // Show feedback toast message
  function showFeedbackToast(message) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      backgroundColor: '#0066cc',
      color: '#fff',
      padding: '10px 16px',
      borderRadius: '24px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      zIndex: 1100,
      fontWeight: '700',
      userSelect: 'none',
      opacity: '0',
      transition: 'opacity 0.3s ease',
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Typing indicator control
  function showTypingIndicator(show) {
    if (show) {
      typingIndicator.textContent = 'Training Assistant is typing...';
    } else {
      typingIndicator.textContent = '';
    }
  }

  // Greeting detection ignoring punctuation
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'good day'];
  function isGreeting(text) {
    const cleaned = text.toLowerCase().trim().replace(/[!.,?]/g, '');
    return greetings.some(greet => cleaned === greet);
  }

  // Find best FAQ answer, with fallback message for suggested topics without answers
  function findAnswer(userText) {
    const inputLower = userText.toLowerCase();

    if (isGreeting(inputLower)) {
      return "Hello! I'm here to assist you. You can ask me about how to use the app, manage queries, start quizzes, and more.";
    }

    const inputWords = inputLower.split(/\s+/).filter(Boolean);

    // Exact all-words matching
    for (const faqItem of faq) {
      for (const q of faqItem.questions) {
        const qWords = q.split(/\s+/);
        const allWordsMatch = qWords.every(qw => inputWords.some(iw => iw.includes(qw)));
        if (allWordsMatch) {
          return faqItem.answer;
        }
      }
    }

    // Partial includes fallback
    for (const faqItem of faq) {
      for (const q of faqItem.questions) {
        if (inputLower.includes(q)) {
          return faqItem.answer;
        }
      }
    }

    // Check if question matches any suggested topic (case-insensitive)
    const matchedTopic = commonTopics.find(topic => inputLower.includes(topic.toLowerCase()));
    if (matchedTopic) {
      return `I'm still learning more about "${matchedTopic}". Meanwhile, feel free to explore other topics or ask a different question.`;
    }

    // Default options prompt
    return getOptionsPrompt();
  }

  // Options prompt HTML
  function getOptionsPrompt() {
    return `
      <p>I can help with questions about:</p>
      <ul style="margin:0 0 0 18px; padding-left: 0; list-style-type: disc;">
        <li>How to settle and import queries</li>
        <li>Navigating the app</li>
        <li>Using the quiz and settings</li>
        <li>Managing queries and categories</li>
        <li>Difficulty levels and quiz timing</li>
        <li>Exporting quiz results</li>
      </ul>
      <p>Please try asking about one of these topics!</p>
    `;
  }

  // Populate suggested topics inline list
  function populateQuickRepliesDropdown(topics) {
    quickRepliesContent.innerHTML = '';
    topics.forEach(topic => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = topic;
      btn.setAttribute('role', 'button');
      btn.tabIndex = 0;
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.style.padding = '8px 12px';
      btn.style.border = 'none';
      btn.style.background = 'none';
      btn.style.cursor = 'pointer';
      btn.style.color = '#003366';
      btn.style.fontWeight = '600';
      btn.style.borderBottom = '1px solid #ddd';
      btn.addEventListener('click', () => {
        chatInput.value = topic;
        chatSendBtn.disabled = false;
        chatSendBtn.setAttribute('aria-disabled', 'false');
        chatInput.focus();
        hideSuggestions();
      });
      quickRepliesContent.appendChild(btn);
    });
  }

  // Show/hide suggested topics inline list with inert attribute management
  function toggleSuggestions() {
    suggestionsVisible = !suggestionsVisible;
    if (suggestionsVisible) {
      quickRepliesContent.style.display = 'block';
      dropdownToggleBtn.setAttribute('aria-expanded', 'true');
      dropdownToggleBtn.textContent = 'Suggested Topics ▲';
      quickRepliesContent.removeAttribute('inert'); // Remove inert when shown
    } else {
      quickRepliesContent.style.display = 'none';
      dropdownToggleBtn.setAttribute('aria-expanded', 'false');
      dropdownToggleBtn.textContent = 'Suggested Topics ▼';
      quickRepliesContent.setAttribute('inert', 'true'); // Add inert when hidden
    }
  }

  function hideSuggestions() {
    suggestionsVisible = false;
    quickRepliesContent.style.display = 'none';
    dropdownToggleBtn.setAttribute('aria-expanded', 'false');
    dropdownToggleBtn.textContent = 'Suggested Topics ▼';
    quickRepliesContent.setAttribute('inert', 'true'); // Ensure inert when hidden
  }

  dropdownToggleBtn.addEventListener('click', () => {
    toggleSuggestions();
  });

  // Close suggestions if clicked outside the toggle or the list
  document.addEventListener('click', (e) => {
    if (!dropdownToggleBtn.contains(e.target) && !quickRepliesContent.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Handle user question with typing simulation
  function handleUserQuestion() {
    const question = chatInput.value.trim();
    if (question === '') return;

    appendMessage(question, true);
    chatInput.value = '';
    chatSendBtn.disabled = true;
    chatSendBtn.setAttribute('aria-disabled', 'true');

    conversationHistory.push({ role: 'user', content: question });

    showTypingIndicator(true);

    if (typingTimeout) clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
      const answer = findAnswer(question);
      appendAnswerWithFeedback(answer);
      conversationHistory.push({ role: 'assistant', content: answer });
      showTypingIndicator(false);
    }, 1200 + Math.random() * 1000);
  }

  chatSendBtn.addEventListener('click', handleUserQuestion);
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !chatSendBtn.disabled) {
      e.preventDefault();
      handleUserQuestion();
    }
  });

  clearChatBtn.addEventListener('click', () => {
    chatMessages.innerHTML = '';
    conversationHistory = [];
    lastAnswerText = '';
    chatInput.focus();
  });

  // Initialize state: chat collapsed with body hidden
  chatWidget.classList.add('collapsed');
  chatBody.style.display = 'none';
  toggleIcon.innerHTML = '&#x25B2;';
  chatHeader.setAttribute('aria-expanded', 'false');
  chatHeader.setAttribute('aria-pressed', 'false');
  quickRepliesContent.style.display = 'none';
  dropdownToggleBtn.setAttribute('aria-expanded', 'false');
  dropdownToggleBtn.textContent = 'Suggested Topics ▼';
  quickRepliesContent.setAttribute('inert', 'true'); // Start with inert enabled

  // Initialize suggested topics content on load
  populateQuickRepliesDropdown(commonTopics);
})();
