// Configuración de Supabase
const SUPABASE_URL = 'https://pepnxwpnyhbhqizdcapr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcG54d3BueWhiaHFpemRjYXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDAzMzksImV4cCI6MjA3MjExNjMzOX0.NsEP1iWSgK2cD7g_lIBD-YuXIJvTKvgRUgQp8GHwxes';

// Verificar si Supabase está disponible
let supabase;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        throw new Error('Supabase no está disponible');
    }
} catch (error) {
    console.error('Error inicializando Supabase:', error);
    // Mostrar mensaje de error al usuario
    document.addEventListener('DOMContentLoaded', () => {
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.innerHTML = `
                <h1>Pizarra de Ideas</h1>
                <div style="text-align: center; padding: 20px; color: #dc3545;">
                    <h3>Error de Conexión</h3>
                    <p>No se pudo conectar con el servidor. Por favor:</p>
                    <ul style="text-align: left; display: inline-block;">
                        <li>Verifica tu conexión a internet</li>
                        <li>Intenta recargar la página</li>
                        <li>Si el problema persiste, contacta al administrador</li>
                    </ul>
                    <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Recargar Página
                    </button>
                </div>
            `;
        }
    });
}

// Elementos de la UI (variables globales)
const authContainer = document.getElementById('auth-container');
const pizarraContainer = document.getElementById('pizarra-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode-btn');
const burgerBtn = document.getElementById('burgerBtn');
const sidePanel = document.getElementById('sidePanel');
const logoutBtn = document.getElementById('logoutBtn');
const drawBtn = document.getElementById('drawBtn');
const eraseStrokesBtn = document.getElementById('eraseStrokesBtn');
const eraseConnectionsBtn = document.getElementById('eraseConnectionsBtn');
const clearCanvasBtn = document.getElementById('clearCanvasBtn');
const addImageBtn = document.getElementById('addImageBtn');
const addTextBtn = document.getElementById('addTextBtn');
const deleteAllCardsBtn = document.getElementById('deleteAllCardsBtn');
const toggleAllCardsBtn = document.getElementById('toggleAllCardsBtn');
const decreaseCardSizeBtn = document.getElementById('decreaseCardSizeBtn');
const increaseCardSizeBtn = document.getElementById('increaseCardSizeBtn');
const generateCardsBtn = document.getElementById('generateCardsBtn');
const reorderCardsBtn = document.getElementById('reorderCardsBtn');
const reorderMethod = document.getElementById('reorderMethod');
const textInput = document.getElementById('textInput');
const defaultColorInput = document.getElementById('defaultColor');
const separatorInput = document.getElementById('separatorInput');
const toolStatus = document.getElementById('toolStatus');

// Canvas y estado
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let drawing = false, erasingStrokes = false, erasingConnections = false, isDrawing = false; 
let highestZ = 2000; // Z-index base para tarjetas activas - por encima de tarjetas base pero por debajo del menú
let highestCanvasZ = 1000; // Z-index base para elementos del canvas - por encima del canvas pero por debajo de las tarjetas
let globalCollapsed = false;
let currentCardSize = 220;
const MIN_CARD_SIZE = 180;
const MAX_CARD_SIZE = 400;

// Variables para elementos del canvas
let canvasElements = [];
let selectedElement = null;
let isDraggingElement = false;
let isResizingElement = false;
let resizeHandle = null;
let dragOffset = { x: 0, y: 0 };

// Estado de Supabase y usuario
let user = null;
let cardsLoaded = false;
let isLoading = false;
let authMode = 'signup'; 

// Estado de conexión y líneas
let startCard = null;
let connectionsData = [];
let strokesData = []; 
let canvasElementsData = []; // Nuevo array para persistir elementos del canvas 

// Estado del zoom para el móvil (manteniendo por si se implementa más adelante)
let isPinching = false;
let lastDistance = 0;

// --- Funciones de autenticación ---

function toggleAuthMode() {
    authMode = authMode === 'signup' ? 'login' : 'signup';
    if (authMode === 'login') {
        authBtn.textContent = 'Iniciar Sesión';
        toggleAuthModeBtn.textContent = '¿No tienes una cuenta? Regístrate';
    } else { // 'signup'
        authBtn.textContent = 'Registrarme';
        toggleAuthModeBtn.textContent = '¿Ya tienes una cuenta? Inicia Sesión';
    }
}

async function handleAuth(e) {
    e.preventDefault();
    
    if (!supabase) {
        alert('Error: No se pudo conectar con el servidor. Por favor recarga la página.');
        return;
    }
    
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        if (authMode === 'signup') {
            const { error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });
            if (error) throw error;
            alert('¡Registro exitoso! Ya puedes iniciar sesión.');
            toggleAuthMode();
        } else { // 'login'
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) throw error;
        }
    } catch (error) {
        console.error('Error de autenticación:', error.message);
        alert(error.message);
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.reload();
    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);
    }
}

function handleSessionChange(session) {
    user = session?.user ?? null;
    if (user) {
        pizarraContainer.style.display = 'block';
        authContainer.style.display = 'none';
        console.log('Usuario logueado:', user.id);
        if (!cardsLoaded) {
            loadCardsFromSupabase();
            setupPizarraListeners();
        }
    } else {
        pizarraContainer.style.display = 'none';
        authContainer.style.display = 'flex';
        document.querySelectorAll('.card').forEach(card => card.remove());
        document.querySelectorAll('.canvas-element').forEach(element => element.remove());
        clearCanvas();
        cardsLoaded = false;
        canvasElements = [];
        canvasElementsData = [];
        authMode = 'signup';
        authBtn.textContent = 'Registrarme';
        toggleAuthModeBtn.textContent = '¿Ya tienes una cuenta? Inicia Sesión';
    }
}

// Solo configurar el listener si Supabase está disponible
if (supabase) {
    supabase.auth.onAuthStateChange((_event, session) => {
        handleSessionChange(session);
    });
}

async function getInitialSession() {
    if (!supabase) {
        console.error('Supabase no está disponible');
        return;
    }
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        handleSessionChange(session);
    } catch (error) {
        console.error('Error obteniendo sesión inicial:', error);
    }
}

// --- Funciones de la pizarra ---

function resizeCanvas() {
    // El canvas debe tener el tamaño del viewport y estar fijo
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'auto';
    canvas.style.zIndex = '1'; // Asegurar que esté por debajo de las tarjetas
    
    // Ajustar el canvas para dispositivos móviles
    if (window.innerWidth <= 768) {
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
    }
    redrawAll(); 
}

function getPos(e) {
    // Obtener las coordenadas del canvas para eventos touch y mouse
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches.length > 0) {
        return { 
            x: e.touches[0].clientX - rect.left, 
            y: e.touches[0].clientY - rect.top 
        };
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        return { 
            x: e.changedTouches[0].clientX - rect.left, 
            y: e.changedTouches[0].clientY - rect.top 
        };
    } else {
        return { 
            x: e.clientX - rect.left, 
            y: e.clientY - rect.top 
        };
    }
}

let currentStroke = [];

async function clearCanvas() {
    if (!user) return;
    if (!confirm("¿Estás seguro de que quieres borrar todos los trazos?")) {
        return;
    }
    try {
        const { error } = await supabase.from('strokes').delete().eq('user_id', user.id);
        if (error) throw error;
        console.log("Todos los trazos del canvas eliminados de la base de datos.");
        strokesData = []; 
        redrawAll(); 
    } catch (err) {
        console.error('Error al eliminar trazos:', err);
    }
}

// Funciones para tarjetas
async function saveCardsToSupabase() {
    if (isLoading || !user) return;
    try {
        const cards = document.querySelectorAll('.card');
        const newCardsData = [];
        const existingCardsData = [];

        cards.forEach(card => {
            const title = card.querySelector('.title').textContent;
            const content = card.querySelector('.card-content').textContent;
            const color = card.style.background;
            const headerColor = card.querySelector('.card-header').style.background;
            const textColor = card.querySelector('.card-content').style.color;
            const isCollapsed = card.querySelector('.card-content').style.display === 'none';
            const left = parseInt(card.style.left) || 100;
            const top = parseInt(card.style.top) || 100;
            const width = parseInt(card.style.width) || currentCardSize;
            const id = card.getAttribute('data-id');

            const cardData = {
                user_id: user.id,
                title, content, color, header_color: headerColor, text_color: textColor, is_collapsed: isCollapsed,
                position_x: left, position_y: top, width,
                font_size: parseInt(card.querySelector('.card-content').style.fontSize) || (currentCardSize / 15),
                title_font_size: parseInt(card.querySelector('.title').style.fontSize) || (currentCardSize / 18)
            };

            if (id) {
                cardData.id = id;
                existingCardsData.push(cardData);
            } else {
                newCardsData.push(cardData);
            }
        });

        if (newCardsData.length > 0) {
            const { data, error: insertError } = await supabase.from('cards').insert(newCardsData).select();
            if (insertError) {
                console.error('Error insertando tarjetas:', insertError);
            } else {
                console.log('Nuevas tarjetas insertadas en Supabase');
                data.forEach(insertedCard => {
                    const tempCard = [...document.querySelectorAll('.card:not([data-id])')].find(c =>
                        c.querySelector('.title').textContent === insertedCard.title &&
                        c.querySelector('.card-content').textContent === insertedCard.content
                    );
                    if (tempCard) {
                        tempCard.setAttribute('data-id', insertedCard.id);
                    }
                });
            }
        }

        if (existingCardsData.length > 0) {
            const { error: upsertError } = await supabase.from('cards').upsert(existingCardsData);
            if (upsertError) {
                console.error('Error actualizando tarjetas:', upsertError);
            } else {
                console.log('Tarjetas existentes actualizadas en Supabase');
            }
        }
    } catch (err) {
        console.error('Error inesperado guardando:', err);
    }
}

async function loadCardsFromSupabase() {
    if (cardsLoaded || !user) return;
    try {
        isLoading = true;
        console.log('Cargando tarjetas desde Supabase para el usuario', user.id);

        const { data: cardsData, error } = await supabase
            .from('cards')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error de Supabase:', error);
            // Si es error de autenticación, intentar renovar sesión
            if (error.message && (error.message.includes('refresh') || error.message.includes('JWT'))) {
                console.log('Error de autenticación detectado, intentando renovar sesión...');
                try {
                    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
                    if (!refreshError && session) {
                        console.log('Sesión renovada, reintentando carga...');
                        setTimeout(() => loadCardsFromSupabase(), 1000);
                        return;
                    }
                } catch (refreshErr) {
                    console.error('Error renovando sesión:', refreshErr);
                }
            }
            return;
        }

        document.querySelectorAll('.card').forEach(card => card.remove());

        if (cardsData && cardsData.length > 0) {
            cardsData.forEach(cardData => createCardFromData(cardData));
            highestZ = 2000 + cardsData.length; // Z-index base para tarjetas activas
            console.log(`Creadas ${cardsData.length} tarjetas`);
        } else {
            console.log('No hay tarjetas guardadas para este usuario');
        }

        cardsLoaded = true;
        
        // Cargar otros elementos en paralelo para mejor rendimiento
        await Promise.allSettled([
            loadConnectionsFromSupabase(),
            loadStrokesFromSupabase(),
            loadCanvasElementsFromSupabase()
        ]);
        
    } catch (err) {
        console.error('Error inesperado cargando tarjetas:', err);
    } finally {
        isLoading = false;
        // Actualizar el color del texto de todas las tarjetas después de cargarlas
        updateAllCardsTextColor();
    }
}

function createCardFromData(cardData) {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute('data-id', cardData.id);
    card.style.left = (cardData.position_x || 100) + "px";
    card.style.top = (cardData.position_y || 100) + "px";
    card.style.background = cardData.color || "#cce4f7";
    card.style.width = (cardData.width || currentCardSize) + "px";
    
    const header = document.createElement("div");
    header.className = "card-header";
    header.style.background = cardData.header_color || shadeColor(cardData.color || "#cce4f7", -20);
    header.style.color = getContrastYIQ(shadeColor(cardData.color || "#cce4f7", -20));

    const titleSpan = document.createElement("span");
    titleSpan.className = "title";
    titleSpan.textContent = cardData.title;
    titleSpan.style.fontSize = (cardData.title_font_size || (currentCardSize / 18)) + "px";
    header.appendChild(titleSpan);

    const menuBtn = document.createElement("div");
    menuBtn.className = "card-menu-btn";
    menuBtn.textContent = "⚙";
    menuBtn.title = "Menú de la tarjeta";

    const subMenu = document.createElement("div");
    subMenu.className = "card-submenu";

    // Botón Eliminar (arriba)
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑";
    deleteBtn.className = "delete-btn";
    deleteBtn.title = "Eliminar tarjeta";
    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (confirm("¿Estás seguro de que quieres eliminar esta tarjeta?")) {
            deleteCard(card.getAttribute('data-id'));
        }
        closeAllCardMenus();
    });
    subMenu.appendChild(deleteBtn);

    // Botón Editar Título (izquierda)
    const renameBtn = document.createElement("button");
    renameBtn.textContent = "✏";
    renameBtn.className = "rename-btn";
    renameBtn.title = "Editar título";
    renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const newTitle = prompt("Nuevo título de la tarjeta:", titleSpan.textContent);
        if (newTitle !== null) {
            titleSpan.textContent = newTitle;
            saveCardsToSupabase();
        }
        closeAllCardMenus();
    });
    subMenu.appendChild(renameBtn);

    // Botón Cambiar Color (derecha)
    const colorBtn = document.createElement("input");
    colorBtn.type = "color";
    colorBtn.className = "color-picker";
    colorBtn.value = cardData.color || "#cce4f7";
    colorBtn.title = "Cambiar color";
    
    // Manejar eventos tanto para mouse como para touch
    colorBtn.addEventListener("input", (e) => {
        e.stopPropagation();
        const newColor = colorBtn.value;
        card.style.background = newColor;
        header.style.background = shadeColor(newColor, -20);
        header.style.color = getContrastYIQ(shadeColor(newColor, -20));
        contentDiv.style.color = getContrastYIQ(newColor);
        saveCardsToSupabase();
        
        // Actualizar el color de las conexiones que parten de esta tarjeta
        updateConnectionColors(card.getAttribute('data-id'), newColor);
    });
    
    // Agregar evento touch para móviles
    colorBtn.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        // No prevenir el comportamiento por defecto para permitir que se abra el selector
        setTimeout(() => {
            colorBtn.click();
        }, 50);
    }, { passive: true });
    
    subMenu.appendChild(colorBtn);

    // Botón Crear Conexión (abajo)
    const connectBtn = document.createElement("button");
    connectBtn.textContent = "🔗";
    connectBtn.className = "connect-btn";
    connectBtn.title = "Crear conexión";
    connectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        handleConnect(card);
        closeAllCardMenus();
    });
    
    // Agregar eventos touch para móviles con mejor manejo
    let connectTouchStartTime = 0;
    let connectTouchMoved = false;
    
    connectBtn.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        connectTouchStartTime = Date.now();
        connectTouchMoved = false;
    }, { passive: false });
    
    connectBtn.addEventListener("touchmove", (e) => {
        e.stopPropagation();
        connectTouchMoved = true;
    }, { passive: false });
    
    connectBtn.addEventListener("touchend", (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const touchDuration = Date.now() - connectTouchStartTime;
        
        // Solo ejecutar si no se movió y fue un toque rápido (menos de 500ms)
        if (!connectTouchMoved && touchDuration < 500) {
            console.log('Botón de conexión tocado en móvil');
            handleConnect(card);
            closeAllCardMenus();
        }
    }, { passive: false });
    subMenu.appendChild(connectBtn);
    
    menuBtn.appendChild(subMenu);
    header.appendChild(menuBtn);

    const contentDiv = document.createElement("div");
    contentDiv.className = "card-content";
    contentDiv.textContent = cardData.content;
    contentDiv.style.fontSize = (cardData.font_size || (currentCardSize / 15)) + "px";
    contentDiv.style.color = getContrastYIQ(cardData.color || "#cce4f7");
    contentDiv.style.display = cardData.is_collapsed ? "none" : "block";

    card.appendChild(header);
    card.appendChild(contentDiv);
    document.body.appendChild(card);

    makeDraggable(card);

    let touchMoved = false;
    menuBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        touchMoved = false; 
    }, { passive: false }); 

    menuBtn.addEventListener('touchmove', (e) => {
        e.stopPropagation();
        touchMoved = true; 
    }, { passive: false });

    menuBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        if (!touchMoved) { 
            e.preventDefault(); 
            // Comportamiento toggle: si ya está activo, cerrarlo; si no, abrirlo
            if (menuBtn.classList.contains('active')) {
                menuBtn.classList.remove('active');
                // Restaurar z-index en móvil
                if (window.innerWidth <= 768) {
                    document.querySelectorAll('.card').forEach(otherCard => {
                        otherCard.style.zIndex = '';
                    });
                }
            } else {
                closeAllCardMenus();
                menuBtn.classList.add('active');
            }
        }
    });

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!touchMoved) { 
            // Comportamiento toggle: si ya está activo, cerrarlo; si no, abrirlo
            if (menuBtn.classList.contains('active')) {
                menuBtn.classList.remove('active');
                // Restaurar z-index en móvil
                if (window.innerWidth <= 768) {
                    document.querySelectorAll('.card').forEach(otherCard => {
                        otherCard.style.zIndex = '';
                    });
                }
            } else {
                closeAllCardMenus();
                menuBtn.classList.add('active');
                
                // En móvil, ajustar z-index cuando se abre el menú
                if (window.innerWidth <= 768) {
                    if (menuBtn.classList.contains('active')) {
                        // Reducir z-index de todas las tarjetas excepto la actual
                        document.querySelectorAll('.card').forEach(otherCard => {
                            if (otherCard !== card) {
                                otherCard.style.zIndex = '500';
                            }
                        });
                        // Mantener la tarjeta actual con z-index alto
                        card.style.zIndex = '100000';
                    } else {
                        // Restaurar z-index normal cuando se cierra el menú
                        document.querySelectorAll('.card').forEach(otherCard => {
                            otherCard.style.zIndex = '1000';
                        });
                    }
                }
            }
        }
    });
}


function createCard(id, title, content, x, y, color) {
    const card = document.createElement("div");
    card.className = "card";
    if (id) {
        card.setAttribute('data-id', id);
    }
    card.style.left = x + "px"; 
    card.style.top = y + "px"; 
    card.style.background = color;
    card.style.width = currentCardSize + "px";
    
    const header = document.createElement("div");
    header.className = "card-header";
    header.style.background = shadeColor(color, -20);
    header.style.color = getContrastYIQ(shadeColor(color, -20));

    const titleSpan = document.createElement("span");
    titleSpan.className = "title";
    titleSpan.textContent = title;
    titleSpan.style.fontSize = (currentCardSize / 18) + "px";
    header.appendChild(titleSpan);

    const menuBtn = document.createElement("div");
    menuBtn.className = "card-menu-btn";
    menuBtn.textContent = "⚙";
    menuBtn.title = "Menú de la tarjeta";

    const subMenu = document.createElement("div");
    subMenu.className = "card-submenu";

    // Botón Eliminar (arriba)
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑";
    deleteBtn.className = "delete-btn";
    deleteBtn.title = "Eliminar tarjeta";
    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault(); 
        if (confirm("¿Estás seguro de que quieres eliminar esta tarjeta?")) {
            deleteCard(card.getAttribute('data-id'));
        }
        closeAllCardMenus();
    });
    subMenu.appendChild(deleteBtn);

    // Botón Editar Título (izquierda)
    const renameBtn = document.createElement("button");
    renameBtn.textContent = "✏";
    renameBtn.className = "rename-btn";
    renameBtn.title = "Editar título";
    renameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault(); 
        const newTitle = prompt("Nuevo título de la tarjeta:", titleSpan.textContent);
        if (newTitle !== null) {
            titleSpan.textContent = newTitle;
            saveCardsToSupabase();
        }
        closeAllCardMenus();
    });
    subMenu.appendChild(renameBtn);

    // Botón Cambiar Color (derecha)
    const colorBtn = document.createElement("input");
    colorBtn.type = "color";
    colorBtn.className = "color-picker";
    colorBtn.value = color;
    colorBtn.title = "Cambiar color";
    colorBtn.addEventListener("input", (e) => {
        e.stopPropagation();
        const newColor = colorBtn.value;
        card.style.background = newColor;
        header.style.background = shadeColor(newColor, -20);
        header.style.color = getContrastYIQ(shadeColor(newColor, -20));
        contentDiv.style.color = getContrastYIQ(newColor);
        saveCardsToSupabase();
        
        // Actualizar el color de las conexiones que parten de esta tarjeta
        updateConnectionColors(card.getAttribute('data-id'), newColor);
    });
    
    // Agregar evento touch para móviles
    colorBtn.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        // No prevenir el comportamiento por defecto para permitir que se abra el selector
        setTimeout(() => {
            colorBtn.click();
        }, 50);
    }, { passive: true });
    
    subMenu.appendChild(colorBtn);

    // Botón Crear Conexión (abajo)
    const connectBtn = document.createElement("button");
    connectBtn.textContent = "🔗";
    connectBtn.className = "connect-btn";
    connectBtn.title = "Crear conexión";
    connectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault(); 
        handleConnect(card);
        closeAllCardMenus();
    });
    
    // Agregar eventos touch para móviles con mejor manejo
    let connectTouchStartTime2 = 0;
    let connectTouchMoved2 = false;
    
    connectBtn.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        connectTouchStartTime2 = Date.now();
        connectTouchMoved2 = false;
    }, { passive: false });
    
    connectBtn.addEventListener("touchmove", (e) => {
        e.stopPropagation();
        connectTouchMoved2 = true;
    }, { passive: false });
    
    connectBtn.addEventListener("touchend", (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const touchDuration = Date.now() - connectTouchStartTime2;
        
        // Solo ejecutar si no se movió y fue un toque rápido (menos de 500ms)
        if (!connectTouchMoved2 && touchDuration < 500) {
            console.log('Botón de conexión tocado en móvil (createCard)');
            handleConnect(card);
            closeAllCardMenus();
        }
    }, { passive: false });
    subMenu.appendChild(connectBtn);
    
    menuBtn.appendChild(subMenu);
    header.appendChild(menuBtn);

    const contentDiv = document.createElement("div");
    contentDiv.className = "card-content";
    contentDiv.textContent = content;
    contentDiv.style.fontSize = (currentCardSize / 15) + "px";
    contentDiv.style.color = getContrastYIQ(color);

    card.appendChild(header);
    card.appendChild(contentDiv);
    document.body.appendChild(card);

    makeDraggable(card);

    let touchMoved = false;
    menuBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        touchMoved = false; 
    }, { passive: false }); 

    menuBtn.addEventListener('touchmove', (e) => {
        e.stopPropagation();
        touchMoved = true; 
    }, { passive: false });

    menuBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        if (!touchMoved) { 
            e.preventDefault(); 
            // Comportamiento toggle: si ya está activo, cerrarlo; si no, abrirlo
            if (menuBtn.classList.contains('active')) {
                menuBtn.classList.remove('active');
                // Restaurar z-index en móvil
                if (window.innerWidth <= 768) {
                    document.querySelectorAll('.card').forEach(otherCard => {
                        otherCard.style.zIndex = '';
                    });
                }
            } else {
                closeAllCardMenus();
                menuBtn.classList.add('active');
            }
        }
    });

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!touchMoved) { 
            // Comportamiento toggle: si ya está activo, cerrarlo; si no, abrirlo
            if (menuBtn.classList.contains('active')) {
                menuBtn.classList.remove('active');
                // Restaurar z-index en móvil
                if (window.innerWidth <= 768) {
                    document.querySelectorAll('.card').forEach(otherCard => {
                        otherCard.style.zIndex = '';
                    });
                }
            } else {
                closeAllCardMenus();
                menuBtn.classList.add('active');
                
                // En móvil, ajustar z-index cuando se abre el menú
                if (window.innerWidth <= 768) {
                    if (menuBtn.classList.contains('active')) {
                        // Reducir z-index de todas las tarjetas excepto la actual
                        document.querySelectorAll('.card').forEach(otherCard => {
                            if (otherCard !== card) {
                                otherCard.style.zIndex = '500';
                            }
                        });
                        // Mantener la tarjeta actual con z-index alto
                        card.style.zIndex = '100000';
                    } else {
                        // Restaurar z-index normal cuando se cierra el menú
                        document.querySelectorAll('.card').forEach(otherCard => {
                            otherCard.style.zIndex = '1000';
                        });
                    }
                }
            }
        }
    });
}


function generateCards() {
    const text = textInput.value;
    const separator = separatorInput.value;
    
    let paragraphs = [];

    if (separator.trim() !== "") {
        const regex = new RegExp(escapeRegExp(separator), 'g');
        paragraphs = text.split(regex).filter(p => p.trim());
    } else {
        paragraphs = text.split('\n').filter(p => p.trim());
    }
    
    const defaultColor = defaultColorInput.value;

    if (separator.trim() !== "" && paragraphs.length <= 1 && text.trim() !== '') {
        paragraphs = [text.trim()];
    }

    paragraphs.forEach((para, i) => {
        let content = para.trim();
        let title = `Tarjeta ${i + 1}`;
        
        if (separator.trim() === "" && content.includes('\n')) {
            const lines = content.split('\n');
            title = lines[0].trim() || title;
            content = lines.slice(1).join('\n').trim() || content;
        }

        createCard(null, title, content, 100 + 30 * i, 100 + 30 * i, defaultColor);
    });
    saveCardsToSupabase();
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function deleteCard(cardId) {
    if (!user) return;
    try {
        const { error } = await supabase
            .from('cards')
            .delete()
            .eq('id', cardId)
            .eq('user_id', user.id);
            
        if (error) {
            console.error('Error eliminando la tarjeta individual:', error);
            alert('Error al eliminar la tarjeta.');
            return;
        }

        document.querySelector(`.card[data-id="${cardId}"]`).remove();
        console.log(`Tarjeta con ID ${cardId} eliminada`);
        redrawAll();

    } catch (error) {
        console.error('Error inesperado eliminando la tarjeta:', error);
    }
}


async function deleteAllCards() {
    if (!user) return;
    if (!confirm("¿Estás seguro de que quieres eliminar TODAS las tarjetas y conexiones? Esta acción no se puede deshacer.")) {
        return;
    }
    try {
        const { error: connectionsError } = await supabase.from('connections').delete().eq('user_id', user.id);
        if (connectionsError) { console.error('Error eliminando conexiones:', connectionsError); return; }

        const { error: cardsError } = await supabase.from('cards').delete().eq('user_id', user.id);
        if (cardsError) { console.error('Error eliminando tarjetas:', cardsError); return; }
        
        const { error: strokesError } = await supabase.from('strokes').delete().eq('user_id', user.id);
        if (strokesError) { console.error('Error eliminando trazos:', strokesError); return; }
        
        const { error: elementsError } = await supabase.from('canvas_elements').delete().eq('user_id', user.id);
        if (elementsError) { console.error('Error eliminando elementos del canvas:', elementsError); return; }
        
        document.querySelectorAll(".card").forEach(card => card.remove());
        document.querySelectorAll(".canvas-element").forEach(element => element.remove());
        connectionsData = [];
        strokesData = [];
        canvasElements = [];
        canvasElementsData = [];
        redrawAll();
        console.log("Todas las tarjetas, conexiones, trazos y elementos del canvas eliminados.");
    } catch (error) {
        console.error('Error inesperado eliminando todo:', error);
    }
}

function makeDraggable(card) {
    let dragging = false, offsetX, offsetY;
    const startDrag = (e) => {
        e.stopPropagation();
        dragging = true;
        card.classList.add("dragging");
        highestZ++;
        card.style.zIndex = highestZ;
        
        // Obtener coordenadas absolutas del viewport para touch y mouse
        let clientX, clientY;
        
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        // Usar getBoundingClientRect para obtener la posición real en el viewport
        const rect = card.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;
        e.preventDefault();
    };
    const doDrag = (e) => {
        if (!dragging) return;
        e.stopPropagation();
        
        // Obtener coordenadas absolutas del viewport para touch y mouse
        let clientX, clientY;
        
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const newLeft = clientX - offsetX;
        const newTop = clientY - offsetY;
        
        // Expandir el canvas si es necesario
        expandCanvasIfNeeded(newLeft, newTop, card.offsetWidth, card.offsetHeight);
        
        card.style.left = newLeft + "px";
        card.style.top = newTop + "px";
        e.preventDefault();
        redrawAll();
    };
    const stopDrag = () => {
        if (!dragging) return;
        dragging = false;
        card.classList.remove("dragging");
        saveCardsToSupabase();
        // Redibujar conexiones después de mover la tarjeta
        redrawAll();
    };

    // Hacer toda la tarjeta arrastrable, no solo el header
    card.addEventListener("mousedown", startDrag);
    card.addEventListener("touchstart", startDrag, { passive: false });
    document.addEventListener("mousemove", doDrag);
    document.addEventListener("touchmove", doDrag, { passive: false });
    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("touchend", stopDrag);
    
    // Agregar click handler para traer la tarjeta al frente
    card.addEventListener('click', (e) => {
        // Solo si no se está haciendo clic en el menú o sus elementos
        if (!e.target.closest('.card-menu-btn') && !e.target.closest('.card-submenu')) {
            highestZ++;
            card.style.zIndex = highestZ;
            
            // Si la tarjeta está en modo solapado (contenido oculto), restaurar vista normal
            const contentDiv = card.querySelector('.card-content');
            if (contentDiv && contentDiv.style.display === 'none') {
                contentDiv.style.display = 'block';
                // Mover la tarjeta a una posición más visible
                const currentLeft = parseInt(card.style.left) || 0;
                const currentTop = parseInt(card.style.top) || 0;
                card.style.left = (currentLeft + 50) + 'px';
                card.style.top = (currentTop + 50) + 'px';
            }
        }
    });
}

function expandCanvasIfNeeded(x, y, width, height) {
    const margin = 200; // Margen de seguridad
    const cardRight = x + width;
    const cardBottom = y + height;
    
    // Obtener las dimensiones actuales del viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calcular las nuevas dimensiones necesarias
    let newWidth = Math.max(viewportWidth, cardRight + margin);
    let newHeight = Math.max(viewportHeight, cardBottom + margin);
    
    // Solo redimensionar el body si es necesario para permitir scroll
    if (newWidth > viewportWidth || newHeight > viewportHeight) {
        // Establecer el tamaño mínimo del body para permitir scroll
        document.body.style.minWidth = newWidth + 'px';
        document.body.style.minHeight = newHeight + 'px';
        
        // El canvas permanece fijo con el tamaño del viewport
        // No necesitamos redimensionarlo
    }
}

function toggleAllCards() {
    globalCollapsed = !globalCollapsed;
    document.querySelectorAll(".card").forEach(card => {
        const content = card.querySelector(".card-content");
        if (content) {
            if (globalCollapsed) {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
        }
    });
    saveCardsToSupabase();
}

function increaseCardSize() {
    if (currentCardSize >= MAX_CARD_SIZE) return;
    currentCardSize = Math.min(MAX_CARD_SIZE, currentCardSize + 20);
    updateAllCardsSize();
    saveCardsToSupabase();
}

function decreaseCardSize() {
    if (currentCardSize <= MIN_CARD_SIZE) return;
    currentCardSize = Math.max(MIN_CARD_SIZE, currentCardSize - 20);
    updateAllCardsSize();
    saveCardsToSupabase();
}

function updateAllCardsSize() {
    document.querySelectorAll(".card").forEach(card => {
        card.style.width = currentCardSize + "px";
        const contentDiv = card.querySelector(".card-content");
        if (contentDiv) contentDiv.style.fontSize = (currentCardSize / 15) + "px";
        const title = card.querySelector(".title");
        if (title) title.style.fontSize = (currentCardSize / 18) + "px";
    });
    redrawAll();
}

function reorderCards() {
    const method = reorderMethod.value;
    const cards = Array.from(document.querySelectorAll('.card'));
    
    if (cards.length === 0) {
        alert('No hay tarjetas para reordenar');
        return;
    }
    
    switch (method) {
        case 'connections':
            reorderByConnections(cards);
            break;
        case 'color':
            reorderByColor(cards);
            break;
        case 'grid':
            restoreNormalView(cards);
            reorderInGrid(cards);
            break;
    }
    
    saveCardsToSupabase();
}

function restoreNormalView(cards) {
    cards.forEach(card => {
        // Mostrar el contenido de la tarjeta
        const contentDiv = card.querySelector('.card-content');
        if (contentDiv) {
            contentDiv.style.display = 'block';
        }
        
        // Restaurar z-index normal
        card.style.zIndex = '1000';
    });
}

function reorderByConnections(cards) {
    // Crear un grafo de conexiones
    const graph = {};
    const visited = new Set();
    const groups = [];
    
    // Inicializar el grafo
    cards.forEach(card => {
        const cardId = card.getAttribute('data-id');
        graph[cardId] = [];
    });
    
    // Agregar conexiones al grafo
    connectionsData.forEach(conn => {
        if (graph[conn.start_card_id]) {
            graph[conn.start_card_id].push(conn.end_card_id);
        }
        if (graph[conn.end_card_id]) {
            graph[conn.end_card_id].push(conn.start_card_id);
        }
    });
    
    // Encontrar componentes conectados
    cards.forEach(card => {
        const cardId = card.getAttribute('data-id');
        if (!visited.has(cardId)) {
            const group = [];
            dfs(cardId, graph, visited, group);
            groups.push(group);
        }
    });
    
    // Ordenar grupos por tamaño (más grandes primero)
    groups.sort((a, b) => b.length - a.length);
    
    // Posicionar tarjetas por grupos de conexión
    let currentX = 100;
    let currentY = 100;
    const cardSpacing = 30; // Espacio entre tarjetas del mismo grupo
    const groupSpacing = 80; // Espacio entre grupos de conexión
    const maxCardsPerRow = 4; // Máximo de tarjetas por fila antes de cambiar de fila
    
    groups.forEach((group, groupIndex) => {
        const groupCards = group.map(id => cards.find(card => card.getAttribute('data-id') === id));
        
        // Posicionar tarjetas del grupo conectado en grupo compacto
        groupCards.forEach((card, index) => {
            // Mostrar el contenido de la tarjeta
            const contentDiv = card.querySelector('.card-content');
            if (contentDiv) {
                contentDiv.style.display = 'block';
            }
            
            // Calcular posición en grid para el grupo de conexión
            const row = Math.floor(index / maxCardsPerRow);
            const col = index % maxCardsPerRow;
            
            card.style.left = currentX + (col * (250 + cardSpacing)) + 'px';
            card.style.top = currentY + (row * (150 + cardSpacing)) + 'px';
            
            // Asegurar que las tarjetas se vean por encima
            card.style.zIndex = 2000 + index;
        });
        
        // Calcular la altura máxima del grupo actual
        const rowsInGroup = Math.ceil(groupCards.length / maxCardsPerRow);
        const groupHeight = rowsInGroup * (150 + cardSpacing) - cardSpacing;
        
        // Mover a la siguiente posición para el siguiente grupo de conexión
        currentY += groupHeight + groupSpacing;
        
        // Si llegamos muy abajo, empezar una nueva columna
        if (currentY > window.innerHeight - 200) {
            currentX += (maxCardsPerRow * (250 + cardSpacing)) + groupSpacing;
            currentY = 100;
        }
    });
    
    redrawAll();
}

function dfs(nodeId, graph, visited, group) {
    visited.add(nodeId);
    group.push(nodeId);
    
    if (graph[nodeId]) {
        graph[nodeId].forEach(neighborId => {
            if (!visited.has(neighborId)) {
                dfs(neighborId, graph, visited, group);
            }
        });
    }
}

function reorderByColor(cards) {
    // Agrupar tarjetas por color
    const colorGroups = {};
    
    cards.forEach(card => {
        const color = card.style.background || '#cce4f7';
        if (!colorGroups[color]) {
            colorGroups[color] = [];
        }
        colorGroups[color].push(card);
    });
    
    // Ordenar colores (opcional: ordenar por frecuencia)
    const sortedColors = Object.keys(colorGroups).sort((a, b) => 
        colorGroups[b].length - colorGroups[a].length
    );
    
    // Posicionar tarjetas por color en grupos separados
    let currentX = 100;
    let currentY = 100;
    const cardSpacing = 30; // Espacio entre tarjetas del mismo color
    const groupSpacing = 80; // Espacio entre grupos de colores diferentes
    const maxCardsPerRow = 4; // Máximo de tarjetas por fila antes de cambiar de fila
    
    sortedColors.forEach((color, colorIndex) => {
        const colorCards = colorGroups[color];
        
        // Posicionar tarjetas del mismo color en grupo compacto
        colorCards.forEach((card, index) => {
            // Mostrar el contenido de la tarjeta
            const contentDiv = card.querySelector('.card-content');
            if (contentDiv) {
                contentDiv.style.display = 'block';
            }
            
            // Calcular posición en grid para el grupo de color
            const row = Math.floor(index / maxCardsPerRow);
            const col = index % maxCardsPerRow;
            
            card.style.left = currentX + (col * (250 + cardSpacing)) + 'px';
            card.style.top = currentY + (row * (150 + cardSpacing)) + 'px';
            
            // Asegurar que las tarjetas se vean por encima
            card.style.zIndex = 2000 + index;
        });
        
        // Calcular la altura máxima del grupo actual
        const rowsInGroup = Math.ceil(colorCards.length / maxCardsPerRow);
        const groupHeight = rowsInGroup * (150 + cardSpacing) - cardSpacing;
        
        // Mover a la siguiente posición para el siguiente grupo de color
        currentY += groupHeight + groupSpacing;
        
        // Si llegamos muy abajo, empezar una nueva columna
        if (currentY > window.innerHeight - 200) {
            currentX += (maxCardsPerRow * (250 + cardSpacing)) + groupSpacing;
            currentY = 100;
        }
    });
    
    redrawAll();
}

function reorderInGrid(cards) {
    const cols = Math.ceil(Math.sqrt(cards.length));
    const rows = Math.ceil(cards.length / cols);
    const spacing = 50;
    
    cards.forEach((card, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        const x = 100 + col * (currentCardSize + spacing);
        const y = 100 + row * (200 + spacing);
        
        card.style.left = x + 'px';
        card.style.top = y + 'px';
    });
    
    redrawAll();
}

function getContrastYIQ(hexcolor) {
    if (!hexcolor) return 'black';
    if (hexcolor.startsWith('rgb')) {
        const m = hexcolor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (m) {
            const r = parseInt(m[1]).toString(16).padStart(2, '0');
            const g = parseInt(m[2]).toString(16).padStart(2, '0');
            const b = parseInt(m[3]).toString(16).padStart(2, '0');
            hexcolor = '#' + r + g + b;
        }
    }
    if (hexcolor.length < 7) return 'black';
    hexcolor = hexcolor.replace('#', '');
    if (hexcolor.length === 3) {
        hexcolor = hexcolor[0] + hexcolor[0] + hexcolor[1] + hexcolor[1] + hexcolor[2] + hexcolor[2];
    }
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

function updateAllCardsTextColor() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const backgroundColor = card.style.background;
        const contentDiv = card.querySelector('.card-content');
        const header = card.querySelector('.card-header');
        
        if (contentDiv && backgroundColor) {
            contentDiv.style.color = getContrastYIQ(backgroundColor);
        }
        
        if (header && backgroundColor) {
            const headerColor = shadeColor(backgroundColor, -20);
            header.style.color = getContrastYIQ(headerColor);
        }
    });
}

function closeAllCardMenus() {
    document.querySelectorAll('.card-menu-btn.active').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Restaurar z-index normal en móvil
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.card').forEach(card => {
            card.style.zIndex = '1000';
        });
    }
}

function shadeColor(color, percent) {
    if (!color) return color;
    let hex = color;
    if (color.startsWith('rgb')) {
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (m) {
            const r = parseInt(m[1]).toString(16).padStart(2, '0');
            const g = parseInt(m[2]).toString(16).padStart(2, '0');
            const b = parseInt(m[3]).toString(16).padStart(2, '0');
            hex = '#' + r + g + b;
        }
    }
    if (hex.length < 7) return color;
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;
    const RR = (R.toString(16).length === 1 ? "0" : "") + R.toString(16);
    const GG = (G.toString(16).length === 1 ? "0" : "") + G.toString(16);
    const BB = (B.toString(16).length === 1 ? "0" : "") + B.toString(16);
    return "#" + RR + GG + BB;
}

// --- Funciones para la gestión de conexiones ---

function handleConnect(card) {
    console.log('handleConnect llamado con tarjeta:', card);
    console.log('startCard actual:', startCard);
    
    if (!startCard) {
        startCard = card;
        card.style.border = '2px solid blue'; 
        console.log('Primera tarjeta seleccionada para conectar:', card.getAttribute('data-id'));
    } else {
        const endCard = card;
        const startId = startCard.getAttribute('data-id');
        const endId = endCard.getAttribute('data-id');

        console.log('Intentando conectar tarjetas:', startId, '->', endId);

        if (startId && endId && startId !== endId) {
            console.log('Guardando conexión en Supabase...');
            saveConnectionToSupabase(startId, endId);
        } else {
            console.log('No se pudo crear la conexión. startId:', startId, 'endId:', endId);
        }

        startCard.style.border = '2px solid transparent';
        startCard = null;
        console.log('Conexión completada.');
    }
}

async function saveConnectionToSupabase(startId, endId) {
    if (!user) return;
    try {
        const { data, error } = await supabase.from('connections').insert({
            user_id: user.id,
            start_card_id: startId,
            end_card_id: endId
        }).select();
        if (error) throw error;
        connectionsData.push(data[0]);
        console.log('Conexión guardada');
        redrawAll();
    } catch (err) {
        console.error('Error guardando la conexión:', err);
    }
}

async function loadConnectionsFromSupabase() {
    if (!user) return;
    try {
        const { data, error } = await supabase
            .from('connections')
            .select('*')
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        connectionsData = data;
        redrawAll(); 
    } catch (err) {
        console.error('Error cargando conexiones:', err);
    }
}

async function updateConnectionColors(cardId, newColor) {
    if (!user) return;
    try {
        // Actualizar el array local
        connectionsData.forEach(conn => {
            if (conn.start_card_id === cardId) {
                conn.color = newColor;
            }
        });
        
        // Redibujar para mostrar los cambios
        redrawAll();
        console.log('Colores de conexiones actualizados');
    } catch (err) {
        console.error('Error actualizando colores de conexiones:', err);
    }
}

async function deleteConnection(connectionId) {
    if (!user) return;
    try {
        const { error } = await supabase
            .from('connections')
            .delete()
            .eq('id', connectionId)
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        connectionsData = connectionsData.filter(conn => conn.id !== connectionId);
        console.log('Conexión eliminada correctamente');
        redrawAll();
    } catch (err) {
        console.error('Error al eliminar la conexión:', err);
        alert('Hubo un error al eliminar la conexión.');
    }
}

async function saveStrokeToSupabase(stroke) {
    if (!user) return;
    try {
        const { data, error } = await supabase.from('strokes').insert({
            user_id: user.id,
            path: stroke.path,
            color: stroke.color,
            width: stroke.width
        }).select();

        if (error) throw error;
        console.log('Trazo guardado:', data[0].id);
        strokesData.push(data[0]); 
    } catch (err) {
        console.error('Error guardando el trazo:', err);
    }
}

async function loadStrokesFromSupabase() {
    if (!user) return;
    try {
        const { data, error } = await supabase
            .from('strokes')
            .select('*')
            .eq('user_id', user.id);
        
        if (error) throw error;

        strokesData = data;
        redrawAll(); 
    } catch (err) {
        console.error('Error cargando trazos:', err);
    }
}

async function loadCanvasElementsFromSupabase() {
    if (!user) return;
    try {
        console.log('Iniciando carga de elementos del canvas...');
        const { data, error } = await supabase
            .from('canvas_elements')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });
        
        if (error) throw error;

        canvasElementsData = data || [];
        
        // Limpiar elementos existentes antes de recrear
        document.querySelectorAll('.canvas-element').forEach(element => element.remove());
        canvasElements = [];
        
        console.log(`Cargados ${canvasElementsData.length} elementos del canvas, recreando...`);
        
        // Recrear elementos del canvas con un pequeño delay para evitar bloqueos
        if (canvasElementsData.length > 0) {
            // Crear elementos en lotes para mejor rendimiento
            const batchSize = 5;
            for (let i = 0; i < canvasElementsData.length; i += batchSize) {
                const batch = canvasElementsData.slice(i, i + batchSize);
                await new Promise(resolve => setTimeout(resolve, 10)); // Pequeño delay entre lotes
                
                batch.forEach(elementData => {
                    try {
                        createCanvasElementFromData(elementData);
                    } catch (err) {
                        console.error('Error creando elemento:', elementData.id, err);
                    }
                });
            }
        }
        
        console.log(`Elementos del canvas recreados exitosamente`);
    } catch (err) {
        console.error('Error cargando elementos del canvas:', err);
        // Si hay error de refresh token, intentar recargar la sesión
        if (err.message && err.message.includes('refresh')) {
            console.log('Error de refresh token detectado, intentando renovar sesión...');
            try {
                const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
                if (!refreshError && session) {
                    console.log('Sesión renovada, reintentando carga...');
                    setTimeout(() => loadCanvasElementsFromSupabase(), 1000);
                }
            } catch (refreshErr) {
                console.error('Error renovando sesión:', refreshErr);
            }
        }
    }
}

async function saveCanvasElementToSupabase(element, type, content) {
    if (!user) return;
    try {
        const elementData = {
            user_id: user.id,
            type: type,
            content: content,
            position_x: parseInt(element.style.left) || 0,
            position_y: parseInt(element.style.top) || 0,
            width: parseInt(element.style.width) || 200,
            height: parseInt(element.style.height) || (type === 'image' ? 150 : 100)
        };

        const { data, error } = await supabase
            .from('canvas_elements')
            .insert(elementData)
            .select();

        if (error) throw error;

        // Asignar el ID al elemento
        element.setAttribute('data-element-id', data[0].id);
        
        // Actualizar el array local
        canvasElementsData.push(data[0]);
        
        console.log('Elemento del canvas guardado:', data[0].id);
    } catch (err) {
        console.error('Error guardando elemento del canvas:', err);
    }
}

async function updateCanvasElementInSupabase(element) {
    if (!user) return;
    try {
        const elementId = element.getAttribute('data-element-id');
        if (!elementId) return;

        const updateData = {
            position_x: parseInt(element.style.left) || 0,
            position_y: parseInt(element.style.top) || 0,
            width: parseInt(element.style.width) || 200,
            height: parseInt(element.style.height) || 100
        };

        const { error } = await supabase
            .from('canvas_elements')
            .update(updateData)
            .eq('id', elementId)
            .eq('user_id', user.id);

        if (error) throw error;

        // Actualizar el array local
        const index = canvasElementsData.findIndex(el => el.id === elementId);
        if (index !== -1) {
            canvasElementsData[index] = { ...canvasElementsData[index], ...updateData };
        }

        console.log('Elemento del canvas actualizado:', elementId);
    } catch (err) {
        console.error('Error actualizando elemento del canvas:', err);
    }
}

async function deleteCanvasElementFromSupabase(element) {
    if (!user) return;
    try {
        const elementId = element.getAttribute('data-element-id');
        if (!elementId) return;

        const { error } = await supabase
            .from('canvas_elements')
            .delete()
            .eq('id', elementId)
            .eq('user_id', user.id);

        if (error) throw error;

        // Remover del array local
        canvasElementsData = canvasElementsData.filter(el => el.id !== elementId);

        console.log('Elemento del canvas eliminado:', elementId);
    } catch (err) {
        console.error('Error eliminando elemento del canvas:', err);
    }
}

async function updateCanvasElementContentInSupabase(element, newContent) {
    if (!user) return;
    try {
        const elementId = element.getAttribute('data-element-id');
        if (!elementId) return;

        const { error } = await supabase
            .from('canvas_elements')
            .update({ content: newContent })
            .eq('id', elementId)
            .eq('user_id', user.id);

        if (error) throw error;

        // Actualizar el array local
        const index = canvasElementsData.findIndex(el => el.id === elementId);
        if (index !== -1) {
            canvasElementsData[index].content = newContent;
        }

        console.log('Contenido del elemento actualizado:', elementId);
    } catch (err) {
        console.error('Error actualizando contenido del elemento:', err);
    }
}

function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    
    // Filtrar conexiones válidas antes de dibujar
    const validConnections = connectionsData.filter(conn => {
        const startCardElement = document.querySelector(`.card[data-id="${conn.start_card_id}"]`);
        const endCardElement = document.querySelector(`.card[data-id="${conn.end_card_id}"]`);
        return startCardElement && endCardElement;
    });
    
    // Limpiar conexiones huérfanas si hay diferencias
    if (validConnections.length !== connectionsData.length) {
        connectionsData = validConnections;
        // Opcional: limpiar también de la base de datos (comentado para evitar llamadas excesivas)
        // cleanOrphanedConnections();
    }
    
    // Dibujar solo conexiones válidas
    validConnections.forEach(conn => {
        const startCardElement = document.querySelector(`.card[data-id="${conn.start_card_id}"]`);
        const endCardElement = document.querySelector(`.card[data-id="${conn.end_card_id}"]`);
        if (startCardElement && endCardElement) {
            drawConnection(startCardElement, endCardElement, conn.id);
        }
    });

    strokesData.forEach(stroke => {
        drawStroke(stroke);
    });
}

async function cleanOrphanedConnections() {
    if (!user) return;
    
    try {
        const orphanedConnections = connectionsData.filter(conn => {
            const startCardElement = document.querySelector(`.card[data-id="${conn.start_card_id}"]`);
            const endCardElement = document.querySelector(`.card[data-id="${conn.end_card_id}"]`);
            return !startCardElement || !endCardElement;
        });
        
        if (orphanedConnections.length > 0) {
            const orphanedIds = orphanedConnections.map(conn => conn.id);
            const { error } = await supabase
                .from('connections')
                .delete()
                .in('id', orphanedIds);
            
            if (error) {
                console.error('Error limpiando conexiones huérfanas:', error);
            } else {
                console.log(`Limpiadas ${orphanedConnections.length} conexiones huérfanas`);
            }
        }
    } catch (error) {
        console.error('Error inesperado limpiando conexiones huérfanas:', error);
    }
}

function drawStroke(stroke) {
    if (stroke.path.length < 2) return;
    ctx.beginPath();
    
    // Los trazos se guardan en coordenadas absolutas del viewport
    // Para que se mantengan fijos en el canvas, no necesitamos transformar las coordenadas
    // Solo necesitamos ajustar por el scroll del viewport
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Calcular la posición inicial ajustada por el scroll
    const startX = stroke.path[0].x - scrollX;
    const startY = stroke.path[0].y - scrollY;
    
    ctx.moveTo(startX, startY);
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    
    for (let i = 1; i < stroke.path.length; i++) {
        // Calcular la posición de cada punto ajustada por el scroll
        const x = stroke.path[i].x - scrollX;
        const y = stroke.path[i].y - scrollY;
        ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function drawConnection(startElement, endElement, connectionId) {
    const startHeader = startElement.querySelector('.card-header');
    const endHeader = endElement.querySelector('.card-header');

    if (!startHeader || !endHeader) return;

    // Obtener las posiciones absolutas del viewport
    const startRect = startHeader.getBoundingClientRect();
    const endRect = endHeader.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    // Verificar que las tarjetas estén visibles en el viewport
    if (startRect.width === 0 || startRect.height === 0 || 
        endRect.width === 0 || endRect.height === 0) {
        return; // No dibujar si las tarjetas no están visibles
    }

    // Convertir a coordenadas relativas al canvas (consistente con otras funciones)
    let startX = startRect.left - canvasRect.left + startRect.width / 2;
    let startY = startRect.top - canvasRect.top + startRect.height / 2;
    let endX = endRect.left - canvasRect.left + endRect.width / 2;
    let endY = endRect.top - canvasRect.top + endRect.height / 2;
    
    // Ajustar para dispositivos móviles - considerar el zoom y la posición del viewport
    if (window.innerWidth <= 768) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        
        startX *= scaleX;
        startY *= scaleY;
        endX *= scaleX;
        endY *= scaleY;
        
        // Verificar que las coordenadas estén dentro del canvas
        if (startX < 0 || startX > canvas.width || startY < 0 || startY > canvas.height ||
            endX < 0 || endX > canvas.width || endY < 0 || endY > canvas.height) {
            // Si las coordenadas están fuera del canvas, usar coordenadas relativas simples
            startX = startRect.left - canvasRect.left + startRect.width / 2;
            startY = startRect.top - canvasRect.top + startRect.height / 2;
            endX = endRect.left - canvasRect.left + endRect.width / 2;
            endY = endRect.top - canvasRect.top + endRect.height / 2;
        }
    }

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    
    // Usar el color de la primera tarjeta directamente
    const connectionColor = startElement.style.background || '#cce4f7';
    
    // Make connections more visible when in erase connections mode
    if (erasingConnections) {
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 8; // Más grueso para mejor detección
        // Add a dashed pattern to indicate it's deletable
        ctx.setLineDash([10, 5]);
    } else {
        // Usar el color de la primera tarjeta
        ctx.strokeStyle = connectionColor;
        ctx.lineWidth = 4; // Líneas más gruesas
        ctx.setLineDash([]);
    }
    
    ctx.stroke();
}

function distToSegmentSquared(p, v, w) {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return dist2(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = {
        x: v.x + t * (w.x - v.x),
        y: v.y + t * (w.y - v.y)
    };
    return dist2(p, projection);
}

function dist2(p1, p2) {
    return (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y);
}

function handleConnectionHover(e) {
    // Esta función ya no se usa, se eliminó el hover
    return;
}

function drawConnectionHighlight(connection) {
    const startCard = document.querySelector(`.card[data-id="${connection.start_card_id}"]`);
    const endCard = document.querySelector(`.card[data-id="${connection.end_card_id}"]`);
    
    if (!startCard || !endCard) return;
    
    const startHeader = startCard.querySelector('.card-header');
    const endHeader = endCard.querySelector('.card-header');
    
    if (!startHeader || !endHeader) return;
    
    // Obtener las posiciones absolutas del viewport
    const startRect = startHeader.getBoundingClientRect();
    const endRect = endHeader.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // Convertir a coordenadas relativas al canvas
    let startX = startRect.left - canvasRect.left + startRect.width / 2;
    let startY = startRect.top - canvasRect.top + startRect.height / 2;
    let endX = endRect.left - canvasRect.left + endRect.width / 2;
    let endY = endRect.top - canvasRect.top + endRect.height / 2;
    
    // Ajustar para dispositivos móviles
    if (window.innerWidth <= 768) {
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        
        startX *= scaleX;
        startY *= scaleY;
        endX *= scaleX;
        endY *= scaleY;
    }
    
    // Draw a highlight over the connection with glow effect
    ctx.save();
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 10;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.restore();
}

function drawConnectionHover(connection) {
    const startCard = document.querySelector(`.card[data-id="${connection.start_card_id}"]`);
    const endCard = document.querySelector(`.card[data-id="${connection.end_card_id}"]`);
    
    if (!startCard || !endCard) return;
    
    const startHeader = startCard.querySelector('.card-header');
    const endHeader = endCard.querySelector('.card-header');
    
    if (!startHeader || !endHeader) return;
    
    // Obtener las posiciones absolutas del viewport
    const startRect = startHeader.getBoundingClientRect();
    const endRect = endHeader.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // Convertir a coordenadas relativas al canvas
    let startX = startRect.left - canvasRect.left + startRect.width / 2;
    let startY = startRect.top - canvasRect.top + startRect.height / 2;
    let endX = endRect.left - canvasRect.left + endRect.width / 2;
    let endY = endRect.top - canvasRect.top + endRect.height / 2;
    
    // Ajustar para dispositivos móviles
    if (window.innerWidth <= 768) {
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        
        startX *= scaleX;
        startY *= scaleY;
        endX *= scaleX;
        endY *= scaleY;
    }
    
    // Draw a highlight over the connection with glow effect
    ctx.save();
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 8;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.restore();
}

function findConnectionAtPoint(x, y, threshold) {
    const thresholdSquared = threshold * threshold;
    
    for (const conn of connectionsData) {
        const startCard = document.querySelector(`.card[data-id="${conn.start_card_id}"]`);
        const endCard = document.querySelector(`.card[data-id="${conn.end_card_id}"]`);
        
        if (!startCard || !endCard) continue;

        const startHeader = startCard.querySelector('.card-header');
        const endHeader = endCard.querySelector('.card-header');
        
        if (!startHeader || !endHeader) continue;

        const startRect = startHeader.getBoundingClientRect();
        const endRect = endHeader.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        // Convertir a coordenadas relativas al canvas (consistente con drawConnection)
        const v = { 
            x: startRect.left - canvasRect.left + startRect.width / 2, 
            y: startRect.top - canvasRect.top + startRect.height / 2 
        };
        const w = { 
            x: endRect.left - canvasRect.left + endRect.width / 2, 
            y: endRect.top - canvasRect.top + endRect.height / 2 
        };

        // Calcular la distancia al segmento de línea
        const distance = distToSegmentSquared({ x, y }, v, w);
        
        if (distance < thresholdSquared) {
            console.log('Conexión encontrada en:', x, y, 'distancia:', Math.sqrt(distance));
            return conn;
        }
    }
    return null;
}

function findStrokeAtPoint(x, y, threshold) {
    const thresholdSquared = threshold * threshold;
    
    // Convertir coordenadas del canvas a coordenadas absolutas para comparar
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Convertir el punto de búsqueda a coordenadas absolutas
    const absoluteX = x + scrollX;
    const absoluteY = y + scrollY;
    
    for (const stroke of strokesData) {
        if (stroke.path.length < 2) continue;

        for (let i = 0; i < stroke.path.length - 1; i++) {
            const p = { x: absoluteX, y: absoluteY };
            const v = stroke.path[i];
            const w = stroke.path[i + 1];

            if (distToSegmentSquared(p, v, w) < thresholdSquared) {
                return stroke;
            }
        }
    }
    return null;
}

// --- Listeners de Eventos Principales ---

document.addEventListener('DOMContentLoaded', () => {
    authForm.addEventListener('submit', handleAuth);
    toggleAuthModeBtn.addEventListener('click', toggleAuthMode);
    getInitialSession();
});

function setupPizarraListeners() {
    burgerBtn.addEventListener('click', () => sidePanel.classList.toggle('closed'));
    logoutBtn.addEventListener('click', handleLogout);
    
    drawBtn.addEventListener('click', () => {
        if (drawing) {
            drawing = false;
            drawBtn.classList.remove('active');
            canvas.style.cursor = 'default';
            toolStatus.textContent = '';
        } else {
            drawing = true;
            erasingStrokes = false;
            erasingConnections = false;
            drawBtn.classList.add('active');
            eraseStrokesBtn.classList.remove('active');
            eraseConnectionsBtn.classList.remove('active');
            canvas.style.cursor = 'crosshair';
            toolStatus.textContent = 'Modo dibujar activo';
        }
    });

    eraseStrokesBtn.addEventListener('click', () => {
        if (erasingStrokes) {
            erasingStrokes = false;
            eraseStrokesBtn.classList.remove('active');
            canvas.style.cursor = 'default';
            toolStatus.textContent = '';
        } else {
            erasingStrokes = true;
            drawing = false;
            erasingConnections = false;
            eraseStrokesBtn.classList.add('active');
            drawBtn.classList.remove('active');
            eraseConnectionsBtn.classList.remove('active');
            canvas.style.cursor = 'crosshair';
            toolStatus.textContent = 'Modo borrar trazos activo - Haz clic en los trazos para eliminarlos';
        }
    });

    eraseConnectionsBtn.addEventListener('click', () => {
        if (erasingConnections) {
            erasingConnections = false;
            eraseConnectionsBtn.classList.remove('active');
            canvas.style.cursor = 'default';
            toolStatus.textContent = '';
            // Redibujar para volver al estado normal
            redrawAll();
        } else {
            erasingConnections = true;
            drawing = false;
            erasingStrokes = false;
            eraseConnectionsBtn.classList.add('active');
            drawBtn.classList.remove('active');
            eraseStrokesBtn.classList.remove('active');
            canvas.style.cursor = 'pointer';
            toolStatus.textContent = 'Modo borrar conexiones activo - Haz clic en las conexiones para eliminarlas';
            // Ocultar el menú lateral para mejor visibilidad
            sidePanel.classList.add('closed');
            // Redibujar para mostrar las conexiones en rojo inmediatamente
            redrawAll();
        }
    });

    clearCanvasBtn.addEventListener('click', clearCanvas);
    deleteAllCardsBtn.addEventListener('click', deleteAllCards);
    toggleAllCardsBtn.addEventListener('click', toggleAllCards);
    decreaseCardSizeBtn.addEventListener('click', decreaseCardSize);
    increaseCardSizeBtn.addEventListener('click', increaseCardSize);
    generateCardsBtn.addEventListener('click', generateCards);
    reorderCardsBtn.addEventListener('click', reorderCards);
    
    // Event listener para restaurar vista normal
    const restoreNormalViewBtn = document.getElementById('restoreNormalViewBtn');
    restoreNormalViewBtn.addEventListener('click', () => {
        const cards = Array.from(document.querySelectorAll('.card'));
        restoreNormalView(cards);
        saveCardsToSupabase();
    });
    
    // Event listeners para elementos del canvas
    addImageBtn.addEventListener('click', addImageToCanvas);
    addTextBtn.addEventListener('click', addTextToCanvas);

    sidePanel.addEventListener('touchmove', (e) => {
        e.stopPropagation(); 
    });

    // Eventos para mouse
    canvas.addEventListener("mousedown", startDrawingOrErasing);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", stopDrawingOrErasing);
    canvas.addEventListener("mouseleave", stopDrawingOrErasing);
    
    // Eventos para touch (móviles) - Mejorados para móviles
    canvas.addEventListener("touchstart", startDrawingOrErasing, { passive: false }); 
    canvas.addEventListener("touchmove", doDrawingOrErasing, { passive: false });
    canvas.addEventListener("touchend", stopDrawingOrErasing);
    
    // Eventos para elementos del canvas
    document.addEventListener("mousemove", handleElementDrag);
    document.addEventListener("touchmove", handleElementDrag, { passive: false });
    document.addEventListener("mouseup", stopElementDrag);
    document.addEventListener("touchend", stopElementDrag);
    document.addEventListener("click", handleCanvasClick);
    
    window.addEventListener("resize", resizeCanvas);
    
    // Agregar listener para el evento scroll
    window.addEventListener("scroll", redrawAll);
    
    // Listeners específicos para móvil
    if (window.innerWidth <= 768) {
        // Redibujar en eventos de zoom y orientación en móvil
        window.addEventListener("orientationchange", () => {
            setTimeout(() => {
                resizeCanvas();
                redrawAll();
            }, 100);
        });
        
        // Redibujar cuando cambia el viewport (zoom)
        window.addEventListener("resize", () => {
            setTimeout(() => {
                redrawAll();
            }, 50);
        });
        
        // Redibujar en eventos de touch que puedan afectar el viewport
        document.addEventListener("touchstart", () => {
            setTimeout(() => {
                redrawAll();
            }, 100);
        }, { passive: true });
    }
    
    // Cerrar menús de tarjetas cuando se hace clic fuera de ellos
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.card-menu-btn') && !e.target.closest('.card-submenu')) {
            closeAllCardMenus();
        }
    });
    
    // Cerrar menús de tarjetas cuando se hace touch fuera de ellos en móvil
    document.addEventListener('touchstart', (e) => {
        if (!e.target.closest('.card-menu-btn') && !e.target.closest('.card-submenu')) {
            closeAllCardMenus();
        }
    }, { passive: true });
    
    // Permitir zoom en dispositivos móviles pero prevenir pinch en el canvas solo cuando se está dibujando
    canvas.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1 && (drawing || erasingStrokes || erasingConnections)) {
            e.preventDefault();
        }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1 && (drawing || erasingStrokes || erasingConnections)) {
            e.preventDefault();
        }
    }, { passive: false });
    
    resizeCanvas();
}

function startDrawingOrErasing(e) {
    if (e.target.closest('.card') || e.target.closest('#sidePanel') || e.target.closest('#burgerBtn')) {
        isDrawing = false; 
        return;
    }
    
    const pos = getPos(e);

    if (drawing) {
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        currentStroke = [{ x: pos.x, y: pos.y }];
        e.preventDefault();
    } else if (erasingStrokes) {
        // En modo borrar trazos, detectar trazos al hacer clic
        const strokeAtPoint = findStrokeAtPoint(pos.x, pos.y, 25);
        if (strokeAtPoint) {
            if (confirm("¿Estás seguro de que quieres eliminar este trazo?")) {
                deleteStroke(strokeAtPoint.id);
            }
        }
        e.preventDefault();
    } else if (erasingConnections) {
        // En modo borrar conexiones, detectar conexiones al hacer clic
        // Ahora findConnectionAtPoint espera coordenadas relativas al canvas
        const connectionAtPoint = findConnectionAtPoint(pos.x, pos.y, 25);
        if (connectionAtPoint) {
            // Resaltar la conexión seleccionada
            window.selectedConnection = connectionAtPoint;
            redrawAll();
            drawConnectionHighlight(connectionAtPoint);
            
            // Preguntar si quiere eliminar
            if (confirm("¿Estás seguro de que quieres eliminar esta conexión?")) {
                deleteConnection(connectionAtPoint.id);
            }
            window.selectedConnection = null;
            redrawAll();
        }
        // No prevenir el comportamiento por defecto para permitir scroll
        // e.preventDefault();
    }
}

function handleMouseMove(e) {
    // Handle drawing/erasing
    doDrawingOrErasing(e);
}

function doDrawingOrErasing(e) {
    if (!isDrawing) return;
    
    const pos = getPos(e);

    if (drawing) {
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = "#004578";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
        currentStroke.push({ x: pos.x, y: pos.y });
        e.preventDefault();
    }
}

async function stopDrawingOrErasing(e) {
    if (isDrawing && drawing && currentStroke.length > 1) { 
        await saveStrokeToSupabase({
            color: "#004578",
            width: 2,
            path: currentStroke
        });
    }
    
    isDrawing = false;
    currentStroke = [];
}

async function deleteStroke(strokeId) {
    if (!user) return;
    try {
        const { error } = await supabase
            .from('strokes')
            .delete()
            .eq('id', strokeId)
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        strokesData = strokesData.filter(stroke => stroke.id !== strokeId);
        console.log(`Trazo con ID ${strokeId} eliminado.`);
        redrawAll(); 
    } catch (err) {
        console.error('Error al eliminar el trazo:', err);
        alert('Hubo un error al eliminar el trazo.');
    }
}

function handleCanvasTouchStart(e) {
    if (e.touches.length === 2) {
        isPinching = true;
        lastDistance = getDistance(e.touches[0], e.touches[1]);
        e.preventDefault();
    }
}

function handleCanvasTouchMove(e) {
    if (!isDrawing && !isPinching) return;

    if (isPinching && e.touches.length === 2) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const delta = currentDistance - lastDistance;

        if (Math.abs(delta) > 10) { 
            console.log('Pinching detected, delta:', delta);
            lastDistance = currentDistance;
        }
        e.preventDefault(); 
    }
}

function handleCanvasTouchEnd() {
    if (isPinching) {
        isPinching = false;
        lastDistance = 0;
    }
}

// ---- Funciones para Elementos del Canvas ----

function createCanvasElement(type, x, y, content = null) {
    const element = document.createElement('div');
    element.className = 'canvas-element';
    element.style.left = x + 'px';
    element.style.top = y + 'px';
    element.style.zIndex = ++highestCanvasZ;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteCanvasElement(element);
    };
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = content;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        element.style.width = '200px';
        element.style.height = '150px';
        element.appendChild(img);
        element.appendChild(deleteBtn);
        
        // Agregar handles de redimensionamiento
        addResizeHandles(element);
        
    } else if (type === 'text') {
        const textArea = document.createElement('textarea');
        textArea.className = 'canvas-text';
        textArea.value = content || 'Texto aquí...';
        textArea.style.width = '100%';
        textArea.style.height = '100%';
        textArea.style.boxSizing = 'border-box';
        textArea.style.resize = 'none';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.background = 'transparent';
        textArea.style.fontFamily = 'inherit';
        textArea.style.fontSize = '14px';
        element.style.width = '200px';
        element.style.height = '100px';
        element.appendChild(textArea);
        element.appendChild(deleteBtn);
        
        // Agregar handles de redimensionamiento
        addResizeHandles(element);
        
        // Hacer el texto editable al hacer doble clic
        textArea.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            textArea.focus();
        });
        
        // Guardar cambios de texto cuando se edita
        textArea.addEventListener('input', (e) => {
            e.stopPropagation();
            // Actualizar el contenido en el array local
            const index = canvasElements.findIndex(item => item.element === element);
            if (index !== -1) {
                canvasElements[index].content = textArea.value;
            }
            // Guardar en Supabase
            updateCanvasElementContentInSupabase(element, textArea.value);
        });
    }
    
    // Agregar funcionalidad de arrastre
    makeElementDraggable(element);
    
    // Agregar al array y al DOM
    canvasElements.push({
        element: element,
        type: type,
        content: content
    });
    
    document.body.appendChild(element);
    
    // Guardar en Supabase si es un nuevo elemento
    if (!element.getAttribute('data-element-id')) {
        saveCanvasElementToSupabase(element, type, content);
    }
    
    return element;
}

function createCanvasElementFromData(elementData) {
    const element = document.createElement('div');
    element.className = 'canvas-element';
    element.setAttribute('data-element-id', elementData.id);
    element.style.left = elementData.position_x + 'px';
    element.style.top = elementData.position_y + 'px';
    element.style.width = elementData.width + 'px';
    element.style.height = elementData.height + 'px';
    element.style.zIndex = ++highestCanvasZ;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteCanvasElement(element);
    };
    
    if (elementData.type === 'image') {
        const img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        
        // Agregar placeholder mientras carga la imagen
        element.style.background = '#f0f0f0';
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
        
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Cargando imagen...';
        loadingText.style.color = '#666';
        loadingText.style.fontSize = '12px';
        element.appendChild(loadingText);
        
        img.onload = () => {
            element.style.background = 'transparent';
            element.removeChild(loadingText);
            element.appendChild(img);
            element.appendChild(deleteBtn);
            addResizeHandles(element);
        };
        
        img.onerror = () => {
            element.style.background = '#ffebee';
            loadingText.textContent = 'Error al cargar imagen';
            loadingText.style.color = '#d32f2f';
        };
        
        img.src = elementData.content;
        
    } else if (elementData.type === 'text') {
        const textArea = document.createElement('textarea');
        textArea.className = 'canvas-text';
        textArea.value = elementData.content || 'Texto aquí...';
        textArea.style.width = '100%';
        textArea.style.height = '100%';
        textArea.style.boxSizing = 'border-box';
        textArea.style.resize = 'none';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.background = 'transparent';
        textArea.style.fontFamily = 'inherit';
        textArea.style.fontSize = '14px';
        element.appendChild(textArea);
        element.appendChild(deleteBtn);
        
        // Agregar handles de redimensionamiento
        addResizeHandles(element);
        
        // Hacer el texto editable al hacer doble clic
        textArea.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            textArea.focus();
        });
        
        // Guardar cambios de texto cuando se edita
        textArea.addEventListener('input', (e) => {
            e.stopPropagation();
            // Actualizar el contenido en el array local
            const index = canvasElements.findIndex(item => item.element === element);
            if (index !== -1) {
                canvasElements[index].content = textArea.value;
            }
            // Guardar en Supabase
            updateCanvasElementContentInSupabase(element, textArea.value);
        });
    }
    
    // Agregar funcionalidad de arrastre
    makeElementDraggable(element);
    
    // Agregar al array y al DOM
    canvasElements.push({
        element: element,
        type: elementData.type,
        content: elementData.content
    });
    
    document.body.appendChild(element);
    return element;
}

function addResizeHandles(element) {
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        handle.onmousedown = (e) => startResize(e, element, pos);
        handle.ontouchstart = (e) => startResize(e, element, pos);
        element.appendChild(handle);
    });
}

function makeElementDraggable(element) {
    element.onmousedown = (e) => {
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-btn')) {
            return;
        }
        startDrag(e, element);
    };
    
    element.ontouchstart = (e) => {
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-btn')) {
            return;
        }
        startDrag(e, element);
    };
}

function startDrag(e, element) {
    e.preventDefault();
    e.stopPropagation();
    
    // Deseleccionar otros elementos
    if (selectedElement && selectedElement !== element) {
        selectedElement.classList.remove('selected');
    }
    
    selectedElement = element;
    element.classList.add('selected');
    
    isDraggingElement = true;
    
    // Obtener coordenadas relativas al canvas para touch y mouse
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const rect = element.getBoundingClientRect();
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
    
    element.style.zIndex = ++highestCanvasZ;
}

function startResize(e, element, handle) {
    e.preventDefault();
    e.stopPropagation();
    
    isResizingElement = true;
    resizeHandle = handle;
    selectedElement = element;
    element.classList.add('selected');
    
    // Calcular el offset basado en la posición del handle
    const rect = element.getBoundingClientRect();
    
    // Obtener coordenadas relativas al canvas para touch y mouse
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    // El offset debe ser la diferencia entre la posición del mouse y la esquina del elemento
    switch (handle) {
        case 'se':
            dragOffset.x = clientX - rect.right;
            dragOffset.y = clientY - rect.bottom;
            break;
        case 'sw':
            dragOffset.x = clientX - rect.left;
            dragOffset.y = clientY - rect.bottom;
            break;
        case 'ne':
            dragOffset.x = clientX - rect.right;
            dragOffset.y = clientY - rect.top;
            break;
        case 'nw':
            dragOffset.x = clientX - rect.left;
            dragOffset.y = clientY - rect.top;
            break;
    }
    
    element.style.zIndex = ++highestCanvasZ;
}

function handleElementDrag(e) {
    if (!isDraggingElement && !isResizingElement) return;
    
    // Obtener coordenadas relativas al canvas para touch y mouse
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    if (isDraggingElement && selectedElement) {
        const newX = clientX - dragOffset.x;
        const newY = clientY - dragOffset.y;
        
        // Expandir el canvas si es necesario para elementos del canvas
        expandCanvasIfNeeded(newX, newY, selectedElement.offsetWidth, selectedElement.offsetHeight);
        
        selectedElement.style.left = newX + 'px';
        selectedElement.style.top = newY + 'px';
    }
    
    if (isResizingElement && selectedElement) {
        const rect = selectedElement.getBoundingClientRect();
        
        // Calcular las nuevas dimensiones basadas en la posición del mouse/touch
        let newWidth, newHeight, newX, newY;
        
        switch (resizeHandle) {
            case 'se':
                newWidth = Math.max(50, clientX - rect.left);
                newHeight = Math.max(50, clientY - rect.top);
                newX = rect.left;
                newY = rect.top;
                break;
            case 'sw':
                newWidth = Math.max(50, rect.right - clientX);
                newHeight = Math.max(50, clientY - rect.top);
                newX = clientX;
                newY = rect.top;
                break;
            case 'ne':
                newWidth = Math.max(50, clientX - rect.left);
                newHeight = Math.max(50, rect.bottom - clientY);
                newX = rect.left;
                newY = clientY;
                break;
            case 'nw':
                newWidth = Math.max(50, rect.right - clientX);
                newHeight = Math.max(50, rect.bottom - clientY);
                newX = clientX;
                newY = clientY;
                break;
        }
        
        // Expandir el canvas si es necesario durante el redimensionamiento
        expandCanvasIfNeeded(newX, newY, newWidth, newHeight);
        
        selectedElement.style.width = newWidth + 'px';
        selectedElement.style.height = newHeight + 'px';
        selectedElement.style.left = newX + 'px';
        selectedElement.style.top = newY + 'px';
        
        // Redimensionar el contenido interno si es una imagen o texto
        const img = selectedElement.querySelector('img');
        const textArea = selectedElement.querySelector('textarea');
        
        if (img) {
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
        }
        
        if (textArea) {
            textArea.style.width = '100%';
            textArea.style.height = '100%';
            textArea.style.boxSizing = 'border-box';
        }
    }
}

function stopElementDrag() {
    if (isDraggingElement && selectedElement) {
        // Guardar cambios de posición en Supabase
        updateCanvasElementInSupabase(selectedElement);
    }
    
    if (isResizingElement && selectedElement) {
        // Guardar cambios de tamaño en Supabase
        updateCanvasElementInSupabase(selectedElement);
    }
    
    isDraggingElement = false;
    isResizingElement = false;
    resizeHandle = null;
}

function deleteCanvasElement(element) {
    // Eliminar de Supabase
    deleteCanvasElementFromSupabase(element);
    
    // Eliminar del array local
    const index = canvasElements.findIndex(item => item.element === element);
    if (index > -1) {
        canvasElements.splice(index, 1);
    }
    element.remove();
    if (selectedElement === element) {
        selectedElement = null;
    }
}

function addImageToCanvas() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const x = window.innerWidth / 2 - 100;
                const y = window.innerHeight / 2 - 100;
                createCanvasElement('image', x, y, e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function addTextToCanvas() {
    const x = window.innerWidth / 2 - 100;
    const y = window.innerHeight / 2 - 50;
    createCanvasElement('text', x, y, 'Nuevo texto');
}

// Función para manejar clics en el canvas (deseleccionar elementos)
function handleCanvasClick(e) {
    if (e.target === canvas || e.target === document.body) {
        if (selectedElement) {
            selectedElement.classList.remove('selected');
            selectedElement = null;
        }
    }
}