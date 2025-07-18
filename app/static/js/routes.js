class RoutesManager {
    constructor() {
        this.routes = [];
        this.modal = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
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
                            placeholder="e.g., 972523531857">
                    </div>
                    <div class="form-group">
                        <label for="webhookUrl">Webhook URL:</label>
                        <input type="url" id="webhookUrl" name="webhookUrl" required
                            placeholder="https://your-n8n-instance.com/webhook/...">
                    </div>
                    <button type="submit" class="btn btn-primary">Create Route</button>
                    <button type="button" class="btn btn-secondary" onclick="routesManager.hideModal()">Cancel</button>
                </form>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    async handleFormSubmit(form) {
        const formData = new FormData(form);
        const newRoute = {
            chat_id: formData.get('chatId'),
            target_urls: [formData.get('webhookUrl')] // Send as array to match API
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
                this.showNotification('Route created successfully!', 'success');
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
}

// Initialize immediately when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing RoutesManager');
    window.routesManager = new RoutesManager();
});

window.incrementRouteExecution = (chatId) => window.routesManager.incrementRouteExecution(chatId);
