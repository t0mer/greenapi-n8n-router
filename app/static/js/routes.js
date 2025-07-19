class RoutesManager {
    constructor() {
        this.routes = [];
        this.modal = null;
        this.loggerSocket = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupLogger();
        this.loadRoutes();
    }

    async loadRoutes() {
        // Show loading state
        this.showLoadingState();
        
        try {
            // Fetch routes directly from the /routes GET API
            const response = await fetch('/routes');
            
            if (response.ok) {
                const data = await response.json();
                console.log('Fetched routes data:', data); // Debug log
                
                // Transform the routes data to cards format
                if (data.routes && typeof data.routes === 'object') {
                    this.routes = this.transformRoutesToCards(data.routes);
                    console.log('Transformed routes:', this.routes); // Debug log
                } else {
                    console.log('No routes found in response');
                    this.routes = [];
                }
            } else {
                console.error('Failed to fetch routes:', response.status);
                this.routes = [];
            }

        } catch (error) {
            console.error('Error loading routes:', error.message);
            this.routes = [];
        }
        
        // Render immediately after loading
        this.renderRoutes();
    }

    showLoadingState() {
        const container = document.getElementById('cardsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="cards-grid" id="cardsGrid">
                <div style="grid-column: 1 / -1; text-align: center; color: white; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 15px;">Loading routes...</p>
                </div>
            </div>
        `;
    }

    transformRoutesToCards(routesConfig) {
        const routes = [];
        for (const [chatId, webhookUrls] of Object.entries(routesConfig)) {
            // Handle both array of URLs and single URL
            const urlArray = Array.isArray(webhookUrls) ? webhookUrls : [webhookUrls];
            const primaryUrl = urlArray[0] || '';
            
            routes.push({
                id: chatId,
                webhookUrl: primaryUrl,
                webhookUrls: urlArray, // Keep all URLs for details view
                rawData: { webhookUrls }
            });
        }
        return routes.sort((a, b) => a.id.localeCompare(b.id));
    }

    formatLastActivity(timestamp) {
        if (!timestamp) return 'Never';
        
        let date;
        if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else if (typeof timestamp === 'number') {
            date = new Date(timestamp * 1000); // Convert from seconds if needed
        } else {
            date = new Date(timestamp);
        }
        
        if (isNaN(date.getTime())) return 'Never';
        
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-card-btn')) {
                this.showModal();
            }
            
            if (e.target.closest('#settingsBtn')) {
                this.showSettingsModal();
            }
            
            if (e.target.closest('.chat-card') && !e.target.closest('.edit-controls') && !e.target.closest('.delete-btn')) {
                const chatId = e.target.closest('.chat-card').dataset.chatId;
                this.openRouteDetails(chatId);
            }
            
            if (e.target.closest('.save-edit')) {
                e.stopPropagation();
                const chatId = e.target.closest('.chat-card').dataset.chatId;
                this.saveEdit(chatId);
            }
            
            if (e.target.closest('.cancel-edit')) {
                e.stopPropagation();
                const chatId = e.target.closest('.chat-card').dataset.chatId;
                this.cancelEdit(chatId);
            }
            
            if (e.target.closest('.delete-btn')) {
                e.stopPropagation();
                const chatId = e.target.closest('.chat-card').dataset.chatId;
                this.confirmDeleteRoute(chatId);
            }
            
            if (e.target.closest('.close')) {
                this.hideModal();
            }
            
            if (e.target.closest('.modal') && !e.target.closest('.modal-content')) {
                this.hideModal();
            }
        });

        document.addEventListener('submit', (e) => {
            if (e.target.id === 'routeForm') {
                e.preventDefault();
                this.handleFormSubmit(e.target);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    async showSettingsModal() {
        try {
            // Fetch current settings
            const response = await fetch('/settings');
            const settings = await response.json();

            const { value: formValues } = await Swal.fire({
                title: '⚙️ Green API Settings',
                html: `
                    <div style="text-align: left;">
                        <div style="margin-bottom: 15px;">
                            <label for="instanceId" style="display: block; margin-bottom: 5px; font-weight: 500;">Instance ID:</label>
                            <input id="instanceId" class="swal2-input" placeholder="Enter Instance ID" value="${settings.instance_id || ''}" style="margin: 0;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label for="token" style="display: block; margin-bottom: 5px; font-weight: 500;">Token:</label>
                            <input id="token" class="swal2-input" type="password" placeholder="Enter Token" value="${settings.token || ''}" style="margin: 0;">
                        </div>
                        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px;">
                            <p style="margin: 0; color: #666;">
                                <strong>Note:</strong> Updating these settings will restart the entire application to apply changes.
                            </p>
                        </div>
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Update & Restart',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#2196F3',
                preConfirm: () => {
                    const instanceId = document.getElementById('instanceId').value.trim();
                    const token = document.getElementById('token').value.trim();
                    
                    if (!instanceId || !token) {
                        Swal.showValidationMessage('Both Instance ID and Token are required');
                        return false;
                    }
                    
                    return { instanceId, token };
                }
            });

            if (formValues) {
                await this.updateSettings(formValues.instanceId, formValues.token);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to load current settings.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    async updateSettings(instanceId, token) {
        try {
            // Show loading
            Swal.fire({
                title: 'Updating Settings...',
                text: 'Please wait while we update the configuration.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch('/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    instance_id: instanceId,
                    token: token
                })
            });

            if (response.ok) {
                // Show success and restart message
                Swal.fire({
                    title: 'Settings Updated!',
                    text: 'Configuration saved successfully. The bot will restart in 3 seconds...',
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false
                });

                // Trigger restart after 3 seconds
                setTimeout(async () => {
                    try {
                        await fetch('/restart', { method: 'POST' });
                        // Show quick restart completion message
                        this.showBotRestartMessage();
                    } catch (error) {
                        console.log('Restart triggered, showing completion...');
                        this.showBotRestartMessage();
                    }
                }, 3000);
            } else {
                const error = await response.text();
                Swal.fire({
                    title: 'Error!',
                    text: `Failed to update settings: ${error}`,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to update settings. Server may be unavailable.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    showBotRestartMessage() {
        // Show a quick message about bot restart
        Swal.fire({
            title: 'Bot Restarted!',
            html: `
                <div style="text-align: center;">
                    <p>✅ Bot component has been restarted successfully!</p>
                    <p style="color: #666; font-size: 0.9em;">Web interface remained online during the restart.</p>
                </div>
            `,
            icon: 'success',
            timer: 3000,
            showConfirmButton: false,
            allowOutsideClick: true,
            allowEscapeKey: true
        });
    }

    renderRoutes() {
        const container = document.getElementById('cardsContainer');
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Create cards grid
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'cards-grid';
        cardsGrid.id = 'cardsGrid';

        // Show message if no routes
        if (this.routes.length === 0) {
            const noRoutesMessage = document.createElement('div');
            noRoutesMessage.style.cssText = 'grid-column: 1 / -1; text-align: center; color: white; padding: 40px;';
            noRoutesMessage.innerHTML = '<p>No routes found. Click "Add New Route" to create your first route.</p>';
            cardsGrid.appendChild(noRoutesMessage);
        } else {
            // Add route cards
            this.routes.forEach(route => {
                const card = this.createRouteCard(route);
                cardsGrid.appendChild(card);
            });
        }

        // Add "Add New Route" card
        const addCard = this.createAddCard();
        cardsGrid.appendChild(addCard);

        container.appendChild(cardsGrid);
        this.setupDragAndDrop();
    }

    createRouteCard(route) {
        const card = document.createElement('div');
        card.className = 'chat-card';
        card.dataset.chatId = route.id;
        card.draggable = true;

        const truncatedUrl = route.webhookUrl ? 
            (route.webhookUrl.length > 45 ? route.webhookUrl.substring(0, 45) + '...' : route.webhookUrl) : 
            'No webhook URL';

        card.innerHTML = `
            <div class="card-header">
                <h3 class="chat-id">${route.id}</h3>
            </div>
            <div class="card-content">
                <p><strong>🔗 Webhook:</strong> 
                    <span class="webhook-display" title="${route.webhookUrl || 'Not set'}">${truncatedUrl}</span>
                    <input type="url" class="webhook-edit" value="${route.webhookUrl || ''}" style="display: none;">
                </p>
            </div>
            <div class="card-meta">
                <span class="webhook-count">
                    📋 ${route.webhookUrls.length} webhook${route.webhookUrls.length > 1 ? 's' : ''}
                </span>
                <div class="edit-controls" style="display: none;">
                    <button class="save-edit" title="Save changes">✅</button>
                    <button class="cancel-edit" title="Cancel">❌</button>
                </div>
                <button class="delete-btn" title="Delete route">🗑️</button>
            </div>
        `;

        return card;
    }

    createAddCard() {
        const addCard = document.createElement('div');
        addCard.className = 'add-card-btn';
        addCard.innerHTML = `
            <div class="add-icon">+</div>
            <div>Add New Route</div>
        `;
        return addCard;
    }

    enableEditMode(chatId) {
        const card = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (!card) return;

        const webhookDisplay = card.querySelector('.webhook-display');
        const webhookEdit = card.querySelector('.webhook-edit');
        const editControls = card.querySelector('.edit-controls');

        // Hide display elements and show edit elements
        webhookDisplay.style.display = 'none';
        webhookEdit.style.display = 'inline-block';
        editControls.style.display = 'flex';

        // Focus on the input
        webhookEdit.focus();
        webhookEdit.select();

        // Disable card dragging during edit
        card.draggable = false;
    }

    cancelEdit(chatId) {
        const card = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (!card) return;

        const route = this.routes.find(r => r.id === chatId);
        const webhookDisplay = card.querySelector('.webhook-display');
        const webhookEdit = card.querySelector('.webhook-edit');
        const editControls = card.querySelector('.edit-controls');

        // Reset input to original value
        webhookEdit.value = route.webhookUrl || '';

        // Show display elements and hide edit elements
        webhookDisplay.style.display = 'inline';
        webhookEdit.style.display = 'none';
        editControls.style.display = 'none';

        // Re-enable card dragging
        card.draggable = true;
    }

    async saveEdit(chatId) {
        const card = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (!card) return;

        const webhookEdit = card.querySelector('.webhook-edit');
        const newUrl = webhookEdit.value.trim();

        if (!newUrl) {
            alert('Webhook URL cannot be empty');
            return;
        }

        try {
            // Show loading state
            const saveBtn = card.querySelector('.save-edit');
            saveBtn.textContent = '⏳';
            saveBtn.disabled = true;

            const response = await fetch(`/routes/${chatId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    target_urls: [newUrl]
                })
            });

            if (response.ok) {
                // Update the route in memory
                const route = this.routes.find(r => r.id === chatId);
                if (route) {
                    route.webhookUrl = newUrl;
                    route.webhookUrls = [newUrl];
                }

                // Update the card display
                this.updateCardDisplay(chatId, newUrl);
                this.cancelEdit(chatId);
                this.showNotification('Webhook URL updated successfully!', 'success');
            } else {
                const error = await response.text();
                alert(`Failed to update webhook URL: ${error}`);
                saveBtn.textContent = '✅';
                saveBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error updating webhook URL:', error);
            alert('Failed to update webhook URL. Server may be unavailable.');
            const saveBtn = card.querySelector('.save-edit');
            saveBtn.textContent = '✅';
            saveBtn.disabled = false;
        }
    }

    updateCardDisplay(chatId, newUrl) {
        const card = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (!card) return;

        const webhookDisplay = card.querySelector('.webhook-display');
        const truncatedUrl = newUrl.length > 45 ? newUrl.substring(0, 45) + '...' : newUrl;
        
        webhookDisplay.textContent = truncatedUrl;
        webhookDisplay.title = newUrl;
    }

    async confirmDeleteRoute(chatId) {
        const route = this.routes.find(r => r.id === chatId);
        if (!route) return;

        const result = await Swal.fire({
            title: 'Delete Route?',
            html: `
                <p>Are you sure you want to delete this route?</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left;">
                    <strong>Chat ID:</strong> ${route.id}<br>
                    <strong>Webhook URLs:</strong> ${route.webhookUrls.length}<br>
                    <strong>URLs:</strong><br>
                    ${route.webhookUrls.map(url => `• ${url}`).join('<br>')}
                </div>
                <p style="color: #dc3545; font-weight: bold;">This action cannot be undone!</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            focusCancel: true
        });

        if (result.isConfirmed) {
            await this.deleteRoute(chatId);
        }
    }

    async deleteRoute(chatId) {
        try {
            // Show loading toast
            Swal.fire({
                title: 'Deleting...',
                text: 'Please wait while we delete the route.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch(`/routes/${chatId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove from local routes array
                this.routes = this.routes.filter(route => route.id !== chatId);
                
                // Re-render the routes
                this.renderRoutes();
                
                // Show success message
                Swal.fire({
                    title: 'Deleted!',
                    text: 'The route has been successfully deleted.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                const error = await response.text();
                Swal.fire({
                    title: 'Error!',
                    text: `Failed to delete route: ${error}`,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        } catch (error) {
            console.error('Error deleting route:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to delete route. Server may be unavailable.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    setupDragAndDrop() {
        const cards = document.querySelectorAll('.chat-card');
        const grid = document.getElementById('cardsGrid');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.chatId);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                grid.classList.remove('drag-over');
            });
        });

        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            grid.classList.add('drag-over');
        });

        grid.addEventListener('dragleave', (e) => {
            if (!grid.contains(e.relatedTarget)) {
                grid.classList.remove('drag-over');
            }
        });

        grid.addEventListener('drop', (e) => {
            e.preventDefault();
            grid.classList.remove('drag-over');
            console.log('Route reordered:', e.dataTransfer.getData('text/plain'));
        });
    }

    showModal() {
        if (!this.modal) {
            this.createModal();
        }
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Create New Route</h2>
                <form id="routeForm">
                    <div class="form-group">
                        <label for="chatId">Chat ID:</label>
                        <input type="text" id="chatId" name="chatId" required 
                            placeholder="e.g., 972523531857@c.us">
                    </div>
                    <div class="form-group">
                        <label>Webhook URLs:</label>
                        <div class="webhooks-input-list" id="webhooksInputList">
                            <div class="webhook-input-item">
                                <input type="url" class="webhook-url-input" placeholder="https://your-n8n-instance.com/webhook/..." required>
                                <button type="button" class="remove-webhook-input" title="Remove webhook">🗑️</button>
                            </div>
                        </div>
                        <button type="button" class="btn btn-secondary add-webhook-input-btn">Add Another Webhook</button>
                    </div>
                    <button type="submit" class="btn btn-primary">Create Route</button>
                    <button type="button" class="btn btn-secondary" onclick="routesManager.hideModal()">Cancel</button>
                </form>
            </div>
        `;
        document.body.appendChild(this.modal);
        this.setupCreateModalListeners();
    }

    setupCreateModalListeners() {
        const modal = this.modal;
        
        modal.addEventListener('click', (e) => {
            if (e.target.closest('.add-webhook-input-btn')) {
                this.addWebhookInput();
            }
            
            if (e.target.closest('.remove-webhook-input')) {
                this.removeWebhookInput(e.target.closest('.webhook-input-item'));
            }
        });
    }

    addWebhookInput() {
        const webhooksList = this.modal.querySelector('#webhooksInputList');
        const newWebhookInput = document.createElement('div');
        newWebhookInput.className = 'webhook-input-item';
        newWebhookInput.innerHTML = `
            <input type="url" class="webhook-url-input" placeholder="https://your-n8n-instance.com/webhook/..." required>
            <button type="button" class="remove-webhook-input" title="Remove webhook">🗑️</button>
        `;
        webhooksList.appendChild(newWebhookInput);
        
        // Focus on the new input
        newWebhookInput.querySelector('.webhook-url-input').focus();
    }

    removeWebhookInput(webhookInputItem) {
        const webhooksList = this.modal.querySelector('#webhooksInputList');
        
        // Don't allow removing the last webhook input
        if (webhooksList.children.length <= 1) {
            Swal.fire({
                title: 'Cannot Remove!',
                text: 'A route must have at least one webhook URL.',
                icon: 'warning',
                confirmButtonColor: '#2196F3'
            });
            return;
        }
        
        webhookInputItem.remove();
    }

    async handleFormSubmit(form) {
        const formData = new FormData(form);
        const chatId = formData.get('chatId');
        
        // Collect all webhook URLs
        const webhookInputs = form.querySelectorAll('.webhook-url-input');
        const webhookUrls = Array.from(webhookInputs)
            .map(input => input.value.trim())
            .filter(url => url !== ''); // Remove empty URLs

        if (webhookUrls.length === 0) {
            Swal.fire({
                title: 'Error!',
                text: 'Please enter at least one webhook URL.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        // Check for duplicate URLs within the same route
        const uniqueUrls = [...new Set(webhookUrls)];
        if (uniqueUrls.length !== webhookUrls.length) {
            Swal.fire({
                title: 'Duplicate URLs!',
                text: 'Please remove duplicate webhook URLs.',
                icon: 'warning',
                confirmButtonColor: '#2196F3'
            });
            return;
        }

        const newRoute = {
            chat_id: chatId,
            target_urls: webhookUrls
        };

        if (this.routes.find(route => route.id === newRoute.chat_id)) {
            Swal.fire({
                title: 'Chat ID Already Exists!',
                text: 'A route with this Chat ID already exists. Please choose a different Chat ID.',
                icon: 'warning',
                confirmButtonColor: '#2196F3',
                confirmButtonText: 'OK'
            });
            return;
        }

        try {
            const response = await fetch('/routes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newRoute)
            });

            if (response.ok) {
                // Reload routes from server
                await this.loadRoutes();
                this.hideModal();
                form.reset();
                
                // Reset to single webhook input
                const webhooksList = form.querySelector('#webhooksInputList');
                webhooksList.innerHTML = `
                    <div class="webhook-input-item">
                        <input type="url" class="webhook-url-input" placeholder="https://your-n8n-instance.com/webhook/..." required>
                        <button type="button" class="remove-webhook-input" title="Remove webhook">🗑️</button>
                    </div>
                `;
                
                Swal.fire({
                    title: 'Success!',
                    text: `Route created successfully with ${webhookUrls.length} webhook${webhookUrls.length > 1 ? 's' : ''}!`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                const error = await response.text();
                Swal.fire({
                    title: 'Error!',
                    text: `Failed to create route: ${error}`,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        } catch (error) {
            console.error('Error creating route:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to create route. Server may be unavailable.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    openRouteDetails(chatId) {
        const route = this.routes.find(r => r.id === chatId);
        if (route) {
            // Create a more detailed modal instead of alert
            this.showRouteDetailsModal(route);
        }
    }

    showRouteDetailsModal(route) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const webhooksList = route.webhookUrls.map((url, index) => 
            `<div class="webhook-item" data-index="${index}">
                <span class="webhook-url" title="${url}">${url}</span>
                <input type="url" class="webhook-edit-input" value="${url}" style="display: none;">
                <div class="webhook-actions">
                    <button class="edit-webhook-btn" title="Edit webhook">✏️</button>
                    <button class="delete-webhook-btn" title="Delete webhook">🗑️</button>
                    <div class="webhook-edit-controls" style="display: none;">
                        <button class="save-webhook-btn" title="Save changes">✅</button>
                        <button class="cancel-webhook-btn" title="Cancel">❌</button>
                    </div>
                </div>
            </div>`
        ).join('');
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <h2>Route Details</h2>
                <div class="route-details">
                    <p><strong>Chat ID:</strong> ${route.id}</p>
                    <p><strong>Webhook URL(s):</strong></p>
                    <div class="webhooks-list">
                        ${webhooksList}
                        <div class="add-webhook-container" style="display: none;">
                            <div class="webhook-item add-webhook-item">
                                <input type="url" class="add-webhook-input" placeholder="Enter new webhook URL..." style="flex: 1; margin-right: 10px;">
                                <div class="webhook-actions">
                                    <button class="confirm-add-webhook-btn" title="Add webhook">✅</button>
                                    <button class="cancel-add-webhook-btn" title="Cancel">❌</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p><strong>Total Webhooks:</strong> ${route.webhookUrls.length}</p>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary add-webhook-trigger-btn">Add Webhook</button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners for webhook editing, deleting, and adding
        this.setupWebhookEditListeners(modal, route);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    setupWebhookEditListeners(modal, route) {
        modal.addEventListener('click', (e) => {
            if (e.target.closest('.edit-webhook-btn')) {
                const webhookItem = e.target.closest('.webhook-item');
                this.enableWebhookEdit(webhookItem);
            }
            
            if (e.target.closest('.save-webhook-btn')) {
                const webhookItem = e.target.closest('.webhook-item');
                this.saveWebhookEdit(webhookItem, route, modal);
            }
            
            if (e.target.closest('.cancel-webhook-btn')) {
                const webhookItem = e.target.closest('.webhook-item');
                this.cancelWebhookEdit(webhookItem);
            }
            
            if (e.target.closest('.delete-webhook-btn')) {
                const webhookItem = e.target.closest('.webhook-item');
                this.confirmDeleteWebhook(webhookItem, route, modal);
            }
            
            if (e.target.closest('.add-webhook-trigger-btn')) {
                this.showAddWebhookInput(modal);
            }
            
            if (e.target.closest('.confirm-add-webhook-btn')) {
                this.confirmAddWebhook(modal, route);
            }
            
            if (e.target.closest('.cancel-add-webhook-btn')) {
                this.cancelAddWebhook(modal);
            }
        });
    }

    showAddWebhookInput(modal) {
        const addContainer = modal.querySelector('.add-webhook-container');
        const addTriggerBtn = modal.querySelector('.add-webhook-trigger-btn');
        const addInput = modal.querySelector('.add-webhook-input');

        addContainer.style.display = 'block';
        addTriggerBtn.disabled = true;
        addTriggerBtn.textContent = 'Adding...';

        addInput.focus();
    }

    cancelAddWebhook(modal) {
        const addContainer = modal.querySelector('.add-webhook-container');
        const addTriggerBtn = modal.querySelector('.add-webhook-trigger-btn');
        const addInput = modal.querySelector('.add-webhook-input');

        addContainer.style.display = 'none';
        addTriggerBtn.disabled = false;
        addTriggerBtn.textContent = 'Add Webhook';
        addInput.value = '';
    }

    async confirmAddWebhook(modal, route) {
        const addInput = modal.querySelector('.add-webhook-input');
        const newUrl = addInput.value.trim();

        if (!newUrl) {
            Swal.fire({
                title: 'Error!',
                text: 'Webhook URL cannot be empty',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        // Check for duplicate URLs
        if (route.webhookUrls.includes(newUrl)) {
            Swal.fire({
                title: 'Error!',
                text: 'This webhook URL already exists for this route',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        try {
            // Show loading on confirm button
            const confirmBtn = modal.querySelector('.confirm-add-webhook-btn');
            confirmBtn.textContent = '⏳';
            confirmBtn.disabled = true;

            // Update the webhooks array
            const updatedUrls = [...route.webhookUrls, newUrl];

            const response = await fetch(`/routes/${route.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: route.id,
                    target_urls: updatedUrls
                })
            });

            if (response.ok) {
                // Update the route in memory
                route.webhookUrls = updatedUrls;

                // Create new webhook item HTML
                const newWebhookHtml = `
                    <div class="webhook-item" data-index="${updatedUrls.length - 1}">
                        <span class="webhook-url" title="${newUrl}">${newUrl}</span>
                        <input type="url" class="webhook-edit-input" value="${newUrl}" style="display: none;">
                        <div class="webhook-actions">
                            <button class="edit-webhook-btn" title="Edit webhook">✏️</button>
                            <button class="delete-webhook-btn" title="Delete webhook">🗑️</button>
                            <div class="webhook-edit-controls" style="display: none;">
                                <button class="save-webhook-btn" title="Save changes">✅</button>
                                <button class="cancel-webhook-btn" title="Cancel">❌</button>
                            </div>
                        </div>
                    </div>
                `;

                // Insert the new webhook item before the add container
                const addContainer = modal.querySelector('.add-webhook-container');
                addContainer.insertAdjacentHTML('beforebegin', newWebhookHtml);

                // Update the webhook count display
                const totalWebhooksElement = modal.querySelector('.route-details p:last-child');
                if (totalWebhooksElement) {
                    totalWebhooksElement.innerHTML = `<strong>Total Webhooks:</strong> ${updatedUrls.length}`;
                }

                // Update the card webhook count
                const cardWebhookCount = document.querySelector(`[data-chat-id="${route.id}"] .webhook-count`);
                if (cardWebhookCount) {
                    cardWebhookCount.innerHTML = `📋 ${updatedUrls.length} webhook${updatedUrls.length > 1 ? 's' : ''}`;
                }

                // Cancel add mode
                this.cancelAddWebhook(modal);

                // Show success message
                Swal.fire({
                    title: 'Added!',
                    text: 'Webhook URL added successfully!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                const error = await response.text();
                Swal.fire({
                    title: 'Error!',
                    text: `Failed to add webhook URL: ${error}`,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
                confirmBtn.textContent = '✅';
                confirmBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error adding webhook:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to add webhook URL. Server may be unavailable.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
            const confirmBtn = modal.querySelector('.confirm-add-webhook-btn');
            confirmBtn.textContent = '✅';
            confirmBtn.disabled = false;
        }
    }

    async confirmDeleteWebhook(webhookItem, route, modal) {
        const webhookIndex = parseInt(webhookItem.dataset.index);
        const webhookUrl = route.webhookUrls[webhookIndex];

        // Check if this is the only webhook
        if (route.webhookUrls.length === 1) {
            Swal.fire({
                title: 'Cannot Delete!',
                text: 'Cannot delete the last webhook URL. A route must have at least one webhook.',
                icon: 'warning',
                confirmButtonColor: '#2196F3'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Delete Webhook?',
            html: `
                <p>Are you sure you want to delete this webhook URL?</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: left;">
                    <strong>Chat ID:</strong> ${route.id}<br>
                    <strong>Webhook URL:</strong><br>
                    <code style="word-break: break-all;">${webhookUrl}</code>
                </div>
                <p style="color: #dc3545; font-weight: bold;">This action cannot be undone!</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            focusCancel: true
        });

        if (result.isConfirmed) {
            await this.deleteWebhook(webhookItem, route, modal, webhookIndex);
        }
    }

    async deleteWebhook(webhookItem, route, modal, webhookIndex) {
        try {
            // Show loading toast
            Swal.fire({
                title: 'Deleting...',
                text: 'Please wait while we delete the webhook.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Create updated URLs array without the deleted webhook
            const updatedUrls = route.webhookUrls.filter((_, index) => index !== webhookIndex);

            const response = await fetch(`/routes/${route.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: route.id,
                    target_urls: updatedUrls
                })
            });

            if (response.ok) {
                // Update the route in memory
                route.webhookUrls = updatedUrls;
                if (webhookIndex === 0 && updatedUrls.length > 0) {
                    route.webhookUrl = updatedUrls[0]; // Update primary URL if we deleted the first one
                }

                // Remove the webhook item from the DOM
                webhookItem.remove();

                // Update the webhook count display
                const totalWebhooksElement = modal.querySelector('.route-details p:last-child');
                if (totalWebhooksElement) {
                    totalWebhooksElement.innerHTML = `<strong>Total Webhooks:</strong> ${updatedUrls.length}`;
                }

                // Update the main card if this was the primary URL
                if (webhookIndex === 0 && updatedUrls.length > 0) {
                    this.updateCardDisplay(route.id, updatedUrls[0]);
                }

                // Update the card webhook count
                const cardWebhookCount = document.querySelector(`[data-chat-id="${route.id}"] .webhook-count`);
                if (cardWebhookCount) {
                    cardWebhookCount.innerHTML = `📋 ${updatedUrls.length} webhook${updatedUrls.length > 1 ? 's' : ''}`;
                }

                // Show success message
                Swal.fire({
                    title: 'Deleted!',
                    text: 'The webhook URL has been successfully deleted.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                const error = await response.text();
                Swal.fire({
                    title: 'Error!',
                    text: `Failed to delete webhook URL: ${error}`,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        } catch (error) {
            console.error('Error deleting webhook:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to delete webhook URL. Server may be unavailable.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        }
    }

    enableWebhookEdit(webhookItem) {
        const urlSpan = webhookItem.querySelector('.webhook-url');
        const editInput = webhookItem.querySelector('.webhook-edit-input');
        const editBtn = webhookItem.querySelector('.edit-webhook-btn');
        const deleteBtn = webhookItem.querySelector('.delete-webhook-btn');
        const editControls = webhookItem.querySelector('.webhook-edit-controls');

        urlSpan.style.display = 'none';
        editInput.style.display = 'inline-block';
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        editControls.style.display = 'flex';

        editInput.focus();
        editInput.select();
    }

    cancelWebhookEdit(webhookItem) {
        const urlSpan = webhookItem.querySelector('.webhook-url');
        const editInput = webhookItem.querySelector('.webhook-edit-input');
        const editBtn = webhookItem.querySelector('.edit-webhook-btn');
        const deleteBtn = webhookItem.querySelector('.delete-webhook-btn');
        const editControls = webhookItem.querySelector('.webhook-edit-controls');

        // Reset input to original value
        editInput.value = urlSpan.textContent;

        urlSpan.style.display = 'inline';
        editInput.style.display = 'none';
        editBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        editControls.style.display = 'none';
    }

    async saveWebhookEdit(webhookItem, route, modal) {
        const urlSpan = webhookItem.querySelector('.webhook-url');
        const editInput = webhookItem.querySelector('.webhook-edit-input');
        const newUrl = editInput.value.trim();
        const webhookIndex = parseInt(webhookItem.dataset.index);

        if (!newUrl) {
            Swal.fire({
                title: 'Error!',
                text: 'Webhook URL cannot be empty',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        try {
            // Show loading on save button
            const saveBtn = webhookItem.querySelector('.save-webhook-btn');
            saveBtn.textContent = '⏳';
            saveBtn.disabled = true;

            // Update the webhooks array
            const updatedUrls = [...route.webhookUrls];
            updatedUrls[webhookIndex] = newUrl;

            const response = await fetch(`/routes/${route.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: route.id,
                    target_urls: updatedUrls
                })
            });

            if (response.ok) {
                // Update the route in memory
                route.webhookUrls[webhookIndex] = newUrl;
                if (webhookIndex === 0) {
                    route.webhookUrl = newUrl; // Update primary URL if it's the first one
                }

                // Update the display
                urlSpan.textContent = newUrl;
                urlSpan.title = newUrl;
                
                this.cancelWebhookEdit(webhookItem);
                
                Swal.fire({
                    title: 'Updated!',
                    text: 'Webhook URL updated successfully!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                // Update the main card if this was the primary URL
                if (webhookIndex === 0) {
                    this.updateCardDisplay(route.id, newUrl);
                }
            } else {
                const error = await response.text();
                Swal.fire({
                    title: 'Error!',
                    text: `Failed to update webhook URL: ${error}`,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
                saveBtn.textContent = '✅';
                saveBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error updating webhook URL:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to update webhook URL. Server may be unavailable.',
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
            const saveBtn = webhookItem.querySelector('.save-webhook-btn');
            saveBtn.textContent = '✅';
            saveBtn.disabled = false;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            border-radius: 8px;
            z-index: 2000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    incrementRouteExecution(chatId) {
        // Remove this functionality since we're not tracking executions
        console.log('Execution tracking disabled for:', chatId);
    }

    // Remove auto-refresh to avoid unnecessary API calls
    // startAutoRefresh() method removed

    setupLogger() {
        // Setup logger UI
        const toggleBtn = document.getElementById('toggleLoggerBtn');
        const loggerWindow = document.getElementById('loggerWindow');
        const closeBtn = document.getElementById('closeLoggerBtn');
        const clearBtn = document.getElementById('clearLogsBtn');

        toggleBtn.addEventListener('click', () => {
            if (loggerWindow.classList.contains('hidden')) {
                loggerWindow.classList.remove('hidden');
                toggleBtn.textContent = 'Hide Logger';
                this.connectWebSocket();
            } else {
                loggerWindow.classList.add('hidden');
                toggleBtn.textContent = 'Show Logger';
                this.disconnectWebSocket();
            }
        });

        closeBtn.addEventListener('click', () => {
            loggerWindow.classList.add('hidden');
            toggleBtn.textContent = 'Show Logger';
            this.disconnectWebSocket();
        });

        clearBtn.addEventListener('click', () => {
            const loggerContent = document.getElementById('loggerContent');
            loggerContent.innerHTML = '';
        });

        // Setup dragging functionality
        this.setupLoggerDragging();
    }

    setupLoggerDragging() {
        const loggerWindow = document.getElementById('loggerWindow');
        const loggerHeader = document.querySelector('.logger-header');

        loggerHeader.addEventListener('mousedown', (e) => {
            // Don't start dragging if clicking on buttons
            if (e.target.closest('.logger-controls')) return;

            this.isDragging = true;
            const rect = loggerWindow.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;

            loggerHeader.style.cursor = 'grabbing';
            loggerWindow.style.transition = 'none';
            
            // Prevent text selection while dragging
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            e.preventDefault();
            
            const newX = e.clientX - this.dragOffset.x;
            const newY = e.clientY - this.dragOffset.y;

            // Get window dimensions and logger dimensions
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const loggerRect = loggerWindow.getBoundingClientRect();

            // Calculate boundaries (keep at least 50px visible on each side)
            const minX = -loggerRect.width + 50;
            const maxX = windowWidth - 50;
            const minY = 0;
            const maxY = windowHeight - 50;

            // Constrain position within boundaries
            const constrainedX = Math.max(minX, Math.min(maxX, newX));
            const constrainedY = Math.max(minY, Math.min(maxY, newY));

            loggerWindow.style.left = `${constrainedX}px`;
            loggerWindow.style.top = `${constrainedY}px`;
            loggerWindow.style.right = 'auto';
            loggerWindow.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                loggerHeader.style.cursor = 'grab';
                loggerWindow.style.transition = 'all 0.3s ease';
                document.body.style.userSelect = '';
            }
        });

        // Set initial cursor style
        loggerHeader.style.cursor = 'grab';
    }

    connectWebSocket() {
        if (this.loggerSocket) return;

        // Use the current window's protocol and host (including port)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/logs`;
        
        console.log('Connecting to WebSocket:', wsUrl); // Debug log
        
        this.loggerSocket = new WebSocket(wsUrl);

        this.loggerSocket.onopen = () => {
            this.addLogEntry('WebSocket connected', 'success');
            console.log('WebSocket connected successfully');
        };

        this.loggerSocket.onmessage = (event) => {
            const logData = JSON.parse(event.data);
            this.addLogEntry(logData.message, logData.level, logData.timestamp);
        };

        this.loggerSocket.onclose = (event) => {
            this.addLogEntry(`WebSocket disconnected (Code: ${event.code})`, 'warning');
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.loggerSocket = null;
        };

        this.loggerSocket.onerror = (error) => {
            this.addLogEntry('WebSocket error: ' + error, 'error');
            console.error('WebSocket error:', error);
        };
    }

    disconnectWebSocket() {
        if (this.loggerSocket) {
            this.loggerSocket.close();
            this.loggerSocket = null;
        }
    }

    addLogEntry(message, level = 'info', timestamp = null) {
        const loggerContent = document.getElementById('loggerContent');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${level}`;

        const time = timestamp ? new Date(timestamp) : new Date();
        const timeStr = time.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });

        logEntry.innerHTML = `
            <span class="log-timestamp">[${timeStr}]</span>
            <span class="log-message">${message}</span>
        `;

        loggerContent.appendChild(logEntry);
        loggerContent.scrollTop = loggerContent.scrollHeight;

        // Limit to last 100 log entries
        while (loggerContent.children.length > 100) {
            loggerContent.removeChild(loggerContent.firstChild);
        }
    }
}

// Initialize immediately when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing RoutesManager');
    window.routesManager = new RoutesManager();
});

window.incrementRouteExecution = (chatId) => window.routesManager.incrementRouteExecution(chatId);
