// Expenses Module

// Load expenses data
async function loadExpenses() {
    try {
        showLoading();

        // Load expense summaries
        await loadExpenseSummaries();
        
        // Load recent expenses
        await loadExpensesList();

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error loading expenses:', error);
        showError('Failed to load expenses');
    }
}

// Load expense summaries
async function loadExpenseSummaries() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    try {
        // Get current month expenses
        const expenses = await db.collection('expenses')
            .where('userId', '==', getCurrentUser()?.uid)
            .where('date', '>=', startOfMonth)
            .get();

        let total = 0;
        let pending = 0;
        let reimbursed = 0;

        expenses.forEach(doc => {
            const expense = doc.data();
            total += expense.amount || 0;
            
            if (expense.status === 'pending') {
                pending += expense.amount || 0;
            } else if (expense.status === 'approved') {
                reimbursed += expense.amount || 0;
            }
        });

        document.getElementById('totalExpenses').textContent = formatCurrency(total);
        document.getElementById('pendingExpenses').textContent = formatCurrency(pending);
        document.getElementById('reimbursedExpenses').textContent = formatCurrency(reimbursed);

    } catch (error) {
        console.error('Error loading expense summaries:', error);
    }
}

// Load expenses list
async function loadExpensesList() {
    const listDiv = document.getElementById('expensesList');
    if (!listDiv) return;

    try {
        const expenses = await db.collection('expenses')
            .where('userId', '==', getCurrentUser()?.uid)
            .orderBy('date', 'desc')
            .limit(20)
            .get();

        listDiv.innerHTML = '';

        if (expenses.empty) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h3>No expenses found</h3>
                    <p>Add your first expense to get started</p>
                    <button class="btn btn-primary" onclick="addExpense()">
                        <i class="fas fa-plus"></i> Add Expense
                    </button>
                </div>
            `;
            return;
        }

        expenses.forEach(doc => {
            const expense = doc.data();
            const date = expense.date?.toDate ? formatDate(expense.date.toDate()) : expense.date;
            const statusClass = `status-${expense.status}`;
            const categoryClass = `category-${expense.category}`;

            listDiv.innerHTML += `
                <div class="expense-card" onclick="viewExpense('${doc.id}')">
                    <div class="expense-header">
                        <span class="expense-category ${categoryClass}">${expense.category}</span>
                        <span class="expense-status ${statusClass}">${expense.status}</span>
                    </div>
                    <div class="expense-body">
                        <div class="expense-description">${expense.description || 'No description'}</div>
                        <div class="expense-amount">${formatCurrency(expense.amount, expense.currency)}</div>
                    </div>
                    <div class="expense-footer">
                        <span class="expense-date">
                            <i class="far fa-calendar"></i> ${date}
                        </span>
                        <span class="expense-project">${expense.projectName || 'No project'}</span>
                    </div>
                    ${expense.receiptUrl ? `
                        <div class="expense-receipt" onclick="event.stopPropagation(); viewReceipt('${expense.receiptUrl}')">
                            <i class="fas fa-receipt"></i> View Receipt
                        </div>
                    ` : ''}
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading expenses list:', error);
    }
}

// Add new expense
function addExpense() {
    // Create expense modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add Expense</h3>
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="expenseForm" onsubmit="event.preventDefault(); submitExpense(this)">
                <div class="form-group">
                    <label>Expense Category *</label>
                    <select id="expenseCategory" class="form-control" required>
                        <option value="">Select category</option>
                        <option value="travel">Travel</option>
                        <option value="meals">Meals & Entertainment</option>
                        <option value="office">Office Supplies</option>
                        <option value="equipment">Equipment</option>
                        <option value="software">Software & Subscriptions</option>
                        <option value="transport">Transportation</option>
                        <option value="accommodation">Accommodation</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Amount *</label>
                        <input type="number" id="expenseAmount" class="form-control" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Currency</label>
                        <select id="expenseCurrency" class="form-control">
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" id="expenseDate" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label>Description *</label>
                    <textarea id="expenseDescription" class="form-control" rows="2" required></textarea>
                </div>
                <div class="form-group">
                    <label>Project</label>
                    <select id="expenseProject" class="form-control">
                        <option value="">No project</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Payment Method</label>
                    <select id="expensePaymentMethod" class="form-control">
                        <option value="cash">Cash</option>
                        <option value="credit">Credit Card</option>
                        <option value="debit">Debit Card</option>
                        <option value="company">Company Card</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Receipt</label>
                    <input type="file" id="expenseReceipt" class="form-control" accept="image/*,.pdf">
                    <small class="form-text">Upload receipt (image or PDF)</small>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="expenseNotes" class="form-control" rows="2"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Expense</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Load projects for selector
    loadProjectsForExpense();
}

// Load projects for expense form
async function loadProjectsForExpense() {
    try {
        const projects = await queryDocuments('projects', [
            { field: 'status', operator: '==', value: 'active' }
        ]);

        const select = document.getElementById('expenseProject');
        if (!select) return;

        projects.forEach(project => {
            select.innerHTML += `<option value="${project.id}">${project.name}</option>`;
        });

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Submit expense
async function submitExpense(form) {
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const currency = document.getElementById('expenseCurrency').value;
    const date = document.getElementById('expenseDate').value;
    const description = document.getElementById('expenseDescription').value;
    const projectId = document.getElementById('expenseProject').value;
    const paymentMethod = document.getElementById('expensePaymentMethod').value;
    const notes = document.getElementById('expenseNotes').value;
    const receiptFile = document.getElementById('expenseReceipt').files[0];

    if (!category || !amount || !date || !description) {
        showError('Please fill in all required fields');
        return;
    }

    try {
        showLoading();

        let receiptUrl = null;
        let receiptPath = null;

        // Upload receipt if provided
        if (receiptFile) {
            const storageRef = storage.ref(`expenses/${Date.now()}_${receiptFile.name}`);
            await storageRef.put(receiptFile);
            receiptUrl = await storageRef.getDownloadURL();
            receiptPath = storageRef.fullPath;
        }

        // Get project name if selected
        let projectName = null;
        if (projectId) {
            const project = await getDocument('projects', projectId);
            projectName = project?.name;
        }

        // Create expense record
        await db.collection('expenses').add({
            userId: getCurrentUser()?.uid,
            userName: getCurrentUser()?.displayName || getCurrentUser()?.email,
            category,
            amount,
            currency,
            date: new Date(date),
            description,
            projectId: projectId || null,
            projectName,
            paymentMethod,
            notes,
            receiptUrl,
            receiptPath,
            status: 'pending',
            submittedAt: new Date(),
            company: getCurrentCompany()
        });

        // If project selected, update project spent amount
        if (projectId) {
            const project = await getDocument('projects', projectId);
            if (project) {
                const newSpent = (project.spent || 0) + amount;
                await updateDocument('projects', projectId, { spent: newSpent });
            }
        }

        hideLoading();
        document.querySelector('.modal.active').remove();
        showSuccess('Expense submitted successfully');
        
        // Refresh data
        loadExpenses();

    } catch (error) {
        hideLoading();
        showError('Error submitting expense: ' + error.message);
    }
}

// View expense details
async function viewExpense(expenseId) {
    try {
        const expense = await getDocument('expenses', expenseId);
        if (!expense) return;

        // Create detail modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Expense Details</h3>
                    <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="expense-detail">
                    <div class="detail-row">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value category-${expense.category}">${expense.category}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value amount">${formatCurrency(expense.amount, expense.currency)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${formatDate(expense.date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Description:</span>
                        <span class="detail-value">${expense.description}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Project:</span>
                        <span class="detail-value">${expense.projectName || 'No project'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Method:</span>
                        <span class="detail-value">${expense.paymentMethod}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value status-${expense.status}">${expense.status}</span>
                    </div>
                    ${expense.notes ? `
                        <div class="detail-row">
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">${expense.notes}</span>
                        </div>
                    ` : ''}
                    ${expense.receiptUrl ? `
                        <div class="detail-row">
                            <span class="detail-label">Receipt:</span>
                            <a href="${expense.receiptUrl}" target="_blank" class="btn btn-outline btn-sm">
                                <i class="fas fa-file-pdf"></i> View Receipt
                            </a>
                        </div>
                    ` : ''}
                    ${expense.status === 'pending' ? `
                        <div class="detail-actions" style="margin-top: 20px;">
                            <button class="btn btn-danger" onclick="deleteExpense('${expenseId}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        showError('Error loading expense details');
    }
}

// Delete expense
async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
        showLoading();

        const expense = await getDocument('expenses', expenseId);
        
        // Delete receipt if exists
        if (expense?.receiptPath) {
            await storage.ref(expense.receiptPath).delete();
        }

        // Update project spent amount if applicable
        if (expense?.projectId) {
            const project = await getDocument('projects', expense.projectId);
            if (project) {
                const newSpent = (project.spent || 0) - (expense.amount || 0);
                await updateDocument('projects', expense.projectId, { spent: Math.max(0, newSpent) });
            }
        }

        await deleteDocument('expenses', expenseId);

        hideLoading();
        document.querySelector('.modal.active').remove();
        showSuccess('Expense deleted');
        loadExpenses();

    } catch (error) {
        hideLoading();
        showError('Error deleting expense: ' + error.message);
    }
}

// View receipt
function viewReceipt(url) {
    window.open(url, '_blank');
}

// Export expenses as CSV
async function exportExpenses() {
    try {
        const expenses = await db.collection('expenses')
            .where('userId', '==', getCurrentUser()?.uid)
            .orderBy('date', 'desc')
            .get();

        const data = expenses.docs.map(doc => {
            const e = doc.data();
            return {
                Date: formatDate(e.date),
                Category: e.category,
                Description: e.description,
                Amount: e.amount,
                Currency: e.currency,
                Project: e.projectName || '',
                'Payment Method': e.paymentMethod,
                Status: e.status
            };
        });

        const csv = convertToCSV(data);
        downloadFile(csv, 'expenses.csv', 'text/csv');

    } catch (error) {
        showError('Error exporting expenses: ' + error.message);
    }
}

// Convert to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => obj[header]).join(','));
    
    return [headers.join(','), ...rows].join('\n');
}

// Download file
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Add CSS for expenses module
const expenseStyles = document.createElement('style');
expenseStyles.textContent = `
    .expense-card {
        background: white;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 10px;
        border: 1px solid var(--border);
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .expense-card:hover {
        transform: translateX(5px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }

    .expense-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .expense-category {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .category-travel {
        background: #dbeafe;
        color: #2563eb;
    }

    .category-meals {
        background: #fef3c7;
        color: #d97706;
    }

    .category-office {
        background: #d1fae5;
        color: #059669;
    }

    .category-equipment {
        background: #e0e7ff;
        color: #4f46e5;
    }

    .category-software {
        background: #f3e8ff;
        color: #9333ea;
    }

    .category-transport {
        background: #fee2e2;
        color: #dc2626;
    }

    .category-accommodation {
        background: #cffafe;
        color: #0891b2;
    }

    .category-other {
        background: #e5e7eb;
        color: #4b5563;
    }

    .expense-status {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .status-pending {
        background: #fef3c7;
        color: #d97706;
    }

    .status-approved {
        background: #d1fae5;
        color: #059669;
    }

    .status-rejected {
        background: #fee2e2;
        color: #dc2626;
    }

    .expense-body {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .expense-description {
        font-size: 14px;
        color: var(--dark);
    }

    .expense-amount {
        font-size: 18px;
        font-weight: 600;
        color: var(--primary);
    }

    .expense-footer {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--gray);
    }

    .expense-receipt {
        margin-top: 10px;
        padding: 8px;
        background: var(--light);
        border-radius: 8px;
        text-align: center;
        font-size: 12px;
        color: var(--primary);
        cursor: pointer;
    }

    .expense-receipt:hover {
        background: #e5e7eb;
    }

    .expense-detail {
        padding: 10px;
    }

    .detail-row {
        display: flex;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
    }

    .detail-label {
        width: 120px;
        font-weight: 600;
        color: var(--gray);
    }

    .detail-value {
        flex: 1;
    }

    .detail-value.amount {
        font-size: 18px;
        font-weight: 600;
        color: var(--primary);
    }

    .form-text {
        font-size: 11px;
        color: var(--gray);
        margin-top: 5px;
        display: block;
    }
`;
document.head.appendChild(expenseStyles);

// Export expense functions
window.loadExpenses = loadExpenses;
window.addExpense = addExpense;
window.submitExpense = submitExpense;
window.viewExpense = viewExpense;
window.deleteExpense = deleteExpense;
window.viewReceipt = viewReceipt;
window.exportExpenses = exportExpenses;
