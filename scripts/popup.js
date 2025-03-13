document.addEventListener('DOMContentLoaded', () => {
    // Navegação entre telas
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');

    function switchScreen(targetScreen) {
        // Remove classe ativa de todos os itens de navegação e telas
        navItems.forEach(item => item.classList.remove('active'));
        screens.forEach(screen => screen.classList.remove('active'));

        // Adiciona classe ativa no item de navegação e tela correspondente
        const selectedNavItem = document.querySelector(`.nav-item[data-screen="${targetScreen}"]`);
        const selectedScreen = document.getElementById(`${targetScreen}-screen`);

        if (selectedNavItem && selectedScreen) {
            selectedNavItem.classList.add('active');
            selectedScreen.classList.add('active');
        }
    }

    // Evento de clique nos itens de navegação
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreen = item.dataset.screen;
            switchScreen(targetScreen);
        });
    });

    // Botões de ação rápida
    const aiWritingBtn = document.getElementById('ai-writing-btn');
    const configBtn = document.getElementById('config-btn');

    if (aiWritingBtn) {
        aiWritingBtn.addEventListener('click', () => switchScreen('ai-writing'));
    }

    if (configBtn) {
        configBtn.addEventListener('click', () => switchScreen('profiles'));
    }

    // Funcionalidade de Reescrita de IA
    const rewriteBtn = document.getElementById('rewrite-btn');
    const aiInput = document.getElementById('ai-input');
    const aiOutput = document.getElementById('ai-output');
    const writingStyleSelect = document.getElementById('writing-style');
    const uxOptimization = document.getElementById('ux-optimization');
    const cognitiveBias = document.getElementById('cognitive-bias');

    if (rewriteBtn) {
        rewriteBtn.addEventListener('click', async () => {
            const inputText = aiInput.value.trim();
            const writingStyle = writingStyleSelect.value;
            const isUxOptimized = uxOptimization.checked;
            const isCognitiveBiasEnabled = cognitiveBias.checked;

            if (!inputText) {
                showNotification('Por favor, insira um texto para reescrever', 'error');
                return;
            }

            try {
                // Simula uma chamada à API de IA
                rewriteBtn.disabled = true;
                rewriteBtn.textContent = 'Reescrevendo...';

                const rewrittenText = await simulateAIRewrite(
                    inputText, 
                    writingStyle, 
                    isUxOptimized, 
                    isCognitiveBiasEnabled
                );

                aiOutput.value = rewrittenText;
                showNotification('Texto reescrito com sucesso!', 'success');
            } catch (error) {
                showNotification('Erro ao reescrever o texto', 'error');
                console.error(error);
            } finally {
                rewriteBtn.disabled = false;
                rewriteBtn.textContent = '🔄 Reescrever';
            }
        });
    }

    // Função simulada de reescrita de IA 
    async function simulateAIRewrite(text, style, uxOptimized, cognitiveBias) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const styles = {
                    'professional': text => `Versão Profissional: ${text}`,
                    'casual': text => `Versão Casual: ${text}`,
                    'creative': text => `Versão Criativa: ${text}`,
                    'technical': text => `Versão Técnica: ${text}`,
                    'persuasive': text => `Versão Persuasiva: ${text}`
                };

                let result = styles[style] ? styles[style](text) : text;

                if (uxOptimized) {
                    result = `[Otimizado para UX] ${result}`;
                }

                if (cognitiveBias) {
                    result = `[Com Viés Cognitivo] ${result}`;
                }

                resolve(result);
            }, 1500);
        });
    }

    // Gerenciamento de Perfis
    const newProfileBtn = document.querySelector('.profile-actions button:first-child');
    const deleteProfileBtn = document.querySelector('.profile-actions button:last-child');
    const saveProfileBtn = document.querySelector('.profile-details .btn-primary');

    if (newProfileBtn) {
        newProfileBtn.addEventListener('click', () => {
            const newProfileName = prompt('Digite o nome do novo perfil:');
            if (newProfileName) {
                // Lógica para adicionar novo perfil
                showNotification(`Perfil "${newProfileName}" criado!`, 'success');
            }
        });
    }

    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener('click', () => {
            const confirmDelete = confirm('Tem certeza que deseja excluir o perfil selecionado?');
            if (confirmDelete) {
                // Lógica para excluir perfil
                showNotification('Perfil excluído com sucesso', 'success');
            }
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            // Lógica para salvar perfil
            showNotification('Perfil salvo com sucesso!', 'success');
        });
    }

    // Função de notificação
    function showNotification(message, type = 'success') {
        const notificationContainer = document.createElement('div');
        notificationContainer.className = `notification ${type}`;
        notificationContainer.textContent = message;
        
        document.body.appendChild(notificationContainer);

        setTimeout(() => {
            notificationContainer.classList.add('fade-out');
            setTimeout(() => notificationContainer.remove(), 500);
        }, 3000);
    }

    // Adicionar estilos de notificação
    const notificationStyles = document.createElement('style');
    notificationStyles.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 6px;
            color: white;
            z-index: 1000;
            opacity: 1;
            transition: opacity 0.5s ease;
        }
        .notification.success {
            background-color: #4CAF50;
        }
        .notification.error {
            background-color: #F44336;
        }
        .notification.fade-out {
            opacity: 0;
        }
    `;
    document.head.appendChild(notificationStyles);
});