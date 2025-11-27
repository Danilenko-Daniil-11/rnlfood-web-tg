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
    await loadUserData();
    await loadProducts();
    await initializeAssortment();
    updateCart();
    await loadOrderHistory();
    initializeAmountSelection();
    checkAuth();
    
    // Анимация появления элементов
    document.querySelectorAll('.screen.active .hero, .screen.active .form-container').forEach(el => {
        slideIn(el, 'up');
    });
    
    if (!localStorage.getItem('visited')) {
        showNotification('Добро пожаловать в РНЛ ЕДА! Используйте промокод WELCOME10 для скидки 10%', 'success');
        localStorage.setItem('visited', 'true');
    }
});

// Функции навигации
function goTo(screenId) {
    // Анимация перехода
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        currentScreen.style.opacity = '0';
        currentScreen.style.transform = 'translateY(20px)';
        currentScreen.style.transition = 'all 0.3s ease';
    }
    
    setTimeout(() => {
        document.querySelectorAll(".screen").forEach(s => {
            s.classList.remove("active");
            s.style.opacity = '0';
            s.style.transform = 'translateY(20px)';
        });
        
        const targetScreen = document.getElementById(screenId);
        targetScreen.classList.add("active");
        
        setTimeout(() => {
            targetScreen.style.opacity = '1';
            targetScreen.style.transform = 'translateY(0)';
            
            // Анимация появления контента
            const content = targetScreen.querySelector('.hero, .form-container, .page-header, .profile-header, .success-container');
            if (content) {
                slideIn(content, 'up');
            }
        }, 50);
        
        if (screenId === "start") {
            document.getElementById("authors").style.display = "block";
        } else {
            document.getElementById("authors").style.display = "none";
        }
        
        switch(screenId) {
            case 'profile':
                updateProfile();
                break;
            case 'assortment':
                updateCartSummary();
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
    }, 300);
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
                description: item.description
            }));
        } else {
            // Fallback данные если таблица пустая
            products = [
                { id: "1", name: "Куриный суп", price: 25, category: "Горячее", icon: "fas fa-utensil-spoon" },
                { id: "2", name: "Гречневая каша", price: 30, category: "Горячее", icon: "fas fa-apple-alt" },
                { id: "3", name: "Котлета с пюре", price: 40, category: "Горячее", icon: "fas fa-drumstick-bite" },
                { id: "4", name: "Чай", price: 15, category: "Напитки", icon: "fas fa-coffee" },
                { id: "5", name: "Компот", price: 12, category: "Напитки", icon: "fas fa-glass-whiskey" }
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
    
    // Заполняем все поля личных данных
    document.getElementById('profile-name').textContent = currentUser.full_name || '-';
    document.getElementById('profile-age').textContent = currentUser.age || calculateAgeFromClass(currentUser.class_name) || '-';
    document.getElementById('profile-parents').textContent = currentUser.parents || 'Не указано';
    document.getElementById('profile-grade').textContent = currentUser.class_name || '-';
}

// Вспомогательная функция для расчета возраста по классу
function calculateAgeFromClass(className) {
    if (!className) return null;
    
    // Примерная логика: 5 класс = 10-11 лет, 6 класс = 11-12 и т.д.
    const classNumber = parseInt(className.split('-')[0]);
    if (classNumber >= 5 && classNumber <= 11) {
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
        
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        showNotification('Ошибка обновления профиля', 'error');
    } finally {
        showLoading(false);
    }
}

// Улучшенная история заказов
async function loadOrderHistory() {
    if (!currentUser) return;
    
    try {
        const data = await apiRequest('/api/orders/history?limit=5');
        
        const historyContainer = document.getElementById('order-history-list');
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

// Функции для работы с ассортиментом
function initializeAssortment() {
    const container = document.getElementById('items-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    products.forEach((product, index) => {
        setTimeout(() => {
            const quantity = cart[product.id] || 0;
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            itemCard.setAttribute('data-category', product.category);
            itemCard.innerHTML = `
                <div class="item-image">
                    <i class="${product.icon}"></i>
                </div>
                <div class="item-name">${product.name}</div>
                <div class="item-description">${product.description || ''}</div>
                <div class="item-price">${product.price} ₴</div>
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
    
    document.getElementById('search-input').addEventListener('input', filterProducts);
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterProducts();
        });
    });
}

function filterProducts() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const activeCategory = document.querySelector('.category-btn.active').getAttribute('data-category');
    
    const container = document.getElementById('items-container');
    const allItems = container.querySelectorAll('.item-card');
    
    allItems.forEach((item, index) => {
        const itemName = item.querySelector('.item-name').textContent.toLowerCase();
        const itemCategory = item.getAttribute('data-category');
        
        const matchesSearch = itemName.includes(searchTerm);
        const matchesCategory = activeCategory === 'all' || itemCategory === activeCategory;
        
        if (matchesSearch && matchesCategory) {
            item.style.display = 'block';
            setTimeout(() => {
                slideIn(item, 'up');
            }, index * 50);
        } else {
            item.style.display = 'none';
        }
    });
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
    
    updateCart();
    
    // Анимация добавления в корзину
    const product = products.find(p => p.id === productId);
    if (product) {
        showNotification(`"${product.name}" добавлен в корзину`, 'success');
    }
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
    
    // Анимация изменения количества
    if (parseInt(cartCount.textContent) !== totalItems) {
        cartCount.style.transform = 'scale(1.3)';
        setTimeout(() => {
            cartCount.style.transform = 'scale(1)';
        }, 300);
    }
    
    cartCount.textContent = totalItems;
    
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
    
    if (Object.keys(cart).length > 0) {
        cartSummary.classList.add('active');
    } else {
        cartSummary.classList.remove('active');
        return;
    }
    
    cartItems.innerHTML = '';
    let total = 0;
    
    Object.keys(cart).forEach((productId, index) => {
        const product = products.find(p => p.id == productId);
        if (product && cart[productId] > 0) {
            const itemTotal = product.price * cart[productId];
            total += itemTotal;
            
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
    cart = {};
    activePromo = null;
    promoDiscount = 0;
    updateCart();
    showNotification('Корзина очищена', 'info');
}

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

function startCountdown() {
    let timeLeft = 20;
    const countdownElement = document.querySelector('.countdown');
    
    const countdown = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;
        
        // Анимация изменения числа
        countdownElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            countdownElement.style.transform = 'scale(1)';
        }, 300);
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
            countdownElement.textContent = '0';
        }
    }, 60000);
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

// Добавьте эту функцию в script.js

// Функция переключения темы
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    }
}

// Загрузка темы при загрузке страницы
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    if (savedTheme === 'dark') {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        icon.className = 'fas fa-sun';
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        icon.className = 'fas fa-moon';
    }
}

// Вызовите loadTheme() в функции инициализации
document.addEventListener('DOMContentLoaded', async function() {
    loadTheme(); // Добавьте эту строку
    await loadUserData();
    await loadProducts();
    // ... остальной код инициализации
});

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
    });
}

// Обновите функцию инициализации
document.addEventListener('DOMContentLoaded', async function() {
    loadTheme();
    await loadUserData();
    await loadProducts();
    await initializeAssortment();
    updateCart();
    await loadOrderHistory();
    initializeAmountSelection();
    checkAuth();
    initParticleButtons(); // Добавьте эту строку
    
    // ... остальной код
});
