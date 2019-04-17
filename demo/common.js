function randomInt(min, max) {
    return ((max - min + 1) * Math.random() + min) >> 0;
}

function randomFloat(min, max) {
    return ((max - min + 1) * Math.random() + min);
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
    ctx.strokeStyle = borderColor || RECT_BORDER_COLOR;
    ctx.fillStyle = color || RECT_COLOR;

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
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    ctx.fillStyle = "#000000";
    ctx.font = "16px";
    ctx.fillText(index, x + 1, y + 10);


    ctx.restore();
}

window.onload = function() {
    repack();
}
