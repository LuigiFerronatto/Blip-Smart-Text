/**
 * scripts/welcome.js
 * Script para a página de boas-vindas
 */

document.addEventListener('DOMContentLoaded', () => {
    // Botão de iniciar
    const startButton = document.getElementById('start-button');
    if (startButton) {
      startButton.addEventListener('click', () => {
        // Fecha a página atual e redireciona o usuário para a página de opções
        window.close();
        chrome.runtime.openOptionsPage();
      });
    }
    
    // Links e modais
    const privacyLink = document.getElementById('privacy-link');
    const helpLink = document.getElementById('help-link');
    const privacyModal = document.getElementById('privacy-modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    
    // Evento para abrir o modal de privacidade
    if (privacyLink && privacyModal) {
      privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        privacyModal.classList.add('show');
      });
    }
    
    // Evento para abrir a página de ajuda
    if (helpLink) {
      helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'help.html' });
      });
    }
    
    // Eventos para fechar modais
    closeModalButtons.forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.modal.show').forEach(modal => {
          modal.classList.remove('show');
        });
      });
    });
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', (event) => {
      document.querySelectorAll('.modal.show').forEach(modal => {
        if (event.target === modal) {
          modal.classList.remove('show');
        }
      });
    });
    
    // Eventos para as imagens de exemplo
    const stepImages = document.querySelectorAll('.step-image');
    
    stepImages.forEach(img => {
      img.addEventListener('click', () => {
        // Abre uma versão ampliada da imagem
        const imgSrc = img.getAttribute('src');
        
        // Criar o modal para a imagem
        const imgModal = document.createElement('div');
        imgModal.className = 'modal show';
        imgModal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h3>Visualização</h3>
              <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body" style="text-align: center;">
              <img src="${imgSrc}" alt="Visualização ampliada" style="max-width: 100%;">
            </div>
          </div>
        `;
        
        document.body.appendChild(imgModal);
        
        // Evento para fechar o modal
        imgModal.querySelector('.close-modal').addEventListener('click', () => {
          imgModal.remove();
        });
        
        // Fechar ao clicar fora
        imgModal.addEventListener('click', (e) => {
          if (e.target === imgModal) {
            imgModal.remove();
          }
        });
      });
    });
    
    // Verificar se é a primeira vez que o usuário vê a tela
    chrome.storage.local.get(['firstTimeWelcome'], (result) => {
      // Se não for a primeira vez, tentar carregar uma seção com exemplos de uso real
      if (result.firstTimeWelcome === false) {
        loadUsageTips();
      } else {
        // Marcar como não sendo a primeira vez
        chrome.storage.local.set({ firstTimeWelcome: false });
      }
    });
  });
  
  /**
   * Carrega dicas de uso baseadas em estatísticas de uso
   */
  function loadUsageTips() {
    const welcomeContent = document.querySelector('.welcome-content');
    
    // Criar uma seção de dicas de uso
    const tipsSection = document.createElement('section');
    tipsSection.className = 'usage-tips';
    tipsSection.innerHTML = `
      <h3>Dicas Personalizadas</h3>
      <div class="tips-grid">
        <div class="tip-card">
          <div class="tip-icon">💡</div>
          <h4>Aumente sua Produtividade</h4>
          <p>Use atalhos de teclado para acessar as funções mais rapidamente. Experimente Ctrl+Shift+H para reescrever texto!</p>
        </div>
        <div class="tip-card">
          <div class="tip-icon">🎯</div>
          <h4>Texto Persuasivo</h4>
          <p>Para emails de vendas, utilize o perfil "Marketing" com viés cognitivo ativado para textos mais convincentes.</p>
        </div>
        <div class="tip-card">
          <div class="tip-icon">🌐</div>
          <h4>Compatibilidade</h4>
          <p>O Blip SmartText funciona em quase todos os campos de texto da web, incluindo Gmail, Outlook, e redes sociais.</p>
        </div>
      </div>
    `;
    
    // Adicionar antes da chamada para ação
    const callToAction = document.querySelector('.call-to-action');
    if (welcomeContent && callToAction) {
      welcomeContent.insertBefore(tipsSection, callToAction);
      
      // Adicionar estilos para a nova seção
      const style = document.createElement('style');
      style.textContent = `
        .usage-tips {
          margin-bottom: 60px;
        }
        
        .usage-tips h3 {
          font-size: var(--font-size-xl);
          margin-bottom: 30px;
          text-align: center;
          color: var(--blip-text);
        }
        
        .tips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
        }
        
        .tip-card {
          background-color: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: var(--shadow-md);
          text-align: center;
          transition: transform 0.3s ease;
        }
        
        .tip-card:hover {
          transform: translateY(-5px);
        }
        
        .tip-icon {
          font-size: 32px;
          margin-bottom: 16px;
        }
        
        .tip-card h4 {
          font-size: var(--font-size-lg);
          margin-bottom: 12px;
          color: var(--blip-text);
        }
        
        .tip-card p {
          color: var(--blip-text-light);
          font-size: var(--font-size-md);
        }
        
        @media (max-width: 768px) {
          .tips-grid {
            grid-template-columns: 1fr;
          }
        }
      `;
      
      document.head.appendChild(style);
    }
  }