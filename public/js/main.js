(function () {
    // Año actual tomado del sistema
    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    // Zona de carga: muestra el archivo elegido y permite arrastrar
    var input = document.getElementById("dataset");
    var zone = document.getElementById("dropzone");
    var title = document.getElementById("dz-title");
    var sub = document.getElementById("dz-sub");
    var icon = document.getElementById("dz-icon");

    function size(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    }

    function showFile() {
        if (!input.files.length) return;
        var f = input.files[0];
        title.textContent = f.name;
        sub.textContent = size(f.size) + ". Pulsa para cambiar el archivo.";
        icon.className = "bi bi-check-circle-fill dz-icon text-success";
        zone.classList.add("has-file");
    }

    if (input && zone) {
        input.addEventListener("change", showFile);
        ["dragenter", "dragover"].forEach(function (ev) {
            zone.addEventListener(ev, function (e) {
                e.preventDefault();
            });
        });
        zone.classList.add("is-over");
        ["dragleave", "drop"].forEach(function (ev) {
            zone.addEventListener(ev, function (e) {
                e.preventDefault();
            });
        });
        zone.classList.remove("is-over");
        zone.addEventListener("drop", function (e) {
            if (e.dataTransfer && e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                showFile();
            }
        });
    }

    // Botones con estado de carga
    var forms = document.querySelectorAll("form[data-loading]");
    forms.forEach(function (form) {
        form.addEventListener("submit", function () {
            var btn = form.querySelector('button[type="submit"]');
            if (!btn) return;
            btn.dataset.label = btn.innerHTML;
            btn.disabled = true;
            var textoCarga = form.getAttribute("data-loading") || "Procesando...";
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>' + textoCarga;
        });
    });

    window.addEventListener("pageshow", function (e) {
        if (!e.persisted) return;
        forms.forEach(function (form) {
            var btn = form.querySelector('button[type="submit"]');
            if (btn && btn.dataset.label) {
                btn.innerHTML = btn.dataset.label;
                btn.disabled = false;
            }
        });
    });

    // Activar tooltips de Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });



    // ==========================================
    // Fetch API para el formulario de predicción
    // ==========================================
    var predictForm = document.getElementById("predict-form");
    
    if (predictForm) {
        predictForm.addEventListener("submit", function (e) {
            e.preventDefault(); // Detiene la recarga completa de la página
            
            var btn = predictForm.querySelector('button[type="submit"]');
            var originalBtnHtml = btn.innerHTML;
            var container = document.getElementById("prediction-result-container");
            
            // Estado de carga visual
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span> Calculando...';
            container.innerHTML = ''; 
            
            var formData = new FormData(predictForm);
            
            fetch(predictForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    // Dibujar alerta de error
                    container.innerHTML = `
                        <div class="alert alert-danger d-flex align-items-center mb-4 shadow-sm">
                            <i class="bi bi-exclamation-triangle-fill me-3 fs-3"></i>
                            <div><strong>Error:</strong> ${data.error}</div>
                        </div>
                    `;
                } else if (data.success) {
                    // Dibujar la alerta de éxito semántica usando la lógica que definimos antes
                    var res = data.prediction_result;
                    var labelLower = res.label.toLowerCase();
                    var alertClass, iconClass, mensaje;
                    
                    if (labelLower === 'yes') {
                        alertClass = 'alert-primary border-primary';
                        iconClass = 'bi-cloud-rain-heavy-fill text-primary';
                        mensaje = 'Sí, hay probabilidad de lluvia.';
                    } else {
                        alertClass = 'alert-success border-success';
                        iconClass = 'bi-brightness-high-fill text-success';
                        mensaje = 'No, se espera un clima despejado.';
                    }
                    
                    container.innerHTML = `
                        <div class="alert ${alertClass} d-flex align-items-center mb-4 shadow-sm fade-in">
                            <i class="bi ${iconClass} me-3" style="font-size: 2.5rem;"></i>
                            <div>
                                <strong class="fs-5">${mensaje}</strong><br>
                                <span class="small opacity-75">Certeza del modelo: <strong>${res.probability}%</strong></span>
                            </div>
                        </div>
                    `;
                }
            })
            .catch(error => {
                container.innerHTML = `
                    <div class="alert alert-danger d-flex align-items-center mb-4 shadow-sm">
                        <i class="bi bi-x-circle-fill me-3 fs-3"></i>
                        <div><strong>Error de red:</strong> No se pudo conectar con el servidor.</div>
                    </div>
                `;
            })
            .finally(() => {
                // Restaurar botón
                btn.disabled = false;
                btn.innerHTML = originalBtnHtml;
            });
        });
    }

    // ==========================================
    // Animación de Métricas (Números y Barras)
    // ==========================================
    const animateMetrics = () => {
        // Animar los contadores numéricos
        const counters = document.querySelectorAll('.metric-value[data-target]');
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const duration = 1500; // 1.5 segundos de animación
            const increment = target / (duration / 16); // asumiendo 60fps
            
            let current = 0;
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.innerText = current.toFixed(2) + '%';
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.innerText = target.toFixed(2) + '%';
                }
            };
            updateCounter();
        });

        // Animar las barras de progreso
        const bars = document.querySelectorAll('.progress-bar[data-width]');
        setTimeout(() => {
            bars.forEach(bar => {
                bar.style.width = bar.getAttribute('data-width');
            });
        }, 100); 
    };

    // Ejecutar la animación solo si existen los elementos en la pantalla
    if (document.querySelector('.metric-value[data-target]')) {
        animateMetrics();
    }
})();