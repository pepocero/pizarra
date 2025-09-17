<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pizarra de Ideas - Presentación</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 2v6H6v2h5v6h2v-6h5v-2h-5V6z' fill='%23004578'/%3E%3C/svg%3E">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .container {
            text-align: center;
            max-width: 800px;
            padding: 40px 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .logo {
            font-size: 4rem;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        h1 {
            font-size: 3rem;
            margin-bottom: 20px;
            font-weight: 300;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .subtitle {
            font-size: 1.5rem;
            margin-bottom: 30px;
            opacity: 0.9;
            font-weight: 300;
        }

        .description {
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 40px;
            opacity: 0.8;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(5px);
        }

        .feature-icon {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .feature h3 {
            font-size: 1.2rem;
            margin-bottom: 10px;
            font-weight: 500;
        }

        .feature p {
            font-size: 0.9rem;
            opacity: 0.8;
            line-height: 1.4;
        }

        .cta-button {
            display: inline-block;
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 50px;
            font-size: 1.2rem;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
            border: none;
            cursor: pointer;
        }

        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
            background: linear-gradient(45deg, #ee5a24, #ff6b6b);
        }

        .cta-button:active {
            transform: translateY(0);
        }

        .home-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            padding: 12px 16px;
            border-radius: 50%;
            font-size: 1.2rem;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 1000;
        }

        .home-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .home-button:active {
            transform: translateY(0);
        }

        @media (max-width: 768px) {
            .container {
                margin: 20px;
                padding: 30px 15px;
            }

            h1 {
                font-size: 2.5rem;
            }

            .subtitle {
                font-size: 1.2rem;
            }

            .features {
                grid-template-columns: 1fr;
            }

            .home-button {
                top: 15px;
                right: 15px;
                padding: 10px 14px;
                font-size: 1.1rem;
            }
        }
    </style>
</head>
<body>
    <a href="../utilidades.php" class="home-button" title="Volver al Panel de Utilidades">
        🏠
    </a>
    
    <div class="container">
        <div class="logo">📝</div>
        <h1>Pizarra de Ideas</h1>
        <p class="subtitle">Tu espacio creativo digital</p>
        
        <p class="description">
            Una herramienta interactiva que te permite organizar tus ideas de manera visual. 
            Crea tarjetas, establece conexiones, dibuja diagramas y colabora en tiempo real 
            con tu equipo.
        </p>

        <div class="features">
            <div class="feature">
                <div class="feature-icon">📋</div>
                <h3>Tarjetas Inteligentes</h3>
                <p>Crea y organiza tarjetas de ideas con colores personalizables y texto estructurado</p>
            </div>
            
            <div class="feature">
                <div class="feature-icon">🔗</div>
                <h3>Conexiones Visuales</h3>
                <p>Establece relaciones entre ideas con líneas conectivas para visualizar conceptos</p>
            </div>
            
            <div class="feature">
                <div class="feature-icon">🎨</div>
                <h3>Herramientas de Dibujo</h3>
                <p>Dibuja libremente, agrega imágenes y texto para complementar tus ideas</p>
            </div>
            
            <div class="feature">
                <div class="feature-icon">👥</div>
                <h3>Colaboración</h3>
                <p>Trabaja en equipo con sincronización en tiempo real y gestión de usuarios</p>
            </div>
        </div>

        <a href="pizarra.php" class="cta-button">
            🚀 Acceder a la Pizarra
        </a>
    </div>
</body>
</html>