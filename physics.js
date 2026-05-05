// 电路模拟系统
class CircuitSimulator {
    constructor() {
        this.canvas = document.getElementById('circuitCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.components = [];
        this.wires = [];
        this.isRunning = false;
        this.selectedComponent = null;
        this.selectedForConnection = null;
        this.connectionMode = false;
        this.componentCounter = 0;
        this.draggingComponent = null;
        this.dragOffset = { x: 0, y: 0 };
        this.lastClickTime = 0;
        this.clickDelay = 300; // 双击检测延迟（毫秒）
        this.currentEditingComponent = null; // 当前正在编辑的电阻
        this.showElectronAnimation = true; // 是否显示电子动画
        this.electronAnimationSpeed = 800; // 电子动画速度（毫秒）
        this.wasDragging = false; // 标记是否正在拖拽
        this.dragStartPos = { x: 0, y: 0 }; // 拖拽开始位置
        this.selectedWire = null; // 当前选中的导线
        this.wireDeleteButton = null; // 导线删除按钮元素
        this.draggingRheostatSlider = null; // 正在拖拽的滑动变阻器
        
        this.initCanvas();
        this.initEventListeners();
        this.animate();
    }
    
    initCanvas() {
        const container = document.getElementById('canvasContainer');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }
    
    initEventListeners() {
        // 拖拽事件
        const components = document.querySelectorAll('.component-item');
        components.forEach(comp => {
            comp.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('componentType', comp.dataset.type);
            });
        });
        
        // 画布放置事件
        const container = document.getElementById('canvasContainer');
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('componentType');
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.addComponent(type, x, y);
        });
        
        // 画布鼠标按下事件
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleMouseDown(x, y, e.button);
        });
        
        // 画布鼠标移动事件
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleMouseMove(x, y);
        });
        
        // 画布鼠标释放事件
        this.canvas.addEventListener('mouseup', () => {
            this.handleMouseUp();
        });
        
        // 画布点击事件
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleCanvasClick(x, y);
        });
        
        // 右键删除
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleRightClick(x, y);
        });
        
        // 按钮事件
        document.getElementById('runBtn').addEventListener('click', () => this.runCircuit());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopCircuit());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
        
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettingsModal());
        }
        
        // 设置面板开关事件
        const showElectrons = document.getElementById('showElectrons');
        if (showElectrons) {
            showElectrons.addEventListener('change', (e) => {
                this.showElectronAnimation = e.target.checked;
            });
        }
    }
    
    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        const checkbox = document.getElementById('showElectrons');
        checkbox.checked = this.showElectronAnimation;
        modal.classList.add('show');
    }
    
    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('show');
    }
    
    saveSettings() {
        const checkbox = document.getElementById('showElectrons');
        this.showElectronAnimation = checkbox.checked;
        this.closeSettingsModal();
        console.log('设置已保存，显示电子动画:', this.showElectronAnimation);
    }
    
    handleMouseDown(x, y, button) {
        const component = this.getComponentAt(x, y);
        
        if (component && button === 0) { // 左键
            // 检查是否点击了滑动变阻器的滑片
            if (component.type === 'rheostat') {
                const sliderX = -20 + component.sliderPosition * 40 + 10;
                const sliderY = -25;
                
                // 计算点击位置与滑片中心的距离
                const dist = Math.sqrt(Math.pow(x - (component.x + sliderX), 2) + 
                                   Math.pow(y - (component.y + sliderY), 2));
                
                if (dist < 15) {
                    // 开始拖动滑片
                    this.draggingRheostatSlider = component;
                    this.dragStartPos = { x, y };
                    return;
                }
            }
            
            // 开始拖拽元件
            this.draggingComponent = component;
            this.dragOffset.x = x - component.x;
            this.dragOffset.y = y - component.y;
            this.wasDragging = false;
            this.dragStartPos = { x, y };
        }
    }
    
    handleMouseMove(x, y) {
        if (this.draggingRheostatSlider) {
            // 拖动滑动变阻器的滑片
            const comp = this.draggingRheostatSlider;
            const dx = x - comp.x;
            
            // 计算滑片位置（限制在0到1之间）
            let newPosition = (dx + 20) / 40;
            newPosition = Math.max(0, Math.min(1, newPosition));
            
            // 更新滑片位置
            comp.sliderPosition = newPosition;
            
            // 计算新的电阻值（0-1对应0-最大电阻）
            comp.resistance = newPosition * comp.maxResistance;
            
            this.updateStatus(`滑动变阻器：${comp.resistance.toFixed(1)}Ω`);
            
            // 如果电路正在运行，重新计算
            if (this.isRunning) {
                this.calculateCircuit();
            }
            
            return;
        }
        
        if (this.draggingComponent) {
            // 检测是否真的在拖拽（移动距离超过5像素）
            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                this.wasDragging = true;
            }
            
            this.draggingComponent.x = x - this.dragOffset.x;
            this.draggingComponent.y = y - this.dragOffset.y;
        }
    }
    
    handleMouseUp() {
        this.draggingComponent = null;
        this.draggingRheostatSlider = null;
        // 拖拽结束后，延迟重置wasDragging标志
        setTimeout(() => {
            this.wasDragging = false;
        }, 100);
    }
    
    addComponent(type, x, y) {
        const component = {
            id: ++this.componentCounter,
            type: type,
            x: x,
            y: y,
            width: 80,
            height: 80,
            value: 0,
            state: 'off',
            connections: []
        };
        
        // 设置默认值
        if (type === 'battery') {
            component.voltage = 3;
        } else if (type === 'resistor') {
            component.resistance = 10;
        } else if (type === 'fixedResistor') {
            component.resistance = 10;
        } else if (type === 'rheostat') {
            component.resistance = 10;
            component.maxResistance = 10; // 最大阻值
            component.sliderPosition = 0.5;
        } else if (type === 'bulb') {
            component.ratedVoltage = 3;  // 额定电压
            component.ratedPower = 0.5;   // 额定功率
            component.resistance = 0;       // 电阻，根据额定参数计算
            component.brightness = 0;        // 亮度
            component.actualVoltage = 0;     // 实际电压
            component.actualPower = 0;       // 实际功率
        } else if (type === 'switch') {
            component.closed = false;
        } else if (type === 'doubleThrowSwitch') {
            component.closed = false;
            component.position = 'up'; // 'up'或'down'
        } else if (type === 'ammeter') {
            component.current = 0;
        } else if (type === 'voltmeter') {
            component.voltage = 0;
        } else if (type === 'dryCell') {
            component.voltage = 1.5;
        } else if (type === 'resistanceBox') {
            component.resistance = 0;
        }
        
        this.components.push(component);
        this.updateStatus(`添加了${this.getComponentName(type)}`);
    }
    
    getComponentName(type) {
        const names = {
            battery: '电池',
            switch: '开关',
            bulb: '灯泡',
            resistor: '电阻',
            fixedResistor: '定值电阻',
            rheostat: '滑动变阻器',
            ammeter: '电流表',
            voltmeter: '电压表',
            dryCell: '干电池',
            doubleThrowSwitch: '双掷开关',
            resistanceBox: '电阻箱'
        };
        return names[type] || type;
    }
    
    handleCanvasClick(x, y) {
        // 如果刚刚完成拖拽，不触发点击事件
        if (this.wasDragging) {
            return;
        }
        
        // 检查是否点击了导线
        const wire = this.getWireAt(x, y);
        if (wire) {
            this.selectWire(wire);
            return;
        }
        
        const component = this.getComponentAt(x, y);
        const currentTime = Date.now();
        
        if (component) {
            // 检测双击
            if (component.type === 'fixedResistor' && 
                currentTime - this.lastClickTime < this.clickDelay &&
                this.lastClickedComponent && this.lastClickedComponent.id === component.id) {
                // 双击定值电阻，打开设置模态框
                this.openResistorModal(component);
                this.lastClickTime = 0;
                this.lastClickedComponent = null;
                return;
            }
            
            // 双击电源设置电压
            if (component.type === 'battery' && 
                currentTime - this.lastClickTime < this.clickDelay &&
                this.lastClickedComponent && this.lastClickedComponent.id === component.id) {
                this.openPowerModal(component);
                this.lastClickTime = 0;
                this.lastClickedComponent = null;
                return;
            }
            
            // 双击灯泡设置额定参数
            if (component.type === 'bulb' && 
                currentTime - this.lastClickTime < this.clickDelay &&
                this.lastClickedComponent && this.lastClickedComponent.id === component.id) {
                this.openBulbModal(component);
                this.lastClickTime = 0;
                this.lastClickedComponent = null;
                return;
            }
            
            // 双击滑动变阻器设置最大阻值
            if (component.type === 'rheostat' && 
                currentTime - this.lastClickTime < this.clickDelay &&
                this.lastClickedComponent && this.lastClickedComponent.id === component.id) {
                this.openRheostatModal(component);
                this.lastClickTime = 0;
                this.lastClickedComponent = null;
                return;
            }
            
            // 双击电阻箱设置阻值
            if (component.type === 'resistanceBox' && 
                currentTime - this.lastClickTime < this.clickDelay &&
                this.lastClickedComponent && this.lastClickedComponent.id === component.id) {
                this.openResistanceBoxModal(component);
                this.lastClickTime = 0;
                this.lastClickedComponent = null;
                return;
            }
            
            // 点击双掷开关切换状态
            if (component.type === 'doubleThrowSwitch' && this.isRunning) {
                component.position = component.position === 'up' ? 'down' : 'up';
                this.updateStatus(`双掷开关切换到${component.position === 'up' ? '上' : '下'}位置`);
                this.calculateCircuit();
                this.lastClickTime = 0;
                this.lastClickedComponent = null;
                return;
            }
            
            this.lastClickTime = currentTime;
            this.lastClickedComponent = component;
            
            if (component.type === 'switch' && this.isRunning) {
                // 切换开关状态
                component.closed = !component.closed;
                this.updateStatus('开关状态已切换');
                this.calculateCircuit();
            } else if (!this.connectionMode) {
                // 选择第一个元件准备连接
                this.selectedForConnection = component;
                this.connectionMode = true;
                this.updateStatus('请选择第二个元件进行连线');
            } else {
                // 连接两个元件
                if (this.selectedForConnection && this.selectedForConnection.id !== component.id) {
                    this.addWire(this.selectedForConnection, component);
                }
                this.selectedForConnection = null;
                this.connectionMode = false;
            }
        } else {
            this.selectedForConnection = null;
            this.connectionMode = false;
            this.lastClickTime = 0;
            this.lastClickedComponent = null;
            
            // 清除导线选中状态
            if (this.selectedWire) {
                if (this.wireDeleteButton) {
                    this.wireDeleteButton.remove();
                    this.wireDeleteButton = null;
                }
                this.selectedWire = null;
            }
        }
    }
    
    openResistorModal(component) {
        this.currentEditingComponent = component;
        const modal = document.getElementById('resistorModal');
        const input = document.getElementById('resistanceInput');
        input.value = component.resistance;
        modal.classList.add('show');
    }
    
    openPowerModal(component) {
        this.currentEditingComponent = component;
        const modal = document.getElementById('powerModal');
        const input = document.getElementById('voltageInput');
        input.value = component.voltage;
        modal.classList.add('show');
    }
    
    openBulbModal(component) {
        this.currentEditingComponent = component;
        const modal = document.getElementById('bulbModal');
        const voltageInput = document.getElementById('ratedVoltageInput');
        const powerInput = document.getElementById('ratedPowerInput');
        voltageInput.value = component.ratedVoltage;
        powerInput.value = component.ratedPower;
        modal.classList.add('show');
    }
    
    openRheostatModal(component) {
        this.currentEditingComponent = component;
        const modal = document.getElementById('rheostatModal');
        const input = document.getElementById('maxResistanceInput');
        input.value = component.maxResistance;
        modal.classList.add('show');
    }
    
    openResistanceBoxModal(component) {
        this.currentEditingComponent = component;
        const modal = document.getElementById('resistanceBoxModal');
        const input = document.getElementById('resistanceBoxInput');
        input.value = component.resistance;
        modal.classList.add('show');
    }
    
    handleRightClick(x, y) {
        const component = this.getComponentAt(x, y);
        if (component) {
            this.removeComponent(component);
        }
    }
    
    getComponentAt(x, y) {
        return this.components.find(comp => {
            return x >= comp.x - comp.width/2 && 
                   x <= comp.x + comp.width/2 &&
                   y >= comp.y - comp.height/2 && 
                   y <= comp.y + comp.height/2;
        });
    }
    
    getWireAt(x, y) {
        // 检测点击位置是否在导线上
        const tolerance = 8; // 点击容差（像素）
        
        for (const wire of this.wires) {
            const comp1 = this.components.find(c => c.id === wire.from);
            const comp2 = this.components.find(c => c.id === wire.to);
            
            if (!comp1 || !comp2) continue;
            
            // 计算导线段
            const dx = comp2.x - comp1.x;
            const dy = comp2.y - comp1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 调整起点和终点到元件边缘
            const offset = 35;
            const startX = comp1.x + (dx / dist) * offset;
            const startY = comp1.y + (dy / dist) * offset;
            const endX = comp2.x - (dx / dist) * offset;
            const endY = comp2.y - (dy / dist) * offset;
            
            // 计算点到线段的距离
            const lineLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            
            // 如果点击点太接近端点，返回null（避免误触）
            const distToStart = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            const distToEnd = Math.sqrt(Math.pow(x - endX, 2) + Math.pow(y - endY, 2));
            if (distToStart < 15 || distToEnd < 15) continue;
            
            // 计算点到线段的垂直距离
            const numerator = Math.abs((endY - startY) * x - (endX - startX) * y + endX * startY - endY * startX);
            const distance = numerator / lineLength;
            
            if (distance <= tolerance) {
                return wire;
            }
        }
        return null;
    }
    
    selectWire(wire) {
        // 选中导线并显示删除按钮
        this.selectedWire = wire;
        
        // 移除旧的删除按钮
        if (this.wireDeleteButton) {
            this.wireDeleteButton.remove();
        }
        
        // 创建新的删除按钮
        const comp1 = this.components.find(c => c.id === wire.from);
        const comp2 = this.components.find(c => c.id === wire.to);
        
        if (!comp1 || !comp2) return;
        
        // 计算导线中点
        const midX = (comp1.x + comp2.x) / 2;
        const midY = (comp1.y + comp2.y) / 2;
        
        // 获取画布在页面中的位置
        const canvasRect = this.canvas.getBoundingClientRect();
        const buttonX = canvasRect.left + midX - 14;
        const buttonY = canvasRect.top + midY - 14;
        
        // 创建按钮元素
        const button = document.createElement('div');
        button.className = 'wire-delete-btn';
        button.innerHTML = '🗑';
        button.style.left = buttonX + 'px';
        button.style.top = buttonY + 'px';
        button.onclick = (e) => {
            e.stopPropagation();
            this.removeWire(wire);
        };
        
        document.body.appendChild(button);
        this.wireDeleteButton = button;
        
        this.updateStatus('已选中导线，点击删除按钮删除');
    }
    
    removeWire(wire) {
        // 删除导线
        this.wires = this.wires.filter(w => w !== wire);
        
        // 移除删除按钮
        if (this.wireDeleteButton) {
            this.wireDeleteButton.remove();
            this.wireDeleteButton = null;
        }
        
        this.selectedWire = null;
        this.updateStatus('导线已删除');
        
        // 如果电路正在运行，重新计算
        if (this.isRunning) {
            this.calculateCircuit();
        }
    }
    
    addWire(comp1, comp2) {
        // 检查是否已经连接
        const exists = this.wires.some(wire => 
            (wire.from === comp1.id && wire.to === comp2.id) ||
            (wire.from === comp2.id && wire.to === comp1.id)
        );
        
        if (!exists) {
            this.wires.push({
                from: comp1.id,
                to: comp2.id
            });
            this.updateStatus('连线成功！');
        }
    }
    
    removeComponent(component) {
        // 删除连接的导线
        this.wires = this.wires.filter(wire => 
            wire.from !== component.id && wire.to !== component.id
        );
        
        // 删除元件
        this.components = this.components.filter(comp => comp.id !== component.id);
        this.updateStatus(`删除了${this.getComponentName(component.type)}`);
    }
    
    clearCanvas() {
        this.components = [];
        this.wires = [];
        this.stopCircuit();
        this.updateStatus('画布已清空');
    }
    
    runCircuit() {
        this.isRunning = true;
        this.updateStatus('电路运行中...');
        this.calculateCircuit();
    }
    
    stopCircuit() {
        this.isRunning = false;
        this.updateStatus('电路已停止');
        
        // 重置所有显示
        this.components.forEach(comp => {
            if (comp.type === 'bulb') comp.brightness = 0;
            if (comp.type === 'ammeter') comp.current = 0;
            if (comp.type === 'voltmeter') comp.voltage = 0;
        });
    }
    
    calculateCircuit() {
        if (!this.isRunning) return;
        
        // 检查故障并收集故障信息
        const faults = [];
        
        // 检查是否有电池
        const battery = this.components.find(c => c.type === 'battery');
        if (!battery) {
            faults.push({
                type: 'no_power',
                message: '电路中没有电源',
                detail: '请添加电池或其他电源元件'
            });
        }
        
        // 检查开关状态
        const switches = this.components.filter(c => c.type === 'switch');
        const anySwitchOpen = switches.some(s => !s.closed);
        if (anySwitchOpen) {
            faults.push({
                type: 'switch_open',
                message: '电路未闭合（有开关断开）',
                detail: '请闭合所有开关以形成完整回路'
            });
        }
        
        // 检查是否有完整的回路
        const hasLoop = this.checkForLoop();
        if (!hasLoop) {
            faults.push({
                type: 'no_loop',
                message: '电路未形成闭合回路',
                detail: '请确保所有元件都正确连接，形成完整的电路路径'
            });
        }
        
        // 计算总电阻
        let totalResistance = 0;
        this.components.forEach(comp => {
            if (comp.type === 'bulb') {
                // 灯泡电阻根据额定参数计算：R = U²/P
                comp.resistance = (comp.ratedVoltage * comp.ratedVoltage) / comp.ratedPower;
                totalResistance += comp.resistance;
            } else if (comp.type === 'resistor' || comp.type === 'fixedResistor' || comp.type === 'rheostat' || comp.type === 'resistanceBox') {
                totalResistance += comp.resistance || 0;
            }
        });
        
        // 检查短路
        if (totalResistance < 0.1) {
            faults.push({
                type: 'short_circuit',
                message: '电路短路！',
                detail: '总电阻接近0，会导致电流过大，请添加电阻元件或检查连接'
            });
        }
        
        // 如果有故障，显示故障提示
        if (faults.length > 0) {
            this.showFaultModal(faults);
            this.stopCircuit();
            return;
        }
        
        // 计算电流
        const voltage = battery.voltage;
        const current = voltage / totalResistance;
        
        // 更新元件状态
        this.components.forEach(comp => {
            if (comp.type === 'bulb') {
                // 计算灯泡的实际电压、功率和亮度
                comp.actualVoltage = current * comp.resistance;
                comp.actualPower = comp.actualVoltage * current;
                
                // 亮度根据实际功率与额定功率的比值计算
                // P_actual / P_rated = (U_actual / U_rated)²
                const powerRatio = comp.actualPower / comp.ratedPower;
                comp.brightness = Math.min(powerRatio, 1);
                
                // 状态判断
                comp.state = comp.brightness > 0.1 ? 'on' : 'off';
            }
            if (comp.type === 'ammeter') {
                comp.current = current;
            }
            if (comp.type === 'voltmeter') {
                comp.voltage = voltage;
            }
        });
        
        this.updateStatus(`电路正常运行 | 电流: ${current.toFixed(2)}A | 电源电压: ${voltage}V`);
    }
    
    checkForLoop() {
        if (this.components.length < 2) return false;
        if (this.wires.length < this.components.length) return false;
        
        // 简单检查：每个元件至少有一条连接
        const connectedComponents = new Set();
        this.wires.forEach(wire => {
            connectedComponents.add(wire.from);
            connectedComponents.add(wire.to);
        });
        
        return connectedComponents.size >= 2;
    }
    
    updateStatus(text) {
        document.getElementById('statusText').textContent = text;
    }
    
    showFaultModal(faults) {
        const modal = document.getElementById('circuitFaultModal');
        const faultMessage = document.getElementById('faultMessage');
        const faultDetails = document.getElementById('faultDetails');
        
        // 构建故障信息
        let detailsHTML = '<ul>';
        faults.forEach(fault => {
            detailsHTML += `<li><strong>${fault.message}</strong><br><small>${fault.detail}</small></li>`;
        });
        detailsHTML += '</ul>';
        
        // 设置主消息
        if (faults.length === 1) {
            faultMessage.textContent = faults[0].message;
        } else {
            faultMessage.textContent = '发现多个故障';
        }
        
        // 设置详情
        faultDetails.innerHTML = detailsHTML;
        
        // 显示模态框
        modal.classList.add('show');
    }
    
    drawComponent(comp) {
        const ctx = this.ctx;
        const x = comp.x;
        const y = comp.y;
        
        ctx.save();
        ctx.translate(x, y);
        
        if (this.selectedForConnection && this.selectedForConnection.id === comp.id) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            ctx.strokeRect(-comp.width/2 - 5, -comp.height/2 - 5, comp.width + 10, comp.height + 10);
        }
        
        if (comp.type === 'battery') {
            this.drawBattery(comp);
        } else if (comp.type === 'switch') {
            this.drawSwitch(comp);
        } else if (comp.type === 'bulb') {
            this.drawBulb(comp);
        } else if (comp.type === 'resistor') {
            this.drawResistor(comp);
        } else if (comp.type === 'fixedResistor') {
            this.drawFixedResistor(comp);
        } else if (comp.type === 'rheostat') {
            this.drawRheostat(comp);
        } else if (comp.type === 'ammeter') {
            this.drawAmmeter(comp);
        } else if (comp.type === 'voltmeter') {
            this.drawVoltmeter(comp);
        } else if (comp.type === 'dryCell') {
            this.drawDryCell(comp);
        } else if (comp.type === 'doubleThrowSwitch') {
            this.drawDoubleThrowSwitch(comp);
        } else if (comp.type === 'resistanceBox') {
            this.drawResistanceBox(comp);
        }
        
        ctx.restore();
    }
    
    drawBattery(comp) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // 导线
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-15, 0);
        ctx.moveTo(15, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();
        
        // 电池符号（长正短负）
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-15, -12);
        ctx.lineTo(-15, 12);
        ctx.moveTo(15, -6);
        ctx.lineTo(15, 6);
        ctx.stroke();
        
        // 极性标记
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('+', -20, -15);
        ctx.fillStyle = '#3498db';
        ctx.fillText('-', 12, -15);
    }
    
    drawSwitch(comp) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // 导线
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-10, 0);
        ctx.moveTo(30, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();
        
        // 开关闸刀
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        if (comp.closed) {
            ctx.lineTo(10, 0);
        } else {
            ctx.lineTo(8, -20);
        }
        ctx.stroke();
        
        // 状态标记
        ctx.fillStyle = comp.closed ? '#27ae60' : '#e74c3c';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(comp.closed ? '闭合' : '断开', -15, 25);
    }
    
    drawBulb(comp) {
        const ctx = this.ctx;
        
        // 灯泡亮度效果
        const brightness = comp.brightness || 0;
        
        // 发光效果 - 多层渐变，更加突出
        if (brightness > 0) {
            // 添加呼吸动画效果
            const time = Date.now() / 1000; // 时间（秒）
            const pulse = Math.sin(time * 3) * 0.1 + 0.9; // 0.8到1.0之间的脉动值
            const animatedBrightness = brightness * pulse;
            
            // 外层大光晕
            const outerGradient = ctx.createRadialGradient(0, -5, 0, 0, -5, 60);
            outerGradient.addColorStop(0, `rgba(255, 236, 100, ${animatedBrightness * 0.3})`);
            outerGradient.addColorStop(0.5, `rgba(255, 200, 50, ${animatedBrightness * 0.15})`);
            outerGradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
            ctx.fillStyle = outerGradient;
            ctx.beginPath();
            ctx.arc(0, -5, 60, 0, Math.PI * 2);
            ctx.fill();
            
            // 中层光晕（带脉动效果）
            const midGradient = ctx.createRadialGradient(0, -5, 0, 0, -5, 45 * pulse);
            midGradient.addColorStop(0, `rgba(255, 240, 120, ${animatedBrightness * 0.5})`);
            midGradient.addColorStop(0.6, `rgba(255, 220, 80, ${animatedBrightness * 0.3})`);
            midGradient.addColorStop(1, 'rgba(255, 180, 40, 0)');
            ctx.fillStyle = midGradient;
            ctx.beginPath();
            ctx.arc(0, -5, 45 * pulse, 0, Math.PI * 2);
            ctx.fill();
            
            // 内层核心光（带脉动效果）
            const innerGradient = ctx.createRadialGradient(0, -5, 0, 0, -5, 30 * pulse);
            innerGradient.addColorStop(0, `rgba(255, 255, 200, ${animatedBrightness * 0.9})`);
            innerGradient.addColorStop(0.4, `rgba(255, 240, 150, ${animatedBrightness * 0.7})`);
            innerGradient.addColorStop(1, 'rgba(255, 200, 100, 0)`);
            ctx.fillStyle = innerGradient;
            ctx.beginPath();
            ctx.arc(0, -5, 30 * pulse, 0, Math.PI * 2);
            ctx.fill();
            
            // 添加额外的闪烁光点效果
            for (let i = 0; i < 3; i++) {
                const sparkleTime = (time * 2 + i * 2) % 1;
                const sparkleAlpha = Math.sin(sparkleTime * Math.PI) * brightness * 0.5;
                const angle = (i * 120 + time * 30) * Math.PI / 180;
                const sparkleX = Math.cos(angle) * 25 * pulse;
                const sparkleY = Math.sin(angle) * 25 * pulse - 5;
                
                const sparkleGradient = ctx.createRadialGradient(sparkleX, sparkleY, 0, sparkleX, sparkleY, 8);
                sparkleGradient.addColorStop(0, `rgba(255, 255, 255, ${sparkleAlpha})`);
                sparkleGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = sparkleGradient;
                ctx.beginPath();
                ctx.arc(sparkleX, sparkleY, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // 灯泡主体
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -5, 18, 0, Math.PI * 2);
        ctx.stroke();
        
        // 灯泡内部线条
        ctx.beginPath();
        ctx.moveTo(0, -23);
        ctx.lineTo(0, 13);
        ctx.moveTo(-18, -5);
        ctx.lineTo(18, -5);
        ctx.moveTo(-13, -13);
        ctx.lineTo(13, 3);
        ctx.moveTo(13, -13);
        ctx.lineTo(-13, 3);
        ctx.stroke();
        
        // 灯泡底座
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, 13);
        ctx.lineTo(-8, 28);
        ctx.moveTo(8, 13);
        ctx.lineTo(8, 28);
        ctx.stroke();
        
        // 亮度值
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`${Math.round(brightness * 100)}%`, -20, 35);
    }
    
    drawResistor(comp) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 2;
        
        // 导线
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-25, 0);
        ctx.moveTo(25, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();
        
        // 电阻锯齿线
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-20, -12);
        ctx.lineTo(-12, 12);
        ctx.lineTo(-4, -12);
        ctx.lineTo(4, 12);
        ctx.lineTo(12, -12);
        ctx.lineTo(20, 12);
        ctx.lineTo(25, 0);
        ctx.stroke();
        
        // 阻值标记
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`${comp.resistance}Ω`, -15, 25);
    }
    
    drawFixedResistor(comp) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 2;
        
        // 导线
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-20, 0);
        ctx.moveTo(20, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();
        
        // 电阻矩形
        ctx.fillStyle = '#f5e6f8';
        ctx.fillRect(-20, -12, 40, 24);
        ctx.strokeRect(-20, -12, 40, 24);
        
        // 阻值标记
        ctx.fillStyle = '#9b59b6';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${comp.resistance}Ω`, 0, 5);
        
        // 提示文字
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText('双击设置', 0, 28);
    }
    
    drawRheostat(comp) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 2;
        
        // 导线
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-20, 0);
        ctx.moveTo(20, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();
        
        // 电阻矩形
        ctx.fillStyle = '#f5e6f8';
        ctx.fillRect(-20, -12, 40, 24);
        ctx.strokeRect(-20, -12, 40, 24);
        
        // 滑动片
        const sliderX = -20 + comp.sliderPosition * 40;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sliderX, -12);
        ctx.lineTo(sliderX, -25);
        ctx.lineTo(sliderX + 10, -25);
        ctx.stroke();
        
        // 滑动片圆圈
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(sliderX + 10, -25, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 阻值标记
        ctx.fillStyle = '#9b59b6';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${comp.resistance}Ω`, 0, 5);
        
        // 提示文字
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText('拖动滑片', 0, 28);
    }
    
    drawAmmeter(comp) {
        const ctx = this.ctx;
        
        // 表盘
        ctx.fillStyle = '#ecf0f1';
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 符号
        ctx.fillStyle = '#27ae60';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', 0, 2);
        
        // 导线
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-25, 0);
        ctx.moveTo(25, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();
        
        // 读数
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${(comp.current || 0).toFixed(2)}A`, 0, 35);
    }
    
    drawVoltmeter(comp) {
        const ctx = this.ctx;
        
        // 表盘
        ctx.fillStyle = '#ecf0f1';
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 符号
        ctx.fillStyle = '#c0392b';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('V', 0, 2);
        
        // 导线
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-25, 0);
        ctx.moveTo(25, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();
        
        // 读数
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${(comp.voltage || 0).toFixed(1)}V`, 0, 35);
    }
    
    drawDryCell(comp) {
        const ctx = this.ctx;
        
        // 电池主体
        ctx.fillStyle = '#555';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.fillRect(-15, -12, 30, 25);
        ctx.strokeRect(-15, -12, 30, 25);
        
        // 电池内部细节
        ctx.fillStyle = '#666';
        ctx.fillRect(-13, -10, 26, 21);
        
        // 电池正极
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(-3, -17, 6, 5);
        
        // 标签
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(-12, -6, 24, 10);
        
        // 电压文字
        ctx.fillStyle = '#333';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('1.5V', 0, 2);
        
        // 极性标记
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('+', 0, 18);
    }
    
    drawDoubleThrowSwitch(comp) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // 中心触点
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-20, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 上触点
        ctx.beginPath();
        ctx.arc(20, -15, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 下触点
        ctx.beginPath();
        ctx.arc(20, 15, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 导线
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-20, 0);
        ctx.moveTo(20, -15);
        ctx.lineTo(30, -15);
        ctx.moveTo(20, 15);
        ctx.lineTo(30, 15);
        ctx.stroke();
        
        // 开关臂
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        if (comp.position === 'up') {
            ctx.lineTo(16, -12);
        } else {
            ctx.lineTo(16, 12);
        }
        ctx.stroke();
        
        // 状态标记
        ctx.fillStyle = '#333';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(comp.position === 'up' ? '上' : '下', 0, 30);
    }
    
    drawResistanceBox(comp) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // 导线
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-20, 0);
        ctx.moveTo(20, 0);
        ctx.lineTo(35, 0);
        ctx.stroke();
        
        // 外壳
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(-20, -15, 40, 30);
        ctx.strokeRect(-20, -15, 40, 30);
        
        // 旋钮（5个旋钮）
        const knobPositions = [
            {x: -10, y: -5},
            {x: 0, y: -5},
            {x: 10, y: -5},
            {x: -5, y: 5},
            {x: 5, y: 5}
        ];
        
        knobPositions.forEach(pos => {
            // 旋钮底座
            ctx.fillStyle = '#2d3748';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#718096';
            ctx.stroke();
            
            // 旋钮旋钮
            ctx.fillStyle = '#4a5568';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 接线柱
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(-15, 15, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15, 15, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 阻值标记
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${comp.resistance}Ω`, 0, -25);
        
        // 提示文字
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText('双击设置', 0, 35);
    }
    
    drawWire(wire) {
        const comp1 = this.components.find(c => c.id === wire.from);
        const comp2 = this.components.find(c => c.id === wire.to);
        
        if (!comp1 || !comp2) return;
        
        const ctx = this.ctx;
        
        // 检查是否是选中的导线
        const isSelected = this.selectedWire && this.selectedWire === wire;
        
        // 设置导线颜色和宽度
        if (isSelected) {
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 4;
        } else {
            ctx.strokeStyle = this.isRunning ? '#e74c3c' : '#34495e';
            ctx.lineWidth = this.isRunning ? 3 : 2;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 计算连接点（从元件边缘开始）
        const dx = comp2.x - comp1.x;
        const dy = comp2.y - comp1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 调整起点和终点到元件边缘
        const offset = 35;
        const startX = comp1.x + (dx / dist) * offset;
        const startY = comp1.y + (dy / dist) * offset;
        const endX = comp2.x - (dx / dist) * offset;
        const endY = comp2.y - (dy / dist) * offset;
        
        // 绘制简洁的导线（使用直线）
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // 绘制连接点
        ctx.fillStyle = this.isRunning ? '#f39c12' : '#34495e';
        ctx.beginPath();
        ctx.arc(startX, startY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 导线上的流动动画效果（运行时）
        if (this.isRunning && this.showElectronAnimation) {
            const time = Date.now() / this.electronAnimationSpeed;
            
            // 在直线路径上绘制移动的点
            ctx.fillStyle = '#f39c12';
            for (let i = 0; i < 4; i++) {
                const progress = ((time + i * 0.25) % 1);
                const px = startX + (endX - startX) * progress;
                const py = startY + (endY - startY) * progress;
                
                // 绘制流动点
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加光晕效果
                ctx.fillStyle = 'rgba(243, 156, 18, 0.4)';
                ctx.beginPath();
                ctx.arc(px, py, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#f39c12';
            }
        }
    }
    
    drawGrid() {
        const ctx = this.ctx;
        const gridSize = 20;
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格背景
        this.drawGrid();
        
        // 绘制导线
        this.wires.forEach(wire => this.drawWire(wire));
        
        // 绘制元件
        this.components.forEach(comp => this.drawComponent(comp));
        
        requestAnimationFrame(() => this.animate());
    }
}

// 初始化应用
let simulator;

document.addEventListener('DOMContentLoaded', () => {
    simulator = new CircuitSimulator();
});

// 全局函数用于模态框操作
function closeModal() {
    const modal = document.getElementById('resistorModal');
    modal.classList.remove('show');
    if (simulator) {
        simulator.currentEditingComponent = null;
    }
}

function saveResistance() {
    const input = document.getElementById('resistanceInput');
    const value = parseFloat(input.value);
    
    if (simulator && simulator.currentEditingComponent && value > 0) {
        simulator.currentEditingComponent.resistance = value;
        simulator.updateStatus(`电阻值已设置为${value}Ω`);
        closeModal();
    } else {
        alert('请输入有效的电阻值（大于0的数字）');
    }
}

function setPreset(value) {
    const input = document.getElementById('resistanceInput');
    input.value = value;
}

function closePowerModal() {
    const modal = document.getElementById('powerModal');
    modal.classList.remove('show');
    if (simulator) {
        simulator.currentEditingComponent = null;
    }
}

function saveVoltage() {
    const input = document.getElementById('voltageInput');
    const value = parseFloat(input.value);
    
    if (simulator && simulator.currentEditingComponent && value > 0) {
        simulator.currentEditingComponent.voltage = value;
        simulator.updateStatus(`电压值已设置为${value}V`);
        if (simulator.isRunning) {
            simulator.calculateCircuit();
        }
        closePowerModal();
    } else {
        alert('请输入有效的电压值（大于0的数字）');
    }
}

function setVoltagePreset(value) {
    const input = document.getElementById('voltageInput');
    input.value = value;
}

function toggleSettings() {
    if (simulator) {
        simulator.toggleSettingsPanel();
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('show');
}

function saveSettings() {
    if (simulator) {
        simulator.saveSettings();
    }
}

function closeBulbModal() {
    const modal = document.getElementById('bulbModal');
    modal.classList.remove('show');
    if (simulator) {
        simulator.currentEditingComponent = null;
    }
}

function saveBulbParams() {
    const voltageInput = document.getElementById('ratedVoltageInput');
    const powerInput = document.getElementById('ratedPowerInput');
    const ratedVoltage = parseFloat(voltageInput.value);
    const ratedPower = parseFloat(powerInput.value);
    
    if (simulator && simulator.currentEditingComponent && ratedVoltage > 0 && ratedPower > 0) {
        simulator.currentEditingComponent.ratedVoltage = ratedVoltage;
        simulator.currentEditingComponent.ratedPower = ratedPower;
        
        // 根据额定参数计算灯泡电阻
        simulator.currentEditingComponent.resistance = (ratedVoltage * ratedVoltage) / ratedPower;
        
        simulator.updateStatus(`灯泡参数已更新：额定电压${ratedVoltage}V，额定功率${ratedPower}W`);
        if (simulator.isRunning) {
            simulator.calculateCircuit();
        }
        closeBulbModal();
    } else {
        alert('请输入有效的额定电压和额定功率（大于0的数字）');
    }
}

function setBulbVoltagePreset(value) {
    const input = document.getElementById('ratedVoltageInput');
    input.value = value;
}

function setBulbPowerPreset(value) {
    const input = document.getElementById('ratedPowerInput');
    input.value = value;
}

function closeFaultModal() {
    const modal = document.getElementById('circuitFaultModal');
    modal.classList.remove('show');
}

function closeRheostatModal() {
    const modal = document.getElementById('rheostatModal');
    modal.classList.remove('show');
    if (simulator) {
        simulator.currentEditingComponent = null;
    }
}

function saveRheostatParams() {
    const input = document.getElementById('maxResistanceInput');
    const value = parseFloat(input.value);
    
    if (simulator && simulator.currentEditingComponent && value > 0) {
        simulator.currentEditingComponent.maxResistance = value;
        // 根据滑片位置重新计算当前阻值
        simulator.currentEditingComponent.resistance = 
            simulator.currentEditingComponent.sliderPosition * value;
        
        simulator.updateStatus(`滑动变阻器最大阻值已设置为${value}Ω`);
        if (simulator.isRunning) {
            simulator.calculateCircuit();
        }
        closeRheostatModal();
    } else {
        alert('请输入有效的最大阻值（大于0的数字）');
    }
}

function setRheostatPreset(value) {
    const input = document.getElementById('maxResistanceInput');
    input.value = value;
}

function closeResistanceBoxModal() {
    const modal = document.getElementById('resistanceBoxModal');
    modal.classList.remove('show');
    if (simulator) {
        simulator.currentEditingComponent = null;
    }
}

function saveResistanceBoxParams() {
    const input = document.getElementById('resistanceBoxInput');
    const value = parseFloat(input.value);
    
    if (simulator && simulator.currentEditingComponent && value >= 0) {
        simulator.currentEditingComponent.resistance = value;
        simulator.updateStatus(`电阻箱阻值已设置为${value}Ω`);
        if (simulator.isRunning) {
            simulator.calculateCircuit();
        }
        closeResistanceBoxModal();
    } else {
        alert('请输入有效的电阻值（大于或等于0的数字）');
    }
}

function setResistanceBoxPreset(value) {
    const input = document.getElementById('resistanceBoxInput');
    input.value = value;
}