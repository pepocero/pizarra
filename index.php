<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pizarra de Ideas</title>
    <link rel="stylesheet" href="style.css">
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 2v6H6v2h5v6h2v-6h5v-2h-5V6z' fill='%23004578'/%3E%3C/svg%3E">
</head>
<body>

    <div id="auth-container">
        <h1>Pizarra de Ideas</h1>
        <form id="auth-form">
            <input type="email" id="email" placeholder="Correo electrónico" required>
            <input type="password" id="password" placeholder="Contraseña" required>
            <button type="submit" id="auth-btn">Registrarme</button>
        </form>
        <button id="toggle-auth-mode-btn">¿Ya tienes una cuenta? Inicia Sesión</button>
    </div>

    <div id="pizarra-container" style="display: none;">
        <canvas id="canvas"></canvas>

        <button id="burgerBtn">☰</button>
        <div id="sidePanel" class="closed">
            <div class="user-info">
                <span id="userName"></span>
            </div>
            
            <div class="panel-section">
                <h3>Notas</h3>
                                    <input type="text" id="separatorInput" value="Postdata" placeholder="Separador (ej: '###')">
                <textarea id="textInput" placeholder="Escribe tu texto..."></textarea>
                <div class="panel-row">
                    <button id="generateCardsBtn">Generar Tarjetas</button>
                    <div class="color-input-wrapper">
                        <input type="color" id="defaultColor" value="#ffff88" title="Color de la tarjeta">
                        <label for="defaultColor" class="color-label">🎨</label>
                    </div>
                </div>
                <button id="deleteAllCardsBtn" class="danger">Eliminar Todo</button>
            </div>

                         <div class="panel-section">
                 <h3>Visualización</h3>
                 <div class="panel-row">
                     <button id="increaseCardSizeBtn" title="Aumentar tamaño de tarjeta">🔍+</button>
                     <button id="decreaseCardSizeBtn" title="Disminuir tamaño de tarjeta">🔍-</button>
                 </div>
                 <button id="toggleAllCardsBtn">Colapsar/Expandir todo</button>
                 <div class="panel-row">
                     <button id="reorderCardsBtn" title="Reordenar tarjetas">🔄</button>
                     <select id="reorderMethod" title="Método de reordenamiento">
                         <option value="connections">Por conexiones</option>
                         <option value="color">Por color</option>
                         <option value="grid">En cuadrícula</option>
                     </select>
                 </div>
                 <button id="restoreNormalViewBtn" title="Restaurar vista normal">👁️</button>
             </div>

            <div class="panel-section">
                <h3>Herramientas</h3>
                <div class="panel-row">
                    <button id="drawBtn" class="tool-btn" title="Dibujar">🖌️</button>
                    <button id="eraseStrokesBtn" class="tool-btn" title="Borrar trazos">🧽</button>
                    <button id="eraseConnectionsBtn" class="tool-btn" title="Borrar conexiones">🔗❌</button>
                    <button id="clearCanvasBtn" title="Borrar todos los trazos">🧹</button>
                </div>
                <div class="panel-row">
                    <button id="addImageBtn" class="tool-btn" title="Agregar imagen">🖼️</button>
                    <button id="addTextBtn" class="tool-btn" title="Agregar texto">📝</button>
                </div>
                <div id="toolStatus" class="tool-status"></div>
            </div>

            <button id="logoutBtn" class="logout-btn">Cerrar Sesión</button>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script>
        // Fallback si el CDN principal falla
        if (!window.supabase) {
            console.log('Intentando CDN alternativo...');
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2';
            script.onload = () => {
                console.log('Supabase cargado desde CDN alternativo');
                // Recargar la página para reinicializar
                window.location.reload();
            };
            script.onerror = () => {
                console.error('No se pudo cargar Supabase desde ningún CDN');
            };
            document.head.appendChild(script);
        }
    </script>
    <script src="script.js"></script>
</body>
</html>