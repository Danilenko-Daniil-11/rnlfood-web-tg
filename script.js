// Конфигурация API
const API_BASE_URL = window.location.origin;

// Основные переменные
let currentUser = null;
let cart = {};
let activePromo = null;
let promoDiscount = 0;
let selectedAmount = 100;
let products = [];
let currentOrderPage = 1;
let ordersPerPage = 10;
let favorites = new Set();
let achievements = [];
let isParentMode = false;
let isSimpleMode = false;
let is8BitMode = false;
let isHighContrast = false;
let voiceRecognition = null;
let konamiCode = [];
const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

// Цветовые темы
const COLOR_THEMES = {
    'emerald': {
        name: 'Изумрудная',
        primary: '#10b981',
        primaryDark: '#059669',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    'rose': {
        name: 'Розовая',
        primary: '#f43f5e',
        primaryDark: '#e11d48',
        secondary: '#8b5cf6',
        accent: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
    },
    'amber': {
        name: 'Янтарная',
        primary: '#f59e0b',
        primaryDark: '#d97706',
        secondary: '#ec4899',
        accent: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    },
    'sky': {
        name: 'Небесная',
        primary: '#0ea5e9',
        primaryDark: '#0284c7',
        secondary: '#8b5cf6',
        accent: '#10b981',
        gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
    },
    'violet': {
        name: 'Фиолетовая',
        primary: '#8b5cf6',
        primaryDark: '#7c3aed',
        secondary: '#ec4899',
        accent: '#f59e0b',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    },
    'cyan': {
        name: 'Бирюзовая',
        primary: '#06b6d4',
        primaryDark: '#0891b2',
        secondary: '#8b5cf6',
        accent: '#10b981',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
    },
    'lime': {
        name: 'Лаймовая',
        primary: '#84cc16',
        primaryDark: '#65a30d',
        secondary: '#0ea5e9',
        accent: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)'
    },
    'orange': {
        name: 'Апельсиновая',
        primary: '#f97316',
        primaryDark: '#ea580c',
        secondary: '#ec4899',
        accent: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
    },
    'pink': {
        name: 'Розовое золото',
        primary: '#ec4899',
        primaryDark: '#db2777',
        secondary: '#f59e0b',
        accent: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
    },
    'indigo': {
        name: 'Индиго',
        primary: '#6366f1',
        primaryDark: '#4f46e5',
        secondary: '#ec4899',
        accent: '#10b981',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
    },
    'gold': {
        name: 'Золотая',
        primary: '#fbbf24',
        primaryDark: '#d97706',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)'
    },
    'sunset': {
        name: 'Закатная',
        primary: '#f97316',
        primaryDark: '#c2410c',
        secondary: '#ec4899',
        accent: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)'
    },
    'ocean': {
        name: 'Океанская',
        primary: '#06b6d4',
        primaryDark: '#0e7490',
        secondary: '#3b82f6',
        accent: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)'
    },
    'forest': {
        name: 'Лесная',
        primary: '#16a34a',
        primaryDark: '#15803d',
        secondary: '#65a30d',
        accent: '#ca8a04',
        gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #14532d 100%)'
    },
    'berry': {
        name: 'Ягодная',
        primary: '#dc2626',
        primaryDark: '#b91c1c',
        secondary: '#ec4899',
        accent: '#7c3aed',
        gradient: 'linear-gradient(135deg, #dc2626 0%, #ec4899 50%, #7c3aed 100%)'
    }
};

// Текущая цветовая схема
let currentColorScheme = 'emerald';

// Анимации
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function fadeIn(element, duration = 300) {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let start = null;
    const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = (timestamp - start) / duration;
        element.style.opacity = Math.min(progress, 1);
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function slideIn(element, direction = 'up', duration = 400) {
    const transform = {
        up: 'translateY(30px)',
        down: 'translateY(-30px)',
        left: 'translateX(30px)',
        right: 'translateX(-30px)'
    };
    
    element.style.opacity = '0';
    element.style.transform = transform[direction] || transform.up;
    element.style.transition = `all ${duration}ms ease-out`;
    
    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translate(0, 0)';
    }, 50);
}

// Функции для работы с API
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        },
        ...options
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка сервера');
        }
        
        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
});

async function initializeApp() {
    loadTheme();
    loadColorTheme();
    await loadUserData();
    await loadProducts();
    await initializeAssortment();
    updateCart();
    await loadOrderHistory();
    initializeAmountSelection();
    checkAuth();
    initParticleButtons();
    initCustomCursor();
    initSeasonalEffects();
    initVoiceRecognition();
    initSwipeNavigation();
    initKonamiCode();
    initAutoDarkMode();
    initScrollProgress();
    initScrollToTop();
    initExitPopup();
    loadAvatar();
    
    // Анимация появления элементов
    document.querySelectorAll('.screen.active .hero, .screen.active .form-container').forEach(el => {
        slideIn(el, 'up');
    });
    
    if (!localStorage.getItem('visited')) {
        showNotification('Добро пожаловать в РНЛ ЕДА! Используйте промокод WELCOME10 для скидки 10%', 'success');
        localStorage.setItem('visited', 'true');
    }
}

// Автотёмная тема с 18:00 до 07:00
function initAutoDarkMode() {
    const now = new Date();
    const hour = now.getHours();
    const isNightTime = hour >= 18 || hour < 7;
    
    if (isNightTime && !localStorage.getItem('theme')) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        document.getElementById('theme-toggle').querySelector('i').className = 'fas fa-sun';
    }
}

// Функции навигации
function goTo(screenId) {
    // Анимация перехода
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        currentScreen.style.opacity = '0';
        currentScreen.style.transform = 'translateY(-20px)';
        currentScreen.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    setTimeout(() => {
        // Скрываем все экраны
        document.querySelectorAll(".screen").forEach(s => {
            s.classList.remove("active");
            s.style.opacity = '0';
            s.style.transform = 'translateY(20px)';
            s.style.transition = 'none';
        });

        // Показываем целевой экран
        const targetScreen = document.getElementById(screenId);
        targetScreen.classList.add("active");

        // Принудительно обновляем layout
        targetScreen.offsetHeight;

        // Анимируем появление
        targetScreen.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        targetScreen.style.opacity = '1';
        targetScreen.style.transform = 'translateY(0)';

        // Анимация появления контента
        const content = targetScreen.querySelector('.hero, .form-container, .page-header, .profile-header, .success-container');
        if (content) {
            setTimeout(() => {
                slideIn(content, 'up');
            }, 200);
        }

        if (screenId === "start") {
            document.getElementById("authors").style.display = "block";
        } else {
            document.getElementById("authors").style.display = "none";
        }

        // Обновление нижней навигации
        updateBottomNavigation(screenId);

        switch(screenId) {
            case 'profile':
                updateProfile();
                loadAchievements();
                loadCaloriesChart();
                // Загружаем историю заказов при каждом переходе
                setTimeout(() => loadOrderHistory(), 100);
                break;
            case 'assortment':
                updateCartSummary();
                break;
            case 'favorites':
                loadFavorites();
                break;
            case 'Thx':
                startCountdown();
                break;
            case 'payment':
                updatePaymentUI();
                break;
            case 'admin':
                if (currentUser && currentUser.role === 'admin') {
                    loadAdminStats();
                    loadAdminOrders();
                } else {
                    goTo('profile');
                }
                break;
            case 'order-history':
                loadFullOrderHistory();
                break;
        }
    }, 400);
}

function updateBottomNavigation(screenId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeNavBtn = document.querySelector(`.nav-btn[onclick*="${screenId}"]`);
    if (activeNavBtn) {
        activeNavBtn.classList.add('active');
    }
}

// Swipe навигация для мобильных
function initSwipeNavigation() {
    let startX = 0;
    let endX = 0;
    
    document.addEventListener('touchstart', e => {
        startX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', e => {
        endX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const diff = endX - startX;
        const screens = ['start', 'login', 'assortment', 'profile', 'favorites'];
        const currentScreen = document.querySelector('.screen.active').id;
        const currentIndex = screens.indexOf(currentScreen);
        
        if (Math.abs(diff) > 50) { // Минимальная дистанция свайпа
            if (diff > 0 && currentIndex > 0) {
                // Свайп вправо - предыдущий экран
                goTo(screens[currentIndex - 1]);
            } else if (diff < 0 && currentIndex < screens.length - 1) {
                // Свайп влево - следующий экран
                goTo(screens[currentIndex + 1]);
            }
        }
    }
}

// Кастомный курсор
function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    
    document.addEventListener('mousemove', e => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    
    document.addEventListener('mousedown', () => {
        cursor.style.transform = 'scale(0.8)';
    });
    
    document.addEventListener('mouseup', () => {
        cursor.style.transform = 'scale(1)';
    });
    
    // Скрыть курсор на мобильных устройствах
    if ('ontouchstart' in window) {
        cursor.style.display = 'none';
    }
}

// Сезонные эффекты (снег/листья)
function initSeasonalEffects() {
    const container = document.getElementById('seasonal-effects');
    const now = new Date();
    const month = now.getMonth();
    
    let effectType = '';
    if (month >= 11 || month <= 1) effectType = 'snow'; // Зима
    else if (month >= 8 && month <= 10) effectType = 'leaves'; // Осень
    
    if (effectType === 'snow') {
        createSnowflakes(container);
    } else if (effectType === 'leaves') {
        createLeaves(container);
    }
}

function createSnowflakes(container) {
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.innerHTML = '*';
            snowflake.style.left = Math.random() * 100 + 'vw';
            snowflake.style.animationDuration = (Math.random() * 3 + 2) + 's';
            snowflake.style.animationDelay = Math.random() * 5 + 's';
            container.appendChild(snowflake);
            
            // Удалить после анимации
            setTimeout(() => {
                snowflake.remove();
            }, 10000);
        }, i * 200);
    }
}

function createLeaves(container) {
    const leaves = ['*', '*', '*'];
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            leaf.innerHTML = leaves[Math.floor(Math.random() * leaves.length)];
            leaf.style.left = Math.random() * 100 + 'vw';
            leaf.style.animationDuration = (Math.random() * 5 + 3) + 's';
            leaf.style.animationDelay = Math.random() * 8 + 's';
            container.appendChild(leaf);
            
            setTimeout(() => {
                leaf.remove();
            }, 15000);
        }, i * 300);
    }
}

// Голосовое управление
function initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRecognition();
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;
        voiceRecognition.lang = 'ru-RU';
        
        voiceRecognition.onstart = function() {
            document.getElementById('voice-control').classList.add('listening');
            showNotification('Слушаю...', 'info');
        };
        
        voiceRecognition.onresult = function(event) {
            const command = event.results[0][0].transcript.toLowerCase();
            handleVoiceCommand(command);
        };
        
        voiceRecognition.onerror = function(event) {
            console.error('Ошибка распознавания голоса:', event.error);
            showNotification('Не удалось распознать команду', 'error');
        };
        
        voiceRecognition.onend = function() {
            document.getElementById('voice-control').classList.remove('listening');
        };
        
        document.getElementById('voice-control').addEventListener('click', function() {
            if (voiceRecognition) {
                voiceRecognition.start();
            }
        });
    } else {
        document.getElementById('voice-control').style.display = 'none';
    }
}

function handleVoiceCommand(command) {
    showNotification(`Распознано: "${command}"`, 'info');
    
    // Базовые команды
    if (command.includes('меню') || command.includes('ассортимент')) {
        goTo('assortment');
    } else if (command.includes('профиль') || command.includes('аккаунт')) {
        goTo('profile');
    } else if (command.includes('корзина') || command.includes('заказ')) {
        goTo('assortment');
    } else if (command.includes('избранное') || command.includes('любимые')) {
        goTo('favorites');
    } else if (command.includes('выйти') || command.includes('выход')) {
        logout();
    } else if (command.includes('светлая тема')) {
        setTheme('light');
    } else if (command.includes('тёмная тема')) {
        setTheme('dark');
    } else {
        // Поиск блюд по голосовой команде
        const searchTerm = command.replace(/(меню|найди|покажи|хочу)/g, '').trim();
        if (searchTerm) {
            document.getElementById('search-input').value = searchTerm;
            filterProducts();
            showNotification(`Ищем: "${searchTerm}"`, 'success');
        }
    }
}

// Konami Code для пасхалки
function initKonamiCode() {
    document.addEventListener('keydown', e => {
        konamiCode.push(e.code);
        if (konamiCode.length > KONAMI_CODE.length) {
            konamiCode.shift();
        }
        
        if (konamiCode.join(',') === KONAMI_CODE.join(',')) {
            activateEasterEgg();
            konamiCode = [];
        }
    });
}

function activateEasterEgg() {
    is8BitMode = !is8BitMode;
    document.body.classList.toggle('pixel-theme', is8BitMode);
    showNotification(is8BitMode ? '8-bit режим активирован!' : '8-bit режим выключен', 'success');
}

// Прогресс бар чтения
function initScrollProgress() {
    const progressBar = document.getElementById('reading-progress');
    
    window.addEventListener('scroll', () => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const scrollTop = window.pageYOffset;
        const progress = (scrollTop / documentHeight) * 100;
        progressBar.style.width = progress + '%';
    });
}

// Кнопка "Наверх"
function initScrollToTop() {
    const scrollBtn = document.getElementById('scroll-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.add('active');
        } else {
            scrollBtn.classList.remove('active');
        }
    });
    
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Всплывашка при закрытии
function initExitPopup() {
    let showExitPopup = true;
    
    window.addEventListener('beforeunload', (e) => {
        if (showExitPopup && Object.keys(cart).length > 0) {
            e.preventDefault();
            e.returnValue = '';
            showExitConfirm();
        }
    });
    
    window.addEventListener('mouseout', (e) => {
        if (e.clientY < 0 && showExitPopup) {
            showExitConfirm();
        }
    });
}

function showExitConfirm() {
    document.getElementById('exit-popup').classList.add('active');
}

function hideExitPopup() {
    document.getElementById('exit-popup').classList.remove('active');
}

// Проверка авторизации
function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-btn');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        logoutBtn.style.display = 'flex';
        
        // Показываем кнопку админа если пользователь админ
        if (currentUser.role === 'admin') {
            adminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
        }
        
        if (window.location.hash !== '#start') {
            goTo('profile');
        }
    } else {
        logoutBtn.style.display = 'none';
        adminBtn.style.display = 'none';
    }
}

// Функции для работы с пользователем
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    if (!username || !password) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const data = await apiRequest('/api/login', {
            method: 'POST',
            body: { username, password }
        });
        
        currentUser = data.user;
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        document.getElementById('logout-btn').style.display = 'flex';
        if (currentUser.role === 'admin') {
            document.getElementById('admin-btn').style.display = 'flex';
        }
        
        showNotification(`Добро пожаловать, ${username}!`, 'success');
        createLoginAnimation();
        goTo('profile');
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification(error.message || 'Ошибка входа. Попробуйте еще раз.', 'error');
    } finally {
        showLoading(false);
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const fullname = document.getElementById('reg-fullname').value;
    const age = document.getElementById('reg-age').value;
    const parents = document.getElementById('reg-parents').value;
    const grade = document.getElementById('reg-grade').value;
    
    if (!username || !password || !fullname || !age || !parents || !grade) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('Логин должен содержать минимум 3 символа', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const data = await apiRequest('/api/register', {
            method: 'POST',
            body: {
                username,
                password,
                full_name: fullname,
                class_name: grade,
                age: age,
                parents: parents
            }
        });
        
        // Сохраняем все данные пользователя
        currentUser = {
            ...data.user,
            age: age,
            parents: parents
        };
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('logout-btn').style.display = 'flex';
        
        closeModal('register-modal');
        showNotification('Регистрация успешна!', 'success');
        createLoginAnimation();
        goTo('profile');
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification(error.message || 'Ошибка регистрации. Попробуйте еще раз.', 'error');
    } finally {
        showLoading(false);
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    sessionStorage.removeItem('currentUser');
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('admin-btn').style.display = 'none';
    
    cart = {};
    updateCart();
    
    showNotification('Вы вышли из системы', 'success');
    goTo('start');
}

function showRegisterModal() {
    openModal('register-modal');
}

async function loadUserData() {
    const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
        favorites = new Set(JSON.parse(savedFavorites));
    }
    
    const savedAchievements = localStorage.getItem('achievements');
    if (savedAchievements) {
        achievements = JSON.parse(savedAchievements);
    }
}

async function loadProducts() {
    try {
        const data = await apiRequest('/api/menu');
        
        if (data && data.length > 0) {
            products = data.map(item => ({
                id: item.id,
                name: item.name,
                price: parseFloat(item.price),
                category: item.category_name || 'Горячее',
                icon: getCategoryIcon(item.category_name),
                description: item.description,
                calories: item.calories || Math.floor(Math.random() * 500) + 100,
                allergens: item.allergens || ['gluten'],
                isVegetarian: item.is_vegetarian || false,
                isGlutenFree: item.is_gluten_free || false,
                rating: item.rating || (Math.random() * 2 + 3).toFixed(1),
                isNew: item.is_new || Math.random() > 0.7
            }));
        } else {
            // Fallback данные если таблица пустая
            products = [
                { 
                    id: "1", 
                    name: "Куриный суп", 
                    price: 25, 
                    category: "Горячее", 
                    icon: "fas fa-utensil-spoon",
                    calories: 150,
                    allergens: ['gluten'],
                    isVegetarian: false,
                    isGlutenFree: false,
                    rating: "4.5",
                    isNew: true
                },
                { 
                    id: "2", 
                    name: "Гречневая каша", 
                    price: 30, 
                    category: "Горячее", 
                    icon: "fas fa-apple-alt",
                    calories: 200,
                    allergens: [],
                    isVegetarian: true,
                    isGlutenFree: true,
                    rating: "4.2",
                    isNew: false
                },
                { 
                    id: "3", 
                    name: "Кока-кола", 
                    price: 15, 
                    category: "Напитки", 
                    icon: "fas fa-wine-bottle",
                    calories: 139,
                    allergens: [],
                    isVegetarian: true,
                    isGlutenFree: true,
                    rating: "4.0",
                    isNew: false
                },
                { 
                    id: "4", 
                    name: "Сок апельсиновый", 
                    price: 12, 
                    category: "Напитки", 
                    icon: "fas fa-wine-glass-alt",
                    calories: 45,
                    allergens: [],
                    isVegetarian: true,
                    isGlutenFree: true,
                    rating: "4.3",
                    isNew: true
                },
                { 
                    id: "5", 
                    name: "Шоколадный торт", 
                    price: 35, 
                    category: "Десерты", 
                    icon: "fas fa-birthday-cake",
                    calories: 450,
                    allergens: ['milk', 'eggs'],
                    isVegetarian: true,
                    isGlutenFree: false,
                    rating: "4.8",
                    isNew: true
                },
                { 
                    id: "6", 
                    name: "Греческий салат", 
                    price: 28, 
                    category: "Салаты", 
                    icon: "fas fa-leaf",
                    calories: 180,
                    allergens: [],
                    isVegetarian: true,
                    isGlutenFree: true,
                    rating: "4.4",
                    isNew: false
                }
            ];
        }
    } catch (error) {
        console.error('Ошибка загрузки продуктов:', error);
        showNotification('Ошибка загрузки меню', 'error');
    }
}

function getCategoryIcon(categoryName) {
    const icons = {
        'Горячее': 'fas fa-utensils',
        'Напитки': 'fas fa-coffee',
        'Салаты': 'fas fa-leaf',
        'Десерты': 'fas fa-ice-cream'
    };
    return icons[categoryName] || 'fas fa-utensils';
}

function updateProfile() {
    if (!currentUser) {
        goTo('login');
        return;
    }

    const hour = new Date().getHours();
    let greeting = 'ДОБРЫЙ ВЕЧЕР';
    if (hour < 12) greeting = 'ДОБРОЕ УТРО';
    else if (hour < 18) greeting = 'ДОБРЫЙ ДЕНЬ';

    document.getElementById('welcome').textContent = `${greeting}, ${currentUser.username.toUpperCase()}`;

    // Анимация изменения баланса
    const balanceElement = document.getElementById('balance');
    const currentBalance = parseFloat(balanceElement.textContent) || 0;
    const newBalance = (currentUser.balance || 0).toFixed(2);

    if (currentBalance !== parseFloat(newBalance)) {
        animateValue(balanceElement, currentBalance, parseFloat(newBalance), 1000);
    } else {
        balanceElement.textContent = `${newBalance} ₴`;
    }

    // Цвет баланса должен меняться в зависимости от темы - всегда использовать текущий primary цвет
    balanceElement.style.color = 'var(--primary-color)';
    if (currentUser.balance === 0) {
        balanceElement.classList.add('pulse');
    } else {
        balanceElement.classList.remove('pulse');
    }

    // Заполняем все поля личных данных
    document.getElementById('profile-name').textContent = currentUser.full_name || '-';
    document.getElementById('profile-age').textContent = currentUser.age || calculateAgeFromClass(currentUser.class_name) || '-';
    document.getElementById('profile-parents').textContent = currentUser.parents || 'Не указано';
    document.getElementById('profile-grade').textContent = currentUser.class_name || '-';
}

// Вспомогательная функция для расчета возраста по классу
function calculateAgeFromClass(className) {
    if (!className) return null;

    // Обрабатываем разные форматы классов
    const classLower = className.toLowerCase();

    // Старшие классы (8-11)
    if (classLower.includes('8') || classLower.includes('восьмой')) return '13-14 лет';
    if (classLower.includes('9') || classLower.includes('девятый')) return '14-15 лет';
    if (classLower.includes('10') || classLower.includes('десятый')) return '15-16 лет';
    if (classLower.includes('11') || classLower.includes('одиннадцатый')) return '16-17 лет';

    // Специальности
    if (classLower.includes('икт') || classLower.includes('информационные технологии')) return '15-17 лет';
    if (classLower.includes('фт') || classLower.includes('физика-техника')) return '15-17 лет';
    if (classLower.includes('хб') || classLower.includes('химия-биология')) return '15-17 лет';
    if (classLower.includes('линг') || classLower.includes('лингвистика')) return '15-17 лет';

    // Младшие классы (5-7)
    const classNumber = parseInt(className.split('-')[0]);
    if (classNumber >= 5 && classNumber <= 7) {
        return (classNumber + 5) + ' лет';
    }

    return null;
}

function editProfile() {
    if (!currentUser) return;
    
    document.getElementById('edit-name').value = currentUser.full_name || '';
    document.getElementById('edit-age').value = currentUser.age || '';
    document.getElementById('edit-parents').value = currentUser.parents || '';
    document.getElementById('edit-grade').value = currentUser.class_name || '';
    
    openModal('edit-profile-modal');
}

async function saveProfile() {
    if (!currentUser) return;
    
    const name = document.getElementById('edit-name').value;
    const age = document.getElementById('edit-age').value;
    const parents = document.getElementById('edit-parents').value;
    const grade = document.getElementById('edit-grade').value;
    
    if (!name || !age || !parents || !grade) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Обновляем данные пользователя локально
        currentUser.full_name = name;
        currentUser.age = age;
        currentUser.parents = parents;
        currentUser.class_name = grade;
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Обновляем в базе данных
        await apiRequest('/api/update-profile', {
            method: 'POST',
            body: {
                full_name: name,
                class_name: grade
            }
        });
        
        updateProfile();
        closeModal('edit-profile-modal');
        showNotification('Профиль успешно обновлен', 'success');
        createSuccessAnimation();
        
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        showNotification('Ошибка обновления профиля', 'error');
    } finally {
        showLoading(false);
    }
}

// Загрузка аватара
document.getElementById('avatar-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // Проверка размера файла
        if (file.size > 2 * 1024 * 1024) { // 2MB
            showNotification('Файл слишком большой. Максимальный размер: 2MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarPreview = document.getElementById('avatar-preview');
            avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Аватар" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            
            // Сохраняем в localStorage для текущего пользователя
            if (currentUser) {
                currentUser.avatar = e.target.result;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            localStorage.setItem(`avatar_${currentUser?.username}`, e.target.result);
            
            showNotification('Аватар успешно обновлен', 'success');
        };
        reader.onerror = function() {
            showNotification('Ошибка загрузки изображения', 'error');
        };
        reader.readAsDataURL(file);
    }
});

// Загрузка аватара при инициализации
function loadAvatar() {
    if (!currentUser) return;

    // Получаем аватар только для текущего пользователя
    const userAvatar = localStorage.getItem(`avatar_${currentUser.username}`);

    if (userAvatar) {
        const avatarPreview = document.getElementById('avatar-preview');
        avatarPreview.innerHTML = `<img src="${userAvatar}" alt="Аватар" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
        // Если аватара нет, показываем стандартный
        const avatarPreview = document.getElementById('avatar-preview');
        avatarPreview.innerHTML = '<i class="fas fa-user-circle" style="font-size: 60px; color: var(--text-secondary);"></i>';
    }
}

// Достижения
function loadAchievements() {
    const container = document.getElementById('achievements-container');
    if (!container) return;
    
    const achievementList = [
        { id: 'first_order', name: 'Первый заказ', icon: 'medal', description: 'Сделайте первый заказ' },
        { id: 'foodie', name: 'Гурман', icon: 'pizza', description: 'Попробуйте 10 разных блюд' },
        { id: 'regular', name: 'Постоянный клиент', icon: 'star', description: 'Сделайте 20 заказов' },
        { id: 'healthy', name: 'Здоровое питание', icon: 'salad', description: 'Закажите 5 салатов' },
        { id: 'sweet_tooth', name: 'Сладкоежка', icon: 'cake', description: 'Попробуйте все десерты' }
    ];
    
    container.innerHTML = '';
    
    achievementList.forEach(achievement => {
        const isUnlocked = achievements.includes(achievement.id);
        const achievementElement = document.createElement('div');
        achievementElement.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        achievementElement.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
        `;
        
        if (isUnlocked) {
            achievementElement.title = achievement.description;
        }
        
        container.appendChild(achievementElement);
    });
}

function unlockAchievement(achievementId) {
    if (!achievements.includes(achievementId)) {
        achievements.push(achievementId);
        localStorage.setItem('achievements', JSON.stringify(achievements));
        
        const achievement = getAchievementById(achievementId);
        if (achievement) {
            showAchievementNotification(achievement);
        }
        
        loadAchievements();
    }
}

function getAchievementById(id) {
    const achievements = {
        'first_order': { name: 'Первый заказ', icon: 'medal', description: 'Вы сделали свой первый заказ!' },
        'foodie': { name: 'Гурман', icon: 'pizza', description: 'Вы попробовали 10 разных блюд!' },
        'regular': { name: 'Постоянный клиент', icon: 'star', description: '20 заказов - вы настоящий постоянный клиент!' },
        'healthy': { name: 'Здоровое питание', icon: 'salad', description: '5 салатов - вы заботитесь о здоровье!' },
        'sweet_tooth': { name: 'Сладкоежка', icon: 'cake', description: 'Вы попробовали все наши десерты!' }
    };
    
    return achievements[id];
}

function showAchievementNotification(achievement) {
    const notification = document.getElementById('achievement-notification');
    const text = document.getElementById('achievement-text');
    
    text.textContent = achievement.description;
    notification.querySelector('i').className = '';
    notification.querySelector('i').textContent = achievement.icon;
    notification.querySelector('h4').textContent = achievement.name;
    
    notification.classList.add('active');
    
    setTimeout(() => {
        notification.classList.remove('active');
    }, 5000);
}

// Диаграмма калорий
function loadCaloriesChart() {
    const ctx = document.getElementById('caloriesChart');
    if (!ctx) return;

    const ctx2d = ctx.getContext('2d');
    if (!ctx2d) return;

    // Очищаем предыдущий график если он существует
    if (window.caloriesChart) {
        window.caloriesChart.destroy();
    }

    // Проверяем есть ли данные о заказах
    const hasOrderData = currentUser && currentUser.orders && currentUser.orders.length > 0;

    const data = {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        datasets: [{
            label: 'Калории',
            data: hasOrderData ? [1200, 1900, 1500, 2100, 1800, 2300, 1600] : [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(0, 179, 119, 0.2)',
            borderColor: 'rgba(0, 179, 119, 1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };

    try {
        window.caloriesChart = new Chart(ctx2d, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: hasOrderData ? undefined : 1000,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: !hasOrderData,
                        text: 'Нет данных о заказах',
                        font: {
                            size: 14
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    } catch (error) {
        console.error('Ошибка создания графика:', error);
        // Показываем сообщение об ошибке
        ctx2d.font = '16px Arial';
        ctx2d.fillStyle = '#666';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('Ошибка загрузки графика', ctx.width / 2, ctx.height / 2);
    }
}

// Избранное
function loadFavorites() {
    const container = document.getElementById('favorites-container');
    const emptyState = document.getElementById('empty-favorites');
    
    if (favorites.size === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'flex';
    emptyState.style.display = 'none';
    container.innerHTML = '';
    
    Array.from(favorites).forEach(productId => {
        const product = products.find(p => p.id === productId);
        if (product) {
            const favoriteItem = document.createElement('div');
            favoriteItem.className = 'favorite-item';
            favoriteItem.innerHTML = `
                <div class="item-image">
                    <i class="${product.icon}"></i>
                </div>
                <div class="item-name">${product.name}</div>
                <div class="item-price">${product.price} ₴</div>
                <button class="btn-primary btn-particle" onclick="addToCart('${product.id}')">
                    <i class="fas fa-cart-plus"></i>
                    В корзину
                </button>
            `;
            container.appendChild(favoriteItem);
        }
    });
}

function toggleFavorite(productId) {
    if (favorites.has(productId)) {
        favorites.delete(productId);
    } else {
        favorites.add(productId);
    }
    
    localStorage.setItem('favorites', JSON.stringify(Array.from(favorites)));
    updateFavoriteButton(productId);
    
    if (favorites.has(productId)) {
        showNotification('Добавлено в избранное', 'success');
    }
}

function updateFavoriteButton(productId) {
    const button = document.querySelector(`.favorite-btn[data-product="${productId}"]`);
    if (button) {
        button.classList.toggle('active', favorites.has(productId));
    }
}

// Функции для работы с ассортиментом
function initializeAssortment() {
    const container = document.getElementById('items-container');
    if (!container) return;
    
    // Показываем скелетоны загрузки
    container.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'item-card skeleton skeleton-item';
        container.appendChild(skeleton);
    }
    
    // Загружаем продукты с задержкой для демонстрации
    setTimeout(() => {
        container.innerHTML = '';
        
        products.forEach((product, index) => {
            setTimeout(() => {
                const quantity = cart[product.id] || 0;
                const isFavorite = favorites.has(product.id);
                
                const itemCard = document.createElement('div');
                itemCard.className = 'item-card';
                itemCard.setAttribute('data-category', product.category);
                itemCard.setAttribute('data-vegetarian', product.isVegetarian);
                itemCard.setAttribute('data-gluten-free', product.isGlutenFree);
                itemCard.setAttribute('data-price', product.price);
                itemCard.setAttribute('data-calories', product.calories);
                
                itemCard.innerHTML = `
                    ${product.isNew ? '<div class="new-badge">NEW</div>' : ''}
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            data-product="${product.id}" 
                            onclick="toggleFavorite('${product.id}')">
                        <i class="fas fa-heart"></i>
                    </button>
                    <div class="item-image">
                        <i class="${product.icon}"></i>
                    </div>
                    <div class="item-name">${product.name}</div>
                    <div class="item-description">${product.description || ''}</div>
                    
                    <!-- Аллергены -->
                    <div class="allergens">
                        ${product.allergens.map(allergen => `
                            <div class="allergen ${allergen}" title="${getAllergenName(allergen)}">
                                <i class="fas fa-exclamation-circle"></i>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Рейтинг -->
                    <div class="rating">
                        ${generateStarRating(product.rating)}
                    </div>
                    
                    <div class="item-price">${product.price} ₴</div>
                    <div class="item-calories">${product.calories} ккал</div>
                    <div class="item-actions">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="decreaseQuantity('${product.id}')" ${quantity === 0 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity" id="quantity-${product.id}">${quantity}</span>
                            <button class="quantity-btn" onclick="increaseQuantity('${product.id}')">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="add-to-cart" onclick="addToCart('${product.id}')" ${quantity > 0 ? 'style="display:none"' : ''}>
                            <i class="fas fa-cart-plus"></i>
                        </button>
                    </div>
                `;
                container.appendChild(itemCard);
                slideIn(itemCard, 'up');
            }, index * 100);
        });
        
        // Инициализация долгого нажатия
        initLongPress();
        
    }, 1000);
    
    document.getElementById('search-input').addEventListener('input', filterProducts);
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterProducts();
        });
    });
}

function getAllergenName(allergen) {
    const names = {
        'milk': 'Молочные продукты',
        'nuts': 'Орехи',
        'gluten': 'Глютен',
        'eggs': 'Яйца'
    };
    return names[allergen] || allergen;
}

function generateStarRating(rating) {
    const stars = [];
    const numericRating = parseFloat(rating);
    
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(numericRating)) {
            stars.push('<i class="fas fa-star star"></i>');
        } else if (i === Math.ceil(numericRating) && numericRating % 1 !== 0) {
            stars.push('<i class="fas fa-star-half-alt star"></i>');
        } else {
            stars.push('<i class="far fa-star star"></i>');
        }
    }
    
    return stars.join('');
}

// Долгое нажатие
function initLongPress() {
    let pressTimer;
    
    document.addEventListener('mousedown', e => {
        const addButton = e.target.closest('.add-to-cart');
        if (addButton) {
            pressTimer = setTimeout(() => {
                const productId = addButton.closest('.item-card').querySelector('.favorite-btn').dataset.product;
                addMultipleToCart(productId, 5);
            }, 1000);
        }
    });
    
    document.addEventListener('mouseup', () => {
        clearTimeout(pressTimer);
    });
    
    document.addEventListener('touchstart', e => {
        const addButton = e.target.closest('.add-to-cart');
        if (addButton) {
            pressTimer = setTimeout(() => {
                const productId = addButton.closest('.item-card').querySelector('.favorite-btn').dataset.product;
                addMultipleToCart(productId, 5);
            }, 1000);
        }
    });
    
    document.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
    });
}

function addMultipleToCart(productId, quantity) {
    for (let i = 0; i < quantity; i++) {
        addToCart(productId);
    }
    showNotification(`Добавлено ${quantity} шт. в корзину`, 'success');
}

// Фильтрация и поиск
function filterProducts() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const activeCategory = document.querySelector('.category-btn.active')?.getAttribute('data-category') || 'all';
    const isVegetarian = document.getElementById('filter-vegetarian')?.checked || false;
    const isGlutenFree = document.getElementById('filter-gluten-free')?.checked || false;
    const maxPrice = parseInt(document.getElementById('price-slider')?.value || 150);

    const container = document.getElementById('items-container');
    if (!container) return;

    const allItems = container.querySelectorAll('.item-card');

    let visibleItems = 0;

    allItems.forEach((item, index) => {
        const itemName = item.querySelector('.item-name')?.textContent.toLowerCase() || '';
        const itemCategory = item.getAttribute('data-category') || '';
        const itemVegetarian = item.getAttribute('data-vegetarian') === 'true';
        const itemGlutenFree = item.getAttribute('data-gluten-free') === 'true';
        const itemPrice = parseFloat(item.getAttribute('data-price')) || 0;

        const matchesSearch = itemName.includes(searchTerm);
        const matchesCategory = activeCategory === 'all' || itemCategory === activeCategory;
        const matchesVegetarian = !isVegetarian || itemVegetarian;
        const matchesGlutenFree = !isGlutenFree || itemGlutenFree;
        const matchesPrice = itemPrice <= maxPrice;

        if (matchesSearch && matchesCategory && matchesVegetarian && matchesGlutenFree && matchesPrice) {
            item.style.display = 'block';
            visibleItems++;
            setTimeout(() => {
                slideIn(item, 'up');
            }, index * 50);
        } else {
            item.style.display = 'none';
        }
    });

    // Показываем сообщение если ничего не найдено
    const noResults = document.getElementById('no-results-message');
    if (!noResults && visibleItems === 0 && container.children.length > 0) {
        const message = document.createElement('div');
        message.id = 'no-results-message';
        message.className = 'no-results';
        message.innerHTML = `
            <i class="fas fa-search"></i>
            <h3>Ничего не найдено</h3>
            <p>Попробуйте изменить параметры поиска или фильтры</p>
        `;
        container.appendChild(message);
    } else if (noResults && visibleItems > 0) {
        noResults.remove();
    }

    highlightSearchText(searchTerm);
}

function highlightSearchText(searchTerm) {
    if (!searchTerm) return;
    
    const items = document.querySelectorAll('.item-name');
    items.forEach(item => {
        const text = item.textContent;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        const highlighted = text.replace(regex, '<span class="highlighted">$1</span>');
        item.innerHTML = highlighted;
    });
}

// Автоподсказки поиска
document.getElementById('search-input').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const suggestions = document.getElementById('search-suggestions');
    
    if (searchTerm.length < 2) {
        suggestions.style.display = 'none';
        return;
    }
    
    const matchingProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm)
    ).slice(0, 5);
    
    if (matchingProducts.length > 0) {
        suggestions.innerHTML = '';
        matchingProducts.forEach(product => {
            const suggestion = document.createElement('div');
            suggestion.className = 'search-suggestion';
            suggestion.textContent = product.name;
            suggestion.addEventListener('click', () => {
                this.value = product.name;
                suggestions.style.display = 'none';
                filterProducts();
            });
            suggestions.appendChild(suggestion);
        });
        suggestions.style.display = 'block';
    } else {
        suggestions.style.display = 'none';
    }
});

// Скрытие подсказок при клике вне поиска
document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-bar')) {
        document.getElementById('search-suggestions').style.display = 'none';
    }
});

// Сортировка
function sortProducts() {
    const sortBy = document.getElementById('sort-select').value;
    const container = document.getElementById('items-container');
    const items = Array.from(container.querySelectorAll('.item-card'));
    
    items.sort((a, b) => {
        switch(sortBy) {
            case 'price_asc':
                return parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price'));
            case 'price_desc':
                return parseFloat(b.getAttribute('data-price')) - parseFloat(a.getAttribute('data-price'));
            case 'calories':
                return parseFloat(b.getAttribute('data-calories')) - parseFloat(a.getAttribute('data-calories'));
            case 'popular':
                // Здесь можно добавить логику популярности
                return 0;
            default:
                return 0;
        }
    });
    
    container.innerHTML = '';
    items.forEach((item, index) => {
        container.appendChild(item);
        setTimeout(() => {
            slideIn(item, 'up');
        }, index * 50);
    });
}

// Панель фильтров
function toggleFilterPanel() {
    const panel = document.getElementById('filter-panel');
    panel.classList.toggle('active');
}

function updatePriceRange() {
    const slider = document.getElementById('price-slider');
    const currentPrice = document.getElementById('current-price');
    currentPrice.textContent = slider.value + ' ₴';
    applyFilters();
}

function applyFilters() {
    filterProducts();
}

// Функции для работы с корзиной
function addToCart(productId) {
    if (!currentUser) {
        showNotification('Для добавления товаров в корзину необходимо войти в систему', 'error');
        goTo('login');
        return;
    }
    
    if (!cart[productId]) {
        cart[productId] = 0;
    }
    cart[productId]++;
    
    // Анимация добавления в корзину
    animateAddToCart(productId);
    updateCart();
    
    const product = products.find(p => p.id === productId);
    if (product) {
        showNotification(`"${product.name}" добавлен в корзину`, 'success');
    }
    
    // Разблокировка достижения "Первый заказ"
    if (Object.keys(cart).length === 1) {
        unlockAchievement('first_order');
    }
}

function animateAddToCart(productId) {
    const productElement = document.querySelector(`.item-card[data-product="${productId}"]`);
    const cartIcon = document.getElementById('cart-icon');
    
    if (productElement && cartIcon) {
        const productRect = productElement.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();
        
        const flyingItem = document.createElement('div');
        flyingItem.className = 'flying-item';
        flyingItem.innerHTML = '<i class="fas fa-utensils"></i>';
        flyingItem.style.cssText = `
            position: fixed;
            left: ${productRect.left + productRect.width / 2}px;
            top: ${productRect.top + productRect.height / 2}px;
            font-size: 20px;
            color: var(--primary-color);
            z-index: 10000;
            pointer-events: none;
        `;
        
        document.body.appendChild(flyingItem);
        
        const tx = cartRect.left - productRect.left;
        const ty = cartRect.top - productRect.top;
        
        flyingItem.style.setProperty('--tx', tx + 'px');
        flyingItem.style.setProperty('--ty', ty + 'px');
        
        setTimeout(() => {
            flyingItem.remove();
        }, 1000);
    }
    
    // Тряска корзины
    cartIcon.classList.add('shake');
    setTimeout(() => {
        cartIcon.classList.remove('shake');
    }, 500);
}

function increaseQuantity(productId) {
    if (!cart[productId]) {
        cart[productId] = 0;
    }
    cart[productId]++;
    updateCart();
    
    // Анимация
    const quantityElement = document.getElementById(`quantity-${productId}`);
    quantityElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
        quantityElement.style.transform = 'scale(1)';
    }, 200);
}

function decreaseQuantity(productId) {
    if (cart[productId] && cart[productId] > 0) {
        cart[productId]--;
        if (cart[productId] === 0) {
            delete cart[productId];
        }
    }
    updateCart();
}

function updateCart() {
    const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const cartCount = document.getElementById('cart-count');
    const mobileCartCount = document.getElementById('mobile-cart-count');
    
    // Анимация изменения количества
    if (parseInt(cartCount.textContent) !== totalItems) {
        cartCount.style.transform = 'scale(1.3)';
        setTimeout(() => {
            cartCount.style.transform = 'scale(1)';
        }, 300);
    }
    
    cartCount.textContent = totalItems;
    mobileCartCount.textContent = totalItems;
    
    // Пульсация корзины при >5 товарах
    const cartIcon = document.getElementById('cart-icon');
    if (totalItems > 5) {
        cartIcon.classList.add('pulse');
    } else {
        cartIcon.classList.remove('pulse');
    }
    
    products.forEach(product => {
        const quantityElement = document.getElementById(`quantity-${product.id}`);
        if (quantityElement) {
            const quantity = cart[product.id] || 0;
            quantityElement.textContent = quantity;
            
            const addButton = quantityElement.closest('.item-actions').querySelector('.add-to-cart');
            const decreaseButton = quantityElement.closest('.quantity-controls').querySelector('.quantity-btn:first-child');
            
            if (quantity > 0) {
                addButton.style.display = 'none';
                decreaseButton.disabled = false;
            } else {
                addButton.style.display = 'block';
                decreaseButton.disabled = true;
            }
        }
    });
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartSummary();
}

function updateCartSummary() {
    const cartSummary = document.getElementById('cart-summary');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const discountAmount = document.getElementById('discount-amount');
    const finalTotal = document.getElementById('final-total');
    const cartDiscount = document.getElementById('cart-discount');
    const cartFinal = document.getElementById('cart-final');
    const emptyCart = document.getElementById('empty-cart');
    const totalCalories = document.getElementById('total-calories');
    
    if (Object.keys(cart).length > 0) {
        cartSummary.classList.add('active');
        emptyCart.classList.remove('active');
    } else {
        cartSummary.classList.remove('active');
        emptyCart.classList.add('active');
        return;
    }
    
    cartItems.innerHTML = '';
    let total = 0;
    let calories = 0;
    
    Object.keys(cart).forEach((productId, index) => {
        const product = products.find(p => p.id == productId);
        if (product && cart[productId] > 0) {
            const itemTotal = product.price * cart[productId];
            const itemCalories = product.calories * cart[productId];
            total += itemTotal;
            calories += itemCalories;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <span class="cart-item-name">${product.name}</span>
                    <span class="cart-item-price">${product.price} ₴ x ${cart[productId]}</span>
                </div>
                <div class="cart-item-controls">
                    <span class="cart-item-total">${itemTotal} ₴</span>
                    <button class="btn-clear" onclick="removeFromCart('${productId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            cartItems.appendChild(cartItem);
            
            setTimeout(() => {
                slideIn(cartItem, 'right');
            }, index * 50);
        }
    });
    
    totalCalories.textContent = calories;
    promoDiscount = activePromo ? (total * (activePromo.discount_percentage || activePromo.discount_percent) / 100) : 0;
    const finalAmount = total - promoDiscount;
    
    // Анимация изменения сумм
    animateValue(cartTotal, parseFloat(cartTotal.textContent) || 0, total, 500);
    
    if (activePromo) {
        cartDiscount.style.display = 'flex';
        animateValue(discountAmount, parseFloat(discountAmount.textContent) || 0, promoDiscount, 500);
        cartFinal.style.display = 'flex';
        animateValue(finalTotal, parseFloat(finalTotal.textContent) || 0, finalAmount, 500);
    } else {
        cartDiscount.style.display = 'none';
        cartFinal.style.display = 'none';
    }
}

function removeFromCart(productId) {
    const product = products.find(p => p.id === productId);
    delete cart[productId];
    updateCart();
    
    if (product) {
        showNotification(`"${product.name}" удален из корзины`, 'info');
    }
}

function clearCart() {
    // Анимация очистки
    createGlassBreakEffect();
    
    cart = {};
    activePromo = null;
    promoDiscount = 0;
    updateCart();
    showNotification('Корзина очищена', 'info');
}

function createGlassBreakEffect() {
    const container = document.createElement('div');
    container.className = 'glass-break';
    
    for (let i = 0; i < 20; i++) {
        const shard = document.createElement('div');
        shard.className = 'glass-shard';
        shard.style.cssText = `
            left: ${Math.random() * 100}vw;
            top: ${Math.random() * 100}vh;
            width: ${Math.random() * 30 + 10}px;
            height: ${Math.random() * 30 + 10}px;
            background: hsl(${Math.random() * 360}, 70%, 70%);
            animation-delay: ${Math.random() * 0.5}s;
        `;
        container.appendChild(shard);
    }
    
    document.body.appendChild(container);
    
    setTimeout(() => {
        container.remove();
    }, 1000);
}

// Промокоды
async function applyPromo() {
    const promoCode = document.getElementById('promo-code').value.trim().toUpperCase();
    const promoMessage = document.getElementById('promo-message');
    
    if (!promoCode) {
        promoMessage.textContent = 'Введите промокод';
        promoMessage.className = 'promo-message error';
        return;
    }
    
    try {
        const data = await apiRequest('/api/validate-promo', {
            method: 'POST',
            body: { code: promoCode }
        });
        
        if (!data.valid) {
            promoMessage.textContent = data.message;
            promoMessage.className = 'promo-message error';
            return;
        }
        
        activePromo = data.promo;
        updateCartSummary();
        
        const discountPercent = activePromo.discount_percentage || activePromo.discount_percent;
        promoMessage.textContent = `Промокод применен! Скидка ${discountPercent}%`;
        promoMessage.className = 'promo-message success';
        
        // Анимация успешного применения
        const promoInput = document.querySelector('.promo-input');
        promoInput.style.borderColor = '#00b377';
        setTimeout(() => {
            promoInput.style.borderColor = '';
        }, 2000);
        
        showNotification(`Промокод "${promoCode}" применен! Скидка ${discountPercent}%`, 'success');
        createPromoAnimation();
        
    } catch (error) {
        console.error('Ошибка применения промокода:', error);
        promoMessage.textContent = 'Ошибка применения промокода';
        promoMessage.className = 'promo-message error';
    }
}

async function showPromoModal() {
    try {
        // Для простоты покажем статические промокоды
        const promoList = document.getElementById('promo-list');
        promoList.innerHTML = '';
        
        const promoCodes = [
            { code: 'WELCOME10', discount_percentage: 10, expires_at: '2025-12-31' },
            { code: 'STUDENT15', discount_percentage: 15, expires_at: '2025-12-31' },
            { code: 'SUMMER20', discount_percentage: 20, expires_at: '2025-08-31' }
        ];
        
        promoCodes.forEach((promo, index) => {
            setTimeout(() => {
                const promoItem = document.createElement('div');
                promoItem.className = 'promo-item';
                promoItem.innerHTML = `
                    <div class="promo-code">${promo.code}</div>
                    <div class="promo-discount">Скидка ${promo.discount_percentage}%</div>
                    <div class="promo-expires">Действует до: ${new Date(promo.expires_at).toLocaleDateString('ru-RU')}</div>
                `;
                promoList.appendChild(promoItem);
                slideIn(promoItem, 'up');
            }, index * 100);
        });
        
        openModal('promo-modal');
    } catch (error) {
        console.error('Ошибка загрузки промокодов:', error);
        showNotification('Ошибка загрузки промокодов', 'error');
    }
}

// Оформление заказа
async function placeOrder() {
    if (!currentUser) {
        showNotification('Для оформления заказа необходимо войти в систему', 'error');
        goTo('login');
        return;
    }
    
    if (Object.keys(cart).length === 0) {
        showNotification('Корзина пуста', 'error');
        return;
    }
    
    let total = 0;
    const orderItems = [];
    
    // Формируем элементы заказа
    for (const productId in cart) {
        const product = products.find(p => p.id == productId);
        if (product && cart[productId] > 0) {
            const itemTotal = product.price * cart[productId];
            total += itemTotal;
            
            orderItems.push({
                meal_id: productId,
                quantity: cart[productId],
                unit_price: product.price,
                total_price: itemTotal
            });
        }
    }
    
    // Применяем скидку
    const finalAmount = total - promoDiscount;
    
    // Проверяем баланс
    if (currentUser.balance < finalAmount) {
        showNotification('Недостаточно средств на балансе', 'error');
        goTo('payment');
        return;
    }
    
    showLoading(true);
    
    try {
        const data = await apiRequest('/api/orders', {
            method: 'POST',
            body: {
                items: orderItems,
                promocode_id: activePromo?.id,
                total_amount: total,
                discount_amount: promoDiscount,
                final_amount: finalAmount
            }
        });
        
        // Обновляем баланс пользователя
        currentUser.balance -= finalAmount;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Показываем детали заказа
        const orderDetailsList = document.getElementById('order-details-list');
        orderDetailsList.innerHTML = '';
        
        orderItems.forEach((item, index) => {
            setTimeout(() => {
                const product = products.find(p => p.id == item.meal_id);
                if (product) {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'order-detail-item';
                    itemElement.innerHTML = `
                        <span>${product.name} x${item.quantity}</span>
                        <span>${item.total_price} ₴</span>
                    `;
                    orderDetailsList.appendChild(itemElement);
                    slideIn(itemElement, 'up');
                }
            }, index * 100);
        });
        
        if (activePromo) {
            setTimeout(() => {
                const discountElement = document.createElement('div');
                discountElement.className = 'order-detail-item';
                discountElement.innerHTML = `
                    <span>Скидка по промокоду ${activePromo.code}</span>
                    <span>-${promoDiscount} ₴</span>
                `;
                orderDetailsList.appendChild(discountElement);
                slideIn(discountElement, 'up');
            }, orderItems.length * 100);
        }
        
        setTimeout(() => {
            const totalElement = document.createElement('div');
            totalElement.className = 'order-detail-total';
            totalElement.innerHTML = `
                <span>Итого:</span>
                <span>${finalAmount} ₴</span>
            `;
            orderDetailsList.appendChild(totalElement);
            slideIn(totalElement, 'up');
        }, (orderItems.length + 1) * 100);
        
        // Запускаем конфетти
        startConfetti();
        createConfettiAnimation();
        
        // Очищаем корзину
        clearCart();
        
        // Переходим на экран благодарности
        setTimeout(() => {
            goTo('Thx');
        }, 500);
        
    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        showNotification(error.message || 'Ошибка оформления заказа. Попробуйте еще раз.', 'error');
    } finally {
        showLoading(false);
    }
}

// Конфетти
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confettiPieces = [];
    const colors = ['#00b377', '#667eea', '#764ba2', '#ff4757', '#ffa502'];
    
    // Создаем конфетти
    for (let i = 0; i < 150; i++) {
        confettiPieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 2,
            angle: Math.random() * 360,
            rotation: Math.random() * 5
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let activePieces = 0;
        
        confettiPieces.forEach(piece => {
            piece.y += piece.speed;
            piece.x += Math.sin(piece.angle) * 2;
            piece.angle += 0.1;
            piece.rotation += piece.speed * 0.1;
            
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
            ctx.restore();
            
            if (piece.y < canvas.height) {
                activePieces++;
            }
        });
        
        if (activePieces > 0) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
    
    // Очистка через 5 секунд
    setTimeout(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
}

// Анимации "хлопушки"
function createConfettiAnimation() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-animation';
    confetti.innerHTML = 'confetti';
    confetti.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 4em;
        z-index: 10000;
        pointer-events: none;
        animation: confettiPop 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    `;
    document.body.appendChild(confetti);

    setTimeout(() => {
        confetti.remove();
    }, 800);
}

function createSuccessAnimation() {
    const success = document.createElement('div');
    success.className = 'confetti-animation';
    success.innerHTML = 'success';
    success.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 4em;
        z-index: 10000;
        pointer-events: none;
        animation: confettiPop 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    `;
    document.body.appendChild(success);

    setTimeout(() => {
        success.remove();
    }, 800);
}

function createLoginAnimation() {
    const login = document.createElement('div');
    login.className = 'confetti-animation';
    login.innerHTML = 'hello';
    login.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 4em;
        z-index: 10000;
        pointer-events: none;
        animation: confettiPop 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    `;
    document.body.appendChild(login);

    setTimeout(() => {
        login.remove();
    }, 800);
}

function createPromoAnimation() {
    const promo = document.createElement('div');
    promo.className = 'confetti-animation';
    promo.innerHTML = 'gift';
    promo.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 4em;
        z-index: 10000;
        pointer-events: none;
        animation: confettiPop 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    `;
    document.body.appendChild(promo);

    setTimeout(() => {
        promo.remove();
    }, 800);
}

// Прогресс-бар готовности заказа
function startCountdown() {
    let timeLeft = 20;
    const countdownElement = document.querySelector('.countdown');
    const progressBar = document.getElementById('order-progress');
    
    const countdown = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;
        
        // Обновляем прогресс-бар
        const progress = ((20 - timeLeft) / 20) * 100;
        progressBar.style.width = progress + '%';
        
        // Анимация изменения числа
        countdownElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            countdownElement.style.transform = 'scale(1)';
        }, 300);
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
            countdownElement.textContent = '0';
            progressBar.style.width = '100%';
        }
    }, 60000);
}

// Повторить заказ
function repeatOrder() {
    // Здесь можно добавить логику повторения последнего заказа
    showNotification('Функция "Повторить заказ" скоро будет доступна!', 'info');
}

// Поделиться заказом
function shareOrder() {
    if (navigator.share) {
        navigator.share({
            title: 'Мой заказ в РНЛ ЕДА',
            text: 'Посмотрите, что я заказал в столовой лицея!',
            url: window.location.href
        }).then(() => {
            showNotification('Заказ успешно опубликован!', 'success');
        }).catch(() => {
            showNotification('Поделиться не удалось', 'error');
        });
    } else {
        // Fallback для браузеров без поддержки Web Share API
        const shareText = `Мой заказ в РНЛ ЕДА: ${window.location.href}`;
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Ссылка скопирована в буфер обмена!', 'success');
        });
    }
}

// Функции для работы с оплатой
function initializeAmountSelection() {
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.amount-btn').forEach(b => {
                b.classList.remove('active');
                b.style.transform = 'scale(1)';
            });
            this.classList.add('active');
            this.style.transform = 'scale(1.05)';
            selectedAmount = parseInt(this.getAttribute('data-amount'));
            document.getElementById('custom-amount').value = '';
        });
    });
    
    document.getElementById('custom-amount').addEventListener('input', function() {
        if (this.value) {
            document.querySelectorAll('.amount-btn').forEach(b => {
                b.classList.remove('active');
                b.style.transform = 'scale(1)';
            });
            selectedAmount = parseInt(this.value) || 0;
        }
    });
}

function updatePaymentUI() {
    document.querySelectorAll('.amount-btn').forEach(b => {
        b.classList.remove('active');
        b.style.transform = 'scale(1)';
    });
    document.getElementById('custom-amount').value = '';
    selectedAmount = 100;
}

async function processPayment(method) {
    if (!currentUser) {
        showNotification('Для пополнения баланса необходимо войти в систему', 'error');
        goTo('login');
        return;
    }
    
    let amount = selectedAmount;
    const customAmount = document.getElementById('custom-amount').value;
    if (customAmount) {
        amount = parseInt(customAmount);
    }
    
    if (!amount || amount < 10) {
        showNotification('Минимальная сумма пополнения - 10 ₴', 'error');
        return;
    }
    
    if (amount > 1000) {
        showNotification('Максимальная сумма пополнения - 1000 ₴', 'error');
        return;
    }
    
    // Применяем комиссию
    let finalAmount = amount;
    switch(method) {
        case 'crypto':
            finalAmount = amount * 0.99;
            break;
        case 'card':
            finalAmount = amount * 0.975;
            break;
        case 'cash':
            finalAmount = amount;
            break;
    }
    
    showLoading(true);
    
    try {
        const data = await apiRequest('/api/topup', {
            method: 'POST',
            body: {
                amount: finalAmount,
                method: method
            }
        });
        
        // Обновляем данные пользователя
        currentUser.balance = data.new_balance;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Анимация падающих монеток
        createCoinsAnimation(20);
        
        showNotification(`Баланс успешно пополнен на ${finalAmount.toFixed(2)} ₴`, 'success');
        
        // Анимация успешного пополнения
        const balanceElement = document.getElementById('balance');
        balanceElement.style.color = '#00b377';
        setTimeout(() => {
            balanceElement.style.color = '';
        }, 1000);
        
        goTo('profile');
        
    } catch (error) {
        console.error('Ошибка пополнения:', error);
        showNotification('Ошибка пополнения баланса. Попробуйте еще раз.', 'error');
    } finally {
        showLoading(false);
    }
}

function createCoinsAnimation(count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            coin.className = 'coin';
            coin.style.left = Math.random() * 100 + 'vw';
            coin.style.animationDelay = (Math.random() * 0.5) + 's';
            document.body.appendChild(coin);
            
            setTimeout(() => {
                coin.remove();
            }, 1000);
        }, i * 100);
    }
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.target.closest('.btn-copy');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.style.backgroundColor = '#00b377';
        
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-copy"></i>';
            btn.style.backgroundColor = '';
        }, 2000);
        
        showNotification('Скопировано в буфер обмена', 'success');
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
        showNotification('Ошибка копирования', 'error');
    });
}

// Специальные режимы
function toggleParentMode() {
    isParentMode = !isParentMode;
    const btn = document.getElementById('parent-mode');
    
    if (isParentMode) {
        btn.classList.add('active');
        document.body.classList.add('parent-mode');
        showNotification('Режим для родителей активирован', 'success');
    } else {
        btn.classList.remove('active');
        document.body.classList.remove('parent-mode');
        showNotification('Режим для родителей выключен', 'info');
    }
}

function toggleSimpleMode() {
    isSimpleMode = !isSimpleMode;
    document.body.classList.toggle('simple-mode', isSimpleMode);
    
    showNotification(
        isSimpleMode ? 'Упрощённый режим активирован' : 'Упрощённый режим выключен',
        'success'
    );
}

function toggleHighContrast() {
    isHighContrast = !isHighContrast;
    document.body.classList.toggle('high-contrast', isHighContrast);
    
    showNotification(
        isHighContrast ? 'Высококонтрастный режим активирован' : 'Высококонтрастный режим выключен',
        'success'
    );
}

// Случайное блюдо
function showRandomDish() {
    if (products.length === 0) return;
    
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    showNotification(`Попробуйте: ${randomProduct.name} за ${randomProduct.price} ₴!`, 'info');
}

function goToRandomSection() {
    const sections = ['assortment', 'favorites', 'profile'];
    const randomSection = sections[Math.floor(Math.random() * sections.length)];
    goTo(randomSection);
}

// Блюдо дня
function addDailyDishToCart() {
    const dailyDish = products.find(p => p.name === document.getElementById('daily-dish-name').textContent);
    if (dailyDish) {
        addToCart(dailyDish.id);
    }
}

// Таймер блюда дня
function updateDishTimer() {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(20, 0, 0, 0); // 20:00
    
    const diff = endOfDay - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    document.getElementById('dish-timer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

setInterval(updateDishTimer, 60000);
updateDishTimer();

// Улучшенная история заказов
async function loadOrderHistory() {
    if (!currentUser) return;

    try {
        const data = await apiRequest('/api/orders/history?limit=5');

        const historyContainer = document.getElementById('order-history-list');
        if (!historyContainer) return;

        historyContainer.innerHTML = '';

        if (!data.orders || data.orders.length === 0) {
            historyContainer.innerHTML = '<div class="no-orders">Заказов пока нет</div>';
            return;
        }

        data.orders.forEach((order, index) => {
            setTimeout(() => {
                const orderElement = createOrderElement(order);
                historyContainer.appendChild(orderElement);
                slideIn(orderElement, 'up');
            }, index * 100);
        });

    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        showNotification('Ошибка загрузки истории заказов', 'error');
    }
}

async function loadFullOrderHistory() {
    if (!currentUser) return;
    
    try {
        const offset = (currentOrderPage - 1) * ordersPerPage;
        const data = await apiRequest(`/api/orders/history?limit=${ordersPerPage}&offset=${offset}`);
        
        const historyContainer = document.getElementById('full-order-history-list');
        const paginationContainer = document.getElementById('order-history-pagination');
        
        historyContainer.innerHTML = '';
        
        if (!data.orders || data.orders.length === 0) {
            historyContainer.innerHTML = '<div class="no-orders">Заказов пока нет</div>';
            paginationContainer.innerHTML = '';
            return;
        }
        
        data.orders.forEach((order, index) => {
            setTimeout(() => {
                const orderElement = createDetailedOrderElement(order);
                historyContainer.appendChild(orderElement);
                slideIn(orderElement, 'up');
            }, index * 100);
        });
        
        // Пагинация
        updatePagination(paginationContainer, data.total, ordersPerPage, currentOrderPage);
        
    } catch (error) {
        console.error('Ошибка загрузки полной истории:', error);
        showNotification('Ошибка загрузки истории заказов', 'error');
    }
}

function createOrderElement(order) {
    const orderElement = document.createElement('div');
    orderElement.className = 'order-item';
    orderElement.setAttribute('data-order-id', order.id);
    
    const itemsText = order.items ? order.items.map(item => 
        `${item.name} x${item.quantity}`
    ).join(', ') : 'Заказ';
    
    const orderDate = new Date(order.created_at);
    const statusClass = getStatusClass(order.status);
    
    orderElement.innerHTML = `
        <div class="order-info">
            <span class="order-name">${itemsText}</span>
            <span class="order-date">${orderDate.toLocaleDateString('ru-RU')} ${orderDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div class="order-meta">
            <span class="order-status ${statusClass}">${getStatusText(order.status)}</span>
            <span class="order-price">${order.final_amount} ₴</span>
        </div>
    `;
    
    orderElement.addEventListener('click', () => showOrderDetails(order.id));
    return orderElement;
}

function createDetailedOrderElement(order) {
    const orderElement = document.createElement('div');
    orderElement.className = 'detailed-order-item';
    orderElement.setAttribute('data-order-id', order.id);
    
    const orderDate = new Date(order.created_at);
    const statusClass = getStatusClass(order.status);
    
    let itemsHtml = '';
    if (order.items) {
        itemsHtml = order.items.map(item => `
            <div class="order-item-detail">
                <span>${item.name}</span>
                <span>x${item.quantity}</span>
                <span>${item.total_price} ₴</span>
            </div>
        `).join('');
    }
    
    orderElement.innerHTML = `
        <div class="order-header">
            <div class="order-id">Заказ #${order.id.slice(-8)}</div>
            <div class="order-date">${orderDate.toLocaleDateString('ru-RU')} ${orderDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
        <div class="order-body">
            <div class="order-items">
                ${itemsHtml}
            </div>
            <div class="order-summary">
                <div class="order-total">
                    <span>Итого:</span>
                    <span>${order.final_amount} ₴</span>
                </div>
                <div class="order-status ${statusClass}">${getStatusText(order.status)}</div>
            </div>
        </div>
    `;
    
    orderElement.addEventListener('click', () => showOrderDetails(order.id));
    return orderElement;
}

function getStatusClass(status) {
    const statusClasses = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed',
        'preparing': 'status-preparing',
        'ready': 'status-ready',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || 'status-pending';
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'Ожидание',
        'confirmed': 'Подтвержден',
        'preparing': 'Готовится',
        'ready': 'Готов',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
    };
    return statusTexts[status] || status;
}

function updatePagination(container, total, perPage, currentPage) {
    const totalPages = Math.ceil(total / perPage);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHtml = '';
    
    if (currentPage > 1) {
        paginationHtml += `<button class="pagination-btn" onclick="changeOrderPage(${currentPage - 1})">‹</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            paginationHtml += `<button class="pagination-btn active">${i}</button>`;
        } else {
            paginationHtml += `<button class="pagination-btn" onclick="changeOrderPage(${i})">${i}</button>`;
        }
    }
    
    if (currentPage < totalPages) {
        paginationHtml += `<button class="pagination-btn" onclick="changeOrderPage(${currentPage + 1})">›</button>`;
    }
    
    container.innerHTML = paginationHtml;
}

function changeOrderPage(page) {
    currentOrderPage = page;
    loadFullOrderHistory();
}

async function showOrderDetails(orderId) {
    try {
        const order = await apiRequest(`/api/orders/${orderId}`);
        openOrderDetailsModal(order);
    } catch (error) {
        console.error('Ошибка загрузки деталей заказа:', error);
        showNotification('Ошибка загрузки деталей заказа', 'error');
    }
}

function openOrderDetailsModal(order) {
    const modal = document.getElementById('order-details-modal');
    const orderDate = new Date(order.created_at);
    
    let itemsHtml = '';
    if (order.items) {
        itemsHtml = order.items.map(item => `
            <div class="order-detail-item">
                <span>${item.name}</span>
                <span>x${item.quantity}</span>
                <span>${item.total_price} ₴</span>
            </div>
        `).join('');
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Детали заказа #${order.id.slice(-8)}</h3>
                <button class="modal-close" onclick="closeModal('order-details-modal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="order-info-section">
                    <div class="info-row">
                        <span>Дата заказа:</span>
                        <span>${orderDate.toLocaleDateString('ru-RU')} ${orderDate.toLocaleTimeString('ru-RU')}</span>
                    </div>
                    <div class="info-row">
                        <span>Статус:</span>
                        <span class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
                    </div>
                    ${order.promocode ? `
                    <div class="info-row">
                        <span>Промокод:</span>
                        <span>${order.promocode}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="order-items-section">
                    <h4>Состав заказа:</h4>
                    ${itemsHtml}
                </div>
                
                <div class="order-summary-section">
                    <div class="summary-row">
                        <span>Сумма заказа:</span>
                        <span>${order.total_amount} ₴</span>
                    </div>
                    ${order.discount_amount > 0 ? `
                    <div class="summary-row discount">
                        <span>Скидка:</span>
                        <span>-${order.discount_amount} ₴</span>
                    </div>
                    ` : ''}
                    <div class="summary-row total">
                        <span>Итого к оплате:</span>
                        <span>${order.final_amount} ₴</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    openModal('order-details-modal');
}

function showFullOrderHistory() {
    currentOrderPage = 1;
    goTo('order-history');
}

// АДМИН ФУНКЦИИ
async function loadAdminStats() {
    try {
        const data = await apiRequest('/api/admin/stats');
        
        // Анимация чисел
        animateValue(document.getElementById('admin-total-users'), 0, data.users, 1000);
        animateValue(document.getElementById('admin-total-orders'), 0, data.total_orders, 1000);
        animateValue(document.getElementById('admin-today-orders'), 0, data.today_orders, 1000);
        
        document.getElementById('admin-total-revenue').textContent = data.total_revenue.toFixed(2);
        document.getElementById('admin-today-revenue').textContent = data.today_revenue.toFixed(2);
        
        // Популярные блюда
        const popularMealsList = document.getElementById('admin-popular-meals');
        popularMealsList.innerHTML = '';
        
        data.popular_meals.forEach((meal, index) => {
            setTimeout(() => {
                const mealItem = document.createElement('div');
                mealItem.className = 'popular-meal-item';
                mealItem.innerHTML = `
                    <span class="meal-name">${meal.name}</span>
                    <span class="meal-orders">${meal.order_count} заказов</span>
                `;
                popularMealsList.appendChild(mealItem);
                slideIn(mealItem, 'up');
            }, index * 100);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        showNotification('Ошибка загрузки статистики', 'error');
    }
}

async function loadAdminOrders() {
    try {
        const data = await apiRequest('/api/admin/orders');
        
        const ordersContainer = document.getElementById('admin-orders-list');
        ordersContainer.innerHTML = '';
        
        if (data.length === 0) {
            ordersContainer.innerHTML = '<div class="no-orders">Заказов пока нет</div>';
            return;
        }
        
        data.forEach((order, index) => {
            setTimeout(() => {
                const orderElement = createAdminOrderElement(order);
                ordersContainer.appendChild(orderElement);
                slideIn(orderElement, 'up');
            }, index * 100);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        showNotification('Ошибка загрузки заказов', 'error');
    }
}

function createAdminOrderElement(order) {
    const orderElement = document.createElement('div');
    orderElement.className = 'admin-order-item';
    orderElement.innerHTML = `
        <div class="admin-order-header">
            <div class="order-user">
                <strong>${order.full_name}</strong>
                <span>${order.class_name} • ${order.username}</span>
            </div>
            <div class="order-amount">${order.final_amount} ₴</div>
        </div>
        <div class="admin-order-body">
            <div class="order-meta">
                <span class="order-id">#${order.id.slice(-8)}</span>
                <span class="order-date">${new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Ожидание</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Подтвержден</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Готовится</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Готов</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Завершен</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                </select>
            </div>
        </div>
    `;
    
    return orderElement;
}

async function updateOrderStatus(orderId, status) {
    try {
        await apiRequest(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            body: { status }
        });
        
        showNotification('Статус заказа обновлен', 'success');
        
        // Анимация обновления
        const select = event.target;
        select.style.backgroundColor = '#00b377';
        select.style.color = 'white';
        setTimeout(() => {
            select.style.backgroundColor = '';
            select.style.color = '';
        }, 1000);
        
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        showNotification('Ошибка обновления статуса', 'error');
        event.target.value = event.target.getAttribute('data-previous-value');
    }
}

// Вспомогательные функции
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    const icon = notification.querySelector('i');
    
    // Устанавливаем иконку в зависимости от типа
    icon.className = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    }[type] || 'fas fa-info-circle';
    
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    
    // Анимация появления
    notification.style.transform = 'translateX(100%)';
    notification.classList.add('active');
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.classList.remove('active');
        }, 300);
    }, 4000);
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

// Функции для работы с модальными окнами
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    
    // Анимация появления
    const content = modal.querySelector('.modal-content');
    content.style.transform = 'scale(0.8)';
    content.style.opacity = '0';
    
    setTimeout(() => {
        content.style.transform = 'scale(1)';
        content.style.opacity = '1';
    }, 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const content = modal.querySelector('.modal-content');
    
    content.style.transform = 'scale(0.8)';
    content.style.opacity = '0';
    
    setTimeout(() => {
        modal.classList.remove('active');
        content.style.transform = '';
        content.style.opacity = '';
    }, 300);
}

document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// Функция переключения темы
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    if (body.classList.contains('light-theme')) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

function setTheme(theme) {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(theme + '-theme');
    
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
    
    localStorage.setItem('theme', theme);
}

// Загрузка темы при загрузке страницы
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

// Функция для анимации кнопок с частицами
function initParticleButtons() {
    $.fn.boom = function(e) {
        var colors = [
            '#ffb3f6',
            '#7aa0ff',
            '#00b377',
            '#667eea',
            '#764ba2'
        ];
        var shapes = [
            '<polygon class="star" points="21,0,28.053423027509677,11.29179606750063,40.97218684219823,14.510643118126104,32.412678195541844,24.70820393249937,33.34349029814194,37.989356881873896,21,33,8.656509701858067,37.989356881873896,9.587321804458158,24.70820393249937,1.0278131578017735,14.510643118126108,13.94657697249032,11.291796067500632"></polygon>',
            '<polygon class="other-star" points="18,0,22.242640687119284,13.757359312880714,36,18,22.242640687119284,22.242640687119284,18.000000000000004,36,13.757359312880716,22.242640687119284,0,18.000000000000004,13.757359312880714,13.757359312880716"></polygon>',
            '<polygon class="diamond" points="18,0,27.192388155425117,8.80761184457488,36,18,27.19238815542512,27.192388155425117,18.000000000000004,36,8.807611844574883,27.19238815542512,0,18.000000000000004,8.80761184457488,8.807611844574884"></polygon>'
        ];

        var btn = $(this);
        var group = [];
        var num = Math.floor(Math.random() * 20) + 15;

        for(var i = 0; i < num; i++) {
            var randBG = Math.floor(Math.random() * colors.length);
            var getShape = Math.floor(Math.random() * shapes.length);
            var scale = Math.floor(Math.random() * (8 - 4 + 1)) + 4;
            var x = Math.floor(Math.random() * (150 + 100)) - 100;
            var y = Math.floor(Math.random() * (150 + 100)) - 100;
            var sec = Math.floor(Math.random() * 1700) + 1000;
            var shape = $('<svg class="shape">'+shapes[getShape]+'</svg>');
            
            shape.css({
                top: e.pageY - btn.offset().top + 20,
                left: e.pageX - btn.offset().left + 40,
                'transform': 'scale(0.'+scale+')',
                'transition': sec + 'ms',
                'fill': colors[randBG]
            });

            // Создаем контейнер для частиц если его нет
            var particlesContainer = btn.siblings('.btn-particles');
            if (particlesContainer.length === 0) {
                particlesContainer = $('<div class="btn-particles"></div>');
                btn.parent().append(particlesContainer);
            }
            
            particlesContainer.append(shape);
            group.push({shape: shape, x: x, y: y});
        }
        
        for (var a = 0; a < group.length; a++) {
            var shape = group[a].shape;
            var x = group[a].x, y = group[a].y;
            shape.css({
                left: x + 50,
                top: y + 15,
                'transform': 'scale(0)'
            });
        }
        
        setTimeout(function() {
            for (var b = 0; b < group.length; b++) {
                var shape = group[b].shape;
                shape.remove();
            }
            group = [];
        }, 2000);
    };

    // Привязываем анимацию к кнопкам
    $(document).on('click', '.btn-particle', function(e) {
        $(this).boom(e);
        
        // Эффект ripple
        createRippleEffect(e);
    });
}

// Эффект ripple
function createRippleEffect(event) {
    const btn = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - btn.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - btn.getBoundingClientRect().top - radius}px`;
    circle.classList.add('ripple');
    
    const ripple = btn.getElementsByClassName('ripple')[0];
    if (ripple) {
        ripple.remove();
    }
    
    btn.appendChild(circle);
}

// Вибрация для мобильных
function vibrate() {
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
}

// Добавляем вибрацию к важным действиям
document.addEventListener('DOMContentLoaded', function() {
    // Вибрация при добавлении в корзину
    const originalAddToCart = addToCart;
    addToCart = function(productId) {
        vibrate();
        originalAddToCart(productId);
    };
    
    // Вибрация при нажатии кнопок
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-primary') || e.target.closest('.btn-secondary')) {
            vibrate();
        }
    });
});

// Функция показа палитры тем
function showThemePalette() {
    const grid = document.getElementById('theme-palette-grid');
    grid.innerHTML = '';
    
    Object.entries(COLOR_THEMES).forEach(([key, theme]) => {
        const themeOption = document.createElement('div');
        themeOption.className = `theme-option theme-${key} ${currentColorScheme === key ? 'active' : ''}`;
        themeOption.setAttribute('data-theme', key);
        themeOption.innerHTML = `
            <div>${theme.name}</div>
            <div class="theme-preview">
                <div class="color-dot" style="background: ${theme.primary}"></div>
                <div class="color-dot" style="background: ${theme.secondary}"></div>
                <div class="color-dot" style="background: ${theme.accent}"></div>
            </div>
        `;
        
        themeOption.addEventListener('click', () => applyColorTheme(key));
        grid.appendChild(themeOption);
    });
    
    // Загружаем сохранённые кастомные цвета
    loadCustomColors();
    
    openModal('theme-palette-modal');
}

// Функция применения цветовой темы
function applyColorTheme(themeKey) {
    const theme = COLOR_THEMES[themeKey];
    if (!theme) return;
    
    currentColorScheme = themeKey;
    
    // Обновляем CSS переменные
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--primary-dark', theme.primaryDark);
    document.documentElement.style.setProperty('--secondary-color', theme.secondary);
    document.documentElement.style.setProperty('--accent-color', theme.accent);
    
    // Обновляем активную тему в палитре
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`.theme-option[data-theme="${themeKey}"]`).classList.add('active');
    
    // Сохраняем в localStorage
    localStorage.setItem('colorTheme', themeKey);
    localStorage.setItem('customTheme', 'false');
    
    showNotification(`Тема "${theme.name}" применена!`, 'success');
    
    // Анимация смены темы
    animateThemeChange();
}

// Функция применения пользовательской темы
function applyCustomTheme() {
    const primary = document.getElementById('custom-primary').value;
    const secondary = document.getElementById('custom-secondary').value;
    const accent = document.getElementById('custom-accent').value;
    
    // Рассчитываем тёмные версии цветов
    const primaryDark = shadeColor(primary, -20);
    
    // Применяем цвета
    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--primary-dark', primaryDark);
    document.documentElement.style.setProperty('--secondary-color', secondary);
    document.documentElement.style.setProperty('--accent-color', accent);
    
    // Сохраняем кастомные цвета
    localStorage.setItem('customPrimary', primary);
    localStorage.setItem('customSecondary', secondary);
    localStorage.setItem('customAccent', accent);
    localStorage.setItem('customTheme', 'true');
    localStorage.setItem('colorTheme', 'custom');
    
    currentColorScheme = 'custom';
    
    showNotification('Пользовательская тема применена!', 'success');
    animateThemeChange();
    
    // Закрываем модальное окно через секунду
    setTimeout(() => {
        closeModal('theme-palette-modal');
    }, 1000);
}

// Функция для затемнения цвета
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    R = Math.round(R);
    G = Math.round(G);
    B = Math.round(B);

    const RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
}

// Загрузка кастомных цветов
function loadCustomColors() {
    const customPrimary = localStorage.getItem('customPrimary');
    const customSecondary = localStorage.getItem('customSecondary');
    const customAccent = localStorage.getItem('customAccent');
    
    if (customPrimary) {
        document.getElementById('custom-primary').value = customPrimary;
    }
    if (customSecondary) {
        document.getElementById('custom-secondary').value = customSecondary;
    }
    if (customAccent) {
        document.getElementById('custom-accent').value = customAccent;
    }
}

// Загрузка сохранённой темы при запуске
function loadColorTheme() {
    const savedTheme = localStorage.getItem('colorTheme');
    const isCustomTheme = localStorage.getItem('customTheme') === 'true';
    
    if (isCustomTheme) {
        // Загружаем кастомную тему
        const primary = localStorage.getItem('customPrimary') || '#00b377';
        const secondary = localStorage.getItem('customSecondary') || '#667eea';
        const accent = localStorage.getItem('customAccent') || '#764ba2';
        const primaryDark = shadeColor(primary, -20);
        
        document.documentElement.style.setProperty('--primary-color', primary);
        document.documentElement.style.setProperty('--primary-dark', primaryDark);
        document.documentElement.style.setProperty('--secondary-color', secondary);
        document.documentElement.style.setProperty('--accent-color', accent);
        
        currentColorScheme = 'custom';
    } else if (savedTheme && COLOR_THEMES[savedTheme]) {
        // Загружаем предустановленную тему
        applyColorTheme(savedTheme);
    } else {
        // Тема по умолчанию
        applyColorTheme('emerald');
    }
}

// Анимация смены темы
function animateThemeChange() {
    // Добавляем класс анимации к body
    document.body.classList.add('theme-changing');
    
    // Создаем эффект пульсации
    const elements = document.querySelectorAll('.btn-primary, .category-btn.active, .balance-card');
    elements.forEach(el => {
        el.style.transform = 'scale(1.05)';
        setTimeout(() => {
            el.style.transform = 'scale(1)';
        }, 300);
    });
    
    // Убираем класс анимации
    setTimeout(() => {
        document.body.classList.remove('theme-changing');
    }, 1000);
}

// Функция сброса темы к стандартной
function resetToDefaultTheme() {
    localStorage.removeItem('colorTheme');
    localStorage.removeItem('customTheme');
    localStorage.removeItem('customPrimary');
    localStorage.removeItem('customSecondary');
    localStorage.removeItem('customAccent');
    
    applyColorTheme('emerald');
    showNotification('Тема сброшена к стандартной!', 'info');
}

// CSS для анимации смены темы
const themeAnimationCSS = `
<style>
.body.theme-changing {
    transition: all 0.5s ease;
}

.theme-changing .btn-primary,
.theme-changing .category-btn.active,
.theme-changing .balance-card {
    transition: all 0.3s ease;
}

@keyframes themePulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}

.theme-pulse {
    animation: themePulse 0.5s ease;
}
</style>
`;

// Добавляем CSS в документ
document.head.insertAdjacentHTML('beforeend', themeAnimationCSS);
