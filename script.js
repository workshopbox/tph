// Activity Configuration
const ACTIVITY_STRUCTURE = {
    'area_readiness': [
        { name: 'AMBASSADOR_HOURS', rate: null, method: 'headcount' },
        { name: 'NEW_HIRE_NONPRODUCTIVE_HOURS', rate: null, method: 'fixed' },
        { name: 'Stow Bag Replenishment', rate: null, method: 'fixed' }
    ],
    'otr': [
        { name: 'OTR Supervisor', rate: null, method: 'fixed' },
        { name: 'OTR Support', rate: null, method: 'fixed' }
    ],
    'pick_stage': [
        { name: 'AMBASSADOR_HOURS', rate: null, method: 'headcount' },
        { name: 'DSP', rate: 790, method: 'packages_hour' },
        { name: 'NEW_HIRE_NONPRODUCTIVE_HOURS', rate: null, method: 'fixed' },
        { name: 'Pick Problem Solve', rate: 8703, method: 'packages_hour' }
    ],
    'rts': [
        { name: 'RTS', rate: null, method: 'fixed' }
    ],
    'sort': [
        { name: 'ADTA Container Building', rate: 335, method: 'packages_hour' },
        { name: 'AMBASSADOR_HOURS', rate: null, method: 'headcount' },
        { name: 'ASML Induct Loader', rate: 1400, method: 'packages_hour' },
        { name: 'ASML Pusher', rate: 1400, method: 'packages_hour' },
        { name: 'Auto Divert Straightener', rate: 2800, method: 'packages_hour' },
        { name: 'Diverter', rate: 2400, method: 'packages_hour' },
        { name: 'Inbound Dock W/S', rate: 2400, method: 'packages_hour' },
        { name: 'Labeler', rate: 1400, method: 'packages_hour' },
        { name: 'NEW_HIRE_NONPRODUCTIVE_HOURS', rate: null, method: 'fixed' },
        { name: 'Non Con Manual Handling', rate: 3450, method: 'packages_hour' },
        { name: 'Pick to Buffer', rate: null, method: 'fixed' },
        { name: 'container building', rate: null, method: 'fixed' },
        { name: 'sort problem solve', rate: 1950, method: 'packages_hour' }
    ],
    'trainer': [
        { name: 'Training', rate: null, method: 'fixed' }
    ],
    'utr_ops': [
        { name: 'UTR Ops Supervisor', rate: null, method: 'fixed' }
    ],
    'yard_marshall': [
        { name: 'Yard Marshall', rate: null, method: 'fixed' }
    ]
};

class HorizonFlow {
    constructor() {
        this.data = {
            alpx: null,
            table: null,
            activities: [],
            target: 11.5,
            viewMode: 'weekly',
            availableWeeks: [],
            availableDates: [],
            currentWeek: null,
            currentDate: null,
            currentVolume: 0,
            currentColumn: null
        };
        this.init();
    }

    init() {
        document.getElementById('file-alpx').addEventListener('change', (e) => this.handleFile(e, 'alpx'));
        document.getElementById('file-table').addEventListener('change', (e) => this.handleFile(e, 'table'));
        document.getElementById('import-btn').addEventListener('click', () => this.process());
        
        // Volume input debounce
        document.getElementById('volume-input').addEventListener('change', () => this.recalculate());
    }

    handleFile(e, type) {
        const file = e.target.files[0];
        if (!file) return;

        // UI Feedback
        document.getElementById('dot-' + type).classList.add('active');
        const box = document.getElementById('box-' + type);
        box.querySelector('.file-name').textContent = file.name.substring(0, 18) + '...';

        Papa.parse(file, {
            header: true,
            delimiter: ';',
            dynamicTyping: true,
            complete: (results) => {
                this.data[type] = results.data;
                if (this.data.alpx && this.data.table) {
                    document.getElementById('import-btn').disabled = false;
                    document.getElementById('import-btn').textContent = "Process Data Analysis";
                    document.getElementById('import-btn').classList.add('pulse');
                }
            },
            error: (error) => {
                console.error('Parse error:', error);
                alert('Error parsing CSV');
            }
        });
    }

    process() {
        document.getElementById('loading').classList.add('active');
        
        setTimeout(() => {
            try {
                const columns = Object.keys(this.data.alpx[0]);
                
                // Extract Weeks
                const weeklyColumns = columns.filter(col => col.includes('weekly'));
                this.data.availableWeeks = weeklyColumns.map(col => {
                    const parts = col.split('_');
                    return { week: parts[0], date: parts[2], column: col };
                });
                
                // Extract Dates
                const dailyColumns = columns.filter(col => col.includes('daily'));
                const datesByWeek = {};
                dailyColumns.forEach(col => {
                    const parts = col.split('_');
                    const week = parts[0];
                    const date = parts[2];
                    if (!datesByWeek[week]) datesByWeek[week] = [];
                    datesByWeek[week].push({ date, column: col, week });
                });
                
                this.data.availableDates = [];
                Object.values(datesByWeek).forEach(dates => this.data.availableDates.push(...dates));
                
                this.populateSelectors();
                
                // Initialize View
                this.data.currentWeek = this.data.availableWeeks[0];
                this.loadWeek();
                
                // Reveal UI
                document.getElementById('loading').classList.remove('active');
                document.getElementById('empty-state').style.display = 'none';
                document.getElementById('app-interface').style.display = 'block';
                
                // Sidebar Transition
                const contextSel = document.getElementById('context-selector');
                contextSel.style.display = 'block';
                setTimeout(() => contextSel.style.opacity = '1', 100);

            } catch (error) {
                document.getElementById('loading').classList.remove('active');
                alert('Error processing: ' + error.message);
                console.error(error);
            }
        }, 800);
    }

    populateSelectors() {
        const weekSelect = document.getElementById('week-select');
        weekSelect.innerHTML = '';
        this.data.availableWeeks.forEach((week, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `W${week.week} - ${this.formatDate(week.date)}`;
            weekSelect.appendChild(option);
        });
        
        const dateSelect = document.getElementById('date-select');
        dateSelect.innerHTML = '';
        this.data.availableDates.forEach((dateObj, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${this.formatDate(dateObj.date)} (W${dateObj.week})`;
            dateSelect.appendChild(option);
        });
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    changeViewMode(mode) {
        this.data.viewMode = mode;
        const buttons = document.querySelectorAll('.toggle-btn');
        buttons.forEach(b => b.classList.remove('active'));
        document.querySelector(`.toggle-btn[data-mode="${mode}"]`).classList.add('active');

        if (mode === 'weekly') {
            document.getElementById('week-select').style.display = 'block';
            document.getElementById('date-select').style.display = 'none';
            this.loadWeek();
        } else {
            document.getElementById('week-select').style.display = 'none';
            document.getElementById('date-select').style.display = 'block';
            this.loadDate();
        }
    }

    loadWeek() {
        const weekIndex = parseInt(document.getElementById('week-select').value);
        this.data.currentWeek = this.data.availableWeeks[weekIndex];
        this.data.currentColumn = this.data.currentWeek.column;
        this.updateHeader(`Week ${this.data.currentWeek.week} (${this.formatDate(this.data.currentWeek.date)})`);
        this.loadData();
    }

    loadDate() {
        const dateIndex = parseInt(document.getElementById('date-select').value);
        this.data.currentDate = this.data.availableDates[dateIndex];
        this.data.currentColumn = this.data.currentDate.column;
        this.updateHeader(`${this.formatDate(this.data.currentDate.date)} (Week ${this.data.currentDate.week})`);
        this.loadData();
    }

    updateHeader(text) {
        document.getElementById('current-period-display').textContent = text;
    }

    loadData() {
        // Volume
        const volumeRow = this.data.alpx.find(row => row.metric_name === 'volume' && row.activity === 'total');
        if (volumeRow) {
            this.data.currentVolume = volumeRow[this.data.currentColumn] || 0;
            document.getElementById('volume-input').value = this.data.currentVolume;
        }
        
        // Process Activities
        const needed = this.data.alpx.filter(row => row.metric_name === 'needed_hours' && row.activity !== 'total' && row.cycle !== 'total');
        const activityHours = {};
        needed.forEach(row => {
            activityHours[row.activity] = (activityHours[row.activity] || 0) + (row[this.data.currentColumn] || 0);
        });
        
        this.data.activities = [];
        Object.keys(ACTIVITY_STRUCTURE).forEach(mainActivity => {
            const totalHours = activityHours[mainActivity] || 0;
            const subs = ACTIVITY_STRUCTURE[mainActivity];
            const hoursPerSub = totalHours / subs.length;
            
            subs.forEach(sub => {
                this.data.activities.push({
                    activity: mainActivity,
                    subActivity: sub.name,
                    method: sub.method,
                    currentRate: sub.rate || 0,
                    newRate: sub.rate || 0,
                    currentHours: hoursPerSub,
                    newHours: hoursPerSub,
                    shifts: sub.method === 'headcount' ? [{ hc: 0, hours: 5.0 }] : [],
                    isModified: false
                });
            });
        });
        
        this.renderTable();
        this.calculate();
    }

    renderTable() {
        const tbody = document.getElementById('tbody');
        tbody.innerHTML = '';
        
        this.data.activities.forEach((act, i) => {
            const row = document.createElement('tr');
            if (act.subActivity.includes('AMBASSADOR')) row.classList.add('row-ambassador');
            
            let configHTML = '';
            if (act.method === 'headcount') {
                configHTML = '<div class="shift-wrapper">';
                act.shifts.forEach((shift, si) => {
                    configHTML += `
                        <div class="shift-tag">
                            <input type="number" value="${shift.hc}" onchange="app.updateShiftHC(${i}, ${si}, this.value)" min="0">
                            <span>×</span>
                            <select onchange="app.updateShiftHours(${i}, ${si}, this.value)">
                                <option value="7.30" ${shift.hours === 7.30 ? 'selected' : ''}>7.3</option>
                                <option value="7.00" ${shift.hours === 7.00 ? 'selected' : ''}>7.0</option>
                                <option value="5.00" ${shift.hours === 5.00 ? 'selected' : ''}>5.0</option>
                            </select>
                            ${act.shifts.length > 1 ? `<button class="btn-mini" onclick="app.removeShift(${i}, ${si})">×</button>` : ''}
                        </div>
                    `;
                });
                configHTML += `<button class="btn-add-shift" onclick="app.addShift(${i})">+ Add</button></div>`;
            } else {
                configHTML = `<input type="number" class="rate-input" value="${act.newRate}" onchange="app.updateRate(${i}, this.value)" min="0">`;
            }
            
            row.innerHTML = `
                <td><strong>${act.activity}</strong></td>
                <td>${act.subActivity}</td>
                <td>
                    <select onchange="app.updateMethod(${i}, this.value)">
                        <option value="packages_hour" ${act.method === 'packages_hour' ? 'selected' : ''}>Pkg/Hr</option>
                        <option value="headcount" ${act.method === 'headcount' ? 'selected' : ''}>Headcount</option>
                        <option value="fixed" ${act.method === 'fixed' ? 'selected' : ''}>Fixed</option>
                    </select>
                </td>
                <td>
                    <input type="number" class="rate-input" value="${act.currentRate}" 
                           onchange="app.updateCurrentRate(${i}, this.value)" min="0">
                </td>
                <td>${configHTML}</td>
                <td class="text-right">${act.currentHours.toFixed(1)}</td>
                <td class="text-right"><strong>${act.newHours.toFixed(1)}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }

    // --- State Updates ---
    addShift(i) {
        this.data.activities[i].shifts.push({ hc: 0, hours: 5.0 });
        this.data.activities[i].isModified = true;
        this.renderTable();
        this.calculate();
    }

    removeShift(i, si) {
        this.data.activities[i].shifts.splice(si, 1);
        this.data.activities[i].isModified = true;
        this.renderTable();
        this.calculate();
    }

    updateShiftHC(i, si, val) {
        this.data.activities[i].shifts[si].hc = parseFloat(val) || 0;
        this.data.activities[i].isModified = true;
        this.calculate();
    }

    updateShiftHours(i, si, val) {
        this.data.activities[i].shifts[si].hours = parseFloat(val);
        this.data.activities[i].isModified = true;
        this.calculate();
    }

    updateMethod(i, method) {
        this.data.activities[i].method = method;
        this.data.activities[i].isModified = true;
        this.data.activities[i].shifts = method === 'headcount' ? [{ hc: 0, hours: 5.0 }] : [];
        this.renderTable();
        this.calculate();
    }

    updateCurrentRate(i, val) {
        this.data.activities[i].currentRate = parseFloat(val) || 0;
        this.data.activities[i].isModified = true;
        this.calculate();
    }

    updateRate(i, val) {
        this.data.activities[i].newRate = parseFloat(val) || 0;
        this.data.activities[i].isModified = true;
        this.calculate();
    }

    recalculate() {
        this.data.currentVolume = parseFloat(document.getElementById('volume-input').value) || 0;
        this.calculate();
    }
    
    updateTarget() {
        this.data.target = parseFloat(document.getElementById('target-input').value) || 11.5;
        this.calculate();
    }

    // --- Core Logic ---
    calculate() {
        // Calculate CURRENT
        this.data.activities.forEach(act => {
            if (act.method === 'packages_hour' && act.currentRate > 0) {
                act.currentHours = this.data.currentVolume / act.currentRate;
            }
        });
        
        const totalCurrent = this.data.activities.reduce((s, a) => s + a.currentHours, 0);
        
        // Calculate NEW
        this.data.activities.forEach(act => {
            if (!act.isModified) {
                act.newHours = act.currentHours;
            } else {
                if (act.method === 'packages_hour' && act.newRate > 0) {
                    act.newHours = this.data.currentVolume / act.newRate;
                } else if (act.method === 'headcount') {
                    act.newHours = act.shifts.reduce((sum, s) => sum + (s.hc * s.hours), 0);
                } else {
                    act.newHours = act.currentHours;
                }
            }
        });
        
        const totalNew = this.data.activities.reduce((s, a) => s + a.newHours, 0);
        
        // Metrics
        const currentTPH = totalCurrent > 0 ? this.data.currentVolume / totalCurrent : 0;
        const newTPH = totalNew > 0 ? this.data.currentVolume / totalNew : 0;
        const improvement = currentTPH > 0 ? ((newTPH - currentTPH) / currentTPH) * 100 : 0;
        const saved = totalCurrent - totalNew;
        const cost = Math.round(saved * 25); // Assumed cost

        // Update DOM
        this.updateMetric('current-tph', currentTPH.toFixed(2));
        this.updateMetric('new-tph', newTPH.toFixed(2));
        this.updateMetric('hours-saved', `${Math.round(saved)} Hrs Saved`);
        this.updateMetric('cost-saved', `€${cost.toLocaleString()}`);

        // Visual Feedback
        const impText = document.getElementById('improvement-text');
        if (improvement > 0.1) {
            impText.textContent = `▲ ${improvement.toFixed(1)}%`;
            impText.className = 'kpi-trend positive';
        } else if (improvement < -0.1) {
            impText.textContent = `▼ ${Math.abs(improvement).toFixed(1)}%`;
            impText.className = 'kpi-trend negative';
        } else {
            impText.textContent = '--';
            impText.className = 'kpi-trend neutral';
        }
    }

    updateMetric(id, value) {
        document.getElementById(id).textContent = value;
    }

    exportData() {
        if (!this.data.currentWeek) return;
        const data = {
            metadata: {
                tool: 'Horizon Flow',
                version: '3.0',
                date: new Date().toISOString()
            },
            snapshot: {
                mode: this.data.viewMode,
                volume: this.data.currentVolume,
                target_tph: this.data.target,
                activities: this.data.activities
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `horizon-flow-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    resetData() {
        if(confirm('Clear all data and reset?')) location.reload();
    }
}

const app = new HorizonFlow();