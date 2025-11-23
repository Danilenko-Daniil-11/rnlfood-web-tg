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
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (error) throw error;
        if (!data) throw new Error('Пользователь не найден');
        
        // Проверка пароля (в реальном приложении нужно хеширование)
        if (data.password_hash !== password) {
            throw new Error('Неверный пароль');
        }
        
        currentUser = data;
        
        // Сохраняем пользователя
        if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
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
        // Проверяем, существует ли пользователь
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();
        
        if (existingUser) {
            throw new Error('Пользователь с таким логином уже существует');
        }
        
        const userData = {
            username: username,
            password_hash: password,
            full_name: fullname,
            balance: 0,
            created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();
        
        if (error) throw error;
        
        currentUser = data;
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
        const { data, error } = await supabase
            .from('menu')
            .select('*')
            .order('id');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            products = data.map(item => ({
                id: item.id,
                name: item.name,
                price: parseFloat(item.price),
                category: item.category || 'Горячее',
                icon: item.icon || 'fas fa-utensils',
                description: item.description
            }));
        } else {
            // Fallback данные если таблица пустая
            products = [
                { id: 1, name: "Куриный суп", price: 25, category: "Горячее", icon: "fas fa-utensil-spoon" },
                { id: 2, name: "Гречневая каша", price: 30, category: "Горячее", icon: "fas fa-apple-alt" },
                { id: 3, name: "Котлета с пюре", price: 40, category: "Горячее", icon: "fas fa-drumstick-bite" },
                { id: 4, name: "Чай", price: 15, category: "Напитки", icon: "fas fa-coffee" },
                { id: 5, name: "Компот", price: 12, category: "Напитки", icon: "fas fa-glass-whiskey" }
            ];
        }
    } catch (error) {
        console.error('Ошибка загрузки продуктов:', error);
        showNotification('Ошибка загрузки меню', 'error');
    }
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
    document.getElementById('profile-name').textContent = currentUser.full_name || '-';
}

function editProfile() {
    if (!currentUser) return;
    
    document.getElementById('edit-name').value = currentUser.full_name || '';
    openModal('edit-profile-modal');
}

async function saveProfile() {
    if (!currentUser) return;
    
    const name = document.getElementById('edit-name').value;
    
    if (!name) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ full_name: name })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        currentUser.full_name = name;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
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
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                menu:menu_id(name)
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        const historyContainer = document.getElementById('order-history-list');
        historyContainer.innerHTML = '';
        
        if (!data || data.length === 0) {
            historyContainer.innerHTML = '<div class="no-orders">Заказов пока нет</div>';
            return;
        }
        
        data.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-item';
            orderElement.innerHTML = `
                <div class="order-info">
                    <span class="order-name">${order.menu?.name || 'Заказ'}</span>
                    <span class="order-date">${new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <span class="order-price">${order.total_price} ₴</span>
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
                    <button class="quantity-btn" onclick="decreaseQuantity(${product.id})" ${quantity === 0 ? 'disabled' : ''}>
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity" id="quantity-${product.id}">${quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity(${product.id})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <button class="add-to-cart" onclick="addToCart(${product.id})" ${quantity > 0 ? 'style="display:none"' : ''}>
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
                    <button class="btn-clear" onclick="removeFromCart(${productId})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        }
    }
    
    promoDiscount = activePromo ? (total * activePromo.discount_percent / 100) : 0;
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
        const { data: promo, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', promoCode)
            .gte('expires_at', new Date().toISOString())
            .single();
        
        if (error || !promo) {
            promoMessage.textContent = 'Промокод не найден или истек';
            promoMessage.className = 'promo-message error';
            return;
        }
        
        // Проверяем, использовал ли пользователь уже этот промокод
        const { data: usage } = await supabase
            .from('promo_uses')
            .select('id')
            .eq('promo_id', promo.id)
            .eq('user_id', currentUser.id)
            .single();
        
        if (usage) {
            promoMessage.textContent = 'Вы уже использовали этот промокод';
            promoMessage.className = 'promo-message error';
            return;
        }
        
        activePromo = promo;
        updateCartSummary();
        
        promoMessage.textContent = `Промокод применен! Скидка ${promo.discount_percent}%`;
        promoMessage.className = 'promo-message success';
        showNotification(`Промокод "${promoCode}" применен! Скидка ${promo.discount_percent}%`, 'success');
        
    } catch (error) {
        console.error('Ошибка применения промокода:', error);
        promoMessage.textContent = 'Ошибка применения промокода';
        promoMessage.className = 'promo-message error';
    }
}

async function showPromoModal() {
    try {
        const { data: promoCodes, error } = await supabase
            .from('promo_codes')
            .select('*')
            .gte('expires_at', new Date().toISOString());
        
        if (error) throw error;
        
        const promoList = document.getElementById('promo-list');
        promoList.innerHTML = '';
        
        if (!promoCodes || promoCodes.length === 0) {
            promoList.innerHTML = '<div class="no-promos">Активных промокодов нет</div>';
        } else {
            promoCodes.forEach(promo => {
                const promoItem = document.createElement('div');
                promoItem.className = 'promo-item';
                promoItem.innerHTML = `
                    <div class="promo-code">${promo.code}</div>
                    <div class="promo-discount">Скидка ${promo.discount_percent}%</div>
                    <div class="promo-expires">Действует до: ${new Date(promo.expires_at).toLocaleDateString('ru-RU')}</div>
                `;
                promoList.appendChild(promoItem);
            });
        }
        
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
    
    // Создаем отдельные заказы для каждого товара (согласно структуре вашей БД)
    for (const productId in cart) {
        const product = products.find(p => p.id == productId);
        if (product && cart[productId] > 0) {
            const itemTotal = product.price * cart[productId];
            total += itemTotal;
            
            // Создаем заказ для каждого товара
            orderItems.push({
                menu_id: parseInt(productId),
                quantity: cart[productId],
                total_price: itemTotal
            });
        }
    }
    
    // Применяем скидку
    const finalTotal = total - promoDiscount;
    
    // Проверяем баланс
    if (currentUser.balance < finalTotal) {
        showNotification('Недостаточно средств на балансе', 'error');
        goTo('payment');
        return;
    }
    
    showLoading(true);
    
    try {
        // Создаем заказы для каждого товара
        const orderPromises = orderItems.map(item => 
            supabase
                .from('orders')
                .insert({
                    user_id: currentUser.id,
                    menu_id: item.menu_id,
                    quantity: item.quantity,
                    total_price: item.total_price
                })
        );
        
        await Promise.all(orderPromises);
        
        // Обновляем баланс пользователя
        const { error: balanceError } = await supabase
            .from('users')
            .update({ balance: currentUser.balance - finalTotal })
            .eq('id', currentUser.id);
        
        if (balanceError) throw balanceError;
        
        // Записываем использование промокода
        if (activePromo) {
            const { error: promoError } = await supabase
                .from('promo_uses')
                .insert({
                    user_id: currentUser.id,
                    promo_id: activePromo.id
                });
            
            if (promoError) throw promoError;
        }
        
        // Обновляем данные пользователя
        const { data: updatedUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        currentUser = updatedUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Показываем детали заказа
        const orderDetailsList = document.getElementById('order-details-list');
        orderDetailsList.innerHTML = '';
        
        orderItems.forEach(item => {
            const product = products.find(p => p.id == item.menu_id);
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
            <span>${finalTotal} ₴</span>
        `;
        orderDetailsList.appendChild(totalElement);
        
        // Очищаем корзину
        clearCart();
        
        // Переходим на экран благодарности
        goTo('Thx');
        
    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        showNotification('Ошибка оформления заказа. Попробуйте еще раз.', 'error');
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
    }
    
    showLoading(true);
    
    try {
        // Обновляем баланс
        const newBalance = parseFloat(currentUser.balance) + finalAmount;
        const { error: balanceError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', currentUser.id);
        
        if (balanceError) throw balanceError;
        
        // Записываем транзакцию
        const { error: transactionError } = await supabase
            .from('topups')
            .insert({
                user_id: currentUser.id,
                method: method,
                amount: amount,
                status: 'completed'
            });
        
        if (transactionError) throw transactionError;
        
        // Обновляем данные пользователя
        currentUser.balance = newBalance;
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
