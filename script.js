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

class TPHCalculator {
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
    }

    handleFile(e, type) {
        const file = e.target.files[0];
        if (!file) return;

        const statusEl = document.getElementById('status-' + type);
        statusEl.textContent = 'Uploading...';

        Papa.parse(file, {
            header: true,
            delimiter: ';',
            dynamicTyping: true,
            complete: (results) => {
                this.data[type] = results.data;
                document.getElementById('box-' + type).classList.add('uploaded');
                statusEl.textContent = '✓ Uploaded';
                
                if (this.data.alpx && this.data.table) {
                    document.getElementById('import-btn').disabled = false;
                }
            },
            error: (error) => {
                statusEl.textContent = '✗ Error';
                console.error('Parse error:', error);
            }
        });
    }

    process() {
        document.getElementById('loading').classList.add('active');
        
        setTimeout(() => {
            try {
                // Extract available weeks and dates
                const columns = Object.keys(this.data.alpx[0]);
                
                // Get all weekly columns
                const weeklyColumns = columns.filter(col => col.includes('weekly'));
                this.data.availableWeeks = weeklyColumns.map(col => {
                    const parts = col.split('_');
                    return {
                        week: parts[0],
                        date: parts[2],
                        column: col
                    };
                });
                
                // Get all daily columns grouped by week
                const dailyColumns = columns.filter(col => col.includes('daily'));
                const datesByWeek = {};
                dailyColumns.forEach(col => {
                    const parts = col.split('_');
                    const week = parts[0];
                    const date = parts[2];
                    if (!datesByWeek[week]) datesByWeek[week] = [];
                    datesByWeek[week].push({ date, column: col, week });
                });
                
                // Flatten all dates
                this.data.availableDates = [];
                Object.values(datesByWeek).forEach(dates => {
                    this.data.availableDates.push(...dates);
                });
                
                // Populate selectors
                this.populateSelectors();
                
                // Load first week by default
                this.data.currentWeek = this.data.availableWeeks[0];
                this.loadWeek();
                
                // Show interface
                document.getElementById('loading').classList.remove('active');
                document.getElementById('selector-section').style.display = 'block';
                document.getElementById('volume-section').style.display = 'block';
                document.getElementById('metrics-section').style.display = 'grid';
                document.getElementById('calculator-section').style.display = 'block';
                document.getElementById('analysis-section').style.display = 'block';
                
            } catch (error) {
                document.getElementById('loading').classList.remove('active');
                alert('Error processing: ' + error.message);
                console.error(error);
            }
        }, 500);
    }

    populateSelectors() {
        // Populate week selector
        const weekSelect = document.getElementById('week-select');
        weekSelect.innerHTML = '';
        this.data.availableWeeks.forEach((week, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Week ${week.week} (${this.formatDate(week.date)})`;
            weekSelect.appendChild(option);
        });
        
        // Populate date selector
        const dateSelect = document.getElementById('date-select');
        dateSelect.innerHTML = '';
        this.data.availableDates.forEach((dateObj, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${this.formatDate(dateObj.date)} (Week ${dateObj.week})`;
            dateSelect.appendChild(option);
        });
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    }

    changeViewMode(mode) {
        this.data.viewMode = mode;
        
        if (mode === 'weekly') {
            document.getElementById('weekly-selector').style.display = 'flex';
            document.getElementById('daily-selector').style.display = 'none';
            document.getElementById('volume-label').textContent = 'Weekly Volume';
            document.getElementById('metric-label-current').textContent = 'Current Weekly TPH';
            document.getElementById('metric-label-new').textContent = 'Optimized Weekly TPH';
            this.loadWeek();
        } else {
            document.getElementById('weekly-selector').style.display = 'none';
            document.getElementById('daily-selector').style.display = 'flex';
            document.getElementById('volume-label').textContent = 'Daily Volume';
            document.getElementById('metric-label-current').textContent = 'Current Daily TPH';
            document.getElementById('metric-label-new').textContent = 'Optimized Daily TPH';
            this.loadDate();
        }
    }

    loadWeek() {
        const weekIndex = parseInt(document.getElementById('week-select').value);
        this.data.currentWeek = this.data.availableWeeks[weekIndex];
        this.data.currentColumn = this.data.currentWeek.column;
        
        // Update info display
        document.getElementById('week-info').textContent = 
            `Week ${this.data.currentWeek.week} starting ${this.formatDate(this.data.currentWeek.date)}`;
        
        this.loadData();
    }

    loadDate() {
        const dateIndex = parseInt(document.getElementById('date-select').value);
        this.data.currentDate = this.data.availableDates[dateIndex];
        this.data.currentColumn = this.data.currentDate.column;
        
        // Update info display
        document.getElementById('date-info').textContent = 
            `${this.formatDate(this.data.currentDate.date)} (Week ${this.data.currentDate.week})`;
        
        this.loadData();
    }

    loadData() {
        // Get volume for current period
        const volumeRow = this.data.alpx.find(row => 
            row.metric_name === 'volume' && row.activity === 'total'
        );
        
        if (volumeRow) {
            this.data.currentVolume = volumeRow[this.data.currentColumn] || 0;
            document.getElementById('volume-input').value = this.data.currentVolume;
        }
        
        // Get needed_hours data
        const needed = this.data.alpx.filter(row => 
            row.metric_name === 'needed_hours' && 
            row.activity !== 'total' && 
            row.cycle !== 'total'
        );
        
        // Calculate hours per activity
        const activityHours = {};
        needed.forEach(row => {
            const hours = row[this.data.currentColumn] || 0;
            activityHours[row.activity] = (activityHours[row.activity] || 0) + hours;
        });
        
        // Build activities with sub-activities
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
                    shifts: sub.method === 'headcount' ? [{ hc: 1, hours: 5.0 }] : [],
                    isModified: false
                });
            });
        });
        
        this.render();
        this.calculate();
    }

    render() {
        const tbody = document.getElementById('tbody');
        tbody.innerHTML = '';
        
        this.data.activities.forEach((act, i) => {
            const row = document.createElement('tr');
            if (act.subActivity.includes('AMBASSADOR')) row.classList.add('ambassador-row');
            
            let configHTML = '';
            if (act.method === 'headcount') {
                configHTML = '<div class="shift-group">';
                act.shifts.forEach((shift, si) => {
                    configHTML += `
                        <div class="shift-item">
                            <input type="number" value="${shift.hc}" onchange="app.updateShiftHC(${i}, ${si}, this.value)" style="width:50px;" min="0">
                            <span>×</span>
                            <select onchange="app.updateShiftHours(${i}, ${si}, this.value)">
                                <option value="7.30" ${shift.hours === 7.30 ? 'selected' : ''}>NS (7.3h)</option>
                                <option value="7.00" ${shift.hours === 7.00 ? 'selected' : ''}>Hybrid (7h)</option>
                                <option value="5.00" ${shift.hours === 5.00 ? 'selected' : ''}>ES (5h)</option>
                                <option value="5.00" ${shift.hours === 5.00 ? 'selected' : ''}>PM (5h)</option>
                            </select>
                            ${act.shifts.length > 1 ? `<button class="btn-secondary btn-small" onclick="app.removeShift(${i}, ${si})">×</button>` : ''}
                        </div>
                    `;
                });
                configHTML += `<button class="btn-secondary btn-small" onclick="app.addShift(${i})">+ Add</button></div>`;
            } else {
                configHTML = `<input type="number" class="rate-input" value="${act.newRate}" onchange="app.updateRate(${i}, this.value)" min="0">`;
            }
            
            row.innerHTML = `
                <td><strong>${act.activity}</strong></td>
                <td>${act.subActivity}</td>
                <td>
                    <select onchange="app.updateMethod(${i}, this.value)">
                        <option value="packages_hour" ${act.method === 'packages_hour' ? 'selected' : ''}>Pkg/Hour</option>
                        <option value="headcount" ${act.method === 'headcount' ? 'selected' : ''}>Headcount</option>
                        <option value="fixed" ${act.method === 'fixed' ? 'selected' : ''}>Fixed</option>
                    </select>
                </td>
                <td>
                    <input type="number" class="rate-input" value="${act.currentRate}" 
                           onchange="app.updateCurrentRate(${i}, this.value)" min="0">
                </td>
                <td>${configHTML}</td>
                <td>${act.currentHours.toFixed(1)}</td>
                <td><strong>${act.newHours.toFixed(1)}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }

    addShift(i) {
        this.data.activities[i].shifts.push({ hc: 1, hours: 5.0 });
        this.data.activities[i].isModified = true;
        this.render();
        this.calculate();
    }

    removeShift(i, si) {
        this.data.activities[i].shifts.splice(si, 1);
        this.data.activities[i].isModified = true;
        this.render();
        this.calculate();
    }

    updateShiftHC(i, si, val) {
        const newHC = parseFloat(val) || 0;
        this.data.activities[i].shifts[si].hc = newHC;
        
        const isOriginal = this.data.activities[i].shifts.length === 1 && 
                          this.data.activities[i].shifts[0].hc === 1 && 
                          this.data.activities[i].shifts[0].hours === 5.0;
        
        this.data.activities[i].isModified = !isOriginal;
        this.calculate();
    }

    updateShiftHours(i, si, val) {
        this.data.activities[i].shifts[si].hours = parseFloat(val);
        
        const isOriginal = this.data.activities[i].shifts.length === 1 && 
                          this.data.activities[i].shifts[0].hc === 1 && 
                          this.data.activities[i].shifts[0].hours === 5.0;
        
        this.data.activities[i].isModified = !isOriginal;
        this.calculate();
    }

    updateMethod(i, method) {
        this.data.activities[i].method = method;
        this.data.activities[i].isModified = true;
        if (method === 'headcount') {
            this.data.activities[i].shifts = [{ hc: 1, hours: 5.0 }];
        } else {
            this.data.activities[i].shifts = [];
        }
        this.render();
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

    calculate() {
        const totalCurrent = this.data.activities.reduce((s, a) => s + a.currentHours, 0);
        
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
        
        const currentTPH = this.data.currentVolume / totalCurrent;
        const newTPH = this.data.currentVolume / totalNew;
        const improvement = ((newTPH - currentTPH) / currentTPH) * 100;
        const saved = totalCurrent - totalNew;
        
        document.getElementById('current-tph').textContent = currentTPH.toFixed(2);
        document.getElementById('new-tph').textContent = newTPH.toFixed(2);
        document.getElementById('improvement').textContent = (improvement > 0 ? '+' : '') + improvement.toFixed(1) + '%';
        document.getElementById('hours-saved').textContent = Math.round(saved);
        
        const improvementText = document.getElementById('improvement-text');
        const costSaved = document.getElementById('cost-saved');
        
        if (improvement > 0) {
            improvementText.textContent = `+${improvement.toFixed(1)}% improvement`;
            improvementText.className = 'metric-change positive';
            costSaved.textContent = `€${Math.round(saved * 25).toLocaleString()}`;
            costSaved.className = 'metric-change positive';
        } else if (improvement < 0) {
            improvementText.textContent = `${improvement.toFixed(1)}% decrease`;
            improvementText.className = 'metric-change negative';
            costSaved.textContent = `€${Math.round(Math.abs(saved) * 25).toLocaleString()} loss`;
            costSaved.className = 'metric-change negative';
        } else {
            improvementText.textContent = 'No changes';
            improvementText.className = 'metric-change neutral';
            costSaved.textContent = '€0';
            costSaved.className = 'metric-change neutral';
        }
        
        this.generateSummary(currentTPH, newTPH, totalCurrent, totalNew);
    }

    generateSummary(currentTPH, newTPH, totalCurrent, totalNew) {
        const target = this.data.target;
        const gap = target - currentTPH;
        const saved = totalCurrent - totalNew;
        const periodType = this.data.viewMode === 'weekly' ? 'Weekly' : 'Daily';
        
        let html = '<div style="margin-bottom: 1.5rem;">';
        html += `<h3 style="font-size: 1rem; margin-bottom: 1rem;">${periodType} Performance</h3>`;
        html += `<p><strong>Volume:</strong> ${this.data.currentVolume.toLocaleString()} packages</p>`;
        html += `<p><strong>Labor Hours:</strong> ${totalCurrent.toFixed(0)} hours</p>`;
        html += `<p><strong>Current TPH:</strong> ${currentTPH.toFixed(2)}</p>`;
        html += '</div>';
        
        if (currentTPH >= target) {
            html += `<div class="status-badge success">✓ ABOVE TARGET (${((currentTPH - target) / target * 100).toFixed(1)}%)</div>`;
        } else {
            html += `<div class="status-badge warning">⚠ BELOW TARGET (${(Math.abs(gap) / target * 100).toFixed(1)}%)</div>`;
        }
        
        if (Math.abs(saved) > 1) {
            html += '<div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--amazon-border);">';
            html += '<h3 style="font-size: 1rem; margin-bottom: 1rem;">Optimization Impact</h3>';
            html += `<p><strong>New Hours:</strong> ${totalNew.toFixed(0)}</p>`;
            html += `<p><strong>New TPH:</strong> ${newTPH.toFixed(2)}</p>`;
            html += `<p><strong>Savings:</strong> ${Math.round(saved)} hours (€${Math.round(Math.abs(saved) * 25).toLocaleString()})</p>`;
            html += '</div>';
        }
        
        document.getElementById('summary').innerHTML = html;
    }

    exportData() {
        const data = {
            mode: this.data.viewMode,
            period: this.data.viewMode === 'weekly' ? this.data.currentWeek : this.data.currentDate,
            volume: this.data.currentVolume,
            target: this.data.target,
            activities: this.data.activities,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tph-${this.data.viewMode}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    resetData() {
        if (confirm('Reset all changes?')) {
            location.reload();
        }
    }
}

const app = new TPHCalculator();
