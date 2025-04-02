precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_touch[10];  // Array for up to 10 touch points
uniform int u_touchCount;  // Number of active touches
varying vec2 uv;

float random3 (in vec2 _st) {
    return fract(sin(dot(_st.xy,
                         vec2(12.9898,78.233)))*
        43758.56222123);
}

float noise2 (in vec2 st,float fase) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float fase2 = fase;
    // Four corners in 2D of a tile
    float a = sin(random3(i)*fase2);
    float b =  sin(random3(i + vec2(1.0, 0.0))*fase2);
    float c =  sin(random3(i + vec2(0.0, 1.0))*fase2);
    float d =  sin(random3(i + vec2(1.0, 1.0))*fase2);

    // Smooth Interpolation

    // Cubic Hermine Curve.  Same as SmoothStep()
    vec2 u = f*f*(3.0-2.0*f);
    // u = smoothstep(0.,1.,f);

    // Mix 4 coorners percentages
    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}


void main() {
    vec2 uv = gl_FragCoord.xy/u_resolution.xy;
    
    vec2 p = vec2(0.5) - uv;
    float r = length(p);
    float a = atan(p.y,p.x);
    
    float t = u_time*0.0025;
    vec3 col1 = vec3(18./255.,43./255.,66./255.);
    vec3 col2 = vec3(189./255.,33./255.,207./255.);
    vec3 col3 = vec3(15./255.,23./255.,45./255.);
    
    col2 = vec3(18./255.,43./255.,66./255.);
    col1 = vec3(0./255.,174./255.,234./255.);
    
    // Mouse influence
    float mouseEffect = smoothstep(0.32, 0.0, distance(uv, u_mouse));
    
    // Touch points influence
    float touchEffect = 0.0;
    for(int i = 0; i < 10; i++) {
        if(i >= u_touchCount) break;
        touchEffect += smoothstep(0.9, 0.0, distance(uv, u_touch[i])) * 0.3;
    }
    
    // Combine original effects with mouse/touch
    float e1 = sin(uv.x*2.-t+sin(uv.y*5.+t+sin(uv.x*10.-u_time+sin(uv.y*10.+u_time)*0.1)+t)*.5+.5+t*10.)*.5+.5;
    float e2 = sin(uv.y*2.-t+sin(uv.x*5.+t+sin(uv.y*10.-u_time+sin(uv.x*20.+u_time)*0.1)+t*5.)*.5+.5)*.5+.5;
    
	
	mouseEffect*= 0.25;
	touchEffect*= 0.25;
	
    e1 = mix(e1, 1.0, mouseEffect + touchEffect);
    e2 = mix(e2, 0.0, mouseEffect + touchEffect);
    
    vec3 fin = mix(col1,col2,e1);
    fin = mix(fin,col3,e2);
    
    gl_FragColor = vec4(fin,1.0);
}
