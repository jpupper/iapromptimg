class ShaderBackground {
    constructor() {
        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);
        this.gl = this.canvas.getContext('webgl');
        this.startTime = Date.now();
        this.mouse = { x: 0.5, y: 0.5 };
        this.touches = new Array(10).fill({ x: 0, y: 0 });
        this.touchCount = 0;
        
        this.resizeCanvas();
        this.setupEvents();
        this.init();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    setupEvents() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = (e.clientX - rect.left) / rect.width;
            this.mouse.y = 1.0 - (e.clientY - rect.top) / rect.height; // Invert Y for WebGL coordinates
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = 0.5;
            this.mouse.y = 0.5;
        });

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouch(e));
    }

    handleTouch(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        this.touchCount = Math.min(e.touches.length, 10);
        
        // Reset touches array
        this.touches.fill({ x: 0, y: 0 });
        
        // Update active touches
        for(let i = 0; i < this.touchCount; i++) {
            const touch = e.touches[i];
            this.touches[i] = {
                x: (touch.clientX - rect.left) / rect.width,
                y: 1.0 - (touch.clientY - rect.top) / rect.height
            };
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    async init() {
        const fragmentShader = await this.loadShader('sh/shfondo.frag', this.gl.FRAGMENT_SHADER);
        const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertexShader, `
            attribute vec2 position;
            varying vec2 uv;
            void main() {
                uv = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `);
        this.gl.compileShader(vertexShader);
        
        if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
            console.error('Vertex shader compilation error:', this.gl.getShaderInfoLog(vertexShader));
            return;
        }

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Shader program linking error:', this.gl.getProgramInfoLog(program));
            return;
        }

        this.gl.useProgram(program);

        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1,
            1, -1, 1, 1, -1, 1
        ]), this.gl.STATIC_DRAW);

        const position = this.gl.getAttribLocation(program, 'position');
        this.gl.enableVertexAttribArray(position);
        this.gl.vertexAttribPointer(position, 2, this.gl.FLOAT, false, 0, 0);

        this.resolutionLocation = this.gl.getUniformLocation(program, 'u_resolution');
        this.timeLocation = this.gl.getUniformLocation(program, 'u_time');
        this.mouseLocation = this.gl.getUniformLocation(program, 'u_mouse');
        this.touchLocation = new Array(10);
        for(let i = 0; i < 10; i++) {
            this.touchLocation[i] = this.gl.getUniformLocation(program, `u_touch[${i}]`);
        }
        this.touchCountLocation = this.gl.getUniformLocation(program, 'u_touchCount');
        
        this.render();
    }

    async loadShader(url, type) {
        const response = await fetch(url);
        const source = await response.text();
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(`Shader compilation error in ${url}:`, this.gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    render() {
        const currentTime = (Date.now() - this.startTime) * 0.001;
        this.gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.timeLocation, currentTime);
        this.gl.uniform2f(this.mouseLocation, this.mouse.x, this.mouse.y);
        
        // Pass touch data
        for(let i = 0; i < 10; i++) {
            this.gl.uniform2f(this.touchLocation[i], this.touches[i].x, this.touches[i].y);
        }
        this.gl.uniform1i(this.touchCountLocation, this.touchCount);
        
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        requestAnimationFrame(() => this.render());
    }
}
