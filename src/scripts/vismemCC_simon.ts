export var objects: any[] = [];

export function makeLine(id, x1, y1, x2, y2, color, linewidth) {
    linewidth = typeof linewidth !== 'undefined' ? linewidth : 2.5;
    color = typeof color !== 'undefined' ? color : '#000000';
    var line = {
        id: id,
        x1: x1,
        x2: x2,
        y1: y1,
        y2: y2,
        color: color,
        linewidth: linewidth,
        type: 'line'
    };
    objects.push(line);
    return line;
}

export function drawLine(ctx, line) {
    ctx.beginPath();
    ctx.lineWidth = line.linewidth;
    ctx.strokeStyle = line.color;
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
}

export function makeText(id, x, y, words, color, style) {
    style = typeof style !== 'undefined' ? style : "12px Arial";
    color = typeof color !== 'undefined' ? color : "Black";;
    var text = {
        id: id,
        x: x,
        y: y,
        color: color,
        style: style,
        words: words,
        type: 'text',
    }
    objects.push(text);
    return text;
}

export function drawText(ctx, text) {
    ctx.fillStyle = text.color;
    ctx.font = text.style;
    ctx.fillText(text.words, text.x, text.y);
}

export function makeCircle(id, x, y, radius,
    canMove = false, lineWidth = 2,
    color = '#FFFFFF', lineCol = '#D4D4D4',
    arc1 = 0, arc2 = Math.PI * 2) {
    var circle = {
        id: id,
        x: x,
        y: y,
        radius: radius,
        color: color,
        lineCol: lineCol,
        lineWidth: lineWidth,
        arc1: arc1,
        arc2: arc2,
        canMove: canMove,
        type: 'circle'
    }
    objects.push(circle)
    return circle;
}

export function drawCircle(ctx, circle) {
    // Draw circle outline
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius + circle.lineWidth, circle.arc1, circle.arc2, false);
    ctx.lineTo(circle.x, circle.y);
    ctx.fillStyle = circle.lineCol;
    ctx.fill();
    ctx.lineWidth = circle.lineWidth;

    // Draw circle fill
    ctx.strokeStyle = circle.color;
    ctx.fillStyle = circle.color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, circle.arc1, circle.arc2, false);
    ctx.lineTo(circle.x, circle.y);
    ctx.fillStyle = circle.color;
    ctx.fill();
    ctx.lineWidth = 0;
    ctx.stroke();
    ctx.closePath();
    return circle;
}

export function drawCircle2(ctx, circle) {
    // Draw circle fill
    ctx.strokeStyle = circle.color;
    ctx.fillStyle = circle.color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, circle.arc1, circle.arc2, false);
    ctx.lineTo(circle.x, circle.y);
    ctx.fillStyle = circle.color;
    ctx.fill();
    ctx.lineWidth = 0;
    ctx.stroke();
    return circle;
}

export function overlapCircle(x, y, circle) {
    var dist = Math.pow(Math.pow(circle.x - x, 2) + Math.pow(circle.y - y, 2), .5);
    if (dist <= circle.radius) {
        return true;
    } else {
        return false;
    }
}


export function makeRectangle(id, x, y, width, height,
    canMove = false, color = '#000000', lineCol = '#000000', lineWidth = 0, rot = 0) {
    var rectangle = {
        id: id,
        x: x,
        y: y,
        width: width,
        height: height,
        color: color,
        rot: rot,
        canMove: canMove,
        type: 'rectangle'
    }
    objects.push(rectangle)
    return rectangle;
}

export function overlapRectangle(x, y, rectangle) {
    // var x2 = x - rectangle.x;
    // var y2 = y - rectangle.y;

    var xBound = (x >= rectangle.x - rectangle.width / 2 && x <= rectangle.x + rectangle.width / 2) || (x <= rectangle.x - rectangle.width / 2 && x >= rectangle.x + rectangle.width / 2);
    var yBound = (y >= rectangle.y - rectangle.height / 2 && y <= rectangle.y + rectangle.height / 2) || (y <= rectangle.y - rectangle.height / 2 && y >= rectangle.y + rectangle.height / 2)
    if (xBound && yBound) {
        return true;
    } else {
        return false;
    }
}

export function drawRectangle(ctx, rectangle) {
    ctx.fillStyle = rectangle.color;
    ctx.translate(rectangle.x, rectangle.y);
    ctx.rotate(rectangle.rot * Math.PI / 180);
    ctx.translate(-rectangle.x, -rectangle.y);
    ctx.fillRect(rectangle.x - rectangle.width / 2, rectangle.y - rectangle.height / 2, rectangle.width, rectangle.height);


    ctx.translate(rectangle.x, rectangle.y);
    ctx.rotate(-rectangle.rot * Math.PI / 180);
    ctx.translate(-rectangle.x, -rectangle.y);
}

export function makeIm(id, x, y, width, height, file, canMove, rot) {
    rot = typeof rot !== 'undefined' ? rot : 0;
    canMove = typeof canMove !== 'undefined' ? canMove : false;
    var image = {
        id: id,
        x: x,
        y: y,
        width: width,
        height: height,
        canMove: canMove,
        file: file,
        rot: rot,
        type: 'image'
    }
    objects.push(image);
    return image;
}

export function drawIm(ctx, image, border?) {
    var im = new Image();
    im.src = image.file;
    im.onload = function () {
        ctx.drawImage(im, image.x - image.width / 2, image.y - image.height / 2, image.width, image.height);
    };
}

export function makeTriangle(id, x, y, width, height, canMove, color, rot) {
    canMove = typeof canMove !== 'undefined' ? canMove : '#000000';
    color = typeof color !== 'undefined' ? color : '#000000';
    rot = typeof rot !== 'undefined' ? rot : 0;

    var triangle = {
        id: id,
        x: x,
        y: y,
        width: width,
        height: height,
        color: color,
        rot: rot,
        type: 'triangle',
        canMove: canMove
    }
    objects.push(triangle)
    return triangle
}

export function drawTriangle(ctx, triangle) {
    ctx.fillStyle = triangle.color;
    ctx.translate(triangle.x, triangle.y);
    ctx.rotate(triangle.rot * Math.PI / 180);
    ctx.translate(-triangle.x, -triangle.y);

    var botLeftX = triangle.x - triangle.width / 2;
    var botLeftY = triangle.y - triangle.height / 2;
    var botRightX = triangle.x + triangle.width / 2;
    var botRightY = triangle.y - triangle.height / 2;
    var topX = triangle.x;
    var topY = triangle.y + triangle.height / 2;

    ctx.beginPath();
    ctx.moveTo(botLeftX, botLeftY);
    ctx.lineTo(botRightX, botRightY);
    ctx.lineTo(topX, topY);
    ctx.closePath();
    ctx.fill();

    ctx.translate(triangle.x, triangle.y);
    ctx.rotate(-triangle.rot * Math.PI / 180);
    ctx.translate(-triangle.x, -triangle.y);
}

export function overlapTriangle(x, y, triangle) {
    var slopeH = triangle.height / (triangle.width / 2)
    // var slopeW = triangle.width / (triangle.height / 2)
    var x2 = x - triangle.x;
    var y2 = y - triangle.y;
    var xBound = (x2 <= y2 * slopeH && x2 >= -y2 * slopeH) || (x2 >= y2 * slopeH && x2 <= -y2 * slopeH);
    var yBound = (y2 <= (triangle.height / 2) && y2 >= -(triangle.height / 2)) || (y2 >= (triangle.height / 2) && y2 <= -(triangle.height / 2));
    if (xBound && yBound) {
        return true;
    } else {
        return false;
    }
}

export function drawObjects(ctx, objects) {
    for (var i = 0; i < objects.length; i++) {
        switch (objects[i].type) {
            case 'circle':
                drawCircle(ctx, objects[i])
                break;
            case 'rectangle':
                drawRectangle(ctx, objects[i])
                break;
            case 'triangle':
                drawTriangle(ctx, objects[i])
                break;
            case 'line':
                drawLine(ctx, objects[i])
                break;
            case 'image':
                drawIm(ctx, objects[i])
                break;
            case 'text':
                drawText(ctx, objects[i])
                break;
        }
    }

}

export function drawGrid(ctx, numCol, numRow) {
    numCol = typeof numCol !== 'undefined' ? numCol : 10;
    numRow = typeof numRow !== 'undefined' ? numRow : 5;
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    var width = ctx.canvas.width;
    var wShift = width / numCol;
    var height = ctx.canvas.height;
    var hShift = height / numRow;
    // Draw columns
    for (var i = 0; i < numCol; i++) {
        ctx.beginPath();
        ctx.moveTo(wShift * i, 0);
        ctx.lineTo(wShift * i, height);
        ctx.closePath();
        ctx.stroke()
        ctx.fillText(wShift * i, wShift * i, 10)
    }
    for (var j = 0; j < numRow; j++) {
        ctx.beginPath();
        ctx.moveTo(0, hShift * j);
        ctx.lineTo(width, hShift * j);
        ctx.closePath();
        ctx.stroke()
        ctx.fillText(hShift * j, 5, hShift * j)
    }
}

export function erase(ctx) {
    var width = ctx.canvas.width;
    var height = ctx.canvas.height;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
}

export function clear() {
    objects = [];
}

// Detect clicks
export const sel = false;

// Allow rotations
export const ad_KeyRotate = false;
export const rotRate = 10;

// Allow object movement
export const mousemove_moveObject = true;

// Allow size changes
export const ws_changeSize = false;
export const heightRate = 2.5;
export const widthRate = 2.5;
export const radRate = 2.5;

export function checkOverlap(x, y, objects) {
    var over: any[] = []
    var overlap: any;
    for (var i = 0; i < objects.length; i++) {
        switch (objects[i].type) {
            case 'circle':
                overlap = overlapCircle(x, y, objects[i])
                break;
            case 'rectangle':
                overlap = overlapRectangle(x, y, objects[i])
                break;
            case 'triangle':
                overlap = overlapTriangle(x, y, objects[i])
                break;
            case 'image':
                overlap = overlapRectangle(x, y, objects[i])
                break;
        }
        if (overlap) {
            over.push(i);
        }
    }
    return over;
}

// Timing export functions

export function wait(time, func) {
    // setTimeout(function () { func }, time);
    setTimeout(func, time);
}

// Probability

export function normRand() {
    var x1, x2, rad;

    do {
        x1 = 2 * Math.random() - 1;
        x2 = 2 * Math.random() - 1;
        rad = x1 * x1 + x2 * x2;
    } while (rad >= 1 || rad === 0);

    var c = Math.sqrt(-2 * Math.log(rad) / rad);

    return x1 * c;
};

/** REMOVE VIA UNUSED 
export function changeInnerHTML(id, text) {
    document.getElementById(id).innerHTML = text;
}
*/

// Load multiple images
// http://www.html5canvastutorials.com/tutorials/html5-canvas-image-loader/
export function loadImages(sources, callback) {
    var images = {};
    var loadedImages = 0;
    var numImages = sources.length;
    // get num of sources
    for (var src in sources) {
        images[src] = new Image();
        images[src].onload = loadImage(images, loadedImages, numImages, callback)
        images[src].src = sources[src];
    }
    return images;
}

function loadImage(images, loadedImages, numImages, callback) {
    if (++loadedImages >= numImages) {
        callback(images);
    }
}


export function loadImages2() {
    // Insert code that actually loads images
}

/** REMOVE VIA UNUSED
export function nextPage() {
    document.nextpage.submit();
}
*/

export function angle2HEX(wholeDegree) {

    var w = wholeDegree * (Math.PI / 180); // Round to integer degree
    var l = 65;
    var a = 9.0 + 50.0 * Math.cos(w);
    var b = 9.0 + 50.0 * Math.sin(w);
    var image = [l, a, b];

    var whitePoint = [0.950456, 1, 1.088754];

    var fY = (image[0] + 16) / 116;
    var fX = fY + image[1] / 500;
    var fZ = fY - image[2] / 200

    function invf(fi) {
        var Y = Math.pow(fi, 3);
        var i = (Y < .008856);
        if (i) {
            Y = (fi - (4 / 29)) * (108 / 841);
        }
        return Y;
    }


    var image2 = [
        whitePoint[0] * invf(fX),
        whitePoint[1] * invf(fY),
        whitePoint[2] * invf(fZ)
    ];


    var T = [3.240479, -0.969256, 0.055648, -1.53715, 1.875992, -0.204043, -0.498535, 0.041556, 1.057311];
    var R = T[0] * image2[0] + T[3] * image2[1] + T[6] * image2[2];
    var G = T[1] * image2[0] + T[4] * image2[1] + T[7] * image2[2];
    var B = T[2] * image2[0] + T[5] * image2[1] + T[8] * image2[2];


    var AddWhite = -Math.min(Math.min(Math.min(R, G), B), 0);
    var Scale = Math.max(Math.max(Math.max(R, G), B) + AddWhite, 1);
    R = (R + AddWhite) / Scale;
    G = (G + AddWhite) / Scale;
    B = (B + AddWhite) / Scale;

    function gammacorrection(R) {
        var Rp = (1.099 * Math.pow(R, 0.45) - 0.099);// See if we need the real export function
        var i = R < .018
        if (i) {
            Rp = 4.5138 * R
        }
        return Rp;
    }


    var newColorRGB = [
        gammacorrection(R),
        gammacorrection(G),
        gammacorrection(B)
    ];

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

    function rgbToHex(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }


    var newColorHex = rgbToHex(Math.round(255 * newColorRGB[0]), Math.round(255 * newColorRGB[1]), Math.round(255 * newColorRGB[2]));

    return newColorHex;
}