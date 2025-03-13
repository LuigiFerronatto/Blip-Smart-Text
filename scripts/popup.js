/**
 * scripts/popup.js
 * Script para controlar as interações no popup da extensão
 */

document.addEventListener('DOMContentLoaded', () => {
    // Estado global
    const state = {
      profiles: {},
      selectedProfile: null,
      settings: {
        floatingMenu: true,
        fixedButton: true,
        keyboardShortcuts: true,
        apiKey: '',
        apiUrl: '',
        model: 'gpt-4-0613'
      }
    };
    
    // Carregar configurações e perfis
    loadSettings();
    
    // Navegação entre telas
    setupNavigation();
    
    // Configurar botões da tela inicial
    setupQuickActions();
    
    // Configurar modais
    setupModals();
    
    // Configurar eventos da tela de IA
    setupAIWriting();
    
    // Configurar eventos da tela de perfis
    setupProfiles();
    
    // Configurar eventos da tela de configurações
    setupSettings();
    
    // Configurar eventos da tela de ajuda
    setupHelp();
    
    /**
     * Carrega as configurações e perfis da extensão
     */
    function loadSettings() {
      chrome.storage.local.get(['profiles', 'selectedProfile', 'settings'], (result) => {
        // Carregar perfis
        if (result.profiles) {
          state.profiles = result.profiles;
          populateProfilesList();
        }
        
        // Carregar perfil selecionado
        if (result.selectedProfile) {
          state.selectedProfile = result.selectedProfile;
          updateCurrentProfileDisplay();
        }
        
        // Carregar configurações
        if (result.settings) {
          state.settings = { ...state.settings, ...result.settings };
          updateSettingsUI();
        }
        
        // Verificar status da extensão
        checkExtensionStatus();
      });
    }
    
    /**
     * Configura a navegação entre as telas
     */
    function setupNavigation() {
      const navItems = document.querySelectorAll('.nav-item');
      const screens = document.querySelectorAll('.screen');
      
      navItems.forEach(item => {
        item.addEventListener('click', () => {
          // Remover classe ativa de todos os itens e telas
          navItems.forEach(i => i.classList.remove('active'));
          screens.forEach(s => s.classList.remove('active'));
          
          // Adicionar classe ativa ao item clicado
          item.classList.add('active');
          
          // Mostrar a tela correspondente
          const screenId = item.dataset.screen + '-screen';
          document.getElementById(screenId).classList.add('active');
        });
      });
    }
    
    /**
     * Configura os botões de ação rápida na tela inicial
     */
    function setupQuickActions() {
      const aiWritingBtn = document.getElementById('ai-writing-btn');
      const configBtn = document.getElementById('config-btn');
      
      if (aiWritingBtn) {
        aiWritingBtn.addEventListener('click', () => {
          // Navegar para a tela de escrita com IA
          document.querySelector('.nav-item[data-screen="ai-writing"]').click();
        });
      }
      
      if (configBtn) {
        configBtn.addEventListener('click', () => {
          // Navegar para a tela de configurações
          document.querySelector('.nav-item[data-screen="settings"]').click();
        });
      }
    }
    
    /**
     * Configura os modais da aplicação
     */
    function setupModals() {
      // Botões que abrem modais
      const modalTriggers = {
        'new-profile-btn': 'new-profile-modal',
        'delete-profile-btn': 'delete-profile-modal'
      };
      
      // Configurar cada gatilho de modal
      Object.keys(modalTriggers).forEach(triggerId => {
        const trigger = document.getElementById(triggerId);
        const modalId = modalTriggers[triggerId];
        
        if (trigger) {
          trigger.addEventListener('click', () => {
            openModal(modalId);
          });
        }
      });
      
      // Configurar botões de fechar modal
      document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
          closeAllModals();
        });
      });
      
      // Fechar modal ao clicar fora
      document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            closeAllModals();
          }
        });
      });
      
      // Botões específicos de cada modal
      setupModalButtons();
    }
    
    /**
     * Configura os botões específicos de cada modal
     */
    function setupModalButtons() {
      // Modal de criar perfil
      const createProfileBtn = document.getElementById('create-profile-btn');
      if (createProfileBtn) {
        createProfileBtn.addEventListener('click', () => {
          const nameInput = document.getElementById('new-profile-name');
          const baseSelect = document.getElementById('new-profile-base');
          
          if (!nameInput.value.trim()) {
            showToast('Por favor, insira um nome para o perfil', 'error');
            return;
          }
          
          // Criar novo perfil
          createNewProfile(nameInput.value.trim(), baseSelect.value);
          
          // Fechar modal
          closeAllModals();
        });
      }
      
      // Modal de excluir perfil
      const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
      if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
          const profileSelect = document.getElementById('profile-list');
          const selectedProfileId = profileSelect.value;
          
          if (selectedProfileId === 'default') {
            showToast('Não é possível excluir o perfil padrão', 'error');
            closeAllModals();
            return;
          }
          
          // Excluir perfil
          deleteProfile(selectedProfileId);
          
          // Fechar modal
          closeAllModals();
        });
      }
    }
    
    /**
     * Abre um modal específico
     * @param {string} modalId - ID do modal a ser aberto
     */
    function openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        // Configurações específicas para cada modal
        if (modalId === 'delete-profile-modal') {
          const profileSelect = document.getElementById('profile-list');
          const profileOption = profileSelect.options[profileSelect.selectedIndex];
          document.getElementById('delete-profile-name').textContent = profileOption.text;
        }
        
        modal.classList.add('show');
      }
    }
    
    /**
     * Fecha todos os modais abertos
     */
    function closeAllModals() {
      document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
      });
    }
    
    /**
     * Configura os eventos da tela de escrita com IA
     */
    function setupAIWriting() {
      const rewriteBtn = document.getElementById('rewrite-btn');
      const aiInput = document.getElementById('ai-input');
      const aiOutput = document.getElementById('ai-output');
      const writingStyle = document.getElementById('writing-style');
      const uxOptimization = document.getElementById('ux-optimization');
      const cognitiveBias = document.getElementById('cognitive-bias');
      const addEmojis = document.getElementById('add-emojis');
      const copyOutputBtn = document.getElementById('copy-output');
      const saveOutputBtn = document.getElementById('save-output');
      
      // Evento de reescrita
      if (rewriteBtn && aiInput && aiOutput) {
        rewriteBtn.addEventListener('click', async () => {
          const text = aiInput.value.trim();
          if (!text) {
            showToast('Por favor, insira um texto para reescrever', 'error');
            return;
          }
          
          try {
            // Mostrar carregamento
            rewriteBtn.disabled = true;
            rewriteBtn.textContent = 'Reescrevendo...';
            
            // Preparar perfil temporário
            const tempProfile = {
              style: writingStyle.value,
              uxWriting: uxOptimization.checked,
              cognitiveBias: cognitiveBias.checked,
              addEmojis: addEmojis.checked
            };
            
            // Obter o módulo AI da página de fundo
            const aiModuleResponse = await sendMessageToBackground('getAIModule');
            if (!aiModuleResponse || !aiModuleResponse.success || !aiModuleResponse.module) {
              throw new Error('Não foi possível obter o módulo de IA');
            }
            
            // Chamar a função de reescrita
            const rewrittenText = await aiModuleResponse.module.rewriteText(text, tempProfile);
            
            // Mostrar o resultado
            aiOutput.value = rewrittenText;
            
            showToast('Texto reescrito com sucesso!', 'success');
          } catch (error) {
            console.error('Erro ao reescrever texto:', error);
            showToast('Ocorreu um erro ao reescrever o texto', 'error');
          } finally {
            // Restaurar botão
            rewriteBtn.disabled = false;
            rewriteBtn.textContent = '🔄 Reescrever';
          }
        });
      }
      
      // Evento de copiar resultado
      if (copyOutputBtn && aiOutput) {
        copyOutputBtn.addEventListener('click', () => {
          const text = aiOutput.value.trim();
          if (!text) {
            showToast('Nenhum texto para copiar', 'error');
            return;
          }
          
          // Copiar para a área de transferência
          navigator.clipboard.writeText(text)
            .then(() => showToast('Texto copiado para a área de transferência!', 'success'))
            .catch(() => showToast('Erro ao copiar texto', 'error'));
        });
      }
      
      // Evento de salvar resultado
      if (saveOutputBtn && aiOutput) {
        saveOutputBtn.addEventListener('click', () => {
          const text = aiOutput.value.trim();
          if (!text) {
            showToast('Nenhum texto para salvar', 'error');
            return;
          }
          
          // Criar um arquivo de texto para download
          const blob = new Blob([text], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          
          a.href = url;
          a.download = 'texto-reescrito.txt';
          document.body.appendChild(a);
          a.click();
          
          // Limpar
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 0);
          
          showToast('Texto salvo como arquivo!', 'success');
        });
      }
    }
    
    /**
     * Configura os eventos da tela de perfis
     */
    function setupProfiles() {
      const profileList = document.getElementById('profile-list');
      const profileName = document.getElementById('profile-name');
      const profileStyle = document.getElementById('profile-style');
      const profileUX = document.getElementById('profile-ux');
      const profileBias = document.getElementById('profile-bias');
      const profileEmoji = document.getElementById('profile-emoji');
      const profileAuto = document.getElementById('profile-auto');
      const profilePrompt = document.getElementById('profile-prompt');
      const saveProfileBtn = document.getElementById('save-profile-btn');
      
      // Evento de mudança de perfil selecionado
      if (profileList) {
        profileList.addEventListener('change', () => {
          loadProfileDetails(profileList.value);
        });
      }
      
      // Evento de salvar perfil
      if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
          if (!profileName.value.trim()) {
            showToast('Por favor, insira um nome para o perfil', 'error');
            return;
          }
          
          const profileData = {
            name: profileName.value.trim(),
            style: profileStyle.value,
            uxWriting: profileUX.checked,
            cognitiveBias: profileBias.checked,
            addEmojis: profileEmoji.checked,
            autoRewrite: profileAuto.checked,
            customPrompt: profilePrompt.value.trim()
          };
          
          // Salvar o perfil
          saveProfile(profileList.value, profileData);
        });
      }
    }
    
    /**
     * Configura os eventos da tela de configurações
     */
    function setupSettings() {
      const defaultProfile = document.getElementById('default-profile');
      const floatingMenuToggle = document.getElementById('floating-menu-toggle');
      const fixedButtonToggle = document.getElementById('fixed-button-toggle');
      const keyboardShortcutsToggle = document.getElementById('keyboard-shortcuts-toggle');
      const apiKey = document.getElementById('api-key');
      const apiUrl = document.getElementById('api-url');
      const modelSelect = document.getElementById('model-select');
      const saveSettingsBtn = document.getElementById('save-settings-btn');
      const resetSettingsBtn = document.getElementById('reset-settings-btn');
      const toggleApiKeyBtn = document.getElementById('toggle-api-key');
      
      // Mostrar/ocultar chave da API
      if (toggleApiKeyBtn && apiKey) {
        toggleApiKeyBtn.addEventListener('click', () => {
          if (apiKey.type === 'password') {
            apiKey.type = 'text';
            toggleApiKeyBtn.textContent = '🔒';
          } else {
            apiKey.type = 'password';
            toggleApiKeyBtn.textContent = '👁️';
          }
        });
      }
      
      // Salvar configurações
      if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
          const newSettings = {
            defaultProfile: defaultProfile.value,
            floatingMenu: floatingMenuToggle.checked,
            fixedButton: fixedButtonToggle.checked,
            keyboardShortcuts: keyboardShortcutsToggle.checked,
            apiKey: apiKey.value.trim(),
            apiUrl: apiUrl.value.trim(),
            model: modelSelect.value
          };
          
          // Salvar configurações
          saveSettings(newSettings);
        });
      }
      
      // Resetar configurações
      if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
          if (confirm('Tem certeza que deseja restaurar todas as configurações para os valores padrão?')) {
            resetSettings();
          }
        });
      }
    }
    
    /**
     * Configura os eventos da tela de ajuda
     */
    function setupHelp() {
      const helpTopicButtons = document.querySelectorAll('.help-topic-btn');
      const helpContent = document.getElementById('help-content');
      const helpContentTitle = document.getElementById('help-content-title');
      const helpContentBody = document.getElementById('help-content-body');
      const closeHelpContentBtn = document.getElementById('close-help-content');
      
      // Conteúdo de ajuda por tópico
      const helpTopics = {
        'formatting': {
          title: 'Formatação de Texto',
          content: `
            <p>O Blip SmartText oferece formatação rápida para qualquer texto selecionado em campos editáveis.</p>
            
            <h4>Como usar:</h4>
            <ol>
              <li>Selecione o texto que deseja formatar em qualquer campo editável</li>
              <li>Um menu flutuante aparecerá automaticamente com opções de formatação</li>
              <li>Clique na formatação desejada: negrito, itálico, tachado, código, etc.</li>
            </ol>
            
            <h4>Atalhos de teclado:</h4>
            <ul>
              <li><strong>Ctrl+B</strong> - Negrito</li>
              <li><strong>Ctrl+I</strong> - Itálico</li>
              <li><strong>Ctrl+E</strong> - Tachado</li>
              <li><strong>Ctrl+K</strong> - Código</li>
            </ul>
            
            <p>Para personalizar o comportamento da formatação, acesse a tela de Configurações.</p>
          `
        },
        'ai-writing': {
          title: 'Reescrita com IA',
          content: `
            <p>O Blip SmartText utiliza IA avançada para reescrever e melhorar seus textos.</p>
            
            <h4>Como usar:</h4>
            <ol>
              <li>Selecione o texto que deseja melhorar</li>
              <li>Clique no botão "✨" no menu flutuante</li>
              <li>Ou use o botão fixo no canto da tela para abrir o painel de IA</li>
              <li>Escolha um estilo de escrita e configurações adicionais</li>
              <li>Clique em "Reescrever"</li>
            </ol>
            
            <h4>Dicas:</h4>
            <ul>
              <li>Crie perfis personalizados para diferentes tipos de texto</li>
              <li>A opção "Otimizar para UX" é ideal para textos em interfaces</li>
              <li>Use "Técnicas persuasivas" para textos de marketing</li>
              <li>Para textos mais expressivos, ative "Adicionar emojis"</li>
            </ul>
            
            <p>Atalho de teclado: <strong>Ctrl+Shift+H</strong> - Reescrever texto selecionado</p>
          `
        },
        'emojis': {
          title: 'Inserção de Emojis',
          content: `
            <p>Adicione emojis aos seus textos facilmente com o seletor inteligente.</p>
            
            <h4>Como usar:</h4>
            <ol>
              <li>Coloque o cursor onde deseja inserir um emoji</li>
              <li>Clique no botão "😀" no menu de formatação</li>
              <li>Ou selecione "Inserir Emoji" no menu de contexto (clique direito)</li>
              <li>Escolha um emoji da lista ou pesquise por categoria</li>
            </ol>
            
            <h4>Recursos:</h4>
            <ul>
              <li>Os emojis usados recentemente ficam sempre disponíveis</li>
              <li>Pesquise emojis por nome ou categoria</li>
              <li>Navegue por categorias: Sorrisos, Gestos, Objetos, etc.</li>
            </ul>
            
            <p>Você também pode configurar a IA para adicionar emojis automaticamente aos textos reescritos.</p>
          `
        }
      };
      
      // Evento para mostrar o conteúdo de ajuda
      helpTopicButtons.forEach(button => {
        button.addEventListener('click', () => {
          const topic = button.dataset.topic;
          if (helpTopics[topic]) {
            helpContentTitle.textContent = helpTopics[topic].title;
            helpContentBody.innerHTML = helpTopics[topic].content;
            helpContent.style.display = 'block';
          }
        });
      });
      
      // Fechar conteúdo de ajuda
      if (closeHelpContentBtn) {
        closeHelpContentBtn.addEventListener('click', () => {
          helpContent.style.display = 'none';
        });
      }
    }
    
    /* ==========================
       FUNÇÕES DE PERFIL
    ========================== */
    
    /**
     * Carrega os detalhes de um perfil no formulário
     * @param {string} profileId - ID do perfil a ser carregado
     */
    function loadProfileDetails(profileId) {
      const profile = state.profiles[profileId];
      if (!profile) return;
      
      // Preencher o formulário
      document.getElementById('profile-name').value = profile.name || '';
      document.getElementById('profile-style').value = profile.style || 'professional';
      document.getElementById('profile-ux').checked = !!profile.uxWriting;
      document.getElementById('profile-bias').checked = !!profile.cognitiveBias;
      document.getElementById('profile-emoji').checked = !!profile.addEmojis;
      document.getElementById('profile-auto').checked = !!profile.autoRewrite;
      document.getElementById('profile-prompt').value = profile.customPrompt || '';
      
      // Desabilitar edição do nome para o perfil padrão
      const isDefaultProfile = profileId === 'default';
      document.getElementById('profile-name').disabled = isDefaultProfile;
    }
    
    /**
     * Popula a lista de perfis disponíveis
     */
    function populateProfilesList() {
      const profileList = document.getElementById('profile-list');
      const defaultProfile = document.getElementById('default-profile');
      
      if (!profileList || !defaultProfile) return;
      
      // Limpar listas
      profileList.innerHTML = '';
      defaultProfile.innerHTML = '';
      
      // Adicionar cada perfil às listas
      Object.keys(state.profiles).forEach(profileId => {
        const profile = state.profiles[profileId];
        
        // Adicionar à lista de perfis
        const optionProfile = document.createElement('option');
        optionProfile.value = profileId;
        optionProfile.textContent = profile.name;
        profileList.appendChild(optionProfile);
        
        // Adicionar à lista de perfil padrão
        const optionDefault = document.createElement('option');
        optionDefault.value = profileId;
        optionDefault.textContent = profile.name;
        defaultProfile.appendChild(optionDefault);
      });
      
      // Selecionar o perfil atual
      if (state.selectedProfile) {
        const profileId = Object.keys(state.profiles).find(
          id => state.profiles[id].name === state.selectedProfile.name
        );
        
        if (profileId) {
          profileList.value = profileId;
          loadProfileDetails(profileId);
        }
      }
      
      // Selecionar o perfil padrão nas configurações
      if (state.settings.defaultProfile) {
        defaultProfile.value = state.settings.defaultProfile;
      }
    }
    
    /**
     * Criar um novo perfil
     * @param {string} name - Nome do novo perfil
     * @param {string} baseProfileId - ID do perfil base
     */
    function createNewProfile(name, baseProfileId) {
      // Verificar se já existe perfil com este nome
      const profileIds = Object.keys(state.profiles);
      const existingProfile = profileIds.find(id => 
        state.profiles[id].name.toLowerCase() === name.toLowerCase()
      );
      
      if (existingProfile) {
        showToast('Já existe um perfil com este nome', 'error');
        return;
      }
      
      // Gerar novo ID
      const newProfileId = 'profile_' + Date.now();
      
      // Copiar perfil base
      const baseProfile = state.profiles[baseProfileId] || state.profiles['default'];
      const newProfile = { ...baseProfile, name };
      
      // Salvar novo perfil
      state.profiles[newProfileId] = newProfile;
      chrome.storage.local.set({ profiles: state.profiles }, () => {
        showToast(`Perfil "${name}" criado com sucesso!`, 'success');
        populateProfilesList();
        
        // Selecionar o novo perfil
        const profileList = document.getElementById('profile-list');
        if (profileList) {
          profileList.value = newProfileId;
          loadProfileDetails(newProfileId);
        }
      });
    }
    
    /**
     * Salvar um perfil existente
     * @param {string} profileId - ID do perfil
     * @param {Object} profileData - Dados do perfil
     */
    function saveProfile(profileId, profileData) {
      // Verificar se é o perfil padrão
      if (profileId === 'default' && profileData.name !== 'Perfil Padrão') {
        profileData.name = 'Perfil Padrão';
      }
      
      // Atualizar o perfil
      state.profiles[profileId] = profileData;
      
      // Se for o perfil selecionado atualmente, atualizá-lo também
      if (state.selectedProfile && state.selectedProfile.name === state.profiles[profileId].name) {
        state.selectedProfile = profileData;
      }
      
      // Salvar no storage
      chrome.storage.local.set({ 
        profiles: state.profiles,
        selectedProfile: state.selectedProfile
      }, () => {
        showToast(`Perfil "${profileData.name}" salvo com sucesso!`, 'success');
        populateProfilesList();
        updateCurrentProfileDisplay();
      });
    }
    
    /**
     * Excluir um perfil
     * @param {string} profileId - ID do perfil a ser excluído
     */
    function deleteProfile(profileId) {
      // Verificar se é o perfil padrão
      if (profileId === 'default') {
        showToast('Não é possível excluir o perfil padrão', 'error');
        return;
      }
      
      const profileName = state.profiles[profileId].name;
      
      // Remover o perfil
      delete state.profiles[profileId];
      
      // Se for o perfil selecionado, voltar para o padrão
      if (state.selectedProfile && state.selectedProfile.name === profileName) {
        state.selectedProfile = state.profiles['default'];
      }
      
      // Se for o perfil padrão nas configurações, voltar para o default
      if (state.settings.defaultProfile === profileId) {
        state.settings.defaultProfile = 'default';
      }
      
      // Salvar no storage
      chrome.storage.local.set({ 
        profiles: state.profiles,
        selectedProfile: state.selectedProfile,
        settings: state.settings
      }, () => {
        showToast(`Perfil "${profileName}" excluído com sucesso!`, 'success');
        populateProfilesList();
        updateCurrentProfileDisplay();
      });
    }
    
    /**
     * Atualiza a exibição do perfil atual na tela inicial
     */
    function updateCurrentProfileDisplay() {
      const currentProfileElem = document.getElementById('current-profile');
      if (currentProfileElem && state.selectedProfile) {
        currentProfileElem.textContent = state.selectedProfile.name;
      }
    }
    
    /* ==========================
       FUNÇÕES DE CONFIGURAÇÃO
    ========================== */
    
    /**
     * Atualiza a interface com as configurações atuais
     */
    function updateSettingsUI() {
      // Aplicar configurações aos elementos da interface
      if (document.getElementById('floating-menu-toggle')) {
        document.getElementById('floating-menu-toggle').checked = state.settings.floatingMenu;
      }
      
      if (document.getElementById('fixed-button-toggle')) {
        document.getElementById('fixed-button-toggle').checked = state.settings.fixedButton;
      }
      
      if (document.getElementById('keyboard-shortcuts-toggle')) {
        document.getElementById('keyboard-shortcuts-toggle').checked = state.settings.keyboardShortcuts;
      }
      
      if (document.getElementById('api-key')) {
        document.getElementById('api-key').value = state.settings.apiKey || '';
      }
      
      if (document.getElementById('api-url')) {
        document.getElementById('api-url').value = state.settings.apiUrl || '';
      }
      
      if (document.getElementById('model-select') && state.settings.model) {
        document.getElementById('model-select').value = state.settings.model;
      }
      
      if (document.getElementById('default-profile') && state.settings.defaultProfile) {
        document.getElementById('default-profile').value = state.settings.defaultProfile;
      }
    }
    
    /**
     * Salva as configurações no storage
     * @param {Object} newSettings - Novas configurações
     */
    function saveSettings(newSettings) {
      // Atualizar o estado
      state.settings = { ...state.settings, ...newSettings };
      
      // Salvar no storage
      chrome.storage.local.set({ settings: state.settings }, () => {
        // Enviar novas configurações ao content script
        sendMessageToActiveTabs({ action: "updateSettings", data: state.settings });
        
        showToast('Configurações salvas com sucesso!', 'success');
      });
    }
    
    /**
     * Restaura as configurações para valores padrão
     */
    function resetSettings() {
      // Configurações padrão
      const defaultSettings = {
        floatingMenu: true,
        fixedButton: true,
        keyboardShortcuts: true,
        defaultProfile: 'default',
        apiKey: '22c921ec30c04a28aa32c86edd034156',
        apiUrl: 'https://dev-openai-take.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2023-03-15-preview',
        model: 'gpt-4-0613'
      };
      
      // Atualizar o estado
      state.settings = defaultSettings;
      
      // Atualizar a interface
      updateSettingsUI();
      
      // Salvar no storage
      chrome.storage.local.set({ settings: state.settings }, () => {
        // Enviar novas configurações ao content script
        sendMessageToActiveTabs({ action: "updateSettings", data: state.settings });
        
        showToast('Configurações restauradas para valores padrão', 'success');
      });
    }
    
    /* ==========================
       FUNÇÕES UTILITÁRIAS
    ========================== */
    
    /**
     * Verifica o status da extensão
     */
    function checkExtensionStatus() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        
        chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, (response) => {
          const statusElem = document.getElementById('extension-status');
          if (!statusElem) return;
          
          if (chrome.runtime.lastError || !response) {
            // Script não está ativo na página atual
            statusElem.textContent = 'Inativo na página atual';
            statusElem.classList.remove('active');
          } else {
            // Script está ativo
            statusElem.textContent = 'Ativo';
            statusElem.classList.add('active');
          }
        });
      });
    }
    
    /**
     * Envia uma mensagem para o script em segundo plano
     * @param {string} action - Ação a ser executada
     * @param {Object} data - Dados a serem enviados
     * @returns {Promise} - Promessa que resolve com a resposta
     */
    function sendMessageToBackground(action, data = {}) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action, data }, (response) => {
          resolve(response);
        });
      });
    }
    
    /**
     * Envia uma mensagem para todas as abas ativas
     * @param {Object} message - Mensagem a ser enviada
     */
    function sendMessageToActiveTabs(message) {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          try {
            chrome.tabs.sendMessage(tab.id, message);
          } catch (error) {
            // Ignorar erros (a aba pode não ter o script injetado)
          }
        });
      });
    }
    
    /**
     * Mostra uma notificação toast
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo de notificação (success, error, info)
     */
    function showToast(message, type = 'info') {
      // Criar elemento de notificação
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      
      // Ícones para cada tipo
      const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
      };
      
      toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
        <div class="toast-message">${message}</div>
      `;
      
      // Adicionar ao documento
      document.body.appendChild(toast);
      
      // Mostrar com animação
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);
      
      // Remover após 3 segundos
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, 3000);
    }
    
    // Adicionar estilos para o toast
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
      .toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100%);
        min-width: 250px;
        max-width: 80%;
        background-color: white;
        border-radius: 6px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 2000;
        transition: transform 0.3s ease;
      }
      
      .toast.show {
        transform: translateX(-50%) translateY(0);
      }
      
      .toast.success {
        border-left: 4px solid var(--blip-success);
      }
      
      .toast.error {
        border-left: 4px solid var(--blip-error);
      }
      
      .toast.info {
        border-left: 4px solid var(--blip-primary);
      }
      
      .toast-icon {
        font-size: 18px;
      }
      
      .toast-message {
        font-size: 14px;
      }
    `;
    
    document.head.appendChild(toastStyles);
  });