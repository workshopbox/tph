// ==========================================
// TPH CALCULATOR - MAIN APPLICATION
// ==========================================

class TPHCalculator {
    constructor() {
        this.data = {
            alpx: null,
            table: null,
            activities: [],
            weeklyVolume: 169000,
            currentTPH: 10.5,
            newTPH: 11.8,
            scenarios: []
        };

        this.rates = {
            picking: [
                { name: 'DSP Delivery', rate: 790, unit: 'packages/hour', category: 'picking' },
                { name: 'Picker', rate: 850, unit: 'packages/hour', category: 'picking' },
                { name: 'Pick Stage', rate: 920, unit: 'packages/hour', category: 'picking' },
                { name: 'Problem Solver', rate: 450, unit: 'issues/hour', category: 'picking' },
                { name: 'Water Spider', rate: 380, unit: 'trips/hour', category: 'picking' },
                { name: 'Ambassador', rate: 0, unit: 'fixed hours', category: 'picking' },
                { name: 'New Hire Training', rate: 0, unit: 'fixed hours', category: 'picking' },
                { name: 'Bag Replenishment', rate: 650, unit: 'bags/hour', category: 'picking' }
            ],
            sorting: [
                { name: 'Sorter', rate: 1200, unit: 'packages/hour', category: 'sorting' },
                { name: 'Diverter', rate: 1500, unit: 'packages/hour', category: 'sorting' },
                { name: 'Inductor', rate: 1400, unit: 'packages/hour', category: 'sorting' },
                { name: 'Straightener', rate: 1350, unit: 'packages/hour', category: 'sorting' },
                { name: 'Jam Clearer', rate: 800, unit: 'jams/hour', category: 'sorting' },
                { name: 'Quality Check', rate: 950, unit: 'packages/hour', category: 'sorting' }
            ],
            loading: [
                { name: 'Loader', rate: 680, unit: 'packages/hour', category: 'loading' },
                { name: 'Pusher', rate: 720, unit: 'packages/hour', category: 'loading' },
                { name: 'Labeler', rate: 850, unit: 'labels/hour', category: 'loading' },
                { name: 'UTR Dispatch', rate: 45, unit: 'routes/hour', category: 'loading' },
                { name: 'RTS', rate: 620, unit: 'packages/hour', category: 'loading' }
            ],
            support: [
                { name: 'OTR Supervisor', rate: 0, unit: 'fixed 7.75h', category: 'support' },
                { name: 'OTR Support', rate: 0, unit: 'fixed 7.5h', category: 'support' },
                { name: 'Ops Supervisor', rate: 0, unit: 'fixed 8h', category: 'support' },
                { name: 'Yard Marshal', rate: 0, unit: 'fixed hours', category: 'support' }
            ]
        };

        this.charts = {};
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadSampleData();
        this.initializeCharts();
        this.renderDashboard();
        this.renderRates();
    }

    // ==========================================
    // NAVIGATION
    // ==========================================

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const views = document.querySelectorAll('.view');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // Remove active class from all
                navItems.forEach(nav => nav.classList.remove('active'));
                views.forEach(view => view.classList.remove('active'));

                // Add active class to clicked
                item.classList.add('active');
                const viewId = item.dataset.view + '-view';
                document.getElementById(viewId).classList.add('active');

                // Update header
                const titles = {
                    'dashboard': { title: 'Dashboard', subtitle: 'Real-time TPH analytics and forecasting' },
                    'calculator': { title: 'TPH Calculator', subtitle: 'Import data and calculate optimization' },
                    'scenarios': { title: 'Scenarios', subtitle: 'Compare and analyze different planning scenarios' },
                    'rates': { title: 'Rates Manager', subtitle: 'Manage performance rates and standards' }
                };

                const title = titles[item.dataset.view];
                document.getElementById('view-title').textContent = title.title;
                document.getElementById('view-subtitle').textContent = title.subtitle;
            });
        });
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    setupEventListeners() {
        // Import button
        document.getElementById('import-btn').addEventListener('click', () => {
            this.openImportModal();
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportResults();
        });

        // Modal
        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.closeImportModal();
        });

        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeImportModal();
        });

        document.getElementById('modal-import').addEventListener('click', () => {
            this.importFiles();
        });

        // File uploads
        this.setupFileUpload('modal-file-alpx', 'drop-zone-alpx');
        this.setupFileUpload('modal-file-table', 'drop-zone-table');

        // Calculator uploads
        this.setupCalculatorUploads();

        // Calculate button
        document.getElementById('calculate-btn')?.addEventListener('click', () => {
            this.calculateTPH();
        });

        // Add activity button
        document.getElementById('add-activity-btn')?.addEventListener('click', () => {
            this.addActivity();
        });
    }

    setupFileUpload(inputId, zoneId) {
        const input = document.getElementById(inputId);
        const zone = document.getElementById(zoneId);

        if (!input || !zone) return;

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file, zoneId);
            }
        });

        // Drag and drop
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('active');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('active');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('active');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                this.handleFileUpload(file, zoneId);
            }
        });
    }

    setupCalculatorUploads() {
        const uploadCards = document.querySelectorAll('.upload-card');
        uploadCards.forEach(card => {
            card.addEventListener('click', () => {
                const fileInput = card.querySelector('input[type="file"]');
                if (fileInput) {
                    fileInput.click();
                }
            });

            const fileInput = card.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.handleCalculatorFileUpload(file, card);
                    }
                });
            }
        });
    }

    // ==========================================
    // FILE HANDLING
    // ==========================================

    handleFileUpload(file, zoneId) {
        const zone = document.getElementById(zoneId);

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                if (zoneId.includes('alpx')) {
                    this.data.alpx = results.data;
                } else {
                    this.data.table = results.data;
                }

                zone.classList.add('uploaded');
                const p = zone.querySelector('p');
                p.textContent = `✓ ${file.name} uploaded successfully`;
                p.style.color = 'var(--success)';

                this.showToast('Success', `${file.name} uploaded successfully`, 'success');
            },
            error: (error) => {
                this.showToast('Error', `Failed to parse ${file.name}`, 'error');
                console.error(error);
            }
        });
    }

    handleCalculatorFileUpload(file, card) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                if (file.name.includes('alpx')) {
                    this.data.alpx = results.data;
                } else {
                    this.data.table = results.data;
                }

                card.classList.add('uploaded');
                const p = card.querySelector('p');
                p.textContent = `✓ Uploaded successfully`;
                p.style.color = 'var(--success)';

                this.showToast('Success', `${file.name} uploaded successfully`, 'success');

                // Show table if both files uploaded
                if (this.data.alpx && this.data.table) {
                    this.processData();
                    this.showCalculatorTable();
                }
            },
            error: (error) => {
                this.showToast('Error', `Failed to parse ${file.name}`, 'error');
                console.error(error);
            }
        });
    }

    processData() {
        if (!this.data.alpx || !this.data.table) return;

        // Extract activities from alpx data
        const activitiesMap = new Map();

        this.data.alpx.forEach(row => {
            if (row.metric_name === 'needed_hours' && row.activity && row.cycle) {
                const key = `${row.activity}_${row.cycle}`;
                if (!activitiesMap.has(key)) {
                    // Get date columns (daily columns)
                    const dateCols = Object.keys(row).filter(col => col.includes('daily'));
                    const hours = dateCols.slice(0, 7).map(col => row[col] || 0);

                    activitiesMap.set(key, {
                        activity: row.activity,
                        cycle: row.cycle,
                        subActivity: row.activity,
                        rate: this.getDefaultRate(row.activity),
                        hours: hours
                    });
                }
            }
        });

        this.data.activities = Array.from(activitiesMap.values());
        this.showToast('Success', `Processed ${this.data.activities.length} activities`, 'success');
    }

    getDefaultRate(activity) {
        const rateMap = {
            'pick_stage': 850,
            'sort': 1200,
            'rts': 620,
            'area_readiness': 0
        };
        return rateMap[activity] || 0;
    }

    // ==========================================
    // MODAL MANAGEMENT
    // ==========================================

    openImportModal() {
        document.getElementById('import-modal').classList.add('active');
    }

    closeImportModal() {
        document.getElementById('import-modal').classList.remove('active');
    }

    importFiles() {
        if (this.data.alpx && this.data.table) {
            this.processData();
            this.calculateTPH();
            this.renderDashboard();
            this.closeImportModal();
            this.showToast('Success', 'Data imported and calculated successfully', 'success');
        } else {
            this.showToast('Error', 'Please upload both CSV files', 'error');
        }
    }

    // ==========================================
    // DATA & CALCULATIONS
    // ==========================================

    loadSampleData() {
        // Sample activity data for demo
        this.data.activities = [
            { activity: 'pick_stage', cycle: 'cycle_1', subActivity: 'DSP', rate: 790, hours: [42.99, 37.87, 37.12, 36.36, 35.04, 27.64, 0], currentHours: 217.04 },
            { activity: 'pick_stage', cycle: 'cycle_1', subActivity: 'Ambassador', rate: 0, hours: [2.67, 2.67, 0, 0, 0, 0, 0], currentHours: 5.34 },
            { activity: 'pick_stage', cycle: 'cycle_1', subActivity: 'New Hire', rate: 0, hours: [4.40, 4.38, 4.36, 0, 0, 0, 0], currentHours: 13.14 },
            { activity: 'area_readiness', cycle: 'tier_3', subActivity: 'Bag Replenishment', rate: 650, hours: [9.18, 8.09, 7.93, 7.76, 7.48, 5.34, 0], currentHours: 45.78 },
            { activity: 'sort', cycle: 'cycle_1', subActivity: 'Sorter', rate: 1200, hours: [35.50, 32.20, 31.80, 30.90, 29.50, 22.10, 0], currentHours: 182.00 },
            { activity: 'sort', cycle: 'cycle_4', subActivity: 'Sorter', rate: 1150, hours: [28.40, 25.70, 24.90, 24.30, 23.20, 18.50, 0], currentHours: 145.00 },
            { activity: 'otr', cycle: 'tier_3', subActivity: 'OTR Supervisor', rate: 0, hours: [7.75, 7.75, 7.75, 7.75, 7.75, 0, 0], currentHours: 38.75 },
            { activity: 'otr', cycle: 'tier_3', subActivity: 'OTR Support', rate: 0, hours: [7.50, 7.50, 7.50, 7.50, 7.50, 0, 0], currentHours: 37.50 },
            { activity: 'loading', cycle: 'cycle_1', subActivity: 'Loader', rate: 680, hours: [24.85, 22.50, 21.90, 21.30, 20.40, 15.80, 0], currentHours: 126.75 },
            { activity: 'rts', cycle: 'tier_3', subActivity: 'RTS', rate: 620, hours: [18.20, 16.50, 16.00, 15.60, 14.90, 11.50, 0], currentHours: 92.70 }
        ];
    }

    calculateTPH() {
        const totalCurrentHours = this.data.activities.reduce((sum, act) => {
            const hours = act.hours ? act.hours.reduce((a, b) => a + b, 0) : act.currentHours || 0;
            return sum + hours;
        }, 0);

        // Simulate optimization (10-15% improvement)
        const optimizationFactor = 0.12;
        const totalNewHours = totalCurrentHours * (1 - optimizationFactor);

        this.data.currentTPH = this.data.weeklyVolume / totalCurrentHours;
        this.data.newTPH = this.data.weeklyVolume / totalNewHours;
        this.data.hoursSaved = totalCurrentHours - totalNewHours;

        this.updateKPIs();
        this.updateCharts();
        this.showToast('Success', 'TPH calculated successfully', 'success');
    }

    updateKPIs() {
        document.getElementById('current-tph').textContent = this.data.currentTPH.toFixed(1);
        document.getElementById('new-tph').textContent = this.data.newTPH.toFixed(1);
        document.getElementById('weekly-volume').textContent = (this.data.weeklyVolume / 1000).toFixed(0) + 'K';
        document.getElementById('hours-saved').textContent = Math.round(this.data.hoursSaved);
    }

    // ==========================================
    // CHARTS
    // ==========================================

    initializeCharts() {
        this.initTPHChart();
        this.initActivityChart();
    }

    initTPHChart() {
        const ctx = document.getElementById('tph-chart');
        if (!ctx) return;

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        this.charts.tph = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 44', 'Week 45', 'Week 46', 'Week 47', 'Week 48', 'Week 49', 'Week 50'],
                datasets: [
                    {
                        label: 'Current TPH',
                        data: [9.8, 10.1, 10.3, 10.2, 10.4, 10.5, 10.5],
                        borderColor: 'rgb(156, 163, 175)',
                        backgroundColor: 'rgba(156, 163, 175, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Optimized TPH',
                        data: [11.0, 11.3, 11.5, 11.4, 11.6, 11.8, 11.8],
                        borderColor: 'rgb(99, 102, 241)',
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { weight: '600' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: '600' },
                        bodyFont: { size: 13 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 9,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 12 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 12 } }
                    }
                }
            }
        });
    }

    initActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;

        this.charts.activity = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Picking', 'Sorting', 'Loading', 'Support', 'Other'],
                datasets: [{
                    data: [35, 28, 18, 12, 7],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(156, 163, 175, 0.8)'
                    ],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: { size: 13, weight: '600' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                return ` ${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateCharts() {
        if (this.charts.tph) {
            const lastValue = this.data.newTPH.toFixed(1);
            this.charts.tph.data.datasets[1].data[6] = parseFloat(lastValue);
            this.charts.tph.update();
        }
    }

    // ==========================================
    // DASHBOARD RENDERING
    // ==========================================

    renderDashboard() {
        const tbody = document.getElementById('dashboard-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Sort by hours (descending)
        const sortedActivities = [...this.data.activities]
            .sort((a, b) => {
                const aHours = a.hours ? a.hours.reduce((sum, h) => sum + h, 0) : a.currentHours;
                const bHours = b.hours ? b.hours.reduce((sum, h) => sum + h, 0) : b.currentHours;
                return bHours - aHours;
            })
            .slice(0, 10);

        sortedActivities.forEach(activity => {
            const currentHours = activity.hours ?
                activity.hours.reduce((sum, h) => sum + h, 0) :
                activity.currentHours;
            const optimizedHours = currentHours * 0.88; // 12% improvement
            const savings = currentHours - optimizedHours;
            const impact = savings > 20 ? 'high' : savings > 10 ? 'medium' : 'low';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${this.formatActivityName(activity.activity)}</strong></td>
                <td><span style="color: var(--gray-500);">${activity.cycle}</span></td>
                <td>${currentHours.toFixed(1)}</td>
                <td>${optimizedHours.toFixed(1)}</td>
                <td style="color: var(--success); font-weight: 600;">-${savings.toFixed(1)}h</td>
                <td><span class="impact-badge ${impact}">${impact.toUpperCase()}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    formatActivityName(activity) {
        return activity
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // ==========================================
    // CALCULATOR TABLE
    // ==========================================

    showCalculatorTable() {
        const container = document.getElementById('calculator-table-container');
        if (container) {
            container.style.display = 'block';
            this.renderCalculatorTable();
        }
    }

    renderCalculatorTable() {
        const tbody = document.getElementById('calculator-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.data.activities.forEach((activity, index) => {
            const row = document.createElement('tr');
            const totalHours = activity.hours ? activity.hours.reduce((sum, h) => sum + h, 0) : 0;

            row.innerHTML = `
                <td contenteditable="true" data-field="activity" data-index="${index}">${this.formatActivityName(activity.activity)}</td>
                <td contenteditable="true" data-field="cycle" data-index="${index}">${activity.cycle}</td>
                <td contenteditable="true" data-field="subActivity" data-index="${index}">${activity.subActivity}</td>
                <td contenteditable="true" data-field="rate" data-index="${index}">${activity.rate || '-'}</td>
                ${activity.hours.map((h, i) => `<td contenteditable="true" class="date-col" data-field="hours" data-index="${index}" data-day="${i}">${h.toFixed(2)}</td>`).join('')}
                <td><strong>${totalHours.toFixed(2)}</strong></td>
                <td>
                    <button class="btn-icon" onclick="app.deleteActivity(${index})" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.setupTableEditing();
    }

    setupTableEditing() {
        const cells = document.querySelectorAll('[contenteditable="true"]');

        cells.forEach(cell => {
            cell.addEventListener('blur', (e) => {
                const field = cell.dataset.field;
                const index = parseInt(cell.dataset.index);
                const value = cell.textContent.trim();

                if (field === 'hours') {
                    const day = parseInt(cell.dataset.day);
                    this.data.activities[index].hours[day] = parseFloat(value) || 0;
                } else if (field === 'rate') {
                    this.data.activities[index].rate = parseFloat(value) || 0;
                } else {
                    this.data.activities[index][field] = value;
                }

                this.renderCalculatorTable();
            });
        });
    }

    addActivity() {
        this.data.activities.push({
            activity: 'new_activity',
            cycle: 'cycle_1',
            subActivity: 'New Activity',
            rate: 0,
            hours: [0, 0, 0, 0, 0, 0, 0]
        });
        this.renderCalculatorTable();
        this.showToast('Success', 'Activity added', 'success');
    }

    deleteActivity(index) {
        this.data.activities.splice(index, 1);
        this.renderCalculatorTable();
        this.showToast('Success', 'Activity deleted', 'success');
    }

    // ==========================================
    // RATES MANAGER
    // ==========================================

    renderRates() {
        const grid = document.getElementById('rates-grid');
        if (!grid) return;

        grid.innerHTML = '';

        // Get current category (default to picking)
        const activeCategory = document.querySelector('.rates-menu-item.active')?.dataset.category || 'picking';
        const rates = this.rates[activeCategory] || this.rates.picking;

        rates.forEach((rate, index) => {
            const card = document.createElement('div');
            card.className = 'rate-card';
            card.innerHTML = `
                <div class="rate-card-header">
                    <h4>${rate.name}</h4>
                    <button class="btn-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="12" cy="5" r="1"/>
                            <circle cx="12" cy="19" r="1"/>
                        </svg>
                    </button>
                </div>
                <div class="rate-value">${rate.rate}</div>
                <div class="rate-unit">${rate.unit}</div>
                <div class="rate-actions">
                    <button class="btn btn-secondary">Edit</button>
                    <button class="btn btn-outline">History</button>
                </div>
            `;
            grid.appendChild(card);
        });

        this.setupRatesNavigation();
    }

    setupRatesNavigation() {
        const menuItems = document.querySelectorAll('.rates-menu-item');

        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                menuItems.forEach(mi => mi.classList.remove('active'));
                item.classList.add('active');

                const category = item.dataset.category;
                const titles = {
                    'picking': 'Picking & Staging Rates',
                    'sorting': 'Sorting & Diverting Rates',
                    'loading': 'Loading & Dispatch Rates',
                    'support': 'Support & Admin Rates'
                };

                document.querySelector('.rates-header h3').textContent = titles[category];
                this.renderRates();
            });
        });
    }

    // ==========================================
    // EXPORT
    // ==========================================

    exportResults() {
        const data = {
            weeklyVolume: this.data.weeklyVolume,
            currentTPH: this.data.currentTPH,
            newTPH: this.data.newTPH,
            hoursSaved: this.data.hoursSaved,
            activities: this.data.activities,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tph-results-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Success', 'Results exported successfully', 'success');
    }

    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================

    showToast(title, message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
            error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// ==========================================
// INITIALIZE APPLICATION
// ==========================================

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new TPHCalculator();
    console.log('TPH Calculator initialized successfully! 🚀');
});