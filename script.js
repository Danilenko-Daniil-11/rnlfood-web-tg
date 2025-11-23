// Конфигурация API
const API_BASE_URL = window.location.origin;

// Основные переменные
let currentUser = null;
let cart = {};
let activePromo = null;
let promoDiscount = 0;
let selectedAmount = 100;
let products = [];

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
    
    if (!localStorage.getItem('visited')) {
        showNotification('Добро пожаловать в РНЛ ЕДА! Используйте промокод WELCOME10 для скидки 10%', 'success');
        localStorage.setItem('visited', 'true');
    }
});

// Функции навигации
function goTo(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(screenId).classList.add("active");
    
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
    }
}

// Проверка авторизации
function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        logoutBtn.style.display = 'flex';
        
        if (window.location.hash !== '#start') {
            goTo('profile');
        }
    } else {
        logoutBtn.style.display = 'none';
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
    document.getElementById('balance').textContent = `${(currentUser.balance || 0).toFixed(2)} ₴`;
    
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
                // age и parents могут храниться в дополнительных полях
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

async function loadOrderHistory() {
    if (!currentUser) return;
    
    try {
        const data = await apiRequest('/api/orders/history');
        
        const historyContainer = document.getElementById('order-history-list');
        historyContainer.innerHTML = '';
        
        if (!data || data.length === 0) {
            historyContainer.innerHTML = '<div class="no-orders">Заказов пока нет</div>';
            return;
        }
        
        data.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-item';
            
            // Формируем список товаров
            const itemsText = order.items ? order.items.map(item => 
                `${item.name} x${item.quantity}`
            ).join(', ') : 'Заказ';
            
            orderElement.innerHTML = `
                <div class="order-info">
                    <span class="order-name">${itemsText}</span>
                    <span class="order-date">${new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <span class="order-price">${order.final_amount} ₴</span>
            `;
            historyContainer.appendChild(orderElement);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        showNotification('Ошибка загрузки истории заказов', 'error');
    }
}

function showFullOrderHistory() {
    showNotification('Полная история заказов будет доступна в следующем обновлении', 'info');
}

// Функции для работы с ассортиментом
function initializeAssortment() {
    const container = document.getElementById('items-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    products.forEach(product => {
        const quantity = cart[product.id] || 0;
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.setAttribute('data-category', product.category);
        itemCard.innerHTML = `
            <div class="item-image">
                <i class="${product.icon}"></i>
            </div>
            <div class="item-name">${product.name}</div>
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
    
    allItems.forEach(item => {
        const itemName = item.querySelector('.item-name').textContent.toLowerCase();
        const itemCategory = item.getAttribute('data-category');
        
        const matchesSearch = itemName.includes(searchTerm);
        const matchesCategory = activeCategory === 'all' || itemCategory === activeCategory;
        
        item.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
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
    showNotification('Товар добавлен в корзину', 'success');
}

function increaseQuantity(productId) {
    if (!cart[productId]) {
        cart[productId] = 0;
    }
    cart[productId]++;
    updateCart();
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
    document.getElementById('cart-count').textContent = totalItems;
    
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
    
    for (const productId in cart) {
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
        }
    }
    
    promoDiscount = activePromo ? (total * (activePromo.discount_percentage || activePromo.discount_percent) / 100) : 0;
    const finalAmount = total - promoDiscount;
    
    cartTotal.textContent = `${total.toFixed(2)} ₴`;
    
    if (activePromo) {
        cartDiscount.style.display = 'flex';
        discountAmount.textContent = `-${promoDiscount.toFixed(2)} ₴`;
        cartFinal.style.display = 'flex';
        finalTotal.textContent = `${finalAmount.toFixed(2)} ₴`;
    } else {
        cartDiscount.style.display = 'none';
        cartFinal.style.display = 'none';
    }
}

function removeFromCart(productId) {
    delete cart[productId];
    updateCart();
    showNotification('Товар удален из корзины', 'success');
}

function clearCart() {
    cart = {};
    activePromo = null;
    promoDiscount = 0;
    updateCart();
    showNotification('Корзина очищена', 'success');
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
        
        promoCodes.forEach(promo => {
            const promoItem = document.createElement('div');
            promoItem.className = 'promo-item';
            promoItem.innerHTML = `
                <div class="promo-code">${promo.code}</div>
                <div class="promo-discount">Скидка ${promo.discount_percentage}%</div>
                <div class="promo-expires">Действует до: ${new Date(promo.expires_at).toLocaleDateString('ru-RU')}</div>
            `;
            promoList.appendChild(promoItem);
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
        
        orderItems.forEach(item => {
            const product = products.find(p => p.id == item.meal_id);
            if (product) {
                const itemElement = document.createElement('div');
                itemElement.className = 'order-detail-item';
                itemElement.innerHTML = `
                    <span>${product.name} x${item.quantity}</span>
                    <span>${item.total_price} ₴</span>
                `;
                orderDetailsList.appendChild(itemElement);
            }
        });
        
        if (activePromo) {
            const discountElement = document.createElement('div');
            discountElement.className = 'order-detail-item';
            discountElement.innerHTML = `
                <span>Скидка по промокоду ${activePromo.code}</span>
                <span>-${promoDiscount} ₴</span>
            `;
            orderDetailsList.appendChild(discountElement);
        }
        
        const totalElement = document.createElement('div');
        totalElement.className = 'order-detail-total';
        totalElement.innerHTML = `
            <span>Итого:</span>
            <span>${finalAmount} ₴</span>
        `;
        orderDetailsList.appendChild(totalElement);
        
        // Очищаем корзину
        clearCart();
        
        // Переходим на экран благодарности
        goTo('Thx');
        
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
            document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedAmount = parseInt(this.getAttribute('data-amount'));
            document.getElementById('custom-amount').value = '';
        });
    });
    
    document.getElementById('custom-amount').addEventListener('input', function() {
        if (this.value) {
            document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
            selectedAmount = parseInt(this.value) || 0;
        }
    });
}

function updatePaymentUI() {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
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
        showNotification('Скопировано в буфер обмена', 'success');
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
        showNotification('Ошибка копирования', 'error');
    });
}

// Вспомогательные функции
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('active');
    
    setTimeout(() => {
        notification.classList.remove('active');
    }, 4000);
}

function startCountdown() {
    let timeLeft = 20;
    const countdownElement = document.querySelector('.countdown');
    
    const countdown = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;
        
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
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

