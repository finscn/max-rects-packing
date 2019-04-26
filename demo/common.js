function generateRandomFunction(seed) {
    seed = seed || (Date.now() & 0xFFFFFF - 1);
    // console.log("Random seed : " + seed);
    return function() {
        seed = (1103515245 * seed + 12345) & 2147483647;
        return seed / 2147483648;
    };
}

myRandom = generateRandomFunction(1234567890);

function getSmallerPOT(value) {
    return Math.pow(2, Math.floor(Math.log(value) * Math.LOG2E))
}

function getBiggerPOT(value) {
    return Math.pow(2, Math.ceil(Math.log(value) * Math.LOG2E))
}

function randomInt(min, max, randomFn) {
    randomFn = randomFn || myRandom || Math.random;
    return ((max - min + 1) * randomFn() + min) >> 0;
}


function randomFloat(min, max, randomFn) {
    randomFn = randomFn || myRandom || Math.random;
    return ((max - min + 1) * randomFn() + min);
}

function $id(id) {
    return document.getElementById(id);
}


function drawRect(ctx, rect, color, borderColor) {
    var x = rect.x;
    var y = rect.y;
    var w = rect.width;
    var h = rect.height;

    var index = rect.index || 0;

    ctx.save();

    ctx.translate(x, y);
    x = 0;
    y = 0;
    if (rect.rotated) {
        ctx.rotate(Math.PI / 2);
        w = w + h;
        h = w - h;
        w = w - h;

        y = -h;
    }

    if (color === null) {
        ctx.strokeStyle = borderColor || RECT_BORDER_COLOR;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    } else {
        ctx.fillStyle = borderColor || RECT_BORDER_COLOR;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = color || RECT_COLOR;
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

        ctx.fillStyle = "#000000";
        ctx.font = "16px";
        ctx.fillText(index, x + 1, y + 10);
    }

    ctx.restore();
}

window.onload = function() {
    repack();
    // startPackOne()
}
