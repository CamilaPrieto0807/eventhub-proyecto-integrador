# EventHub — Proyecto Integrador

Sistema web para la gestión de eventos y espectáculos (registro de usuarios,
administración de clientes/agentes/eventos y reservas), desarrollado como
Proyecto Integrador de Bases de Datos y Programación en Ambiente Web I.

## Estructura del proyecto

```
eventhub-proyecto-integrador/
├── index.html          # Home Page principal (mobile-first)
├── eventos.html        # Cartelera de eventos y compra de entradas
├── categorias.html     # Eventos por categoría
├── como-funciona.html  # Explicación del flujo de la plataforma
├── registro.html       # Registro de usuarios
├── login.html          # Inicio de sesión
├── perfil.html         # Perfil (cliente, agente, administrador) y compras
├── checkout.html       # Checkout con pago simulado
├── ticket.html         # Detalle del ticket (SVG / imprimible)
├── css/
│   └── style.css       # Estilos (HTML5 + CSS3)
├── js/
│   └── main.js         # Lógica del front (sesión, compras, accesibilidad)
└── assets/
    └── img/            # Recursos gráficos
```

## Tecnologías

- HTML5
- CSS3 (mobile-first, responsive)
- JavaScript (vanilla)

## autora

- Camila prieto barbosa
-

## Funciones de demostración

Registro e inicio de sesión en el navegador, con validación y detección de correos duplicados.
Perfiles de cliente, agente y administrador; el administrador puede ajustar aforos.
Cartelera pública para explorar; la compra requiere iniciar sesión y vuelve al evento seleccionado después de autenticarse.
Compra de entradas desde las tarjetas de eventos, con inventario de demostración en el navegador, máximo de 10 entradas por compra y bloqueo al agotarse.
14 eventos de demostración en Tuluá, Cali, Bogotá y Medellín.
Decoración visual animada en portada y encabezados, con movimiento desactivado al respetar las preferencias de movimiento reducido.
Checkout y confirmación de pagos simulados; las compras actualizan las entradas disponibles y aparecen en el perfil.
Desde el perfil, cada compra tiene un detalle de ticket de demostración descargable como SVG o imprimible/guardable como PDF.
Panel de accesibilidad disponible en todas las páginas: tamaño del texto, negrita, modo oscuro, alto contraste, subrayado de enlaces y movimiento reducido. Las preferencias se recuerdan en el navegador.

Los datos usan localStorage, por lo que solo existen en el navegador/dispositivo actual y no se sincronizan entre usuarios. La selección de roles no es una autorización segura. Los pagos son simulados: integrar Stripe real requiere un backend, creación y verificación de sesiones de pago del lado del servidor y claves protegidas; nunca se deben exponer claves secretas ni almacenar datos de tarjeta en el navegador.

Para probar en local, sirve esta carpeta con un servidor estático local y navega a index.html. El flujo no representa autenticación ni pagos aptos para producción.

Estado del proyecto

Prototipo funcional de interfaz para pruebas locales; pendiente de backend, persistencia compartida y pasarela de pago real.