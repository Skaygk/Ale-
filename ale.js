(function(){
    var canvas = document.getElementById('canvas');
    if(!canvas) throw new Error('Canvas element not found');
    var ctx = canvas.getContext('2d');
    var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    var cssW = window.innerWidth, cssH = window.innerHeight;
    var W = Math.round(cssW * DPR), H = Math.round(cssH * DPR); 
    canvas.width = W; canvas.height = H; 
    canvas.style.width = cssW + 'px'; 
    canvas.style.height = cssH + 'px'; 
    ctx.setTransform(DPR,0,0,DPR,0,0);
    var palette = ['#ffffff','#ffffff','#ffffff','#ffffff'];
    var particles = [];
    var targets = [];
    var paused = false;
    var phraseIndex = 0;
    var phrases = ['ale','Te quiero :>',"eres perfecta","como los tiros de jordan","eres como","una ecuacion diferencial","tan dificil de entender","pero tan hermosa al resolver","y tan dulce","como la voz de the weeknd",":>","tremenda desvelada me pegue XD"];
    var holding = false;
    var holdTimer = 0;
    var lastTime = 0;
    var speedFactor = 1;
    function r(a,b){return Math.random()*(b-a)+a}
    function particleGradient(size,color){ var g = ctx.createRadialGradient(0,0,size*0.1,0,0,size); g.addColorStop(0,color); g.addColorStop(0.3,color); g.addColorStop(1,'rgba(255,255,255,0)'); return g; }
    function sampleTextToTargets(text){ 
        var buf = document.createElement('canvas'); 
        var bctx = buf.getContext('2d'); 
        buf.width = cssW; 
        buf.height = cssH; 
        var fontSize = Math.floor(Math.min(cssW, cssH) * 0.22); 
        if(text.length > 18) fontSize = Math.floor(fontSize * 0.6); 
        bctx.textBaseline = 'middle'; 
        bctx.textAlign = 'center'; 
        bctx.font = 'bold ' + fontSize + 'px system-ui, -apple-system, "Segoe UI", Roboto'; 
        let metrics = bctx.measureText(text);
        while(metrics.width > buf.width * 0.85 && fontSize > 10){ 
            fontSize -= 2; 
            bctx.font = 'bold ' + fontSize + 'px system-ui, -apple-system, "Segoe UI", Roboto'; 
            metrics = bctx.measureText(text); 
        }
        bctx.clearRect(0, 0, buf.width, buf.height); 
        bctx.fillStyle = '#000'; 
        bctx.fillText(text, cssW/2, cssH/2); 
        var data = bctx.getImageData(0,0,buf.width,buf.height).data; 
        var step = 4; 
        var pts = []; 
        for(var y=0;y<buf.height;y+=step){ 
            for(var x=0;x<buf.width;x+=step){ 
                var i=(y*buf.width+x)*4+3; 
                if(data[i]>128) pts.push({x,y}); 
            }
        } 
        return pts; 
    }
    function initFormation(phrase){ 
        speedFactor = 1 + Math.min(phrase.length / 20, 2); 
        targets = sampleTextToTargets(phrase); 
        var baseMax = 2000; 
        var maxTargets = Math.min(baseMax, targets.length); 
        if(targets.length>maxTargets){ 
            var sampled=[]; 
            var step = Math.floor(targets.length/maxTargets); 
            for(var i=0;i<targets.length;i+=step) sampled.push(targets[i]); 
            targets = sampled; 
        } 
        particles = []; 
        for(var i=0;i<targets.length;i++){ 
            var t = targets[i]; 
            var size = r(0.8,1.6); 
            var color = palette[Math.floor(Math.random()*palette.length)]; 
            particles.push({ x: r(0,cssW), y: r(0,cssH), vx: r(-0.5,0.5), vy: r(-0.5,0.5), size: size, color: color, alpha:0, targetX: t.x + r(-0.3,0.3), targetY: t.y + r(-0.3,0.3), settled:false, friction: r(0.86,0.94)}); 
        } 
    }
    function drawParticle(p){ 
        ctx.save(); 
        ctx.globalAlpha = Math.min(1, p.alpha * 1.1); 
        ctx.translate(p.x,p.y); 
        ctx.fillStyle = particleGradient(p.size * 1.6, '#ffffff'); 
        ctx.beginPath(); 
        ctx.arc(0,0,p.size * 1.3,0,Math.PI*2); 
        ctx.fill(); 
        ctx.globalAlpha = p.alpha; 
        ctx.fillStyle = particleGradient(p.size,p.color); 
        ctx.beginPath(); 
        ctx.arc(0,0,p.size,0,Math.PI*2); 
        ctx.fill(); 
        ctx.restore(); 
    }
    var formationTimer = 0;
    function drawBackground(){ 
        ctx.fillStyle = '#0f0f0f'; 
        ctx.fillRect(0,0,cssW,cssH); 
        var grd = ctx.createLinearGradient(0,0,0,cssH); 
        grd.addColorStop(0, 'rgba(20,20,20,0.0)'); 
        grd.addColorStop(1, 'rgba(10,10,10,0.6)'); 
        ctx.fillStyle = grd; 
        ctx.fillRect(0,0,cssW,cssH); 
    }
    function step(time){ 
        if(!time) time = performance.now(); 
        var dt = lastTime ? (time - lastTime)/1000 : 0.016; 
        lastTime = time; 
        ctx.clearRect(0,0,W,H); 
        drawBackground(); 
        formationTimer += dt * 1.2 * speedFactor; 
        var attractionStrength = Math.min(1.6 * speedFactor, formationTimer); 
        for(var i=particles.length-1;i>=0;i--){ 
            var p = particles[i]; 
            var dx = p.targetX - p.x; 
            var dy = p.targetY - p.y; 
            var dist = Math.sqrt(dx*dx+dy*dy) + 0.0001; 
            var acc = 0.16 * attractionStrength * speedFactor; 
            p.vx += (dx / dist) * acc * (1 + Math.random()*0.2); 
            p.vy += (dy / dist) * acc * (1 + Math.random()*0.2); 
            p.vx *= p.friction; 
            p.vy *= p.friction; 
            p.x += p.vx; 
            p.y += p.vy; 
            var arrive = Math.max(0, 1 - dist / 20); 
            p.alpha += 0.05 * (0.25 + arrive) * speedFactor; 
            if (p.alpha > 1) p.alpha = 1; 
            if (dist < 1.6){ 
                p.settled = true; 
                p.vx = p.vy = 0; 
                p.x = p.targetX; 
                p.y = p.targetY; 
            } 
            drawParticle(p); 
        } 
        if(particles.length){ 
            var settledCount = particles.reduce(function(s,p){return s + (p.settled?1:0)}, 0); 
            var ratio = settledCount / particles.length; 
            if(!holding && ratio > 0.96){ 
                holding = true; 
                holdTimer = 0; 
            } 
            if(holding){ 
                holdTimer += dt; 
                if(holdTimer >= 4){ 
                    holding = false; 
                    holdTimer = 0; 
                    phraseIndex = (phraseIndex + 1) % phrases.length; 
                    initFormation(phrases[phraseIndex]); 
                    formationTimer = 0; 
                } 
            } 
        } 
        if(!paused) requestAnimationFrame(step); 
    }
    window.addEventListener('resize', function(){ 
        DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); 
        cssW = window.innerWidth; 
        cssH = window.innerHeight; 
        W = Math.round(cssW * DPR); 
        H = Math.round(cssH * DPR); 
        canvas.width = W; 
        canvas.height = H; 
        canvas.style.width = cssW + 'px'; 
        canvas.style.height = cssH + 'px'; 
        ctx.setTransform(DPR,0,0,DPR,0,0); 
        initFormation(phrases[phraseIndex]); 
    });
    (window).startAnimation = function(){ 
        if(!paused) return; 
        paused = false; 
        formationTimer = 0; 
        lastTime = performance.now(); 
        step(lastTime); 
    };
    initFormation(phrases[phraseIndex]);
    step(performance.now());
})();
