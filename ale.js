function sampleTextToTargets(text){ 
    var buf = document.createElement('canvas'); 
    var bctx = buf.getContext('2d'); 
    buf.width = cssW; 
    buf.height = cssH; 

    var fontSize = Math.floor(Math.min(cssW, cssH) * 0.22); 
    bctx.textBaseline = 'middle'; 
    bctx.textAlign = 'center'; 
    bctx.font = 'bold ' + fontSize + 'px system-ui, -apple-system, "Segoe UI", Roboto'; 

    let words = text.split(" ");
    let lines = [];
    let current = "";

    for(let i=0;i<words.length;i++){
        let test = current ? current + " " + words[i] : words[i];
        let w = bctx.measureText(test).width;
        if(w > buf.width * 0.8 && current){ 
            lines.push(current);
            current = words[i];
        } else {
            current = test;
        }
    }
    if(current) lines.push(current);

    // si hay muchas líneas, reducimos el fontSize
    while(lines.length * fontSize * 1.2 > buf.height * 0.7 && fontSize > 12){
        fontSize -= 2;
        bctx.font = 'bold ' + fontSize + 'px system-ui, -apple-system, "Segoe UI", Roboto';
        lines = [];
        current = "";
        for(let i=0;i<words.length;i++){
            let test = current ? current + " " + words[i] : words[i];
            let w = bctx.measureText(test).width;
            if(w > buf.width * 0.8 && current){ 
                lines.push(current);
                current = words[i];
            } else {
                current = test;
            }
        }
        if(current) lines.push(current);
    }

    bctx.clearRect(0,0,buf.width,buf.height); 
    bctx.fillStyle = '#000'; 
    let lineHeight = fontSize * 1.2;
    let startY = (buf.height - (lines.length * lineHeight)) / 2 + fontSize/2;
    for(let i=0;i<lines.length;i++){
        bctx.fillText(lines[i], cssW/2, startY + i*lineHeight);
    }

    var data = bctx.getImageData(0,0,buf.width,buf.height).data; 
    var step = 4; 
    var pts = []; 
    for(var y=0;y<buf.height;y+=step){ 
        for(var x=0;x<buf.width;x+=step){ 
            var idx=(y*buf.width+x)*4+3; 
            if(data[idx]>128) pts.push({x,y}); 
        }
    } 
    return pts; 
}
