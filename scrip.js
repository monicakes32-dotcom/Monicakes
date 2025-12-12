// =================================================================
// DECLARACIONES GLOBALES Y CONSTANTES
// =================================================================
const carrito = document.getElementById('carrito'); 
const lista = document.querySelector('#lista-carrito tbody'); 
const vaciarCarritoBtn = document.getElementById('vaciar-carrito');
const contadorCarritoDisplay = document.getElementById('carrito-contador'); 

// Constantes de Rutas y API (MEJORA: Modularidad)
const CHECKOUT_PAGE = 'pedido.html';
const HOME_PAGE = 'index.html';
const API_ENDPOINT = 'http://localhost:3000/api/pedido';
const WHATSAPP_NUMERO_FALLBACK = '7681108424'; 
const MAX_CANTIDAD = 10; // Límite de seguridad establecido en 10, según tu código modificado previamente

// Inicializa el sistema al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarCarritoDesdeStorage();
    actualizarContador(); 
});
cargarEventListeners();

// =================================================================
// FUNCIÓN PRINCIPAL DE LISTENERS Y NAVEGACIÓN
// =================================================================
function cargarEventListeners() {
    const listasProductos = document.querySelectorAll('#lista-1, #lista-fiesta');
    
    listasProductos.forEach(lista => {
        if (lista) {
            lista.addEventListener('click', comprarElemento);
        }
    });

    // Escuchador para ELIMINAR y ACTUALIZAR CANTIDAD en el carrito
    if (carrito) {
        carrito.addEventListener('click', eliminarElemento);
        carrito.addEventListener('change', actualizarCantidadInput); 
    }
    
    if (vaciarCarritoBtn) {
        vaciarCarritoBtn.addEventListener('click', vaciarCarrito);
    }
    
    const botonCheckout = document.getElementById('ir-a-checkout');
    if (botonCheckout) {
        botonCheckout.addEventListener('click', function(e) {
            e.preventDefault(); 
            const carritoActual = JSON.parse(localStorage.getItem('carrito')) || [];
            
            if (carritoActual.length === 0) {
                alert("🛒 Tu carrito está vacío. Agrega productos para pagar.");
            } else {
                window.location.href = CHECKOUT_PAGE;
            }
        });
    }

    if (document.querySelector('.checkout-page')) {
        setupCheckoutPage();
    }
    
    setupBotonSubir();
    setupFooterModals();
    setupHeaderModals();
}

// =================================================================
// UTILIDADES DEL CARRITO (CONTROL DE CANTIDAD Y SUBTOTAL)
// =================================================================

function calcularSubtotal(precio, cantidad) {
    return parseFloat((precio * cantidad).toFixed(0));
}

function comprarElemento(e) {
    e.preventDefault();
    if (e.target.classList.contains('agregar-carrito')) {
        const producto = e.target.closest('.product');
        const infoElemento = leerDatosElemento(producto);
        insertarCarrito(infoElemento);

        // MEJORA UX: Feedback Visual
        e.target.textContent = "¡Añadido! ✅";
        setTimeout(() => {
            e.target.textContent = "Agregar al carrito";
        }, 1500);
    }
}

function leerDatosElemento(producto) {
    return {
        imagen: producto.querySelector('img').src,
        titulo: producto.querySelector('h3').textContent,
        precio: parseFloat(producto.querySelector('.precio').textContent.replace('$', '')), 
        id: producto.querySelector('a').getAttribute('data-id'),
        cantidad: 1
    };
}

function insertarCarrito(elemento) {
    const targetList = document.querySelector('#lista-carrito tbody');
    if (!targetList) return; 

    let encontrado = false;
    targetList.querySelectorAll('tr').forEach(row => {
        const productoId = row.querySelector('.borrar')?.getAttribute('data-id');
        if (productoId === elemento.id) {
            const inputCantidad = row.querySelector('.input-cantidad');
            if (inputCantidad) {
                let nuevaCantidad = parseInt(inputCantidad.value) + 1;
                
                // Aplicar límite máximo (MEJORA DE SEGURIDAD/INTEGRIDAD)
                if (nuevaCantidad > MAX_CANTIDAD) {
                    nuevaCantidad = MAX_CANTIDAD;
                }
                
                inputCantidad.value = nuevaCantidad;
                
                const subtotalCell = row.querySelector('.subtotal');
                if (subtotalCell) {
                    subtotalCell.textContent = `$${calcularSubtotal(elemento.precio, nuevaCantidad)}`; 
                }
            }
            encontrado = true;
        }
    });


    if (!encontrado) {
        const row = document.createElement('tr');
        const precioFijo = elemento.precio.toFixed(0);
        
        row.innerHTML = `
            <td><img src="${elemento.imagen}" width="60" loading="lazy"></td>
            <td>${elemento.titulo}</td>
            <td>$${precioFijo}</td>
            <td class="cantidad-control">
                <input type="number" min="1" value="1" data-id="${elemento.id}" class="input-cantidad" style="width: 50px; text-align: center;">
            </td>
            <td class="subtotal">$${precioFijo}</td>
            <td><a href="#" class="borrar" data-id="${elemento.id}">X</a></td>
        `;
        targetList.appendChild(row);
    }
    guardarCarrito();
    actualizarTotal();
    actualizarContador(); 
}

function actualizarCantidadInput(e) {
    if (e.target.classList.contains('input-cantidad')) {
        const input = e.target;
        let nuevaCantidad = parseInt(input.value);
        const productoId = input.getAttribute('data-id');

        // Controlar cantidad mínima y máxima (MEJORA DE SEGURIDAD/INTEGRIDAD)
        if (nuevaCantidad < 1 || isNaN(nuevaCantidad)) {
            nuevaCantidad = 1; 
            input.value = 1;
        } 
        if (nuevaCantidad > MAX_CANTIDAD) {
            nuevaCantidad = MAX_CANTIDAD; 
            input.value = MAX_CANTIDAD;
        }
        
        const row = input.closest('tr');
        const subtotalCell = row.querySelector('.subtotal');
        const precioTexto = row.cells[2].textContent.replace('$', '');
        const precio = parseFloat(precioTexto);
        
        if (subtotalCell) {
            subtotalCell.textContent = `$${calcularSubtotal(precio, nuevaCantidad)}`; 
        }

        guardarCarritoConNuevaCantidad(productoId, nuevaCantidad); 
        actualizarTotal();
        actualizarContador();
        if (document.querySelector('.checkout-page')) {
            actualizarTotalCheckout();
        }
    }
}

function guardarCarritoConNuevaCantidad(id, cantidad) {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const index = carrito.findIndex(p => p.id === id);
    
    if (index > -1) {
        carrito[index].cantidad = cantidad;
        carrito[index].subtotal = calcularSubtotal(carrito[index].precio, cantidad);
    }
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function eliminarElemento(e) {
    e.preventDefault();
    if (e.target.classList.contains('borrar')) {
        const row = e.target.closest('tr');
        const productoId = e.target.getAttribute('data-id');
        
        if (row) {
            row.remove();
            
            let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
            carrito = carrito.filter(producto => producto.id !== productoId);
            localStorage.setItem('carrito', JSON.stringify(carrito));

            actualizarTotal();
            actualizarContador(); 
            if (document.querySelector('.checkout-page')) {
                actualizarTotalCheckout();
            }
            if (document.querySelector('.checkout-page') && carrito.length === 0) {
                 window.location.href = HOME_PAGE;
            }
        }
    }
}

function vaciarCarrito() {
    const targetList = document.querySelector('#lista-carrito tbody');
    if (targetList) {
        while (targetList.firstChild) {
            targetList.removeChild(targetList.firstChild);
        }
    }
    localStorage.removeItem('carrito');
    actualizarTotal();
    actualizarContador(); 
    
    if (document.querySelector('.checkout-page')) {
        alert("Carrito vaciado. Regresando a la página principal.");
        window.location.href = HOME_PAGE;
    }
}

function guardarCarrito() {
    const targetList = document.querySelector('#lista-carrito tbody');
    if (!targetList) return; 
    
    const productos = [];
    targetList.querySelectorAll('tr').forEach(row => {
        const idElement = row.querySelector('.borrar');
        if (idElement) {
            const precioTexto = row.cells[2].textContent.replace('$', '');
            const inputCantidad = row.querySelector('.input-cantidad');
            const precio = parseFloat(precioTexto);
            const cantidad = parseInt(inputCantidad.value);

            productos.push({
                imagen: row.querySelector('img')?.src || '',
                titulo: row.cells[1].textContent,
                precio: precio,
                cantidad: cantidad,
                subtotal: calcularSubtotal(precio, cantidad),
                id: idElement.getAttribute('data-id')
            });
        }
    });
    localStorage.setItem('carrito', JSON.stringify(productos));
}

function cargarCarritoDesdeStorage() {
    const carritoGuardado = JSON.parse(localStorage.getItem('carrito')) || [];
    const targetList = document.querySelector('#lista-carrito tbody'); 
    
    if (!targetList) return; 

    carritoGuardado.forEach(producto => {
        const row = document.createElement('tr');
        const precio = producto.precio ? producto.precio.toFixed(0) : 0;
        const cantidad = producto.cantidad || 1;
        const subtotal = producto.subtotal ? producto.subtotal.toFixed(0) : calcularSubtotal(producto.precio, cantidad).toFixed(0);

        row.innerHTML = `
            <td><img src="${producto.imagen}" width="60" loading="lazy"></td>
            <td>${producto.titulo}</td>
            <td>$${precio}</td>
            <td class="cantidad-control">
                <input type="number" min="1" value="${cantidad}" data-id="${producto.id}" class="input-cantidad" style="width: 50px; text-align: center;">
            </td>
            <td class="subtotal">$${subtotal}</td>
            <td><a href="#" class="borrar" data-id="${producto.id}">X</a></td>
        `;
        targetList.appendChild(row);
    });
    actualizarTotal();
}

function actualizarTotal() {
    const totalCarritoDisplay = document.getElementById('total-carrito');
    const targetList = document.querySelector('#lista-carrito tbody');
    if (!totalCarritoDisplay || !targetList) return; 

    let total = 0;
    targetList.querySelectorAll('tr').forEach(row => {
        const subtotalText = row.querySelector('.subtotal')?.textContent;
        if (subtotalText) {
            const subtotal = parseFloat(subtotalText.replace('$', ''));
            total += Math.round(subtotal); 
        }
    });
    totalCarritoDisplay.textContent = `$${total}`;
}

function actualizarContador() {
    if (!contadorCarritoDisplay) return;

    const carritoGuardado = JSON.parse(localStorage.getItem('carrito')) || [];
    let totalItems = 0;
    
    carritoGuardado.forEach(producto => {
        totalItems += producto.cantidad;
    });

    if (totalItems > 0) {
        contadorCarritoDisplay.textContent = totalItems;
        contadorCarritoDisplay.style.display = 'flex';
    } else {
        contadorCarritoDisplay.textContent = '0';
        contadorCarritoDisplay.style.display = 'none'; 
    }
}

// =================================================================
// LÓGICA DE CHECKOUT Y VALIDACIÓN AVANZADA
// =================================================================

// MEJORA: Función para centralizar la obtención del número de WhatsApp
function obtenerNumeroTienda() {
    const whatsappLink = document.querySelector(".whatsapp-float");
    return whatsappLink ? whatsappLink.href.split('/').pop() : WHATSAPP_NUMERO_FALLBACK;
}

function validarFormularioCheckout(datos) {
    let esValido = true;
    const { cliente_nombre, whatsapp, lugar_entrega, fecha_entrega, horario_entrega } = datos;

    // Limpiar errores previos (MEJORA UX)
    document.querySelectorAll('.error-message').forEach(span => span.textContent = '');

    // 1. Validar Nombre (mínimo 3 caracteres)
    if (cliente_nombre.length < 3) {
        document.getElementById('error-nombre').textContent = "Ingresa tu nombre completo (mínimo 3 caracteres).";
        esValido = false;
    }

    // 2. Validar WhatsApp (Solo dígitos, 10-14 caracteres, permite prefijo +) (MEJORA DE SEGURIDAD/VALIDACIÓN)
    const whatsappRegex = /^[+]?[0-9]{10,14}$/;
    if (!whatsappRegex.test(whatsapp)) {
        document.getElementById('error-whatsapp').textContent = "Ingresa un WhatsApp válido (solo números, 10 a 14 dígitos).";
        esValido = false;
    }

    // 3. Validar Lugar de Entrega (mínimo 10 caracteres)
    if (lugar_entrega.length < 10) {
        document.getElementById('error-lugar').textContent = "Sé más específico con la dirección de entrega.";
        esValido = false;
    }

    // 4. Validar Fecha y Hora (Que no sea en el pasado)
    if (!fecha_entrega) {
        document.getElementById('error-fecha').textContent = "Debes seleccionar una fecha de entrega.";
        esValido = false;
    } else {
        const fechaSeleccionada = new Date(fecha_entrega);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); 
        if (fechaSeleccionada < hoy) {
            document.getElementById('error-fecha').textContent = "La fecha no puede ser en el pasado.";
            esValido = false;
        }
    }
    
    if (!horario_entrega) {
        document.getElementById('error-hora').textContent = "Debes seleccionar una hora de entrega.";
        esValido = false;
    }

    return esValido;
}


function actualizarTotalCheckout() {
    const totalCheckoutDisplay = document.getElementById('total-carrito-checkout');
    if (!totalCheckoutDisplay) return;

    const carritoGuardado = JSON.parse(localStorage.getItem('carrito')) || [];
    let total = 0;
    carritoGuardado.forEach(producto => {
        total += producto.precio * producto.cantidad;
    });

    totalCheckoutDisplay.textContent = `$${Math.round(total)}`;
}

function setupCheckoutPage() {
    const listaCheckout = document.querySelector('#lista-carrito-checkout tbody');
    const carritoGuardado = JSON.parse(localStorage.getItem('carrito')) || [];
    const confirmarPedidoBtn = document.getElementById('confirmar-pedido-btn');
    const fechaEntregaInput = document.getElementById('fecha-entrega');

    // 1. VALIDACIÓN DE FECHA MÍNIMA (UX)
    if (fechaEntregaInput) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        const fechaMinima = `${yyyy}-${mm}-${dd}`;
        fechaEntregaInput.setAttribute('min', fechaMinima);
    }
    
    if (carritoGuardado.length === 0) {
        alert("Tu carrito está vacío. Regresando a la página de productos.");
        window.location.href = HOME_PAGE;
        return;
    }
    
    // 2. Llenar la tabla de checkout (con control de cantidad)
    listaCheckout.innerHTML = ''; 
    carritoGuardado.forEach(producto => {
        const row = document.createElement('tr');
        const precio = Number(producto.precio).toFixed(0);
        const cantidad = Number(producto.cantidad);
        const subtotal = calcularSubtotal(producto.precio, producto.cantidad).toFixed(0);

        row.innerHTML = `
            <td><img src="${producto.imagen}" width="60" loading="lazy"></td>
            <td>${producto.titulo}</td>
            <td>$${precio}</td>
            <td class="cantidad-control">
                <input type="number" min="1" value="${cantidad}" data-id="${producto.id}" class="input-cantidad" style="width: 50px; text-align: center;">
            </td>
            <td class="subtotal">$${subtotal}</td>
            <td><a href="#" class="borrar" data-id="${producto.id}">X</a></td>
        `;
        listaCheckout.appendChild(row);
    });
    actualizarTotalCheckout(); 
    
    // 3. Listeners para el checkout
    document.querySelector('#lista-carrito-checkout').addEventListener('click', eliminarElemento);
    document.querySelector('#lista-carrito-checkout').addEventListener('change', actualizarCantidadInput);

    // 4. Conectar el botón al Backend
    confirmarPedidoBtn.addEventListener('click', async function (e) {
        e.preventDefault();

        // CAPTURA DE DATOS
        const clienteNombre = document.getElementById('cliente-nombre')?.value.trim();
        const whatsappCliente = document.getElementById('whatsapp-cliente')?.value.trim(); 
        const personalizacion = document.getElementById('personalizacion')?.value.trim() || "Ninguna"; 
        const lugarEntrega = document.getElementById('lugar-entrega')?.value.trim();
        const fechaEntrega = document.getElementById('fecha-entrega')?.value.trim();
        const horarioEntrega = document.getElementById('horario-entrega')?.value.trim();
        const formaPago = document.getElementById('forma-pago')?.value || "Efectivo"; 
        
        const carritoFinal = JSON.parse(localStorage.getItem('carrito')) || [];

        const datosPedidoPrevalidacion = {
            cliente_nombre: clienteNombre,
            whatsapp: whatsappCliente,
            lugar_entrega: lugarEntrega,
            fecha_entrega: fechaEntrega,
            horario_entrega: horarioEntrega
        };
        
        // --- VALIDACIÓN DE SEGURIDAD Y UX ---
        if (!validarFormularioCheckout(datosPedidoPrevalidacion)) {
            return;
        }
        // ------------------------------------

        if (confirmarPedidoBtn.disabled) return; 

        confirmarPedidoBtn.disabled = true;
        confirmarPedidoBtn.textContent = "⚙️ Procesando...";

        let totalPedido = carritoFinal.reduce((total, producto) => total + (producto.precio * producto.cantidad), 0);
        totalPedido = parseFloat(totalPedido.toFixed(2)); 

        const horarioYFechaEntrega = `${fechaEntrega} a las ${horarioEntrega}`;

        const datosPedido = {
            cliente_nombre: clienteNombre,
            whatsapp: whatsappCliente,
            total_pedido: totalPedido, 
            personalizacion: personalizacion,
            lugar_entrega: lugarEntrega,
            horario_entrega: horarioYFechaEntrega,
            forma_pago: formaPago, 
            productos: carritoFinal 
        };
        
        // Uso de función modular (MEJORA)
        const numeroTienda = obtenerNumeroTienda(); 

        try {
            const respuesta = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosPedido)
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                
                const mensajeBase = `*PEDIDO CONFIRMADO EN DB ¡Hola Monicakes! Pedido No. ${resultado.pedido_id} a nombre de ${clienteNombre} enviado. Revisar la base de datos para los detalles. Cliente espera confirmación en WhatsApp: ${whatsappCliente}.`;
                
                const urlWhatsAppConfirmacion = `https://wa.me/${numeroTienda}?text=${encodeURIComponent(mensajeBase)}`;
                
                window.open(urlWhatsAppConfirmacion, '_blank'); 
                
                localStorage.removeItem('carrito');
                
                setTimeout(() => {
                    alert(`✅ ¡Pedido #${resultado.pedido_id} guardado con éxito! Serás redirigido al inicio. ¡Gracias!`); 
                    window.location.href = HOME_PAGE;
                }, 1000); 

            } else {
                alert(`❌ Error al guardar el pedido: ${resultado.error}`);
            }

        } catch (error) {
            console.error('Error de conexión:', error);
            alert("⚠️ Error de conexión. Asegúrate de que el servidor Node.js esté corriendo en http://localhost:3000");
        } finally {
            confirmarPedidoBtn.disabled = false;
            confirmarPedidoBtn.textContent = "✅ Confirmar y Enviar Pedido";
        }
    });
}

// =================================================================
// LÓGICA DE UTILIDAD (MODALES, BOTÓN DE SUBIR)
// =================================================================

function setupBotonSubir() {
    const btnArriba = document.getElementById("btn-arriba");
    if (btnArriba) {
        window.addEventListener("scroll", function() {
            if (window.scrollY > 500) { 
                btnArriba.style.opacity = "1";
            } else {
                btnArriba.style.opacity = "0";
            }
        });
        btnArriba.addEventListener("click", function() {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
}

function setupModalCloseHandlers(modal) {
    if (!modal) return;
    
    const botonCerrar = modal.querySelector('.cerrar');

    if (botonCerrar) {
        botonCerrar.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) { 
            modal.classList.remove('active');
        }
    });
}

function setupHeaderModals() {
    const botonesInfo = document.querySelectorAll('#btn-informacion');
    const textosInfo = {
        "index": `<h2>Información</h2><p>Bienvenido a Monicakes❤️, descubre nuestros mejores productos.</p>`,
        "XV": `<h2>Información XV Años</h2><p>Pasteles de ensueño diseñados para celebrar la transición a la edad adulta con elegancia y sabor. Cotiza tu diseño personalizado.</p> <p>Si necesitas un diseño único, no dudes en contactarnos directamente por WhatsApp.</p>`,
        "Bodas": `<h2>Información Bodas</h2><p>Creamos pasteles nupciales que reflejan la belleza y el amor de tu día especial. Trabajamos con diseños de varios pisos y decoración floral. <p>Te recomendamos cotizar tu pastel con al menos 3 semanas de anticipación.</p>`,
        "infantil": `<h2>Información Sección Infantil</h2><p>Pasteles temáticos con los personajes favoritos de los niños (Hello Kitty, Paw Patrol, Cars, etc.). ¡Hacemos de su cumpleaños un momento dulce!</p>`,
        "Fiesta": `<h2>Información Artículos de Fiesta</h2><p>Velas, toppers, y sets de globos para complementar tu pastel. ¡Todo lo que necesitas para tu evento en un solo lugar!</p>`,
    };
    
    let modalInfo = document.querySelector('.modal-info-header');
    if (!modalInfo) {
        modalInfo = document.createElement('div');
        modalInfo.classList.add('modal', 'modal-info-header');
        modalInfo.innerHTML = `<div id="modal-content-info" class="modal-content"></div><button class="cerrar">X</button>`;
        document.body.appendChild(modalInfo);
        setupModalCloseHandlers(modalInfo); 
    }

    const modalContentInfo = document.getElementById('modal-content-info');

    if (!document.querySelector('.checkout-page')) {
        botonesInfo.forEach(boton => {
            boton.addEventListener('click', function (e) {
                e.preventDefault();
                const seccion = boton.getAttribute("data-seccion") || "index";
                modalContentInfo.innerHTML = textosInfo[seccion] || textosInfo["index"];
                modalInfo.classList.add('active');
            });
        });
    }
}

function setupFooterModals() {
    const enlacesFooter = document.querySelectorAll('.footer a[data-id]');
    const textos = {
        "historia": `<h2>Historia</h2><p>Moni Cakes nació de la pasión por la repostería y la idea de ofrecer pasteles únicos y totalmente personalizados...</p>`,
        "mision": `<h2>Misión</h2><p>Brindar productos de repostería personalizados y de la más alta calidad, superando las expectativas de nuestros clientes en cada celebración.</p>`,
        "vision": `<h2>Visión</h2><p>Ser la pastelería líder en pedidos personalizados en nuestra región, reconocida por nuestra creatividad, calidad y excelencia en el servicio.</p>`,
        "pasteles": `<h2>Pasteles personalizados</h2><p>Nuestros pasteles están diseñados para cada ocasión especial. Trabajamos contigo para elegir el sabor, relleno, decoración y mensaje perfectos.</p>`,
        "eventos": `<h2>Eventos</h2><p>Ofrecemos servicio completo de mesa de postres y pasteles centrales para bodas, quinceañeras, cumpleaños y eventos corporativos.</p>`,
        "entregas": `<h2>Entregas</h2><p>Garantizamos entregas seguras y rápidas en menos de 24 horas dentro de la localidad y alrededores. Consulta nuestros términos de envío.</p>`,
        "preguntas": `<h2>Preguntas Frecuentes</h2><p>¿Qué sabores tienen? ¿Con cuánto tiempo debo pedir? Encuentra respuestas a todas tus dudas comunes en nuestra sección de ayuda.</p>`,
        "terminos": `<h2>Términos</h2><p>Conoce nuestras políticas de cancelación, devolución y condiciones de compra para un proceso transparente.</p>`,
        "privacidad": `<h2>Privacidad</h2><p>Nos tomamos en serio la seguridad y protección de tus datos. Consulta nuestro aviso de privacidad integral.</p>`,
        "ayuda": `<h2>Ayuda</h2><p>Si tienes cualquier duda con tu pedido, pago o entrega, contáctanos a través de WhatsApp o redes sociales. Estamos para ayudarte.</p>`
    };
    
    let modal = document.getElementById('modal-info');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-info';
        modal.classList.add('modal', 'footer-modal');
        modal.innerHTML = `<div id="modal-content" class="modal-content"></div><button class="cerrar">X</button>`;
        document.body.appendChild(modal);
        setupModalCloseHandlers(modal); 
    }

    const modalContent = document.getElementById('modal-content');

    enlacesFooter.forEach(enlace => {
        enlace.addEventListener('click', function (e) {
            e.preventDefault();
            const id = enlace.getAttribute('data-id');
            modalContent.innerHTML = textos[id] || "<h2>Error</h2><p>No se encontró la información.</p>";
            modal.classList.add('active');
        });
    });
}