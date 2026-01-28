/**
 * OMNI CRON: NEURO-GENESIS 
 * Pure WebGL Shader Engine
 */

const initOmniNeuro = () => {
    const canvasEl = document.querySelector("canvas#omni-neuro-canvas");
    const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

    const pointer = { x: 0, y: 0, tX: 0, tY: 0 };
    let uniforms;

    const gl = initShader();
    if (!gl) return;

    setupEvents();
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    render();

    function initShader() {
        const vsSource = document.getElementById("omni-vert-shader").innerHTML;
        const fsSource = document.getElementById("omni-frag-shader").innerHTML;
        const gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");

        if (!gl) return null;

        function createShader(gl, sourceCode, type) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, sourceCode);
            gl.compileShader(shader);
            return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
        }

        const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
        const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        uniforms = getUniforms(program);

        function getUniforms(program) {
            let uniforms = [];
            let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < uniformCount; i++) {
                let uniformName = gl.getActiveUniform(program, i).name;
                uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
            }
            return uniforms;
        }

        gl.useProgram(program);
        const vertices = new Float32Array([-1., -1., 1., -1., -1., 1., 1., 1.]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        return gl;
    }

    function render() {
        const currentTime = performance.now();
        pointer.x += (pointer.tX - pointer.x) * .2;
        pointer.y += (pointer.tY - pointer.y) * .2;

        gl.uniform1f(uniforms.u_time, currentTime);
        gl.uniform2f(uniforms.u_pointer_position, pointer.x / window.innerWidth, 1 - pointer.y / window.innerHeight);
        gl.uniform1f(uniforms.u_scroll_progress, window["pageYOffset"] / (2 * window.innerHeight));

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }

    function resizeCanvas() {
        const width = canvasEl.parentNode.clientWidth;
        const height = canvasEl.parentNode.clientHeight;
        canvasEl.width = width * devicePixelRatio;
        canvasEl.height = height * devicePixelRatio;
        gl.uniform1f(uniforms.u_ratio, canvasEl.width / canvasEl.height);
        gl.viewport(0, 0, canvasEl.width, canvasEl.height);
    }

    function setupEvents() {
        window.addEventListener("pointermove", e => { pointer.tX = e.clientX; pointer.tY = e.clientY; });
        window.addEventListener("touchmove", e => { pointer.tX = e.targetTouches[0].clientX; pointer.tY = e.targetTouches[0].clientY; });
    }
};

document.addEventListener('DOMContentLoaded', initOmniNeuro);