// Activity structure configuration
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

// Main TPH Calculator Class
class TPHCalculator {
    constructor() {
        this.data = {
            alpx: null,
            table: null,
            activities: [],
            volume: 169000,
            target: 11.5
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
                // Get needed_hours rows
                const needed = this.data.alpx.filter(row => 
                    row.metric_name === 'needed_hours' && 
                    row.activity !== 'total' && 
                    row.cycle !== 'total'
                );

                // Get volume from Horizon
                const volumeRow = this.data.alpx.find(row => 
                    row.metric_name === 'volume' && row.activity === 'total'
                );
                if (volumeRow) {
                    const weeklyCols = Object.keys(volumeRow).filter(col => col.includes('weekly'));
                    if (weeklyCols.length > 0) {
                        this.data.volume = volumeRow[weeklyCols[0]] || 169000;
                    }
                }

                // Calculate activity hours
                const activityHours = {};
                needed.forEach(row => {
                    const cols = Object.keys(row).filter(col => col.includes('daily')).slice(0, 7);
                    const total = cols.reduce((sum, col) => sum + (parseFloat(row[col]) || 0), 0);
                    activityHours[row.activity] = (activityHours[row.activity] || 0) + total;
                });

                // Create activities with sub-activities
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

                // Show sections
                document.getElementById('loading').classList.remove('active');
                document.getElementById('volume-input').value = this.data.volume;
                document.getElementById('volume-section').style.display = 'block';
                document.getElementById('metrics-section').style.display = 'grid';
                document.getElementById('calculator-section').style.display = 'block';
                document.getElementById('analysis-section').style.display = 'block';
                
                this.render();
                this.calculate();
            } catch (error) {
                document.getElementById('loading').classList.remove('active');
                alert('Error processing data: ' + error.message);
                console.error(error);
            }
        }, 500);
    }

    render() {
        const tbody = document.getElementById('tbody');
        tbody.innerHTML = '';
        
        this.data.activities.forEach((act, i) => {
            const row = document.createElement('tr');
            if (act.subActivity.includes('AMBASSADOR')) {
                row.classList.add('ambassador-row');
            }
            
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
                configHTML += `<button class="btn-secondary btn-small" onclick="app.addShift(${i})">+ Add Shift</button></div>`;
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
        this.data.volume = parseFloat(document.getElementById('volume-input').value) || 169000;
        this.calculate();
    }

    updateTarget() {
        this.data.target = parseFloat(document.getElementById('target-input').value) || 11.5;
        this.calculate();
    }

    calculate() {
        const totalCurrent = this.data.activities.reduce((s, a) => s + a.currentHours, 0);
        
        // Calculate new hours
        this.data.activities.forEach(act => {
            if (!act.isModified) {
                act.newHours = act.currentHours;
            } else {
                if (act.method === 'packages_hour' && act.newRate > 0) {
                    act.newHours = this.data.volume / act.newRate;
                } else if (act.method === 'headcount') {
                    act.newHours = act.shifts.reduce((sum, s) => sum + (s.hc * s.hours), 0);
                } else {
                    act.newHours = act.currentHours;
                }
            }
        });
        
        const totalNew = this.data.activities.reduce((s, a) => s + a.newHours, 0);
        
        const currentTPH = this.data.volume / totalCurrent;
        const newTPH = this.data.volume / totalNew;
        const improvement = ((newTPH - currentTPH) / currentTPH) * 100;
        const saved = totalCurrent - totalNew;
        
        // Update metrics
        document.getElementById('current-tph').textContent = currentTPH.toFixed(2);
        document.getElementById('new-tph').textContent = newTPH.toFixed(2);
        document.getElementById('improvement').textContent = (improvement > 0 ? '+' : '') + improvement.toFixed(1) + '%';
        document.getElementById('hours-saved').textContent = Math.round(saved);
        
        // Update metric styling
        const improvementText = document.getElementById('improvement-text');
        const costSaved = document.getElementById('cost-saved');
        
        if (improvement > 0) {
            improvementText.textContent = `+${improvement.toFixed(1)}% improvement`;
            improvementText.className = 'metric-change positive';
            costSaved.textContent = `€${Math.round(saved * 25).toLocaleString()} weekly`;
            costSaved.className = 'metric-change positive';
        } else if (improvement < 0) {
            improvementText.textContent = `${improvement.toFixed(1)}% decrease`;
            improvementText.className = 'metric-change negative';
            costSaved.textContent = `€${Math.round(Math.abs(saved) * 25).toLocaleString()} increase`;
            costSaved.className = 'metric-change negative';
        } else {
            improvementText.textContent = 'No changes applied';
            improvementText.className = 'metric-change neutral';
            costSaved.textContent = '€0 weekly';
            costSaved.className = 'metric-change neutral';
        }
        
        this.generateSummary(currentTPH, newTPH, totalCurrent, totalNew);
    }

    generateSummary(currentTPH, newTPH, totalCurrent, totalNew) {
        const target = this.data.target;
        const gap = target - currentTPH;
        const saved = totalCurrent - totalNew;
        
        let html = '<div style="margin-bottom: 1.5rem;">';
        html += '<h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-primary);">Current State Analysis</h3>';
        html += `<p><strong>Weekly Package Volume:</strong> ${this.data.volume.toLocaleString()} packages</p>`;
        html += `<p><strong>Total Labor Hours:</strong> ${totalCurrent.toFixed(0)} hours</p>`;
        html += `<p><strong>Current TPH:</strong> ${currentTPH.toFixed(2)} (calculated as ${this.data.volume.toLocaleString()} ÷ ${totalCurrent.toFixed(0)})</p>`;
        html += '</div>';
        
        if (currentTPH >= target) {
            html += `<div class="status-badge success" style="margin-bottom: 1rem;">✓ MEETING TARGET PERFORMANCE</div>`;
            html += `<p>Your current TPH of <strong>${currentTPH.toFixed(2)}</strong> exceeds the target of <strong>${target}</strong> by ${((currentTPH - target) / target * 100).toFixed(1)}%. Operations are performing efficiently.</p>`;
        } else {
            html += `<div class="status-badge warning" style="margin-bottom: 1rem;">⚠ BELOW TARGET THRESHOLD</div>`;
            html += `<p>Current TPH of <strong>${currentTPH.toFixed(2)}</strong> is <strong>${gap.toFixed(2)} TPH</strong> below target (${(Math.abs(gap) / target * 100).toFixed(1)}% gap).</p>`;
            
            const targetHours = this.data.volume / target;
            const hoursToSave = totalCurrent - targetHours;
            
            html += '<div style="margin-top: 1.5rem;"><h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-primary);">Recommended Optimization Strategy</h3>';
            html += `<p>To achieve target TPH of <strong>${target}</strong>, reduce total hours by <strong>${hoursToSave.toFixed(0)} hours/week</strong>.</p>`;
            html += '<p><strong>Realistic Performance Improvements:</strong></p><ul>';
            
            const bigActivities = this.data.activities
                .filter(a => a.method === 'packages_hour' && a.currentRate > 0 && a.currentHours > 50)
                .sort((a, b) => b.currentHours - a.currentHours)
                .slice(0, 3);
            
            let totalPotential = 0;
            bigActivities.forEach(act => {
                const improved = Math.round(act.currentRate * 1.10);
                const hoursSaved = act.currentHours - (this.data.volume / improved);
                totalPotential += hoursSaved;
                html += `<li><strong>${act.subActivity}:</strong> Increase rate from ${act.currentRate} to ${improved} pkg/hr (+10% efficiency) → Reduces ${hoursSaved.toFixed(0)} hours weekly</li>`;
            });
            html += '</ul>';
            
            if (totalPotential >= hoursToSave) {
                html += `<div class="status-badge success" style="margin-top: 1rem;">Combined potential savings: ${totalPotential.toFixed(0)} hours — Target achievable</div>`;
            } else {
                html += `<div class="status-badge warning" style="margin-top: 1rem;">Combined potential: ${totalPotential.toFixed(0)} hours — Additional ${(hoursToSave - totalPotential).toFixed(0)} hours needed</div>`;
            }
            html += '</div>';
        }
        
        if (Math.abs(saved) > 5) {
            html += '<div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--amazon-border);">';
            html += '<h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-primary);">Applied Optimization Impact</h3>';
            html += `<p><strong>Optimized Total Hours:</strong> ${totalNew.toFixed(0)} hours</p>`;
            html += `<p><strong>Optimized TPH:</strong> ${newTPH.toFixed(2)}</p>`;
            html += `<p><strong>Hours Saved:</strong> ${Math.round(saved)} hours/week</p>`;
            html += `<p><strong>Cost Impact:</strong> €${Math.round(Math.abs(saved) * 25).toLocaleString()} weekly (based on €25/hour labor cost)</p>`;
            html += '</div>';
        }
        
        document.getElementById('summary').innerHTML = html;
    }

    exportData() {
        const data = {
            volume: this.data.volume,
            target: this.data.target,
            activities: this.data.activities,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tph-calculation-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    resetData() {
        if (confirm('Reset all data? This will clear all calculations.')) {
            location.reload();
        }
    }
}

// Initialize app
const app = new TPHCalculator();
