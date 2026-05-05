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
        
        // 窗口大小改变
        window.addEventListener('resize', () => this.initCanvas());
    }
    
    handleMouseDown(x, y, button) {
        const component = this.getComponentAt(x, y);
        
        if (component && button === 0) { // 左键
            // 开始拖拽
            this.draggingComponent = component;
            this.dragOffset.x = x - component.x;
            this.dragOffset.y = y - component.y;
        }
    }
    
    handleMouseMove(x, y) {
        if (this.draggingComponent) {
            this.draggingComponent.x = x - this.dragOffset.x;
            this.draggingComponent.y = y - this.dragOffset.y;
        }
    }
    
    handleMouseUp() {
        this.draggingComponent = null;
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
        switch(type) {
            case 'battery':
                component.voltage = 3;
                break;
            case 'resistor':
                component.resistance = 10;
                break;
            case 'fixedResistor':
                component.resistance = 10;
                break;
            case 'rheostat':
                component.resistance = 10;
                component.sliderPosition = 0.5;
                break;
            case 'bulb':
                component.resistance = 5;
                component.brightness = 0;
                break;
            case 'switch':
                component.closed = false;
                break;
            case 'ammeter':
                component.current = 0;
                break;
            case 'voltmeter':
                component.voltage = 0;
                break;
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
            voltmeter: '电压表'
        };
        return names[type] || type;
    }
    
    handleCanvasClick(x, y) {
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
        }
    }
    
    openResistorModal(component) {
        this.currentEditingComponent = component;
        const modal = document.getElementById('resistorModal');
        const input = document.getElementById('resistanceInput');
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
        
        // 简化的电路计算
        // 检查是否有电池
        const battery = this.components.find(c => c.type === 'battery');
        if (!battery) {
            this.updateStatus('警告：电路中没有电源');
            return;
        }
        
        // 检查开关状态
        const switches = this.components.filter(c => c.type === 'switch');
        const anySwitchOpen = switches.some(s => !s.closed);
        if (anySwitchOpen) {
            this.updateStatus('电路未闭合（有开关断开）');
            return;
        }
        
        // 检查是否有完整的回路
        const hasLoop = this.checkForLoop();
        if (!hasLoop) {
            this.updateStatus('电路未形成闭合回路');
            return;
        }
        
        // 计算总电阻
        let totalResistance = 0;
        this.components.forEach(comp => {
            if (comp.type === 'bulb' || comp.type === 'resistor' || 
                comp.type === 'fixedResistor' || comp.type === 'rheostat') {
                totalResistance += comp.resistance || 5;
            }
        });
        
        if (totalResistance === 0) {
            this.updateStatus('警告：电路短路！');
            return;
        }
        
        // 计算电流
        const voltage = battery.voltage;
        const current = voltage / totalResistance;
        
        // 更新元件状态
        this.components.forEach(comp => {
            if (comp.type === 'bulb') {
                // 根据电流计算亮度
                comp.brightness = Math.min(current * 2, 1);
                comp.state = comp.brightness > 0.3 ? 'on' : 'off';
            }
            if (comp.type === 'ammeter') {
                comp.current = current;
            }
            if (comp.type === 'voltmeter') {
                // 简化的电压计算
                comp.voltage = voltage;
            }
        });
        
        this.updateStatus(`电路正常运行 | 电流: ${current.toFixed(2)}A | 电压: ${voltage}V`);
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
    
    drawComponent(comp) {
        const ctx = this.ctx;
        const x = comp.x;
        const y = comp.y;
        
        ctx.save();
        ctx.translate(x, y);
        
        // 绘制选中效果
        if (this.selectedForConnection && this.selectedForConnection.id === comp.id) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            ctx.strokeRect(-comp.width/2 - 5, -comp.height/2 - 5, comp.width + 10, comp.height + 10);
        }
        
        switch(comp.type) {
            case 'battery':
                this.drawBattery(comp);
                break;
            case 'switch':
                this.drawSwitch(comp);
                break;
            case 'bulb':
                this.drawBulb(comp);
                break;
            case 'resistor':
                this.drawResistor(comp);
                break;
            case 'fixedResistor':
                this.drawFixedResistor(comp);
                break;
            case 'rheostat':
                this.drawRheostat(comp);
                break;
            case 'ammeter':
                this.drawAmmeter(comp);
                break;
            case 'voltmeter':
                this.drawVoltmeter(comp);
                break;
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
        
        // 发光效果
        if (brightness > 0) {
            const gradient = ctx.createRadialGradient(0, -5, 0, 0, -5, 40);
            gradient.addColorStop(0, `rgba(255, 236, 100, ${brightness * 0.6})`);
            gradient.addColorStop(1, 'rgba(255, 236, 100, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, -5, 40, 0, Math.PI * 2);
            ctx.fill();
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
    
    drawWire(wire) {
        const comp1 = this.components.find(c => c.id === wire.from);
        const comp2 = this.components.find(c => c.id === wire.to);
        
        if (!comp1 || !comp2) return;
        
        const ctx = this.ctx;
        ctx.strokeStyle = this.isRunning ? '#e74c3c' : '#2c3e50';
        ctx.lineWidth = this.isRunning ? 4 : 3;
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
        
        // 绘制导线（使用直角折线）
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        // 计算折线中间点
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        // 根据相对位置选择折线路径
        if (Math.abs(dx) > Math.abs(dy)) {
            // 水平距离大，先水平再垂直
            ctx.lineTo(midX, startY);
            ctx.lineTo(midY, endY);
            ctx.lineTo(endX, endY);
        } else {
            // 垂直距离大，先垂直再水平
            ctx.lineTo(startX, midY);
            ctx.lineTo(endX, midY);
            ctx.lineTo(endX, endY);
        }
        
        ctx.stroke();
        
        // 绘制连接点
        ctx.fillStyle = this.isRunning ? '#f39c12' : '#34495e';
        ctx.beginPath();
        ctx.arc(startX, startY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 导线上的流动动画效果（运行时）
        if (this.isRunning) {
            const time = Date.now() / 400;
            
            // 在直角折线路径上绘制移动的点
            ctx.fillStyle = '#f39c12';
            for (let i = 0; i < 4; i++) {
                const progress = ((time + i * 0.25) % 1);
                let px, py;
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    // 水平优先路径
                    const segment1 = Math.abs(midX - startX) / dist;
                    const segment2 = Math.abs(midY - startY) / dist;
                    const segment3 = Math.abs(endX - midX) / dist;
                    
                    if (progress < segment1) {
                        const t = progress / segment1;
                        px = startX + (midX - startX) * t;
                        py = startY;
                    } else if (progress < segment1 + segment2) {
                        const t = (progress - segment1) / segment2;
                        px = midX;
                        py = startY + (midY - startY) * t;
                    } else {
                        const t = (progress - segment1 - segment2) / segment3;
                        px = midX + (endX - midX) * t;
                        py = midY + (endY - midY) * t;
                    }
                } else {
                    // 垂直优先路径
                    const segment1 = Math.abs(midY - startY) / dist;
                    const segment2 = Math.abs(midX - startX) / dist;
                    const segment3 = Math.abs(endY - midY) / dist;
                    
                    if (progress < segment1) {
                        const t = progress / segment1;
                        px = startX;
                        py = startY + (midY - startY) * t;
                    } else if (progress < segment1 + segment2) {
                        const t = (progress - segment1) / segment2;
                        px = startX + (endX - startX) * t;
                        py = midY;
                    } else {
                        const t = (progress - segment1 - segment2) / segment3;
                        px = endX;
                        py = midY + (endY - midY) * t;
                    }
                }
                
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