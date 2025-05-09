/**
 * scripts/ui.js
 * Utilitários de interface e elementos de UI comuns
 */

/**
 * Exibe uma notificação toast
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de notificação (success, error, info)
 * @param {number} duration - Duração em milissegundos
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Remover toasts existentes
    document.querySelectorAll('.smarttext-toast').forEach(toast => toast.remove());
    
    // Ícones para cada tipo
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    // Criar elemento toast
    const toast = document.createElement('div');
    toast.className = `smarttext-toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
        <div class="toast-message">${message}</div>
    `;
    
    // Adicionar ao corpo do documento
    document.body.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remover após duração
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Exibe um indicador de carregamento
 * @param {string} message - Mensagem a ser exibida
 * @returns {HTMLElement} - Elemento do loader criado
 */
export function showLoader(message = 'Carregando...') {
    // Verificar se já existe um loader
    let loader = document.getElementById('smarttext-loader');
    
    if (loader) {
        // Atualizar mensagem
        const msgElement = loader.querySelector('.loader-text');
        if (msgElement) msgElement.textContent = message;
        
        loader.style.display = 'flex';
        return loader;
    }
    
    // Criar novo loader
    loader = document.createElement('div');
    loader.id = 'smarttext-loader';
    loader.className = 'smarttext-loader';
    
    loader.innerHTML = `
        <div class="loader-spinner"></div>
        <div class="loader-text">${message}</div>
    `;
    
    document.body.appendChild(loader);
    return loader;
}

/**
 * Esconde o indicador de carregamento
 */
export function hideLoader() {
    const loader = document.getElementById('smarttext-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            loader.style.opacity = '1';
        }, 300);
    }
}

/**
 * Cria um elemento de menu flutuante
 * @param {HTMLElement} target - Elemento de referência para posicionamento
 * @param {string} content - HTML do conteúdo do menu
 * @param {Object} options - Opções de configuração
 * @returns {HTMLElement} - Elemento do menu criado
 */
export function createFloatingMenu(target, content, options = {}) {
    // Remover menu existente
    const existingMenu = document.getElementById('smarttext-floating-menu');
    if (existingMenu) existingMenu.remove();
    
    // Obter posição do elemento alvo
    const targetRect = target.getBoundingClientRect();
    
    // Criar menu
    const menu = document.createElement('div');
    menu.id = 'smarttext-floating-menu';
    menu.className = 'smarttext-floating-menu';
    menu.innerHTML = content;
    
    // Adicionar à página
    document.body.appendChild(menu);
    
    // Posicionar o menu
    positionElement(menu, target, options.position || 'bottom');
    
    // Adicionar evento para fechar ao clicar fora
    if (options.closeOnClickOutside !== false) {
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && e.target !== target) {
                menu.remove();
            }
        }, { once: true });
    }
    
    return menu;
}

/**
 * Posiciona um elemento em relação a outro
 * @param {HTMLElement} element - Elemento a ser posicionado
 * @param {HTMLElement} target - Elemento de referência
 * @param {string} position - Posição (top, bottom, left, right)
 * @param {number} offset - Distância em pixels
 */
export function positionElement(element, target, position = 'bottom', offset = 10) {
    const targetRect = target.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let top, left;
    
    // Calcular posição
    switch (position) {
        case 'top':
            top = targetRect.top - elementRect.height - offset;
            left = targetRect.left + (targetRect.width / 2) - (elementRect.width / 2);
            break;
        case 'bottom':
            top = targetRect.bottom + offset;
            left = targetRect.left + (targetRect.width / 2) - (elementRect.width / 2);
            break;
        case 'left':
            top = targetRect.top + (targetRect.height / 2) - (elementRect.height / 2);
            left = targetRect.left - elementRect.width - offset;
            break;
        case 'right':
            top = targetRect.top + (targetRect.height / 2) - (elementRect.height / 2);
            left = targetRect.right + offset;
            break;
        default:
            top = targetRect.bottom + offset;
            left = targetRect.left + (targetRect.width / 2) - (elementRect.width / 2);
    }
    
    // Ajustar para não sair da tela
    if (left < 10) left = 10;
    if (left + elementRect.width > viewportWidth - 10) left = viewportWidth - elementRect.width - 10;
    
    // Se o elemento ficar abaixo da parte visível, posicioná-lo acima
    if (top + elementRect.height > viewportHeight - 10) {
        if (position === 'bottom') {
            top = targetRect.top - elementRect.height - offset;
        } else {
            top = viewportHeight - elementRect.height - 10;
        }
    }
    
    // Se o elemento ficar acima da parte visível, posicioná-lo abaixo
    if (top < 10) {
        if (position === 'top') {
            top = targetRect.bottom + offset;
        } else {
            top = 10;
        }
    }
    
    // Aplicar posição
    element.style.position = 'fixed';
    element.style.zIndex = '2147483646';
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
    
    // Animar entrada
    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }, 10);
}

/**
 * Cria um modal
 * @param {string} title - Título do modal
 * @param {string} content - HTML do conteúdo
 * @param {Array<Object>} buttons - Botões do modal
 * @returns {HTMLElement} - Elemento do modal criado
 */
export function createModal(title, content, buttons = []) {
    // Remover modal existente
    const existingModal = document.getElementById('smarttext-modal');
    if (existingModal) existingModal.remove();
    
    // Criar container do modal
    const modalContainer = document.createElement('div');
    modalContainer.id = 'smarttext-modal';
    modalContainer.className = 'smarttext-modal';
    
    // Adicionar overlay que fecha o modal ao clicar
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.remove();
        }
    });
    
    // Botões padrão se nenhum for fornecido
    if (!buttons || buttons.length === 0) {
        buttons = [
            {
                text: 'Fechar',
                type: 'secondary',
                onClick: () => modalContainer.remove()
            }
        ];
    }
    
    // Criar conteúdo do modal
    modalContainer.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${buttons.map(btn => `
                    <button class="btn btn-${btn.type || 'secondary'}" data-action="${btn.action || ''}">${btn.text}</button>
                `).join('')}
            </div>
        </div>
    `;
    
    // Adicionar à página
    document.body.appendChild(modalContainer);
    
    // Adicionar evento ao botão de fechar
    const closeBtn = modalContainer.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modalContainer.remove());
    }
    
    // Adicionar eventos aos botões
    buttons.forEach((btn, index) => {
        const buttonElement = modalContainer.querySelectorAll('.modal-footer .btn')[index];
        if (buttonElement && btn.onClick) {
            buttonElement.addEventListener('click', () => btn.onClick(modalContainer));
        }
    });
    
    // Animar entrada
    setTimeout(() => modalContainer.classList.add('show'), 10);
    
    return modalContainer;
}

/**
 * Ajusta a altura de um textarea para se adaptar ao conteúdo
 * @param {HTMLTextAreaElement} textarea - Elemento textarea
 * @param {number} maxHeight - Altura máxima em pixels
 */
export function adjustTextareaHeight(textarea, maxHeight = 200) {
    // Resetar altura para calcular corretamente o scrollHeight
    textarea.style.height = 'auto';
    
    // Definir nova altura
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
}

/**
 * Verifica se um elemento é editável
 * @param {HTMLElement} element - Elemento a ser verificado
 * @returns {boolean} - Se o elemento é editável
 */
export function isEditable(element) {
    return element && (
        element.tagName === 'INPUT' || 
        element.tagName === 'TEXTAREA' || 
        element.isContentEditable ||
        element.classList.contains('editable') ||
        element.getAttribute('role') === 'textbox'
    );
}

/**
 * Obtém o texto selecionado
 * @returns {string} - Texto selecionado
 */
export function getSelectedText() {
    return window.getSelection().toString().trim();
}

/**
 * Cria um botão fixo na página
 * @param {string} icon - Emoji ou ícone
 * @param {string} tooltip - Texto do tooltip
 * @param {Function} onClick - Função de clique
 * @returns {HTMLElement} - Elemento do botão criado
 */
export function createFixedButton(icon, tooltip, onClick) {
    // Remover botão existente
    const existingButton = document.getElementById('smarttext-fixed-button');
    if (existingButton) existingButton.remove();
    
    // Criar botão
    const button = document.createElement('div');
    button.id = 'smarttext-fixed-button';
    button.className = 'smarttext-fixed-button';
    
    button.innerHTML = `
        <div class="fixed-button-icon">${icon}</div>
        <div class="fixed-button-tooltip">${tooltip}</div>
    `;
    
    // Adicionar à página
    document.body.appendChild(button);
    
    // Adicionar evento de clique
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    
    return button;
}